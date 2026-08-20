type TimeFormat = 'hh:mm:ss' | 'hh:mm:ss.ms' | 'mm:ss' | 'mm:ss.ms'

/**
 * @param red 0-255
 * @param green 0-255
 * @param blue 0-255
 * @returns RGB value encoded for Companion Bank styling
 */
export const rgb = (red: number, green: number, blue: number): number => {
  return ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff)
}

export const formatTime = (time: number, interval: 'ms' | 's', format: TimeFormat): string => {
  const timeMS = time * (interval === 'ms' ? 1 : 1000)
  const padding = (value: number): string => (value < 10 ? '0' + value : value.toString())

  const hh = padding(Math.floor(timeMS / 3600000))
  const mm = padding(Math.floor(timeMS / 60000) % 60)
  const ss = padding(Math.floor(timeMS / 1000) % 60)
  const ms = (timeMS % 1000) / 100

  const result = `${format.includes('hh') ? `${hh}:` : ''}${mm}:${ss}${format.includes('ms') ? `.${ms}` : ''}`
  return result
}

export const formatNumber = (x: number): string => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * @param redemption Recorded Channel Point redemption
 * @param selection Reward selected on a feedback: 'any', a reward ID, or a reward title
 * @returns Whether the redemption is for the selected reward
 */
export const redemptionMatches = (redemption: { rewardID: string; rewardTitle: string }, selection: string): boolean => {
  if (selection === 'any') return true
  return redemption.rewardID === selection || redemption.rewardTitle.toLowerCase() === selection.toLowerCase()
}

/**
 * @param rewards Channel Point rewards
 * @returns Map of reward ID to the name used in that rewards variables, derived from the title and deduplicated
 */
export const rewardVariableNames = (rewards: { id: string; title: string }[]): Map<string, string> => {
  const names = new Map<string, string>()
  const used = new Set<string>()

  rewards.forEach((reward) => {
    const base =
      reward.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'reward'

    // Two rewards can share a title, so a suffix keeps their variables apart
    let name = base
    let suffix = 2
    while (used.has(name)) {
      name = `${base}_${suffix}`
      suffix++
    }

    used.add(name)
    names.set(reward.id, name)
  })

  return names
}
