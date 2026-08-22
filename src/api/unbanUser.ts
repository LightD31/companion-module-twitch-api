import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type UnbanUserOptions = {
  selection: string
  user: string
}

/**
 * @description Removes a ban or timeout from a viewer
 */
export const unbanUser = async (instance: TwitchInstance, options: UnbanUserOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:banned_users')) {
    instance.log('info', 'Unable to unban a user, missing the Chat Moderation permissions')
    return
  }

  const channel = instance.channels.find((x) => x.username === options.selection)
  if (!channel || !channel.id) return

  const userID = await instance.API.resolveUserID(instance, options.user)
  if (userID === null) return

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'DELETE'

  const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channel.id}&moderator_id=${instance.auth.userID}&user_id=${userID}`

  return fetch(url, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.status === 204 ? '' : ((await res.json()) as APIError)
    })
    .then((body) => {
      if (body === '') {
        instance.log('info', `Unbanned ${options.user}`)
      } else {
        instance.log('warn', `Failed to unban ${options.user}: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `unbanUser err: ${err.message}`)
    })
}
