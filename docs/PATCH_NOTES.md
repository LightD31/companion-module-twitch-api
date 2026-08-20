# Path Notes

**v4.4.0**
- Added Channel Point reward redemptions through EventSub, with a `Channel Point Reward Redeemed` feedback that can drive a Companion Trigger set to "On Condition Become True"
- Added `redemption_count`, `redemption_reward`, `redemption_reward_id`, `redemption_reward_cost`, `redemption_user`, `redemption_user_login`, `redemption_input`, and `redemption_id` variables

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

## v3.0.0
- Updated module for Companion 3
- Replaced most of the deprecated Chat Commands with API requests
- Added additional API functionality in preparation for upcoming features

## v2.0.0
- Reworked module in TypeScript
- Allowed sending messages to channel other than a users own
- More instance variables

## v1.0.0
- Initial release
