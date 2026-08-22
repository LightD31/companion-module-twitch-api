import type TwitchInstance from '../index'
import { type APIError } from '../api'

/**
 * @description Cancels a raid that has been started but hasn't gone through yet
 */
export const cancelARaid = async (instance: TwitchInstance): Promise<void> => {
  if (!instance.auth.scopes.includes('channel:manage:raids')) {
    instance.log('info', 'Unable to cancel a raid, missing the Raids permission')
    return
  }

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'DELETE'

  return fetch(`https://api.twitch.tv/helix/raids?broadcaster_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.status === 204 ? '' : ((await res.json()) as APIError)
    })
    .then((body) => {
      if (body === '') {
        instance.log('info', 'Cancelled the raid')
      } else {
        instance.log('warn', `Failed to cancel the raid: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `cancelARaid err: ${err.message}`)
    })
}
