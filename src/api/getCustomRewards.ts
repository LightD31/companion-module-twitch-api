import type TwitchInstance from '../index'
import { type APIError } from '../api'

type GetCustomRewardsSuccess = {
  data: {
    broadcaster_id: string
    broadcaster_login: string
    broadcaster_name: string
    id: string
    title: string
    prompt: string
    cost: number
    is_enabled: boolean
    is_paused: boolean
    is_in_stock: boolean
    is_user_input_required: boolean
    background_color: string
  }[]
}

export const getCustomRewards = async (instance: TwitchInstance): Promise<void> => {
  if (!instance.auth.scopes.includes('channel:read:redemptions') && !instance.auth.scopes.includes('channel:manage:redemptions')) {
    instance.log('debug', 'Unable to get Custom Rewards, missing Channel Points permissions')
    return
  }

  const requestOptions = instance.API.defaultOptions()

  return fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | GetCustomRewardsSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        // Success
        const rewards = body.data.map((reward) => ({
          id: reward.id,
          title: reward.title,
          cost: reward.cost,
          enabled: reward.is_enabled,
          paused: reward.is_paused,
          inStock: reward.is_in_stock,
        }))

        // The rewards are used for the Reward Redemption feedback dropdown, so the definitions are refreshed when the list changes
        const changed = JSON.stringify(rewards.map((reward) => `${reward.id}${reward.title}`)) !== JSON.stringify(instance.rewards.map((reward) => `${reward.id}${reward.title}`))

        instance.rewards = rewards
        if (changed) instance.updateFeedbackDefinitions()
      } else {
        // Error
        instance.log('debug', `Failed to get Custom Rewards: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `getCustomRewards err: ${err.message}`)
    })
}
