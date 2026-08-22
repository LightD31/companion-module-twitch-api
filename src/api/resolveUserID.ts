import type TwitchInstance from '../index'

/**
 * @param instance Twitch Instance
 * @param login Username of the viewer or channel
 * @returns That users ID, or null with a warning logged if no such user exists
 * @description The moderation endpoints take user IDs, while a button is filled in with a username
 */
export const resolveUserID = async (instance: TwitchInstance, login: string): Promise<string | null> => {
  const users = await instance.API.getUsers(instance, { type: 'login', channels: login })

  if (!users[0]?.id) {
    instance.log('warn', `Unable to find Twitch user ${login}`)
    return null
  }

  return users[0].id
}
