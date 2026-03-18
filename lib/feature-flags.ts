export const FLAGS = {
  ENABLE_PRAYER_SKILL     : process.env.NEXT_PUBLIC_FLAG_PRAYER     === 'true',
  ENABLE_OFFLINE_PROGRESS : process.env.NEXT_PUBLIC_FLAG_OFFLINE    !== 'false', // true par défaut
  ENABLE_CLOUD_SAVE       : process.env.NEXT_PUBLIC_FLAG_CLOUD_SAVE !== 'false',
  ENABLE_DYNAMIC_MARKET   : process.env.NEXT_PUBLIC_FLAG_DYN_MARKET === 'true',
  ENABLE_MINIGAMES        : process.env.NEXT_PUBLIC_FLAG_MINIGAMES  !== 'false',
  ENABLE_DAILY_QUESTS     : process.env.NEXT_PUBLIC_FLAG_DAILY_Q    !== 'false',
  DEBUG_SHOW_TICK_STATS   : process.env.NODE_ENV === 'development',
} as const
