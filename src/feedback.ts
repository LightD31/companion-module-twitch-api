import type TwitchInstance from './index'
//import { options } from './utils'
import type {
  CompanionAdvancedFeedbackResult,
  CompanionFeedbackButtonStyleResult,
  CompanionFeedbackAdvancedEvent,
  CompanionFeedbackBooleanEvent,
  SomeCompanionFeedbackInputField,
} from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import { redemptionMatches } from './utils'

export interface TwitchFeedbacks {
  channelStatus: TwitchFeedback<ChannelStatusCallback>
  chatStatus: TwitchFeedback<ChatStatusCallback>
  hypeTrain: TwitchFeedback<HypeTrainCallback>
  rewardRedemption: TwitchFeedback<RewardRedemptionCallback>

  // Index signature
  [key: string]: TwitchFeedback<any>
}

type ChatModes = 'emote' | 'followers' | 'slow' | 'sub' | 'unique'

interface ChannelStatusCallback {
  type: 'channelStatus'
  options: Readonly<{
    channel: string
  }>
}

interface ChatStatusCallback {
  type: 'chatStatus'
  options: Readonly<{
    channel: string
    mode: ChatModes
    value: string
  }>
}

interface HypeTrainCallback {
  type: 'hypeTrain'
  options: Readonly<{
    channel: string
    level: string
    trainType: string
  }>
}

interface RewardRedemptionCallback {
  type: 'rewardRedemption'
  options: Readonly<{
    reward: string
    duration: number
  }>
}

// Callback type for Presets
export type FeedbackCallbacks = ChatStatusCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionFeedbackInputField, 'default'> & {
  default: string | number | boolean | null
}

// Twitch Boolean and Advanced feedback types
interface TwitchFeedbackBoolean<T> {
  type: 'boolean'
  name: string
  description: string
  style: Partial<CompanionFeedbackButtonStyleResult>
  options: InputFieldWithDefault[]
  callback: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
  subscribe?: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
  unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackBooleanEvent, 'options' | 'type'> & T>) => boolean
}

interface TwitchFeedbackAdvanced<T> {
  type: 'advanced'
  name: string
  description: string
  options: InputFieldWithDefault[]
  callback: (feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>) => CompanionAdvancedFeedbackResult
  subscribe?: (feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>) => CompanionAdvancedFeedbackResult
  unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackAdvancedEvent, 'options' | 'type'> & T>) => CompanionAdvancedFeedbackResult
}

export type TwitchFeedback<T> = TwitchFeedbackBoolean<T> | TwitchFeedbackAdvanced<T>

export function getFeedbacks(instance: TwitchInstance): TwitchFeedbacks {
  return {
    channelStatus: {
      type: 'boolean',
      name: 'Channel Status',
      description: 'Indicates if a channel is live',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      style: {
        color: combineRgb(0, 0, 0),
        bgcolor: combineRgb(0, 255, 0),
      },
      callback: (feedback): boolean => {
        const selection = feedback.options.channel === 'selected' ? instance.selectedChannel : feedback.options.channel
        const channel = instance.channels.find((data) => data.username === selection)

        return channel !== undefined && channel?.live !== false
      },
    },

    chatStatus: {
      type: 'boolean',
      name: 'Chat Status',
      description: 'Indicates status of different chat modes',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
        {
          type: 'dropdown',
          label: 'Mode',
          id: 'mode',
          default: 'emote',
          choices: ['Emote', 'Followers', 'Slow', 'Sub', 'Unique'].map((mode) => ({
            id: mode.toLowerCase(),
            label: mode,
          })),
        },
        {
          type: 'textinput',
          label: 'Mode value',
          id: 'value',
          default: '',
          isVisible: (options) => {
            return !['emote', 'followers', 'sub', 'unique'].includes(options.mode as string)
          },
        },
      ],
      style: {
        color: combineRgb(0, 0, 0),
        bgcolor: combineRgb(255, 0, 0),
      },
      callback: (feedback): boolean => {
        const selection = feedback.options.channel === 'selected' ? instance.selectedChannel : feedback.options.channel
        const channel = instance.channels.find((data) => data.username === selection)

        if (channel && channel.chatModes[feedback.options.mode]) {
          if (feedback.options.mode === 'slow')
            return feedback.options.value === '' || feedback.options.value === (channel.chatModes.slowLength ? channel.chatModes.slowLength.toString() : '')
          return true
        }
        return false
      },
    },

    hypeTrain: {
      type: 'boolean',
      name: 'Hype Train',
      description: 'Indicates if a Hype Train is active, requires the Hype Train permission and EventSub to be enabled',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
        {
          type: 'textinput',
          label: 'Minimum Level (blank for any)',
          id: 'level',
          default: '',
        },
        {
          type: 'dropdown',
          label: 'Type',
          id: 'trainType',
          default: 'any',
          choices: [
            { id: 'any', label: 'Any' },
            { id: 'regular', label: 'Regular' },
            { id: 'treasure', label: 'Treasure' },
            { id: 'golden_kappa', label: 'Golden Kappa' },
          ],
        },
      ],
      style: {
        color: combineRgb(0, 0, 0),
        bgcolor: combineRgb(128, 0, 255),
      },
      callback: (feedback): boolean => {
        const selection = feedback.options.channel === 'selected' ? instance.selectedChannel : feedback.options.channel
        const channel = instance.channels.find((data) => data.username === selection)

        if (!channel || !channel.hypeTrain.active) return false
        if (feedback.options.trainType !== 'any' && channel.hypeTrain.type !== feedback.options.trainType) return false
        if (feedback.options.level === '') return true

        const level = parseInt(feedback.options.level, 10)
        return isNaN(level) || channel.hypeTrain.level >= level
      },
    },

    rewardRedemption: {
      type: 'boolean',
      name: 'Channel Point Reward Redeemed',
      description:
        'Active for a few seconds after a viewer redeems a Channel Point reward. Use this with a Companion Trigger set to "On Condition Become True" to run actions each time the reward is redeemed. Requires the Channel Points permission and EventSub to be enabled',
      options: [
        {
          type: 'dropdown',
          label: 'Reward',
          id: 'reward',
          default: 'any',
          allowCustom: true,
          tooltip: 'Pick a reward, or type a reward title or ID if the list is unavailable',
          choices: [{ id: 'any', label: 'Any Reward' }, ...instance.rewards.map((reward) => ({ id: reward.id, label: reward.title }))],
        },
        {
          type: 'number',
          label: 'Active for (seconds)',
          id: 'duration',
          default: 1,
          min: 1,
          max: 60,
          tooltip: 'How long this stays true after a redemption. A Trigger only needs it long enough to be noticed, a button showing the redemption may want longer',
        },
      ],
      style: {
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(145, 70, 255),
      },
      callback: (feedback): boolean => {
        // Recorded here as well as in subscribe, so a feedback Companion evaluates without subscribing is still known
        instance.redemptionFeedbacks.set(feedback.id, { reward: feedback.options.reward, duration: feedback.options.duration || 1 })

        const duration = (feedback.options.duration || 1) * 1000
        const now = new Date().getTime()

        return instance.redemptions.some((redemption) => now - redemption.at <= duration && redemptionMatches(redemption, feedback.options.reward))
      },
      subscribe: (feedback): boolean => {
        instance.redemptionFeedbacks.set(feedback.id, { reward: feedback.options.reward, duration: feedback.options.duration || 1 })
        return true
      },
      unsubscribe: (feedback): boolean => {
        instance.redemptionFeedbacks.delete(feedback.id)
        return true
      },
    },
  }
}
