import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type SendShoutoutOptions = {
  /** Channel giving the shoutout */
  selection: string
  /** Username of the channel being shouted out */
  target: string
}

/**
 * @description Gives another channel a Twitch shoutout. Twitch rate limits these to one every 2 minutes,
 * and one per target every 60 minutes
 */
export const sendShoutout = async (instance: TwitchInstance, options: SendShoutoutOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:shoutouts')) {
    instance.log('info', 'Unable to send a shoutout, missing the Shoutouts permission')
    return
  }

  const channel = instance.channels.find((x) => x.username === options.selection)
  if (!channel || !channel.id) return

  const targetID = await instance.API.resolveUserID(instance, options.target)
  if (targetID === null) return

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'POST'

  const url = `https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id=${channel.id}&to_broadcaster_id=${targetID}&moderator_id=${instance.auth.userID}`

  return fetch(url, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.status === 204 ? '' : ((await res.json()) as APIError)
    })
    .then((body) => {
      if (body === '') {
        instance.log('info', `Sent a shoutout to ${options.target}`)
      } else {
        instance.log('warn', `Failed to send a shoutout: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `sendShoutout err: ${err.message}`)
    })
}
