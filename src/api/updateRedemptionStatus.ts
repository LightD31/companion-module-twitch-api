import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type UpdateRedemptionStatusOptions = {
  redemptionID: string
  rewardID: string
  status: 'FULFILLED' | 'CANCELED'
}

type UpdateRedemptionStatusSuccess = {
  data: {
    broadcaster_id: string
    id: string
    reward: { id: string; title: string; prompt: string; cost: number }
    user_id: string
    user_login: string
    user_name: string
    user_input: string
    status: string
    redeemed_at: string
  }[]
}

/**
 * @param instance Twitch Instance
 * @param options Redemption to update, and the status to set
 * @description Fulfils or cancels a Channel Point reward redemption in the broadcasters queue. Cancelling refunds the points
 */
export const updateRedemptionStatus = async (instance: TwitchInstance, options: UpdateRedemptionStatusOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('channel:manage:redemptions')) {
    instance.log('info', 'Unable to update a redemption, missing Channel Points permissions')
    return
  }

  if (options.redemptionID === '' || options.rewardID === '') {
    instance.log('warn', 'Unable to update a redemption without both a Redemption ID and a Reward ID')
    return
  }

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'PATCH'
  requestOptions.body = JSON.stringify({ status: options.status })

  const url = `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?id=${options.redemptionID}&broadcaster_id=${instance.auth.userID}&reward_id=${options.rewardID}`

  return fetch(url, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | UpdateRedemptionStatusSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        // Success, the EventSub update notification may not arrive if the module lacks the read scope
        instance.updateRedemptionStatus(options.redemptionID, body.data[0]?.status || options.status)
      } else {
        // Error
        instance.log('warn', `Failed to update redemption: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `updateRedemptionStatus err: ${err.message}`)
    })
}
