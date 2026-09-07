export const TILE = 32
export const STEP = 1 / 60

export type ModeId = 'gem' | 'showdown' | 'bounty' | 'heist'

export type TeamId = 0 | 1 | 2 // 0 = blue, 1 = red, 2 = solo (showdown)


export const TEAM_COLORS: Record<TeamId, string> = {
  0: '#2f7bff',
  1: '#ff4b3e',
  2: '#38d46c',
}
export const TEAM_NAMES: Record<TeamId, string> = {
  0: 'BLUE',
  1: 'RED',
  2: 'SOLO',
}

export interface ModeDef {
  id: ModeId
  name: string
  icon: string
  tagline: string
  desc: string
  teamSize: number // per team (showdown: total players)
  duration: number // seconds
}

export const MODES: ModeDef[] = [
  {
    id: 'gem',
    name: 'Gem Grab',
    icon: '💎',
    tagline: 'COLLECT 10 GEMS & HOLD THEM',
    desc: 'Fight for crystals erupting from the mine. Grab 10 as a team and survive the countdown to win!',
    teamSize: 3,
    duration: 150,
  },
  {
    id: 'showdown',
    name: 'Showdown',
    icon: '💀',
    tagline: 'LAST BRAWLER STANDING',
    desc: '10 brawlers enter, one leaves. Smash boxes for power cubes and outrun the deadly gas!',
    teamSize: 10,
    duration: 240,
  },
  {
    id: 'bounty',
    name: 'Bounty',
    icon: '⭐',
    tagline: 'FIRST TO 10 STARS',
    desc: 'Every takedown earns stars — the more stars your target carries, the more you claim!',
    teamSize: 3,
    duration: 120,
  },
  {
    id: 'heist',
    name: 'Heist',
    icon: '💰',
    tagline: 'DESTROY THE ENEMY SAFE',
    desc: 'Blast the enemy vault to smithereens before they crack yours. Most damage wins on time-out!',
    teamSize: 3,
    duration: 150,
  },
]

export const MODE_MAP: Record<ModeId, string> = {
  gem: 'gem_grotto',
  showdown: 'skull_pit',
  bounty: 'deadline',
  heist: 'heist_hideout',
}

export interface MatchConfig {
  mode: ModeId
  brawlerId: string
  mapId: string
}

export interface MatchResult {
  mode: ModeId
  won: boolean
  draw: boolean
  placement: number // 1-based, showdown
  placementTotal: number
  trophies: number
  kills: number
  deaths: number
  damage: number
  gemsCollected: number
  stars: number
  duration: number
  safeDamage?: number
  starPlayer?: { name: string; isPlayer: boolean; kills: number; damage: number }
}

// Trophy ranks per brawler
export const RANK_THRESHOLDS = [0, 20, 60, 120, 220, 340, 500, 700, 900]
export const RANK_NAMES = ['Rookie', 'Scrapper', 'Fighter', 'Ace', 'Boss', 'Champ', 'Legend', 'Star', 'Mythic']

export function rankForTrophies(t: number) {
  let i = 0
  for (let k = 0; k < RANK_THRESHOLDS.length; k++) if (t >= RANK_THRESHOLDS[k]) i = k
  return { index: i, name: RANK_NAMES[i] }
}

export const BOT_NAMES = [
  'Viper', 'Rook', 'Nitro', 'Bolt', 'Sly', 'Karma', 'Drift', 'Zephyr', 'Havoc', 'Pixel',
  'Tango', 'Banshee', 'Cobra', 'Dizzy', 'Echo', 'Fuse', 'Grit', 'Halo', 'Ion', 'Jinx',
  'Knuckles', 'Lotus', 'Mamba', 'Onyx', 'Piston', 'Quartz', 'Riptide', 'Sable', 'Tonic', 'Wraith',
]
