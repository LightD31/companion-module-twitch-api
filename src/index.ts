import type {
  CompanionActionDefinitions,
  CompanionFeedbackDefinitions,
  CompanionHTTPRequest,
  CompanionHTTPResponse,
  CompanionPresetDefinitions,
  SomeCompanionConfigField,
} from '@companion-module/base'
import { InstanceBase, runEntrypoint } from '@companion-module/base'
import { API } from './api'
import { Auth } from './auth'
import { getActions } from './actions'
import { Chat } from './chat'
import type { Config } from './config'
import { getConfigFields } from './config'
import { EventSub } from './eventsub'
import { getFeedbacks } from './feedback'
import { httpHandler } from './http'
import { getPresets } from './presets'
import { redemptionMatches } from './utils'
import { Variables } from './variables'

interface Channel {
  displayName: string
  username: string
  id: string
  chatModes: {
    emote: boolean
    followers: boolean | string
    followersLength: number
    slow: boolean
    slowLength: number
    sub: boolean
    unique: boolean
    chatDelay?: boolean | string
  }
  live: Date | false
  adSchedule: {
    next_ad_at: string | number
    last_ad_at: string | number
    duration: number
    preroll_free_time: number
    snooze_count: number
    snooze_refresh_at: string | number
  }
  viewers: number
  chatters: any[]
  chattersTotal: number
  categoryID: string
  categoryName: string
  delay: number
  followersTotal: number
  mod: boolean
  title: string
  tags: string[]
  ccl: string[]
  brandedContent: boolean
  chatActivity: { recent: number[]; total: number }
  hypeTrain: {
    active: boolean
    level: number
    total: number
    progress: number
    goal: number
    started: string
    expires: string
    cooldownEnds: string
    /** Version 2 of the Hype Train events added the kind of train, and the channels record train */
    type: string
    shared: boolean
    allTimeHighLevel: number
    allTimeHighTotal: number
  }
  shieldMode: boolean
  subs: any[]
  subsTotal: number
  subPoints: number
  charity?: {
    name: string
    description: string
    logo: string
    website: string
    current: { value: number; decimal: number; currency: string }
    target: { value: number; decimal: number; currency: string }
  }
  goals?: { type: 'follower' | 'subscription' | 'subscription_count' | 'new_subscription' | 'new_subscription_count'; description: string; current: number; target: number }[]
  polls?: {
    id: string
    title: string
    choices: { title: string; votes: number; pointsVotes: number; bitsVotes: number }[]
    pointsVoting: boolean
    pointsPerVote: number
    bitsVoting: boolean
    bitsPerVote: number
    duration: number
    status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'ARCHIVED' | 'MODERATED' | 'INVALID'
    started: string
    ended: string | null
  }[]
  predictions?: {
    id: string
    title: string
    outcomes: { id: string; title: string; users: number; points: number; color: string }[]
    duration: number
    status: 'RESOLVED' | 'ACTIVE' | 'CANCELED' | 'LOCKED'
    started: string
    ended: string | null
    locked: string | null
  }[]
}

interface Reward {
  id: string
  title: string
  cost: number
  enabled: boolean
  paused: boolean
  inStock: boolean
}

interface Redemption {
  id: string
  rewardID: string
  rewardTitle: string
  rewardCost: number
  user: string
  userLogin: string
  input: string
  /** unfulfilled until it's fulfilled or canceled in the broadcasters queue */
  status: string
  /** When Twitch says it was redeemed, for display */
  redeemedAt: string
  /** When it arrived here, used for the feedback duration so a skewed clock can't break it */
  at: number
}

/** Reward Redemption feedbacks currently in use, so only the ones watching a reward are re-checked when it's redeemed */
interface RedemptionFeedback {
  reward: string
  duration: number
}

/** A momentary Twitch event, see EVENT_TYPES for the kinds tracked */
interface TwitchEvent {
  type: string
  /** Channel the event happened on */
  channel: string
  /** Viewer the event is about, such as the cheerer, raider, or warned user */
  user: string
  /** Any text that came with it, such as a cheer message or a warning reason */
  message: string
  /** Any number that came with it, such as Bits cheered or viewers raiding */
  amount: number
  at: number
}

interface EventFeedback {
  event: string
  channel: string
  duration: number
}

/**
 * Companion instance class for Studiocoast vMix
 */
class TwitchInstance extends InstanceBase<Config> {
  constructor(internal: unknown) {
    super(internal)
  }

  public API = new API(this)
  public auth = new Auth(this)
  public channels: Channel[] = []
  public config: Config = {
    accessToken: '',
    refreshToken: '',
    channels: '',
    eventSub: true,
    broadcasterAds: true,
    broadcasterBits: true,
    broadcasterChannelPoints: true,
    broadcasterCharity: true,
    broadcasterGoals: true,
    broadcasterExtensions: true,
    broadcasterHypeTrain: true,
    broadcasterModeration: true,
    broadcasterPollsPredictions: true,
    broadcasterRaids: true,
    broadcasterStreamKey: true,
    broadcasterGuestStar: true,
    broadcasterSubscriptions: true,
    broadcasterVIPs: true,
    editorStreamMarkers: true,
		editorCreateClips: true,
    moderatorAnnouncements: true,
    moderatorAutomod: true,
    moderatorChatModeration: true,
    moderatorChatters: true,
    moderatorFollowers: true,
    moderatorShieldMode: true,
    moderatorShoutouts: true,
    moderatorGuestStar: true,
    moderatorUnbanRequests: true,
    moderatorWarnings: true,
    userChat: true,
    userClips: true,
  }
  public connected = false
  public data = {}
  public rewards: Reward[] = []
  public redemptions: Redemption[] = []
  public redemptionCount = 0
  /** Per reward totals and last redemption, keyed by reward ID */
  public rewardRedemptions: Map<string, { count: number; user: string; input: string }> = new Map()
  public redemptionFeedbacks: Map<string, RedemptionFeedback> = new Map()
  public events: TwitchEvent[] = []
  public eventCount = 0
  /** Per event type totals and the last one of that type */
  public eventTotals: Map<string, { count: number; user: string; message: string; amount: number }> = new Map()
  public eventFeedbacks: Map<string, EventFeedback> = new Map()
  private redemptionTimers: Set<ReturnType<typeof setTimeout>> = new Set()
  public updateStateInterval: ReturnType<typeof setInterval> | null = null
  public selectedChannel = ''

  public readonly chat = new Chat(this)
  public readonly eventSub = new EventSub(this)
  public readonly variables = new Variables(this)

  /**
   * @description triggered on instance being enabled
   */
  public async init(config: Config): Promise<void> {
    this.log('debug', `Process ID: ${process.pid}`)
    this.config = config
    this.updateInstance()
    this.variables.updateDefinitions()
    this.auth.init()
    this.updateStateInterval = setInterval(() => this.updateState(), 1000)
  }

  /**d
   * @returns config options
   * @description generates the config options available for this instance
   */
  public getConfigFields(): SomeCompanionConfigField[] {
    return getConfigFields(this)
  }

  /**
   * @param config new configuration data
   * @description triggered every time the config for this instance is saved
   */
  public async configUpdated(config: Config): Promise<void> {
    const channelUpdate = config.channels !== this.config.channels
    this.config = config

    // updateInstance refreshes EventSub itself, once the new channels have been looked up
    if (channelUpdate) {
      this.updateInstance()
    } else {
      this.eventSub.update()
    }

    this.variables.updateDefinitions()
  }

  /**
   * @description close connections and stop timers/intervals
   */
  public async destroy(): Promise<void> {
    this.chat.destroy()
    this.eventSub.destroy()
    this.redemptionTimers.forEach((timer) => clearTimeout(timer))
    this.redemptionTimers.clear()
    this.auth.destroy()
    this.API.destroy()
    if (this.updateStateInterval !== null) clearInterval(this.updateStateInterval)

    this.log('debug', `Instance destroyed: ${this.id}`)
  }

  /**
   * @description sets channels, token, actions, and feedbacks available for this instance
   */
  public async updateInstance(): Promise<void> {
    this.channels = this.config.channels
      .replace(/,/g, ' ')
      .split(' ')
      .filter((channel) => channel !== '')
      .map((channel) => {
        let username = channel.toLowerCase()
        let displayName = channel

        if (channel.includes(':')) {
          username = channel.split(':')[0].toLowerCase()
          displayName = channel.split(':')[1]
        }

        const channelData: Channel = {
          displayName: displayName,
          username: username,
          id: '',
          chatModes: { emote: false, followers: false, followersLength: 0, slow: false, slowLength: 30, sub: false, unique: false },
          live: false,
          adSchedule: {
            next_ad_at: '',
            last_ad_at: '',
            duration: 0,
            preroll_free_time: 0,
            snooze_count: 0,
            snooze_refresh_at: '',
          },
          viewers: 0,
          chatters: [],
          chattersTotal: 0,
          categoryID: '',
          categoryName: '',
          delay: 0,
          followersTotal: 0,
          mod: false,
          title: '',
          tags: [],
          ccl: [],
          brandedContent: false,
          chatActivity: { recent: [], total: 0 },
          hypeTrain: {
            active: false,
            level: 0,
            total: 0,
            progress: 0,
            goal: 0,
            started: '',
            expires: '',
            cooldownEnds: '',
            type: '',
            shared: false,
            allTimeHighLevel: 0,
            allTimeHighTotal: 0,
          },
          shieldMode: false,
          subs: [],
          subsTotal: 0,
          subPoints: 0,
          goals: [],
        }

        for (let i = 0; i < 60; i++) {
          channelData.chatActivity.recent.push(0)
        }

        return channelData
      })

    this.channels.sort((a, b) => {
      return a.username < b.username ? -1 : 1
    })

    await this.API.updateUsers(this)

    if (!this.auth.valid) return
    this.chat.update()
    this.eventSub.update()

    // Cast actions and feedbacks from VMix types to Companion types
    const actions = getActions(this) as CompanionActionDefinitions
    const feedbacks = getFeedbacks(this) as unknown as CompanionFeedbackDefinitions
    const presets = getPresets(this) as unknown as CompanionPresetDefinitions

    this.setActionDefinitions(actions)
    this.setFeedbackDefinitions(feedbacks)
    this.setPresetDefinitions(presets)
    this.variables.updateVariables()
  }

  /**
   * @description Refreshes feedback and variable definitions, used when the Channel Point rewards change
   */
  public updateFeedbackDefinitions(): void {
    this.setFeedbackDefinitions(getFeedbacks(this) as unknown as CompanionFeedbackDefinitions)
    this.variables.updateDefinitions()
  }

  /**
   * @param redemption Channel Point reward redemption
   * @description Records a redemption, then activates the feedbacks watching that reward and schedules them to go back
   * to false once their duration has elapsed
   */
  /**
   * @param entries Feedbacks of one type currently in use
   * @param matches Whether a feedback cares about what just happened
   * @description Turns matching feedbacks on now, and schedules each duration in use to turn them back off
   */
  private activateTimedFeedbacks<T extends { duration: number }>(entries: Map<string, T>, matches: (entry: T) => boolean): void {
    const durations: Map<number, string[]> = new Map()

    entries.forEach((entry, id) => {
      if (!matches(entry)) return
      durations.set(entry.duration, [...(durations.get(entry.duration) || []), id])
    })

    const ids = [...durations.values()].flat()
    if (ids.length > 0) this.checkFeedbacksById(...ids)

    durations.forEach((feedbackIds, duration) => {
      const timer = setTimeout(
        () => {
          this.redemptionTimers.delete(timer)
          this.checkFeedbacksById(...feedbackIds)
        },
        duration * 1000 + 100,
      )

      this.redemptionTimers.add(timer)
    })
  }

  /**
   * @param event Momentary Twitch event
   * @description Records an event, then activates the feedbacks watching it
   */
  public addEvent(event: TwitchEvent): void {
    this.events.unshift(event)
    if (this.events.length > 20) this.events.pop()
    this.eventCount++

    const totals = this.eventTotals.get(event.type) || { count: 0, user: '', message: '', amount: 0 }
    this.eventTotals.set(event.type, { count: totals.count + 1, user: event.user, message: event.message, amount: event.amount })

    this.activateTimedFeedbacks(
      this.eventFeedbacks,
      (feedback) => (feedback.event === 'any' || feedback.event === event.type) && (feedback.channel === 'any' || feedback.channel === event.channel),
    )

    this.variables.updateVariables()
  }

  public addRedemption(redemption: Redemption): void {
    this.redemptions.unshift(redemption)
    if (this.redemptions.length > 20) this.redemptions.pop()
    this.redemptionCount++

    const rewardTotals = this.rewardRedemptions.get(redemption.rewardID) || { count: 0, user: '', input: '' }
    this.rewardRedemptions.set(redemption.rewardID, { count: rewardTotals.count + 1, user: redemption.user, input: redemption.input })

    this.activateTimedFeedbacks(this.redemptionFeedbacks, (feedback) => redemptionMatches(redemption, feedback.reward))

    this.variables.updateVariables()
  }

  /**
   * @param redemptionID Redemption that changed
   * @param status New status, fulfilled or canceled
   * @description Updates a recorded redemption when it's handled in the broadcasters queue
   */
  public updateRedemptionStatus(redemptionID: string, status: string): void {
    const redemption = this.redemptions.find((data) => data.id === redemptionID)
    if (!redemption) return

    redemption.status = status
    this.variables.updateVariables()
  }

  private updateState(): void {
    const minute = new Date().getSeconds() === 0

    if (minute) {
      this.channels.forEach((channel) => {
        channel.chatActivity.recent.unshift(0)
        channel.chatActivity.recent.pop()
      })

      this.API.pollData()
      this.eventSub.update()
    }

    this.variables.updateVariables()
  }

  /**
   * @param request HTTP request from Companion
   * @returns HTTP response
   */
  public async handleHttpRequest(request: CompanionHTTPRequest): Promise<CompanionHTTPResponse> {
    return httpHandler(this, request)
  }
}

export = TwitchInstance

runEntrypoint(TwitchInstance, [])
