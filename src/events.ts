/**
 * Momentary Twitch events that don't map onto a piece of channel state, exposed through the Twitch Event
 * feedback and the event variables so they can drive a Companion Trigger
 */
export const EVENT_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'cheer', label: 'Cheer', description: 'Bits cheered, amount is the number of Bits' },
  { id: 'sub', label: 'Subscription', description: 'A new or gifted subscription to the channel' },
  { id: 'sub_gift', label: 'Subscription Gifted', description: 'Subs gifted by one viewer, amount is how many' },
  { id: 'resub', label: 'Resubscription', description: 'A resub with a message, amount is the cumulative months' },
  { id: 'raid', label: 'Raid Received', description: 'Another channel raided this one, amount is the viewers brought' },
  { id: 'vip_add', label: 'VIP Added', description: 'A viewer was given VIP' },
  { id: 'vip_remove', label: 'VIP Removed', description: 'A viewers VIP was removed' },
  { id: 'shoutout_create', label: 'Shoutout Given', description: 'This channel shouted out another' },
  { id: 'shoutout_receive', label: 'Shoutout Received', description: 'Another channel shouted this one out' },
  { id: 'unban_request', label: 'Unban Request', description: 'A viewer requested to be unbanned' },
  { id: 'unban_resolve', label: 'Unban Request Resolved', description: 'An unban request was approved or denied' },
  { id: 'warning', label: 'Warning Sent', description: 'A moderator warned a viewer' },
  { id: 'warning_ack', label: 'Warning Acknowledged', description: 'A viewer acknowledged their warning' },
  { id: 'automod_hold', label: 'AutoMod Held a Message', description: 'A message was held for moderator review' },
]
