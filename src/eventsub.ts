import type TwitchInstance from './'
import type { Scopes } from './auth'
import type { EventSubCondition, EventSubSubscriptionRequest } from './api/createEventSubSubscription'

// The Channel interface lives in index.ts, which uses an export assignment and so can't export it directly
type Channel = TwitchInstance['channels'][number]

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws'

// Twitch closes a connection that hasn't created a subscription within 10s, and reconnects are rate limited, so a floor is kept between connection attempts
const RECONNECT_DELAY_MIN = 2000
const RECONNECT_DELAY_MAX = 60000

// Notifications can be resent by Twitch, so recently handled message IDs are tracked to avoid processing an event twice
const MESSAGE_ID_HISTORY = 100

type MessageType = 'session_welcome' | 'session_keepalive' | 'notification' | 'session_reconnect' | 'revocation'

type Metadata = {
  message_id: string
  message_type: MessageType
  message_timestamp: string
  subscription_type?: string
  subscription_version?: string
}

type Session = {
  id: string
  status: string
  connected_at: string
  keepalive_timeout_seconds: number | null
  reconnect_url: string | null
}

type WelcomeMessage = { metadata: Metadata; payload: { session: Session } }
type KeepaliveMessage = { metadata: Metadata; payload: Record<string, never> }
type ReconnectMessage = { metadata: Metadata; payload: { session: Session } }
type NotificationMessage = { metadata: Metadata; payload: { subscription: { id: string; type: string; status: string }; event: any } }
type RevocationMessage = { metadata: Metadata; payload: { subscription: { id: string; type: string; status: string; condition: EventSubCondition } } }

type EventSubMessage = WelcomeMessage | KeepaliveMessage | ReconnectMessage | NotificationMessage | RevocationMessage

type PendingSubscription = EventSubSubscriptionRequest & {
  /** Channel username this subscription is for, used for logging */
  channel: string
}

/**
 * @description Twitch EventSub WebSocket client, providing realtime updates for channel data that would otherwise
 * only be updated by the once a minute API polling, as well as data only available through EventSub such as Hype Trains
 */
export class EventSub {
  constructor(instance: TwitchInstance) {
    this.instance = instance
  }

  private readonly instance: TwitchInstance
  private socket: WebSocket | null = null
  private reconnectSocket: WebSocket | null = null
  private sessionID = ''
  private keepaliveTimeout = 10
  private keepaliveTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private destroyed = false
  private messageIDs: string[] = []

  /** Subscriptions requested for the current session, whether or not Twitch accepted them */
  private requested: Set<string> = new Set()

  public connected = false
  public subscriptions: { type: string; channel: string; enabled: boolean }[] = []

  /**
   * @description Opens the EventSub WebSocket connection, if the module is authenticated and EventSub is enabled
   */
  public readonly init = (): void => {
    if (this.destroyed) return

    if (this.instance.config.eventSub === false) {
      this.instance.log('debug', 'EventSub: Disabled in config')
      return
    }

    if (!this.instance.auth.valid) {
      this.instance.log('debug', 'EventSub: Unable to connect, invalid token')
      return
    }

    if (this.socket !== null) return

    // Twitch closes a connection that hasn't created a subscription within 10s, so connecting is left until there's something to subscribe to
    if (this.buildSubscriptions().length === 0) {
      this.instance.log('debug', 'EventSub: No subscriptions available for the monitored channels')
      return
    }

    this.connect(EVENTSUB_URL, false)
  }

  /**
   * @description Connects or reconnects as needed, and refreshes subscriptions when the channels being
   * monitored, or the permissions the module has for them, have changed
   */
  public readonly update = (): void => {
    if (this.destroyed) return

    if (this.instance.config.eventSub === false) {
      if (this.socket !== null) this.close()
      return
    }

    if (!this.instance.auth.valid) return

    if (this.socket === null) {
      // A scheduled reconnect is left to run so its backoff is respected
      if (this.reconnectTimer === null) this.init()
      return
    }

    if (!this.connected) return

    const desired = this.buildSubscriptions()

    if (desired.length === 0) {
      this.instance.log('debug', 'EventSub: No subscriptions available for the monitored channels, disconnecting')
      this.close()
      return
    }

    const desiredKeys = new Set(desired.map((subscription) => this.subscriptionKey(subscription)))
    const stale = [...this.requested].some((key) => !desiredKeys.has(key))

    // Subscriptions can't be individually removed from a session, so a channel no longer being monitored gets a fresh session
    if (stale) {
      this.instance.log('debug', 'EventSub: Monitored channels changed, reconnecting')
      this.close()
      this.init()
      return
    }

    const missing = desired.filter((subscription) => !this.requested.has(this.subscriptionKey(subscription)))
    if (missing.length === 0) return

    // Subscriptions are tied to the session, so the missing ones are added to the existing connection rather than reconnecting
    this.instance.log('debug', `EventSub: Adding ${missing.length} subscriptions`)
    this.createSubscriptions(missing)
  }

  /**
   * @description Closes the connection, such as when the module is no longer authenticated, leaving it able to reconnect later
   */
  public readonly disconnect = (): void => {
    this.close()
  }

  /**
   * @description Closes the connection and stops any timers
   */
  public readonly destroy = (): void => {
    this.destroyed = true
    this.close()
  }

  /**
   * @description Closes any open sockets and clears timers, without preventing a later reconnect
   */
  private readonly close = (): void => {
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.keepaliveTimer = null
    this.reconnectTimer = null

    const sockets = [this.socket, this.reconnectSocket]
    this.socket = null
    this.reconnectSocket = null
    this.connected = false
    this.sessionID = ''
    this.requested.clear()
    this.subscriptions = []

    sockets.forEach((socket) => {
      if (socket === null) return
      try {
        socket.close(1000, 'Closing connection')
      } catch (_e) {
        // Socket may not have finished opening yet, in which case it's discarded without needing to be closed
      }
    })
  }

  /**
   * @param url EventSub WebSocket URL, either the default or a reconnect URL provided by Twitch
   * @param isReconnect Whether this socket is replacing an existing session, in which case Twitch carries the subscriptions over
   */
  private readonly connect = (url: string, isReconnect: boolean): void => {
    let socket: WebSocket

    try {
      socket = new WebSocket(url)
    } catch (e: any) {
      this.instance.log('warn', `EventSub: Unable to open connection - ${e.message || e}`)
      this.scheduleReconnect()
      return
    }

    if (isReconnect) {
      this.reconnectSocket = socket
    } else {
      this.socket = socket
    }

    socket.addEventListener('open', () => {
      this.instance.log('debug', `EventSub: Socket open${isReconnect ? ' (reconnect)' : ''}`)
    })

    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return

      let message: EventSubMessage

      try {
        message = JSON.parse(event.data)
      } catch (_e) {
        this.instance.log('debug', `EventSub: Unable to parse message`)
        return
      }

      this.handleMessage(socket, message)
    })

    socket.addEventListener('error', () => {
      // Close event follows an error, and carries the detail worth logging
      this.instance.log('debug', 'EventSub: Socket error')
    })

    socket.addEventListener('close', (event) => {
      this.handleClose(socket, event.code, event.reason)
    })
  }

  /**
   * @param socket Socket the message was received on
   * @param message EventSub message
   */
  private readonly handleMessage = (socket: WebSocket, message: EventSubMessage): void => {
    // Messages from a socket that has already been replaced are ignored
    if (socket !== this.socket && socket !== this.reconnectSocket) return

    const { message_id, message_type } = message.metadata

    if (this.messageIDs.includes(message_id)) {
      this.instance.log('debug', `EventSub: Ignoring duplicate message ${message_id}`)
      return
    }

    this.messageIDs.unshift(message_id)
    if (this.messageIDs.length > MESSAGE_ID_HISTORY) this.messageIDs.pop()

    if (socket === this.socket) this.resetKeepalive()

    if (message_type === 'session_welcome') {
      this.handleWelcome(socket, (message as WelcomeMessage).payload.session)
    } else if (message_type === 'session_reconnect') {
      const reconnectURL = (message as ReconnectMessage).payload.session.reconnect_url
      this.instance.log('debug', 'EventSub: Twitch requested a reconnect')
      if (reconnectURL && this.reconnectSocket === null) this.connect(reconnectURL, true)
    } else if (message_type === 'notification') {
      const { subscription, event } = (message as NotificationMessage).payload
      this.handleNotification(subscription.type, event)
    } else if (message_type === 'revocation') {
      const { subscription } = (message as RevocationMessage).payload
      this.instance.log('warn', `EventSub: Subscription to ${subscription.type} revoked (${subscription.status}), this usually means the permission for it was removed`)
      this.subscriptions = this.subscriptions.filter((sub) => sub.type !== subscription.type || sub.channel !== this.channelName(subscription.condition.broadcaster_user_id))
    }
  }

  /**
   * @param socket Socket the welcome was received on
   * @param session Session data
   */
  private readonly handleWelcome = (socket: WebSocket, session: Session): void => {
    this.keepaliveTimeout = session.keepalive_timeout_seconds || 10
    this.reconnectAttempts = 0

    if (socket === this.reconnectSocket) {
      // Twitch carries subscriptions over to the new session, so the old socket is dropped and the new one takes over
      const previousSocket = this.socket
      this.socket = socket
      this.reconnectSocket = null
      this.sessionID = session.id
      this.connected = true
      this.resetKeepalive()

      try {
        previousSocket?.close(1000, 'Reconnected')
      } catch (_e) {
        // Old socket may have already been closed by Twitch
      }

      this.instance.log('debug', 'EventSub: Reconnected, subscriptions carried over to the new session')
      return
    }

    this.sessionID = session.id
    this.connected = true
    this.requested.clear()
    this.subscriptions = []
    // Re-armed now that the sessions keepalive timeout is known
    this.resetKeepalive()
    this.instance.log('debug', `EventSub: Connected`)

    this.createSubscriptions(this.buildSubscriptions())
  }

  /**
   * @param socket Socket that closed
   * @param code Close code
   * @param reason Close reason
   */
  private readonly handleClose = (socket: WebSocket, code: number, reason: string): void => {
    if (socket === this.reconnectSocket) {
      // The existing connection is still live, and Twitch will close it once the reconnect grace period ends
      this.reconnectSocket = null
      this.instance.log('debug', `EventSub: Reconnect socket closed (${code})`)
      return
    }

    if (socket !== this.socket) return

    this.socket = null
    this.connected = false
    this.sessionID = ''
    this.requested.clear()
    this.subscriptions = []
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer)

    // Closes triggered by the module itself are handled where they're made, so anything reaching here is unexpected
    if (this.destroyed) {
      this.instance.log('debug', `EventSub: Disconnected (${code})`)
      return
    }

    this.instance.log('debug', `EventSub: Disconnected (${code}${reason ? ` - ${reason}` : ''}), reconnecting`)
    this.scheduleReconnect()
  }

  /**
   * @description Reconnects with an increasing delay to avoid hammering Twitch while it, or the local connection, is unavailable
   */
  private readonly scheduleReconnect = (): void => {
    if (this.destroyed || this.reconnectTimer !== null) return

    const delay = Math.min(RECONNECT_DELAY_MIN * Math.pow(2, this.reconnectAttempts), RECONNECT_DELAY_MAX)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.destroyed || this.socket !== null) return
      this.init()
    }, delay)
  }

  /**
   * @description Twitch sends a keepalive whenever no notification has been sent, so a lack of messages means the connection is dead
   */
  private readonly resetKeepalive = (): void => {
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer)

    this.keepaliveTimer = setTimeout(
      () => {
        this.instance.log('debug', 'EventSub: Keepalive timeout, reconnecting')
        const socket = this.socket
        this.socket = null
        this.connected = false

        try {
          socket?.close(4000, 'Keepalive timeout')
        } catch (_e) {
          // Socket is already unusable, reconnect regardless
        }

        this.scheduleReconnect()
      },
      (this.keepaliveTimeout + 5) * 1000,
    )
  }

  /**
   * @param subscription Subscription request
   * @returns Key uniquely identifying a subscription type for a channel
   */
  private readonly subscriptionKey = (subscription: PendingSubscription): string => {
    return `${subscription.type}:${subscription.condition.broadcaster_user_id}`
  }

  /**
   * @param id Twitch user ID
   * @returns Channel display name, falling back to the ID for channels not being monitored
   */
  private readonly channelName = (id: string): string => {
    return this.instance.channels.find((channel) => channel.id === id)?.username || id
  }

  /**
   * @returns Subscriptions available for the monitored channels with the permissions granted to the module
   */
  private readonly buildSubscriptions = (): PendingSubscription[] => {
    const subscriptions: PendingSubscription[] = []
    const userID = this.instance.auth.userID
    const scopes = this.instance.auth.scopes
    const hasScope = (...required: Scopes[]): boolean => required.some((scope) => scopes.includes(scope))

    this.instance.channels
      .filter((channel) => channel.id !== '')
      .forEach((channel) => {
        const broadcaster = channel.id === userID
        const moderator = broadcaster || channel.mod
        const condition: EventSubCondition = { broadcaster_user_id: channel.id }
        const moderatorCondition: EventSubCondition = { broadcaster_user_id: channel.id, moderator_user_id: userID }

        const add = (type: string, version: string, subscriptionCondition: EventSubCondition = condition): void => {
          subscriptions.push({ type, version, condition: subscriptionCondition, channel: channel.username })
        }

        // Available for any channel without additional permissions
        add('stream.online', '1')
        add('stream.offline', '1')
        add('channel.update', '2')

        if (hasScope('user:read:chat')) add('channel.chat_settings.update', '1', { broadcaster_user_id: channel.id, user_id: userID })

        if (moderator && hasScope('moderator:read:followers')) add('channel.follow', '2', moderatorCondition)

        if (moderator && hasScope('moderator:read:shield_mode', 'moderator:manage:shield_mode')) {
          add('channel.shield_mode.begin', '1', moderatorCondition)
          add('channel.shield_mode.end', '1', moderatorCondition)
        }

        // Remaining subscriptions are only available for the channel that authenticated the module
        if (!broadcaster) return

        if (hasScope('channel:read:subscriptions')) {
          add('channel.subscribe', '1')
          add('channel.subscription.end', '1')
        }

        if (hasScope('channel:read:polls', 'channel:manage:polls')) {
          add('channel.poll.begin', '1')
          add('channel.poll.progress', '1')
          add('channel.poll.end', '1')
        }

        if (hasScope('channel:read:predictions', 'channel:manage:predictions')) {
          add('channel.prediction.begin', '1')
          add('channel.prediction.progress', '1')
          add('channel.prediction.lock', '1')
          add('channel.prediction.end', '1')
        }

        if (hasScope('channel:read:redemptions', 'channel:manage:redemptions')) {
          add('channel.channel_points_custom_reward_redemption.add', '1')
          // The reward list is used for the Reward Redemption feedback, so it's refreshed when the broadcaster changes their rewards
          add('channel.channel_points_custom_reward.add', '1')
          add('channel.channel_points_custom_reward.update', '1')
          add('channel.channel_points_custom_reward.remove', '1')
        }

        if (hasScope('channel:read:ads')) add('channel.ad_break.begin', '1')

        if (hasScope('channel:read:charity')) {
          add('channel.charity_campaign.start', '1')
          add('channel.charity_campaign.progress', '1')
          add('channel.charity_campaign.stop', '1')
        }

        if (hasScope('channel:read:goals')) {
          add('channel.goal.begin', '1')
          add('channel.goal.progress', '1')
          add('channel.goal.end', '1')
        }

        if (hasScope('channel:read:hype_train')) {
          // Version 1 of these was withdrawn by Twitch in January 2026 and now returns a 410
          add('channel.hype_train.begin', '2')
          add('channel.hype_train.progress', '2')
          add('channel.hype_train.end', '2')
        }
      })

    return subscriptions
  }

  /**
   * @param subscriptions Subscriptions to request
   * @description Requests each subscription in turn, Twitch requires at least one within 10s of connecting
   */
  private readonly createSubscriptions = async (subscriptions: PendingSubscription[]): Promise<void> => {
    const sessionID = this.sessionID

    for (const subscription of subscriptions) {
      // Session changed while subscribing, the new session requests its own subscriptions
      if (sessionID !== this.sessionID) return

      this.requested.add(this.subscriptionKey(subscription))

      const enabled = await this.instance.API.createEventSubSubscription(
        this.instance,
        { type: subscription.type, version: subscription.version, condition: subscription.condition },
        sessionID,
      )

      if (sessionID !== this.sessionID) return

      this.subscriptions.push({ type: subscription.type, channel: subscription.channel, enabled })
    }

    const failed = this.subscriptions.filter((subscription) => !subscription.enabled)
    this.instance.log('debug', `EventSub: ${this.subscriptions.length - failed.length} of ${this.subscriptions.length} subscriptions active`)

    if (failed.length > 0) {
      // Most commonly a missing permission, or Twitch's limit on subscriptions to channels that haven't authorized this app
      const types = [...new Set(failed.map((subscription) => `${subscription.type} (${subscription.channel})`))]
      this.instance.log('warn', `EventSub: Unable to subscribe to ${types.join(', ')}. Data for these is still updated by the once a minute API polling`)
    }
  }

  /**
   * @param type Subscription type of the notification
   * @param event Event data
   */
  private readonly handleNotification = (type: string, event: any): void => {
    const channel = this.instance.channels.find((data) => data.id === event.broadcaster_user_id)
    if (!channel) return

    switch (type) {
      case 'stream.online': {
        channel.live = new Date(event.started_at)
        this.instance.checkFeedbacks('channelStatus')
        // Viewers, title, and category are only available through the API
        this.instance.API.getStreams(this.instance)
        break
      }

      case 'stream.offline': {
        channel.live = false
        channel.viewers = 0
        this.instance.checkFeedbacks('channelStatus')
        break
      }

      case 'channel.update': {
        channel.title = event.title
        channel.categoryID = event.category_id
        channel.categoryName = event.category_name
        if (Array.isArray(event.content_classification_labels)) channel.ccl = event.content_classification_labels
        break
      }

      case 'channel.follow': {
        channel.followersTotal++
        break
      }

      case 'channel.subscribe': {
        channel.subsTotal++
        channel.subPoints += this.tierPoints(event.tier)
        break
      }

      case 'channel.subscription.end': {
        channel.subsTotal = Math.max(channel.subsTotal - 1, 0)
        channel.subPoints = Math.max(channel.subPoints - this.tierPoints(event.tier), 0)
        break
      }

      case 'channel.chat_settings.update': {
        channel.chatModes = {
          emote: event.emote_mode,
          followers: event.follower_mode,
          followersLength: event.follower_mode_duration_minutes || 0,
          slow: event.slow_mode,
          slowLength: event.slow_mode_wait_time_seconds || 0,
          sub: event.subscriber_mode,
          unique: event.unique_chat_mode,
          chatDelay: channel.chatModes.chatDelay,
        }
        this.instance.checkFeedbacks('chatStatus')
        break
      }

      case 'channel.poll.begin':
      case 'channel.poll.progress':
      case 'channel.poll.end': {
        this.updatePoll(channel, type, event)
        break
      }

      case 'channel.prediction.begin':
      case 'channel.prediction.progress':
      case 'channel.prediction.lock':
      case 'channel.prediction.end': {
        this.updatePrediction(channel, type, event)
        break
      }

      case 'channel.channel_points_custom_reward_redemption.add': {
        this.instance.addRedemption({
          id: event.id,
          rewardID: event.reward?.id || '',
          rewardTitle: event.reward?.title || '',
          rewardCost: event.reward?.cost || 0,
          user: event.user_name,
          userLogin: event.user_login,
          input: event.user_input || '',
          redeemedAt: event.redeemed_at || '',
          // Local receipt time, rather than Twitch's, so the feedback duration doesn't depend on the two clocks agreeing
          at: new Date().getTime(),
        })
        break
      }

      case 'channel.channel_points_custom_reward.add':
      case 'channel.channel_points_custom_reward.update':
      case 'channel.channel_points_custom_reward.remove': {
        this.instance.API.getCustomRewards(this.instance)
        break
      }

      case 'channel.ad_break.begin': {
        channel.adSchedule.last_ad_at = event.started_at
        channel.adSchedule.duration = parseInt(event.duration_seconds, 10) || channel.adSchedule.duration
        // The next ad, and remaining snoozes, are only available through the API
        this.instance.API.getAdSchedule(this.instance)
        break
      }

      case 'channel.shield_mode.begin':
      case 'channel.shield_mode.end': {
        channel.shieldMode = type === 'channel.shield_mode.begin'
        break
      }

      case 'channel.charity_campaign.start':
      case 'channel.charity_campaign.progress': {
        channel.charity = {
          name: event.charity_name,
          description: event.charity_description,
          logo: event.charity_logo,
          website: event.charity_website,
          current: { value: event.current_amount.value, decimal: event.current_amount.decimal_places, currency: event.current_amount.currency },
          target: { value: event.target_amount.value, decimal: event.target_amount.decimal_places, currency: event.target_amount.currency },
        }
        break
      }

      case 'channel.charity_campaign.stop': {
        channel.charity = undefined
        break
      }

      case 'channel.goal.begin':
      case 'channel.goal.progress':
      case 'channel.goal.end': {
        this.updateGoal(channel, type, event)
        break
      }

      case 'channel.hype_train.begin':
      case 'channel.hype_train.progress':
      case 'channel.hype_train.end': {
        channel.hypeTrain = {
          active: type !== 'channel.hype_train.end',
          level: event.level || 0,
          total: event.total || 0,
          progress: type === 'channel.hype_train.end' ? 0 : event.progress || 0,
          goal: type === 'channel.hype_train.end' ? 0 : event.goal || 0,
          started: event.started_at || '',
          expires: event.expires_at || '',
          cooldownEnds: event.cooldown_ends_at || '',
          type: event.type || 'regular',
          shared: event.is_shared_train === true,
          allTimeHighLevel: event.all_time_high_level || 0,
          allTimeHighTotal: event.all_time_high_total || 0,
        }
        this.instance.checkFeedbacks('hypeTrain')
        break
      }

      default: {
        this.instance.log('debug', `EventSub: Unhandled notification ${type}`)
        break
      }
    }

    this.instance.variables.updateVariables()
  }

  /**
   * @param tier Subscription tier as returned by Twitch
   * @returns Sub points the tier is worth
   */
  private readonly tierPoints = (tier: string): number => {
    if (tier === '3000') return 6
    if (tier === '2000') return 2
    return 1
  }

  /**
   * @param channel Channel the poll belongs to
   * @param type Notification type
   * @param event Poll event data
   */
  private readonly updatePoll = (channel: Channel, type: string, event: any): void => {
    const started = new Date(event.started_at).getTime()
    const ends = new Date(event.ends_at || event.ended_at || event.started_at).getTime()

    const poll = {
      id: event.id,
      title: event.title,
      choices: (event.choices || []).map((choice: any) => ({
        title: choice.title,
        votes: (choice.channel_points_votes || 0) + (choice.bits_votes || 0) + (choice.votes || 0),
        pointsVotes: choice.channel_points_votes || 0,
        bitsVotes: choice.bits_votes || 0,
      })),
      pointsVoting: event.channel_points_voting?.is_enabled || false,
      pointsPerVote: event.channel_points_voting?.amount_per_vote || 0,
      bitsVoting: event.bits_voting?.is_enabled || false,
      bitsPerVote: event.bits_voting?.amount_per_vote || 0,
      duration: Math.round((ends - started) / 1000),
      status: (type === 'channel.poll.end' ? (event.status || '').toUpperCase() : 'ACTIVE') as 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'ARCHIVED' | 'MODERATED' | 'INVALID',
      started: event.started_at,
      ended: event.ended_at || null,
    }

    if (!channel.polls) channel.polls = []
    const index = channel.polls.findIndex((data) => data.id === poll.id)

    if (index === -1) {
      channel.polls.unshift(poll)
    } else {
      channel.polls[index] = poll
    }
  }

  /**
   * @param channel Channel the prediction belongs to
   * @param type Notification type
   * @param event Prediction event data
   */
  private readonly updatePrediction = (channel: Channel, type: string, event: any): void => {
    const started = new Date(event.started_at).getTime()
    const locks = new Date(event.locks_at || event.locked_at || event.started_at).getTime()

    const status: Record<string, 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED'> = {
      'channel.prediction.begin': 'ACTIVE',
      'channel.prediction.progress': 'ACTIVE',
      'channel.prediction.lock': 'LOCKED',
    }

    const prediction = {
      id: event.id,
      title: event.title,
      outcomes: (event.outcomes || []).map((outcome: any) => ({
        id: outcome.id,
        title: outcome.title,
        users: outcome.users || 0,
        points: outcome.channel_points || 0,
        color: outcome.color,
      })),
      duration: Math.round((locks - started) / 1000),
      status: status[type] || ((event.status || '').toUpperCase() as 'RESOLVED' | 'CANCELED'),
      started: event.started_at,
      ended: event.ended_at || null,
      locked: event.locked_at || null,
    }

    if (!channel.predictions) channel.predictions = []
    const index = channel.predictions.findIndex((data) => data.id === prediction.id)

    if (index === -1) {
      channel.predictions.unshift(prediction)
    } else {
      channel.predictions[index] = prediction
    }
  }

  /**
   * @param channel Channel the goal belongs to
   * @param type Notification type
   * @param event Goal event data
   */
  private readonly updateGoal = (channel: Channel, type: string, event: any): void => {
    if (!channel.goals) channel.goals = []

    // EventSub uses 'follow' where the API uses 'follower'
    const goalType = event.type === 'follow' ? 'follower' : event.type
    const index = channel.goals.findIndex((goal) => goal.type === goalType && goal.description === event.description)

    if (type === 'channel.goal.end') {
      if (index !== -1) channel.goals.splice(index, 1)
      return
    }

    const goal = {
      type: goalType,
      description: event.description,
      current: event.current_amount,
      target: event.target_amount,
    }

    if (index === -1) {
      channel.goals.push(goal)
    } else {
      channel.goals[index] = goal
    }
  }
}
