import type TwitchInstance from '.'
import Endpoints from './api/endpoints'

export type APIError = {
  error?: string
  status: number
  message: string
}

export class API extends Endpoints {
  constructor(instance: TwitchInstance) {
    super()
    this.instance = instance

    this.#updateRequestCountInterval = setInterval(this.#updateRequestsPerMin, 1000)
  }

  instance: TwitchInstance
  ratelimitLimit = '800'
  ratelimitRemaining = '800'
  requestCount = [0]
  requestsPerMin = 0
  #updateRequestCountInterval: ReturnType<typeof setInterval> | null = null

  clip = {
    id: '',
    url: '',
    edit_url: '',
  }

  readonly defaultOptions = (): RequestInit => {
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Client-Id': this.instance.auth.clientID,
        Authorization: `Bearer ${this.instance.auth.accessToken}`,
        'Content-Type': 'application/json',
        'user-agent': '',
      },
    }

    return options
  }

  /**
   * @returns Username of the channel that authenticated the module, which is the only one these endpoints cover
   */
  readonly #broadcaster = (): string | undefined => {
    return this.instance.channels.find((channel) => channel.id === this.instance.auth.userID)?.username
  }

  readonly pollData = async (): Promise<void> => {
    if (this.instance.channels.length > 0 && this.instance.auth.valid) {
      const scopes = this.instance.auth.scopes
      const broadcaster = this.#broadcaster()

      // Anything EventSub is currently delivering is left to it, and polled again only if that stops
      const covered = (type: string): boolean => this.instance.eventSub.covers(type, broadcaster)

      await this.updateUsers(this.instance)

      // EventSub has no viewer count, and no unfollow event to keep a follower total accurate
      this.getStreams(this.instance)
      this.getChannelFollowers(this.instance)

      // Neither the channels being moderated nor the chatter count exist as EventSub subscriptions
      if (scopes.includes('user:read:moderated_channels')) this.getModeratedChannels(this.instance)
      if (scopes.includes('moderator:read:chatters')) this.getChatters(this.instance)

      if (scopes.includes('channel:read:charity') && !covered('channel.charity_campaign.progress')) this.getCharityCampaign(this.instance)
      if (scopes.includes('channel:read:goals') && !covered('channel.goal.progress')) this.getCreatorGoals(this.instance)
      if (scopes.includes('channel:manage:polls') && !covered('channel.poll.progress')) this.getPolls(this.instance)
      if (scopes.includes('channel:manage:predictions') && !covered('channel.prediction.progress')) this.getPredictions(this.instance)
    }
  }

  /**
   * @description Data EventSub then keeps current, so it's only read once to have a starting point. EventSub reports
   * changes rather than the current state, so without this an in progress poll, goal, or charity campaign would stay
   * unknown until the next time it changed
   */
  public readonly initialPoll = (): void => {
    if (this.instance.channels.length > 0 && this.instance.auth.valid) {
      const scopes = this.instance.auth.scopes

      this.getChatSettings(this.instance)
      if (scopes.includes('channel:read:subscriptions')) this.getBroadcasterSubscriptions(this.instance)
      if (scopes.includes('channel:read:ads')) this.getAdSchedule(this.instance)
      if (scopes.includes('moderator:manage:shield_mode')) this.getShieldModeStatus(this.instance)
      if (scopes.includes('channel:manage:redemptions') || scopes.includes('channel:read:redemptions')) this.getCustomRewards(this.instance)
      if (scopes.includes('channel:read:charity')) this.getCharityCampaign(this.instance)
      if (scopes.includes('channel:read:goals')) this.getCreatorGoals(this.instance)
      if (scopes.includes('channel:manage:polls')) this.getPolls(this.instance)
      if (scopes.includes('channel:manage:predictions')) this.getPredictions(this.instance)
      if (scopes.includes('channel:read:hype_train')) this.getHypeTrainStatus(this.instance)
    }
  }

  readonly updateRatelimits = (headers: Headers): void => {
    const limit = headers.get('Ratelimit-Limit')
    const remaining = headers.get('Ratelimit-Remaining')

    if (limit) this.ratelimitLimit = limit
    if (remaining) this.ratelimitRemaining = remaining

    this.requestCount[0]++
  }

  readonly #updateRequestsPerMin = (): void => {
    this.requestsPerMin = this.requestCount.reduce((prev, current) => prev + current, 0)
    this.requestCount.unshift(0)
    if (this.requestCount.length > 60) this.requestCount.pop()
  }

  readonly destroy = (): void => {
    if (this.#updateRequestCountInterval) clearInterval(this.#updateRequestCountInterval)
  }
}
