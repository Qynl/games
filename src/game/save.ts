import { BrawlerDef, BRAWLERS } from '../game/brawlers'
import { MatchResult, rankForTrophies } from '../game/types'
import { audio } from '../game/audio'

export interface SaveData {
  playerName: string
  trophies: Record<string, number>
  unlocked: string[]
  wins: number
  losses: number
  gemWins: number
  starWins: number
  showdownWins: number
  totalKills: number
  bestStreak: number
  streak: number
  boxes: number
  keys: number
  lastDaily: string
  bigBoxesOpened: number
  muted: boolean
  settings: { sfx: number; music: number }
}

const KEY = 'brawl-arena-save-v1'

const DEFAULT_NAME = 'Ace'

export function defaultSave(): SaveData {
  return {
    playerName: DEFAULT_NAME,
    trophies: {},
    unlocked: ['rusty'],
    wins: 0,
    losses: 0,
    gemWins: 0,
    starWins: 0,
    showdownWins: 0,
    totalKills: 0,
    bestStreak: 0,
    streak: 0,
    boxes: 0,
    keys: 20,
    lastDaily: '',
    bigBoxesOpened: 0,
    muted: false,
    settings: { sfx: 0.9, music: 0.45 },
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    const base = defaultSave()
    const merged: SaveData = { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings ?? {}) } }
    merged.unlocked = Array.from(new Set([...merged.unlocked, 'rusty']))
    // migrate legacy stat names
    const p = parsed as any
    if (typeof p.showdownWins !== 'number' && typeof p.soloWins === 'number') merged.showdownWins = p.soloWins
    return merged
  } catch {
    return defaultSave()
  }
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage unavailable — play without persistence
  }
}

export function totalTrophies(s: SaveData): number {
  return Object.values(s.trophies).reduce((a, b) => a + b, 0)
}

export function applyMatchResult(s: SaveData, brawlerId: string, r: MatchResult): SaveData {
  const next = { ...s, trophies: { ...s.trophies } }
  next.trophies[brawlerId] = Math.max(0, (next.trophies[brawlerId] ?? 0) + r.trophies)
  next.totalKills += r.kills
  if (r.won) {
    next.wins++
    next.streak++
    next.bestStreak = Math.max(next.bestStreak, next.streak)
    if (r.mode === 'gem') next.gemWins++
    else if (r.mode === 'bounty') next.starWins++
    else if (r.mode === 'showdown') next.showdownWins++
  } else {
    next.losses++
    next.streak = 0
  }
  next.keys = Math.min(200, next.keys + 4)
  return next
}

export interface UnlockInfo {
  cost: number
  def: BrawlerDef
}

export function nextUnlocks(s: SaveData): UnlockInfo[] {
  const owned = new Set(s.unlocked)
  const locked = BRAWLERS.filter((b) => !owned.has(b.id))
  return locked.slice(0, 2).map((def, i) => ({
    def,
    cost: def.id === 'moose' ? 0 : i === 0 ? 20 : 60,
  }))
}

export function canAfford(s: SaveData, cost: number) {
  return s.keys >= cost
}

export function buyBrawler(s: SaveData, id: string, cost: number): SaveData {
  if (s.unlocked.includes(id)) return s
  if (s.keys < cost) return s
  return {
    ...s,
    keys: s.keys - cost,
    unlocked: [...s.unlocked, id],
  }
}

export function openBox(s: SaveData, guaranteedId?: string): { save: SaveData; def: BrawlerDef; isNew: boolean } {
  if (s.boxes <= 0) return { save: s, def: BRAWLERS[0], isNew: false }
  const owned = new Set(s.unlocked)
  let def: BrawlerDef
  if (guaranteedId) {
    def = BRAWLERS.find((b) => b.id === guaranteedId) ?? BRAWLERS[0]
  } else {
    // guaranteed new every other big box
    const locked = BRAWLERS.filter((b) => !owned.has(b.id))
    if (locked.length > 0 && (s.bigBoxesOpened + 1) % 2 === 0) {
      def = locked[Math.floor(Math.random() * locked.length)]
    } else {
      const roll = Math.random()
      if (roll < 0.45 && locked.length > 0) {
        def = locked[Math.floor(Math.random() * locked.length)]
      } else {
        def = BRAWLERS[Math.floor(Math.random() * BRAWLERS.length)]
      }
    }
  }
  const isNew = !owned.has(def.id)
  return {
    save: {
      ...s,
      boxes: s.boxes - 1,
      bigBoxesOpened: s.bigBoxesOpened + 1,
      unlocked: isNew ? [...s.unlocked, def.id] : s.unlocked,
      trophies: { ...s.trophies, [def.id]: Math.max(s.trophies[def.id] ?? 0, 0) },
    },
    def,
    isNew,
  }
}

export function claimDaily(s: SaveData): SaveData {
  const today = new Date().toISOString().slice(0, 10)
  if (s.lastDaily === today) return s
  return { ...s, lastDaily: today, boxes: s.boxes + 1, keys: Math.min(200, s.keys + 15) }
}

export function rankLabel(s: SaveData, id: string): string {
  return rankForTrophies(s.trophies[id] ?? 0).name
}

export function isUnlocked(s: SaveData, id: string): boolean {
  return s.unlocked.includes(id)
}

export function applyAudioSettings(s: SaveData) {
  audio.setSfxVolume(s.settings.sfx)
  audio.setMusicVolume(s.settings.music)
  audio.setMuted(s.muted)
}
