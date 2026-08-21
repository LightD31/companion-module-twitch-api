# companion-module-twitch-api

Module for integration with Twitch through their API and Chat, documentation for that can be found here: https://dev.twitch.tv/docs



# Patch Notes
**v4.8.0**
- Added `Create a Prediction`, `Modify Channel Information`, `Send a Chat Announcement`, `Snooze the Next Ad`, and `Start a Raid` Actions, for API endpoints the module already implemented but never exposed
- Snoozing an ad now updates the `ad_next`, `ad_snooze_count`, and `ad_snooze_refresh` variables straight away, and checks the Ads permission first

**v4.7.0**
- Polls, Predictions, Creator Goals, and Charity Campaigns are no longer polled once a minute while EventSub is delivering them, and are read once at startup instead so an already running one is known
- Polling automatically resumes for anything EventSub stops delivering, whether the connection dropped or the subscription was refused or revoked
- Reconnecting to EventSub after a drop now re-reads from the API, since notifications sent while disconnected are not replayed

**v4.6.0**
- Added Cheers, gifted subs, resubs, raids received, VIP changes, shoutouts, unban requests, warnings, and AutoMod holds through EventSub
- Added a `Twitch Event` feedback, which can drive a Companion Trigger set to "On Condition Become True" for any of those events
- Added `event_count`, `event_type`, `event_channel`, `event_user`, `event_message`, and `event_amount` variables, plus a count, user, message, and amount for each event type
- These make the Bits, VIPs, Shoutouts, Unban Requests, Warnings, and AutoMod permissions useful, having previously only been requested during authentication

**v4.5.0**
- Added a `Fulfil or Cancel a Channel Point Redemption` Action, acting on the most recent redemption or a specific one, with cancelling refunding the viewers points
- Added tracking of redemptions being handled in the queue, through a `redemption_status` variable

**v4.4.1**
- Added the Hype Train data introduced in version 2 of Twitch's Hype Train events: `hype_train_type`, `hype_train_shared`, `hype_train_record_level`, and `hype_train_record_total` variables
- Added a Type option to the `Hype Train` feedback, to react only to a Regular, Treasure, or Golden Kappa train

**v4.4.0**
- Added Channel Point reward redemptions through EventSub, with a `Channel Point Reward Redeemed` feedback that can drive a Companion Trigger set to "On Condition Become True"
- Added `redemption_count`, `redemption_reward`, `redemption_reward_id`, `redemption_reward_cost`, `redemption_user`, `redemption_user_login`, `redemption_input`, `redemption_id`, and `redemption_at` variables
- Added per reward `redemption_<reward>_count`, `redemption_<reward>_user`, and `redemption_<reward>_input` variables, so a Trigger can watch a single reward through "On Variable Change"
- Fixed Hype Trains never updating, as Twitch withdrew version 1 of the Hype Train EventSub subscriptions in January 2026

**v4.3.0**
- Added Twitch EventSub for realtime updates, instead of waiting on the once a minute API polling, of stream status, channel info, chat settings, followers, subs, polls, predictions, ad breaks, shield mode, charity campaigns, and creator goals
- Added Hype Train tracking, with `hype_train_active`, `hype_train_level`, `hype_train_total`, `hype_train_progress`, and `hype_train_goal` variables, and a `Hype Train` feedback
- Added `eventsub_connected` and `eventsub_subscriptions` variables
- Added an EventSub config option to opt out of the realtime updates
- Fixed Channel Points used on a Prediction outcome not being read from the API response

**v4.2.0**
- Added `Create a Clip from VOD` Action
- Updated `Create a Clip` Action to support Twitch's update to the API endpoint

**v4.1.1**
- Fixed a bug causing a crash when updating chat settings
- Improved error logging

**v4.1.0**
- Added PATCH, PUT, and DELETE, methods for custom API request, as well as defaulting to JSON content type
- Fixed a variable typo on selected channel category id

**v4.0.1**
- Fix for Open Channel NodeJS permissions

**v4.0.0**
- Revamped Oauth process to now use the Device Code Flow (DCF) is used for all module users
- Added config options for the permissions required for various endpoints
- Reworked entire API request logic
- Added more Actions, with more on the roadmap to be added for more complete API coverage where appropriate for a client side application
- Added `clip_id`, `clip_url`, and `clip_edit_url` variables after using the Create Clip Action
- Added `ad_next`, `ad_last`, `ad_duration`, `ad_preroll_free_time`, `ad_snooze_count`, and `ad_snooze_refresh` variables for ad scheduling

**v3.0.4**
- Fix to try resolve excess token server requests

**v3.0.2**
- Added support for Instance Variables in chat messages

**v3.0.1**
- Removed deprecated endpoint 

**v3.0.0**
- Updated module for Companion 3
- Replaced most of the deprecated Chat Commands with API requests
- Added additional API functionality in preparation for upcoming features

Older patch notes available in [docs/PATCH_NOTES.md](./docs/PATCH_NOTES.md)
