import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type UpdateShieldModeStatusOptions = {
  selection: string
  active: boolean
}

type UpdateShieldModeStatusSuccess = {
  data: { is_active: boolean; moderator_id: string; moderator_name: string; moderator_login: string; last_activated_at: string }[]
}

/**
 * @description Turns Shield Mode on or off, the counterpart to the Shield Mode status the module already reads
 */
export const updateShieldModeStatus = async (instance: TwitchInstance, options: UpdateShieldModeStatusOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:shield_mode')) {
    instance.log('info', 'Unable to update Shield Mode, missing the Shield Mode permission')
    return
  }

  const channel = instance.channels.find((x) => x.username === options.selection)
  if (!channel || !channel.id) return

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'PUT'
  requestOptions.body = JSON.stringify({ is_active: options.active })

  return fetch(`https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${channel.id}&moderator_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | UpdateShieldModeStatusSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        // The EventSub notification covers this too, but not when the module lacks the read scope
        channel.shieldMode = body.data[0]?.is_active ?? options.active
        instance.checkFeedbacks('shieldMode')
        instance.log('info', `Shield Mode ${channel.shieldMode ? 'enabled' : 'disabled'} on ${channel.displayName || channel.username}`)
      } else {
        instance.log('warn', `Failed to update Shield Mode: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `updateShieldModeStatus err: ${err.message}`)
    })
}
