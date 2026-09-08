import * as THREE from 'three'
import { MovementController, TUNE, CHAINS } from './Movement.js'
import { World } from './World.js'
import { VFX } from './VFX.js'
import { AudioKit } from './Audio.js'
import { CameraRig } from './Camera.js'
import { Input } from './Input.js'
import { Weapon, UtilitySlot, momentumScale } from './Weapons.js'
import { buildViewModel, buildCharacter, buildFighterModel } from './ViewModels.js'
import { Bot } from './Bot.js'
import { Match, ROUND_HP, FIRST_TO } from './Match.js'
import { MAP_BY_ID, MODES } from '../data/maps.js'
import { WEAPON_MAP, DEFAULT_LOADOUT } from '../data/weapons.js'
import { SKIN_MAP } from '../data/skins.js'
import { rollName, rollPing } from '../data/names.js'
import { MSG, FLAG } from '../net/Net.js'

const STEP = 1 / 120
const TEAM_COLORS = { a: 0x6ee7ff, b: 0xff8a3d }
const _dash = new THREE.Vector3()

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const _netA = new THREE.Vector3()
const _fx = new THREE.Vector3()
const _fxv = new THREE.Vector3()
const shortAngle = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d }
const lerp = (a, b, t) => a + (b - a) * t

// ════════════════════════════════════════════════════════════════════════════
class Fighter {
  constructor (game, opts) {
    this.game = game
    this.team = opts.team
    this.name = opts.name
    this.isBot = !!opts.isBot
    this.mv = new MovementController(game.world.physics)
    this.input = { forward: 0, right: 0, jump: false, crouch: false, slide: false, sprint: false, jumpPressed: false, crouchPressed: false, slidePressed: false, dashPressed: false }
    this.maxHealth = ROUND_HP
    this.health = ROUND_HP
    this.alive = true
    this.respawnTimer = 0
    this.loadout = opts.loadout || { ...DEFAULT_LOADOUT }
    this.skin = opts.skin
    this.weapons = {
      primary: new Weapon(this.loadout.primary, this.skin),
      secondary: new Weapon(this.loadout.secondary, this.skin),
      melee: new Weapon(this.loadout.melee, this.skin),
    }
    // the dash is everyone's: one charge, and the DASH CHARGE gear makes it two
    this.dashMax = 1
    this.dashCharges = 1
    this.dashCd = 0
    this.dashCdMax = 3.2
    this.utility = new UtilitySlot(this.loadout.utility)
    this.syncDashGear()
    this.slot = 'primary'
    this.prevSlot = 'secondary'
    this.wantFire = false
    this.wantFirePressed = false
    this.wantFireReleased = false
    this.wantAds = false
    this.requestReload = false
    this.stats = { kills: 0, deaths: 0, damage: 0, headshots: 0, best: 0, shots: 0, hits: 0, topSpeed: 0, assists: 0 }
    this.haste = 0
    this.slow = 0
    this.hook = null
    this.lastAttacker = null
    this.flashTime = 0
    this.hitFlash = 0
    this.switchTimer = 0
    this.stepPhase = 0
    this.spawnGuard = 0

    this.model = buildFighterModel(TEAM_COLORS[this.team], this.isBot, WEAPON_MAP[this.loadout.primary])
    game.world.scene.add(this.model)
    this.radius = 0.42
    this.ping = rollPing()
  }

  // Equipping DASH CHARGE does not give you a button — it makes the button
  // better: an extra charge, a faster recharge, and a harder shove.
  syncDashGear () {
    const st = this.utility?.def?.stats
    const geared = !!st && st.type === 'self' && st.impulse > 0
    this.dashGear = geared
    this.dashMax = geared ? 2 : 1
    this.dashCdMax = geared ? 2.4 : 3.2
    this.dashCharges = this.dashMax
    this.dashCd = 0
  }

  refillDash () {
    this.dashCharges = this.dashMax
    this.dashCd = 0
  }

  get weapon () { return this.weapons[this.slot] }
  get eyeY () { return this.mv.pos.y + this.mv.height * 0.92 }
  get speedMul () {
    let m = this.weapon.def.stats.speed ?? 1
    if (this.haste > 0) m *= 1.35
    if (this.slow > 0) m *= 0.62
    return m
  }

  capsule (out) {
    const p = this.mv.pos
    out.a.set(p.x, p.y + this.radius * 0.85, p.z)
    out.b.set(p.x, p.y + this.mv.height - this.radius * 0.85, p.z)
    return out
  }

  applyDamage (amount, from, head, dir) {
    if (!this.alive) return 0
    if (this.spawnGuard > 0 && from && from !== this) return 0
    const dmg = Math.round(amount)
    this.health -= dmg
    this.hitFlash = 1
    this.flinch = 0
    this.lastAttacker = from
    if (from && from !== this) {
      this.credit = this.credit || []
      if (!this.credit.some((c) => c.f === from)) this.credit.push({ f: from, t: this.game.time })
    }
    if (from && from !== this) from.stats.damage += dmg
    if (this.health <= 0) {
      this.health = 0
      this.game.killFighter(this, from, head)
    }
    this.flinch = Math.min(1, 0.5 + dmg / 110)
    const bp = this._hitPoint || new THREE.Vector3(this.mv.pos.x, this.mv.pos.y + 1.2, this.mv.pos.z)
    if (dir) this.game.vfx.bloodPuff(bp, dir)
    this._hitPoint = null
    return dmg
  }

  respawn (pos, yaw) {
    this.mv.reset(pos, yaw)
    // never spawn inside geometry — nudge up until clear
    for (let i = 0; i < 10 && this.game.world.physics.overlaps(this.mv.pos, this.mv.radius, this.mv.height); i++) {
      this.mv.pos.y += 0.2
    }
    this.mv.grounded = true
    this.health = this.maxHealth
    this.alive = true
    if (this.game?.netState) this.game.netState.sentKill = false
    this.spawnGuard = this.isDummy ? 0 : 0.9   // brief shield so nobody is spawn-killed
    this.haste = 0
    this.slow = 0
    this.flashTime = 0
    this.model.visible = true
    this.slot = 'primary'
    for (const k of ['primary', 'secondary', 'melee']) this.weapons[k].reset(true)
    this.utility.reset()
    this.refillDash()
    this.hook = null
  }

  dispose () { this.game.world.scene.remove(this.model) }
}

// ════════════════════════════════════════════════════════════════════════════
export class Game {
  constructor (canvas, opts = {}) {
    this.canvas = canvas
    this.opts = opts
    this.onHud = opts.onHud || (() => {})
    this.onEvent = opts.onEvent || (() => {})
    this.settings = opts.settings || {}
    this.running = false
    this.time = 0
    this.acc = 0
    this.fps = 60
    this._fpsAcc = 0
    this._fpsN = 0

    // renderer is injectable so the whole simulation can be tested headlessly
    const makeRenderer = opts.rendererFactory || ((c) => new THREE.WebGLRenderer({ canvas: c, antialias: true, powerPreference: 'high-performance' }))
    this.renderer = makeRenderer(canvas)
    if ('toneMapping' in this.renderer) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = this.exposureFor(this.settings.brightness ?? 1)
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.quality === 'high' ? 2 : 1.35))
    this.renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720, false)

    this.camera = new THREE.PerspectiveCamera(95, 16 / 9, 0.05, 600)
    this.rig = new CameraRig(this.camera)
    this.rig.baseFov = this.settings.fov ?? 95

    // viewmodel gets its own scene + camera so it can never clip into walls
    this.vmScene = new THREE.Scene()
    this.vmCamera = new THREE.PerspectiveCamera(58, 16 / 9, 0.01, 12)
    this.vmScene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a2f38, 1.5))
    const vmLight = new THREE.DirectionalLight(0xffffff, 1.4)
    vmLight.position.set(1.2, 2, 1.6)
    this.vmScene.add(vmLight)
    this.vmRoot = new THREE.Group()
    this.vmScene.add(this.vmRoot)

    this.input = new Input()
    this.input.sensitivity = this.settings.sensitivity ?? 1
    this.input.attach(canvas)
    this.audio = new AudioKit()
    this.audio.enabled = this.settings.sound !== false
    this.audio.setVolume(this.settings.volume ?? 0.7)

    this.fighters = []
    this.projectiles = []
    this.placeables = []
    this.lastRoundWin = null
    this.killfeed = []
    this.scoreboard = false
    this.hitDirs = []          // damage-direction pings
    this.banners = []          // DOUBLE KILL / MATCH POINT / …
    this.killStreak = 0
    this.killStreakT = 0
    this.firstBlood = false
    this.spectate = null
    this.killCam = null
    this.hitmarker = 0
    this.killHit = 0
    this.hitStop = 0
    this.slowmo = 0
    this.plates = new Map()
    this.platesEnabled = typeof document !== 'undefined' && typeof document.createElement === 'function'
    this.renderScale = 1
    this.basePR = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, this.settings.quality === 'high' ? 2 : 1.35)
    this._qT = 2.5
    this._plateT = 0
    this._pv = new THREE.Vector3()
    this.vm = null
    this.vmState = { sway: new THREE.Vector2(), kick: new THREE.Vector3(), kickVel: new THREE.Vector3(), swing: 0, swingDir: 1, reload: 0 }
    this._cap = { a: new THREE.Vector3(), b: new THREE.Vector3() }
    this._from = new THREE.Vector3()
    this._dir = new THREE.Vector3()
    this.lastHitWasHead = false
    this.damageFlash = 0
    this.hudAcc = 0

    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
  }

  // ── lifecycle ────────────────────────────────────────────────────────────
  // Brightness is a player setting: 1.0 is the look the art was tuned for.
  exposureFor (b) { return 1.14 * (0.55 + 0.45 * (b ?? 1)) }

  setBrightness (b) {
    this.settings.brightness = b
    if (this.world) this.world.setBrightness(b)
    if ('toneMapping' in this.renderer) this.renderer.toneMappingExposure = this.exposureFor(b)
  }

  load (config) {
    const { mapId, modeId, loadout, skin, botLevel, teamBots, net, netRole, peerName } = config
    this.config = config
    this.net = net || null
    this.netRole = netRole || null
    this.netState = net ? {
      hello: null, remoteHello: null, buf: [], recent: [], lastHello: 0, sentKill: false,
      clock: null, winBest: Infinity, winStart: 0, jitter: 0, late: 0, delay: 70, seen: null, shown: null,
    } : null
    this.netPing = 0
    this.map = MAP_BY_ID[mapId] || MAP_BY_ID.yard
    this.mode = MODES.find((m) => m.id === modeId) || MODES[0]
    this.skin = SKIN_MAP[skin] || SKIN_MAP.stock
    this.world = new World(this.map)
    this.world.setBrightness(this.settings.brightness ?? 1)
    this.vfx = new VFX(this.world.scene)
    this.playerLoadout = loadout || { ...DEFAULT_LOADOUT }

    // player
    this.playerName = config.playerName || (this.netRole === 'host' ? 'HOST' : this.netRole === 'guest' ? 'GUEST' : 'YOU')
    this.player = new Fighter(this, { team: 'a', name: this.net ? this.playerName : 'YOU', loadout: this.playerLoadout, skin: this.skin })
    this.fighters = [this.player]
    this.bots = []

    if (this.mode.id === 'range') {
      // target dummies: they stand their ground and let you test everything
      const spots = [[-10, 15], [-3, 15], [4, 15], [11, 15], [-6, 0], [3, 0], [-8, -20], [6, -20]]
      spots.forEach((p, i) => {
        const f = new Fighter(this, { team: 'b', name: 'DUMMY-' + (i + 1), isBot: true, loadout: { ...DEFAULT_LOADOUT }, skin: SKIN_MAP.stock })
        f.respawn(new THREE.Vector3(p[0], 0.4, p[1]), Math.PI)
        f.isDummy = true
        f.home = new THREE.Vector3(p[0], 0.4, p[1])
        f.homeYaw = Math.PI
        this.fighters.push(f)
        const b = new Bot(f, 'easy')
        f.bot = b
        b.dummy = true
        this.bots.push(b)
      })
    }

    // ── netplay: the opponent is a real person, not a bot ──────────────────
    if (this.net) {
      const foe = new Fighter(this, {
        team: 'b', name: peerName || 'GUEST', isBot: true, loadout: { ...DEFAULT_LOADOUT }, skin: SKIN_MAP.stock,
      })
      foe.isRemote = true
      foe.model.visible = false
      this.fighters.push(foe)
      this.remote = foe
      this.netSay(MSG.hello(this.playerName || 'HOST', this.playerLoadout, skin))
    }

    const teamSize = this.net ? 0 : this.mode.teamB
    const botsNeeded = this.net ? 0 : this.mode.bots
    // enemy team: bots (or human-shaped bots in PvP modes we fill with bots anyway)
    for (let i = 0; i < teamSize; i++) {
      const f = new Fighter(this, {
        team: 'b', name: rollName(), isBot: true,
        loadout: randomLoadout(), skin: randomSkin(),
      })
      this.fighters.push(f)
      const b = new Bot(f, botLevel || 'normal')
      f.bot = b
      this.bots.push(b)
    }
    // friendly bots (1 + bot / 1 + 2 bots modes)
    const friendlyBots = this.net ? 0 : Math.max(0, this.mode.teamA - 1)
    for (let i = 0; i < friendlyBots; i++) {
      const f = new Fighter(this, {
        team: 'a', name: rollName(), isBot: true,
        loadout: randomLoadout(), skin: randomSkin(),
      })
      this.fighters.push(f)
      const b = new Bot(f, botLevel || 'normal')
      f.bot = b
      this.bots.push(b)
    }

    this.match = new Match(this, this.mode)
    this.buildViewModelFor('primary')
    this.spawnAll()
    this.match.begin()
    this.rig.reset(0)
    this.resize()
    this.pushHud()          // first HUD snapshot straight away, even before the first frame
    return this
  }

  // swap weapons without restarting (shooting range)
  applyLoadout (loadout) {
    const f = this.player
    f.loadout = { ...loadout }
    f.weapons.primary = new Weapon(loadout.primary, this.skin)
    f.weapons.secondary = new Weapon(loadout.secondary, this.skin)
    f.weapons.melee = new Weapon(loadout.melee, this.skin)
    f.utility = new UtilitySlot(loadout.utility)
    f.syncDashGear()
    f.slot = 'primary'
    this.buildViewModelFor('primary')
  }

  dispose () {
    this.stop()
    for (const p of this.plates.values()) {
      this.world.scene.remove(p.sp)
      p.sp.material.map?.dispose?.()
      p.sp.material.dispose?.()
    }
    this.plates.clear()
    // take our own objects out of the scene before the world tears itself down
    for (const f of this.fighters) if (f.model) this.world.scene.remove(f.model)
    try { this.vfx?.clear() } catch (e) {}
    try { this.input?.detach?.() } catch (e) {}
    window.removeEventListener('resize', this._onResize)
    if (this.world) this.world.dispose()
    this.renderer.dispose()
  }

  resize () {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.vmCamera.aspect = w / h
    this.vmCamera.updateProjectionMatrix()
  }

  setPaused (v) { this.paused = v; if (v) { this.hudAcc = 1; this.pushHud() } }

  applyRenderScale () {
    if (!this.renderer.setPixelRatio) return
    this.renderer.setPixelRatio(this.basePR * this.renderScale)
    this.resize()
  }

  // ── nameplates over team-mates and dummies ───────────────────────────────
  plateFor (f) {
    let p = this.plates.get(f)
    if (p) return p
    const c = document.createElement('canvas')
    c.width = 256; c.height = 84
    const tex = new THREE.CanvasTexture(c)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }))
    sp.renderOrder = 990
    this.world.scene.add(sp)
    p = { f, canvas: c, ctx: c.getContext('2d'), tex, sp, hp: -1, shown: true }
    this.plates.set(f, p)
    this.drawPlate(p)
    return p
  }

  drawPlate (p) {
    const f = p.f
    const x = p.ctx
    const c = p.canvas
    x.clearRect(0, 0, c.width, c.height)
    const w = 190, h = 11, x0 = (c.width - w) / 2
    x.fillStyle = 'rgba(6,9,13,.62)'
    x.fillRect(x0 - 2, 50, w + 4, h + 4)
    const pct = Math.max(0, Math.min(1, f.health / f.maxHealth))
    x.fillStyle = pct > 0.5 ? '#39d98a' : pct > 0.25 ? '#ffd166' : '#ff4d6d'
    x.fillRect(x0, 52, w * pct, h)
    x.strokeStyle = 'rgba(255,255,255,.22)'
    x.strokeRect(x0 - 0.5, 51.5, w + 1, h + 1)
    x.font = '700 27px ui-monospace, SFMono-Regular, Menlo, monospace'
    x.textAlign = 'center'
    x.fillStyle = f.isDummy ? '#b388ff' : f.team === 'a' ? '#6ee7ff' : '#ff8a3d'
    x.fillText(f.name, c.width / 2, 38)
    p.tex.needsUpdate = true
  }

  updatePlates (dt) {
    if (!this.platesEnabled) return
    this._plateT -= dt
    const check = this._plateT <= 0
    if (check) this._plateT = 0.12
    const eye = this.camera.position
    for (const f of this.fighters) {
      const show = f.alive && f !== this.player && (f.team === this.player.team || f.isDummy)
      if (!show) { const p = this.plates.get(f); if (p) p.sp.visible = false; continue }
      const d = f.mv.pos.distanceTo(eye)
      const p = this.plates.get(f) || this.plateFor(f)
      if (d > 85) { p.sp.visible = false; continue }
      if (check) {
        this._pv.set(f.mv.pos.x, f.mv.pos.y + 1.85, f.mv.pos.z).sub(eye)
        const len = this._pv.length() || 1
        this._pv.divideScalar(len)
        p.shown = !this.world.physics.raycast(eye, this._pv, len - 0.5)
      }
      p.sp.visible = p.shown && !this.scoreboard
      if (!p.sp.visible) continue
      p.sp.position.set(f.mv.pos.x, f.mv.pos.y + 2.1 + Math.min(0.6, d * 0.012), f.mv.pos.z)
      const s = 0.0075 * d
      p.sp.scale.set(2.4 * s, 0.8 * s, 1)
      if (Math.abs(p.hp - f.health) > 0.9) { p.hp = f.health; this.drawPlate(p) }
    }
  }

  renderWorld () {
    this.renderer.render(this.world.scene, this.camera)
    this.renderer.autoClear = false
    this.renderer.clearDepth()
    this.renderer.render(this.vmScene, this.vmCamera)
    this.renderer.autoClear = true
  }

  start () {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (now) => {
      if (!this.running) return
      this.frame(now)
      this._raf = requestAnimationFrame(loop)
    }
    this._raf = requestAnimationFrame(loop)
  }
  stop () { this.running = false; if (this._raf) cancelAnimationFrame(this._raf) }

  emit (type, data) { this.onEvent(type, data) }

  // ── main loop ────────────────────────────────────────────────────────────
  frame (now) {
    const raw = (now - this.last) / 1000
    this.last = now
    const dt = Math.min(0.05, raw)
    if (this.paused) {
      // paused still renders and still feeds the HUD — the pause menu lives in React
      this.input.endFrame()
      this.renderWorld()
      this.hudAcc += dt
      if (this.hudAcc > 1 / 20) { this.hudAcc = 0; this.pushHud() }
      return
    }
    this._fpsAcc += raw; this._fpsN++
    if (this._fpsAcc > 0.35) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0 }
    // dynamic resolution: drop pixels before dropping frames
    if (this.settings.adaptive !== false) {
      this._qT -= raw
      if (this._qT <= 0) {
        this._qT = 2.5
        if (this.fps < 45 && this.renderScale > 0.62) { this.renderScale = Math.max(0.6, this.renderScale - 0.15); this.applyRenderScale() }
        else if (this.fps > 105 && this.renderScale < 1) { this.renderScale = Math.min(1, this.renderScale + 0.1); this.applyRenderScale() }
      }
    }

    // hit-stop on a kill, and a longer beat when a round ends. Never in
    // netplay — a peer's clock is not ours to stretch.
    let scale = 1
    if (this.slowmo > 0) {
      this.slowmo = Math.max(0, this.slowmo - dt)
      scale = 0.45
    } else if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt)
      scale = 0.3
    }
    this.acc += dt * scale
    let steps = 0
    while (this.acc >= STEP && steps < 8) { this.fixedStep(STEP); this.acc -= STEP; steps++ }
    if (steps === 8) this.acc = 0

    this.renderFrame(dt)
  }

  fixedStep (dt) {
    this.time += dt
    const live = this.match.phase === 'live'
    if (this.net) this.stepNet(dt)
    if (this.killHit > 0) this.killHit = Math.max(0, this.killHit - dt)
    if (this.killStreakT > 0) { this.killStreakT -= dt; if (this.killStreakT <= 0) this.killStreak = 0 }
    for (const f of this.fighters) if (f.spawnGuard > 0) f.spawnGuard -= dt
    for (let i = this.hitDirs.length - 1; i >= 0; i--) if ((this.hitDirs[i].t -= dt) <= 0) this.hitDirs.splice(i, 1)
    if (this.killCam) { this.killCam.t -= dt; if (this.killCam.t <= 0) this.killCam = null }
    // bots
    for (const b of this.bots) if (live || this.mode.id === 'range') b.update(dt, this)
    // fighters
    for (const f of this.fighters) this.stepFighter(f, dt, live)
    // projectiles + placeables
    this.stepProjectiles(dt)
    this.stepPlaceables(dt)
    this.vfx.update(dt)
    if (!this.net || this.netRole === 'host') this.match.update(dt)
    if (this.mode.id !== 'range') this.checkFallOut()
  }

  stepFighter (f, dt, live) {
    if (f.isRemote) return          // network owns this one
    if (!f.alive) {
      f.respawnTimer -= dt
      if (f.respawnTimer <= 0 && (this.mode.id === 'range' || f.isDummy)) this.respawnFighter(f)
      return
    }
    if (this.mode.id === 'range' && f === this.player) {
      for (const k of ['primary', 'secondary', 'melee']) {
        const w = f.weapons[k]
        if (w.reserve < w.def.stats.reserve) w.reserve = w.def.stats.reserve
      }
    }
    f.haste = Math.max(0, f.haste - dt)
    f.slow = Math.max(0, f.slow - dt)
    f.flashTime = Math.max(0, f.flashTime - dt)
    f.hitFlash = Math.max(0, f.hitFlash - dt * 3)
    f.switchTimer = Math.max(0, f.switchTimer - dt)
    f.mv.speedMult = f.speedMul
    // dash charges tick back one at a time
    if (f.dashCharges < f.dashMax) {
      f.dashCd -= dt
      if (f.dashCd <= 0) {
        f.dashCharges++
        f.dashCd = f.dashCharges < f.dashMax ? f.dashCdMax : 0
      }
    }

    if (f === this.player) this.readPlayerInput(f, dt, live)
    else f.wantFirePressed = f.wantFire && !f._prevFire
    f._prevFire = f.wantFire

    if (f.wantDash || f.input.dashPressed) {
      f.wantDash = false
      f.input.dashPressed = false
      this.tryDash(f, live || this.mode.id === 'range')
    }
    const canAct = live || this.mode.id === 'range'
    const w = f.weapon
    w.update(dt, {
      speed: f.mv.horizontalSpeed,
      grounded: f.mv.grounded,
      sliding: f.mv.sliding,
      crouching: f.mv.crouching,
      wantAds: f.wantAds && canAct,
      wantFire: f.wantFire && canAct,
      t: this.time,
    })
    f.utility.update(dt)

    // recoil recovery is spent before the shot, so a tap after a pause is honest
    const rec = w.takeRecovery()
    if (rec) this.applyAimKick(f, rec)

    if (canAct) {
      if (f.requestReload) { if (w.startReload()) this.audio.reload(); f.requestReload = false }
      const shot = w.tryFire({
        t: this.time,
        speed: f.mv.horizontalSpeed,
        grounded: f.mv.grounded,
        sliding: f.mv.sliding,
        crouching: f.mv.crouching,
        wantFire: f.wantFire,
        wantFirePressed: f.wantFirePressed,
        wantFireReleased: f.wantFireReleased,
      })
      if (shot) this.fireWeapon(f, shot)
      const kick = w.takeKick()          // the climb lands AFTER the bullet leaves
      if (kick) this.applyAimKick(f, kick)
      // auto reload when dry
      if (!w.isMelee && w.ammo === 0 && !w.reloading && w.reserve > 0 && f !== this.player) f.requestReload = true
    }

    // hook pull
    if (f.hook && f.hook.active) {
      const d = new THREE.Vector3().subVectors(f.hook.point, f.mv.pos)
      const len = d.length()
      if (len < 2.2 || f.hook.life <= 0) { f.hook.active = false; f.hook = null }
      else {
        d.normalize()
        const pull = f.hook.pull
        f.mv.vel.addScaledVector(d, pull * dt)
        if (f.mv.vel.y > 0) f.mv.vel.y *= 0.985
        f.hook.life -= dt
      }
    }

    if (f.mv.horizontalSpeed > (f.stats.topSpeed || 0)) f.stats.topSpeed = f.mv.horizontalSpeed
    const before = f.mv.grounded
    f.mv.step(dt, f.input)
    this.chainWatch(f)
    if (f.mv.grounded && !before && f.mv.lastFallSpeed > 4) {
      this.audio.land(clamp(f.mv.lastFallSpeed / 12, 0, 1))
      // a hard landing throws a ring of dust — you can see the impact
      const hard = clamp(f.mv.lastFallSpeed / 12, 0, 1)
      for (let i = 0; i < 5 + hard * 9; i++) {
        const a = (i / (5 + hard * 9)) * Math.PI * 2 + Math.random()
        _fx.set(f.mv.pos.x + Math.cos(a) * 0.3, f.mv.pos.y + 0.05, f.mv.pos.z + Math.sin(a) * 0.3)
        _fxv.set(Math.cos(a) * (1.4 + hard * 3), 0.7 + Math.random() * 1.2, Math.sin(a) * (1.4 + hard * 3))
        this.vfx.particle(_fx, _fxv, 0xd7e2ee, 0.11 + hard * 0.07, 0.45 + hard * 0.4, 6, 2.2)
      }
    }
    // the dive starts with a rush of air you can see go past you
    if (f.mv.diving && !f._wasDiving) {
      this.audio.dive()
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2
        const rad = 0.2 + Math.random() * 0.5
        _fx.set(f.mv.pos.x + Math.cos(a) * rad, f.mv.pos.y + 0.2 + Math.random() * 1.3, f.mv.pos.z + Math.sin(a) * rad)
        _fxv.set(Math.cos(a) * 0.6, 3.4 + Math.random() * 2.6, Math.sin(a) * 0.6)
        this.vfx.particle(_fx, _fxv, 0xbfe9ff, 0.1, 0.42, 3, 0.6)
      }
    }
    f._wasDiving = f.mv.diving
    this.groundFx(f, dt)
    // footsteps
    if (f.mv.grounded && f.mv.horizontalSpeed > 1.5) {
      f.stepPhase += f.mv.horizontalSpeed * dt
      if (f.stepPhase > 2.4) {
        f.stepPhase = 0
        if (f !== this.player) {
          // quiet bots
        } else if (!f.mv.sliding) this.audio.step(clamp(f.mv.horizontalSpeed / 10, 0.2, 1))
        else this.audio.slide()
      }
    }
    if (f.mv.sliding && f === this.player && Math.random() < dt * 6) this.audio.slide()

    // model
    f.flinch = Math.max(0, (f.flinch || 0) - dt * 4.5)
    f.model.position.set(f.mv.pos.x, f.mv.pos.y, f.mv.pos.z)
    const visYaw = f === this.player ? this.rig.yaw : f.mv.yaw
    f.model.rotation.order = 'YXZ'
    f.model.rotation.y = visYaw + Math.PI
    f.model.rotation.x = -(f.flinch || 0) * 0.26      // you can see a hit land
    const squash = f.mv.sliding ? 0.55 : f.mv.crouching ? 0.72 : 1
    f.model.scale.set(1, squash, 1)
    f.model.visible = f.alive && f !== this.player
    if (f !== this.player) f.mv.pitch = clamp(f.mv.pitch, -1.2, 1.2)
  }

  // ── player input ─────────────────────────────────────────────────────────
  readPlayerInput (f, dt, live) {
    const inp = this.input
    const sens = 0.0022 * (inp.sensitivity ?? 1) * (f.weapon.ads > 0.1 ? 0.72 : 1)
    f.mv.yaw -= inp.mouse.dx * sens
    f.mv.pitch -= inp.mouse.dy * sens * (this.settings.invertY ? -1 : 1)
    f.mv.pitch = clamp(f.mv.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02)
    if (f.mv.yaw > Math.PI) f.mv.yaw -= Math.PI * 2
    if (f.mv.yaw < -Math.PI) f.mv.yaw += Math.PI * 2

    const m = inp.moveFrame()
    f.input.forward = m.forward
    f.input.right = m.right
    f.input.jump = m.jump
    f.input.crouch = m.crouch
    f.input.sprint = m.sprint
    f.input.jumpPressed = m.jumpPressed
    f.input.crouchPressed = m.crouchPressed
    f.input.slide = m.slide
    f.input.slidePressed = m.slidePressed
    f.input.mouseDx = inp.mouse.dx

    f.wantFire = inp.mouseButtons[0] && live
    f.wantAds = inp.mouseButtons[2] && live
    f.wantFirePressed = inp.mousePressed[0] && live
    f.wantFireReleased = false
    f.wantFireHeld = inp.mouseButtons[0]

    if (inp.hit('KeyQ')) f.wantDash = true          // the dash lives on Q
    if (inp.hit('KeyR')) f.requestReload = true
    if (inp.hit('Digit1')) this.switchSlot('primary')
    if (inp.hit('Digit2')) this.switchSlot('secondary')
    if (inp.hit('Digit3')) this.switchSlot('melee')
    if (inp.hit('KeyX')) this.switchSlot(f.prevSlot)   // Q is the dash now
    if (inp.hit('KeyF') || inp.hit('KeyG')) this.useUtility(f)
    if (inp.wheel) {
      const order = ['primary', 'secondary', 'melee']
      const i = order.indexOf(f.slot)
      this.switchSlot(order[(i + (inp.wheel > 0 ? 1 : order.length - 1)) % order.length])
    }
    // scoreboard: hold V or TAB
    const board = inp.down('KeyV') || inp.down('Tab')
    if (board !== this.scoreboard) { this.scoreboard = board; this.emit('scoreboard', board) }
  }

  switchSlot (slot) { this.switchSlotFor(this.player, slot) }

  switchSlotFor (f, slot) {
    if (!f.alive || f.slot === slot || f.switchTimer > 0) return
    f.prevSlot = f.slot
    f.slot = slot
    f.switchTimer = 0.32
    f.weapons[f.prevSlot].cancelReload()
    if (f === this.player) { this.buildViewModelFor(slot); this.audio.beep() }
  }

  // ── the dash (Q) ──────────────────────────────────────────────────────────
  // Everyone has one. It adds to the speed you already have, only partly goes
  // where your keys point, and works in the air — so it is a way to spend
  // momentum well rather than a get-out-of-jail card.
  dashDir (f, out) {
    const yaw = f.mv.yaw
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
    const rx = Math.cos(yaw), rz = -Math.sin(yaw)
    let dx = fx * (f.input.forward || 0) + rx * (f.input.right || 0)
    let dz = fz * (f.input.forward || 0) + rz * (f.input.right || 0)
    let l = Math.hypot(dx, dz)
    if (l < 0.01) { dx = fx; dz = fz; l = 1 }
    out.set(dx / l, 0, dz / l)
    return out
  }

  tryDash (f, allowed) {
    if (!allowed || !f.alive || f.mv.dashWindow > 0) return false
    if (f.dashCharges <= 0) {
      if (f === this.player) this.audio.ui(false)
      return false
    }
    const dir = this.dashDir(f, _dash)
    let impulse = TUNE.dashImpulse
    let floor = TUNE.dashFloor
    // DASH CHARGE gear: a harder shove, and it does not cost your charge
    if (f.dashGear && f.utility && f.utility.canUse()) {
      impulse *= 1.45
      floor += 2.2
      f.utility.consume()
    }
    f.mv.dash(dir.x, dir.z, impulse, floor)
    if (f.mv.grounded) f.mv.vel.y = Math.max(f.mv.vel.y, 2.2)
    f.dashCharges--
    if (f.dashCd <= 0) f.dashCd = f.dashCdMax
    if (f.mv.sliding) f.mv.endSlide()
    this.vfx.burst(new THREE.Vector3(f.mv.pos.x, f.mv.pos.y + 0.9, f.mv.pos.z),
      14, f.dashGear ? 0xffd166 : 0x6ee7ff, 5, 0.1, 0.45, 9)
    this.audio.dash()
    if (f === this.player) this.emit('dash', { charges: f.dashCharges, max: f.dashMax })
    else if (this.net && this.netRole === 'host') this.netSay(MSG.fx('dash', f.mv.pos.x, f.mv.pos.y, f.mv.pos.z))
    return true
  }

  useUtility (f) {
    const u = f.utility
    if (!u.canUse()) return
    const s = u.def.stats
    if (s.type === 'throw') {
      const dir = this.aimDir(f)
      const from = this.aimOrigin(f).addScaledVector(dir, 0.5)
      this.spawnProjectile({
        pos: from, vel: dir.clone().multiplyScalar(22).add(new THREE.Vector3(f.mv.vel.x * 0.5, 2.5, f.mv.vel.z * 0.5)),
        def: u.def, owner: f, fuse: s.fuse, bounce: 0.32, grav: 20, radius: 0.22,
      })
      this.audio.ui(true)
    } else if (s.type === 'self') {
      if (s.heal) f.health = Math.min(f.maxHealth, f.health + s.heal)
      if (s.haste) f.haste = s.hasteTime
      if (s.impulse) {
        const dir = new THREE.Vector3(-Math.sin(f.mv.yaw), 0, -Math.cos(f.mv.yaw))
        if (f.input.forward < 0) dir.multiplyScalar(-1)
        const side = new THREE.Vector3(Math.cos(f.mv.yaw), 0, -Math.sin(f.mv.yaw)).multiplyScalar(f.input.right)
        dir.add(side).normalize()
        f.mv.vel.x += dir.x * s.impulse
        f.mv.vel.z += dir.z * s.impulse
        f.mv.vel.y = Math.max(f.mv.vel.y, 2.4)
      }
      this.vfx.burst(new THREE.Vector3(f.mv.pos.x, f.mv.pos.y + 1, f.mv.pos.z), 14, s.color, 4, 0.1, 0.5, 6)
      this.audio.beep()
    } else if (s.type === 'hook') {
      const dir = this.aimDir(f)
      this.spawnProjectile({
        pos: this.aimOrigin(f).addScaledVector(dir, 0.5),
        vel: dir.clone().multiplyScalar(70), def: u.def, owner: f, fuse: 1.4,
        grav: 0, radius: 0.12, hook: true,
      })
      this.audio.melee()
    } else if (s.type === 'place') {
      const dir = this.aimDir(f)
      const origin = this.aimOrigin(f)
      const hit = this.world.physics.raycast(origin, dir, 8)
      const p = hit ? hit.point.clone() : origin.clone().addScaledVector(dir, 3)
      p.y = Math.max(this.map.killY ?? -20, p.y)
      if (u.def.id === 'barrier') this.placeBarrier(p, f)
      else this.placeMine(p, f)
      this.audio.ui(true)
    }
    u.consume()
  }

  // ── feedback helpers ─────────────────────────────────────────────────────
  banner (text, kind = 'info', time = 1.7) {
    this.banners.push({ id: 'b' + (this._bid = (this._bid || 0) + 1), text, kind, t: time })
    if (this.banners.length > 3) this.banners.shift()
  }

  addHitDir (fromPos) {
    const p = this.player
    const dx = fromPos.x - p.mv.pos.x
    const dz = fromPos.z - p.mv.pos.z
    const fx = -Math.sin(p.mv.yaw), fz = -Math.cos(p.mv.yaw)
    const ang = Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz)
    this.hitDirs.push({ id: 'h' + (this._bid = (this._bid || 0) + 1), ang, t: 1.15 })
    if (this.hitDirs.length > 6) this.hitDirs.shift()
  }

  // while you are dead the camera rides along — first with your killer, then a team-mate
  spectateTarget () {
    const p = this.player
    if (p.alive) { this.spectate = null; return null }
    if (this.net) return null      // spectating the enemy would be a wallhack
    if (this.killCam && this.killCam.t > 0 && this.killCam.target && this.killCam.target.alive && this.killCam.target !== p) {
      this.spectate = this.killCam.target
      return this.spectate
    }
    let t = this.spectate
    if (!t || !t.alive || t === p) {
      t = this.fighters.find((x) => x.alive && x.team === p.team && x !== p) ||
        this.fighters.find((x) => x.alive && x !== p) || null
    }
    this.spectate = t
    return t
  }


  // ══ netplay ═══════════════════════════════════════════════════════════════
  // Two channels: snapshots go out 30×/s on an unreliable channel (three per
  // packet, so one lost packet costs nothing), everything that must land —
  // damage, kills, the round clock — goes on a reliable one.
  netSay (msg, fast) { if (this.net && this.net.open) this.net.send(msg, !!fast) }

  stepNet (dt) {
    const net = this.net
    const st = this.netState
    if (!net || !st) return
    net.tick(dt)
    this.netPing = net.ping

    if (this.netRole === 'host' && !st.remoteHello) {
      st.mapT = (st.mapT || 0) - dt
      if (st.mapT <= 0) { st.mapT = 0.4; this.netSay(MSG.ready(this.config.mapId, this.config.modeId)) }
    }

    st.lastHello -= dt
    if (st.lastHello <= 0) {
      st.lastHello = 1
      this.netSay(MSG.hello(this.playerName || (this.netRole === 'host' ? 'HOST' : 'GUEST'), this.playerLoadout, this.skin?.id))
    }

    for (const m of net.receive()) this.onNetMessage(m)

    // ── 30 Hz redundant snapshots ─────────────────────────────────────────
    st.snapT = (st.snapT || 0) - dt
    if (st.snapT <= 0 && this.player) {
      st.snapT = 1 / 30
      const f = this.player
      let flags = 0
      if (f.mv.grounded) flags |= FLAG.grounded
      if (f.mv.sliding) flags |= FLAG.sliding
      if (f.mv.sprinting) flags |= FLAG.sprinting
      if (f.mv.crouching) flags |= FLAG.crouching
      if (f.alive) flags |= FLAG.alive
      if (f.wantFire) flags |= FLAG.firing
      if (f.weapon.reloading) flags |= FLAG.reloading
      if (f.mv.wallRunning) flags |= FLAG.wall
      if (f.mv.diving) flags |= FLAG.diving
      const snap = MSG.snapshot(performance.now(), f.mv, flags, f.health, f.slot, f.weapon.isMelee ? 0 : f.weapon.ammo)
      st.recent.push(snap)
      if (st.recent.length > 3) st.recent.shift()
      this.netSay(MSG.batch(st.recent.slice()), true)
    }

    if (this.netRole === 'host' && this.match) {
      st.matchT = (st.matchT || 0) - dt
      if (st.matchT <= 0) {
        st.matchT = 0.5
        this.netSay(MSG.match(this.match.phase, this.match.round, this.match.scoreA, this.match.scoreB, this.match.timer))
      }
    }

    // adaptive interpolation delay: as tight as the link allows, never sloppy
    const jitter = st.jitter || 0
    const want = clamp(38 + jitter * 1.7 + (st.late > 0 ? 14 : 0), 38, 150)
    st.delay += (want - st.delay) * Math.min(1, dt * 1.5)
  }

  // Map the peer's clock onto ours. The lowest observed offset over a few
  // seconds is the truest one (the least queued packet wins), and we ease into
  // it so the remote never visibly jumps.
  syncClock (remoteT) {
    const st = this.netState
    const now = performance.now()
    const want = now - remoteT - (this.net?.rtt || 80) / 2
    if (now - (st.winStart || 0) > 3000) { st.winStart = now; st.winBest = Infinity }
    if (want < (st.winBest ?? Infinity)) st.winBest = want
    if (st.clock === null || st.clock === undefined || Math.abs(st.clock - st.winBest) > 200) st.clock = st.winBest
  }

  pushSnapshot (m) {
    const st = this.netState
    this.syncClock(m[1])
    // the channel is unordered and every packet repeats the last three states,
    // so duplicates (and late arrivals) have to be recognised by timestamp
    if (st.buf.some((q) => q.rt === m[1])) return
    const t = m[1] + (st.clock || 0)
    if (t > (st.maxT ?? -Infinity)) {
      const gap = t - (st.maxT ?? t - 33.3)
      const err = Math.abs(gap - 33.3)
      st.jitter = st.jitter === undefined ? Math.min(err, 90) : st.jitter * 0.88 + Math.min(err, 90) * 0.12
      if (gap > 70 && st.maxT !== undefined) st.late = (st.late || 0) + 1
      else st.late = Math.max(0, (st.late || 0) - 0.2)
      st.maxT = t
    }
    st.buf.push({
      rt: m[1], t, p: [m[2], m[3], m[4]], v: [m[5], m[6], m[7]],
      yaw: m[8], pitch: m[9], flags: m[10], hp: m[11], slot: m[12], ammo: m[13],
    })
    // keep the buffer ordered in time even when the network is not
    if (st.buf.length > 1 && st.buf[st.buf.length - 1].t < st.buf[st.buf.length - 2].t) st.buf.sort((a, b) => a.t - b.t)
    if (st.buf.length > 48) st.buf.shift()
  }

  onNetMessage (m) {
    const st = this.netState
    const r = this.remote
    switch (m[0]) {
      case 'l': {   // hello — name + loadout
        if (st.remoteHello && st.remoteHello.name === m[1]) break
        st.remoteHello = { name: m[1], loadout: m[2], skin: m[3] }
        if (r) {
          r.name = m[1]
          r.loadout = { ...DEFAULT_LOADOUT, ...(m[2] || {}) }
          r.skin = SKIN_MAP[m[3]] || SKIN_MAP.stock
          // note: model geometry is shared from a cache — never dispose it here
          if (r.model) this.world.scene.remove(r.model)
          r.model = buildFighterModel(TEAM_COLORS.b, true, WEAPON_MAP[r.loadout.primary])
          this.world.scene.add(r.model)
          for (const k of ['primary', 'secondary', 'melee']) r.weapons[k] = new Weapon(r.loadout[k], r.skin)
          r.utility = new UtilitySlot(r.loadout.utility)
          r.syncDashGear()
        }
        this.banner('CONNECTED — ' + m[1], 'good', 2)
        break
      }
      case 'b': for (const s of m[1]) this.pushSnapshot(s); break
      case 's': this.pushSnapshot(m); break
      case 'd': {   // we got hit — we own our own health
        if (!this.player || !this.player.alive) break
        const from = this.remote
        const before = this.player.health
        this.player.health = Math.max(0, this.player.health - m[1])
        if (from) from.stats.damage += m[1]
        this.damageFlash = 1
        this.rig.addShake(0.45)
        this.audio.hurt()
        if (from) this.addHitDir(from.mv.pos)
        if (this.player.health <= 0) this.killFighter(this.player, from, !!m[2])
        else if (before !== this.player.health) this.audio.hit(0.1)
        break
      }
      case 'k': {   // somebody died
        if (!r) break
        const killerIsMe = m[1] === this.player.name
        const victimIsMe = m[2] === this.player.name
        if (victimIsMe) this.killFighter(this.player, r, !!m[3])
        else if (killerIsMe) this.killFighter(r, this.player, !!m[3])
        else this.killFighter(r, null, !!m[3])
        break
      }
      case 'f': {   // their shot: tracer + sound so the fight reads both ways
        const from = new THREE.Vector3(m[1], m[2], m[3])
        const dir = new THREE.Vector3(m[4], m[5], m[6])
        const hit = this.world.physics.raycast(from, dir, 200)
        const end = hit ? hit.point : from.clone().addScaledVector(dir, 120)
        this.vfx.tracer(from.clone(), end, 0xffd6a0, 0.02, 0.07)
        const d = from.distanceTo(this.camera.position)
        const def = WEAPON_MAP[m[7]]
        if (def) this.audio.shot({
          pitch: def.stats.pellets ? 0.7 : 1.05 - (def.stats.dmg ?? 20) / 400,
          len: def.stats.pellets ? 0.28 : 0.14,
          gain: Math.max(0.05, 0.42 - d / 90),
          body: def.stats.pellets ? 110 : 200 - (def.stats.dmg ?? 20),
        })
        break
      }
      case 'm': {   // host-owned match state
        if (this.netRole === 'host' || !this.match) break
        const [phase, round, scoreA, scoreB, timer] = [m[1], m[2], m[3], m[4], m[5]]
        if (phase === 'countdown' && this.match.phase !== 'countdown') {
          this.match.round = round
          this.match.startRound()
        } else if (phase === 'live' && this.match.phase !== 'live') {
          this.match.goLive()
        } else if (phase === 'roundend' && this.match.phase !== 'roundend') {
          this.match.endRound(scoreA > this.match.scoreA ? 'a' : scoreB > this.match.scoreB ? 'b' : null)
        } else if (phase === 'matchend' && this.match.phase !== 'matchend') {
          this.match.phase = 'matchend'
          this.emit('matchend', { winner: scoreA > scoreB ? 'a' : 'b', scoreA, scoreB, stats: this.player.stats, board: this.buildBoard() })
        }
        this.match.scoreA = scoreA
        this.match.scoreB = scoreB
        this.match.timer = timer
        this.match.round = round
        break
      }
      case 'e': {   // a peer's movement tell — you see the dash, not just the result
        if (m[1] === 'dash') this.vfx.burst(new THREE.Vector3(m[2], m[3] + 0.9, m[4]), 12, 0x6ee7ff, 5, 0.1, 0.45, 9)
        break
      }
      case 'x':
        this.banner('THE OTHER PLAYER LEFT', 'bad', 2.4)
        this.emit('peerleft', {})
        break
      default: break
    }
  }

  // Render the remote fighter a hair in the past — but only as far in the past
  // as this connection actually needs — and slide between samples, so 30 Hz
  // over a jittery link still looks like a smooth player.
  interpolateRemote (dt = 0.016) {
    const st = this.netState
    const r = this.remote
    if (!st || !r || st.buf.length === 0) return
    if (st.clock === null || st.clock === undefined) return
    const now = performance.now()
    const renderAt = now - st.delay
    let a = st.buf[0], b = st.buf[st.buf.length - 1]
    for (let i = 0; i < st.buf.length; i++) {
      if (st.buf[i].t <= renderAt) a = st.buf[i]
      if (st.buf[i].t >= renderAt) { b = st.buf[i]; break }
    }
    const span = b.t - a.t
    let k = span > 0 ? (renderAt - a.t) / span : 1
    let ex = 0
    if (k > 1) { ex = Math.min(0.14, (renderAt - b.t) / 1000); k = 1 }
    const lerp3 = (i) => a.p[i] + (b.p[i] - a.p[i]) * k + (b.v[i] || 0) * ex
    _netA.set(lerp3(0), lerp3(1), lerp3(2))
    // smooth out small disagreements instead of snapping on every packet
    if (!st.shown) st.shown = _netA.clone()
    const err = st.shown.distanceTo(_netA)
    if (err > 1.4) st.shown.copy(_netA)
    else st.shown.lerp(_netA, Math.min(1, dt * 26))
    r.mv.pos.copy(st.shown)
    r.mv.vel.set(b.v[0], b.v[1], b.v[2])
    r.mv.yaw = a.yaw + shortAngle(a.yaw, b.yaw) * k
    r.mv.pitch = a.pitch + (b.pitch - a.pitch) * k
    r.mv.grounded = !!(b.flags & FLAG.grounded)
    r.mv.sliding = !!(b.flags & FLAG.sliding)
    r.mv.crouching = !!(b.flags & FLAG.crouching)
    r.mv.sprinting = !!(b.flags & FLAG.sprinting)
    r.mv.wallRunning = !!(b.flags & FLAG.wall)
    r.mv.diving = !!(b.flags & FLAG.diving)
    const wasAlive = r.alive
    r.alive = !!(b.flags & FLAG.alive)
    r.health = b.hp
    r.slot = ['primary', 'secondary', 'melee'].includes(b.slot) ? b.slot : 'primary'
    if (wasAlive && !r.alive) this.vfx.burst(new THREE.Vector3(r.mv.pos.x, r.mv.pos.y + 1, r.mv.pos.z), 20, 0xff4d6d, 6, 0.13, 0.9, 14)
    // model
    r.model.visible = r.alive
    r.model.position.set(r.mv.pos.x, r.mv.pos.y, r.mv.pos.z)
    r.model.rotation.order = 'YXZ'
    r.model.rotation.y = r.mv.yaw + Math.PI
    const squash = r.mv.sliding ? 0.55 : r.mv.crouching ? 0.72 : 1
    r.model.scale.set(1, squash, 1)
    if (b.flags & FLAG.firing) {
      const mz = r.model.userData.muzzle
      if (mz) { const p = new THREE.Vector3(); mz.getWorldPosition(p); this.vfx.muzzle(p, new THREE.Vector3(-Math.sin(r.mv.yaw), 0, -Math.cos(r.mv.yaw)), 0.8, 0xffd9a0) }
    }
  }

  // Dust and sparks: the ground tells you how fast you are going.
  groundFx (f, dt) {
    const mv = f.mv
    const sp = mv.horizontalSpeed
    if (f !== this.player && !f.isBot) return
    if (mv.grounded && mv.sliding && sp > 4.5 && Math.random() < dt * 30) {
      _fx.set(mv.pos.x + (Math.random() - 0.5) * 0.4, mv.pos.y + 0.05, mv.pos.z + (Math.random() - 0.5) * 0.4)
      _fxv.set(-mv.vel.x * 0.12 + (Math.random() - 0.5), 0.5 + Math.random() * 0.9, -mv.vel.z * 0.12 + (Math.random() - 0.5))
      this.vfx.particle(_fx, _fxv, 0xdfe8f2, 0.1 + Math.random() * 0.07, 0.5, 5, 1.8)
    }
    if (mv.wallRunning && Math.random() < dt * 34) {
      const n = mv.wallNormal
      _fx.set(mv.pos.x - n.x * 0.3, mv.pos.y + 0.5 + Math.random() * 0.6, mv.pos.z - n.z * 0.3)
      _fxv.set(n.x * 1.6, -0.6 - Math.random(), n.z * 1.6)
      this.vfx.particle(_fx, _fxv, 0x9fe8ff, 0.07, 0.32, 3, 1.4)
    }
  }

  // A completed chain is the whole point of the game — say it out loud.
  chainWatch (f) {
    if (f !== this.player) return
    const n = f.mv.tracker.order.length
    if (this._lastChains === undefined) { this._lastChains = n; return }
    if (n > this._lastChains) {
      const id = f.mv.tracker.order[n - 1]
      const c = CHAINS.find((x) => x.id === id)
      if (c) {
        this.banner('CHAIN ' + id + ' — ' + c.name, 'good', 1.8)
        this.audio.chain(n)
        this.rig.addShake(0.12)
      }
    }
    this._lastChains = n
  }

  // Deterministic climb: shot N always kicks the same way, so the spray can be
  // learned. Bots get the same kick on their own internal aim, which is why a
  // higher difficulty (faster turn rate) controls a spray better.
  applyAimKick (f, r) {
    if (!r || (!r.p && !r.y)) return
    f.mv.pitch = clamp(f.mv.pitch + r.p, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02)
    f.mv.yaw += r.y
    if (f.bot) { f.bot.aimPitch = f.mv.pitch; f.bot.aimYaw = f.mv.yaw }
  }

  // The end-of-match scoreboard. Used by the result screen and by the in-game
  // TAB panel — one definition so the two can never drift apart.
  buildBoard () {
    return this.fighters.map((x) => ({
      name: x.name, team: x.team, you: x === this.player, dummy: !!x.isDummy,
      kills: x.stats.kills, deaths: x.stats.deaths, damage: Math.round(x.stats.damage),
      headshots: x.stats.headshots || 0, assists: x.stats.assists || 0,
      topSpeed: +(x.stats.topSpeed || 0).toFixed(1),
      acc: x.stats.shots ? Math.min(1, (x.stats.hits || 0) / x.stats.shots) : 0,
      alive: x.alive, ping: x.ping ?? 0,
    }))
  }

  netQuality () {
    const st = this.netState
    if (!st) return null
    return { ping: this.netPing, delay: Math.round(st.delay), jitter: Math.round(st.jitter || 0) }
  }

  // ── aiming & shooting ────────────────────────────────────────────────────
  aimOrigin (f) {
    const o = new THREE.Vector3(f.mv.pos.x, f.eyeY, f.mv.pos.z)
    if (f === this.player) o.set(this.camera.position.x, this.camera.position.y, this.camera.position.z)
    return o
  }
  aimDir (f) {
    const yaw = f === this.player ? this.rig.yaw : f.mv.yaw
    const pitch = f === this.player ? this.rig.pitch : f.mv.pitch
    const cp = Math.cos(pitch)
    return new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp)
  }

  fireWeapon (f, shot) {
    const def = shot.def
    const s = def.stats
    const origin = this.aimOrigin(f)
    const baseDir = this.aimDir(f)
    const speed = f.mv.horizontalSpeed
    const mom = momentumScale(speed, shot.kind === 'melee' ? 'melee' : 'gun')
    const isPlayer = f === this.player

    if (shot.kind === 'melee') {
      this.vmState.swing = 1
      this.vmState.swingDir *= -1
      this.audio.melee()
      let hitAny = false
      for (const e of this.fighters) {
        if (!e.alive || e === f) continue
        if (e.team === f.team && this.mode.id !== 'range') continue
        const d = e.mv.pos.distanceTo(f.mv.pos)
        if (d > s.reach) continue
        const to = new THREE.Vector3().subVectors(e.mv.pos, f.mv.pos).normalize()
        const flat = new THREE.Vector3(to.x, 0, to.z)
        const bf = new THREE.Vector3(baseDir.x, 0, baseDir.z)
        if (flat.dot(bf) < 0.35) continue
        // backstab
        const facing = new THREE.Vector3(-Math.sin(e.mv.yaw), 0, -Math.cos(e.mv.yaw))
        const behind = facing.dot(to) < -0.1
        let dmg = s.dmg * mom * (behind ? (s.back ?? 1.3) : 1)
        this.damageTarget(e, dmg, f, false, baseDir, isPlayer, e.mv.pos.clone().setY(e.mv.pos.y + 1.1))
        if (s.knock) { e.mv.vel.addScaledVector(to, s.knock) ; e.mv.vel.y += 2.2 }
        hitAny = true
      }
      if (hitAny && isPlayer) this.hitmarker = 0.25
      return
    }

    // muzzle
    const muzzleWorld = new THREE.Vector3()
    if (isPlayer && this.vm?.muzzle) this.vm.muzzle.getWorldPosition(muzzleWorld)
    else muzzleWorld.copy(origin).addScaledVector(baseDir, 0.6)
    if (!s.silent) {
      this.vfx.muzzle(muzzleWorld, baseDir, s.type === 'hitscan' ? 1 : 1.4, 0xffd9a0)
      this.audio.shot({
        pitch: s.pellets ? 0.7 : s.type === 'projectile' ? 1.5 : 1.05 - (s.dmg ?? 20) / 400,
        len: s.pellets ? 0.28 : 0.14,
        gain: s.pellets ? 0.6 : 0.42,
        body: s.pellets ? 110 : 200 - (s.dmg ?? 20),
      })
    }
    f.spawnGuard = 0   // shooting drops the spawn shield
    f.stats.shots = (f.stats.shots || 0) + (s.pellets ? 1 : 1)
    if (isPlayer) {
      this.rig.addRecoil((s.recoil?.v ?? 1) * (1 - f.weapon.ads * 0.35), (s.recoil?.h ?? 0.3))
      this.vmState.kickVel.z += (s.recoil?.kick ?? 0.04) * 60
      this.vmState.kickVel.x += (s.recoil?.v ?? 1) * 0.06
    }

    const spreadRad = (shot.spread * Math.PI) / 180
    if (s.type === 'projectile') {
      const dir = jitter(baseDir, spreadRad)
      this.spawnProjectile({
        pos: muzzleWorld.clone(), vel: dir.multiplyScalar(s.projSpeed),
        def, owner: f, fuse: 4, grav: 0, radius: 0.18, bounces: s.bounces ?? 0,
        dmg: shot.dmg, splash: s.splash,
      })
      return
    }

    for (let i = 0; i < shot.pellets; i++) {
      const dir = jitter(baseDir, spreadRad)
      if (s.type === 'beam') {
        const hit = this.raycastAll(f, origin, dir, s.range ?? 120)
        const end = hit.point
        this.vfx.beam(muzzleWorld, end, s.beamColor ?? 0xb388ff, 0.06 + shot.charge * 0.05)
        if (hit.fighter) {
          const dist = origin.distanceTo(hit.point)
          const dmg = shot.dmg * mom * f.weapon.falloffMul(dist) * (hit.head ? s.head ?? 1.5 : 1)
          this.damageTarget(hit.fighter, dmg, f, hit.head, dir, isPlayer, hit.point)
        }
        continue
      }
      const hit = this.raycastAll(f, origin, dir, s.range ?? 120)
      const dist = origin.distanceTo(hit.point)
      if (this.net && isPlayer && (i === 0)) this.netSay(MSG.shot(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, dir.x, dir.y, dir.z, def.id))
      if (!s.silent) this.vfx.tracer(muzzleWorld, hit.point, f.team === 'a' ? 0xbfefff : 0xffd6a0, 0.02, s.pellets ? 0.05 : 0.075)
      if (hit.fighter) {
        const dmg = shot.dmg * mom * f.weapon.falloffMul(dist) * (hit.head ? s.head ?? 1.5 : 1)
        this.damageTarget(hit.fighter, dmg, f, hit.head, dir, isPlayer, hit.point)
      } else {
        this.vfx.impact(hit.point, hit.normal, 0xcfd8e3, s.pellets ? 3 : 6)
      }
    }
  }

  raycastAll (shooter, origin, dir, maxDist) {
    const world = this.world.physics.raycast(origin, dir, maxDist)
    let best = world ? { dist: world.dist, point: world.point, normal: world.normal, fighter: null, head: false } : { dist: maxDist, point: origin.clone().addScaledVector(dir, maxDist), normal: dir.clone().negate(), fighter: null, head: false }
    const cap = this._cap
    for (const e of this.fighters) {
      if (!e.alive || e === shooter) continue
      if (e.team === shooter.team && this.mode.id !== 'range') continue
      e.capsule(cap)
      const t = THREE.Object3D ? PhysicsRayCapsule(origin, dir, cap.a, cap.b, e.radius) : null
      if (t === null || t === undefined || t > best.dist) continue
      const point = origin.clone().addScaledVector(dir, t)
      const head = point.y > e.mv.pos.y + e.mv.height * 0.76
      best = { dist: t, point, normal: dir.clone().negate(), fighter: e, head }
    }
    return best
  }

  damageTarget (target, dmg, from, head, dir, isPlayer, point) {
    // over the wire the shooter decides: you hit what you see, the owner applies it
    if (this.net && target.isRemote && from === this.player) {
      dmg = Math.max(1, Math.round(dmg))
      this.netSay(MSG.damage(dmg, head, Math.max(0, target.health - dmg)))
      from.stats.damage += dmg                       // your damage counts here too
      from.stats.hits = (from.stats.hits || 0) + 1
      const killing = dmg >= target.health
      this.hitmarker = killing ? 0.4 : 0.22
      this.killHit = killing ? 0.4 : Math.max(0, this.killHit)
      this.lastHitWasHead = head
      if (head) this.audio.headshot(); else this.audio.hit(0.16 + Math.min(0.22, dmg / 260))
      this.emit('damage', { amount: dmg, head, speed: from.mv.horizontalSpeed })
      return
    }
    if (point) target._hitPoint = point.clone()
    const applied = target.applyDamage(dmg, from, head, dir)
    if (from && applied > 0) from.stats.hits = (from.stats.hits || 0) + 1
    if (isPlayer && applied > 0) {
      const killing = !target.alive
      this.hitmarker = killing ? 0.4 : 0.22
      this.killHit = killing ? 0.4 : Math.max(0, this.killHit)
      this.lastHitWasHead = head
      // a heavier hit sounds heavier — you can hear a good trade
      if (head) this.audio.headshot()
      else this.audio.hit(0.16 + Math.min(0.22, applied / 260))
      this.emit('damage', { amount: applied, head, speed: from.mv.horizontalSpeed })
    }
    if (target === this.player) {
      this.damageFlash = 1
      this.rig.addShake(0.5)
      this.audio.hurt()
      if (from && from !== this.player) this.addHitDir(from.mv.pos)
    }
  }

  killFighter (victim, killer, head) {
    if (!victim.alive) return
    // assists: everyone who chipped in during the last five seconds
    const helpers = (victim.credit || []).filter((c) => c.f !== killer && c.f !== victim && this.time - c.t < 5)
    for (const h of helpers) {
      h.f.stats.assists = (h.f.stats.assists || 0) + 1
      if (h.f === this.player) this.banner('ASSIST', 'good', 1.2)
    }
    victim.credit = []
    victim.alive = false
    if (this.net && victim === this.player && !this.netState.sentKill) {
      this.netState.sentKill = true
      this.netSay(MSG.kill(killer ? killer.name : 'THE VOID', victim.name, head, killer ? killer.weapon.def.name : null))
    }
    victim.stats.deaths++
    victim.model.visible = false
    // the range brings you straight back; everywhere else the mode decides
    victim.respawnTimer = (this.mode.id === 'range' || victim.isDummy) ? 1.2 : 999
    this.vfx.burst(new THREE.Vector3(victim.mv.pos.x, victim.mv.pos.y + 1, victim.mv.pos.z), 20, 0xff4d6d, 6, 0.13, 0.9, 14)
    if (killer && killer !== victim) {
      killer.stats.kills++
      if (head) killer.stats.headshots++
    }
    const entry = {
      id: Math.random().toString(36).slice(2),
      killer: killer ? killer.name : 'THE VOID',
      victim: victim.name,
      weapon: killer ? killer.weapon.def.name : null,
      head: !!head,
      teamKill: killer && killer.team === victim.team,
      mine: killer === this.player,
      t: this.time,
    }
    this.killfeed.push(entry)
    if (this.killfeed.length > 6) this.killfeed.shift()
    if (killer === this.player) {
      this.killStreak++
      this.killStreakT = 3.4
      if (!this.firstBlood) { this.firstBlood = true; this.banner('FIRST BLOOD', 'good', 1.9) }
      const ks = this.killStreak
      if (ks === 2) this.banner('DOUBLE KILL', 'good')
      else if (ks === 3) this.banner('TRIPLE KILL', 'good')
      else if (ks === 4) this.banner('QUAD KILL', 'good')
      else if (ks >= 5) this.banner('RAMPAGE ×' + ks, 'good', 2.1)
      else if (entry.head) this.banner('HEADSHOT', 'good', 1.2)
      this.audio.kill()
      // hit-stop: the world leans in for a moment on a kill you earned
      if (!this.net) this.hitStop = head ? 0.085 : 0.06
      this.emit('kill', entry)
    } else if (victim === this.player) {
      this.killStreak = 0
      this.killCam = killer && killer !== victim ? { target: killer, t: 2.2 } : null
      this.emit('death', { killer: killer ? killer.name : 'THE VOID' })
    }
    this.emit('killfeed', this.killfeed.slice())
  }

  // ── projectiles ──────────────────────────────────────────────────────────
  spawnProjectile (p) {
    const mesh = new THREE.Mesh(
      p.hook ? new THREE.ConeGeometry(0.06, 0.3, 5) : new THREE.IcosahedronGeometry(p.radius, 0),
      new THREE.MeshLambertMaterial({ color: p.def.stats.color ?? 0x8fd14f, flatShading: true, emissive: p.def.model?.glow ? (p.def.stats.color ?? 0x8fd14f) : 0x000000 }),
    )
    mesh.position.copy(p.pos)
    this.world.scene.add(mesh)
    const proj = {
      ...p, mesh, life: p.fuse ?? 3, vel: p.vel.clone(), prev: p.pos.clone(),
      dmg: p.dmg ?? p.def.stats.dmg ?? 0, bounces: p.bounces ?? 0,
    }
    this.projectiles.push(proj)
    return proj
  }

  stepProjectiles (dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.prev.copy(p.pos)
      if (p.grav) p.vel.y -= p.grav * dt
      p.pos.addScaledVector(p.vel, dt)
      p.life -= dt
      p.mesh.position.copy(p.pos)
      p.mesh.rotation.x += dt * 8
      p.mesh.rotation.z += dt * 6

      const seg = new THREE.Vector3().subVectors(p.pos, p.prev)
      const len = seg.length()
      let hit = null
      if (len > 0.001) {
        const dir = seg.clone().divideScalar(len)
        hit = this.world.physics.raycast(p.prev, dir, len + p.radius)
      }
      // entity hit
      const cap = this._cap
      for (const e of this.fighters) {
        if (!e.alive) continue
        e.capsule(cap)
        const t = PhysicsRayCapsule(p.prev, seg.clone().normalize(), cap.a, cap.b, e.radius + p.radius)
        if (t !== null && t <= len && (!hit || t < hit.dist)) {
          hit = { dist: t, point: p.prev.clone().addScaledVector(seg.clone().normalize(), t), entity: e }
        }
      }

      if (hit) {
        if (p.hook) {
          if (p.owner) p.owner.hook = { point: hit.point.clone(), active: true, pull: p.def.stats.pull ?? 30, life: 0.9 }
          this.removeProjectile(i)
          continue
        }
        if (p.bounces > 0) {
          p.bounces--
          const n = hit.normal || new THREE.Vector3(0, 1, 0)
          p.vel.reflect(n).multiplyScalar(0.9)
          p.pos.copy(hit.point).addScaledVector(n, p.radius + 0.02)
          this.vfx.impact(hit.point, n, p.def.stats.color ?? 0x8fd14f, 5)
          continue
        }
        this.detonate(p, hit)
        this.removeProjectile(i)
        continue
      }
      if (p.life <= 0) { this.detonate(p, null); this.removeProjectile(i) }
    }
  }

  removeProjectile (i) {
    const p = this.projectiles[i]
    this.world.scene.remove(p.mesh)
    p.mesh.geometry.dispose()
    p.mesh.material.dispose()
    this.projectiles.splice(i, 1)
  }

  detonate (p, hit) {
    const s = p.def.stats
    const at = hit ? hit.point : p.pos.clone()
    if (p.def.id === 'decoy') {
      this.spawnDecoy(p.owner, at)
      this.audio.ui(true)
      return
    }
    if (s.flash) {
      for (const e of this.fighters) {
        if (!e.alive) continue
        const d = e.mv.pos.distanceTo(at)
        if (d < s.radius) {
          const dir = new THREE.Vector3().subVectors(e.mv.pos, at).normalize()
          const los = !this.world.physics.raycast(new THREE.Vector3(e.mv.pos.x, e.eyeY, e.mv.pos.z), dir.multiplyScalar(-1), d)
          if (los) e.flashTime = s.flash * (1 - d / s.radius)
        }
      }
      this.vfx.explosion(at, s.radius * 0.5, s.color)
      this.audio.explode()
      return
    }
    if (s.smoke) {
      for (let i = 0; i < 16; i++) {
        const off = new THREE.Vector3((Math.random() - 0.5) * s.radius, Math.random() * 1.6, (Math.random() - 0.5) * s.radius)
        this.vfx.smokePuff(at.clone().add(off), 1.6 + Math.random(), s.color, s.smoke)
      }
      this.audio.ui(false)
      return
    }
    if (s.dmg || p.dmg) {
      this.vfx.explosion(at, s.radius ?? 4, s.color ?? 0xffa14a)
      this.audio.explode()
      for (const e of this.fighters) {
        if (!e.alive) continue
        const d = e.mv.pos.distanceTo(at)
        if (d > (s.radius ?? 4)) continue
        const falloff = 1 - d / (s.radius ?? 4)
        const dir = new THREE.Vector3().subVectors(e.mv.pos, at).normalize()
        const dmg = (s.dmg ?? p.dmg) * falloff * (s.slow ? 1 : 1)
        this.damageTarget(e, dmg, p.owner, false, dir, p.owner === this.player)
        e.mv.vel.addScaledVector(dir, 9 * falloff)
        e.mv.vel.y += 4 * falloff
        if (s.slow) { e.slow = s.slowTime; }
      }
      return
    }
    this.vfx.burst(at, 8, s.color ?? 0xffffff, 3, 0.1, 0.4)
  }

  // ── placeables ───────────────────────────────────────────────────────────
  placeBarrier (p, f) {
    const yaw = f === this.player ? this.rig.yaw : f.mv.yaw
    const c = Math.cos(yaw), s = Math.sin(yaw)
    const center = [p.x - s * 0.12, p.y + 1.1, p.z - c * 0.12]
    const brush = { center, half: [1.6, 1.1, 0.22], rot: [0, yaw, 0], color: 0x9d7bff, tag: 'barrier' }
    this.world.physics.add(brush)
    this.world.physics.build()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 0.44),
      new THREE.MeshLambertMaterial({ color: 0x9d7bff, flatShading: true, transparent: true, opacity: 0.55, emissive: 0x2a1f4a }))
    mesh.position.set(center[0], center[1], center[2])
    mesh.rotation.y = yaw
    this.world.scene.add(mesh)
    this.placeables.push({ kind: 'barrier', hp: 250, brush, mesh, life: 22 })
  }

  placeMine (p, f) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshLambertMaterial({ color: 0xff4d6d, flatShading: true, emissive: 0x551018 }))
    mesh.position.copy(p)
    mesh.position.y += 0.12
    this.world.scene.add(mesh)
    this.placeables.push({ kind: 'mine', mesh, pos: mesh.position.clone(), arm: 0.8, life: 40, owner: f })
  }

  spawnDecoy (owner, at) {
    const g = buildCharacter(TEAM_COLORS[owner.team], true)
    g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55 } })
    g.position.copy(at)
    this.world.scene.add(g)
    const dir = new THREE.Vector3(-Math.sin(owner.mv.yaw), 0, -Math.cos(owner.mv.yaw))
    this.placeables.push({ kind: 'decoy', mesh: g, pos: at.clone(), vel: dir.multiplyScalar(7), life: 8, owner, decoy: true })
  }

  stepPlaceables (dt) {
    for (let i = this.placeables.length - 1; i >= 0; i--) {
      const p = this.placeables[i]
      p.life -= dt
      if (p.kind === 'mine') {
        p.arm -= dt
        if (p.arm <= 0) {
          for (const e of this.fighters) {
            if (!e.alive || e === p.owner) continue
            if (e.mv.pos.distanceTo(p.pos) < 1.7) {
              this.vfx.explosion(p.pos.clone(), 4, 0xff4d6d)
              this.audio.explode()
              for (const t of this.fighters) {
                if (!t.alive) continue
                const d = t.mv.pos.distanceTo(p.pos)
                if (d < 4.2) this.damageTarget(t, 95 * (1 - d / 4.2), p.owner, false, new THREE.Vector3(0, 1, 0), p.owner === this.player)
              }
              this.world.scene.remove(p.mesh)
              this.placeables.splice(i, 1)
              break
            }
          }
        }
        continue
      }
      if (p.kind === 'decoy') {
        p.pos.addScaledVector(p.vel, dt)
        const down = this.world.physics.raycast(p.pos.clone().setY(p.pos.y + 1), new THREE.Vector3(0, -1, 0), 4)
        if (down) p.pos.y = down.point.y
        p.mesh.position.copy(p.pos)
        p.mesh.rotation.y = Math.atan2(-p.vel.x, -p.vel.z)
        if (p.life <= 0) { this.world.scene.remove(p.mesh); this.placeables.splice(i, 1) }
        continue
      }
      if (p.kind === 'barrier') {
        if (p.life <= 0 || p.hp <= 0) {
          this.world.scene.remove(p.mesh)
          const idx = this.world.physics.brushes.indexOf(p.brush)
          if (idx >= 0) { this.world.physics.brushes.splice(idx, 1); this.world.physics.build() }
          this.placeables.splice(i, 1)
        }
      }
    }
  }

  // ── rounds ───────────────────────────────────────────────────────────────
  spawnPointFor (team, i) {
    const list = this.map.spawns[team] || this.map.spawns.a
    return list[i % list.length]
  }

  spawnAll () {
    let ia = 0, ib = 0
    for (const f of this.fighters) {
      if (f.isRemote) continue                     // the network places this one
      if (f.isDummy && f.home) { f.respawn(f.home.clone(), f.homeYaw); continue }
      const sp = f.team === 'a' ? this.spawnPointFor('a', ia++) : this.spawnPointFor('b', ib++)
      f.respawn(new THREE.Vector3(sp[0], sp[1] + 0.2, sp[2]), sp[3] ?? 0)
    }
  }

  resetRound () {
    for (const p of [...this.projectiles]) this.removeProjectile(this.projectiles.indexOf(p))
    for (const p of this.placeables) {
      this.world.scene.remove(p.mesh)
      if (p.brush) {
        const idx = this.world.physics.brushes.indexOf(p.brush)
        if (idx >= 0) { this.world.physics.brushes.splice(idx, 1); this.world.physics.build() }
      }
    }
    this.placeables.length = 0
    this.vfx.clear()
    this.killfeed.length = 0
    this.spawnAll()
    this.rig.dip = this.rig.dipVel = 0
    this.vmState.swing = 0
    if (this.player) {
      this.player.slot = 'primary'
      this.buildViewModelFor('primary')
    }
  }

  respawnFighter (f) {
    if (f.isRemote) return
    // dummies always go back to their own spot on the firing line
    if (f.isDummy && f.home) { f.respawn(f.home.clone(), f.homeYaw); return }
    const team = f.team
    const list = this.map.spawns[team] || this.map.spawns.a
    const sp = list[Math.floor(Math.random() * list.length)]
    let p = new THREE.Vector3(sp[0], sp[1] + 0.2, sp[2])
    // avoid spawning on top of a team-mate
    for (let i = 0; i < 6; i++) {
      const clash = this.fighters.some((o) => o !== f && o.alive && o.mv.pos.distanceTo(p) < 1.6)
      if (!clash) break
      const sp2 = list[Math.floor(Math.random() * list.length)]
      p = new THREE.Vector3(sp2[0], sp2[1] + 0.2, sp2[2])
    }
    f.respawn(p, sp[3] ?? 0)
  }

  respawnPlayer (delay = 2) {
    this.player.respawnTimer = delay
    this.player.alive = false
    this.player.model.visible = false
  }

  aliveByTeam () {
    const r = { a: 0, b: 0 }
    for (const f of this.fighters) if (f.alive) r[f.team]++
    return r
  }

  checkFallOut () {
    const ky = this.map.killY ?? -25
    for (const f of this.fighters) {
      if (f.isRemote) continue
      if (f.alive && f.mv.pos.y < ky) {
        this.killFighter(f, f.lastAttacker, false)
        if (f === this.player) this.emit('fell', {})
      }
    }
  }

  // ── viewmodel ────────────────────────────────────────────────────────────
  buildViewModelFor (slot) {
    const f = this.player
    if (this.vm) { this.vmRoot.remove(this.vm.group); this.vm.group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose?.() }) }
    const def = f.weapons[slot].def
    const skin = this.skin && this.skin.id !== 'stock' ? this.skin : null
    this.vm = buildViewModel(def, skin)
    this.vmRoot.add(this.vm.group)
    this.vmSlot = slot
  }

  updateViewmodel (dt) {
    if (!this.vm) return
    const f = this.player
    const w = f.weapon
    const g = this.vm.group
    const st = this.vmState
    const spd = f.mv.horizontalSpeed
    const ads = w.ads

    // base pose
    const hip = new THREE.Vector3(0.155, -0.145, -0.3)
    const adsPos = new THREE.Vector3(0, -0.075 - (this.vm.adsOffset ?? 0), -0.24)
    const sprint = f.mv.sprinting && !f.mv.sliding && spd > 7 ? 1 : 0
    st.sprintBlend = lerp(st.sprintBlend ?? 0, sprint, 1 - Math.exp(-10 * dt))
    st.slideBlend = lerp(st.slideBlend ?? 0, f.mv.sliding ? 1 : 0, 1 - Math.exp(-12 * dt))

    const target = hip.clone().lerp(adsPos, ads)
    target.x += st.sprintBlend * 0.05
    target.y -= st.sprintBlend * 0.03 + st.slideBlend * 0.05
    target.z += st.sprintBlend * 0.02

    // sway: lag behind the view, plus movement bob
    st.sway.x = lerp(st.sway.x, clamp(-this.input.mouse.dx * 0.0016, -0.05, 0.05), 1 - Math.exp(-14 * dt))
    st.sway.y = lerp(st.sway.y, clamp(-this.input.mouse.dy * 0.0016, -0.05, 0.05), 1 - Math.exp(-14 * dt))
    const bobT = this.time * (6 + spd * 0.6)
    const bobAmt = f.mv.grounded && !f.mv.sliding ? clamp(spd / 12, 0, 1.1) * 0.012 * (1 - ads * 0.8) : 0
    target.x += st.sway.x + Math.cos(bobT * 0.5) * bobAmt
    target.y += st.sway.y + Math.abs(Math.sin(bobT)) * bobAmt * 1.4
    target.y += this.rig.dip * 0.35

    // recoil kick spring
    st.kickVel.multiplyScalar(Math.exp(-16 * dt))
    st.kick.addScaledVector(st.kickVel, dt)
    st.kick.multiplyScalar(Math.exp(-11 * dt))

    // melee swing
    if (st.swing > 0) st.swing = Math.max(0, st.swing - dt * 4.5)
    const swing = st.swing > 0 ? Math.sin((1 - st.swing) * Math.PI) : 0

    // reload animation
    const reloading = w.reloading
    st.reload = lerp(st.reload, reloading ? 1 : 0, 1 - Math.exp(-11 * dt))

    g.position.set(
      target.x + st.kick.x * 0.1,
      target.y + st.kick.y * 0.1 - st.reload * 0.12 - swing * 0.04,
      target.z + st.kick.z * 0.06,
    )
    const rotX = st.kick.x * 1.6 - st.reload * 0.5 + st.sprintBlend * 0.12 - swing * 0.5
    const rotY = st.sway.x * 6 + st.reload * 0.4 - st.sprintBlend * 0.25 + swing * st.swingDir * 0.9
    const rotZ = st.sway.y * 5 + st.reload * 0.5 + st.sprintBlend * 0.22 + st.slideBlend * 0.1 + swing * st.swingDir * 0.4
    g.rotation.set(rotX, rotY, rotZ)

    // reactive skins glow with speed
    if (this.skin?.reactive) {
      const k = clamp((spd - 5) / 12, 0, 1)
      for (const m of this.vm.materials) {
        if (m.emissive) m.emissiveIntensity = 0.35 + k * 1.5
      }
    }
    this.vmCamera.fov = lerp(58, 46, ads)
    this.vmCamera.updateProjectionMatrix()
  }

  // ── render ───────────────────────────────────────────────────────────────
  renderFrame (dt) {
    const f = this.player
    const spec = f.alive ? null : this.spectateTarget()
    const cam = spec || f
    this.rig.update(dt, {
      yaw: cam.mv.yaw, pitch: cam.mv.pitch, pos: cam.mv.pos, vel: cam.mv.vel,
      horizontalSpeed: cam.mv.horizontalSpeed, grounded: cam.mv.grounded,
      sliding: cam.mv.sliding, crouching: cam.mv.crouching, sprinting: cam.mv.sprinting,
      landImpact: cam.mv.landImpact,
      wallRunning: cam.mv.wallRunning, wallNormal: cam.mv.wallNormal,
    }, spec ? 0 : f.weapon.ads, spec ? 0 : f.weapon.def.stats.adsFov)

    for (let i = this.banners.length - 1; i >= 0; i--) if ((this.banners[i].t -= dt) <= 0) this.banners.splice(i, 1)
    if (this.net) this.interpolateRemote(dt)
    this.updatePlates(dt)

    if (this.vmRoot) this.vmRoot.visible = f.alive && !spec
    this.updateViewmodel(dt)
    this.hitmarker = Math.max(0, this.hitmarker - dt)
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2)

    // flash bang overlay handled through hud state
    this.renderWorld()

    // hud push (30hz is plenty and keeps React cheap)
    this.hudAcc += dt
    if (this.hudAcc > 1 / 30) {
      this.hudAcc = 0
      this.pushHud()
    }
    this.input.endFrame()
  }

  pushHud () {
    const f = this.player
    const w = f.weapon
    const spd = f.mv.horizontalSpeed
    const chains = f.mv.tracker.progress()
    // is the crosshair on somebody? the crosshair says so in red
    let onTarget = false
    if (f.alive && !w.isMelee) {
      const hit = this.raycastAll(f, this.aimOrigin(f), this.aimDir(f), w.def.stats.range ?? 90)
      onTarget = !!hit.fighter && (hit.fighter.team !== f.team || this.mode.id === 'range')
    }
    this.onHud({
      hp: Math.max(0, Math.round(f.health)),
      maxHp: f.maxHealth,
      alive: f.alive,
      weapon: w.def.name,
      weaponId: w.id,
      slot: f.slot,
      ammo: w.isMelee || w.isUtility ? '∞' : w.ammo,
      reserve: w.isMelee || w.isUtility ? '' : w.reserve,
      reloading: w.reloading,
      ads: w.ads,
      reloadProgress: w.reloading ? 1 - w.reloadTimer / w.def.stats.reload : 0,
      speed: spd,
      vert: f.mv.vel.y,
      grounded: f.mv.grounded,
      sliding: f.mv.sliding,
      sprinting: f.mv.sprinting,
      crouching: f.mv.crouching,
      wallRunning: f.mv.wallRunning,
      slope: f.mv.groundNormal.y,
      momentum: momentumScale(spd, f.slot === 'melee' ? 'melee' : 'gun'),
      topSpeed: f.mv.topSpeed,
      chains,
      utility: { name: f.utility.def.name, uses: f.utility.uses, id: f.utility.id },
      spread: w.currentSpread ? w.currentSpread({ speed: spd, grounded: f.mv.grounded, sliding: f.mv.sliding, crouching: f.mv.crouching }) : 0,
      hitmarker: this.hitmarker,
      killHit: this.killHit,
      onTarget,
      crosshair: this.settings.crosshair || 'cross',
      dash: { charges: f.dashCharges, max: f.dashMax, cd: f.dashCd, cdMax: f.dashCdMax, gear: !!f.dashGear },
      diving: f.mv.diving,
      headshot: this.lastHitWasHead,
      damageFlash: this.damageFlash,
      flashTime: f.flashTime,
      haste: f.haste > 0,
      slow: f.slow > 0,
      round: { phase: this.match.phase, timer: this.match.timer, round: this.match.round, scoreA: this.match.scoreA, scoreB: this.match.scoreB, roundTime: this.match.roundTime },
      stats: f.stats,
      fps: this.fps,
      mode: this.mode.id,
      mapName: this.map.name,
      enemies: this.fighters.filter((x) => x.alive && x.team !== f.team).length,
      allies: this.fighters.filter((x) => x.alive && x.team === f.team).length - 1,
      killfeed: this.killfeed.slice(),
      respawnTimer: f.alive ? 0 : Math.max(0, f.respawnTimer),
      hitDirs: this.hitDirs.map((h) => ({ id: h.id, ang: h.ang, t: h.t })),
      banners: this.banners.map((b) => ({ id: b.id, text: b.text, kind: b.kind, t: b.t })),
      spectating: this.mode.id === 'range' ? null : (f.alive ? null : (this.spectateTarget()?.name ?? null)),
      spawnGuard: Math.max(0, f.spawnGuard),
      streak: this.killStreak,
      matchPoint: this.match.scoreA >= FIRST_TO - 1 || this.match.scoreB >= FIRST_TO - 1,
      ping: this.net ? this.netPing : 0,
      net: this.net ? { role: this.netRole, state: this.net.state, ping: this.netPing, peer: this.netState?.remoteHello?.name || null, delay: Math.round(this.netState.delay || 0), jitter: Math.round(this.netState.jitter || 0), kind: this.net.kind || null } : null,
      scoreboard: this.scoreboard,
      board: this.scoreboard ? this.buildBoard() : null,
      lastWin: this.lastRoundWin,
    })
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
function jitter (dir, spreadRad) {
  if (spreadRad <= 0) return dir.clone()
  const d = dir.clone()
  const up = Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(d, up).normalize()
  const realUp = new THREE.Vector3().crossVectors(right, d).normalize()
  const a = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random()) * spreadRad
  d.addScaledVector(right, Math.cos(a) * Math.tan(r))
  d.addScaledVector(realUp, Math.sin(a) * Math.tan(r))
  return d.normalize()
}

function PhysicsRayCapsule (ro, rd, a, b, r) {
  const ba = new THREE.Vector3().subVectors(b, a)
  const oa = new THREE.Vector3().subVectors(ro, a)
  const baba = ba.dot(ba)
  const bard = ba.dot(rd)
  const baoa = ba.dot(oa)
  const rdoa = rd.dot(oa)
  const oaoa = oa.dot(oa)
  const A = baba - bard * bard
  const B = baba * rdoa - baoa * bard
  const C = baba * oaoa - baoa * baoa - r * r * baba
  const h = B * B - A * C
  if (h >= 0 && Math.abs(A) > 1e-9) {
    const t = (-B - Math.sqrt(h)) / A
    const y = baoa + t * bard
    if (y > 0 && y < baba) return t >= 0 ? t : null
    const oc = y <= 0 ? oa : new THREE.Vector3().subVectors(ro, b)
    const B2 = rd.dot(oc)
    const C2 = oc.dot(oc) - r * r
    const h2 = B2 * B2 - C2
    if (h2 > 0) { const t2 = -B2 - Math.sqrt(h2); return t2 >= 0 ? t2 : null }
    return null
  }
  return null
}

const ALL_PRIMARIES = ['vex9', 'krill', 'halberd', 'tremor', 'longspur', 'blackwing', 'shatter', 'wraith', 'prismc', 'quasar']
const ALL_SECONDARIES = ['q1', 'vesper', 'moskito', 'hornet', 'cutlass', 'needle', 'judge', 'flare', 'prismp', 'twinfang']
const ALL_MELEE = ['knife', 'fists', 'bat', 'machete', 'tonfa', 'katana', 'axe', 'spear', 'sledge', 'qynblade']
const ALL_UTILITY = ['frag', 'flash', 'smoke', 'emp', 'stim', 'dash', 'grapnel', 'barrier', 'mine', 'decoy']
const pick = (a) => a[Math.floor(Math.random() * a.length)]

export function randomLoadout () {
  return { primary: pick(ALL_PRIMARIES), secondary: pick(ALL_SECONDARIES), melee: pick(ALL_MELEE), utility: pick(ALL_UTILITY) }
}
export function randomSkin () {
  const ids = ['stock', 'midnight', 'arctic', 'ember', 'neon', 'hazard', 'vapor', 'jade', 'carbon']
  return SKIN_MAP[pick(ids)]
}
export { CHAINS, TUNE, WEAPON_MAP }
