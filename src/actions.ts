import type { CompanionActionContext, CompanionActionEvent, SomeCompanionActionInputField } from '@companion-module/base'
import type TwitchInstance from './index'
import open from 'open'
import type { ClipOptions } from './api/createClip'
import type { ClipVODOptions } from './api/createClipVOD'
import type { UpdateRedemptionStatusOptions } from './api/updateRedemptionStatus'

export interface TwitchActions {
  // API
  adStart: TwitchAction<AdStartCallback>
	createClip: TwitchAction<CreateClipCallback>
	createClipVOD: TwitchAction<CreateClipVODCallback>
  automodMessage: TwitchAction<AutomodMessageCallback>
  banUser: TwitchAction<BanUserCallback>
  cancelRaid: TwitchAction<CancelRaidCallback>
  createPoll: TwitchAction<CreatePollCallback>
  endPoll: TwitchAction<EndPollCallback>
  endPrediction: TwitchAction<EndPrediction>
  marker: TwitchAction<MarkerCallback>
  request: TwitchAction<RequestCallback>
  resolveUnbanRequest: TwitchAction<ResolveUnbanRequestCallback>
  shieldMode: TwitchAction<ShieldModeCallback>
  shoutout: TwitchAction<ShoutoutCallback>
  vip: TwitchAction<VIPCallback>
  warnUser: TwitchAction<WarnUserCallback>
  updateRedemption: TwitchAction<UpdateRedemptionCallback>

  // Chat
  clearChat: TwitchAction<ClearChatCallback>
  resetChatTotal: TwitchAction<ResetChatTotalCallback>
  chatModeEmote: TwitchAction<ChatModeEmoteCallback>
  chatModeFollowers: TwitchAction<ChatModeFollowersCallback>
  chatModeSlow: TwitchAction<ChatModeSlowCallback>
  chatModeSub: TwitchAction<ChatModeSubCallback>
  chatModeUnique: TwitchAction<ChatModeUniqueCallback>

  // Util
  selectChannel: TwitchAction<SelectChannelCallback>
  streamOpen: TwitchAction<StreamOpenCallback>

  // Index signature
  [key: string]: TwitchAction<any>
}

interface AutomodMessageCallback {
  actionId: 'automodMessage'
  options: {
    target: 'last' | 'custom'
    messageId: string
    allow: boolean
  }
}

interface BanUserCallback {
  actionId: 'banUser'
  options: {
    channel: string
    user: string
    mode: 'ban' | 'timeout' | 'unban'
    duration: string
    reason: string
  }
}

interface CancelRaidCallback {
  actionId: 'cancelRaid'
  options: Record<string, never>
}

interface ResolveUnbanRequestCallback {
  actionId: 'resolveUnbanRequest'
  options: {
    channel: string
    target: 'last' | 'custom'
    requestId: string
    status: 'approved' | 'denied'
    resolutionText: string
  }
}

interface ShieldModeCallback {
  actionId: 'shieldMode'
  options: {
    channel: string
    mode: 'on' | 'off' | 'toggle'
  }
}

interface ShoutoutCallback {
  actionId: 'shoutout'
  options: {
    channel: string
    target: string
  }
}

interface VIPCallback {
  actionId: 'vip'
  options: {
    user: string
    mode: 'add' | 'remove'
  }
}

interface WarnUserCallback {
  actionId: 'warnUser'
  options: {
    channel: string
    user: string
    reason: string
  }
}

interface UpdateRedemptionCallback {
  actionId: 'updateRedemption'
  options: {
    target: 'last' | 'custom'
    redemptionId: string
    rewardId: string
    status: 'FULFILLED' | 'CANCELED'
  }
}

interface AdStartCallback {
  actionId: 'adStart'
  options: {
    length: '30' | '60' | '90' | '120' | '150' | '180'
  }
}

interface CreateClipCallback {
	actionId: 'createClip'
	options: {
		channel: string
		title?: string
		duration?: string
	}
}

interface CreateClipVODCallback {
	actionId: 'createClipVOD'
	options: {
		channel: string
		vodID: string
		offset: string
		duration: string
		title: string
	}
}

interface CreatePollCallback {
  actionId: 'createPoll'
  options: {
    title: string
    choice1: string
    choice2: string
    choice3: string
    choice4: string
    choice5: string
    duration: string
    channelPoints: boolean
    channelPointsValue: string
  }
}

interface EndPollCallback {
  actionId: 'endPoll'
  options: {
    status: 'TERMINATED' | 'ARCHIVED'
  }
}

interface EndPrediction {
  actionId: 'endPrediction'
  options: {
    status: 'RESOLVED' | 'CANCELED' | 'LOCKED'
    outcome: string
  }
}

interface MarkerCallback {
  actionId: 'marker'
  options: {
    channel: string
  }
}

interface RequestCallback {
  actionId: 'request'
  options: {
    url: string
    method: 'get' | 'put' | 'post' | 'patch' | 'delete'
    body: string
  }
}

interface ClearChatCallback {
  actionId: 'clearChat'
  options: {
    channel: string
  }
}

interface ChatModeEmoteCallback {
  actionId: 'chatModeEmote'
  options: {
    channel: string
  }
}

interface ChatModeFollowersCallback {
  actionId: 'chatModeFollowers'
  options: {
    channel: string
    length: string
  }
}

interface ChatModeSlowCallback {
  actionId: 'chatModeSlow'
  options: {
    channel: string
    length: number
  }
}

interface ChatModeSubCallback {
  actionId: 'chatModeSub'
  options: {
    channel: string
  }
}

interface ChatModeUniqueCallback {
  actionId: 'chatModeUnique'
  options: {
    channel: string
  }
}

interface ResetChatTotalCallback {
  actionId: 'resetChatTotal'
  options: {
    channel: string
  }
}

interface SelectChannelCallback {
  actionId: 'selectChannel'
  options: {
    channel: string
  }
}

interface StreamOpenCallback {
  actionId: 'streamOpen'
  options: {
    channel: string
  }
}

export type ActionCallbacks =
  | AdStartCallback
	| CreateClipCallback
	| CreateClipVODCallback
  | CreatePollCallback
  | EndPollCallback
  | EndPrediction
  | MarkerCallback
  | RequestCallback
  | ClearChatCallback
  | ChatModeEmoteCallback
  | ChatModeFollowersCallback
  | ChatModeSlowCallback
  | ChatModeSubCallback
  | ChatModeUniqueCallback
  | ResetChatTotalCallback
  | SelectChannelCallback
  | StreamOpenCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionActionInputField, 'default'> & {
  default: string | number | boolean | null
}

// Actions specific to Twitch
export interface TwitchAction<T> {
  name: string
  description?: string
  options: InputFieldWithDefault[]
  callback: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>, context: CompanionActionContext) => void | Promise<void>
  subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
  unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

export function getActions(instance: TwitchInstance): TwitchActions {
  return {
    // API
    adStart: {
      name: 'Start a channel commercial',
      description: 'Requires user to be Affiliate or Partner',
      options: [
        {
          type: 'dropdown',
          label: 'Duration',
          id: 'length',
          default: '30',
          choices: [
            { id: '30', label: '30' },
            { id: '60', label: '60' },
            { id: '90', label: '90' },
            { id: '120', label: '120' },
            { id: '150', label: '150' },
            { id: '180', label: '180' },
          ],
        },
      ],
      callback: (action) => {
        instance.API.startCommercial(instance, action.options.length)
      },
    },

    createClip: {
      name: 'Create a Clip',
      description: 'Once created the results will be stored in the clip_id, clip_url, and clip_edit_url variables',
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
          label: 'Title',
          id: 'title',
					tooltip: 'The title of the clip',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Duration',
          id: 'duration',
					tooltip: 'The length of the clip in seconds. Possible values range from 5 to 60 inclusively with a precision of 0.1. The default is 30',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const channel = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel

				const options: ClipOptions = {
					channel
				}

				if (action.options.title) options.title = await context.parseVariablesInString(action.options.title)
				if (action.options.duration) {
					const duration = parseFloat(await context.parseVariablesInString(action.options.duration))
					if (!isNaN(duration)) options.duration = duration
				}

        if (channel !== '') return instance.API.createClip(instance, options)
      },
    },

    createClipVOD: {
      name: 'Create a Clip from VOD',
      description: 'Once created the results will be stored in the clip_id, clip_url, and clip_edit_url variables',
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
          label: 'VOD ID',
          id: 'vodID',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Title',
          id: 'title',
					tooltip: 'The title of the clip',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Offset (where the clip ends)',
          id: 'offset',
					tooltip: 'Point in time in the VOD (in seconds) when the Clip is to end',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Duration',
          id: 'duration',
					tooltip: 'The length of the clip in seconds. Possible values range from 5 to 60 inclusively with a precision of 0.1. The default is 30',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const channel = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel

				const options: ClipVODOptions = {
					channel,
					vodID: await context.parseVariablesInString(action.options.vodID),
					title: await context.parseVariablesInString(action.options.title),
					offset: parseFloat(await context.parseVariablesInString(action.options.offset)),
					duration: parseFloat(await context.parseVariablesInString(action.options.duration)),
				}

				if (isNaN(options.offset) || isNaN(options.duration) || options.offset < options.duration) {
					instance.log('warn', `Invalid Offset or Duration for creating clips`)
					return
				}

        if (channel !== '') return instance.API.createClipVOD(instance, options)
      },
    },

    automodMessage: {
      name: 'Allow or Deny a Held AutoMod Message',
      description: 'Acts on a message AutoMod is holding for review. Requires the AutoMod permission',
      options: [
        {
          type: 'dropdown',
          label: 'Message',
          id: 'target',
          default: 'last',
          choices: [
            { id: 'last', label: 'Most Recently Held Message' },
            { id: 'custom', label: 'Specific Message' },
          ],
          tooltip: 'Most Recently Held works well in a Trigger reacting to the AutoMod Held a Message event',
        },
        {
          type: 'textinput',
          label: 'Message ID',
          id: 'messageId',
          default: '',
          useVariables: true,
          isVisible: (options) => options.target === 'custom',
        },
        {
          type: 'checkbox',
          label: 'Allow the message',
          id: 'allow',
          default: true,
          tooltip: 'Unticked denies it instead',
        },
      ],
      callback: async (action, context) => {
        let messageID = ''

        if (action.options.target === 'last') {
          messageID = instance.events.find((event) => event.type === 'automod_hold')?.id || ''

          if (messageID === '') {
            instance.log('warn', 'Unable to act on a held message, none have been received yet')
            return
          }
        } else {
          messageID = (await context.parseVariablesInString(action.options.messageId)).trim()
        }

        return instance.API.manageHeldAutoModMessage(instance, { messageID, allow: action.options.allow })
      },
    },

    banUser: {
      name: 'Ban, Timeout, or Unban a User',
      description: 'Requires the Chat Moderation permissions, and Moderator status on the channel',
      options: [
        {
          type: 'dropdown',
          label: 'Action',
          id: 'mode',
          default: 'timeout',
          choices: [
            { id: 'timeout', label: 'Timeout' },
            { id: 'ban', label: 'Ban' },
            { id: 'unban', label: 'Unban' },
          ],
        },
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
        {
          type: 'textinput',
          label: 'Username',
          id: 'user',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Duration (seconds, up to 1209600)',
          id: 'duration',
          default: '600',
          useVariables: true,
          isVisible: (options) => options.mode === 'timeout',
        },
        {
          type: 'textinput',
          label: 'Reason',
          id: 'reason',
          default: '',
          useVariables: true,
          isVisible: (options) => options.mode !== 'unban',
        },
      ],
      callback: async (action, context) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection === '') return

        const [user, duration, reason] = await Promise.all([
          context.parseVariablesInString(action.options.user),
          context.parseVariablesInString(action.options.duration),
          context.parseVariablesInString(action.options.reason),
        ])

        const target = user.trim().toLowerCase()

        if (target === '') {
          instance.log('warn', 'Unable to moderate without a username')
          return
        }

        if (action.options.mode === 'unban') return instance.API.unbanUser(instance, { selection, user: target })

        let parsedDuration = 0

        if (action.options.mode === 'timeout') {
          parsedDuration = parseInt(duration)

          if (isNaN(parsedDuration) || parsedDuration < 1) {
            instance.log('warn', `Timeout duration ${duration} is invalid`)
            return
          }
        }

        return instance.API.banUser(instance, { selection, user: target, reason, duration: parsedDuration })
      },
    },

    cancelRaid: {
      name: 'Cancel a Raid',
      description: 'Cancels a raid that has started but not yet gone through. Requires the Raids permission',
      options: [],
      callback: async () => {
        return instance.API.cancelARaid(instance)
      },
    },

    createPoll: {
      name: 'Create a Poll',
      description: 'Only available on current users Channel',
      options: [
        {
          type: 'textinput',
          label: 'Title',
          id: 'title',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Choice 1',
          id: 'choice1',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Choice 2',
          id: 'choice2',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Choice 3',
          id: 'choice3',
          default: '',
          useVariables: true,
          isVisible: (options) => options.choice1 !== '' && options.choice2 !== '',
        },
        {
          type: 'textinput',
          label: 'Choice 4',
          id: 'choice4',
          default: '',
          useVariables: true,
          isVisible: (options) => options.choice1 !== '' && options.choice2 !== '' && options.choice3 !== '',
        },
        {
          type: 'textinput',
          label: 'Choice 5',
          id: 'choice5',
          default: '',
          useVariables: true,
          isVisible: (options) => options.choice1 !== '' && options.choice2 !== '' && options.choice3 !== '' && options.choice4 !== '',
        },
        {
          type: 'textinput',
          label: 'Duration (seconds, 15 to 1800)',
          id: 'duration',
          default: '15',
          useVariables: true,
        },
        {
          type: 'checkbox',
          label: 'Channel Points Voting',
          id: 'channelPoints',
          default: false,
        },
        {
          type: 'textinput',
          label: 'Channel Points per vote (1 to 1000000)',
          id: 'channelPointsValue',
          default: '100',
          useVariables: true,
          isVisible: (options) => options.channelPoints === true,
        },
      ],
      callback: async (action) => {
        const [title, choice1, choice2, choice3, choice4, choice5, duration, channelPointsValue] = await Promise.all([
          instance.parseVariablesInString(action.options.title),
          instance.parseVariablesInString(action.options.choice1),
          instance.parseVariablesInString(action.options.choice2),
          instance.parseVariablesInString(action.options.choice3),
          instance.parseVariablesInString(action.options.choice4),
          instance.parseVariablesInString(action.options.choice5),
          instance.parseVariablesInString(action.options.duration),
          instance.parseVariablesInString(action.options.channelPointsValue),
        ])

        const choices = [choice1, choice2]
        if (action.options.choice3) {
          choices.push(choice3)
          if (action.options.choice4) {
            choices.push(choice4)
            if (action.options.choice5) {
              choices.push(choice5)
            }
          }
        }

        const parsedDuration = parseInt(duration)

        if (isNaN(parsedDuration)) {
          instance.log('warn', `Duration ${duration} is invalid`)
          return
        }

        const parsedPointsValue = parseInt(channelPointsValue)

        if (isNaN(parsedPointsValue)) {
          instance.log('warn', `Channel Points per vote ${channelPointsValue} is invalid`)
          return
        }

        return instance.API.createPoll(instance, { title, choices, duration: parsedDuration, pointsVoting: action.options.channelPoints, pointsValue: parsedPointsValue })
      },
    },

    endPoll: {
      name: 'End current Poll',
      description: 'Only available on current users Channel',
      options: [
        {
          type: 'dropdown',
          label: 'Status',
          id: 'status',
          choices: [
            { id: 'TERMINATED', label: 'End Poll and show results' },
            { id: 'ARCHIVED', label: 'End Poll and archive results' },
          ],
          default: 'TERMINATED',
        },
      ],
      callback: async (action) => {
        return instance.API.endPoll(instance, action.options.status)
      },
    },

    endPrediction: {
      name: 'End current Prediction',
      description: 'Only available on current users Channel',
      options: [
        {
          type: 'dropdown',
          label: 'Status',
          id: 'status',
          choices: [
            { id: 'RESOLVED', label: 'End Prediction with selected Outcome' },
            { id: 'CANCELED', label: 'Cancel Prediction and refund Channel Points' },
            { id: 'LOCKED', label: 'Lock a Prediction and prevent further voting' },
          ],
          default: 'RESOLVED',
        },
        {
          type: 'textinput',
          label: 'Winning Outcome',
          id: 'outcome',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const outcome = await instance.parseVariablesInString(action.options.outcome)
        return instance.API.endPrediction(instance, action.options.status, outcome)
      },
    },

    resolveUnbanRequest: {
      name: 'Approve or Deny an Unban Request',
      description: 'Requires the Unban Requests permission, and Moderator status on the channel',
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
          label: 'Request',
          id: 'target',
          default: 'last',
          choices: [
            { id: 'last', label: 'Most Recent Request' },
            { id: 'custom', label: 'Specific Request' },
          ],
          tooltip: 'Most Recent works well in a Trigger reacting to the Unban Request event',
        },
        {
          type: 'textinput',
          label: 'Request ID',
          id: 'requestId',
          default: '',
          useVariables: true,
          isVisible: (options) => options.target === 'custom',
        },
        {
          type: 'dropdown',
          label: 'Resolution',
          id: 'status',
          default: 'approved',
          choices: [
            { id: 'approved', label: 'Approve' },
            { id: 'denied', label: 'Deny' },
          ],
        },
        {
          type: 'textinput',
          label: 'Message to the viewer',
          id: 'resolutionText',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection === '') return

        let requestID = ''

        if (action.options.target === 'last') {
          requestID = instance.events.find((event) => event.type === 'unban_request')?.id || ''

          if (requestID === '') {
            instance.log('warn', 'Unable to resolve an unban request, none have been received yet')
            return
          }
        } else {
          requestID = (await context.parseVariablesInString(action.options.requestId)).trim()
        }

        const resolutionText = await context.parseVariablesInString(action.options.resolutionText)

        return instance.API.resolveUnbanRequest(instance, { selection, requestID, status: action.options.status, resolutionText })
      },
    },

    shieldMode: {
      name: 'Shield Mode',
      description: 'Turns Shield Mode on or off. Requires the Shield Mode permission, and Moderator status on the channel',
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
          default: 'toggle',
          choices: [
            { id: 'toggle', label: 'Toggle' },
            { id: 'on', label: 'On' },
            { id: 'off', label: 'Off' },
          ],
        },
      ],
      callback: async (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        const channel = instance.channels.find((data) => data.username === selection)
        if (!channel) return

        const active = action.options.mode === 'toggle' ? !channel.shieldMode : action.options.mode === 'on'

        return instance.API.updateShieldModeStatus(instance, { selection, active })
      },
    },

    shoutout: {
      name: 'Send a Shoutout',
      description: 'Twitch limits shoutouts to one every 2 minutes, and one per channel every 60 minutes. Requires the Shoutouts permission',
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
          label: 'Channel to shout out',
          id: 'target',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection === '') return

        const target = (await context.parseVariablesInString(action.options.target)).trim().toLowerCase()

        if (target === '') {
          instance.log('warn', 'Unable to send a shoutout without a channel to shout out')
          return
        }

        return instance.API.sendShoutout(instance, { selection, target })
      },
    },

    vip: {
      name: 'Add or Remove a VIP',
      description: 'Only available on the current users Channel. Requires the VIPs permission',
      options: [
        {
          type: 'dropdown',
          label: 'Action',
          id: 'mode',
          default: 'add',
          choices: [
            { id: 'add', label: 'Add VIP' },
            { id: 'remove', label: 'Remove VIP' },
          ],
        },
        {
          type: 'textinput',
          label: 'Username',
          id: 'user',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const user = (await context.parseVariablesInString(action.options.user)).trim().toLowerCase()

        if (user === '') {
          instance.log('warn', 'Unable to update VIPs without a username')
          return
        }

        return instance.API.updateChannelVIP(instance, { user, add: action.options.mode === 'add' })
      },
    },

    warnUser: {
      name: 'Warn a User',
      description: 'The viewer has to acknowledge the warning before they can chat again. Requires the Warnings permission',
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
          label: 'Username',
          id: 'user',
          default: '',
          useVariables: true,
        },
        {
          type: 'textinput',
          label: 'Reason',
          id: 'reason',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action, context) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection === '') return

        const [user, reason] = await Promise.all([context.parseVariablesInString(action.options.user), context.parseVariablesInString(action.options.reason)])
        const target = user.trim().toLowerCase()

        if (target === '' || reason === '') {
          instance.log('warn', 'Unable to warn a user without both a username and a reason')
          return
        }

        return instance.API.warnChatUser(instance, { selection, user: target, reason })
      },
    },

    updateRedemption: {
      name: 'Fulfil or Cancel a Channel Point Redemption',
      description: 'Cancelling a redemption refunds the viewers Channel Points. Requires the Channel Points permission',
      options: [
        {
          type: 'dropdown',
          label: 'Redemption',
          id: 'target',
          default: 'last',
          choices: [
            { id: 'last', label: 'Most Recent Redemption' },
            { id: 'custom', label: 'Specific Redemption' },
          ],
          tooltip: 'Most Recent works well in a Trigger reacting to a redemption, as it acts on the one that just came in',
        },
        {
          type: 'textinput',
          label: 'Redemption ID',
          id: 'redemptionId',
          default: '',
          useVariables: true,
          isVisible: (options) => options.target === 'custom',
        },
        {
          type: 'textinput',
          label: 'Reward ID',
          id: 'rewardId',
          default: '',
          useVariables: true,
          isVisible: (options) => options.target === 'custom',
        },
        {
          type: 'dropdown',
          label: 'Status',
          id: 'status',
          default: 'FULFILLED',
          choices: [
            { id: 'FULFILLED', label: 'Fulfil' },
            { id: 'CANCELED', label: 'Cancel and refund' },
          ],
        },
      ],
      callback: async (action, context) => {
        const options: UpdateRedemptionStatusOptions = { redemptionID: '', rewardID: '', status: action.options.status }

        if (action.options.target === 'last') {
          const redemption = instance.redemptions[0]

          if (!redemption) {
            instance.log('warn', 'Unable to update a redemption, no redemption has been received yet')
            return
          }

          options.redemptionID = redemption.id
          options.rewardID = redemption.rewardID
        } else {
          options.redemptionID = (await context.parseVariablesInString(action.options.redemptionId)).trim()
          options.rewardID = (await context.parseVariablesInString(action.options.rewardId)).trim()
        }

        instance.API.updateRedemptionStatus(instance, options)
      },
    },

    marker: {
      name: 'Create Stream Marker',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection !== '') instance.API.createStreamMarker(instance, selection)
      },
    },

    request: {
      name: 'Twitch API Request',
      description: 'Send an API request to Twitch with included OAuth headers',
      options: [
        {
          type: 'textinput',
          label: 'URL',
          id: 'url',
          default: '',
        },
        {
          type: 'dropdown',
          label: 'Method',
          id: 'method',
          default: 'get',
          choices: [
            { id: 'get', label: 'GET' },
            { id: 'put', label: 'PUT' },
            { id: 'post', label: 'POST' },
            { id: 'patch', label: 'PATCH' },
            { id: 'put', label: 'PUT' },
            { id: 'delete', label: 'DELETE' },
          ],
        },
        {
          type: 'textinput',
          label: 'Body',
          tooltip: 'JSON',
          id: 'body',
          default: '',
        },
      ],
      callback: (action) => {
        instance.API.customRequest(instance, action.options.method, action.options.url, action.options.body)
      },
    },

    // Chat
    chatMessage: {
      name: 'Send a message to chat',
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
          label: 'Message',
          id: 'message',
          default: '',
          useVariables: true,
        },
      ],
      callback: async (action) => {
        const message = await instance.parseVariablesInString(action.options.message)
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection !== '' && message !== '') {
          instance.chat.message('#' + selection, message)
        }
      },
    },

    clearChat: {
      name: 'Clear Chat',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (selection !== '') instance.API.deleteChatMessages(instance, selection)
      },
    },

    chatModeEmote: {
      name: 'Toggle emote only mode',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        const channel = instance.channels.find((x) => x.username === selection)

        if (selection !== '') {
          instance.API.updateChatSettings(instance, selection, 'emote_mode', !channel?.chatModes.emote)
        }
      },
    },

    chatModeFollowers: {
      name: 'Toggle followers only mode',
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
          label: 'Follow length minutes',
          id: 'length',
          default: '10',
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        const length = action.options.length.replace('m', '')

        if (selection !== '') {
          instance.API.updateChatSettings(instance, selection, 'follower_mode_duration', length)
        }
      },
    },

    chatModeSlow: {
      name: 'Toggle slow mode',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
        {
          type: 'number',
          label: 'Slow mode length (0 for off)',
          id: 'length',
          default: 30,
          min: 0,
          max: 3600000,
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel

        if (selection !== '') {
          instance.API.updateChatSettings(instance, selection, 'slow_mode_wait_time', action.options.length)
        }
      },
    },

    chatModeSub: {
      name: 'Toggle sub only mode',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        const channel = instance.channels.find((x) => x.username === selection)

        if (selection !== '') {
          instance.API.updateChatSettings(instance, selection, 'subscriber_mode', !channel?.chatModes.sub)
        }
      },
    },

    chatModeUnique: {
      name: 'Toggle unique chat (r9k) mode',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        const channel = instance.channels.find((x) => x.username === selection)

        if (selection !== '') {
          instance.API.updateChatSettings(instance, selection, 'unique_chat_mode', !channel?.chatModes.unique)
        }
      },
    },

    resetChatTotal: {
      name: 'Reset Chat Total',
      description: 'Sets the total chat activity to 0',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const selection = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        const channel = instance.channels.find((data) => data.username === selection)

        if (channel) {
          instance.log('debug', `Resetting ${channel.displayName} Chat total of ${channel.chatActivity.total}`)
          channel.chatActivity.total = 0
          instance.variables.updateVariables()
        }
      },
    },

    // Util
    selectChannel: {
      name: 'Select Channel',
      description: '',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: instance.channels[0]?.username || '',
          choices: instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName })),
        },
      ],
      callback: (action) => {
        instance.selectedChannel = action.options.channel
        instance.variables.updateVariables()
        instance.checkFeedbacks('chatStatus', 'channelStatus')
      },
    },

    streamOpen: {
      name: 'Open Channel',
      description: 'Opens Twitch stream in default browser on the machine running Companion',
      options: [
        {
          type: 'dropdown',
          label: 'Channel',
          id: 'channel',
          default: 'selected',
          choices: [{ id: 'selected', label: 'Selected' }, ...instance.channels.map((channel) => ({ id: channel.username, label: channel.displayName }))],
        },
      ],
      callback: (action) => {
        const channel = action.options.channel === 'selected' ? instance.selectedChannel : action.options.channel
        if (channel === '') return

        open(`https://twitch.tv/${channel}`)
      },
    },
  }
}
