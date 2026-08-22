## Twitch API and Chat test

### Features
- Display live status, uptime, and viewers, of multiple Twitch streams.
- Connect to Twitch chat and control which chat modes are active, as well as perform moderation commands like Clear Chat.
- Send predefined messages to a channel.
- Execute API request to run channel advertisements (if available), create stream markers, and run custom API requests.
- Realtime updates through Twitch's EventSub, including Hype Train tracking.
- OAuth flow to handle generation of tokens with just the permissions you need, and the option to store them entirely locally, or manged by a token server.

### Permissions
Before getting started, please note that some functions require an Auth token from the streamer themselves (such as starting an ad break, or getting subscriber counts), some may be usable by a channel moderator/editor, and some may be usable by anyone (for example, any user can monitor if any other streamer is live or not, or the status of their chat modes). Please keep this in mind so that you auth while logged in to the appropriate Twitch account for what you wish to control with Companion.

### Getting started
The first thing you will need to do is set up which channels you wish to monitor, this list of channels will be tracked for when they go online/offline, track chat, and be usable in Actions/Feedbacks.

Next you will need to do after adding the Twitch instance to Companion is set up what permissions you plan to use in the Config screen for the connection. Keep in mind that some API requests require permissions from the broadcaster themselves, some can use permissions from a moderator or editor, and some can be done by any user.

For example, starting ads requires the broadcaster themselves to auth with the Companion app, but a Shoutout can be done with moderator permissions so the user going through the OAuth process in Companion can do shoutouts on any channel they are a moderator of.

Once the scopes have been selected, save the config, and then go back into the config screen and follow the link to the Auth URL to go through the OAuth process.


### EventSub
By default the module connects to Twitch's EventSub WebSocket, which pushes changes as they happen rather than waiting for the once a minute API polling. This covers stream online/offline, title and category changes, chat settings, followers, subs, polls, predictions, ad breaks, shield mode, charity campaigns, creator goals, Hype Trains, and Channel Point reward redemptions.

Which of these are available depends on the permissions granted in the config, and on your relationship to each monitored channel. Live status, title/category, and chat settings work for any monitored channel, moderator permissions add followers and shield mode, and the rest are only available for the channel that authenticated the connection. Twitch also limits how many subscriptions can be made to channels that haven't authorized Companion, so with a large list of monitored channels some may fall back to polling.

Anything EventSub doesn't cover, or that couldn't be subscribed to, is still updated by the API polling, so turning EventSub off in the config only means updates arrive up to a minute later.

Where EventSub can provide something, it is used instead of polling for it rather than as well: Polls, Predictions, Creator Goals, and Charity Campaigns are read once when the connection starts and then left to EventSub. If EventSub stops delivering any of them, because the connection dropped or a permission was removed, polling for that data starts again on its own, and reconnecting re-reads everything that could have changed in the meantime. A few things are still polled because Twitch has no EventSub equivalent: viewer counts, follower totals (there is no unfollow event), chatter counts, and which channels you moderate. The current connection state can be checked with the `eventsub_connected` and `eventsub_subscriptions` variables, or the connections `/eventsub` HTTP endpoint.

### Channel Point Redemptions as a Trigger
Companion modules can't start a Trigger directly, so redemptions are exposed as something a Trigger can watch. Tick the Channel Points permission, authenticate as the broadcaster, and leave EventSub enabled, then either:

- Add a Trigger with the event **On Condition Become True**, and give it the `Channel Point Reward Redeemed` feedback with the reward you want. The feedback goes true the moment the reward is redeemed and back to false after the duration you set, so the Trigger runs once per redemption. The same feedback can be put on a button to light it up when the reward is redeemed.
- Or add a Trigger with the event **On Variable Change** watching `$(twitch:redemption_count)`, which increments on every redemption. Use this when you want to react to any reward rather than a specific one.
- Or, for one specific reward without using a feedback, watch that reward's own counter, `$(twitch:redemption_<reward>_count)`. The `<reward>` part is the reward title in lower case with anything that isn't a letter or number replaced by an underscore, and each reward also has `redemption_<reward>_user` and `redemption_<reward>_input` holding its most recent redemption.

The Trigger's actions can include `Fulfil or Cancel a Channel Point Redemption` set to the most recent redemption, which is how you refund the points when whatever the reward promised can't be done. Cancelling refunds, fulfilling just clears it from your queue.

Either way the actions the Trigger runs can use `redemption_reward`, `redemption_user`, `redemption_input`, and the other `redemption_*` variables to see what was redeemed and by whom. Note that these describe the most recent redemption, so a Trigger reading them should run promptly.

### Other Twitch Events as a Trigger
Cheers, gifted subs, resubs, raids, VIP changes, shoutouts, unban requests, warnings, and AutoMod holds work the same way as Channel Point redemptions. Add a Trigger with the event **On Condition Become True** and give it the `Twitch Event` feedback set to the event and channel you care about, or watch `$(twitch:event_count)` with **On Variable Change** to react to any of them.

Each event type also has its own `$(twitch:event_<type>_count)`, so a Trigger can watch just cheers, or just raids, without a feedback. The most recent event of any type is described by `event_type`, `event_channel`, `event_user`, `event_message`, and `event_amount`, and each type keeps its own `event_<type>_user`, `event_<type>_message`, and `event_<type>_amount`. The amount is whatever number came with the event, such as Bits cheered, viewers in a raid, subs gifted, or months resubscribed.

Which events arrive depends on the permissions ticked in the config and on your relationship to the channel. Cheers, subs, VIPs, and raids need to be the broadcaster, while shoutouts, unban requests, warnings, and AutoMod holds also work on channels you moderate.

### Moderating from a Button
The moderation events EventSub delivers each have an Action to match, so a Trigger can react to something and act on it. Approve or Deny a Held AutoMod Message and Approve or Deny an Unban Request both default to the most recent one, which is what a Trigger reacting to that event wants, and `$(twitch:event_user_login)` gives the viewer an event was about for the Ban, Warn, and VIP Actions to use.

Shield Mode can now be turned on, off, or toggled, and has a feedback so a button can show whether it's active.

### Twitch Rate Limits
- API Requests: 800 per minute
- Chat messages in channel without Moderator/Broadcaster status: 20 per 30 seconds.
- Chat messages in channel with Moderator/Broadcaster status: 100 per 30 seconds.
