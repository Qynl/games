// GameEngine — simulation + rules layer. Owns the WorldAPI instance, the
// player controller, NPC/vehicle updates, dynamic bodies, hazards,
// checkpoints, objectives, events and the camera descriptor.
// No Three.js here: everything is data that the scene layer renders.

import type {
  HistoryEntry, LogLine, PlayerAction, PlayerState, WorldObjectState,
} from '../types'
import { clamp, damp, dist2d, dist3, fmtNum, Simplex1D, vecLen } from '../utils/helpers'
import { aifx } from '../ai/aifx'
import { PlayerController, WALK_SPEED } from './PlayerController'
import { RecipeEngine, type SceneInfo } from './RecipeEngine'
import { WorldAPI } from '../world/WorldAPI'

export interface EngineEvent {
  id: number
  kind:
    | 'damage' | 'fall' | 'death' | 'loseLife' | 'respawn' | 'collect' | 'checkpoint'
    | 'win' | 'objective' | 'hazard' | 'outOfBounds' | 'interact' | 'npcTalk'
    | 'carEnter' | 'carExit' | 'scene' | 'react' | 'script' | 'pin' | 'target' | 'squish'
  text: string
  at: number
}

export interface CameraState {
  mode: 'first' | 'vehicle' | 'dead'
  eye: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  fov: number
  shake: number
}

export interface CourseState extends SceneInfo {
  finished: boolean
}

interface DynBody {
  id: string
  vx: number
  vy: number
  vz: number
  spinX: number
  spinZ: number
  restTime: number
  kind: 'sphere' | 'box' | 'pin'
}

interface Shot {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
}

interface ChatState {
  idx: number
}

export interface GameEngineOpts {
  api?: WorldAPI
  onFeed?: (e: EngineEvent) => void
  onLog?: (l: LogLine) => void
  onHistory?: (h: HistoryEntry) => void
  onBuild?: () => void
  autoPilot?: boolean
}

const SPAWN: [number, number, number] = [0, 1.2, 6]

export class GameEngine {
  api: WorldAPI
  player: PlayerController
  recipes: RecipeEngine
  events: EngineEvent[] = []
  recentActions: PlayerAction[] = []
  history: HistoryEntry[] = []
  logs: LogLine[] = []
  course: CourseState | null = null
  paused = false
  /** when false the player body is frozen (menus/chat open) but world lives */
  playerActive = true
  setPlayerActive(on: boolean) {
    this.playerActive = on
    if (!on) {
      this.player.vel.x = 0
      this.player.vel.y = 0
      this.player.vel.z = 0
    }
  }
  camera: CameraState = { mode: 'first', eye: { x: 0, y: 4, z: 6 }, target: { x: 0, y: 4, z: 20 }, fov: 72, shake: 0 }
  objectivesDone = false
  sceneReadyEmitted = false
  simT = 0

  private colliders: { x: number; y: number; z: number; hx: number; hy: number; hz: number; id: string }[] = []
  private noiseCache = new Map<number, Simplex1D>()
  private terrainKey = ''
  private dyn = new Map<string, DynBody>()
  private shots: Shot[] = []
  private chats = new Map<string, ChatState>()
  private hazardCd = 0
  private deathTimer = -1
  private lastCp: [number, number, number] | null = null
  private lastWin = 0
  private shootCd = 0
  private camSmooth = { x: 0, y: 0, z: 0 }
  private shakeAmt = 0
  private eventId = 0
  private npcTimer = new Map<string, number>()
  private npcWander = new Map<string, [number, number, number]>()
  private autoSpeakAt = new Map<string, number>()
  private camFov = 74
  private fallBall: WorldObjectState | null = null
  private fallBallTimer = 0
  private vehCfg = { heading: 0, speed: 0 }
  private pinsTracked = 0
  private targetsTracked = 0
  private gemsAtCourse = -1
  /** red-light cycle anchor (sim seconds when the course started) */
  private rlOffset = 0
  private spawn: [number, number, number] = SPAWN
  private onFeed?: (e: EngineEvent) => void
  private opts: GameEngineOpts

  constructor(opts: GameEngineOpts = {}) {
    this.opts = opts
    this.api = opts.api ?? new WorldAPI()
    this.onFeed = opts.onFeed
    this.player = new PlayerController({
      onAction: (a) => this.recentActions.push(a),
      onInteractRequest: () => this.tryInteract(),
      onFootstep: () => aifx.step(),
      onJump: () => aifx.jump(),
      onLand: (hard) => this.landed(hard),
    })
    this.recipes = new RecipeEngine(this.api, 1337)
    this.api.onBuild = () => {
      this.rebuild()
      this.opts.onBuild?.()
    }
    this.api.onHistory = (h) => {
      this.history.push(h)
      if (this.history.length > 60) this.history.shift()
      this.opts.onHistory?.(h)
    }
    this.api.onLog = (text, level) => {
      const line: LogLine = { at: Date.now(), text, level }
      this.logs.push(line)
      if (this.logs.length > 80) this.logs.shift()
      this.opts.onLog?.(line)
    }
  }

  // ------------------------------------------------------------- bootstrap
  init() {
    this.api.name = 'baseplate'
    this.api.createObject({
      kind: 'baseplate', name: 'baseplate', shape: 'box', pos: [0, -1, 0],
      scale: [110, 2, 110], color: '#cfdfef', category: 'block',
    })
    this.api.createObject({
      kind: 'spawnpad', name: 'spawnpad', shape: 'cylinder', pos: [0, 0.02, 6],
      scale: [3.4, 0.04, 3.4], color: '#59b7ff', opacity: 0.5, category: 'decoration', body: 'kinematic',
    })
    this.api.lights.push({
      id: 'main', type: 'sun', pos: [60, 90, 40], color: '#fff4d6', intensity: 1.6, target: [0, 0, 0],
    })
    this.player.queueTeleport(this.spawn[0], this.spawn[1], this.spawn[2])
    this.rebuild()
    this.log('world ready', 'ok')
    this.emit('react', "I've been watching you. Go on. Move. Do something. I'll wait.")
  }

  setPaused(p: boolean) {
    this.paused = p
  }

  log(text: string, level: LogLine['level'] = 'info') {
    this.api.onLog(text, level)
  }

  private emit(kind: EngineEvent['kind'], text: string) {
    const e: EngineEvent = { id: ++this.eventId, kind, text, at: performance.now() }
    this.events.push(e)
    this.onFeed?.(e)
  }

  feed(kind: EngineEvent['kind'], text: string) {
    this.emit(kind, text)
  }

  // --------------------------------------------------------------- terrain
  groundHeightAt(x: number, z: number): number {
    const t = this.api.terrain
    if (!t) return 0
    const size = t.size ?? 160
    const amp = t.amplitude ?? 3.2
    const seed = t.seed ?? 0
    const half = size / 2
    if (Math.abs(x) > half || Math.abs(z) > half) return 0
    const key = `${seed}_${size}`
    if (this.terrainKey !== key) {
      this.noiseCache.clear()
      this.terrainKey = key
    }
    let n = this.noiseCache.get(seed)
    if (!n) {
      n = new Simplex1D(seed)
      this.noiseCache.set(seed, n)
    }
    const raw = n.fbm2(x / 58, z / 58, 3)
    let h = (0.5 + 0.5 * raw) * amp * 0.55
    // keep the center (spawn area) flat-ish
    const d = dist2d(x, z, this.spawn[0], this.spawn[2])
    if (d < 16) h *= Math.max(0, d - 6) / 10
    h = Math.max(h, 0)
    return h
  }

  // ---------------------------------------------------------------- world
  rebuild() {
    const list: { x: number; y: number; z: number; hx: number; hy: number; hz: number; id: string }[] = []
    const all = [...this.api.objects, ...this.api.npcs, ...this.api.vehicles]
    for (const o of all) {
      if (o.solid === false) continue
      if (o.category === 'zone' && o.visible === false) continue
      if (o.name === 'spawnpad') continue
      const s = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]
      if (o.shape === 'sphere' || o.shape === 'gem') {
        const r = (s[0] + s[1]) / 2
        if (r <= 0) continue
        list.push({ x: o.pos[0], y: o.pos[1], z: o.pos[2], hx: r, hy: r, hz: r, id: o.id })
      } else {
        list.push({
          x: o.pos[0], y: o.pos[1], z: o.pos[2],
          hx: Math.max(0.001, s[0] / 2), hy: Math.max(0.001, s[1] / 2), hz: Math.max(0.001, s[2] / 2),
          id: o.id,
        })
      }
    }
    this.colliders = list
  }

  colliderBoxes() {
    return this.colliders
  }

  // ------------------------------------------------------------- main loop
  update(dt: number) {
    if (dt <= 0 || dt > 0.1) dt = 0.016
    if (this.paused) return
    this.simT += dt
    // day cycle
    if (this.api.timeScale > 0) {
      this.api.timeOfDay = (this.api.timeOfDay + (dt * 24) / this.api.dayLength) % 24
    }

    this.hazardCd = Math.max(0, this.hazardCd - dt)
    this.shootCd = Math.max(0, this.shootCd - dt)
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8)

    const p = this.player

    // death & respawn flow
    if (!p.alive) {
      this.deathTimer -= dt
      if (this.deathTimer <= 0) {
        const [x, y, z] = this.lastCp ?? this.spawn
        p.respawn(x, y, z)
        this.emit('respawn', 'player respawned')
      }
      this.updateCamera(dt)
      return
    }

    // live player body while locked in menus/chat: keep physics but no input
    const frozen = !this.playerActive

    p.syncWorld({
      terrainHeightAt: (x, z) => this.groundHeightAt(x, z),
      colliders: this.colliders,
      sensitivity: this.sensitivity,
    })

    if (p.inVehicle) {
      this.updateVehicle(dt)
    } else {
      p.update(dt, frozen)
      if (p.outOfBounds) {
        p.outOfBounds = false
        this.emit('outOfBounds', 'the player walked off the edge of the world')
        this.hurt(1, 'fell off the world')
        p.queueTeleport(...(this.lastCp ?? this.spawn))
      }
    }

    this.updateNpcs(dt)
    this.updateVehicles(dt)
    this.updateDynamics(dt)
    this.updateShots(dt)
    this.checkZones()
    this.checkCollectibles()
    this.checkFallBalls(dt)
    this.updateInteractHint()
    this.updateCamera(dt)
  }

  private landed(hard: boolean) {
    if (hard) {
      aifx.thud()
      this.hurt(1, 'fell from too high')
    } else {
      aifx.thud()
    }
  }

  hurt(n: number, cause: string) {
    const died = this.player.damage(n)
    if (died) {
      aifx.hurt()
      this.player.lives -= 1
      this.deathTimer = 1.5
      this.emit('death', `player died: ${cause}`)
      if (this.player.lives < 0) {
        this.player.lives = 3
        this.emit('loseLife', 'the player ran out of lives — world restarted their lives')
        this.log('lives reset', 'warn')
      } else {
        this.emit('loseLife', `player lost a life (${this.player.lives + 1} left)`)
      }
      this.shakeAmt = 0.9
    } else if (n > 0) {
      aifx.hurt()
      this.shakeAmt = 0.5
      this.emit('damage', `player hurt (${cause}), hp ${this.player.hp}`)
    }
  }

  // -------------------------------------------------------------- vehicles
  private attachVehicle(id: string | null) {
    const p = this.player
    p.inVehicle = id
    p.vel.x = 0
    p.vel.y = 0
    p.vel.z = 0
    if (id) {
      this.vehCfg = { heading: p.yaw, speed: 0 }
      aifx.power()
      this.emit('carEnter', 'the player got into a vehicle')
    } else {
      aifx.pop()
      this.emit('carExit', 'the player left the vehicle')
    }
  }

  /** drive the current vehicle from player inputs */
  private updateVehicle(dt: number) {
    const p = this.player
    const veh = this.api.vehicles.find((v) => v.id === p.inVehicle)
    if (!veh) {
      this.attachVehicle(null)
      return
    }
    const cfg = veh.vehicle
    if (!cfg) return
    const maxSpeed = cfg.speed ?? 12
    const keys = p.keysHeld()
    const throttle = keys.has('KeyW') ? 1 : 0
    const brake = keys.has('KeyS') ? 1 : 0
    let steer = 0
    if (keys.has('KeyD')) steer -= 1
    if (keys.has('KeyA')) steer += 1
    // steer toward mouse-look when moving
    const target = this.vehCfg.speed > 1 ? p.yaw : this.vehCfg.heading
    if (Math.abs(this.vehCfg.speed) > 1) {
      // mouse steering dominates, keys fine-tune
      this.vehCfg.heading += steer * 2.4 * dt
      const dh = angleDiff(this.vehCfg.heading, p.yaw)
      this.vehCfg.heading = this.vehCfg.heading - Math.sign(dh) * Math.min(Math.abs(dh), 2.2 * dt * Math.min(1, Math.abs(this.vehCfg.speed) / 6))
      void target
    } else {
      this.vehCfg.heading = p.yaw
    }
    this.vehCfg.speed += (throttle * maxSpeed - brake * maxSpeed * 0.7) * dt * 2.6
    if (throttle === 0 && brake === 0) this.vehCfg.speed *= Math.max(0, 1 - 1.6 * dt)
    this.vehCfg.speed = clamp(this.vehCfg.speed, -maxSpeed * 0.5, maxSpeed)

    const dirX = Math.sin(this.vehCfg.heading)
    const dirZ = Math.cos(this.vehCfg.heading)
    const nextX = veh.pos[0] + dirX * this.vehCfg.speed * dt
    const nextZ = veh.pos[2] + dirZ * this.vehCfg.speed * dt
    if (Math.abs(nextX) < 52 && Math.abs(nextZ) < 52) {
      veh.pos[0] = nextX
      veh.pos[2] = nextZ
    } else {
      this.vehCfg.speed = 0
    }
    veh.pos[1] = this.groundHeightAt(veh.pos[0], veh.pos[2]) + 0.75
    veh.rot = [0, this.vehCfg.heading, 0]
    p.pos.x = veh.pos[0]
    p.pos.z = veh.pos[2]
    p.pos.y = veh.pos[1] - 0.2

    if (keys.has('KeyE') || p.keysHeld().has('KeyF')) {
      this.attachVehicle(null)
      // place the player next to the vehicle
      p.queueTeleport(veh.pos[0] - dirX * 2.6, veh.pos[1], veh.pos[2] - dirZ * 2.6)
      p.swallowInteract()
      return
    }
    // console cleanup: E keydown queued an interact while driving -> swallow it
    p.outOfBounds = false
  }

  private updateVehicles(dt: number) {
    const p = this.player
    for (const v of this.api.vehicles) {
      if (v.id === p.inVehicle) continue
      const cfg = v.vehicle
      if (!cfg) continue
      if (cfg.cruise) {
        // follow a lazy ring around the vehicle's home
        const ring = this.ringFor(v.id, v)
        if (ring) {
          const sp = cfg.speed ?? 5
          v.pos[0] += Math.sin(v.rot[1]) * sp * dt
          v.pos[2] += Math.cos(v.rot[1]) * sp * dt
          // simple waypoint chasing around the ring
          let targetIdx = ring.idx
          const tx = ring.pts[targetIdx][0]
          const tz = ring.pts[targetIdx][2]
          const want = Math.atan2(tx - v.pos[0], tz - v.pos[2])
          v.rot[1] = dampAngle(v.rot[1], want, 2.5, dt)
          if (dist2d(v.pos[0], v.pos[2], tx, tz) < 2.2) ring.idx = (ring.idx + 1) % ring.pts.length
          v.pos[1] = this.groundHeightAt(v.pos[0], v.pos[2]) + 0.75
        }
      }
    }
  }

  private ringCache = new Map<string, { pts: [number, number, number][]; idx: number }>()

  private ringFor(id: string, v: WorldObjectState): { pts: [number, number, number][]; idx: number } | null {
    const cfg = v.vehicle
    if (!cfg) return null
    let ring = this.ringCache.get(id)
    if (!ring) {
      const R = cfg.cruiseRadius ?? 8
      // center such that the vehicle starts on the ring
      const heading = v.rot[1] ?? 0
      const cx = v.pos[0] - Math.sin(heading) * R
      const cz = v.pos[2] - Math.cos(heading) * R
      const pts: [number, number, number][] = []
      const N = 16
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2
        pts.push([cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R])
      }
      ring = { pts, idx: 0 }
      this.ringCache.set(id, ring)
    }
    return ring
  }

  // ------------------------------------------------------------------ npcs
  private updateNpcs(dt: number) {
    const p = this.player
    for (const o of this.api.npcs) {
      const npc = o.npc
      if (!npc) continue
      const now = performance.now()
      let since = this.npcTimer.get(o.id) ?? 0
      since += dt
      this.npcTimer.set(o.id, since)
      const kind = npc.kind
      const groundY = kind === 'ghost' ? o.pos[1] : this.groundHeightAt(o.pos[0], o.pos[2])
      const speed = (npc.speed ?? 2.2) * dt
      const scale = npc.scale ?? 1
      const homeY = kind === 'ghost' ? 2.2 + Math.sin(this.simT * 1.4 + o.pos[0]) * 0.35 : 0.85 * scale

      const moveToward = (tx: number, tz: number) => {
        const d = dist2d(o.pos[0], o.pos[2], tx, tz)
        if (d < 0.4) return false
        const nx = o.pos[0] + ((tx - o.pos[0]) / d) * Math.min(speed, d)
        const nz = o.pos[2] + ((tz - o.pos[2]) / d) * Math.min(speed, d)
        o.pos[0] = clamp(nx, -54, 54)
        o.pos[2] = clamp(nz, -54, 54)
        o.rot[1] = Math.atan2(tx - o.pos[0], tz - o.pos[2])
        return true
      }

      // follow player (follower or any npc when player very close & chatty?)
      const pd = dist3(p.pos.x, p.pos.y, p.pos.z, o.pos[0], o.pos[1], o.pos[2])
      let moving = false
      if (kind === 'guard' && npc.hostile && pd < 11 && p.alive) {
        // chase!
        if (pd < 1.5) {
          this.hurt(npc.damage ?? 1, `${o.name} attacked`)
          this.player.applyImpulse((p.pos.x - o.pos[0]) * 3, 4.5, (p.pos.z - o.pos[2]) * 3)
        } else if (pd < 11) {
          moving = moveToward(p.pos.x + (p.vel.x * 0.5), p.pos.z + (p.vel.z * 0.5))
          // snappy when angry
          o.rot[1] = Math.atan2(p.pos.x - o.pos[0], p.pos.z - o.pos[2])
        }
      } else if (npc.follower && p.alive) {
        // a pet/companion: keeps ~2.6m behind the player, faces them
        if (pd > 4.2) {
          moving = moveToward(p.pos.x - p.vel.x * 0.3, p.pos.z - p.vel.z * 0.3)
        } else if (pd > 3.2) {
          moving = moveToward(p.pos.x, p.pos.z)
        } else if (pd < 1.8) {
          moveToward(o.pos[0] + (o.pos[0] - p.pos.x), o.pos[2] + (o.pos[2] - p.pos.z))
        }
        o.rot[1] = Math.atan2(p.pos.x - o.pos[0], p.pos.z - o.pos[2])
      } else if (npc.waypoints && npc.waypoints.length) {
        const wp = npc.waypoints[o.spawnIndex ?? 0]
        const idx = o.spawnIndex ?? 0
        const target = wp ?? o.pos
        moving = moveToward(target[0], target[2])
        if (!moving || dist2d(o.pos[0], o.pos[2], target[0], target[2]) < 1.2) {
          o.spawnIndex = (idx + 1) % npc.waypoints.length
        }
      } else if (npc.wander) {
        if (since > (kind === 'cow' ? 4 : 3)) {
          const want = this.npcWander.get(o.id)
          if (!want || dist2d(o.pos[0], o.pos[2], want[0], want[2]) < 1) {
            const a = Math.random() * Math.PI * 2
            const r = 2 + Math.random() * 6
            const nx = clamp(o.pos[0] + Math.cos(a) * r, -52, 52)
            const nz = clamp(o.pos[2] + Math.sin(a) * r, -52, 52)
            this.npcWander.set(o.id, [nx, 0, nz])
            this.npcTimer.set(o.id, 0)
          }
          const w = this.npcWander.get(o.id)
          if (w) moving = moveToward(w[0], w[2])
        }
      }
      // avoid walking into the player's face when idle friendly
      if (!moving && !(kind === 'ghost') && pd < 1.1 && !npc.hostile && !npc.follower) {
        moveToward(o.pos[0] + (o.pos[0] - p.pos.x) * 2, o.pos[2] + (o.pos[2] - p.pos.z) * 2)
      }
      o.pos[1] = kind === 'ghost' ? groundY : groundY + homeY

      // occasionally speak unprompted when the player lingers nearby
      if (npc.chat?.length && !npc.hostile && pd < 4.6 && pd > 0.9) {
        const lastAuto = this.autoSpeakAt.get(o.id) ?? -1e9
        if (performance.now() - lastAuto > 15000 && Math.random() < 0.02) {
          this.autoSpeakAt.set(o.id, performance.now())
          this.npcSpeak(o)
        }
      }

      // chatter when the player is near
      if (npc.chat?.length && pd < 5.5) {
        const c = this.chats.get(o.id)
        if (!c) this.chats.set(o.id, { idx: 0 })
      }
      void kind
    }
  }

  /** speak the next line of a nearby npc (via interact) */
  npcSpeak(o: WorldObjectState) {
    const npc = o.npc
    const lines = npc?.chat
    if (!lines || !lines.length) return
    const c = this.chats.get(o.id) ?? { idx: 0 }
    const line = lines[c.idx % lines.length]
    c.idx += 1
    this.chats.set(o.id, c)
    this.emit('npcTalk', `${o.name}: "${line}"`)
  }

  // ------------------------------------------------------------- dynamics
  updateDynamics(dt: number) {
    const g = (x: number, z: number) => this.groundHeightAt(x, z)
    for (const o of this.api.objects) {
      if (o.body !== 'dynamic' && !(o.tags ?? []).includes('fallball') && o.kind !== 'faller') continue
      if (o.tags?.includes('collectible') || o.tags?.includes('checkpoint') || o.tags?.includes('target')) continue
      let d = this.dyn.get(o.id)
      if (!d) {
        d = { id: o.id, vx: 0, vy: 0, vz: 0, spinX: 0, spinZ: 0, restTime: 0, kind: o.shape === 'dumbbell' ? 'pin' : 'sphere' }
        if (o.kind === 'faller') d.vy = 0
        this.dyn.set(o.id, d)
      }
      if (o.kind === 'faller') {
        // hanging up there until the player approaches, then drop
        continue
      }
      const s = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]
      const radius = Math.max(s[0], s[2]) / 2
      const halfH = Math.max(0.2, s[1] / 2)
      d.vy -= 22 * dt
      d.vx *= 1 - Math.min(1, 0.6 * dt)
      d.vz *= 1 - Math.min(1, 0.6 * dt)
      d.spinX *= 1 - Math.min(1, 1.4 * dt)
      d.spinZ *= 1 - Math.min(1, 1.4 * dt)
      const nx = o.pos[0] + d.vx * dt
      const ny = o.pos[1] + d.vy * dt
      const nz = o.pos[2] + d.vz * dt
      o.pos[0] = nx
      o.pos[1] = ny
      o.pos[2] = nz
      const ground = g(nx, nz)
      if (ny - halfH <= ground + 0.02) {
        o.pos[1] = ground + halfH + 0.02
        if (Math.abs(d.vy) > 3) {
          d.vy = -d.vy * 0.35
          d.spinX = (Math.random() - 0.5) * 2
          d.spinZ = (Math.random() - 0.5) * 2
        } else {
          d.vy = 0
          d.restTime += dt
          if (d.restTime > 5) {
            this.dyn.delete(o.id)
            this.api.deleteObject(o.id)
            continue
          }
        }
      } else {
        d.restTime = 0
      }
      // spin (nice for spheres + pins)
      o.rot[0] += d.spinX * dt
      o.rot[2] += d.spinZ * dt
      // walls of the world
      if (Math.abs(o.pos[0]) > 54) {
        o.pos[0] = clamp(o.pos[0], -54, 54)
        d.vx *= -0.3
      }
      if (Math.abs(o.pos[2]) > 54) {
        o.pos[2] = clamp(o.pos[2], -54, 54)
        d.vz *= -0.3
      }
      void radius
    }
  }

  knock(id: string, vx: number, vy: number, vz: number) {
    const d = this.dyn.get(id)
    if (d) {
      d.vx += vx
      d.vy = Math.max(d.vy, vy)
      d.vz += vz
      d.restTime = 0
      d.spinX = (Math.random() - 0.5) * 6
      d.spinZ = (Math.random() - 0.5) * 6
    } else {
      this.dyn.set(id, { id, vx, vy, vz, spinX: (Math.random() - 0.5) * 6, spinZ: (Math.random() - 0.5) * 6, restTime: 0, kind: 'sphere' })
    }
  }

  private updateShots(dt: number) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      s.vy -= 18 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.z += s.vz * dt
      s.life -= dt
      const ground = this.groundHeightAt(s.x, s.z)
      if (s.y < ground + 0.1 || s.life < 0 || Math.abs(s.x) > 55 || Math.abs(s.z) > 55) {
        this.shots.splice(i, 1)
        aifx.pop()
        continue
      }
      // targets!
      for (const t of this.api.objects) {
        if (!(t.tags ?? []).includes('target')) continue
        if (dist3(s.x, s.y, s.z, t.pos[0], t.pos[1], t.pos[2]) < 1.3) {
          this.shots.splice(i, 1)
          aifx.build()
          this.knock(t.id, (s.vx * 0.4), 1, s.vz * 0.4)
          t.tags = (t.tags ?? []).filter((x) => x !== 'target')
          t.visible = false
          this.emit('target', `the player hit a target! ${this.targetsTracked - 1} remaining`)
          this.targetsTracked -= 1
          if (this.targetsTracked <= 0 && this.course?.winMode === 'targets') this.checkWin('targets')
          break
        }
      }
    }
  }

  // ----------------------------------------------------------------- zones
  private checkZones() {
    const p = this.player
    const px = p.pos.x
    const py = p.pos.y
    const pz = p.pos.z
    const onObjs = [...this.api.objects]

    // hazard tiles (lava/red)
    for (const o of onObjs) {
      if (!(o.tags ?? []).includes('hazard')) continue
      const s = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]
      if (Math.abs(px - o.pos[0]) < s[0] / 2 + 0.2 && Math.abs(pz - o.pos[2]) < s[2] / 2 + 0.2 && py < o.pos[1] + s[1] / 2 + 0.9 && this.hazardCd <= 0) {
        this.hazardCd = 0.4
        aifx.hurt()
        this.shakeAmt = 0.6
        this.emit('hazard', 'the player touched a hazard')
        if (this.player.damage(1)) {
          this.player.lives -= 1
          this.deathTimer = 1.4
          this.emit('death', 'player died in a hazard')
          if (this.player.lives < 0) {
            this.player.lives = 3
            this.emit('loseLife', 'lives reset')
          } else this.emit('loseLife', `player lost a life (${this.player.lives + 1} left)`)
        }
        p.queueTeleport(...(this.lastCp ?? this.spawn))
        return
      }
    }

    // checkpoint poles & start zones
    for (const o of onObjs) {
      const tags = o.tags ?? []
      if (!tags.includes('checkpoint') && !tags.includes('startZone')) continue
      const d = dist2d(px, pz, o.pos[0], o.pos[2])
      if (d < 3.4) {
        const cp: [number, number, number] = [o.pos[0], this.groundHeightAt(o.pos[0], o.pos[2]) + 1.2, o.pos[2]]
        if (!this.lastCp || this.lastCp[0] !== cp[0] || this.lastCp[2] !== cp[2]) {
          this.lastCp = cp
          this.emit('checkpoint', `checkpoint reached (${fmtNum(o.pos[0])}, ${fmtNum(o.pos[2])})`)
          aifx.ui()
        }
      }
    }

    // finish zones
    if (this.course && !this.course.finished && performance.now() - this.lastWin > 2000) {
      for (const o of onObjs) {
        const tags = o.tags ?? []
        if (!tags.includes('finish')) continue
        const d = dist3(px, py, pz, o.pos[0], o.pos[1], o.pos[2])
        if (d < 3.4) {
          this.lastWin = performance.now()
          if (this.course.winMode === 'finish') this.checkWin('finish')
          return
        }
      }
    }

    // red light zone (course-specific): lamps alternate green/red on a
    // fixed cycle; running while red sends the player back to the line
    if (this.course?.label.toLowerCase().includes('red light')) {
      const warden = this.api.npcs.find((n) => n.name === 'the warden')
      const lamps = onObjs.filter((o) => (o.tags ?? []).includes('rl_light'))
      // ~2.2s green, ~1.5s red — deterministically from the course start
      const t = (this.simT - this.rlOffset) % 3.7
      const green = t < 2.2
      const lampColor = green ? '#00ff88' : '#ff3b30'
      for (const lamp of lamps) if (lamp.color !== lampColor) lamp.color = lampColor
      const moving = vecLen(p.vel.x, 0, p.vel.z) > 1.5
      const zNearWarden = Math.abs(pz - (warden?.pos[2] ?? -30)) < 2.4
      if (zNearWarden) return
      const inField = Math.abs(px + 4) < 24 && Math.abs(pz + 30) < 16
      if (!inField) return
      if (!green && moving && this.hazardCd <= 0 && lamps.length) {
        this.hazardCd = 1.2
        this.emit('hazard', 'the player got CAUGHT moving on red!!')
        this.emit('react', 'I SAW THAT.')
        aifx.hurt()
        this.player.queueTeleport(-4, 2, -30 + 13 + 6)
      }
    }

    // pin bowling win
    if (this.course?.winMode === 'pins') {
      const upright = onObjs.filter((o) => (o.tags ?? []).includes('pin')).filter((o) => Math.abs(o.rot[0]) + Math.abs(o.rot[2]) < 0.9)
      if (upright.length === 0 && this.pinsTracked > 0) this.checkWin('pins')
      else if (upright.length > 0 && upright.length < this.pinsTracked) {
        // intermediate
      }
    }

    // coin win
    if (this.course?.winMode === 'coins' && this.gemsAtCourse >= 0) {
      const left = onObjs.filter((o) => (o.tags ?? []).includes('collectible')).length
      if (left === 0 && this.gemsAtCourse > 0 && !this.course.finished) this.checkWin('coins')
    }
  }

  private checkWin(mode: string) {
    if (!this.course || this.course.finished) return
    this.course.finished = true
    this.objectivesDone = true
    for (const g of this.api.goals) g.done = true
    aifx.fanfare()
    this.burstConfetti()
    this.emit('win', `PLAYER COMPLETED: ${this.course.title}`)
    this.log(`course complete: ${this.course.title} (${mode})`, 'ok')
    // remove finish tags so we don't retrigger
    for (const o of this.api.objects) {
      if ((o.tags ?? []).includes('finish')) {
        o.tags = (o.tags ?? []).filter((t) => t !== 'finish')
        this.api.deleteObject(o.id)
      }
    }
  }

  /** little celebratory burst of physics confetti over the player */
  private burstConfetti() {
    const p = this.player
    const palette = ['#ffd23f', '#ff5a4e', '#59b7ff', '#7ef0c0', '#ff9fd0', '#b9a7ff']
    let added = 0
    for (let i = 0; i < 26; i++) {
      if (this.api.objects.length >= 220) break
      try {
        const o = this.api.createObject({
          kind: 'confetti',
          shape: 'box',
          name: `confetti_${i}`,
          pos: [p.pos.x, p.pos.y + 1.4 + Math.random() * 1.4, p.pos.z],
          scale: [0.09, 0.05, 0.09],
          color: palette[i % palette.length],
          category: 'prop',
          body: 'dynamic',
          tags: ['confetti'],
        })
        this.knock(o.id, (Math.random() - 0.5) * 9, 4 + Math.random() * 6, (Math.random() - 0.5) * 9)
        added++
      } catch {
        break
      }
    }
    if (added) {
      this.log(`${added} bits of confetti thrown`, 'info')
      this.api.commit('win confetti burst')
    }
  }

  private checkCollectibles() {
    const p = this.player
    for (const o of [...this.api.objects]) {
      const tags = o.tags ?? []
      if (!tags.includes('collectible')) continue
      if (tags.includes('target')) continue
      const d = dist3(p.pos.x, p.pos.y + 0.8, p.pos.z, o.pos[0], o.pos[1], o.pos[2])
      if (d < 1.9) {
        this.api.deleteObject(o.id)
        aifx.collect()
        const left = this.api.objects.filter((x) => (x.tags ?? []).includes('collectible')).length
        this.emit('collect', `the player grabbed a collectible${left ? ` (${left} left)` : ''}`)
      }
    }
  }

  private checkFallBalls(dt: number) {
    const p = this.player
    this.fallBallTimer -= dt
    for (const o of this.api.objects) {
      if (o.kind !== 'faller') continue
      const dropX = Math.abs(o.pos[0] - p.pos.x) < 4
      const high = o.pos[1] > 4
      if (dropX && high && this.fallBallTimer <= 0) {
        // start falling
        const d = this.dyn.get(o.id)
        if (d) d.vy = 0
        this.dyn.set(o.id, { id: o.id, vx: 0, vy: -2, vz: 0, spinX: 0, spinZ: 0, restTime: 0, kind: 'sphere' })
        this.fallBallTimer = 1.1
        aifx.whoosh()
        continue
      }
      if (o.pos[1] < 1.4 && this.dyn.has(o.id) && !this.dyn.get(o.id)?.vy) {
        // near the floor — squash check done at zone overlap below; recycle
        void 0
      }
    }
    // squash detection
    for (const o of this.api.objects) {
      if (o.kind !== 'faller') continue
      if (dist2d(o.pos[0], o.pos[2], p.pos.x, p.pos.z) < 1.5 && Math.abs(o.pos[1] - (p.pos.y + 0.8)) < 1.6) {
        this.emit('squish', 'the player almost got squished!')
        this.hurt(1, 'squashed by a falling ball')
        this.player.applyImpulse(0, 8, 0)
      }
    }
  }

  // ------------------------------------------------------------- interact
  tryInteract() {
    const p = this.player
    if (p.inVehicle) {
      // E while driving: hop out (handled in updateVehicle too)
      return
    }
    const eye = p.eyePos()
    const dir = p.viewDir()
    const all = [...this.api.objects, ...this.api.npcs, ...this.api.vehicles]
    let best: WorldObjectState | null = null
    let bestD = 3.6
    for (const o of all) {
      const dx = o.pos[0] - eye.x
      const dy = (o.pos[1] + 0.9) - eye.y
      const dz = o.pos[2] - eye.z
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (d > bestD) continue
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d
      if (dot < 0.35) continue
      const tags = o.tags ?? []
      if (o.npc || tags.includes('chat') || (o.interact) || tags.includes('shooting') || tags.includes('bowling') || o.kind === 'car' || o.vehicle || o.kind === 'door' || o.category === 'vehicle') {
        best = o
        bestD = d
      }
    }
    if (!best) return

    if (best.npc) {
      this.npcSpeak(best)
      return
    }
    const tags = best.tags ?? []

    // cars: enter
    if (best.vehicle || best.kind === 'car' || tags.includes('car')) {
      if (p.inVehicle) return
      const v = this.api.vehicles.find((x) => x.id === best.id)
      if (v) {
        p.yaw = v.rot[1]
        this.attachVehicle(v.id)
        // seat the player
        p.pos.x = v.pos[0]
        p.pos.z = v.pos[2]
        p.pos.y = v.pos[1]
      }
      return
    }

    if (best.interact === 'bowl' || tags.includes('bowling')) {
      this.bowl(best)
      return
    }
    if (best.interact === 'shoot' || tags.includes('shooting')) {
      this.shoot()
      return
    }
    if (best.kind === 'door') {
      aifx.build()
      this.emit('interact', 'the player opened the door')
      best.visible = false
      best.solid = false
      return
    }
    this.emit('interact', `the player pressed E on ${best.name}`)
  }

  private bowl(rack: WorldObjectState) {
    // find pins and fire a rolling ball toward them
    const pins = this.api.objects.filter((o) => (o.tags ?? []).includes('pin'))
    if (!pins.length) return
    const pinsCenter: [number, number, number] = [
      pins.reduce((a, p) => a + p.pos[0], 0) / pins.length,
      0,
      pins.reduce((a, p) => a + p.pos[2], 0) / pins.length,
    ]
    const dir = rack.pos[1] > 2 ? 1 : -1 // bowl rack usually at near end; fire away from rack
    void dir
    const bx = rack.pos[0] + (pinsCenter[0] - rack.pos[0]) * 0.1
    const bz = rack.pos[2] + (pinsCenter[2] - rack.pos[2]) * 0.1
    const vx = (pinsCenter[0] - rack.pos[0])
    const vz = (pinsCenter[2] - rack.pos[2])
    const len = Math.hypot(vx, vz) || 1
    const nvx = (vx / len) * 16
    const nvz = (vz / len) * 16
    const ball = this.api.createObject({
      kind: 'ball', name: 'rolling_ball', shape: 'sphere', pos: [bx, 1.1, bz], scale: 0.62,
      color: '#d23b57', category: 'prop', physics: 'dynamic',
    })
    this.dyn.set(ball.id, { id: ball.id, vx: nvx, vy: 0, vz: nvz, spinX: 0, spinZ: 0, restTime: 0, kind: 'sphere' })
    this.pinsTracked = pins.length
    this.targetsTracked = 0
    aifx.whoosh()
    this.emit('interact', 'the player rolled a bowling ball!')
  }

  private shoot() {
    if (this.shootCd > 0) return
    this.shootCd = 0.45
    const p = this.player
    const eye = p.eyePos()
    const dir = p.viewDir()
    this.shots.push({
      x: eye.x + dir.x * 0.8, y: eye.y + dir.y * 0.8, z: eye.z + dir.z * 0.8,
      vx: dir.x * 38, vy: dir.y * 38 + 2, vz: dir.z * 38,
      life: 2.6,
    })
    aifx.build()
    const targets = this.api.objects.filter((o) => (o.tags ?? []).includes('target')).length
    this.targetsTracked = targets
    this.emit('interact', `the player fired a projectile (${targets} targets left)`)
  }

  // ---------------------------------------------------------------- course
  /** build a recipe scene; returns info or null if nothing was cleared */
  buildScene(label: string): SceneInfo | null {
    // clear previous course objects (keep baseplate, spawnpad, head-friendlies)
    const keep = new Set(['baseplate', 'spawnpad'])
    const gone = this.api.clearObjects({ except: [...keep] })
    this.dyn.clear()
    this.shots.length = 0
    this.ringCache.clear()
    this.lastCp = null
    this.course = null
    this.objectivesDone = false
    if (gone > 1) this.log(`cleared ${gone - 1} old objects`, 'info')
    const info = this.recipes.create(label)
    if (!info.built) return null
    this.course = { ...info, finished: false }
    this.api.goals = []
    this.gemsAtCourse = this.api.objects.filter((o) => (o.tags ?? []).includes('collectible')).length
    this.pinsTracked = this.api.objects.filter((o) => (o.tags ?? []).includes('pin')).length
    this.targetsTracked = this.api.objects.filter((o) => (o.tags ?? []).includes('target')).length
    this.rlOffset = info.label.toLowerCase().includes('red light') ? this.simT : this.rlOffset
    this.rebuild()
    this.emit('scene', `new scene built: ${info.title}`)
    // if the course starts far from spawn, walk the player to the start
    // line facing the finish (no one enjoys a 40m blind walk)
    const startTile = this.api.objects.find((o) => (o.tags ?? []).includes('startZone'))
    if (startTile) {
      const sx = startTile.pos[0]
      const sz = startTile.pos[2]
      const dist = Math.hypot(sx, sz - this.spawn[2])
      if (dist > 15) {
        const fin = this.api.objects.find((o) => (o.tags ?? []).includes('finish'))
        const gy = this.groundHeightAt(sx, sz) + 1.5
        this.player.queueTeleport(sx, gy, sz)
        if (fin) {
          this.player.yaw = Math.atan2(fin.pos[0] - sx, fin.pos[2] - sz)
          this.player.pitch = 0
        }
        this.emit('interact', 'moved the player to the course start')
      }
    }
    return info
  }

  resetWorld() {
    this.api.clearObjects({ except: ['baseplate', 'spawnpad'] })
    this.api.terrain = null
    this.api.weather = { rain: false, intensity: 0.5 }
    this.api.timeOfDay = 12
    this.api.timeScale = 0
    this.api.goals = []
    this.dyn.clear()
    this.shots.length = 0
    this.lastCp = null
    this.course = null
    this.objectivesDone = false
    this.player.queueTeleport(...this.spawn)
    this.rebuild()
    this.emit('scene', 'world reset to a fresh baseplate')
  }

  teleportTo(idOrName: string): boolean {
    const o = this.api.find(idOrName)
    if (!o) return false
    const ground = this.groundHeightAt(o.pos[0], o.pos[2])
    const y = Math.max(o.pos[1] + 3, ground + 2)
    this.player.queueTeleport(o.pos[0], y, o.pos[2] + 2.4)
    this.emit('interact', `teleported the player to ${o.name}`)
    aifx.whoosh()
    return true
  }

  lookAt(x: number, y: number, z: number) {
    const dx = x - this.player.pos.x
    const dz = z - this.player.pos.z
    this.player.yaw = Math.atan2(dx, dz)
  }

  // --------------------------------------------------------------- camera
  private updateCamera(dt: number) {
    const p = this.player
    if (!p.alive) {
      this.camera.mode = 'dead'
      const t = this.simT * 0.5
      this.camera.eye = {
        x: p.pos.x + Math.cos(t) * 4,
        y: p.pos.y + 2.4 + Math.sin(t * 0.7) * 0.8,
        z: p.pos.z + Math.sin(t) * 4,
      }
      this.camera.target = { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }
      this.camera.shake = this.shakeAmt * 0.4
      return
    }
    if (p.inVehicle) {
      const v = this.api.vehicles.find((x) => x.id === p.inVehicle)
      this.camera.mode = 'vehicle'
      if (v) {
        const back = 8
        const up = 3.6
        const ex = v.pos[0] - Math.sin(v.rot[1]) * back
        const ez = v.pos[2] - Math.cos(v.rot[1]) * back
        const ey = v.pos[1] + up
        this.camSmooth.x = damp(this.camSmooth.x, ex, 6, dt)
        this.camSmooth.y = damp(this.camSmooth.y, ey, 6, dt)
        this.camSmooth.z = damp(this.camSmooth.z, ez, 6, dt)
        this.camera.eye = { x: this.camSmooth.x, y: this.camSmooth.y, z: this.camSmooth.z }
        this.camera.target = { x: v.pos[0] + Math.sin(v.rot[1]) * 6, y: v.pos[1] + 1.4, z: v.pos[2] + Math.cos(v.rot[1]) * 6 }
        this.camera.fov = 70
      }
      this.camera.shake = this.shakeAmt * 0.6
      return
    }
    this.camera.mode = 'first'
    const eye = p.eyePos()
    const dir = p.viewDir()
    // subtle head bob while walking
    const running = p.grounded && p.moving && p.keysHeld().has('ShiftLeft')
    const bobAmp = p.grounded && p.moving ? 0.028 * (1 + (running ? 0.6 : 0)) : 0
    const bob = Math.sin(p.moveTime * 9.4) * bobAmp
    const bob2 = Math.cos(p.moveTime * 4.7) * bobAmp * 0.6
    this.camera.eye = { x: eye.x, y: eye.y + bob, z: eye.z }
    this.camera.target = {
      x: eye.x + dir.x * 30,
      y: eye.y + dir.y * 30 + bob2,
      z: eye.z + dir.z * 30,
    }
    // speed FOV: opens up a touch while sprinting or falling fast, eases back
    const hSpeed = Math.hypot(p.vel.x, p.vel.z)
    const speedK = Math.min(1, hSpeed / 9)
    const airK = !p.grounded ? Math.min(1, Math.max(0, -p.vel.y) / 18) : 0
    const targetFov = 73 + speedK * 6 + airK * 3
    this.camFov = damp(this.camFov, targetFov, p.grounded ? 6 : 2.5, dt)
    this.camera.fov = this.camFov
    this.camera.shake = this.shakeAmt * 0.5
  }

  /** mouse sensitivity multiplier (1 = default) */
  sensitivity = 1
  setSensitivity(s: number) {
    this.sensitivity = Math.max(0.2, Math.min(3, s))
  }

  /** nearest interactable the player could press E on (HUD hint) */
  interactHint: { name: string; kind: string } | null = null

  updateInteractHint() {
    const p = this.player
    if (!p.alive || p.inVehicle) {
      this.interactHint = null
      return
    }
    const eye = p.eyePos()
    let best: { name: string; kind: string } | null = null
    let bestD = 4.2
    const scan = [...this.api.objects, ...this.api.npcs, ...this.api.vehicles]
    for (const o of scan) {
      const tags = o.tags ?? []
      const interactable = o.npc || o.vehicle || o.interact || tags.includes('shooting') || tags.includes('bowling') || o.kind === 'door' || o.category === 'vehicle'
      if (!interactable) continue
      if (o.visible === false) continue
      const dy = o.pos[1] - eye.y
      if (dy > 4 || dy < -3.2) continue
      const d2 = dist2d(eye.x, eye.z, o.pos[0], o.pos[2])
      if (d2 < bestD) {
        bestD = d2
        best = {
          name: o.npc ? o.name : o.kind === 'door' ? 'door' : o.interact === 'bowl' ? 'ball rack' : o.interact === 'shoot' ? 'cannon' : o.vehicle ? `drive ${o.name}` : o.name,
          kind: o.category,
        }
      }
    }
    this.interactHint = best
  }

  // ------------------------------------------------------- AI-facing reads
  playerSnapshot(): PlayerState {
    return this.player.snapshot()
  }

  /** player activity since t0 (ms) */
  activitySince(t0: number): PlayerAction[] {
    return this.recentActions.filter((a) => a.at >= t0)
  }

  lastActivityAt(): number {
    return this.recentActions.length ? this.recentActions[this.recentActions.length - 1].at : 0
  }

  worldStatus(): Record<string, unknown> {
    const w = this.api
    return {
      objects: w.objects.length,
      npcs: w.npcs.length,
      vehicles: w.vehicles.length,
      objectives: w.goals.filter((g) => !g.done).length,
      playerAlive: this.player.alive,
      phase: '',
      weather: w.weather.rain ? `rain ${w.weather.intensity}` : 'clear',
      sky: w.sky.color,
      projectName: w.name,
      terrain: w.terrain ? 'yes' : 'none',
      time: w.timeScale > 0 ? 'day cycle' : `${w.timeOfDay}:00`,
      course: this.course?.title ?? null,
      npcsTotal: w.npcs.length,
      objectCount: w.objects.length,
      vehiclesTotal: w.vehicles.length,
    }
  }

  /** compact world snapshot for AI context */
  contextData(): Record<string, unknown> {
    return this.api.snapshot(this.playerSnapshot())
  }
}

export function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export function dampAngle(a: number, b: number, lambda: number, dt: number): number {
  const d = angleDiff(b, a)
  return a + d * (1 - Math.exp(-lambda * dt))
}


