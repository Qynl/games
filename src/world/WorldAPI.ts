// WorldAPI — the ONLY way the AI (or its generated code) can touch the
// world. Every mutator validates its input, applies the change to the world
// state and then tells the scene to rebuild. Everything here is pure data —
// no DOM, no network, no browser APIs, no player-state shortcuts.

import type {
  Category,
  HistoryEntry,
  LightState,
  LightType,
  MatRef,
  ObjectFilter,
  PhysicsBody,
  PlayerAction,
  PlayerState,
  QueryType,
  Shape,
  SkyConfig,
  TerrainConfig,
  VehicleConfig,
  WorldObjectState,
} from '../types'
import { clamp, dist2d, dist3, uid, vecLen } from '../utils/helpers'

export type BuildCb = () => void

export const MAX_OBJECTS = 260
const MAX_NPCS = 16
const MAX_VEHICLES = 8
const MAX_BOX_VOLUME = 60000

function sanitize(v: number, fallback: number, min = -10000, max = 10000): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return clamp(v, min, max)
}

function v3(a: unknown, d: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (Array.isArray(a) && a.length >= 3) {
    return [
      sanitize(Number(a[0]), d[0]),
      sanitize(Number(a[1]), d[1]),
      sanitize(Number(a[2]), d[2]),
    ]
  }
  return [...d]
}

function colorOf(c: unknown, fallback: string): string {
  if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) return c
  if (typeof c === 'string' && /^#[0-9a-fA-F]{3}$/.test(c)) {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
  }
  return fallback
}

export class WorldAPI {
  // ---- read-only world data (mutated internally) -------------------------
  objects: WorldObjectState[] = []
  lights: LightState[] = []
  npcs: WorldObjectState[] = []
  vehicles: WorldObjectState[] = []
  zones: WorldObjectState[] = []
  sky: SkyConfig = { color: '#8ecbf5', fogColor: '#bcd9ee', fogNear: 120, fogFar: 420 }
  weather = { rain: false, intensity: 0.5 }
  timeOfDay = 12
  timeScale = 1
  dayLength = 300
  terrain: TerrainConfig | null = null
  /** terrain height function set when terrain exists */
  groundHeight: (x: number, z: number) => number = () => 0
  goals: { text: string; done: boolean }[] = []
  name = 'baseplate'
  scripts: { id: string; name: string; code: string; created: number }[] = []
  /** script name that adds interaction logic, if any */
  activeScript: string | null = null

  // ---- internal services (injected by GameEngine) -------------------------
  onBuild: BuildCb = () => {}
  onHistory: (e: HistoryEntry) => void = () => {}
  onLog: (text: string, level: 'info' | 'ok' | 'warn' | 'error' | 'ai') => void = () => {}

  /** apply changes made by the AI in one batch */
  commit(label: string) {
    this.onHistory({ at: Date.now(), from: 'ai', text: label })
    this.onBuild()
  }

  private freshId(prefix: string, list: WorldObjectState[]): string {
    let id = uid(prefix)
    let guard = 0
    while (list.some((o) => o.id === id) && guard++ < 50) id = uid(prefix)
    return id
  }

  // =========================== OBJECTS ====================================
  private validateBody(body: unknown): PhysicsBody {
    return body === 'dynamic' || body === 'kinematic' ? body : 'static'
  }

  createObject(opts: {
    kind?: string
    shape?: Shape
    name?: string
    pos?: [number, number, number]
    scale?: [number, number, number] | number
    rot?: [number, number, number]
    color?: string
    emissive?: string
    emissiveIntensity?: number
    physics?: PhysicsBody
    category?: Category
    body?: PhysicsBody
    opacity?: number
    solid?: boolean
    visible?: boolean
    tags?: string[]
    roughness?: number
    metalness?: number
    interact?: string
  }): WorldObjectState {
    if (this.objects.length >= MAX_OBJECTS) {
      this.onLog('object cap reached', 'warn')
      throw new Error('object cap reached')
    }
    const shape = opts.shape ?? 'box'
    let scale: [number, number, number] = [1, 1, 1]
    if (typeof opts.scale === 'number') {
      scale = [opts.scale, opts.scale, opts.scale]
    } else if (Array.isArray(opts.scale)) {
      scale = v3(opts.scale)
    } else if (opts.shape === 'sphere' && !opts.scale) {
      scale = [0.5, 0.5, 0.5]
    }
    const body = this.validateBody(opts.body ?? opts.physics)
    const sx = sanitize(scale[0], 1, 0.05, 120)
    const sy = sanitize(scale[1], 1, 0.05, 120)
    const sz = sanitize(scale[2], 1, 0.05, 120)
    if (Math.abs(sx * sy * sz) > MAX_BOX_VOLUME) {
      this.onLog('object too large', 'warn')
      throw new Error('scale too large')
    }
    const obj: WorldObjectState = {
      id: this.freshId('obj', this.objects),
      kind: opts.kind ?? 'cube',
      category: opts.category ?? 'block',
      name: opts.name ?? 'thing',
      shape,
      pos: v3(opts.pos, [0, 3, 0]),
      rot: v3(opts.rot),
      scale: [sx, sy, sz],
      color: colorOf(opts.color, '#7fa1c4'),
      emissive: colorOf(opts.emissive, '#000000'),
      emissiveIntensity: sanitize(opts.emissiveIntensity ?? 0, 0, 0, 30),
      body,
      visible: opts.visible ?? true,
      solid: opts.solid ?? body !== 'dynamic',
      opacity: opts.opacity === undefined ? undefined : clamp(sanitize(opts.opacity, 1), 0.05, 1),
      roughness: opts.roughness,
      metalness: opts.metalness,
      tags: opts.tags?.length ? [...opts.tags] : undefined,
      interact: opts.interact,
    }
    this.objects.push(obj)
    return obj
  }

  deleteObject(idOrName: string): boolean {
    const target = this.find(idOrName)
    if (!target) return false
    this.objects = this.objects.filter((o) => o.id !== target.id)
    this.npcs = this.npcs.filter((o) => o.id !== target.id)
    this.vehicles = this.vehicles.filter((o) => o.id !== target.id)
    this.zones = this.zones.filter((o) => o.id !== target.id)
    return true
  }

  find(idOrName: string): WorldObjectState | null {
    const n = String(idOrName).toLowerCase()
    return (
      this.objects.find((o) => o.id === idOrName || o.name.toLowerCase() === n) ??
      null
    )
  }

  moveObject(idOrName: string, pos: [number, number, number], yOffset?: number): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    const p = v3(pos)
    if (o.body === 'dynamic') o.body = 'kinematic'
    o.pos = p
    return o
  }

  rotateObject(idOrName: string, rot: [number, number, number]): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    o.rot = v3(rot)
    return o
  }

  scaleObject(idOrName: string, s: number | [number, number, number]): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    if (typeof s === 'number') o.scale = [s, s, s]
    else o.scale = v3(s)
    return o
  }

  paintObject(idOrName: string, color: string): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    o.color = colorOf(color, o.color ?? '#7fa1c4')
    return o
  }

  physicsBody(idOrName: string, body: PhysicsBody): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    o.body = body === 'dynamic' ? 'dynamic' : body === 'kinematic' ? 'kinematic' : 'static'
    o.solid = o.body !== 'dynamic'
    return o
  }

  material(idOrName: string, m: MatRef): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    if (m.color) o.color = colorOf(m.color, o.color ?? '#7fa1c4')
    if (m.emissive) o.emissive = colorOf(m.emissive, o.emissive ?? '#000000')
    if (typeof m.emissiveIntensity === 'number') o.emissiveIntensity = clamp(sanitize(m.emissiveIntensity, 0), 0, 30)
    if (typeof m.roughness === 'number') o.roughness = clamp(sanitize(m.roughness, 0.8), 0, 1)
    if (typeof m.metalness === 'number') o.metalness = clamp(sanitize(m.metalness, 0), 0, 1)
    if (m.transparent) {
      o.opacity = typeof m.opacity === 'number' ? clamp(sanitize(m.opacity, 0.6), 0.05, 1) : 0.6
    }
    return o
  }

  cloneObject(idOrName: string): WorldObjectState | null {
    const o = this.find(idOrName)
    if (!o) return null
    if (this.objects.length >= MAX_OBJECTS) return null
    const c: WorldObjectState = JSON.parse(JSON.stringify(o))
    c.id = uid('obj')
    c.name = o.name + '_copy'
    c.pos = [c.pos[0] + 1.5, c.pos[1], c.pos[2] + 1.5]
    this.objects.push(c)
    return c
  }

  getObject(idOrName: string): Record<string, unknown> | null {
    const o = this.find(idOrName)
    if (!o) return null
    return {
      id: o.id,
      name: o.name,
      kind: o.kind,
      category: o.category,
      shape: o.shape,
      pos: o.pos,
      rot: o.rot,
      scale: o.scale,
      color: o.color,
      physics: o.body,
    }
  }

  findObjectsNear(pos: [number, number, number], radius: number, filter?: ObjectFilter): string[] {
    const p = v3(pos)
    const r = sanitize(radius, 10, 0, 300)
    return this.objects
      .filter((o) => {
        if (filter && filter !== 'all') {
          switch (filter) {
            case 'near': break
            case 'obstacles': if (!['block', 'prop'].includes(o.category) || o.body !== 'static') return false; break
            case 'decorations': if (o.category !== 'decoration') return false; break
            case 'collectibles': if (!(o.tags ?? []).includes('collectible')) return false; break
            case 'npc': return false
            case 'vehicles': return false
            case 'terrain': return false
            default: break
          }
        }
        return dist3(p[0], p[1], p[2], o.pos[0], o.pos[1], o.pos[2]) <= r
      })
      .slice(0, 12)
      .map((o) => o.name)
  }

  listObjects(opts?: { filter?: ObjectFilter; count?: number }): string[] {
    const f = opts?.filter ?? 'all'
    const count = sanitize(opts?.count ?? 12, 12, 1, 30)
    let list = [...this.objects]
    if (f === 'newest') list = list.reverse()
    else if (f === 'npc') return this.npcs.slice(-count).map((n) => n.name)
    else if (f === 'vehicles') return this.vehicles.slice(-count).map((n) => n.name)
    else if (f === 'obstacles') list = list.filter((o) => o.category === 'block' || o.category === 'prop')
    else if (f === 'decorations') list = list.filter((o) => o.category === 'decoration')
    else if (f === 'collectibles') list = list.filter((o) => (o.tags ?? []).includes('collectible'))
    else if (f === 'terrain') list = []
    return list.slice(-count).map((o) => o.name)
  }

  countObjects(): number {
    return this.objects.length
  }

  clearObjects(opts?: { except?: string[] }): number {
    const keep = new Set(opts?.except ?? [])
    const keepId = new Set(opts?.except ?? [])
    const isKeep = (o: WorldObjectState) => keep.has(o.name) || keepId.has(o.id)
    const gone = this.objects.filter((o) => !isKeep(o)).length
    this.objects = this.objects.filter(isKeep)
    this.npcs = this.npcs.filter(isKeep)
    this.vehicles = this.vehicles.filter(isKeep)
    this.zones = []
    return gone
  }

  // ============================= ZONES ====================================
  addZone(opts: {
    name?: string
    pos?: [number, number, number]
    size?: [number, number, number]
    color?: string
    data?: Record<string, unknown>
  }): string {
    const zone = this.createObject({
      kind: 'zone',
      shape: 'box',
      name: opts.name ?? 'zone_' + this.zones.length,
      pos: opts.pos ?? [0, 1, 0],
      scale: opts.size ?? [4, 2, 4],
      category: 'zone',
      color: colorOf(opts.color ?? '#ffffff', '#ffffff'),
    })
    zone.visible = false
    zone.solid = false
    zone.body = 'kinematic'
    if (opts.data) (zone as WorldObjectState & { data?: unknown }).data = opts.data
    if (!this.zones.some((z) => z.id === zone.id)) this.zones.push(zone)
    return zone.name
  }

  // ============================== NPCs ====================================
  createNPC(opts: {
    kind?: 'walker' | 'guard' | 'kid' | 'follower' | 'cow' | 'ghost'
    name?: string
    pos?: [number, number, number]
    color?: string
    scale?: number
    waypoints?: [number, number, number][]
    wander?: boolean
    hostile?: boolean
    damage?: number
    follower?: boolean
    speed?: number
    chat?: string[]
  }): WorldObjectState | null {
    if (this.npcs.length >= MAX_NPCS) {
      this.onLog('npc cap reached', 'warn')
      return null
    }
    const obj = this.createObject({
      kind: opts.kind ?? 'walker',
      shape: 'sphere',
      name: opts.name ?? 'npc_' + this.npcs.length,
      pos: opts.pos ?? [4, 1.2, 4],
      scale: 1,
      category: 'npc',
      color: colorOf(opts.color, '#ffb1c8'),
    })
    obj.npc = {
      kind: opts.kind ?? 'walker',
      color: colorOf(opts.color, '#ffb1c8'),
      waypoints: opts.waypoints ? opts.waypoints.map((w) => v3(w)) : [],
      wander: opts.wander ?? true,
      hostile: opts.hostile ?? false,
      follower: opts.follower ?? false,
      damage: opts.hostile ? opts.damage ?? 1 : opts.damage,
      speed: sanitize(opts.speed ?? 2.4, 2.4, 0.2, 30),
      scale: sanitize(opts.scale ?? 1, 1, 0.2, 4),
      chat: opts.chat,
    }
    this.objects.splice(this.objects.indexOf(obj), 1)
    this.npcs.push(obj)
    return obj
  }

  removeNPC(idOrName: string): boolean {
    const n = this.npcs.find((o) => o.id === idOrName || o.name.toLowerCase() === String(idOrName).toLowerCase())
    if (!n) return false
    this.npcs = this.npcs.filter((o) => o.id !== n.id)
    this.objects = this.objects.filter((o) => o.id !== n.id)
    return true
  }

  npcChat(idOrName: string, lines: string[]): boolean {
    const n = this.npcs.find((o) => o.id === idOrName || o.name.toLowerCase() === String(idOrName).toLowerCase())
    if (!n || !n.npc) return false
    n.npc.chat = lines.slice(0, 5)
    return true
  }

  // =========================== VEHICLES ===================================
  createVehicle(opts: {
    kind?: 'car' | 'hover' | 'golf'
    name?: string
    pos?: [number, number, number]
    color?: string
    cruise?: boolean
    speed?: number
    cruiseRadius?: number
  }): WorldObjectState | null {
    if (this.vehicles.length >= MAX_VEHICLES) return null
    const kind = opts.kind ?? 'car'
    const obj = this.createObject({
      kind,
      shape: 'box',
      name: opts.name ?? 'car_' + this.vehicles.length,
      pos: opts.pos ?? [6, 1, 6],
      scale: [2.2, 0.7, 1.1],
      category: 'vehicle',
      color: colorOf(opts.color, '#ff5b4d'),
      physics: 'kinematic',
    })
    obj.vehicle = {
      kind: kind as VehicleConfig['kind'],
      color: colorOf(opts.color, '#ff5b4d'),
      cruise: opts.cruise ?? false,
      speed: sanitize(opts.speed ?? 6, 6, 0.5, 40),
      cruiseRadius: sanitize(opts.cruiseRadius ?? 8, 8, 2, 60),
    }
    this.objects.splice(this.objects.indexOf(obj), 1)
    this.vehicles.push(obj)
    return obj
  }

  removeVehicle(idOrName: string): boolean {
    const v = this.vehicles.find((o) => o.id === idOrName || o.name.toLowerCase() === String(idOrName).toLowerCase())
    if (!v) return false
    this.vehicles = this.vehicles.filter((o) => o.id !== v.id)
    this.objects = this.objects.filter((o) => o.id !== v.id)
    return true
  }

  // ============================ TERRAIN ===================================
  createTerrain(opts?: { size?: number; seed?: number; amplitude?: number; color?: string }): Record<string, unknown> {
    const size = sanitize(opts?.size ?? 160, 160, 40, 500)
    this.terrain = {
      size,
      seed: Math.floor(sanitize(opts?.seed ?? 13, 13, 0, 99999)),
      amplitude: sanitize(opts?.amplitude ?? 3.2, 3.2, 0, 30),
      color: colorOf(opts?.color, '#5f8f4e'),
    }
    return { size, seed: this.terrain.seed, amplitude: this.terrain.amplitude }
  }

  clearTerrain(): boolean {
    const had = this.terrain !== null
    this.terrain = null
    this.groundHeight = () => 0
    return had
  }

  // ============================ WORLD =====================================
  changeTime(hour?: number): Record<string, unknown> {
    if (typeof hour === 'number') {
      this.timeOfDay = clamp(hour, 0, 24)
      this.timeScale = 0
    }
    return { time: this.timeOfDay, timeScale: this.timeScale }
  }

  setDayNightCycle(secondsPerDay: number): void {
    const s = sanitize(secondsPerDay, 300, 30, 3600)
    this.dayLength = s
    if (this.timeScale === 0) this.timeScale = 1
    if (this.timeOfDay === 0) this.timeOfDay = 8.5
  }

  changeWeather(opts?: { rain?: boolean; intensity?: number }): Record<string, unknown> {
    const rain = opts?.rain === undefined ? !this.weather.rain : opts.rain
    this.weather = {
      rain,
      intensity: clamp(sanitize(opts?.intensity ?? 0.6, 0.6, 0.1, 1), 0.1, 1),
    }
    return { ...this.weather }
  }

  modifyWorld(opts: {
    sky?: string
    fogNear?: number
    fogFar?: number
    name?: string
  }): Record<string, unknown> {
    if (opts.sky) this.sky.color = colorOf(opts.sky, this.sky.color)
    if (typeof opts.fogNear === 'number') this.sky.fogNear = sanitize(opts.fogNear, 120, 2, 500)
    if (typeof opts.fogFar === 'number') this.sky.fogFar = sanitize(opts.fogFar, 420, 10, 1000)
    if (opts.name) this.name = String(opts.name).slice(0, 40)
    return {
      sky: this.sky.color,
      fogNear: this.sky.fogNear,
      fogFar: this.sky.fogFar,
      name: this.name,
    }
  }

  setLight(opts: {
    id?: string
    type?: LightType
    pos?: [number, number, number]
    color?: string
    intensity?: number
    target?: [number, number, number]
  }): string {
    const existing = this.lights.find((l) => l.id === (opts.id ?? 'main'))
    if (existing) {
      existing.pos = v3(opts.pos, existing.pos)
      if (opts.color) existing.color = colorOf(opts.color, existing.color)
      if (typeof opts.intensity === 'number') existing.intensity = clamp(sanitize(opts.intensity, 1), 0, 20)
      if (opts.target) existing.target = v3(opts.target)
      return existing.id
    }
    const light: LightState = {
      id: opts.id ?? 'main',
      type: opts.type ?? 'sun',
      pos: v3(opts.pos, [60, 90, 40]),
      color: colorOf(opts.color, '#fff4d6'),
      intensity: clamp(sanitize(opts.intensity ?? 1.4, 1.4, 0, 20), 0, 20),
      target: opts.target ? v3(opts.target) : undefined,
    }
    this.lights.push(light)
    return light.id
  }

  // ==================== GAMEPLAY / OBJECTIVES =============================
  createObjective(text: string): { id: string; text: string } {
    const id = uid('goal')
    const clean = String(text).slice(0, 160)
    this.goals.push({ text: clean, done: false })
    this.onHistory({ at: Date.now(), from: 'system', text: `objective added: ${clean}` })
    return { id, text: clean }
  }

  createEvent(opts: {
    name?: string
    when?: string
    action?: string
  }): Record<string, unknown> {
    const ev = {
      name: String(opts.name ?? 'event_' + this.events.length).slice(0, 40),
      when: String(opts.when ?? 'player enters zone').slice(0, 60),
      action: String(opts.action ?? 'log').slice(0, 120),
    }
    this.events.push(ev)
    return ev
  }

  listEvents(): string[] {
    return this.events.map((e) => `${e.name} (when: ${e.when}; then: ${e.action})`)
  }

  // ======================= SCRIPTING ======================================
  createScript(opts: { name?: string; code: string }): { name: string; ok: boolean; error?: string } {
    const name = String(opts.name ?? 'script_' + (this.scripts.length + 1)).slice(0, 40)
    this.scripts.push({ id: uid('scr'), name, code: String(opts.code), created: Date.now() })
    return { name, ok: true }
  }

  listScripts(): string[] {
    return this.scripts.map((s) => `${s.name} (${s.code.length} chars)`)
  }

  // ============================= MISC =====================================
  status(): Record<string, unknown> {
    return {
      objects: this.objects.length,
      npcs: this.npcs.length,
      vehicles: this.vehicles.length,
      scripts: this.scripts.length,
      events: this.events.length,
      terrain: this.terrain ? 'yes' : 'none',
      weather: this.weather.rain ? `rain ${this.weather.intensity}` : 'clear',
      time: `${Math.floor(this.timeOfDay)}:00`,
      name: this.name,
    }
  }

  // ---- internal readouts for the observation tick ------------------------
  events: { name: string; when: string; action: string }[] = []
  player: PlayerState | null = null
  activeTasks: string[] = []
  recentPlayerActions: PlayerAction[] = []
  lastInteractAt = 0
  lastMessageAt = 0

  /** snapshot compact world state around the player, for observations */
  snapshot(player: PlayerState): Record<string, unknown> {
    this.player = player
    const p = player.pos
    const near = this.objects
      .filter((o) => dist3(p[0], p[1], p[2], o.pos[0], o.pos[1], o.pos[2]) < 34)
      .map((o) => ({ name: o.name, kind: o.kind, d: Math.round(dist3(p[0], p[1], p[2], o.pos[0], o.pos[1], o.pos[2]) * 10) / 10, at: o.pos.map((n) => Math.round(n * 10) / 10) }))
      .slice(0, 24)
    const npcsNear = this.npcs
      .map((o) => ({
        name: o.name,
        kind: o.npc?.kind ?? 'npc',
        d: Math.round(dist3(p[0], p[1], p[2], o.pos[0], o.pos[1], o.pos[2]) * 10) / 10,
        animating: o.npc?.kind === 'walker' || o.npc?.kind === 'guard',
      }))
      .slice(0, 10)
    return {
      objectsNear: near,
      npcsNear,
      npcsTotal: this.npcs.length,
      vehiclesTotal: this.vehicles.length,
      objectCount: this.objects.length,
      player: {
        pos: p.map((n) => Math.round(n * 10) / 10),
        grounded: player.grounded,
        hp: player.hp,
        lives: player.lives,
      },
      terrain: this.terrain ? { size: this.terrain.size, amplitude: this.terrain.amplitude } : null,
      weather: { ...this.weather },
      time: this.timeScale > 0 ? 'cycle running' : `${this.timeOfDay}:00`,
      projectName: this.name,
      sky: this.sky.color,
    }
  }
}

// Re-export helpers used by several modules
export { clamp, dist2d, vecLen }
