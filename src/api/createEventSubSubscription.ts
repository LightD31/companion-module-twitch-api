import type TwitchInstance from '../index'
import { type APIError } from '../api'

export type EventSubCondition = Record<string, string>

export type EventSubSubscriptionRequest = {
  type: string
  version: string
  condition: EventSubCondition
}

type CreateEventSubSubscriptionSuccess = {
  data: {
    id: string
    status: string
    type: string
    version: string
    condition: EventSubCondition
    created_at: string
    transport: {
      method: string
      session_id: string
    }
    cost: number
  }[]
  total: number
  total_cost: number
  max_total_cost: number
}

/**
 * @param instance Twitch Instance
 * @param subscription EventSub subscription type, version, and condition
 * @param sessionID EventSub WebSocket session ID to deliver notifications to
 * @returns Whether the subscription was created
 * @description Creates an EventSub subscription delivered over the modules EventSub WebSocket connection
 */
export const createEventSubSubscription = async (instance: TwitchInstance, subscription: EventSubSubscriptionRequest, sessionID: string): Promise<boolean> => {
  const requestOptions = instance.API.defaultOptions()
  requestOptions.method = 'POST'
  requestOptions.body = JSON.stringify({ ...subscription, transport: { method: 'websocket', session_id: sessionID } })

  return fetch('https://api.twitch.tv/helix/eventsub/subscriptions', requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | CreateEventSubSubscriptionSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        // Success
        return true
      } else {
        // Error
        instance.log('debug', `Failed to create EventSub subscription ${subscription.type}: ${JSON.stringify(body)}`)
        return false
      }
    })
    .catch((err) => {
      instance.log('warn', `createEventSubSubscription err: ${err.message}`)
      return false
    })
}
