import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type UpdateChannelVIPOptions = {
  user: string
  add: boolean
}

/**
 * @description Gives or removes VIP on the current users channel
 */
export const updateChannelVIP = async (instance: TwitchInstance, options: UpdateChannelVIPOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('channel:manage:vips')) {
    instance.log('info', 'Unable to update VIPs, missing the VIPs permission')
    return
  }

  const userID = await instance.API.resolveUserID(instance, options.user)
  if (userID === null) return

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = options.add ? 'POST' : 'DELETE'

  return fetch(`https://api.twitch.tv/helix/channels/vips?broadcaster_id=${instance.auth.userID}&user_id=${userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.status === 204 ? '' : ((await res.json()) as APIError)
    })
    .then((body) => {
      if (body === '') {
        instance.log('info', `${options.add ? 'Added' : 'Removed'} VIP for ${options.user}`)
      } else {
        instance.log('warn', `Failed to ${options.add ? 'add' : 'remove'} VIP: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `updateChannelVIP err: ${err.message}`)
    })
}
