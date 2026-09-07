// ────────────────────────────────────────────────────────────────────────────
//  QynGun arsenal — 10 primaries, 10 secondaries, 10 melee, 10 utilities.
//  Everything is data: the viewmodel builder, the firing logic and the shop
//  all read from this table.
// ────────────────────────────────────────────────────────────────────────────

export const SLOTS = [
  { id: 'primary', name: 'PRIMARY', hint: 'Your main damage tool.' },
  { id: 'secondary', name: 'SECONDARY', hint: 'Fast swap finisher.' },
  { id: 'melee', name: 'MELEE', hint: 'Speed scales its damage the hardest.' },
  { id: 'utility', name: 'UTILITY', hint: 'One per round. Use it well.' },
]

const P = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: 'primary', name, qyn, rarity, desc, stats, model })
const S = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: 'secondary', name, qyn, rarity, desc, stats, model })
const M = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: 'melee', name, qyn, rarity, desc, stats, model })
const U = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: 'utility', name, qyn, rarity, desc, stats, model })

export const WEAPONS = [
  // ══════════════════════════ PRIMARIES ══════════════════════════
  P('vex9', 'VEX-9', 0, 'standard', 'Perfectly boring, perfectly reliable. The yardstick every other rifle is measured against.',
    { dmg: 21, head: 1.9, rpm: 660, auto: true, mag: 30, reserve: 120, reload: 1.9, spreadHip: 2.2, spreadAds: 0.32, adsTime: 0.22, adsFov: 62, range: 90, falloff: [45, 85, 0.65], recoil: { v: 0.85, h: 0.32, kick: 0.035, recover: 8 }, speed: 1.0, type: 'hitscan' },
    { kind: 'rifle', len: 0.72, body: 0x2f3947, accent: 0x6ee7ff, barrel: 0.30, stock: true, sight: 'holo' }),

  P('krill', 'KRILL-7', 420, 'standard', 'Short, light and obnoxiously fast. Melts at knife range, runs dry in a heartbeat.',
    { dmg: 15, head: 1.7, rpm: 1050, auto: true, mag: 34, reserve: 136, reload: 1.7, spreadHip: 2.8, spreadAds: 0.55, adsTime: 0.16, adsFov: 70, range: 55, falloff: [20, 50, 0.5], recoil: { v: 0.62, h: 0.42, kick: 0.028, recover: 9 }, speed: 1.06, type: 'hitscan' },
    { kind: 'smg', len: 0.5, body: 0x33323f, accent: 0xff8a3d, barrel: 0.16, stock: false, sight: 'dot' }),

  P('halberd', 'HALBERD', 700, 'standard', 'Three round burst. Rewards a steady trigger finger and a still crosshair.',
    { dmg: 26, head: 2.0, rpm: 760, auto: false, burst: 3, burstDelay: 0.28, mag: 24, reserve: 96, reload: 2.0, spreadHip: 2.4, spreadAds: 0.12, adsTime: 0.24, adsFov: 55, range: 120, falloff: [70, 120, 0.8], recoil: { v: 1.05, h: 0.22, kick: 0.045, recover: 7 }, speed: 0.98, type: 'hitscan' },
    { kind: 'rifle', len: 0.78, body: 0x3a2f2a, accent: 0xffd166, barrel: 0.34, stock: true, sight: 'holo' }),

  P('tremor', 'TREMOR-44', 1100, 'rare', 'Belt fed patience. Two hundred reasons to hold a corridor.',
    { dmg: 24, head: 1.6, rpm: 560, auto: true, mag: 75, reserve: 150, reload: 3.6, spreadHip: 4.0, spreadAds: 0.7, adsTime: 0.42, adsFov: 60, range: 100, falloff: [55, 100, 0.7], recoil: { v: 0.78, h: 0.5, kick: 0.05, recover: 5.5 }, speed: 0.9, type: 'hitscan', spin: 0.25 },
    { kind: 'lmg', len: 0.92, body: 0x2b2f38, accent: 0x9d7bff, barrel: 0.44, stock: true, sight: 'holo', drum: true }),

  P('longspur', 'LONGSPUR', 1600, 'rare', 'Semi auto marksman rifle. Two to the chest, one to the head, no argument.',
    { dmg: 58, head: 2.2, rpm: 190, auto: false, mag: 12, reserve: 48, reload: 2.3, spreadHip: 4.5, spreadAds: 0.05, adsTime: 0.3, adsFov: 38, range: 160, falloff: [110, 160, 0.85], recoil: { v: 1.9, h: 0.2, kick: 0.09, recover: 5 }, speed: 0.95, type: 'hitscan' },
    { kind: 'dmr', len: 0.95, body: 0x26414a, accent: 0x6ee7ff, barrel: 0.5, stock: true, sight: 'scope' }),

  P('blackwing', 'BLACKWING', 2600, 'epic', 'Bolt action. Two bodyshots, or one at full sprint. Headshots at any speed.',
    { dmg: 112, head: 2.0, rpm: 48, auto: false, mag: 5, reserve: 25, reload: 3.1, spreadHip: 7.0, spreadAds: 0.0, adsTime: 0.42, adsFov: 22, range: 220, falloff: [180, 220, 0.95], recoil: { v: 3.0, h: 0.3, kick: 0.16, recover: 3.4 }, speed: 0.88, type: 'hitscan', bolt: true },
    { kind: 'sniper', len: 1.15, body: 0x1d2027, accent: 0xff4d6d, barrel: 0.62, stock: true, sight: 'scope' }),

  P('shatter', 'SHATTER-12', 1400, 'rare', 'Full auto shotgun. Slide around a corner, hold the trigger, delete the room.',
    { dmg: 11, head: 1.35, rpm: 190, auto: true, pellets: 8, mag: 8, reserve: 32, reload: 2.6, spreadHip: 5.5, spreadAds: 3.2, adsTime: 0.3, adsFov: 68, range: 28, falloff: [8, 26, 0.28], recoil: { v: 1.6, h: 0.6, kick: 0.11, recover: 6 }, speed: 1.0, type: 'hitscan' },
    { kind: 'shotgun', len: 0.66, body: 0x3d2c22, accent: 0xffa14a, barrel: 0.34, stock: false, sight: 'dot' }),

  P('wraith', 'WRAITH-S', 1900, 'epic', 'Integrally suppressed. No tracers, no muzzle flash, no sympathy.',
    { dmg: 19, head: 2.0, rpm: 800, auto: true, mag: 28, reserve: 112, reload: 1.8, spreadHip: 2.0, spreadAds: 0.28, adsTime: 0.19, adsFov: 64, range: 80, falloff: [40, 80, 0.6], recoil: { v: 0.7, h: 0.28, kick: 0.03, recover: 8.5 }, speed: 1.04, type: 'hitscan', silent: true },
    { kind: 'smg', len: 0.62, body: 0x1c1e24, accent: 0x39d98a, barrel: 0.3, stock: true, sight: 'dot' }),

  P('prismc', 'PRISM CANNON', 3400, 'legendary', 'Charged particle lance. Hold to charge, release to cut a lane straight through a lane.',
    { dmg: 46, head: 1.5, rpm: 95, auto: false, charge: 0.55, chargeMul: 2.1, mag: 8, reserve: 32, reload: 2.4, spreadHip: 2.0, spreadAds: 0.0, adsTime: 0.34, adsFov: 50, range: 140, falloff: [90, 140, 0.8], recoil: { v: 1.3, h: 0.1, kick: 0.07, recover: 6 }, speed: 0.93, type: 'beam', beamColor: 0xb388ff },
    { kind: 'energy', len: 0.88, body: 0x241b3a, accent: 0xb388ff, barrel: 0.42, stock: true, sight: 'dot', glow: true }),

  P('quasar', 'QUASAR-0', 5200, 'mythic', 'Bouncing plasma bolts. Angles that should not work, do.',
    { dmg: 34, head: 1.4, rpm: 150, auto: false, mag: 10, reserve: 40, reload: 2.2, spreadHip: 1.2, spreadAds: 0.1, adsTime: 0.26, adsFov: 58, range: 200, falloff: [120, 200, 0.9], recoil: { v: 0.9, h: 0.15, kick: 0.05, recover: 7 }, speed: 0.96, type: 'projectile', projSpeed: 95, projColor: 0x6ee7ff, splash: 2.2, bounces: 2 },
    { kind: 'energy', len: 0.8, body: 0x101a2e, accent: 0x6ee7ff, barrel: 0.36, stock: true, sight: 'holo', glow: true }),

  // ══════════════════════════ SECONDARIES ══════════════════════════
  S('q1', 'SIDEARM Q1', 0, 'standard', 'The free pistol. Surprisingly rude at close range.',
    { dmg: 30, head: 2.0, rpm: 400, auto: false, mag: 12, reserve: 48, reload: 1.5, spreadHip: 2.0, spreadAds: 0.4, adsTime: 0.16, adsFov: 66, range: 60, falloff: [25, 60, 0.6], recoil: { v: 1.0, h: 0.3, kick: 0.05, recover: 8 }, speed: 1.08, type: 'hitscan' },
    { kind: 'pistol', len: 0.3, body: 0x2c313b, accent: 0x9fb3c8, barrel: 0.12, stock: false, sight: 'iron' }),

  S('vesper', 'VESPER', 350, 'standard', 'Six rounds of .44. Reloads like a grandfather, hits like a truck.',
    { dmg: 62, head: 2.1, rpm: 165, auto: false, mag: 6, reserve: 24, reload: 2.6, spreadHip: 2.6, spreadAds: 0.25, adsTime: 0.24, adsFov: 52, range: 70, falloff: [35, 70, 0.65], recoil: { v: 2.1, h: 0.35, kick: 0.13, recover: 5 }, speed: 1.05, type: 'hitscan' },
    { kind: 'revolver', len: 0.34, body: 0x3b2f2f, accent: 0xd9b382, barrel: 0.16, stock: false, sight: 'iron' }),

  S('moskito', 'MOSKITO', 600, 'rare', 'Machine pistol. Annoying, buzzing, endless.',
    { dmg: 13, head: 1.6, rpm: 1250, auto: true, mag: 22, reserve: 88, reload: 1.4, spreadHip: 3.4, spreadAds: 0.9, adsTime: 0.13, adsFov: 74, range: 40, falloff: [15, 40, 0.45], recoil: { v: 0.5, h: 0.55, kick: 0.022, recover: 10 }, speed: 1.1, type: 'hitscan' },
    { kind: 'pistol', len: 0.26, body: 0x2a2f2a, accent: 0xc3f584, barrel: 0.08, stock: false, sight: 'iron' }),

  S('hornet', 'HORNET', 950, 'rare', 'Burst pistol. Two taps and a corpse.',
    { dmg: 24, head: 1.9, rpm: 900, auto: false, burst: 2, burstDelay: 0.16, mag: 18, reserve: 72, reload: 1.6, spreadHip: 1.8, spreadAds: 0.2, adsTime: 0.15, adsFov: 62, range: 65, falloff: [30, 65, 0.6], recoil: { v: 0.8, h: 0.25, kick: 0.04, recover: 9 }, speed: 1.07, type: 'hitscan' },
    { kind: 'pistol', len: 0.3, body: 0x39331f, accent: 0xffd166, barrel: 0.13, stock: false, sight: 'dot' }),

  S('cutlass', 'CUTLASS', 1200, 'rare', 'Sawed off. Two barrels, one doorway, zero survivors.',
    { dmg: 9, head: 1.3, rpm: 200, auto: false, pellets: 9, mag: 2, reserve: 16, reload: 1.9, spreadHip: 7.5, spreadAds: 5.0, adsTime: 0.2, adsFov: 74, range: 22, falloff: [6, 20, 0.22], recoil: { v: 2.4, h: 0.8, kick: 0.18, recover: 5 }, speed: 1.09, type: 'hitscan' },
    { kind: 'shotgun', len: 0.34, body: 0x402a1e, accent: 0xffa14a, barrel: 0.16, stock: false, sight: 'iron' }),

  S('needle', 'NEEDLE', 1700, 'epic', 'Precision sidearm. Headshots are not lucky, they are earned.',
    { dmg: 38, head: 2.4, rpm: 340, auto: false, mag: 10, reserve: 40, reload: 1.7, spreadHip: 1.6, spreadAds: 0.02, adsTime: 0.2, adsFov: 44, range: 90, falloff: [50, 90, 0.75], recoil: { v: 1.2, h: 0.15, kick: 0.06, recover: 7 }, speed: 1.06, type: 'hitscan' },
    { kind: 'pistol', len: 0.36, body: 0x1e2a33, accent: 0x6ee7ff, barrel: 0.18, stock: false, sight: 'dot' }),

  S('judge', 'JUDGE', 2300, 'epic', 'Hand cannon. Slow, loud, final.',
    { dmg: 74, head: 2.0, rpm: 145, auto: false, mag: 5, reserve: 20, reload: 2.4, spreadHip: 3.0, spreadAds: 0.3, adsTime: 0.26, adsFov: 54, range: 80, falloff: [40, 80, 0.7], recoil: { v: 2.6, h: 0.45, kick: 0.17, recover: 4.6 }, speed: 1.0, type: 'hitscan' },
    { kind: 'revolver', len: 0.38, body: 0x241a1a, accent: 0xff4d6d, barrel: 0.2, stock: false, sight: 'iron' }),

  S('flare', 'FLARE-9', 1500, 'rare', 'Micro SMG that empties before the thought finishes.',
    { dmg: 11, head: 1.5, rpm: 1400, auto: true, mag: 30, reserve: 120, reload: 1.5, spreadHip: 3.8, spreadAds: 1.1, adsTime: 0.12, adsFov: 76, range: 34, falloff: [12, 34, 0.4], recoil: { v: 0.45, h: 0.6, kick: 0.02, recover: 11 }, speed: 1.12, type: 'hitscan' },
    { kind: 'smg', len: 0.28, body: 0x332437, accent: 0xff7ad9, barrel: 0.08, stock: false, sight: 'iron' }),

  S('prismp', 'PRISM PISTOL', 3000, 'legendary', 'Charged sidearm. A fully charged shot staggers anything it touches.',
    { dmg: 30, head: 1.6, rpm: 220, auto: false, charge: 0.4, chargeMul: 1.9, mag: 8, reserve: 32, reload: 1.8, spreadHip: 1.4, spreadAds: 0.05, adsTime: 0.22, adsFov: 58, range: 110, falloff: [60, 110, 0.8], recoil: { v: 0.9, h: 0.12, kick: 0.05, recover: 7 }, speed: 1.05, type: 'beam', beamColor: 0xffa8f0 },
    { kind: 'energy', len: 0.34, body: 0x2b1b3d, accent: 0xffa8f0, barrel: 0.14, stock: false, sight: 'dot', glow: true }),

  S('twinfang', 'TWINFANG', 4200, 'mythic', 'Akimbo. Twice the lead, twice the fun, zero subtlety.',
    { dmg: 20, head: 1.7, rpm: 700, auto: true, mag: 24, reserve: 96, reload: 2.1, spreadHip: 3.0, spreadAds: 0.7, adsTime: 0.18, adsFov: 70, range: 50, falloff: [22, 50, 0.5], recoil: { v: 0.6, h: 0.5, kick: 0.03, recover: 9 }, speed: 1.08, type: 'hitscan', akimbo: true },
    { kind: 'pistol', len: 0.28, body: 0x2d1f2f, accent: 0xff4d6d, barrel: 0.1, stock: false, sight: 'iron', akimbo: true }),

  // ══════════════════════════ MELEE ══════════════════════════
  M('knife', 'TRENCH KNIFE', 0, 'standard', 'Free, fast, and lethal to anyone who turns their back.',
    { dmg: 55, back: 2.2, rate: 2.2, reach: 2.0, speed: 1.15, type: 'melee', style: 'stab' },
    { kind: 'blade', len: 0.42, body: 0x2f3947, accent: 0xdfe7ef, blade: 0xc9d6e2 }),

  M('fists', 'QYN FISTS', 300, 'standard', 'Nothing in your hands means nothing slowing you down.',
    { dmg: 42, back: 1.4, rate: 3.4, reach: 1.7, speed: 1.22, type: 'melee', style: 'punch' },
    { kind: 'fist', len: 0.2, body: 0xe0a173, accent: 0x2f3947 }),

  M('bat', 'SLUGGER', 550, 'standard', 'Aluminium. Sends people exactly where you want them.',
    { dmg: 68, back: 1.2, rate: 1.5, reach: 2.2, speed: 1.08, type: 'melee', style: 'swing', knock: 9 },
    { kind: 'blunt', len: 0.62, body: 0xb8c4cf, accent: 0x2f3947 }),

  M('machete', 'MACHETE', 800, 'rare', 'Wide arcs. Rewards players who never stop moving.',
    { dmg: 72, back: 1.6, rate: 1.8, reach: 2.3, speed: 1.12, type: 'melee', style: 'swing' },
    { kind: 'blade', len: 0.6, body: 0x2b3a2c, accent: 0x9bd45f, blade: 0xd7e8c8 }),

  M('tonfa', 'TONFA PAIR', 1100, 'rare', 'Fast combo strikes. Two hits land before one heavy swing would.',
    { dmg: 46, back: 1.5, rate: 3.0, reach: 1.9, speed: 1.16, type: 'melee', style: 'punch' },
    { kind: 'blunt', len: 0.44, body: 0x23262d, accent: 0xffd166 }),

  M('katana', 'KATANA', 1800, 'epic', 'Clean, long, merciless. The fastest draw in the armory.',
    { dmg: 88, back: 1.8, rate: 1.5, reach: 2.7, speed: 1.1, type: 'melee', style: 'slash' },
    { kind: 'blade', len: 0.95, body: 0x14161b, accent: 0xff4d6d, blade: 0xf2f6ff }),

  M('axe', 'FIRE AXE', 1600, 'rare', 'Slow commit, huge payoff. Do not miss.',
    { dmg: 105, back: 1.5, rate: 0.9, reach: 2.4, speed: 1.0, type: 'melee', style: 'chop' },
    { kind: 'blunt', len: 0.7, body: 0x4a2f1c, accent: 0xff8a3d, blade: 0xd9d9d9 }),

  M('spear', 'QYN SPEAR', 2400, 'epic', 'Longest reach in the game. Poke from outside their comfort.',
    { dmg: 88, back: 1.3, rate: 1.5, reach: 3.4, speed: 1.06, type: 'melee', style: 'stab' },
    { kind: 'blade', len: 1.25, body: 0x2a2f3a, accent: 0x6ee7ff, blade: 0xa8e9ff }),

  M('sledge', 'SLEDGE', 2800, 'epic', 'Two handed apology. Anything it touches stops moving.',
    { dmg: 130, back: 1.2, rate: 0.75, reach: 2.5, speed: 0.94, type: 'melee', style: 'chop', knock: 16 },
    { kind: 'blunt', len: 0.8, body: 0x3a3f47, accent: 0xffa14a }),

  M('qynblade', 'QYN BLADE', 5000, 'mythic', 'A blade made of condensed momentum. The faster you move, the harder it cuts.',
    { dmg: 84, back: 2.0, rate: 2.0, reach: 2.6, speed: 1.2, type: 'melee', style: 'slash', momentum: 2.0 },
    { kind: 'energy', len: 0.9, body: 0x1a1030, accent: 0xb388ff, blade: 0xd7b3ff, glow: true }),

  // ══════════════════════════ UTILITIES ══════════════════════════
  U('frag', 'FRAG', 0, 'standard', 'The classic. Cook it and it lands exactly when you arrive.',
    { type: 'throw', dmg: 110, radius: 5.5, fuse: 2.2, count: 1, speed: 1.0, color: 0x8fd14f },
    { kind: 'grenade', body: 0x3c4a2e, accent: 0x8fd14f }),

  U('flash', 'FLASH', 400, 'standard', 'Blinds for 1.8s. Slide in behind it.',
    { type: 'throw', dmg: 8, radius: 7.0, fuse: 1.4, count: 2, flash: 1.8, speed: 1.0, color: 0xfff3b0 },
    { kind: 'grenade', body: 0x4a4a52, accent: 0xfff3b0 }),

  U('smoke', 'SMOKE', 500, 'standard', 'Six seconds of cover you can slide straight out of.',
    { type: 'throw', dmg: 0, radius: 6.0, fuse: 1.0, count: 2, smoke: 6, speed: 1.0, color: 0xbfc7d1 },
    { kind: 'grenade', body: 0x3a3f47, accent: 0xbfc7d1 }),

  U('emp', 'EMP', 900, 'rare', 'Slows and strips shields. Also pops enemy utility mid flight.',
    { type: 'throw', dmg: 25, radius: 6.5, fuse: 1.6, count: 1, slow: 0.45, slowTime: 3, speed: 1.0, color: 0x6ee7ff },
    { kind: 'grenade', body: 0x1e2a33, accent: 0x6ee7ff }),

  U('stim', 'STIM', 700, 'rare', 'Four seconds of +35% speed and a heal over time. Chaining fuel.',
    { type: 'self', heal: 45, haste: 1.35, hasteTime: 4, count: 2, speed: 1.0, color: 0xff5d8f },
    { kind: 'device', body: 0x3a1f2a, accent: 0xff5d8f }),

  U('dash', 'DASH CHARGE', 1100, 'rare', 'Instant impulse in your movement direction. Converts a slide into a launch.',
    { type: 'self', impulse: 15, count: 2, speed: 1.0, color: 0x6ee7ff },
    { kind: 'device', body: 0x1b2a3a, accent: 0x6ee7ff }),

  U('grapnel', 'GRAPNEL', 1500, 'epic', 'Fires a line and yanks you to it. Air strafe out of the pull for real speed.',
    { type: 'hook', count: 2, pull: 34, speed: 1.0, color: 0xffd166 },
    { kind: 'device', body: 0x33301a, accent: 0xffd166 }),

  U('barrier', 'BARRIER', 1300, 'rare', 'Deploys a 250 hp wall. Slide over it, shoot under it, play around it.',
    { type: 'place', hp: 250, count: 1, speed: 1.0, color: 0x9d7bff },
    { kind: 'device', body: 0x241f3a, accent: 0x9d7bff }),

  U('mine', 'PROX MINE', 1700, 'epic', 'Arms anywhere, including ceilings. Punishes predictable routes.',
    { type: 'place', dmg: 95, radius: 4.0, count: 2, arm: 0.8, speed: 1.0, color: 0xff4d6d },
    { kind: 'device', body: 0x3a1f22, accent: 0xff4d6d }),

  U('decoy', 'ECHO DECOY', 2200, 'epic', 'A sprinting hologram of you. People shoot it. Every time.',
    { type: 'throw', dmg: 0, radius: 0, fuse: 8, count: 2, decoy: true, speed: 1.0, color: 0x39d98a },
    { kind: 'device', body: 0x1c3327, accent: 0x39d98a }),
]

export const WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))
export const bySlot = (slot) => WEAPONS.filter((w) => w.slot === slot)

export const RARITY = {
  standard: { color: '#9fb3c8', label: 'STANDARD' },
  rare: { color: '#6ee7ff', label: 'RARE' },
  epic: { color: '#b388ff', label: 'EPIC' },
  legendary: { color: '#ffd166', label: 'LEGENDARY' },
  mythic: { color: '#ff4d6d', label: 'MYTHIC' },
}

export const DEFAULT_LOADOUT = { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }
