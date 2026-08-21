import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type ResolveUnbanRequestOptions = {
  selection: string
  requestID: string
  status: 'approved' | 'denied'
  resolutionText: string
}

type ResolveUnbanRequestSuccess = {
  data: { id: string; broadcaster_id: string; user_id: string; status: string; resolution_text: string; resolved_at: string }[]
}

/**
 * @description Approves or denies a viewers unban request, the counterpart to the unban request events
 */
export const resolveUnbanRequest = async (instance: TwitchInstance, options: ResolveUnbanRequestOptions): Promise<void> => {
  if (!instance.auth.scopes.includes('moderator:manage:unban_requests')) {
    instance.log('info', 'Unable to resolve an unban request, missing the Unban Requests permission')
    return
  }

  const channel = instance.channels.find((x) => x.username === options.selection)
  if (!channel || !channel.id) return

  if (options.requestID === '') {
    instance.log('warn', 'Unable to resolve an unban request without a request ID')
    return
  }

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'PATCH'

  let url = `https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=${channel.id}&moderator_id=${instance.auth.userID}`
  url += `&unban_request_id=${options.requestID}&status=${options.status}`
  if (options.resolutionText !== '') url += `&resolution_text=${encodeURIComponent(options.resolutionText)}`

  return fetch(url, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | ResolveUnbanRequestSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        instance.log('info', `Unban request ${options.status}`)
      } else {
        instance.log('warn', `Failed to resolve unban request: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `resolveUnbanRequest err: ${err.message}`)
    })
}
