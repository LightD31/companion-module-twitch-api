import type TwitchInstance from '../index'
import { type APIError } from '../api'

type SnoozeNextAdSuccess = {
  data: {
    snooze_count: number
    snooze_refresh_at: string | number
    next_ad_at: string | number
  }[]
}

export const snoozeNextAd = async (instance: TwitchInstance): Promise<void> => {
  if (!instance.auth.scopes.includes('channel:manage:ads')) {
    instance.log('info', 'Unable to snooze the next ad, missing the Ads permission')
    return
  }

  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'POST'

  return fetch(`https://api.twitch.tv/helix/channels/ads/schedule/snooze?broadcaster_id=${instance.auth.userID}`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | SnoozeNextAdSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        // Success, the response carries the new schedule so the ad variables don't go stale until the next poll
        instance.log('debug', `Successfully snoozed ad - ${JSON.stringify(body)}`)
        const data = body.data[0]
        const channel = instance.channels.find((x) => x.id === instance.auth.userID)

        if (channel && data) {
          channel.adSchedule.next_ad_at = data.next_ad_at
          channel.adSchedule.snooze_count = data.snooze_count
          channel.adSchedule.snooze_refresh_at = data.snooze_refresh_at

          instance.variables.set({
            ad_next: data.next_ad_at,
            ad_snooze_count: data.snooze_count,
            ad_snooze_refresh: data.snooze_refresh_at,
          })
        }
      } else {
        // Error
        instance.log('warn', `Failed to Snooze next Ad: ${JSON.stringify(body)}`)
      }
    })
    .catch((err) => {
      instance.log('warn', `snoozeNextAd err: ${err.message}`)
    })
}
