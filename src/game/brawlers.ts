import { TILE } from './types'

export interface Look {
  hat: 'helmet' | 'goggles' | 'cap' | 'headband' | 'beaker' | 'headphones' | 'hood' | 'visor'
  weapon: 'shotgun' | 'bazooka' | 'rifle' | 'gloves' | 'bottles' | 'amp' | 'blades' | 'smg'
  muzzle: boolean
}

export type AttackDef =
  | { kind: 'spread'; pellets: number; damage: number; range: number; speed: number; spread: number; knock?: number }
  | { kind: 'burst'; shots: number; damage: number; range: number; speed: number; gap: number }
  | { kind: 'lob'; damage: number; range: number; duration: number; splash: number }
  | { kind: 'rocket'; damage: number; range: number; speed: number; splash: number }
  | { kind: 'smg'; damage: number; range: number; speed: number }
  | { kind: 'wave'; damage: number; range: number; speed: number; width: number; pierce: number }
  | { kind: 'swipe'; damage: number; range: number; arc: number }
  | { kind: 'slash'; damage: number; range: number; arc: number; dash: number }

export type SuperDef =
  | { kind: 'bigshot'; pellets: number; damage: number; range: number; speed: number; spread: number; knock: number }
  | { kind: 'barrage'; shots: number; damage: number; range: number; speed: number; splash: number; gap: number }
  | { kind: 'pierce'; shots: number; damage: number; range: number; speed: number; pierce: number; gap: number }
  | { kind: 'leap'; damage: number; maxRange: number; splash: number; knock: number }
  | { kind: 'megabottle'; bottles: number; damage: number; range: number; duration: number; splash: number; spread: number }
  | { kind: 'healwave'; heal: number; range: number }
  | { kind: 'dashslash'; damage: number; range: number; splash: number }
  | { kind: 'turret'; hp: number; damage: number; range: number; fireRate: number; life: number }

export type GadgetDef =
  | { kind: 'shield'; name: string; desc: string }
  | { kind: 'dash'; name: string; desc: string }
  | { kind: 'overclock'; name: string; desc: string }
  | { kind: 'roar'; name: string; desc: string }
  | { kind: 'goo'; name: string; desc: string }
  | { kind: 'tonic'; name: string; desc: string }
  | { kind: 'blink'; name: string; desc: string }
  | { kind: 'ammo'; name: string; desc: string }

export interface BrawlerDef {
  id: string
  name: string
  title: string
  desc: string
  hp: number
  speed: number // px/s
  reload: number // seconds per ammo
  ammoMax: number
  attack: AttackDef
  super: SuperDef
  superName: string
  superNeed: number // damage needed for full super
  gadget: GadgetDef
  look: Look
  colors: { body: string; skin: string; accent: string; outline: string }
  difficulty: 1 | 2 | 3
}

export const BRAWLERS: BrawlerDef[] = [
  {
    id: 'rusty',
    name: 'Rusty',
    title: 'The Scattergun',
    desc: 'A grizzled badger with a double-barrel. Point blank? Say goodnight.',
    hp: 5200,
    speed: 255,
    reload: 1.3,
    ammoMax: 3,
    attack: { kind: 'spread', pellets: 5, damage: 340, range: 4.4 * TILE, speed: 720, spread: 0.3, knock: 40 },
    super: { kind: 'bigshot', pellets: 11, damage: 380, range: 5.4 * TILE, speed: 780, spread: 0.55, knock: 160 },
    superName: 'BOOM STICK',
    superNeed: 8200,
    gadget: { kind: 'shield', name: 'Iron Hide', desc: 'Take 50% less damage for 3s' },
    look: { hat: 'helmet', weapon: 'shotgun', muzzle: true },
    colors: { body: '#5b7a2e', skin: '#c9a06a', accent: '#b85c1f', outline: '#2b2418' },
    difficulty: 1,
  },
  {
    id: 'nova',
    name: 'Nova',
    title: 'The Firework',
    desc: 'Rockets the size of beach balls. Everything in the blast zone says ouch.',
    hp: 4300,
    speed: 245,
    reload: 1.7,
    ammoMax: 3,
    attack: { kind: 'rocket', damage: 1250, range: 8 * TILE, speed: 520, splash: 54 },
    super: { kind: 'barrage', shots: 3, damage: 1100, range: 8.2 * TILE, speed: 580, splash: 62, gap: 0.16 },
    superName: 'FIREWORK FINALE',
    superNeed: 9000,
    gadget: { kind: 'dash', name: 'Rocket Hop', desc: 'Boost dash in your aim direction' },
    look: { hat: 'goggles', weapon: 'bazooka', muzzle: true },
    colors: { body: '#e07a2f', skin: '#f2c39b', accent: '#ffd23f', outline: '#3a2013' },
    difficulty: 2,
  },
  {
    id: 'rex',
    name: 'Rex',
    title: 'The Marksman',
    desc: 'Four-round bursts at sniper range. Accuracy is just patience with attitude.',
    hp: 3900,
    speed: 260,
    reload: 1.35,
    ammoMax: 3,
    attack: { kind: 'burst', shots: 4, damage: 280, range: 8.6 * TILE, speed: 800, gap: 0.07 },
    super: { kind: 'pierce', shots: 8, damage: 360, range: 10.5 * TILE, speed: 1020, pierce: 4, gap: 0.06 },
    superName: 'SILVER STREAM',
    superNeed: 8500,
    gadget: { kind: 'overclock', name: 'Overclock', desc: 'Reload 45% faster for 6s' },
    look: { hat: 'cap', weapon: 'rifle', muzzle: true },
    colors: { body: '#2e6fd8', skin: '#e8d9b8', accent: '#ffffff', outline: '#1a2440' },
    difficulty: 2,
  },
  {
    id: 'moose',
    name: 'Moose',
    title: 'The Wall',
    desc: 'A walking mountain with boxing gloves. His hugs are not hugs.',
    hp: 7800,
    speed: 215,
    reload: 1.6,
    ammoMax: 3,
    attack: { kind: 'swipe', damage: 950, range: 2.9 * TILE, arc: 1.5 },
    super: { kind: 'leap', damage: 1200, maxRange: 6 * TILE, splash: 85, knock: 220 },
    superName: 'MOUNTAIN DROP',
    superNeed: 10000,
    gadget: { kind: 'roar', name: 'Rumble Roar', desc: 'Knock back all nearby enemies' },
    look: { hat: 'headband', weapon: 'gloves', muzzle: false },
    colors: { body: '#c0392b', skin: '#8d5a3a', accent: '#f5c542', outline: '#33150f' },
    difficulty: 1,
  },
  {
    id: 'tumble',
    name: 'Tumble',
    title: 'The Brewmaster',
    desc: 'Lobs potion bottles over walls. Bottoms up — on their heads.',
    hp: 3500,
    speed: 245,
    reload: 1.7,
    ammoMax: 3,
    attack: { kind: 'lob', damage: 820, range: 7.2 * TILE, duration: 0.55, splash: 58 },
    super: { kind: 'megabottle', bottles: 3, damage: 1050, range: 7.6 * TILE, duration: 0.62, splash: 72, spread: 1.6 },
    superName: 'BREW STORM',
    superNeed: 9000,
    gadget: { kind: 'goo', name: 'Sticky Goo', desc: 'Leave a slowing puddle behind for 4s' },
    look: { hat: 'beaker', weapon: 'bottles', muzzle: false },
    colors: { body: '#7d4bb8', skin: '#9b8f7c', accent: '#3adf6e', outline: '#251236' },
    difficulty: 2,
  },
  {
    id: 'pip',
    name: 'Pip',
    title: 'The Soundwave',
    desc: 'A frog medic whose amplifier heals friends and flattens foes.',
    hp: 4700,
    speed: 250,
    reload: 1.35,
    ammoMax: 3,
    attack: { kind: 'wave', damage: 640, range: 5.6 * TILE, speed: 460, width: 96, pierce: 2 },
    super: { kind: 'healwave', heal: 1800, range: 170 },
    superName: 'ENCORE',
    superNeed: 8000,
    gadget: { kind: 'tonic', name: 'Pick-Me-Up', desc: 'Instantly restore 1200 HP' },
    look: { hat: 'headphones', weapon: 'amp', muzzle: false },
    colors: { body: '#2ec4a8', skin: '#7ccf5a', accent: '#ff8ac2', outline: '#12322c' },
    difficulty: 1,
  },
  {
    id: 'blitz',
    name: 'Blitz',
    title: 'The Ghost',
    desc: 'A fox ninja faster than bad news. Slash, dash, vanish.',
    hp: 4300,
    speed: 300,
    reload: 1.25,
    ammoMax: 3,
    attack: { kind: 'slash', damage: 780, range: 2.7 * TILE, arc: 0.9, dash: 60 },
    super: { kind: 'dashslash', damage: 1050, range: 5.2 * TILE, splash: 60 },
    superName: 'BLINK STRIKE',
    superNeed: 8500,
    gadget: { kind: 'blink', name: 'Smoke Bomb', desc: 'Teleport a short distance toward your aim' },
    look: { hat: 'hood', weapon: 'blades', muzzle: false },
    colors: { body: '#e8c820', skin: '#e6a04b', accent: '#26221a', outline: '#33291a' },
    difficulty: 3,
  },
  {
    id: 'twitch',
    name: 'Twitch',
    title: 'The Engineer',
    desc: 'Sprays rapid fire and drops a turret that does the talking.',
    hp: 3700,
    speed: 270,
    reload: 1.0,
    ammoMax: 3,
    attack: { kind: 'smg', damage: 150, range: 7 * TILE, speed: 800 },
    super: { kind: 'turret', hp: 2400, damage: 300, range: 8 * TILE, fireRate: 0.45, life: 13 },
    superName: 'BUDDY BOT',
    superNeed: 7500,
    gadget: { kind: 'ammo', name: 'Ammo Cache', desc: 'Refill all ammo and gain 15% super' },
    look: { hat: 'visor', weapon: 'smg', muzzle: true },
    colors: { body: '#26c6da', skin: '#f0d8c0', accent: '#0d47a1', outline: '#10242e' },
    difficulty: 2,
  },
]

export const brawlerById = (id: string): BrawlerDef => BRAWLERS.find((b) => b.id === id) ?? BRAWLERS[0]

export function attackRangeOf(def: BrawlerDef): number {
  return def.attack.range
}

export function superRangeOf(def: BrawlerDef): number {
  switch (def.super.kind) {
    case 'bigshot': return def.super.range
    case 'barrage': return def.super.range
    case 'pierce': return def.super.range
    case 'leap': return def.super.maxRange
    case 'megabottle': return def.super.range
    case 'healwave': return 3.2 * TILE
    case 'dashslash': return def.super.range
    case 'turret': return 2.6 * TILE
  }
}
