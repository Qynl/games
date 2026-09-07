// ────────────────────────────────────────────────────────────────────────────
//  Local progression: Qyns (keys), unlocks, skins, loadouts, settings.
// ────────────────────────────────────────────────────────────────────────────
const KEY = 'qyngun.profile.v1'

export const DEFAULT_PROFILE = {
  handle: 'PLAYER',
  qyns: 1500,
  xp: 0,
  level: 1,
  unlocked: ['vex9', 'q1', 'knife', 'frag'],
  skins: ['stock'],
  skin: 'stock',
  loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' },
  loadouts: {},
  stats: { matches: 0, wins: 0, rounds: 0, kills: 0, deaths: 0, damage: 0, topSpeed: 0, chains: {}, headshots: 0 },
  settings: {
    fov: 95, sensitivity: 1.0, volume: 0.7, sound: true, quality: 'high',
    crosshair: 'dot', showMovement: true, invertY: false, botLevel: 'normal', adaptive: true,
  },
}

export function loadProfile () {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_PROFILE)
    const p = JSON.parse(raw)
    return {
      ...structuredClone(DEFAULT_PROFILE), ...p,
      stats: { ...DEFAULT_PROFILE.stats, ...(p.stats || {}) },
      settings: { ...DEFAULT_PROFILE.settings, ...(p.settings || {}) },
      loadout: { ...DEFAULT_PROFILE.loadout, ...(p.loadout || {}) },
    }
  } catch (e) {
    return structuredClone(DEFAULT_PROFILE)
  }
}

export function saveProfile (p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch (e) { /* ignore */ }
}

export function xpForLevel (level) { return 250 + (level - 1) * 220 }

export function addXp (profile, amount) {
  let xp = profile.xp + amount
  let level = profile.level
  let levelsGained = 0
  while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; levelsGained++ }
  profile.xp = xp
  profile.level = level
  return levelsGained
}

// Reward a finished match. Returns a breakdown for the results screen.
export function rewardMatch (profile, { won, scoreA, scoreB, kills, deaths, damage, headshots, topSpeed, chains }) {
  const roundQyns = scoreA * 30
  const killQyns = kills * 14
  const headQyns = headshots * 5
  const winQyns = won ? 180 : 40
  const chainQyns = (chains || 0) * 20
  const qyns = roundQyns + killQyns + headQyns + winQyns + chainQyns
  const xp = Math.round(qyns * 0.65 + damage * 0.25)
  profile.qyns += qyns
  const levels = addXp(profile, xp)
  const s = profile.stats
  s.matches++
  if (won) s.wins++
  s.rounds += scoreA + scoreB
  s.kills += kills
  s.deaths += deaths
  s.damage += Math.round(damage)
  s.headshots += headshots
  s.topSpeed = Math.max(s.topSpeed || 0, Math.round(topSpeed * 10) / 10)
  saveProfile(profile)
  return { qyns, xp, levels, breakdown: { roundQyns, killQyns, headQyns, winQyns, chainQyns } }
}

export function unlock (profile, id, cost) {
  if (profile.unlocked.includes(id)) return true
  if (profile.qyns < cost) return false
  profile.qyns -= cost
  profile.unlocked.push(id)
  saveProfile(profile)
  return true
}

export function unlockSkin (profile, id, cost) {
  if (profile.skins.includes(id)) return true
  if (profile.qyns < cost) return false
  profile.qyns -= cost
  profile.skins.push(id)
  saveProfile(profile)
  return true
}
