// RecipeEngine — the "createGame" generator. Given a scene label the AI
// decided on, this materializes a playable layout through the WorldAPI
// (it never touches Three.js directly). Each recipe returns the info the
// AIController needs to announce: title, description, objective and how
// the run "wins" (finish gate, all coins, all targets, all pins...).

import type { WorldAPI } from '../world/WorldAPI'
import type { Category, PhysicsBody, Shape } from '../types'
import { hashStr } from '../utils/helpers'

type Extra = {
  rot?: [number, number, number]
  emissive?: string
  emissiveIntensity?: number
  category?: Category
  tags?: string[]
  solid?: boolean
  visible?: boolean
  opacity?: number
  interact?: string
  shape?: Shape
  body?: PhysicsBody
  kind?: string
}

export type WinMode = 'none' | 'finish' | 'coins' | 'targets' | 'pins'

export interface SceneInfo {
  label: string
  title: string
  description: string
  objective: string
  winMode: WinMode
  built: boolean
  /** how many collectibles the objective counts (coin runs) */
  coinCount?: number
  /** where the scene "lives" (for context) */
  area: [number, number, number]
}

interface Lane {
  x0: number
  z0: number
  dir: 1 | -1
}

// Candidate lanes: 1D corridors along x, starting 10-16m from spawn
// (0,~5,6), always pointing away from the AI head's sky spot (0,20,24).
// course lanes start closer to spawn than the world edge (±55): the
// longest recipes extend ~45m so the far end must stay reachable
const LANES: Lane[] = [
  { x0: 6, z0: 9, dir: 1 },
  { x0: 8, z0: -15, dir: 1 },
  { x0: -7, z0: 9, dir: -1 },
  { x0: -9, z0: -19, dir: -1 },
]

const GREEN = '#7ecb6b'
const YELLOW = '#ffd23f'
const ORANGE = '#ffa04d'
const BLUE = '#3f9dff'
const RED = '#ff5a4e'

const DYES = ['#b06a48', '#7c93a8', '#b3546e', '#5d7fb8', '#8a6bb0', '#7ab25c']

export class RecipeEngine {
  private lastLane: Lane | null = null
  private rnd: () => number

  constructor(private w: WorldAPI, seed = 7) {
    const h = hashStr('recipe' + seed)
    this.rnd = () => {
      let x = Math.sin(h + this.counter++) * 10000
      return x - Math.floor(x)
    }
  }
  private counter = 1

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rnd() * arr.length) % arr.length]
  }

  create(label: string): SceneInfo {
    const l = label.toLowerCase()
    if (l.includes('maze')) return this.maze(label)
    if (l.includes('parkour') || (l.includes('obstacle') && l.includes('course'))) return this.parkour(label)
    if (l.includes('coin') || l.includes('collect') || l.includes('gem')) return this.coinRun(label)
    if (l.includes('tower') || l.includes('climb') || l.includes('island')) return this.islands(label)
    if (l.includes('race') || l.includes('car') || l.includes('track')) return this.race(label)
    if (l.includes('bowl')) return this.bowling(label)
    if (l.includes('target') || l.includes('shoot')) return this.shooting(label)
    if (l.includes('red light')) return this.redLight(label)
    if (l.includes('guard') || l.includes('sneak')) return this.guardRun(label)
    if (l.includes('dodge')) return this.dodge(label)
    if (l.includes('speed') || l.includes('sprint')) return this.speedrun(label)
    if (l.includes('plaza') || l.includes('hang') || l.includes('chill') || l.includes('sunset')) return this.plaza(label)
    if (l.includes('farm') || l.includes('cow')) return this.farm(label)
    if (l.includes('grave') || l.includes('spooky') || l.includes('haunt') || l.includes('ghost')) return this.graveyard(label)
    if (l.includes('house') || l.includes('home') || l.includes('cabin') || l.includes('cottage')) return this.house(label)
    if (l.includes('night') || l.includes('camp') || l.includes('fire')) return this.nightCamp(label)
    if (l.includes('rain')) return this.rain(label)
    return this.generic(label)
  }

  // ---------------------------------------------------------------- helpers
  private lane(): Lane {
    const free = LANES.filter((l) => l !== this.lastLane)
    const lane = free.length ? free[Math.floor(Math.random() * free.length)] : LANES[0]
    this.lastLane = lane
    return lane
  }

  private lx(lane: Lane, x: number): number {
    return lane.x0 + lane.dir * x
  }

  private obj(kind: string, name: string, pos: [number, number, number], scale: number | [number, number, number], color: string, extra?: Extra) {
    return this.w.createObject({ kind, name, pos, scale, color, category: 'block', ...extra })
  }

  private tile(name: string, pos: [number, number, number], size: [number, number, number], color: string, tags?: string[]) {
    this.w.createObject({ kind: 'tile', name, pos, scale: size, color, tags, category: 'block', emissive: '#000000' })
  }

  private gem(name: string, pos: [number, number, number], color = YELLOW) {
    this.w.createObject({
      kind: 'gem', name, shape: 'gem', pos, scale: 0.45, color, emissive: color,
      emissiveIntensity: 1.4, category: 'prop', tags: ['collectible'], body: 'kinematic',
    })
  }

  private checkpoint(name: string, pos: [number, number, number], color = YELLOW) {
    this.w.createObject({
      kind: 'cp', name, pos, scale: [0.4, 2.6, 0.4], color, emissive: color,
      emissiveIntensity: 0.7, category: 'prop', tags: ['checkpoint'], body: 'kinematic',
    })
  }

  private arrow(x: number, z: number, dir: 1 | -1, color: string) {
    this.w.createObject({
      kind: 'arrow', shape: 'cone', name: 'lane_arrow', pos: [x + dir * 0.5, 4.6, z],
      rot: [0, dir === 1 ? Math.PI / 2 : -Math.PI / 2, 0], scale: [0.9, 1.8, 0.9],
      color, emissive: color, emissiveIntensity: 1.3, category: 'prop', body: 'kinematic', solid: false,
    })
  }

  private finishGate(name: string, pos: [number, number, number], color = GREEN) {
    this.obj('gate', `${name}_p1`, [pos[0], 2, pos[2] - 2.4], [0.5, 4, 0.5], '#3f4a5c')
    this.obj('gate', `${name}_p2`, [pos[0], 2, pos[2] + 2.4], [0.5, 4, 0.5], '#3f4a5c')
    this.obj('beam', `${name}_beam`, [pos[0], 4.2, pos[2]], [4.9, 0.5, 0.5], color, { emissive: color, emissiveIntensity: 1 })
    this.tile(`${name}_pad`, [pos[0], 0.02, pos[2]], [5.2, 0.04, 5.2], color, ['finish'])
    this.w.createObject({
      kind: 'fin', name, pos: [pos[0], 1.6, pos[2]], scale: 0.9, color,
      category: 'zone', shape: 'sphere', tags: ['finish'], visible: false, solid: false, body: 'kinematic',
    })
  }

  private done(label: string, title: string, description: string, objective: string, winMode: WinMode, area: [number, number, number], coinCount?: number): SceneInfo {
    return { label, title, description, objective, winMode, built: true, area, coinCount }
  }

  // ---------------------------------------------------------------- parkour
  private parkour(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const startX = this.lx(lane, 2)
    const dir = lane.dir
    const area: [number, number, number] = [this.lx(lane, 20), 0, z]
    this.tile('pk_start', [startX, 0.02, z], [5, 0.05, 6], BLUE, ['startZone'])
    this.arrow(this.lx(lane, 6), z, dir, BLUE)
    let idx = 0
    for (let gx = this.lx(lane, 8); dir * gx < dir * this.lx(lane, 40); gx += dir * 3, idx++) {
      const color = this.pick(DYES)
      if (idx % 4 === 1) {
        // gap with checkpoint beacon
        this.checkpoint(`pk_cp${idx}`, [gx + dir * 1.2, 0, z])
        continue
      }
      if (idx % 4 === 2) {
        // hurdle
        this.obj('hurdle', `pk_h${idx}`, [gx, 0.9, z], [2, 1.6, 2], color)
      } else if (idx % 4 === 3) {
        // hop pillars
        const h = 1 + (idx % 3) * 0.9
        this.obj('pillar', `pk_a${idx}`, [gx, h / 2, z - 2.3], [1.1, h, 1.1], color)
        this.obj('pillar', `pk_b${idx}`, [gx, h / 2, z + 2.3], [1.1, h, 1.1], color)
      } else {
        // low wall to jump over
        this.obj('wall', `pk_w${idx}`, [gx, 0.75, z], [1.8, 1.4, 5.6], color)
      }
    }
    const finX = this.lx(lane, 44)
    this.finishGate('pk_fin', [finX, 0, z])
    this.checkpoint('pk_cpF', [this.lx(lane, 40), 0, z], GREEN)
    return this.done(label, 'obstacle parkour', 'Hurdles, walls and hop-pillars in a long lane east of spawn.', 'Run the whole lane and touch the green finish gate. Checkpoint poles save your spot if you fall.', 'finish', area)
  }

  // --------------------------------------------------------------- coin run
  private coinRun(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const coins = 9
    for (let i = 1; i <= coins; i++) {
      const gx = this.lx(lane, 5 + i * 3.4)
      const gz = z + (i % 2 === 0 ? 3 : -3) * 1.1
      this.gem(`cr_g${i}`, [gx, 1.2 + (i % 3) * 0.8, gz])
      if (i % 3 === 0) {
        this.obj('arch', `cr_ar${i}`, [gx, 2.2, z - 4.6], [0.5, 3, 0.5], '#d8a05e')
        this.obj('arch', `cr_ar2${i}`, [gx, 2.2, z + 4.6], [0.5, 3, 0.5], '#d8a05e')
      }
    }
    this.tile('cr_start', [this.lx(lane, 2), 0.02, z], [5, 0.05, 6], ORANGE, ['startZone'])
    this.arrow(this.lx(lane, 5), z, dir, ORANGE)
    const finX = this.lx(lane, 42)
    this.obj('chest', 'cr_chest', [finX, 1.3, z], [2.4, 2.2, 1.8], '#c98a2e')
    this.obj('glow', 'cr_glow', [finX, 3, z], [1.2, 1, 1.2], YELLOW, { emissive: YELLOW, emissiveIntensity: 1.6, category: 'prop' })
    this.finishGate('cr_fin', [finX, 0, z], YELLOW)
    return this.done(label, 'coin run', 'A shiny coin trail leading to a treasure chest.', `Grab all ${coins} coins, then touch the golden gate. The chest opens. Probably.`, 'coins', [finX, 0, z], coins)
  }

  // ------------------------------------------------------- floating islands
  private islands(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const startX = this.lx(lane, 2)
    this.tile('is_start', [startX, 0.02, z], [6, 0.05, 8], BLUE, ['startZone'])
    // lava below
    for (let gx = this.lx(lane, 2); Math.abs(gx - this.lx(lane, 2)) < 40; gx += dir * 6) {
      this.w.createObject({
        kind: 'lava', name: `is_lava${Math.abs(gx)}`, pos: [gx, 0.06, z], scale: [5.6, 0.12, 12],
        color: '#ff4b22', emissive: '#ff4b22', emissiveIntensity: 0.8, category: 'block',
        tags: ['hazard'], solid: false,
      })
    }
    let gy = 1.8
    let lastPos: [number, number, number] = [startX, 0, z]
    for (let i = 1; i <= 8; i++) {
      const x = this.lx(lane, 8 + i * 4.4)
      const dz = (i % 2 === 0 ? 1 : -1) * (2.6 + (i % 3) * 0.8)
      gy = i === 1 ? 1.8 : gy + (i % 3 === 0 ? 3 : 2)
      const s: [number, number, number] = i === 8 ? [4.4, 1, 4.4] : [3.4, 1, 3.4]
      this.obj('island', `is_${i}`, [x, gy, z + dz], s, i === 8 ? '#a06bff' : '#7ab25c')
      if (i % 2 === 1 && i < 8) this.gem(`is_g${i}`, [x, gy + 1.8, z + dz])
      if (i % 2 === 0 || i === 8) this.checkpoint(`is_cp${i}`, [x, gy + 0.5, z + dz], i === 8 ? '#a06bff' : GREEN)
      lastPos = [x, gy, z + dz]
    }
    this.w.createObject({
      kind: 'goal', name: 'is_goal', shape: 'gem', pos: [lastPos[0], lastPos[1] + 2.6, lastPos[2]], scale: 1,
      color: '#c9a0ff', emissive: '#c9a0ff', emissiveIntensity: 2.4, category: 'prop',
      tags: ['finish'], body: 'kinematic', solid: false, visible: false,
    })
    return this.done(label, 'floating islands', 'Islands float higher and higher over a glowing lava floor.', 'Hop every island to the giant purple gem. Fall = lava = back to the last checkpoint!', 'finish', [this.lx(lane, 25), 8, z])
  }

  // ------------------------------------------------------------------ race
  private race(label: string): SceneInfo {
    // rounded-rect loop centered at (14,-14), 21 x 14 half-extents
    const cx = 14
    const cz = -14
    const hw = 19
    const hh = 12
    const R = 7
    const Y = 0.45
    const addSeg = (ax: number, az: number, bx: number, bz: number) => {
      const mx = (ax + bx) / 2
      const mz = (az + bz) / 2
      const dx = bx - ax
      const dz = bz - az
      const yaw = Math.atan2(dx, dz)
      this.w.createObject({
        kind: 'road', shape: 'box', name: 'rd', pos: [mx, Y / 2, mz], scale: [3.1, Y, Math.hypot(dx, dz) + 0.15],
        rot: [0, yaw, 0], color: '#4d5768', category: 'block',
      })
    }
    // Build straights with ~3.2m segments, then arcs as chords.
    const step = 3.2
    // east straight (x = cx+hw) from z=cz-hh+R .. cz+hh-R
    for (let z = cz - hh + R; z < cz + hh - R - 1; z += step) {
      addSeg(cx + hw, z, cx + hw, Math.min(z + step, cz + hh - R))
    }
    for (let z = cz - hh + R; z < cz + hh - R - 1; z += step) {
      addSeg(cx - hw, z, cx - hw, Math.min(z + step, cz + hh - R))
    }
    for (let x = cx - hw + R; x < cx + hw - R - 1; x += step) {
      addSeg(x, cz - hh, Math.min(x + step, cx + hw - R), cz - hh)
    }
    for (let x = cx - hw + R; x < cx + hw - R - 1; x += step) {
      addSeg(x, cz + hh, Math.min(x + step, cx + hw - R), cz + hh)
    }
    // arcs (chords of ~3m)
    const arc = (acx: number, acz: number, a0: number, a1: number) => {
      const chords = Math.max(3, Math.floor((R * Math.abs(a1 - a0)) / 2))
      for (let i = 0; i < chords; i++) {
        const a = a0 + ((a1 - a0) * i) / chords
        const b = a0 + ((a1 - a0) * (i + 1)) / chords
        addSeg(acx + R * Math.cos(a), acz + R * Math.sin(a), acx + R * Math.cos(b), acz + R * Math.sin(b))
      }
    }
    arc(cx + hw - R, cz + hh - R, 0, Math.PI / 2)
    arc(cx - hw + R, cz + hh - R, Math.PI / 2, Math.PI)
    arc(cx - hw + R, cz - hh + R, Math.PI, (Math.PI * 3) / 2)
    arc(cx + hw - R, cz - hh + R, (Math.PI * 3) / 2, Math.PI * 2)
    // start line at south straight (z = cz+hh) x = cx-4..cx+4
    const sz = cz + hh
    this.checkpoint('rc_start', [cx, 0, sz + 2.6], ORANGE)
    this.finishGate('rc_fin', [cx - 3, 0, sz + 2.6], GREEN)
    this.tile('rc_grid', [cx + 3.4, 0.02, sz], [3, 0.05, 2.4], '#7b8698', ['raceGrid'])
    this.w.createVehicle({ kind: 'car', name: 'racer', pos: [cx + 4.6, 0.5, sz + 1.8], color: '#ff5b4d', cruise: false, speed: 15 })
    this.obj('sign', 'rc_sign', [cx, 1.6, sz + 6.6], [5, 2.6, 0.3], '#3f4a5c')
    return this.done(label, 'racing track', 'An asphalt loop south of spawn with a shiny red car waiting.', 'Press E on the car to drive. Touch the orange start pole, complete one full lap, then cross the green gate!', 'finish', [cx, 0, sz])
  }

  // --------------------------------------------------------------- bowling
  private bowling(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const x0 = this.lx(lane, 4)
    const laneLen = 20
    const midX = this.lx(lane, 10)
    this.tile('bl_floor', [midX, 0.04, z], [laneLen + 3, 0.08, 5.4], '#c98a4b')
    this.obj('gutter', 'bl_g1', [midX, 0.07, z - 3], [laneLen + 3, 0.14, 0.7], '#7d4f22')
    this.obj('gutter', 'bl_g2', [midX, 0.07, z + 3], [laneLen + 3, 0.14, 0.7], '#7d4f22')
    // pins at the far end (3-2-1)
    const pinX = this.lx(lane, 17)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col <= row; col++) {
        this.w.createObject({
          kind: 'pin', name: `pin_${row}_${col}`, shape: 'dumbbell', pos: [pinX - dir * row * 1.4, 0.62, z - 1.4 + col * 1.4],
          scale: [1.2, 1.3, 1.2], color: '#f2f6fb', category: 'prop', tags: ['pin'], body: 'dynamic',
        })
      }
    }
    // ball rack at near end
    this.obj('rack', 'bl_rack', [x0 - dir * 3.5, 1.4, z], [2.6, 1.6, 1.2], '#8b5a2b', { category: 'prop', interact: 'bowl' })
    this.w.createObject({
      kind: 'ball', name: 'bl_ball', shape: 'sphere', pos: [x0 - dir * 3.5, 1, z + 1.7], scale: 0.62,
      color: '#d23b57', category: 'prop', tags: ['ball'],
    })
    return this.done(label, 'bowling alley', 'A wooden lane with 6 pins waiting at the far end.', 'Press E on the brown rack to roll a ball. Knock down ALL the pins!', 'pins', [x0, 0, z])
  }

  // -------------------------------------------------------------- shooting
  private shooting(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const x0 = this.lx(lane, 4)
    for (let i = 0; i < 6; i++) {
      const tx = this.lx(lane, 10 + i * 3.4)
      const tz = z + (i % 2 === 0 ? -2.8 : 2.8)
      const ty = 1.7 + (i % 3) * 1.5
      this.obj('post', `tg_post${i}`, [tx, 1, tz], [0.24, 2, 0.24], '#6b7280')
      this.w.createObject({
        kind: 'target', name: `target_${i}`, shape: 'sphere', pos: [tx, ty, tz], scale: 0.4,
        color: RED, emissive: RED, emissiveIntensity: 1.4, category: 'prop', tags: ['target'], body: 'kinematic',
      })
    }
    this.obj('console', 'tg_rack', [this.lx(lane, 3), 1.6, z], [3, 2.2, 1.4], '#3f4a5c', {
      category: 'prop', emissive: GREEN, emissiveIntensity: 0.3, tags: ['shooting'], interact: 'shoot',
    })
    return this.done(label, 'target gallery', 'Six glowing targets float above the ground.', 'Press E on the glowing console to load your cannon. Look at a target, press E again to FIRE. Hit all 6!', 'targets', [this.lx(lane, 15), 2, z])
  }

  // -------------------------------------------------------------- redlight
  private redLight(label: string): SceneInfo {
    const cx = -4
    const cz = -30
    const half = 13
    for (let i = 0; i < 5; i++) {
      this.tile(`rl_seg${i}`, [cx, 0.02, cz - 2 * i], [9, 0.05, 4], i % 2 ? '#e3eaf3' : '#c9d6e4', i === 0 ? ['startZone'] : undefined)
    }
    // giant lamp posts at each end
    const lampAt = (x: number, zz: number, color: string) => {
      this.obj('pole', 'rl_pole', [x, 3.4, zz], [0.4, 6.8, 0.4], '#4a4a52')
      this.w.createObject({
        kind: 'lamp', name: 'rl_lamp', pos: [x, 7.2, zz], shape: 'sphere', scale: 0.7,
        color, emissive: color, emissiveIntensity: 2.6, category: 'prop', tags: ['rl_light'], body: 'kinematic',
      })
    }
    lampAt(cx, cz + half + 4, RED)
    lampAt(cx, cz - half - 4, RED)
    // the far line: touch it and the course is yours (lights turn green by
    // the engine's red-light cycle — timing is everything)
    this.tile('rl_fin', [cx, 0.02, cz - half - 1], [9, 0.05, 4], GREEN, ['finish'])
    // glowing arrow toward the far line (the field lies south of spawn)
    this.w.createObject({
      kind: 'arrow', shape: 'cone', name: 'rl_arrow', pos: [cx, 3, cz + 4],
      rot: [-Math.PI / 2, 0, 0], scale: [1, 1.8, 1], color: BLUE, emissive: BLUE,
      emissiveIntensity: 1.4, category: 'prop', body: 'kinematic', solid: false,
    })
    this.w.createNPC({ kind: 'guard', name: 'the warden', pos: [cx + 4, 1.2, cz + half + 7], color: '#3f7fd6', hostile: false, wander: false, chat: ['...i see you.', 'green means GO. red means FREEZE.', 'i have been waiting all day for someone to try me.'] })
    return this.done(label, 'red light green light', 'A floodlit field with a very serious guard.', 'Start at the glowing line. When the lights are GREEN you may run. When they turn RED — freeze. Reach the far side!', 'finish', [cx, 0, cz])
  }

  // ----------------------------------------------------------------- dodge
  private dodge(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    for (let i = 0; i < 13; i++) {
      this.tile(`dg_t${i}`, [this.lx(lane, 4 + i * 3), 0.02, z], [3, 0.05, 7], i % 2 ? '#6a7694' : '#5a6684', i === 0 ? ['startZone'] : undefined)
    }
    this.finishGate('dg_fin', [this.lx(lane, 42), 0, z])
    for (let i = 0; i < 5; i++) {
      this.w.createObject({
        kind: 'faller', name: `dg_ball_${i}`, shape: 'sphere', pos: [this.lx(lane, 7 + i * 7.5), 15, z + (i % 2 ? 2 : -2)],
        scale: 1.1, color: '#d23b57', emissive: '#ff6a6a', emissiveIntensity: 0.4, category: 'prop',
        tags: ['fallball'], body: 'kinematic', solid: true,
      })
    }
    this.obj('sign', 'dg_sign', [this.lx(lane, 0), 1.8, z + 4.6], [4, 2.6, 0.3], '#3f4a5c', { category: 'block', emissive: ORANGE, emissiveIntensity: 0.4 })
    return this.done(label, 'dodge alley', 'A narrow alley between glowing walls. Something heavy is falling from above.', 'Run to the green gate. Do NOT get squashed by the big red balls!', 'finish', [this.lx(lane, 22), 0, z])
  }

  // -------------------------------------------------------------- speedrun
  private speedrun(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const startX = this.lx(lane, 2)
    this.tile('sr_start', [startX, 0.02, z], [5, 0.05, 6], '#3f9dff', ['startZone'])
    for (let i = 1; i <= 8; i++) {
      const x = this.lx(lane, 6 + i * 4.6)
      this.w.createObject({
        kind: 'ring', name: `sr_gate${i}`, shape: 'torus', pos: [x, 2.8, z], scale: 2, rot: [Math.PI / 2, 0, 0],
        color: i === 8 ? GREEN : YELLOW, emissive: i === 8 ? GREEN : YELLOW, emissiveIntensity: 1.2,
        category: 'prop', tags: ['checkpoint'], body: 'kinematic', solid: false,
      })
    }
    this.finishGate('sr_fin', [this.lx(lane, 44), 0, z])
    return this.done(label, 'speedrun gates', 'Eight floating rings in a dead-straight sprint.', 'Sprint through every ring, then slam the green gate. I will be judging your pace. Casually.', 'finish', [this.lx(lane, 24), 0, z])
  }

  // --------------------------------------------------------------- guardRun
  private guardRun(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    for (let i = 0; i < 12; i++) {
      const x = this.lx(lane, 5 + i * 3.4)
      const side = i % 2 === 0 ? -1 : 1
      this.obj('crate', `gr_b${i}`, [x, 1.5, z + side * 3.3], [2.2, 3, 2.6], '#b06a48')
      if (i % 2 === 0) this.gem(`gr_g${i}`, [x, 3.4, z - side * 2.6])
    }
    this.w.createNPC({
      kind: 'guard', name: 'the patrol', pos: [this.lx(lane, 12), 1.4, z], color: '#ff6b4a',
      hostile: true, damage: 1, speed: 4,
      waypoints: [
        [this.lx(lane, 18), 1.4, z],
        [this.lx(lane, 8), 1.4, z],
      ],
    })
    this.finishGate('gr_fin', [this.lx(lane, 44), 0, z])
    return this.done(label, 'guard corridor', 'A crate maze patrolled by a very angry red guard.', 'Sneak through, grab coins, reach the gate. The patrol HURTS. You can jump over crates!', 'finish', [this.lx(lane, 20), 0, z])
  }

  // ----------------------------------------------------------------- maze
  private maze(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const walls = 7
    for (let i = 0; i < walls; i++) {
      const x = this.lx(lane, 6 + i * 5.4)
      const gapA = z - 5 + ((i * 2) % 3) * 3.4
      const gapB = z + 1.6 - ((i % 2) * 4.6)
      // wall spans z-6.4..z+6.4 minus two gaps of ~1.9
      const segs: [number, number][] = []
      const start = z - 6.4
      const end = z + 6.4
      const cuts = [gapA - 1, gapA + 1, gapB - 1, gapB + 1].filter((c) => c > start + 0.6 && c < end - 0.6).sort((a, b) => a - b)
      let cursor = start
      for (const c of cuts) {
        if (c - cursor > 1.2) segs.push([cursor, c])
        cursor = c
      }
      if (end - cursor > 1.2) segs.push([cursor, end])
      const hue = this.pick(DYES)
      for (const [a, b] of segs) {
        const mid = (a + b) / 2
        const len = Math.abs(b - a)
        this.obj('mwall', `mz_w${i}_${Math.round(a)}`, [x, 1.5, mid], [0.9, 3, len], hue)
      }
      if (i % 2 === 0 && i < walls - 1) this.checkpoint(`mz_cp${i}`, [x, 0, z], GREEN)
      if (i < walls - 1) this.gem(`mz_g${i}`, [x + dir * 2.6, 1.4, z + (i % 2 ? -4 : 4.2)])
    }
    this.tile('mz_start', [this.lx(lane, 2), 0.02, z], [4.4, 0.05, 13], BLUE, ['startZone'])
    this.arrow(this.lx(lane, 4), z, dir, BLUE)
    const finX = this.lx(lane, 44)
    this.finishGate('mz_fin', [finX, 0, z], GREEN)
    return this.done(label, 'the maze', 'A winding corridor maze with high walls.', 'Follow the gems, thread the gaps, reach the green gate. The walls are taller than you — no shortcuts.', 'finish', [this.lx(lane, 22), 0, z])
  }

  // --------------------------------------------------------------- plaza
  private plaza(label: string): SceneInfo {
    const cx = -6
    const cz = -34
    this.tile('pl_floor', [cx, 0.02, cz], [13, 0.05, 13], '#e7d7c2')
    this.obj('back', 'pl_wall', [cx, 2.2, cz - 6.5], [13, 4.4, 0.6], '#d8c7b4')
    this.obj('stage', 'pl_stage', [cx, 0.9, cz - 2.6], [8, 1.8, 4], '#c9a06a')
    this.obj('lamp', 'pl_l1', [cx - 5.4, 1.8, cz - 6.2], [0.35, 3.6, 0.35], '#8b8f9c')
    this.obj('lamp', 'pl_l2', [cx + 5.4, 1.8, cz - 6.2], [0.35, 3.6, 0.35], '#8b8f9c')
    this.w.setLight({ id: 'plaza', type: 'point', pos: [cx, 5.4, cz - 6], color: '#ffc46b', intensity: 16 })
    this.w.createNPC({ kind: 'kid', name: 'Miko', pos: [cx - 3.4, 1, cz], color: '#ffb1c8', wander: true, speed: 2.2, chat: ['hi!! welcome to my plaza', 'the big head built this whole place, obviously', 'bet you cant jump on the stage from the lamp'] })
    this.w.createNPC({ kind: 'walker', name: 'Dex', pos: [cx + 4, 1, cz + 1.6], color: '#8fd0ff', wander: true, speed: 1.7, chat: ['fresh wood smell. nice.', 'dont feed the creator. it eats ideas.'] })
    return this.done(label, 'hangout plaza', 'A warm plaza with a stage, lamps and two chatty locals.', 'Hang out, talk to Miko and Dex, jump on the stage. Low-pressure vibes.', 'none', [cx, 0, cz])
  }

  // ---------------------------------------------------------------- farm
  private farm(label: string): SceneInfo {
    const cx = 26
    const cz = -24
    const post = (n: string, x: number, z: number) => this.obj('fence', n, [cx + x, 1.1, cz + z], [0.35, 1.7, 0.35], '#a9743f')
    for (let i = -2; i <= 2; i++) {
      post(`f_a${i}`, i * 4, -10.5)
      post(`f_b${i}`, i * 4, 10.5)
      post(`f_c${i}`, -10.5, i * 4)
      post(`f_d${i}`, 10.5, i * 4)
    }
    for (let i = -1; i <= 1; i++) {
      this.obj('rail', 'rail', [cx + i * 8, 1.9, cz - 10.5], [0.3, 0.2, 22], '#a9743f')
      this.obj('rail', 'rail', [cx + i * 8, 1.9, cz + 10.5], [0.3, 0.2, 22], '#a9743f')
    }
    this.obj('barn', 'farm_barn', [cx - 7, 2.4, cz], [7, 4.8, 5.4], '#d05c4e')
    this.w.createObject({
      kind: 'roof', name: 'farm_roof', shape: 'cone', pos: [cx - 7, 4.4, cz], scale: [7.4, 2.6, 6.2],
      color: '#8a3b30', category: 'block',
    })
    for (let i = 0; i < 4; i++) {
      this.w.createNPC({ kind: 'cow', name: `Bessie ${i + 1}`, pos: [cx + (i % 2 ? -2 : 2) * 2.6, 1.1, cz + (i < 2 ? -5 : 5)], color: i % 2 ? '#f4efe6' : '#3b342c', wander: true, speed: 1.2, chat: i === 2 ? ['moo.', 'moo moo.', 'I am Bessie 3 and I bite.'] : ['moo'] })
    }
    this.w.createNPC({ kind: 'walker', name: 'farmer Jo', pos: [cx, 1, cz + 14], color: '#8a6b3f', wander: true, speed: 1.5, chat: ['all mine. every blade.', 'the head built the barn in one blink. I was here. I saw it.', 'watch out for Bessie 3. she bites.'] })
    return this.done(label, 'the farm', 'A red barn, a fenced paddock and four cows.', 'Meet the cows. Pet one if you dare. Bessie 3 has opinions.', 'none', [cx, 0, cz])
  }

  // ------------------------------------------------------------ graveyard
  private graveyard(label: string): SceneInfo {
    const cx = -30
    const cz = 30
    this.w.modifyWorld({ sky: '#141c38' })
    this.w.setLight({ id: 'moon', type: 'point', pos: [cx, 14, cz], color: '#aac4ff', intensity: 12 })
    for (let i = 0; i < 6; i++) {
      const gx = cx + (i % 2 ? -1 : 1) * (2 + Math.floor(i / 2) * 2.6)
      const gz = cz + ((i % 3) - 1) * 3.6
      this.obj('grave', `gy_${i}`, [gx, 0.85, gz], [0.9, 1.7, 0.25], '#8891a3', { rot: [0.05, (i % 3) * 0.4, 0] })
      if (i % 2 === 0) this.gem(`gy_g${i}`, [gx, 2.2, gz], '#8fd0ff')
    }
    this.obj('tree', 'gy_tree', [cx + 8, 0, cz - 8], 1, '#2b4030', { category: 'decoration' })
    this.w.createNPC({ kind: 'ghost', name: 'Edgar', pos: [cx + 2, 2.6, cz + 1], color: '#bfe6ff', wander: true, speed: 1.4, chat: ['boo', 'I am Edgar. I haunt. it is a living.', 'the head forgot me here three projects ago and now I just stay. do not tell it I said anything.'] })
    return this.done(label, 'the graveyard', 'A moonlit graveyard with a very polite ghost.', 'Find the three soul gems. Be nice to Edgar.', 'none', [cx, 0, cz])
  }

  // --------------------------------------------------------------- house
  private house(label: string): SceneInfo {
    const cx = -22
    const cz = 6
    const s = 4.4
    this.obj('wall', 'hs_n', [cx, 2, cz - s], [9, 4, 0.5], '#e8d5b5')
    this.obj('wall', 'hs_s', [cx, 2, cz + s], [9, 4, 0.5], '#e8d5b5')
    this.obj('wall', 'hs_e', [cx - s, 2, cz], [0.5, 4, s * 2 + 0.5], '#e8d5b5')
    this.obj('wall', 'hs_w', [cx + s, 2, cz], [0.5, 4, s * 2 + 0.5], '#e8d5b5')
    this.w.createObject({
      kind: 'roof', name: 'hs_roof', shape: 'cone', pos: [cx, 4.6, cz], scale: [8.8, 2.8, 7.6],
      color: '#c05a4e', category: 'block', opacity: 1,
    })
    this.obj('door', 'hs_door', [cx + s - 0.1, 1.1, cz + 2.4], [1.6, 2.2, 0.2], '#8b5a2b')
    this.w.createObject({
      kind: 'window', name: 'hs_win', pos: [cx, 2.5, cz - s + 0.05], scale: [1.8, 1.4, 0.1], color: '#ffd98a',
      emissive: '#ffc46b', emissiveIntensity: 1.4, category: 'block', solid: false,
    })
    this.w.createObject({
      kind: 'lamp', name: 'hs_lamp', shape: 'sphere', pos: [cx + 2.8, 2.6, cz + 3.8], scale: 0.5,
      color: '#ffd98a', emissive: '#ffd98a', emissiveIntensity: 2.4, category: 'prop', body: 'kinematic',
    })
    this.obj('tree', 'hs_tree', [cx - 8.4, 0, cz + 6.4], 1, '#3e7d46', { category: 'decoration' })
    this.w.createNPC({ kind: 'walker', name: 'Olly', pos: [cx + 8, 1, cz], color: '#8fd0ff', wander: true, speed: 1.5, chat: ['welcome!! housewarming was last tuesday, you missed the cake', 'the creator made my mailbox crooked on purpose. I know it.', 'door works if you press E on it. probably.'] })
    return this.done(label, 'a little house', 'A cozy house with a glowing window and a neighbor who talks a lot.', 'Go knock (press E on the door).', 'none', [cx, 0, cz])
  }

  // ------------------------------------------------------------ night camp
  private nightCamp(label: string): SceneInfo {
    this.w.changeTime(22.5)
    this.w.modifyWorld({ sky: '#0d1330', fogFar: 300 })
    this.w.setLight({ id: 'moon', type: 'point', pos: [-20, 40, -10], color: '#dfe8ff', intensity: 6 })
    this.w.setLight({ id: 'camp', type: 'point', pos: [0, 2.4, 0], color: '#ffb054', intensity: 20 })
    this.obj('log', 'nc_l1', [0.45, 0.35, 0.3], [1.6, 0.3, 0.3], '#6b4226', { rot: [0, 0.4, 0] })
    this.obj('log', 'nc_l2', [-0.4, 0.35, -0.2], [1.6, 0.3, 0.3], '#6b4226', { rot: [0, -0.3, 0] })
    this.w.createObject({
      kind: 'fire', name: 'nc_ember', shape: 'sphere', pos: [0, 1.1, 0], scale: [0.9, 1.3, 0.9],
      color: '#ff7b2e', emissive: '#ff7b2e', emissiveIntensity: 2.6, category: 'prop', body: 'kinematic', solid: false,
    })
    this.obj('seat', 'nc_s1', [-2.6, 0.55, 1.4], [2.4, 0.5, 0.5], '#7d4f22', { rot: [0, -0.6, 0] })
    this.obj('seat', 'nc_s2', [2.8, 0.55, -1], [2.4, 0.5, 0.5], '#7d4f22', { rot: [0, -0.4, 0] })
    return this.done(label, 'campfire night', 'Night falls early. A campfire crackles at the center of the world.', 'Sit by the fire and watch the stars come out.', 'none', [0, 0, 0])
  }

  // ----------------------------------------------------------------- rain
  private rain(label: string): SceneInfo {
    this.w.changeWeather({ rain: true, intensity: 0.6 })
    this.w.modifyWorld({ sky: '#5a6a7a', fogNear: 60, fogFar: 230 })
    for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]] as const) {
      this.obj('post', 'rn_post', [x, 1.4, z], [0.4, 2.8, 0.4], '#8b5a2b')
    }
    this.w.createObject({
      kind: 'roof', name: 'rn_roof', pos: [0, 3.1, 0], scale: [6.4, 0.4, 6.4], color: '#4a7a5c',
      category: 'block', opacity: 0.9, solid: false,
    })
    this.obj('crate', 'rn_crate', [1.3, 0.55, 1], [1.1, 1.1, 1.1], '#b06a48', { category: 'prop' })
    this.w.createNPC({ kind: 'kid', name: 'pip', pos: [-0.4, 1, 0.6], color: '#ffd98a', wander: false, speed: 1, chat: ['the head made it rain because the grass looked thirsty', 'I am hiding from the drip', 'you can stand under here too I guess'] })
    return this.done(label, 'rain shelter', 'Rain pours over everything. A little shelter popped up near spawn.', 'Stay dry with pip, or go dance in the rain. Your call.', 'none', [0, 0, 0])
  }

  // -------------------------------------------------------------- generic
  private generic(label: string): SceneInfo {
    const lane = this.lane()
    const z = lane.z0
    const dir = lane.dir
    const x0 = this.lx(lane, 6)
    const hue = this.pick(DYES)
    this.obj('arch', 'gn_a1', [x0 + dir * 2, 2.2, z - 3], [0.6, 4.4, 0.6], '#a06bff', { emissive: '#a06bff', emissiveIntensity: 0.4 })
    this.obj('arch', 'gn_a2', [x0 + dir * 2, 2.2, z + 3], [0.6, 4.4, 0.6], '#a06bff', { emissive: '#a06bff', emissiveIntensity: 0.4 })
    this.obj('beam', 'gn_beam', [x0 + dir * 2, 4.5, z], [6.6, 0.6, 0.6], '#a06bff', { emissive: '#a06bff', emissiveIntensity: 1 })
    for (let i = 0; i < 4; i++) {
      this.gem(`gn_g${i}`, [x0 + dir * 2, 1.4 + (i % 2), z - 2 + i * 1.3], i === 0 ? hue : YELLOW)
    }
    this.obj('block', 'gn_b1', [x0 + dir * 4, 0.9, z], [2, 1.8, 2], hue)
    this.tile('gn_t', [x0 + dir * 5.6, 0.02, z], [2.6, 0.05, 2.6], hue, ['finish'])
    return this.done(label, label, `A little something materialized to the ${dir === 1 ? 'east' : 'west'} — I call it "${label}".`, 'Go look at it. Walk through the colored block.', 'none', [x0, 0, z])
  }
}
