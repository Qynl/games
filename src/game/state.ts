import {
  BrawlerState,
  createBrawler,
  updateBrawler,
  spawnProjectile,
  updateProjectiles,
  Projectile,
  healBrawler,
} from './entities'
import { BRAWLERS, brawlerById, BrawlerDef } from './brawlers'
import { GameMap, mapById, solidTile, tileAt, T_WALL } from './maps'
import { ParticleSystem, makeTombstone, Tombstone } from './particles'
import { updateAI, makeAI, AIData, avoidBullets, dodgeThreat, avoidWalls } from './ai'
import { findPath, hasLineOfSight } from './pathfind'
import { audio } from './audio'
import {
  Vec, v, dist, dist2, norm, clamp, rand, randInt, pick, chance, shuffle,
  lerp, angDiff, approachAng, vecFromAngle,
} from './util'
import {
  TILE, STEP, TeamId, ModeDef, MODES, MODE_MAP, MatchConfig, MatchResult, BOT_NAMES,
} from './types'

export interface GameEvent {
  kind: 'kill' | 'gem' | 'countdown' | 'win' | 'lose' | 'draw' | 'info' | 'star'
  text: string
  t: number
  team?: TeamId
  killerName?: string
  victimName?: string
}

export interface Pickup {
  id: number
  pos: Vec
  vel: Vec
  kind: 'gem' | 'cube'
  t: number
  bornT: number
  color: string
}

export interface BoxState {
  pos: Vec
  hp: number
  broken: boolean
  shake: number
}

export interface Puddle {
  pos: Vec
  life: number
  maxLife: number
  team: TeamId
}

export interface TurretState {
  id: number
  owner: number
  team: TeamId
  pos: Vec
  hp: number
  maxHp: number
  fireCd: number
  life: number
}

let NEXT_PICKUP = 1
let NEXT_TURRET = 1

export interface GameOptions {
  brawler: string
  mode: ModeDef
  botBrawlerIds?: string[]
}

export class GameState {
  map: GameMap
  mode: ModeDef
  brawlers: BrawlerState[] = []
  player: BrawlerState | null = null
  projectiles: Projectile[] = []
  particles = new ParticleSystem()
  pickups: Pickup[] = []
  boxes: BoxState[] = []
  puddles: Puddle[] = []
  turrets: TurretState[] = []
  tombstones: Tombstone[] = []
  events: GameEvent[] = []
  time = 0
  timeLeft: number
  phase: 'countdown' | 'play' | 'ended' = 'countdown'
  countdownT = 3.4
  endedT = 0
  result: MatchResult | null = null
  shake = 0
  teamGems: [number, number] = [0, 0]
  teamStars: [number, number] = [0, 0]
  gemTimer: number | null = null
  gemTimerTeam: TeamId | null = null
  mineT = 1.5
  gas: { center: Vec; radius: number; target: number } | null = null
  gasT = 0
  placement = 0
  placements: number[] = []
  playerPlacement: number | null = null
  safes: { team: number; pos: Vec; hp: number; maxHp: number; dead: boolean; hitFlash: number; shake: number }[] = []
  playerFiring = false
  autoTargetId: number | null = null
  playerInput = { mx: 0, my: 0, aimX: 1, aimY: 0, firing: false }
  onEvent: ((e: GameEvent) => void) | null = null
  onEnd: ((r: MatchResult) => void) | null = null
  playerSuperQueued = false
  private playerGadgetQueued = false
  private superFlashT = new Map<number, number>()
  hitstop = 0

  constructor(mode: ModeDef, mapId: string, playerBrawlerId: string, botBrawlerIds?: string[]) {
    this.mode = mode
    this.map = mapById(mapId)
    this.timeLeft = mode.duration
    const playerDef = brawlerById(playerBrawlerId)
    this.setupBrawlers(playerDef, botBrawlerIds)
  }

  private setupBrawlers(playerDef: BrawlerDef, botBrawlerIds?: string[]) {
    const botPool = shuffle(BOT_NAMES)
    if (this.mode.id === 'showdown') {
      const spots = this.map.spawns.filter((s) => s.team === 2).map((s) => v(s.pos.x * TILE, s.pos.y * TILE))
      const picked = shuffle(spots).slice(0, this.mode.teamSize)
      const defs = this.pickBotDefs(botBrawlerIds, this.mode.teamSize - 1)
      for (let i = 0; i < this.mode.teamSize; i++) {
        const pos = picked[i] ?? v(rand(this.map.w) * 0.8 * TILE, rand(this.map.h) * 0.8 * TILE)
        if (i === 0) {
          const p = createBrawler(playerDef, 2, pos, 'You', true, false)
          this.player = p
          this.brawlers.push(p)
        } else {
          const b = createBrawler(defs[i - 1], 2, pos, botPool[i - 1], false, true)
          b.bot = makeAI(b)
          this.brawlers.push(b)
        }
      }
    } else {
      const blueSpots = this.map.spawns.filter((s) => s.team === 0).map((s) => v(s.pos.x * TILE, s.pos.y * TILE))
      const redSpots = this.map.spawns.filter((s) => s.team === 1).map((s) => v(s.pos.x * TILE, s.pos.y * TILE))
      const size = this.mode.teamSize
      const defs = this.pickBotDefs(botBrawlerIds, size * 2 - 1)
      let di = 0
      for (let i = 0; i < size; i++) {
        if (i === 0) {
          const p = createBrawler(playerDef, 0, blueSpots[i] ?? v(2 * TILE, 2 * TILE), 'You', true, false)
          this.player = p
          this.brawlers.push(p)
        } else {
          const b = createBrawler(defs[di], 0, blueSpots[i] ?? v(2 * TILE, 2 * TILE), botPool[di], false, true)
          b.bot = makeAI(b)
          this.brawlers.push(b)
          di++
        }
      }
      for (let i = 0; i < size; i++) {
        const b = createBrawler(defs[di], 1, redSpots[i] ?? v(30 * TILE, 30 * TILE), botPool[di], false, true)
        b.bot = makeAI(b)
        this.brawlers.push(b)
        di++
      }
    }
    // initial spawn protection
    for (const b of this.brawlers) {
      b.spawnProt = 2.2
      b.spawnFx = 0.45
    }
    for (const box of this.map.boxes) {
      this.boxes.push({ pos: v(box.x * TILE, box.y * TILE), hp: 1000, broken: false, shake: 0 })
    }
    // heist safes
    if (this.mode.id === 'heist') {
      for (const s of this.map.safes) {
        this.safes.push({
          team: s.team,
          pos: v(s.pos.x * TILE, s.pos.y * TILE),
          hp: 30000,
          maxHp: 30000,
          dead: false,
          hitFlash: 0,
          shake: 0,
        })
      }
    }
    if (this.mode.id === 'showdown') {
      this.gas = {
        center: v((this.map.w / 2) * TILE, (this.map.h / 2) * TILE),
        radius: Math.hypot(this.map.w, this.map.h) * 0.52 * TILE,
        target: Math.hypot(this.map.w, this.map.h) * 0.52 * TILE,
      }
      this.gasT = 30
    }
    // showdown: sprinkle a few cubes around
    if (this.mode.id === 'showdown') {
      for (let i = 0; i < 6; i++) {
        this.dropPickup(
          v(rand(3, this.map.w - 3) * TILE + TILE / 2, rand(3, this.map.h - 3) * TILE + TILE / 2),
          'cube'
        )
      }
    }
    audio.startMusic(true)
  }

  private pickBotDefs(botBrawlerIds: string[] | undefined, n: number): BrawlerDef[] {
    const chosen: BrawlerDef[] = []
    if (botBrawlerIds && botBrawlerIds.length > 0) {
      for (let i = 0; i < n; i++) {
        chosen.push(brawlerById(botBrawlerIds[i % botBrawlerIds.length]))
      }
      return chosen
    }
    const pool = shuffle(BRAWLERS.filter((b) => b.id !== this.player?.def.id))
    for (let i = 0; i < n; i++) chosen.push(pool[i % pool.length])
    return chosen
  }

  // ================= INPUT =================
  setMove(mx: number, my: number) {
    this.playerInput.mx = mx
    this.playerInput.my = my
  }
  setAim(x: number, y: number) {
    this.playerInput.aimX = x
    this.playerInput.aimY = y
  }
  setFiring(f: boolean) {
    this.playerInput.firing = f
    this.playerFiring = f
  }
  queueSuper() {
    this.playerSuperQueued = true
  }
  queueGadget() {
    this.playerGadgetQueued = true
  }
  queueEmote(icon: string) {
    if (this.player && !this.player.dead) this.player.emote = { icon, t: 1.6 }
  }

  // single attack — used by tap-to-fire / release-to-fire
  fireOnce(dir?: Vec | null) {
    const p = this.player
    if (!p || p.dead || this.phase !== 'play' || this.countdownT > 0) return
    if (dir && Math.hypot(dir.x, dir.y) > 4) {
      p.aim = Math.atan2(dir.y, dir.x)
    } else {
      const t = this.pickAutoTarget(p)
      if (t) p.aim = Math.atan2(t.pos.y - p.pos.y, t.pos.x - p.pos.x)
    }
    this.tryFire(p)
  }

  // ================= MAIN UPDATE =================
  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05)
    this.time += dt
    this.shake = Math.max(0, this.shake - dt * 3)

    if (this.phase === 'countdown') {
      this.countdownT -= dt
      this.updateBrawlersOnly(dt)
      if (this.countdownT <= 0) {
        this.phase = 'play'
        audio.go()
        this.pushEvent({ kind: 'info', text: this.mode.tagline })
      }
      this.particles.update(dt)
      return
    }

    if (this.phase === 'ended') {
      this.endedT += dt
      this.updateBrawlersOnly(dt)
      this.updateProjectiles(dt)
      this.particles.update(dt)
      return
    }

    // ------- playing -------
    // hitstop: tiny freeze-frame on big moments (kill confirm feel)
    if (this.hitstop > 0) {
      this.hitstop -= dt
      this.particles.update(dt)
      return
    }

    this.timeLeft -= dt
    this.mineT -= dt

    this.applyPlayerInput()
    this.updateBots(dt)
    this.updateBrawlersOnly(dt)
    this.updateProjectiles(dt)
    this.updatePickups(dt)
    this.updateBoxes(dt)
    this.updateTurrets(dt)
    this.updatePuddles(dt)
    this.updateSafes(dt)
    this.updateTombstones()
    this.updateEvents(dt)
    this.particles.update(dt)

    // gem mine
    if (this.mode.id === 'gem' && this.map.mine && this.mineT <= 0) {
      this.mineT = 2.6
      const offset = vecFromAngle(rand(Math.PI * 2), rand(0, 40))
      this.dropPickup(v(this.map.mine.x * TILE + offset.x, this.map.mine.y * TILE + offset.y), 'gem')
      this.particles.sparkBurst(v(this.map.mine.x * TILE, this.map.mine.y * TILE), '#9c4dff', 8, 90)
    }

    // gem countdown
    if (this.gemTimer !== null && this.gemTimerTeam !== null && this.gemTimerTeam !== undefined) {
      this.gemTimer -= dt
      if (this.gemTimer <= 0) {
        this.endMatch(this.gemTimerTeam === 0, false)
        return
      }
      const holderOk = (this.teamGems as number[])[this.gemTimerTeam] >= 10
      if (!holderOk) {
        this.gemTimer = null
        this.gemTimerTeam = null
      }
    }

    // showdown gas
    if (this.mode.id === 'showdown' && this.gas) {
      this.gasT -= dt
      if (this.gasT <= 0) {
        this.gasT = 30
        this.gas.target *= 0.84
        audio.gas()
        this.pushEvent({ kind: 'info', text: '☠️ THE GAS IS CLOSING IN!' })
      }
      this.gas.radius = lerp(this.gas.radius, this.gas.target, dt * 0.06)
      for (const b of this.brawlers) {
        if (!b.dead && dist(b.pos, this.gas.center) > this.gas.radius) {
          this.damageBrawler(b, Math.round(300 * dt), -1, { silent: true })
          this.particles.spawn({
            x: b.pos.x + rand(-6, 6),
            y: b.pos.y + rand(-10, 0),
            vx: 0,
            vy: -20,
            life: 0.4,
            maxLife: 0.4,
            size: 4,
            color: 'rgba(150,255,90,0.6)',
            shape: 'circle',
            z: 6,
          })
        }
      }
    }

    // time's up
    if (this.timeLeft <= 0) {
      if (this.mode.id === 'gem') {
        if (this.teamGems[0] === this.teamGems[1]) this.endMatch(false, true)
        else this.endMatch(this.teamGems[0] > this.teamGems[1], false)
      } else if (this.mode.id === 'bounty') {
        if (this.teamStars[0] === this.teamStars[1]) this.endMatch(false, true)
        else this.endMatch(this.teamStars[0] > this.teamStars[1], false)
      } else if (this.mode.id === 'heist') {
        const mineHp = this.safes.find((s) => s.team === 0)?.hp ?? 0
        const theirsHp = this.safes.find((s) => s.team === 1)?.hp ?? 0
        if (mineHp === theirsHp) this.endMatch(false, true)
        else this.endMatch(mineHp > theirsHp, false)
      } else {
        this.endShowdownTime()
      }
      return
    }
  }

  private updateBrawlersOnly(dt: number) {
    for (const b of this.brawlers) {
      updateBrawler(this, b, dt, this.particles)
      // landing from leap
      if (b.leap && b.leap.t >= b.leap.dur) {
        this.landLeap(b)
      }
    }
    // respawns (team modes)
    if (this.mode.id !== 'showdown' && this.phase === 'play') {
      for (const b of this.brawlers) {
        if (b.dead) {
          b.respawnT -= dt
          if (b.respawnT <= 0) {
            const spots = this.map.spawns.filter((s) => s.team === b.team).map((s) => v(s.pos.x * TILE, s.pos.y * TILE))
            b.pos = { ...pick(spots) }
            b.hp = b.maxHp
            b.ammo = b.def.ammoMax
            b.dead = false
            b.deathT = 0
            b.spawnProt = 2.2
            b.spawnFx = 0.5
            b.superCharge = Math.max(0.25, b.superCharge)
            this.particles.burst(b.pos, '#ffffff', 16, { speed: 140, size: 5, life: 0.5 })
            audio.spawn()
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    updateProjectiles(
      this,
      dt,
      (target, dmg, sourceId, opts) => this.onProjectileHit(target, dmg, sourceId, opts),
      (pos, splash, dmg, sourceId, knock, color) => this.explode(pos, splash, dmg, sourceId, knock, color),
      (team, dmg, sourceId, pos) => this.damageSafe(team, dmg, sourceId, pos),
      (pos, dmg) => {
        const box = this.boxes.find((bx) => !bx.broken && dist2(bx.pos, pos) < Math.pow(24, 2))
        if (box) this.damageBox(box, dmg)
      }
    )
  }

  private applyPlayerInput() {
    const p = this.player
    if (!p || p.dead) {
      // don't queue actions while dead
      this.playerSuperQueued = false
      this.playerGadgetQueued = false
      return
    }
    const inp = this.playerInput
    const ml = Math.hypot(inp.mx, inp.my)
    if (ml > 0.15) {
      p.mx = inp.mx / ml
      p.my = inp.my / ml
    } else {
      p.mx = 0
      p.my = 0
    }
    const al = Math.hypot(inp.aimX, inp.aimY)
    if (al > 0.1) {
      p.aim = Math.atan2(inp.aimY / al, inp.aimX / al)
    }
    // AUTO-AIM: when firing (or holding), snap to the best target in range
    if (this.playerFiring) {
      const t = this.pickAutoTarget(p)
      if (t) {
        p.aim = Math.atan2(t.pos.y - p.pos.y, t.pos.x - p.pos.x)
        this.autoTargetId = t.id
        this.tryFire(p)
      } else {
        this.autoTargetId = null
      }
    } else {
      this.autoTargetId = null
    }
    if (this.playerSuperQueued) {
      this.playerSuperQueued = false
      this.trySuper(p, p.aim)
    }
    if (this.playerGadgetQueued) {
      this.playerGadgetQueued = false
      this.tryGadget(p)
    }
  }

  private pickAutoTarget(p: BrawlerState): BrawlerState | null {
    const range = p.attackRange * 1.15
    let best: BrawlerState | null = null
    let bestScore = Infinity
    for (const e of this.brawlers) {
      if (e.dead || e.id === p.id || e.spawnProt > 0) continue
      if (this.mode.id !== 'showdown' && e.team === p.team) continue
      const d = dist(p.pos, e.pos)
      if (d > range) continue
      const dir = v(e.pos.x - p.pos.x, e.pos.y - p.pos.y)
      const dot = Math.cos(angDiff(Math.atan2(dir.y, dir.x), p.aim))
      const offAim = (1 - dot) * 90
      const score = d + offAim
      if (score < bestScore) {
        bestScore = score
        best = e
      }
    }
    return best
  }

  private updateBots(dt: number) {
    for (const b of this.brawlers) {
      if (b.isBot && !b.dead && b.bot) {
        updateAI(this, b, b.bot, dt)
        // dodge incoming projectiles
        avoidBullets(this, b, dt, b.def.speed)
        // dodge enemies aiming at us
        const threat = dodgeThreat(this, b)
        if (threat) {
          b.mx += threat.x * 0.85
          b.my += threat.y * 0.85
          const l = Math.hypot(b.mx, b.my) || 1
          b.mx /= l
          b.my /= l
        }
        // don't walk into walls while dodging
        if (b.mx !== 0 || b.my !== 0) {
          const safe = avoidWalls(this.map, b.pos, v(b.mx, b.my))
          b.mx = safe.x
          b.my = safe.y
        }
      }
      if (b.isBot) {
        if (Math.random() < dt * 0.02 && !b.dead) {
          const icons = ['😤', '😏', '😆', '🔥', '💪']
          b.emote = { icon: pick(icons), t: 1.2 }
        }
      }
    }
  }

  // ================= COMBAT =================
  tryFire(b: BrawlerState): boolean {
    if (b.dead || b.stunT > 0) return false
    if (b.ammo <= 0) {
      if (b.isPlayer && b.reloadT > b.def.reload - 0.12) {
        audio.hit()
      }
      return false
    }
    b.ammo--
    if (b.ammo === b.def.ammoMax - 1) b.reloadT = b.def.reload
    const def = b.def
    const atk = def.attack
    const dir = vecFromAngle(b.aim)
    const origin = v(b.pos.x + dir.x * 20, b.pos.y + dir.y * 20)
    const pTeam = b.team
    this.particles.sparkBurst(origin, '#ffd23f', 3, 140)

    switch (atk.kind) {
      case 'spread': {
        audio.shoot('spread')
        for (let i = 0; i < atk.pellets; i++) {
          const a = b.aim + (i - (atk.pellets - 1) / 2) * atk.spread + rand(-0.03, 0.03)
          const vel = vecFromAngle(a, atk.speed)
          const range = atk.range
          this.projectiles.push(spawnProjectile({
            kind: 'bullet', ownerId: b.id, ownerTeam: pTeam,
            pos: { ...origin }, start: { ...origin },
            end: v(origin.x + vel.x * range / atk.speed, origin.y + vel.y * range / atk.speed),
            vel, damage: atk.damage, splash: 0, pierce: 1, knock: atk.knock ?? 0,
            life: range / atk.speed, maxLife: range / atk.speed,
            color: '#ffd23f', size: 6,
          }))
        }
        break
      }
      case 'burst': {
        audio.shoot('burst')
        for (let i = 0; i < atk.shots; i++) {
          const a = b.aim + rand(-0.035, 0.035)
          const vel = vecFromAngle(a, atk.speed)
          this.projectiles.push(spawnProjectile({
            kind: 'bullet', ownerId: b.id, ownerTeam: pTeam,
            pos: { ...origin }, start: { ...origin },
            end: v(origin.x + vel.x * atk.range / atk.speed, origin.y + vel.y * atk.range / atk.speed),
            vel, damage: atk.damage, splash: 0, pierce: 1, knock: 0,
            life: atk.range / atk.speed, maxLife: atk.range / atk.speed,
            color: '#4fc3ff', size: 4,
          }))
        }
        break
      }
      case 'rocket': {
        audio.shoot('rocket')
        const vel = vecFromAngle(b.aim, atk.speed)
        this.projectiles.push(spawnProjectile({
          kind: 'rocket', ownerId: b.id, ownerTeam: pTeam,
          pos: { ...origin }, start: { ...origin },
          end: v(origin.x + vel.x * atk.range / atk.speed, origin.y + vel.y * atk.range / atk.speed),
          vel, damage: atk.damage, splash: atk.splash, pierce: 1, knock: 60,
          life: atk.range / atk.speed, maxLife: atk.range / atk.speed,
          color: '#ff9d3f', size: 8,
        }))
        break
      }
      case 'lob': {
        audio.shoot('lob')
        const target = this.lobTarget(b.pos, b.aim, atk.range)
        this.projectiles.push(spawnProjectile({
          kind: 'lob', ownerId: b.id, ownerTeam: pTeam,
          pos: { ...origin }, start: { ...origin }, end: target,
          vel: v(), t: 0, dur: atk.duration, arcH: 3.6 * TILE,
          damage: atk.damage, splash: atk.splash, pierce: 1, knock: 0,
          life: 5, maxLife: 5, color: '#c86bff', size: 7,
        }))
        break
      }
      case 'smg': {
        audio.shoot('smg')
        const a = b.aim + rand(-0.05, 0.05)
        const vel = vecFromAngle(a, atk.speed)
        this.projectiles.push(spawnProjectile({
          kind: 'bullet', ownerId: b.id, ownerTeam: pTeam,
          pos: { ...origin }, start: { ...origin },
          end: v(origin.x + vel.x * atk.range / atk.speed, origin.y + vel.y * atk.range / atk.speed),
          vel, damage: atk.damage, splash: 0, pierce: 1, knock: 0,
          life: atk.range / atk.speed, maxLife: atk.range / atk.speed,
          color: '#6effe8', size: 3.5,
        }))
        break
      }
      case 'wave': {
        audio.shoot('wave')
        const vel = vecFromAngle(b.aim, atk.speed)
        this.projectiles.push(spawnProjectile({
          kind: 'wave', ownerId: b.id, ownerTeam: pTeam,
          pos: { ...origin }, start: { ...origin },
          end: v(origin.x + vel.x * atk.range / atk.speed, origin.y + vel.y * atk.range / atk.speed),
          vel, damage: atk.damage, splash: 0, pierce: atk.pierce, knock: 0,
          life: atk.range / atk.speed, maxLife: atk.range / atk.speed,
          color: '#3ae7a0', size: 10, width: atk.width,
        }))
        break
      }
      case 'swipe': {
        audio.shoot('swipe')
        // instant melee arc
        const hit = this.meleeArc(b, atk.range, atk.arc, atk.damage, 70)
        this.projectiles.push(spawnProjectile({
          kind: 'slash', ownerId: b.id, ownerTeam: pTeam,
          pos: { ...origin }, start: { ...origin }, end: { ...origin },
          vel: v(), t: 0, dur: 0.16,
          damage: 0, splash: 0, pierce: 10, knock: 0,
          life: 0.16, maxLife: 0.16, color: '#ff5c33', size: atk.range, width: atk.arc,
        }))
        void hit
        break
      }
      case 'slash': {
        audio.shoot('slash')
        this.meleeArc(b, atk.range, atk.arc, atk.damage, 40)
        this.projectiles.push(spawnProjectile({
          kind: 'slash', ownerId: b.id, ownerTeam: pTeam,
          pos: { ...origin }, start: { ...origin }, end: { ...origin },
          vel: v(), t: 0, dur: 0.14,
          damage: 0, splash: 0, pierce: 10, knock: 0,
          life: 0.14, maxLife: 0.14, color: '#ffe14d', size: atk.range, width: atk.arc,
        }))
        // small dash forward
        const dd = vecFromAngle(b.aim)
        b.dashT = 0.09
        b.dashDir = v(dd.x * 0.5, dd.y * 0.5)
        break
      }
    }
    return true
  }

  trySuper(b: BrawlerState, dirAngle: number): boolean {
    if (b.dead || b.stunT > 0) return false
    if (b.superCharge < 1) {
      if (b.isPlayer) audio.hit()
      return false
    }
    const def = b.def
    const sup = def.super
    const dir = vecFromAngle(dirAngle)
    const origin = v(b.pos.x + dir.x * 20, b.pos.y + dir.y * 20)
    const pTeam = b.team

    // check range for aim-locked supers
    switch (sup.kind) {
      case 'leap': {
        b.superCharge = 0
        audio.superUse()
        const target = this.lobTarget(b.pos, dirAngle, sup.maxRange)
        b.leap = { start: { ...b.pos }, target, t: 0, dur: 0.62, hitIds: [] }
        this.particles.burst(b.pos, '#ffb545', 12, { speed: 120, size: 5, life: 0.4 })
        this.shake = Math.max(this.shake, 0.2)
        return true
      }
      case 'turret': {
        b.superCharge = 0
        audio.superUse()
        const target = this.lobTarget(b.pos, dirAngle, 2.2 * TILE)
        const tx = Math.floor(target.x / TILE)
        const ty = Math.floor(target.y / TILE)
        if (solidTile(tileAt(this.map, tx, ty))) {
          // refund if aimed into a wall
          b.superCharge = 1
          return false
        }
        this.turrets.push({
          id: NEXT_TURRET++, owner: b.id, team: pTeam, pos: target,
          hp: sup.hp, maxHp: sup.hp, fireCd: 0.3, life: sup.life,
        })
        this.particles.burst(target, '#37e5ff', 18, { speed: 160, size: 5, life: 0.5 })
        return true
      }
      default:
        break
    }

    b.superCharge = 0
    audio.superUse()
    this.particles.sparkBurst(b.pos, '#ffdd55', 14, 160)

    switch (sup.kind) {
      case 'bigshot': {
        audio.shoot('spread')
        for (let i = 0; i < sup.pellets; i++) {
          const a = dirAngle + (i - (sup.pellets - 1) / 2) * sup.spread + rand(-0.02, 0.02)
          const vel = vecFromAngle(a, sup.speed)
          this.projectiles.push(spawnProjectile({
            kind: 'bullet', ownerId: b.id, ownerTeam: pTeam,
            pos: { ...origin }, start: { ...origin },
            end: v(origin.x + vel.x * sup.range / sup.speed, origin.y + vel.y * sup.range / sup.speed),
            vel, damage: sup.damage, splash: 0, pierce: 1, knock: sup.knock,
            life: sup.range / sup.speed, maxLife: sup.range / sup.speed,
            color: '#ff6a3d', size: 8, fromSuper: true,
          }))
        }
        this.shake = Math.max(this.shake, 0.25)
        break
      }
      case 'barrage': {
        audio.shoot('rocket')
        for (let i = 0; i < sup.shots; i++) {
          const a = dirAngle + (i - (sup.shots - 1) / 2) * 0.09
          const vel = vecFromAngle(a, sup.speed)
          this.projectiles.push(spawnProjectile({
            kind: 'megarocket', ownerId: b.id, ownerTeam: pTeam,
            pos: { ...origin }, start: { ...origin },
            end: v(origin.x + vel.x * sup.range / sup.speed, origin.y + vel.y * sup.range / sup.speed),
            vel, damage: sup.damage, splash: sup.splash, pierce: 1, knock: 90,
            life: sup.range / sup.speed, maxLife: sup.range / sup.speed,
            color: '#ff5c33', size: 11, fromSuper: true,
          }))
        }
        this.shake = Math.max(this.shake, 0.3)
        break
      }
      case 'pierce': {
        audio.shoot('burst')
        for (let i = 0; i < sup.shots; i++) {
          const a = dirAngle + rand(-0.02, 0.02)
          const vel = vecFromAngle(a, sup.speed)
          this.projectiles.push(spawnProjectile({
            kind: 'megabullet', ownerId: b.id, ownerTeam: pTeam,
            pos: { ...origin }, start: { ...origin },
            end: v(origin.x + vel.x * sup.range / sup.speed, origin.y + vel.y * sup.range / sup.speed),
            vel, damage: sup.damage, splash: 0, pierce: sup.pierce, knock: 0,
            life: sup.range / sup.speed, maxLife: sup.range / sup.speed,
            color: '#8fd0ff', size: 7, fromSuper: true,
          }))
        }
        break
      }
      case 'megabottle': {
        audio.shoot('lob')
        for (let i = 0; i < sup.bottles; i++) {
          const a = dirAngle + (i - (sup.bottles - 1) / 2) * 0.16
          const target = this.lobTarget(b.pos, a, sup.range)
          this.projectiles.push(spawnProjectile({
            kind: 'lob', ownerId: b.id, ownerTeam: pTeam,
            pos: { ...origin }, start: { ...origin }, end: target,
            vel: v(), t: 0, dur: sup.duration, arcH: 4.4 * TILE,
            damage: sup.damage, splash: sup.splash, pierce: 1, knock: 0,
            life: 5, maxLife: 5, color: '#b04dff', size: 9, fromSuper: true,
          }))
        }
        break
      }
      case 'healwave': {
        audio.heal()
        let healed = false
        for (const other of this.brawlers) {
          if (other.dead || (this.mode.id !== 'showdown' && other.team !== b.team)) continue
          if (dist(other.pos, b.pos) <= sup.range) {
            healBrawler(other, sup.heal)
            other.healPulse = 1
            this.particles.burst(other.pos, '#46ff9d', 10, { speed: 100, size: 5, life: 0.6, gravity: -60 })
            this.particles.floatText(other.pos, `+${sup.heal}`, '#46ff9d', 14)
            healed = true
          }
        }
        void healed
        break
      }
      case 'dashslash': {
        audio.dash()
        const target = v(b.pos.x + dir.x * sup.range, b.pos.y + dir.y * sup.range)
        // clamp target to passable tile
        const ttx = Math.floor(target.x / TILE)
        const tty = Math.floor(target.y / TILE)
        if (solidTile(tileAt(this.map, ttx, tty))) {
          // slash in place if blocked
        } else {
          b.dashT = 0.22
          b.dashDir = dir
        }
        b.invulnT = Math.max(b.invulnT, 0.3)
        // damage along the dash path
        const hits = new Set<number>()
        const steps = 10
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          const pos = v(lerp(b.pos.x, target.x, t), lerp(b.pos.y, target.y, t))
          for (const e of this.brawlers) {
            if (e.dead || e.id === b.id || hits.has(e.id)) continue
            if (this.mode.id !== 'showdown' && e.team === b.team) continue
            if (dist2(pos, e.pos) < Math.pow(sup.splash + 12, 2)) {
              this.damageBrawler(e, sup.damage, b.id, { knock: 120, color: '#ffe14d' })
              hits.add(e.id)
            }
          }
          this.particles.sparkBurst(pos, '#ffe14d', 2, 80)
        }
        this.shake = Math.max(this.shake, 0.2)
        break
      }
    }
    return true
  }

  private lobTarget(from: Vec, angle: number, range: number): Vec {
    const dir = vecFromAngle(angle, range)
    let target = v(from.x + dir.x, from.y + dir.y)
    // walk back until the landing tile is not a wall
    for (let i = 0; i < 20; i++) {
      const tx = Math.floor(target.x / TILE)
      const ty = Math.floor(target.y / TILE)
      const t = tileAt(this.map, tx, ty)
      if (t !== T_WALL) break
      target = v(target.x - dir.x * 0.12, target.y - dir.y * 0.12)
    }
    return target
  }

  private meleeArc(b: BrawlerState, range: number, arc: number, damage: number, knock: number): number {
    let hitCount = 0
    for (const e of this.brawlers) {
      if (e.dead || e.id === b.id || e.spawnProt > 0) continue
      if (this.mode.id !== 'showdown' && e.team === b.team) continue
      const d = dist(b.pos, e.pos)
      if (d > range + 14) continue
      const toE = norm(v(e.pos.x - b.pos.x, e.pos.y - b.pos.y))
      const aToE = Math.atan2(toE.y, toE.x)
      if (Math.abs(angDiff(aToE, b.aim)) > arc) continue
      this.damageBrawler(e, damage, b.id, { knock, color: '#ff6a3d' })
      hitCount++
    }
    // melee can whack the enemy safe (heist)
    for (const s of this.safes) {
      if (s.dead || s.team === b.team) continue
      if (dist(b.pos, s.pos) > range + 22) continue
      const toS = norm(v(s.pos.x - b.pos.x, s.pos.y - b.pos.y))
      if (Math.abs(angDiff(Math.atan2(toS.y, toS.x), b.aim)) > arc) continue
      this.damageSafe(s.team, damage, b.id, s.pos)
    }
    // melee breaks boxes (showdown)
    for (const box of this.boxes) {
      if (box.broken) continue
      if (dist(b.pos, box.pos) > range + 16) continue
      const toB = norm(v(box.pos.x - b.pos.x, box.pos.y - b.pos.y))
      if (Math.abs(angDiff(Math.atan2(toB.y, toB.x), b.aim)) > arc) continue
      this.damageBox(box, damage)
    }
    return hitCount
  }

  private onProjectileHit(
    target: BrawlerState,
    dmg: number,
    sourceId: number,
    opts?: { knock?: number; color?: string }
  ) {
    this.damageBrawler(target, dmg, sourceId, opts)
  }

  explode(pos: Vec, splash: number, dmg: number, sourceId: number, knock: number, color: string) {
    audio.explosion()
    this.shake = Math.max(this.shake, 0.35)
    this.particles.burst(pos, color, 18, { speed: 240, size: 6, life: 0.5, gravity: 200 })
    for (const e of this.brawlers) {
      if (e.dead || e.id === sourceId || e.spawnProt > 0) continue
      const source = this.brawlers.find((x) => x.id === sourceId)
      if (!source) continue
      if (this.mode.id !== 'showdown' && e.team === source.team) continue
      const d = dist(pos, e.pos)
      if (d < splash) {
        const falloff = 1 - (d / splash) * 0.35
        this.damageBrawler(e, Math.round(dmg * falloff), sourceId, { knock, color })
      }
    }
    // break boxes in blast
    for (const box of this.boxes) {
      if (!box.broken && dist(pos, box.pos) < splash + 10) {
        this.damageBox(box, dmg)
      }
    }
    // damage enemy safes in blast
    const source = this.brawlers.find((x) => x.id === sourceId)
    if (source) {
      for (const s of this.safes) {
        if (s.dead || s.team === source.team) continue
        if (dist(pos, s.pos) < splash + 18) {
          this.damageSafe(s.team, dmg, sourceId, pos)
        }
      }
    }
  }

  damageBrawler(
    target: BrawlerState,
    amount: number,
    sourceId: number,
    opts: { knock?: number; color?: string; silent?: boolean } = {}
  ) {
    if (target.dead) return
    if (target.spawnProt > 0 || target.invulnT > 0) {
      // no damage during spawn protection / i-frames
      if (!opts.silent) {
        this.particles.floatText(target.pos, 'IMMUNE', '#cccccc', 11)
      }
      return
    }
    let dmg = amount * target.dmgMul
    if (target.shieldT > 0) dmg *= 0.5
    dmg = Math.max(1, Math.round(dmg))
    target.hp -= dmg
    target.hitFlash = 1
    target.damage += dmg
    target.lastHitT = 0
    if (target.isPlayer) this.shake = Math.max(this.shake, 0.14)

    // taking damage also charges your super a bit
    if (target.superCharge < 1) {
      target.superCharge = Math.min(1, target.superCharge + dmg / (target.def.superNeed * 1.6))
    }

    const source = sourceId >= 0 ? this.brawlers.find((x) => x.id === sourceId) : undefined
    if (source && source.team !== target.team) {
      source.superCharge = Math.min(1, source.superCharge + dmg / source.def.superNeed)
      const wasReady = source.superCharge >= 1
      if (wasReady && !this.superFlashT.has(source.id)) {
        this.superFlashT.set(source.id, 0)
        if (source.isPlayer) audio.superReady()
      }
    }

    if (!opts.silent) {
      if (target.isPlayer) audio.hitPlayer()
      const color = opts.color ?? (source?.team === 1 ? '#ff7b6b' : '#ffd23f')
      this.particles.floatText(target.pos, `${dmg}`, color, 13)
      this.particles.sparkBurst(target.pos, color, 6, 110)
    }

    if (opts.knock) {
      const from = source ? norm(v(target.pos.x - source.pos.x, target.pos.y - source.pos.y)) : v(0, -1)
      target.knockVx += from.x * (opts.knock * 4)
      target.knockVy += from.y * (opts.knock * 4)
    }

    if (target.hp <= 0) {
      this.killBrawler(target, sourceId)
    }
  }

  killBrawler(target: BrawlerState, killerId: number) {
    target.dead = true
    target.deathT = 0
    target.hp = 0
    target.deaths++
    const killer = killerId >= 0 ? this.brawlers.find((x) => x.id === killerId) : undefined
    if (killer) killer.kills++

    this.particles.burst(target.pos, target.team === 1 ? '#ff6b5e' : '#5ea8ff', 26, {
      speed: 240, size: 6, life: 0.7, gravity: 240,
    })
    this.particles.burst(target.pos, '#ffffff', 10, { speed: 120, size: 4, life: 0.5 })
    this.tombstones.push(makeTombstone(target.pos, target.team))
    audio.kill()
    this.shake = Math.max(this.shake, 0.3)
    this.hitstop = Math.max(this.hitstop, 0.05)

    if (target.isPlayer) {
      this.pushEvent({ kind: 'lose', text: 'You got wrecked!', killerName: killer?.name })
    }

    // mode-specific consequences
    if (this.mode.id === 'gem') {
      // drop carried gems
      if (target.gems > 0) {
        for (let i = 0; i < target.gems; i++) {
          const a = rand(Math.PI * 2)
          const d = rand(10, 70)
          this.dropPickup(v(target.pos.x + Math.cos(a) * d, target.pos.y + Math.sin(a) * d), 'gem')
        }
        target.gems = 0
      }
      this.recalcTeamGems()
      target.respawnT = 2.5
      if (killer) {
        this.pushEvent({
          kind: 'kill',
          text: `${killer.name} ☠️ ${target.name}`,
          killerName: killer.name,
          victimName: target.name,
          team: killer.team,
        })
      }
    } else if (this.mode.id === 'bounty') {
      if (killer && killer.team !== target.team) {
        const kt = killer.team === 1 ? 1 : 0
        const gained = 1 + Math.min(target.stars, 6)
        this.teamStars[kt] += gained
        killer.stars = Math.min(killer.stars + gained, 7)
        this.pushEvent({
          kind: 'star',
          text: `${killer.name} ⭐ +${gained} stars!`,
          killerName: killer.name,
          victimName: target.name,
          team: killer.team,
        })
        target.stars = 1
        if (this.teamStars[kt] >= 10) {
          this.endMatch(killer.team === 0, false)
          return
        }
      }
      target.respawnT = 2.5
    } else if (this.mode.id === 'heist') {
      target.respawnT = 3
      if (killer) {
        this.pushEvent({
          kind: 'kill',
          text: `${killer.name} ☠️ ${target.name}`,
          killerName: killer.name,
          victimName: target.name,
          team: killer.team,
        })
      }
    } else if (this.mode.id === 'showdown') {
      // killer steals a cube, victim is out
      if (killer) {
        killer.cubes += 1
        this.particles.floatText(killer.pos, '+1 ⚡', '#ffd23f', 16)
        audio.cube()
        this.pushEvent({ kind: 'kill', text: `${killer.name} ☠️ ${target.name}` })
      } else {
        this.pushEvent({ kind: 'kill', text: `${target.name} was eliminated` })
      }
      this.placement++
      const alive = this.brawlers.filter((b) => !b.dead)
      if (target.isPlayer) {
        this.playerPlacement = alive.length + 1
        this.endShowdown(false)
        return
      }
      if (alive.length <= 1) {
        const winner = alive[0]
        if (winner.isPlayer) this.endShowdown(true)
        else this.endShowdown(false)
        return
      }
    }
  }

  damageSafe(team: number, amount: number, sourceId: number, hitPos: Vec) {
    const s = this.safes.find((x) => !x.dead && x.team === team)
    if (!s || s.dead) return
    s.hp -= amount
    s.hitFlash = 1
    s.shake = 0.3
    const source = this.brawlers.find((x) => x.id === sourceId)
    if (source) {
      source.damage += amount
      source.superCharge = Math.min(1, source.superCharge + amount / (source.def.superNeed * 2))
    }
    this.particles.floatText(hitPos, `${Math.round(amount)}`, '#ffd23f', 13)
    this.particles.sparkBurst(hitPos, '#ffd23f', 6, 120)
    if (Math.random() < 0.2) audio.hit()
    if (s.hp <= 0) {
      s.dead = true
      s.hp = 0
      audio.explosion()
      this.shake = Math.max(this.shake, 0.7)
      this.particles.burst(s.pos, '#ffb545', 40, { speed: 320, size: 7, life: 0.9, gravity: 260 })
      this.particles.burst(s.pos, '#ffffff', 20, { speed: 200, size: 5, life: 0.6 })
      this.pushEvent({
        kind: 'info',
        text: team === 1 ? '💰 ENEMY SAFE DESTROYED!' : '💥 YOUR SAFE IS DOWN!',
      })
      this.endMatch(team === 1, false)
    }
  }

  private updateSafes(dt: number) {
    for (const s of this.safes) {
      s.hitFlash = Math.max(0, s.hitFlash - dt * 6)
      s.shake = Math.max(0, s.shake - dt * 2)
    }
  }

  damageBox(box: BoxState, amount: number) {
    if (box.broken) return
    box.hp -= amount
    box.shake = 0.25
    if (box.hp <= 0) {
      box.broken = true
      audio.boxBreak()
      this.particles.burst(box.pos, '#a9713d', 16, { speed: 180, size: 5, life: 0.5, gravity: 300 })
      const drops = this.mode.id === 'showdown' ? 1 + (chance(0.5) ? 1 : 0) : 1
      for (let i = 0; i < drops; i++) {
        this.dropPickup(box.pos, 'cube')
      }
    }
  }

  // ================= PICKUPS =================
  dropPickup(pos: Vec, kind: 'gem' | 'cube') {
    this.pickups.push({
      id: NEXT_PICKUP++,
      pos: { ...pos },
      vel: v(rand(-40, 40), rand(-60, -10)),
      kind,
      t: 0,
      bornT: 0,
      color: kind === 'gem' ? '#b04dff' : '#ffd23f',
    })
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i]
      pk.t += dt
      pk.bornT += dt
      pk.pos.x += pk.vel.x * dt
      pk.pos.y += pk.vel.y * dt
      pk.vel.x *= Math.exp(-2 * dt)
      pk.vel.y *= Math.exp(-2 * dt)
      pk.pos.x = clamp(pk.pos.x, TILE / 2, this.map.w * TILE - TILE / 2)
      pk.pos.y = clamp(pk.pos.y, TILE / 2, this.map.h * TILE - TILE / 2)
      const tx = Math.floor(pk.pos.x / TILE)
      const ty = Math.floor(pk.pos.y / TILE)
      if (solidTile(tileAt(this.map, tx, ty))) {
        // push out of walls
        pk.pos.x = clamp(pk.pos.x, tx * TILE + 8, tx * TILE + TILE - 8)
        pk.pos.y = clamp(pk.pos.y, ty * TILE + 8, ty * TILE + TILE - 8)
      }
      if (pk.bornT < 0.4) continue // brief no-collect window (drops)
      if (pk.kind === 'gem' && pk.bornT > 9) continue
      // collection
      let taken = false
      for (const b of this.brawlers) {
        if (b.dead || b.leap) continue
        if (dist2(pk.pos, b.pos) < Math.pow(22, 2)) {
          if (pk.kind === 'gem') {
            b.gems++
            b.gemsCollected++
            if (b.isPlayer) audio.gem()
            this.particles.gemBurst(pk.pos, pk.color, 4)
            this.recalcTeamGems()
          } else {
            b.cubes++
            if (b.isPlayer) audio.cube()
            this.particles.burst(pk.pos, '#ffd23f', 8, { speed: 120, size: 5, life: 0.4, gravity: 200 })
            this.particles.floatText(b.pos, '+1 ⚡', '#ffd23f', 15)
          }
          taken = true
          break
        }
      }
      if (taken) {
        this.pickups.splice(i, 1)
      }
    }
  }

  recalcTeamGems() {
    this.teamGems = [0, 0]
    for (const b of this.brawlers) {
      if (!b.dead && b.team !== 2) (this.teamGems as number[])[b.team] += b.gems
    }
    // countdown bookkeeping
    if (this.gemTimer === null && this.phase === 'play') {
      if ((this.teamGems as number[])[0] >= 10 && (this.teamGems as number[])[1] < 10) {
        this.gemTimer = 15
        this.gemTimerTeam = 0
        this.pushEvent({ kind: 'countdown', text: '💎 Your team has 10 gems — SURVIVE 15s!', team: 0 })
        audio.superReady()
      } else if ((this.teamGems as number[])[1] >= 10 && (this.teamGems as number[])[0] < 10) {
        this.gemTimer = 15
        this.gemTimerTeam = 1
        this.pushEvent({ kind: 'countdown', text: '💎 Enemy has 10 gems — STOP THEM!', team: 1 })
      }
    }
  }

  // ================= BOXES =================
  private updateBoxes(dt: number) {
    for (const box of this.boxes) {
      box.shake = Math.max(0, box.shake - dt * 2)
    }
  }

  // ================= TURRETS =================
  private updateTurrets(dt: number) {
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i]
      t.life -= dt
      if (t.life <= 0 || t.hp <= 0) {
        this.particles.burst(t.pos, '#37e5ff', 14, { speed: 140, size: 5, life: 0.5 })
        this.turrets.splice(i, 1)
        continue
      }
      t.fireCd -= dt
      if (t.fireCd <= 0) {
        // find enemy in range
        let target: BrawlerState | null = null
        let bd = Infinity
        for (const b of this.brawlers) {
          if (b.dead) continue
          if (this.mode.id !== 'showdown' && b.team === t.team) continue
          if (this.mode.id === 'showdown' && b.id === t.owner) continue
          const d = dist(b.pos, t.pos)
          if (d < bd) {
            bd = d
            target = b
          }
        }
        if (target && bd < 8 * TILE && hasLineOfSight(this.map, t.pos, target.pos)) {
          t.fireCd = 0.45
          const a = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x) + rand(-0.03, 0.03)
          const vel = vecFromAngle(a, 760)
          const origin = v(t.pos.x, t.pos.y - 8)
          this.projectiles.push(spawnProjectile({
            kind: 'turret', ownerId: t.owner, ownerTeam: t.team,
            pos: { ...origin }, start: { ...origin },
            end: v(origin.x + vel.x * 8 * TILE / 760, origin.y + vel.y * 8 * TILE / 760),
            vel, damage: 300, splash: 0, pierce: 1, knock: 0,
            life: 8 * TILE / 760, maxLife: 8 * TILE / 760,
            color: '#37e5ff', size: 4,
          }))
          audio.shoot('smg')
        } else {
          t.fireCd = 0.15
        }
      }
    }
  }

  // ================= PUDDLES =================
  private updatePuddles(dt: number) {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.puddles.splice(i, 1)
        continue
      }
      for (const b of this.brawlers) {
        if (b.dead || (this.mode.id !== 'showdown' && b.team === p.team)) continue
        if (dist2(b.pos, p.pos) < Math.pow(52, 2)) {
          b.slowT = Math.max(b.slowT, 0.5)
        }
      }
    }
  }

  private updateTombstones() {
    if (this.tombstones.length > 40) this.tombstones.splice(0, this.tombstones.length - 40)
  }

  private updateEvents(dt: number) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      this.events[i].t += dt
      if (this.events[i].t > 4) this.events.splice(i, 1)
    }
  }

  pushEvent(e: Omit<GameEvent, 't'>) {
    const ev: GameEvent = { ...e, t: 0 }
    this.events.unshift(ev)
    if (this.events.length > 4) this.events.length = 4
    this.onEvent?.(ev)
  }

  // ================= GADGETS =================
  tryGadget(b: BrawlerState): boolean {
    if (b.dead || b.gadgetLeft <= 0 || b.gadgetCd > 0) {
      if (b.isPlayer) audio.hit()
      return false
    }
    b.gadgetLeft--
    b.gadgetCd = 6
    const g = b.def.gadget
    switch (g.kind) {
      case 'shield':
        b.shieldT = 3
        this.particles.burst(b.pos, '#8fd0ff', 14, { speed: 120, size: 5, life: 0.5 })
        this.particles.floatText(b.pos, '🛡️ -50% DMG', '#8fd0ff', 13)
        audio.heal()
        break
      case 'dash': {
        const dir = vecFromAngle(b.aim)
        b.dashT = 0.16
        b.dashDir = dir
        audio.dash()
        break
      }
      case 'overclock':
        b.reloadMulT = 6
        this.particles.floatText(b.pos, '⚡ FAST RELOAD', '#ffe14d', 13)
        audio.heal()
        break
      case 'roar': {
        audio.superUse()
        for (const e of this.brawlers) {
          if (e.dead || e.id === b.id) continue
          if (this.mode.id !== 'showdown' && e.team === b.team) continue
          if (dist(e.pos, b.pos) < 4 * TILE) {
            const away = norm(v(e.pos.x - b.pos.x, e.pos.y - b.pos.y))
            e.knockVx += away.x * 900
            e.knockVy += away.y * 900
          }
        }
        this.particles.burst(b.pos, '#ff8a5c', 16, { speed: 200, size: 6, life: 0.4 })
        break
      }
      case 'goo':
        this.puddles.push({ pos: { ...b.pos }, life: 4, maxLife: 4, team: b.team })
        this.particles.burst(b.pos, '#b04dff', 12, { speed: 100, size: 6, life: 0.6 })
        break
      case 'tonic':
        healBrawler(b, 1200)
        b.healPulse = 1
        this.particles.burst(b.pos, '#46ff9d', 12, { speed: 100, size: 5, life: 0.6, gravity: -60 })
        this.particles.floatText(b.pos, '+1200', '#46ff9d', 14)
        audio.heal()
        break
      case 'blink': {
        const dir = vecFromAngle(b.aim, 2.8 * TILE)
        let target = v(b.pos.x + dir.x, b.pos.y + dir.y)
        // walk back until passable
        const steps = Math.ceil(dist(b.pos, target) / 12)
        for (let i = steps; i >= 0; i--) {
          const t = i / steps
          const pos = v(lerp(b.pos.x, target.x, t), lerp(b.pos.y, target.y, t))
          const tx = Math.floor(pos.x / TILE)
          const ty = Math.floor(pos.y / TILE)
          if (!solidTile(tileAt(this.map, tx, ty))) {
            target = pos
            break
          }
        }
        this.particles.burst(b.pos, '#e0aaff', 10, { speed: 100, size: 5, life: 0.4 })
        b.pos = target
        this.particles.burst(target, '#e0aaff', 10, { speed: 100, size: 5, life: 0.4 })
        audio.dash()
        break
      }
      case 'ammo':
        b.ammo = b.def.ammoMax
        b.superCharge = Math.min(1, b.superCharge + 0.15)
        this.particles.floatText(b.pos, '🔋 AMMO!', '#ffe14d', 13)
        audio.heal()
        break
    }
    return true
  }

  // ================= LEAP LANDING =================
  private landLeap(b: BrawlerState) {
    if (!b.leap) return
    const lp = b.leap
    const pos = lp.target
    b.leap = null
    audio.explosion()
    this.shake = Math.max(this.shake, 0.5)
    this.particles.burst(pos, '#ffb545', 22, { speed: 260, size: 7, life: 0.6, gravity: 260 })
    const sup = b.def.super
    if (sup.kind !== 'leap') return
    for (const e of this.brawlers) {
      if (e.dead || e.id === b.id) continue
      if (this.mode.id !== 'showdown' && e.team === b.team) continue
      if (dist(e.pos, pos) < sup.splash) {
        this.damageBrawler(e, sup.damage, b.id, { knock: sup.knock, color: '#ffb545' })
      }
    }
    for (const box of this.boxes) {
      if (!box.broken && dist(pos, box.pos) < sup.splash + 10) this.damageBox(box, sup.damage)
    }
  }

  // ================= ENDING =================
  private endMatch(won: boolean, draw: boolean) {
    if (this.phase === 'ended') return
    this.phase = 'ended'
    this.endedT = 0
    const trophies = draw ? 0 : won ? 8 : -4
    // star player: most kills, then most damage
    let star: MatchResult['starPlayer'] = undefined
    let bestKills = 0
    let bestDamage = 0
    for (const b of this.brawlers) {
      if (b.kills > bestKills || (b.kills === bestKills && b.damage > bestDamage)) {
        bestKills = b.kills
        bestDamage = b.damage
        star = { name: b.name, isPlayer: b.isPlayer, kills: b.kills, damage: b.damage }
      }
    }
    const enemySafe = this.safes.find((s) => s.team === 1)
    const result: MatchResult = {
      mode: this.mode.id,
      won,
      draw,
      placement: 1,
      placementTotal: 2,
      trophies,
      kills: this.player?.kills ?? 0,
      deaths: this.player?.deaths ?? 0,
      damage: this.player?.damage ?? 0,
      gemsCollected: this.player?.gemsCollected ?? 0,
      stars: this.teamStars[0],
      duration: this.mode.duration - Math.max(0, this.timeLeft),
      safeDamage: enemySafe ? enemySafe.maxHp - enemySafe.hp : undefined,
      starPlayer: star,
    }
    this.result = result
    if (won) {
      audio.win()
      this.pushEvent({ kind: 'win', text: 'VICTORY! 🎉', team: 0 })
    } else if (draw) {
      this.pushEvent({ kind: 'draw', text: 'DRAW' })
    } else {
      audio.lose()
      this.pushEvent({ kind: 'lose', text: 'DEFEAT', team: 1 })
    }
    window.setTimeout(() => this.onEnd?.(result), 1600)
  }

  private endShowdown(won: boolean) {
    if (this.phase === 'ended') return
    this.phase = 'ended'
    this.endedT = 0
    const placement = won ? 1 : (this.playerPlacement ?? this.mode.teamSize)
    const trophies = won ? 10 : placement === 2 ? 6 : placement === 3 ? 4 : placement === 4 ? 2 : placement === 5 ? 1 : 0
    const result: MatchResult = {
      mode: 'showdown',
      won,
      draw: false,
      placement,
      placementTotal: this.mode.teamSize,
      trophies,
      kills: this.player?.kills ?? 0,
      deaths: this.player?.deaths ?? 0,
      damage: this.player?.damage ?? 0,
      gemsCollected: 0,
      stars: 0,
      duration: this.mode.duration - Math.max(0, this.timeLeft),
    }
    this.result = result
    if (won) {
      audio.win()
      this.pushEvent({ kind: 'win', text: 'VICTORY ROYALE! 👑', team: 2 })
    } else {
      audio.lose()
      this.pushEvent({ kind: 'lose', text: `#${placement} — ELIMINATED` })
    }
    window.setTimeout(() => this.onEnd?.(result), 1600)
  }

  private endShowdownTime() {
    // time's up: rank survivors by power cubes
    const p = this.player
    if (!p || p.dead) {
      this.endShowdown(false)
      return
    }
    const alive = this.brawlers.filter((b) => !b.dead)
    const better = alive.filter((b) => b.cubes > p.cubes).length
    this.playerPlacement = better + 1
    this.endShowdown(better === 0)
  }

  destroy() {
    audio.stopMusic()
    this.particles.clear()
  }
}

export { updateAI }
export type { AIData }
