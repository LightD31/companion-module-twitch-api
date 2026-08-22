import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type WarnChatUserOptions = {
  selection: string
  user: string
  reason: string
}

type WarnChatUserSuccess = {
  data: { broadcaster_id: string; user_id: string; moderator_id: string; reason: string }[]
}

/**
 * @description Warns a viewer, who has to acknowledge it before they can chat again
 */
export const warnChatUser = async (instance: TwitchInstance, options: WarnChatUserOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:warnings')) {
    instance.log('info', 'Unable to warn a user, missing the Warnings permission')
    return
  }

  const channel = instance.channels.find((x) => x.username === options.selection)
  if (!channel || !channel.id) return

  const userID = await instance.API.resolveUserID(instance, options.user)
  if (userID === null) return

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'POST'
  requestOptions.body = JSON.stringify({ data: { user_id: userID, reason: options.reason } })

  return fetch(`https://api.twitch.tv/helix/moderation/warnings?broadcaster_id=${channel.id}&moderator_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | WarnChatUserSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        instance.log('info', `Warned ${options.user}`)
      } else {
        instance.log('warn', `Failed to warn ${options.user}: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `warnChatUser err: ${err.message}`)
    })
}
