import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type BanUserOptions = {
  selection: string
  user: string
  reason: string
  /** Seconds for a timeout, or 0 for a permanent ban */
  duration: number
}

type BanUserSuccess = {
  data: { broadcaster_id: string; moderator_id: string; user_id: string; created_at: string; end_time: string | null }[]
}

/**
 * @description Bans a viewer, or times them out when given a duration
 */
export const banUser = async (instance: TwitchInstance, options: BanUserOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:banned_users')) {
    instance.log('info', 'Unable to ban a user, missing the Chat Moderation permissions')
    return
  }

  const channel = instance.channels.find((x) => x.username === options.selection)
  if (!channel || !channel.id) return

  const userID = await instance.API.resolveUserID(instance, options.user)
  if (userID === null) return

  const data: Record<string, any> = { user_id: userID }
  if (options.duration > 0) data.duration = options.duration
  if (options.reason !== '') data.reason = options.reason

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'POST'
  requestOptions.body = JSON.stringify({ data })

  return fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channel.id}&moderator_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | BanUserSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        instance.log('info', `${options.duration > 0 ? `Timed out ${options.user} for ${options.duration}s` : `Banned ${options.user}`}`)
      } else {
        instance.log('warn', `Failed to ban ${options.user}: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `banUser err: ${err.message}`)
    })
}
