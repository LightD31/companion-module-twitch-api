import type TwitchInstance from '../index'
import { type APIError } from '../api'

type GetHypeTrainStatusSuccess = {
  data: {
    current: {
      id: string
      level: number
      total: number
      progress: number
      goal: number
      type: string
      started_at: string
      expires_at: string
    } | null
    all_time_high: {
      level: number
      total: number
    } | null
  }[]
}

/**
 * @description EventSub reports Hype Train changes rather than current state, so a train already running when the
 * module starts would otherwise stay unknown until it next levelled up. This reads that starting point
 */
export const getHypeTrainStatus = async (instance: TwitchInstance): Promise<void> => {
  if (!instance.auth.scopes.includes('channel:read:hype_train')) {
    instance.log('debug', 'Unable to get Hype Train status, missing the Hype Train permission')
    return
  }

  const requestOptions = instance.API.defaultOptions()

  return fetch(`https://api.twitch.tv/helix/hypetrain/status?broadcaster_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | GetHypeTrainStatusSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        // Success
        const channel = instance.channels.find((x) => x.id === instance.auth.userID)
        if (!channel) return

        const status = body.data[0]
        const current = status?.current || null

        channel.hypeTrain = {
          active: current !== null,
          level: current?.level || 0,
          total: current?.total || 0,
          progress: current?.progress || 0,
          goal: current?.goal || 0,
          started: current?.started_at || '',
          expires: current?.expires_at || '',
          cooldownEnds: channel.hypeTrain.cooldownEnds,
          type: current?.type || 'regular',
          shared: channel.hypeTrain.shared,
          allTimeHighLevel: status?.all_time_high?.level || 0,
          allTimeHighTotal: status?.all_time_high?.total || 0,
        }

        instance.checkFeedbacks('hypeTrain')
      } else {
        // Error
        instance.log('debug', `Failed to get Hype Train status: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `getHypeTrainStatus err: ${err.message}`)
    })
}
