import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type ManageHeldAutoModMessageOptions = {
  messageID: string
  allow: boolean
}

/**
 * @description Allows or denies a message AutoMod is holding for review, the counterpart to the AutoMod hold events
 */
export const manageHeldAutoModMessage = async (instance: TwitchInstance, options: ManageHeldAutoModMessageOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:automod')) {
    instance.log('info', 'Unable to manage a held message, missing the AutoMod permission')
    return
  }

  if (options.messageID === '') {
    instance.log('warn', 'Unable to manage a held message without a message ID')
    return
  }

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'POST'
  requestOptions.body = JSON.stringify({ user_id: instance.auth.userID, msg_id: options.messageID, action: options.allow ? 'ALLOW' : 'DENY' })

  return fetch('https://api.twitch.tv/helix/moderation/automod/message', requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.status === 204 ? '' : ((await res.json()) as APIError)
    })
    .then((body) => {
      if (body === '') {
        instance.log('info', `Held message ${options.allow ? 'allowed' : 'denied'}`)
      } else {
        instance.log('warn', `Failed to manage held message: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `manageHeldAutoModMessage err: ${err.message}`)
    })
}
