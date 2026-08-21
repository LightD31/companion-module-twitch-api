import type TwitchInstance from '../index'
import { type APIError } from '../api'

type SearchCategoriesSuccess = {
  data: { id: string; name: string; box_art_url: string }[]
}

/**
 * @param instance Twitch Instance
 * @param query Category name, or part of one
 * @returns Categories matching the query, best match first
 * @description Get Games only matches an exact name, so this is what finds a category from what someone actually typed
 */
export const searchCategories = async (instance: TwitchInstance, query: string): Promise<SearchCategoriesSuccess['data']> => {
  const requestOptions = instance.API.defaultOptions()

  return fetch(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}&first=10`, requestOptions)
    .then(async (res) => {
      instance.API.updateRatelimits(res.headers)
      return res.json() as Promise<APIError | SearchCategoriesSuccess>
    })
    .then((body) => {
      if ('data' in body) {
        return body.data
      } else {
        instance.log('warn', `Failed to search categories: ${JSON.stringify(body)}`)
        return []
      }
    })
    .catch((err) => {
      instance.log('warn', `searchCategories err: ${err.message}`)
      return []
    })
}
