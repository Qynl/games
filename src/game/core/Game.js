import * as THREE from 'three'
import { MovementController, TUNE, CHAINS } from './Movement.js'
import { World } from './World.js'
import { VFX } from './VFX.js'
import { AudioKit } from './Audio.js'
import { CameraRig } from './Camera.js'
import { Input } from './Input.js'
import { Weapon, UtilitySlot, momentumScale } from './Weapons.js'
import { buildViewModel, buildCharacter } from './ViewModels.js'
import { Bot } from './Bot.js'
import { Match, ROUND_HP } from './Match.js'
import { MAP_BY_ID, MODES } from '../data/maps.js'
import { WEAPON_MAP, DEFAULT_LOADOUT } from '../data/weapons.js'
import { SKIN_MAP } from '../data/skins.js'

const STEP = 1 / 120
const TEAM_COLORS = { a: 0x6ee7ff, b: 0xff8a3d }
const BOT_NAMES = ['VEXA', 'K0RR', 'NILL', 'ZEPH', 'ORYX', 'SABLE', 'MOTH', 'QUEN', 'DRIFT', 'HALO', 'RUIN', 'ONYX']
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t

// ════════════════════════════════════════════════════════════════════════════
class Fighter {
  constructor (game, opts) {
    this.game = game
    this.team = opts.team
    this.name = opts.name
    this.isBot = !!opts.isBot
    this.mv = new MovementController(game.world.physics)
    this.input = { forward: 0, right: 0, jump: false, crouch: false, sprint: false, jumpPressed: false, crouchPressed: false }
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
    this.utility = new UtilitySlot(this.loadout.utility)
    this.slot = 'primary'
    this.prevSlot = 'secondary'
    this.wantFire = false
    this.wantFirePressed = false
    this.wantFireReleased = false
    this.wantAds = false
    this.requestReload = false
    this.stats = { kills: 0, deaths: 0, damage: 0, headshots: 0, best: 0 }
    this.haste = 0
    this.slow = 0
    this.hook = null
    this.lastAttacker = null
    this.flashTime = 0
    this.hitFlash = 0
    this.switchTimer = 0
    this.stepPhase = 0

    this.model = buildCharacter(TEAM_COLORS[this.team], this.isBot)
    game.world.scene.add(this.model)
    this.radius = 0.42
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
    const dmg = Math.round(amount)
    this.health -= dmg
    this.hitFlash = 1
    this.lastAttacker = from
    if (from && from !== this) from.stats.damage += dmg
    if (this.health <= 0) {
      this.health = 0
      this.game.killFighter(this, from, head)
    }
    if (dir) this.game.vfx.bloodPuff(new THREE.Vector3(this.mv.pos.x, this.mv.pos.y + 1.2, this.mv.pos.z), dir)
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
    this.haste = 0
    this.slow = 0
    this.flashTime = 0
    this.model.visible = true
    this.slot = 'primary'
    for (const k of ['primary', 'secondary', 'melee']) this.weapons[k].reset(true)
    this.utility.reset()
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
    this.vm = null
    this.vmState = { sway: new THREE.Vector2(), kick: new THREE.Vector3(), kickVel: new THREE.Vector3(), swing: 0, swingDir: 1, reload: 0 }
    this._cap = { a: new THREE.Vector3(), b: new THREE.Vector3() }
    this._from = new THREE.Vector3()
    this._dir = new THREE.Vector3()
    this.hitmarker = 0
    this.scoreboard = false
    this.lastHitWasHead = false
    this.damageFlash = 0
    this.hudAcc = 0

    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
  }

  // ── lifecycle ────────────────────────────────────────────────────────────
  load (config) {
    const { mapId, modeId, loadout, skin, botLevel, teamBots } = config
    this.config = config
    this.map = MAP_BY_ID[mapId] || MAP_BY_ID.yard
    this.mode = MODES.find((m) => m.id === modeId) || MODES[0]
    this.skin = SKIN_MAP[skin] || SKIN_MAP.stock
    this.world = new World(this.map)
    this.vfx = new VFX(this.world.scene)
    this.playerLoadout = loadout || { ...DEFAULT_LOADOUT }

    // player
    this.player = new Fighter(this, { team: 'a', name: 'YOU', loadout: this.playerLoadout, skin: this.skin })
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
        b.dummy = true
        this.bots.push(b)
      })
    }

    const teamSize = this.mode.teamB
    const botsNeeded = this.mode.bots
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5)
    // enemy team: bots (or human-shaped bots in PvP modes we fill with bots anyway)
    for (let i = 0; i < teamSize; i++) {
      const f = new Fighter(this, {
        team: 'b', name: names[i % names.length], isBot: true,
        loadout: randomLoadout(), skin: randomSkin(),
      })
      this.fighters.push(f)
      this.bots.push(new Bot(f, botLevel || 'normal'))
    }
    // friendly bots (1 + bot / 1 + 2 bots modes)
    const friendlyBots = Math.max(0, this.mode.teamA - 1)
    for (let i = 0; i < friendlyBots; i++) {
      const f = new Fighter(this, {
        team: 'a', name: names[(i + 6) % names.length] + '²', isBot: true,
        loadout: randomLoadout(), skin: randomSkin(),
      })
      this.fighters.push(f)
      this.bots.push(new Bot(f, botLevel || 'normal'))
    }

    this.match = new Match(this, this.mode)
    this.buildViewModelFor('primary')
    this.spawnAll()
    this.match.begin()
    this.rig.reset(0)
    this.resize()
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
    f.slot = 'primary'
    this.buildViewModelFor('primary')
  }

  dispose () {
    this.stop()
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

  setPaused (v) { this.paused = v }

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
    if (this.paused) { this.input.endFrame(); this.renderer.render(this.world.scene, this.camera); this.renderer.autoClear = false; this.renderer.clearDepth(); this.renderer.render(this.vmScene, this.vmCamera); this.renderer.autoClear = true; return }
    this._fpsAcc += raw; this._fpsN++
    if (this._fpsAcc > 0.35) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0 }

    this.acc += dt
    let steps = 0
    while (this.acc >= STEP && steps < 8) { this.fixedStep(STEP); this.acc -= STEP; steps++ }
    if (steps === 8) this.acc = 0

    this.renderFrame(dt)
  }

  fixedStep (dt) {
    this.time += dt
    const live = this.match.phase === 'live'
    // bots
    for (const b of this.bots) if (live || this.mode.id === 'range') b.update(dt, this)
    // fighters
    for (const f of this.fighters) this.stepFighter(f, dt, live)
    // projectiles + placeables
    this.stepProjectiles(dt)
    this.stepPlaceables(dt)
    this.vfx.update(dt)
    this.match.update(dt)
    if (this.mode.id !== 'range') this.checkFallOut()
  }

  stepFighter (f, dt, live) {
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

    if (f === this.player) this.readPlayerInput(f, dt, live)
    else f.wantFirePressed = f.wantFire && !f._prevFire
    f._prevFire = f.wantFire

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

    const before = f.mv.grounded
    f.mv.step(dt, f.input)
    if (f.mv.grounded && !before && f.mv.lastFallSpeed > 4) this.audio.land(clamp(f.mv.lastFallSpeed / 12, 0, 1))
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
    f.model.position.set(f.mv.pos.x, f.mv.pos.y, f.mv.pos.z)
    const visYaw = f === this.player ? this.rig.yaw : f.mv.yaw
    f.model.rotation.y = visYaw + Math.PI
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
    f.input.mouseDx = inp.mouse.dx

    f.wantFire = inp.mouseButtons[0] && live
    f.wantAds = inp.mouseButtons[2] && live
    f.wantFirePressed = inp.mousePressed[0] && live
    f.wantFireReleased = false
    f.wantFireHeld = inp.mouseButtons[0]

    if (inp.hit('KeyR')) f.requestReload = true
    if (inp.hit('Digit1')) this.switchSlot('primary')
    if (inp.hit('Digit2')) this.switchSlot('secondary')
    if (inp.hit('Digit3')) this.switchSlot('melee')
    if (inp.hit('KeyQ')) this.switchSlot(f.prevSlot)
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

  switchSlot (slot) {
    const f = this.player
    if (!f.alive || f.slot === slot || f.switchTimer > 0) return
    f.prevSlot = f.slot
    f.slot = slot
    f.switchTimer = 0.32
    f.weapons[f.prevSlot].cancelReload()
    this.buildViewModelFor(slot)
    this.audio.beep()
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
        this.damageTarget(e, dmg, f, false, baseDir, isPlayer)
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
          this.damageTarget(hit.fighter, dmg, f, hit.head, dir, isPlayer)
        }
        continue
      }
      const hit = this.raycastAll(f, origin, dir, s.range ?? 120)
      const dist = origin.distanceTo(hit.point)
      if (!s.silent) this.vfx.tracer(muzzleWorld, hit.point, f.team === 'a' ? 0xbfefff : 0xffd6a0, 0.02, s.pellets ? 0.05 : 0.075)
      if (hit.fighter) {
        const dmg = shot.dmg * mom * f.weapon.falloffMul(dist) * (hit.head ? s.head ?? 1.5 : 1)
        this.damageTarget(hit.fighter, dmg, f, hit.head, dir, isPlayer)
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

  damageTarget (target, dmg, from, head, dir, isPlayer) {
    const applied = target.applyDamage(dmg, from, head, dir)
    if (isPlayer) {
      this.hitmarker = 0
    this.hitmarker = 0.22
      this.lastHitWasHead = head
      if (head) this.audio.headshot(); else this.audio.hit()
      this.emit('damage', { amount: applied, head, speed: from.mv.horizontalSpeed })
    }
    if (target === this.player) {
      this.damageFlash = 1
      this.rig.addShake(0.5)
      this.audio.hurt()
    }
  }

  killFighter (victim, killer, head) {
    if (!victim.alive) return
    victim.alive = false
    victim.stats.deaths++
    victim.model.visible = false
    victim.respawnTimer = 999
    this.vfx.burst(new THREE.Vector3(victim.mv.pos.x, victim.mv.pos.y + 1, victim.mv.pos.z), 20, 0xff4d6d, 6, 0.13, 0.9, 14)
    if (killer && killer !== victim) {
      killer.stats.kills++
      if (head) killer.stats.headshots++
    }
    const entry = {
      id: Math.random().toString(36).slice(2),
      killer: killer ? killer.name : 'THE VOID',
      victim: victim.name,
      head: !!head,
      teamKill: killer && killer.team === victim.team,
      mine: killer === this.player,
      t: this.time,
    }
    this.killfeed.push(entry)
    if (this.killfeed.length > 6) this.killfeed.shift()
    if (killer === this.player) { this.audio.kill(); this.emit('kill', entry) }
    else if (victim === this.player) this.emit('death', { killer: killer ? killer.name : 'THE VOID' })
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
      p = new THREE.Vector3(list[Math.floor(Math.random() * list.length)].slice(0, 3).reduce((v, c, k) => (k === 1 ? v : v), new THREE.Vector3()))
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
    this.rig.update(dt, {
      yaw: f.mv.yaw, pitch: f.mv.pitch, pos: f.mv.pos, vel: f.mv.vel,
      horizontalSpeed: f.mv.horizontalSpeed, grounded: f.mv.grounded,
      sliding: f.mv.sliding, crouching: f.mv.crouching, sprinting: f.mv.sprinting,
      landImpact: f.mv.landImpact,
    }, f.weapon.ads, f.weapon.def.stats.adsFov)

    this.updateViewmodel(dt)
    this.hitmarker = Math.max(0, this.hitmarker - dt)
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2)

    // flash bang overlay handled through hud state
    this.renderer.render(this.world.scene, this.camera)
    this.renderer.autoClear = false
    this.renderer.clearDepth()
    this.renderer.render(this.vmScene, this.vmCamera)
    this.renderer.autoClear = true

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
      slope: f.mv.groundNormal.y,
      momentum: momentumScale(spd, f.slot === 'melee' ? 'melee' : 'gun'),
      topSpeed: f.mv.topSpeed,
      chains,
      utility: { name: f.utility.def.name, uses: f.utility.uses, id: f.utility.id },
      spread: w.currentSpread ? w.currentSpread({ speed: spd, grounded: f.mv.grounded, sliding: f.mv.sliding, crouching: f.mv.crouching }) : 0,
      hitmarker: this.hitmarker,
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
      scoreboard: this.scoreboard,
      board: this.scoreboard ? this.fighters.map((x) => ({
        name: x.name, team: x.team, you: x === f, dummy: !!x.isDummy,
        kills: x.stats.kills, deaths: x.stats.deaths, damage: Math.round(x.stats.damage),
        alive: x.alive, ping: x.ping ?? 0,
      })) : null,
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
