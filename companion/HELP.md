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

Anything EventSub doesn't cover, or that couldn't be subscribed to, is still updated by the API polling, so turning EventSub off in the config only means updates arrive up to a minute later. The current connection state can be checked with the `eventsub_connected` and `eventsub_subscriptions` variables, or the connections `/eventsub` HTTP endpoint.

### Channel Point Redemptions as a Trigger
Companion modules can't start a Trigger directly, so redemptions are exposed as something a Trigger can watch. Tick the Channel Points permission, authenticate as the broadcaster, and leave EventSub enabled, then either:

- Add a Trigger with the event **On Condition Become True**, and give it the `Channel Point Reward Redeemed` feedback with the reward you want. The feedback goes true the moment the reward is redeemed and back to false after the duration you set, so the Trigger runs once per redemption. The same feedback can be put on a button to light it up when the reward is redeemed.
- Or add a Trigger with the event **On Variable Change** watching `$(twitch:redemption_count)`, which increments on every redemption. Use this when you want to react to any reward rather than a specific one.
- Or, for one specific reward without using a feedback, watch that reward's own counter, `$(twitch:redemption_<reward>_count)`. The `<reward>` part is the reward title in lower case with anything that isn't a letter or number replaced by an underscore, and each reward also has `redemption_<reward>_user` and `redemption_<reward>_input` holding its most recent redemption.

The Trigger's actions can include `Fulfil or Cancel a Channel Point Redemption` set to the most recent redemption, which is how you refund the points when whatever the reward promised can't be done. Cancelling refunds, fulfilling just clears it from your queue.

Either way the actions the Trigger runs can use `redemption_reward`, `redemption_user`, `redemption_input`, and the other `redemption_*` variables to see what was redeemed and by whom. Note that these describe the most recent redemption, so a Trigger reading them should run promptly.

### Twitch Rate Limits
- API Requests: 800 per minute
- Chat messages in channel without Moderator/Broadcaster status: 20 per 30 seconds.
- Chat messages in channel with Moderator/Broadcaster status: 100 per 30 seconds.
