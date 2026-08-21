import type TwitchInstance from '../index'
import { type APIError } from '../api'

/**
 * @param instance Twitch Instance
 * @param color A named colour, or a hex value which Twitch only allows for Turbo and Prime users
 */
export const updateUserChatColor = async (instance: TwitchInstance, color: string): Promise<void> => {
  if (!instance.auth.scopes.includes('user:manage:chat_color')) {
    instance.log('info', 'Unable to update chat colour, missing the Chat permission')
    return
  }

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'PUT'

  return fetch(`https://api.twitch.tv/helix/chat/color?user_id=${instance.auth.userID}&color=${encodeURIComponent(color)}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.status === 204 ? '' : ((await res.json()) as APIError)
    })
    .then((body) => {
      if (body === '') {
        instance.log('info', `Chat colour set to ${color}`)
      } else {
        instance.log('warn', `Failed to update chat colour: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `updateUserChatColor err: ${err.message}`)
    })
}
