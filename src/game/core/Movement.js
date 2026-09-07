import * as THREE from 'three'
import { clamp } from './Physics.js'

// ────────────────────────────────────────────────────────────────────────────
//  MOVEMENT TUNING  (metres / seconds)
//  Nothing ever snaps: every speed change comes from acceleration, friction,
//  gravity or a slope. That is what lets momentum survive a whole chain.
// ────────────────────────────────────────────────────────────────────────────
export const TUNE = {
  radius: 0.36,
  standHeight: 1.8,
  crouchHeight: 1.25,
  slideHeight: 0.95,

  gravity: 22.0,
  jumpVel: 7.75,
  jumpCutMul: 0.45,

  walkSpeed: 6.2,
  sprintSpeed: 10.2,
  crouchSpeed: 3.3,

  groundAccel: 9.0,     // accel * wishSpeed * dt  (Quake style, responsive but never instant)
  airAccel: 26.0,
  airWishCap: 2.7,      // air-strafe ceiling — turns + A/D make speed, W does not
  friction: 6.5,
  stopSpeed: 2.5,

  slideMinSpeed: 5.0,
  slideEndSpeed: 3.4,
  slideBoost: 1.4,
  slideFriction: 0.45,
  slideSteer: 4.2,   // rad/s of carve authority while sliding
  slideHopBonus: 0.12,
  slideHopBonusMax: 0.9,
  slideCooldown: 0.18,

  jumpBuffer: 0.15,
  coyoteTime: 0.12,

  stepHeight: 0.52,
  groundSnap: 0.3,
  maxAirDragSpeed: 16.0,
  airDrag: 1.6,

  slideEye: 0.72,
  crouchEye: 1.05,
  standEye: 1.62,
}

const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _wish = new THREE.Vector3()
const _n = new THREE.Vector3()

export class MovementController {
  constructor (world, opts = {}) {
    this.world = world
    this.pos = new THREE.Vector3(0, 2, 0)
    this.vel = new THREE.Vector3()
    this.yaw = 0
    this.pitch = 0
    this.height = TUNE.standHeight
    this.targetHeight = TUNE.standHeight
    this.radius = TUNE.radius

    this.grounded = false
    this.wasGrounded = false
    this.groundNormal = new THREE.Vector3(0, 1, 0)
    this.airTime = 0
    this.coyote = 0
    this.jumpBuffer = 0
    this.sliding = false
    this.crouching = false
    this.sprinting = false
    this.slideTime = 0
    this.slideCooldown = 0
    this.slideEntrySpeed = 0
    this.slideHopTimer = 0
    this.wallHit = false
    this.headHit = false
    this.landImpact = 0
    this.lastFallSpeed = 0
    this.lastLandSpeed = 0
    this.speedMult = 1
    this.time = 0
    this.distance = 0
    this.topSpeed = 0
    this.events = []
    this._throttle = {}
    this._contacts = []
    this.tracker = new ChainTracker()
    this.inputCache = { forward: 0, right: 0, jump: false, crouch: false, sprint: false }
  }

  get horizontalSpeed () { return Math.hypot(this.vel.x, this.vel.z) }
  get speed () { return this.vel.length() }

  reset (pos, yaw = 0) {
    this.pos.copy(pos)
    this.vel.set(0, 0, 0)
    this.yaw = yaw
    this.height = this.targetHeight = TUNE.standHeight
    this.grounded = false
    this.wasGrounded = false
    this.sliding = false
    this.crouching = false
    this.sprinting = false
    this.airTime = 0
    this.coyote = 0
    this.jumpBuffer = 0
    this.slideCooldown = 0
    this.slideHopTimer = 0
    this.time = 0
    this.distance = 0
    this.topSpeed = 0
    this.events.length = 0
    this._throttle = {}
  }

  emit (type, data = {}) {
    this.events.push({ type, t: this.time, ...data })
    if (this.events.length > 80) this.events.splice(0, this.events.length - 80)
    this.tracker.ingest(this.events)
  }

  emitEvery (type, gap, data = {}) {
    const last = this._throttle[type] || -99
    if (this.time - last < gap) return
    this._throttle[type] = this.time
    this.emit(type, data)
  }

  // ── fixed-step simulation ─────────────────────────────────────────────────
  step (dt, input) {
    this.time += dt
    this.inputCache = input
    this.slideCooldown -= dt
    this.jumpBuffer -= dt
    this.slideHopTimer -= dt
    this.coyote -= dt

    if (input.jumpPressed) {
      this.jumpBuffer = TUNE.jumpBuffer
      if (!this.grounded && this.coyote <= 0) this.emit('jumpBuffered')
    }
    if (!input.jump && this.jumpHeld && this.vel.y > 0) this.vel.y *= TUNE.jumpCutMul
    this.jumpHeld = input.jump

    // ── wish direction (view relative) ─────────────────────────────────────
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw)
    const f = input.forward, r = input.right
    _wish.set(-sy * f + cy * r, 0, -cy * f - sy * r)
    const wl = _wish.length()
    if (wl > 1) _wish.multiplyScalar(1 / wl)

    const speed = this.horizontalSpeed
    const wantCrouch = input.crouch

    // ── sprint ─────────────────────────────────────────────────────────────
    const canSprint = input.sprint && f > 0.1 && !this.sliding && !wantCrouch
    if (canSprint && !this.sprinting && this.grounded) this.emit('sprintOn')
    this.sprinting = canSprint

    // ── slide entry ────────────────────────────────────────────────────────
    if (input.crouchPressed && !this.sliding && this.slideCooldown <= 0 && this.grounded) {
      const fastEnough = speed > TUNE.slideMinSpeed || (this.sprinting && speed > TUNE.walkSpeed * 0.75)
      if (fastEnough) this.startSlide()
    }
    if (this.sliding) {
      this.slideTime += dt
      const tooSlow = this.horizontalSpeed < TUNE.slideEndSpeed && this.slideTime > 0.22
      const gaveUp = !wantCrouch && this.slideTime > 0.3
      const expired = tooSlow && this.slideTime > 1.6
      if (!this.grounded || expired || gaveUp || (tooSlow && !wantCrouch)) this.endSlide()
    }

    // ── stance ─────────────────────────────────────────────────────────────
    if (this.sliding) {
      this.crouching = true
      this.targetHeight = TUNE.slideHeight
    } else if (this.crouching) {
      if (!wantCrouch) this.tryStand()
      this.targetHeight = this.crouching ? TUNE.crouchHeight : TUNE.standHeight
    } else if (wantCrouch) {
      this.crouching = true
      this.targetHeight = TUNE.crouchHeight
    } else {
      this.targetHeight = TUNE.standHeight
    }

    // ── ground / air ───────────────────────────────────────────────────────
    if (this.grounded) {
      this.coyote = TUNE.coyoteTime
      this.airTime = 0
      if (this.sliding) {
        this.slideMove(dt, _wish)
      } else {
        this.friction(dt, TUNE.friction, TUNE.stopSpeed)
        const target = (this.crouching ? TUNE.crouchSpeed : this.sprinting ? TUNE.sprintSpeed : TUNE.walkSpeed) * this.speedMult
        this.accelerate(_wish, target, TUNE.groundAccel, dt)
      }
      // gravity projected onto the slope plane: downhill gains, uphill bleeds,
      // slopes feel like slopes and never like walls.
      this.vel.y -= TUNE.gravity * dt
      const gn = this.groundNormal
      const vn = this.vel.dot(gn)
      if (vn < 0) this.vel.addScaledVector(gn, -vn)

      // downhill detection (horizontal projection of the normal points downhill)
      if (gn.y < 0.985 && (this.sliding || this.sprinting)) {
        const nl = Math.hypot(gn.x, gn.z)
        if (nl > 0.01) {
          const dx = gn.x / nl, dz = gn.z / nl
          if (this.vel.x * dx + this.vel.z * dz > 1.5) this.emitEvery('downhill', 0.4, { speed })
        }
      }
    } else {
      this.airTime += dt
      if (this.wasGrounded) this.emit('leftGround')
      this.accelerate(_wish, TUNE.airWishCap, TUNE.airAccel, dt)
      this.vel.y -= TUNE.gravity * dt
      const hs = this.horizontalSpeed
      if (hs > TUNE.maxAirDragSpeed) {
        const k = Math.max(0, 1 - TUNE.airDrag * (hs - TUNE.maxAirDragSpeed) * dt)
        this.vel.x *= k
        this.vel.z *= k
      }
      if (Math.abs(r) > 0.1 && Math.abs(input.mouseDx || 0) > 0.4) {
        this.emitEvery('airstrafe', 0.18, { speed: hs })
      }
    }

    if (this.grounded && Math.abs(r) > 0.1 && !this.sliding) this.emitEvery('strafe', 0.3)

    // ── jump (buffer + coyote, both invisible) ──────────────────────────────
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0) && !this.headHit) {
      const viaCoyote = !this.grounded
      this.jump()
      if (viaCoyote) this.emit('coyoteJump')
    }

    // ── integrate + collide ────────────────────────────────────────────────
    this.wasGrounded = this.grounded
    this.moveAndCollide(dt)
    if (this.grounded && !this.wasGrounded) this.onLand()

    const s = this.horizontalSpeed
    if (s > this.topSpeed) this.topSpeed = s
    this.distance += s * dt
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  friction (dt, coeff, stopSpeed) {
    const speed = this.horizontalSpeed
    if (speed < 1e-4) { this.vel.x = 0; this.vel.z = 0; return }
    const drop = Math.max(speed, stopSpeed) * coeff * dt
    const scale = Math.max(speed - drop, 0) / speed
    this.vel.x *= scale
    this.vel.z *= scale
  }

  accelerate (wishDir, wishSpeed, accel, dt) {
    if (wishSpeed <= 0) return
    const current = this.vel.x * wishDir.x + this.vel.z * wishDir.z
    const add = wishSpeed - current
    if (add <= 0) return
    let a = accel * wishSpeed * dt
    if (a > add) a = add
    this.vel.x += wishDir.x * a
    this.vel.z += wishDir.z * a
  }

  slideMove (dt, wishDir) {
    const speed = this.horizontalSpeed
    if (speed < 1e-4) return
    // low friction → long, fast slides that slowly bleed off
    const drop = Math.max(speed, 3.0) * TUNE.slideFriction * dt
    const scale = Math.max(speed - drop, 0) / speed
    this.vel.x *= scale
    this.vel.z *= scale
    // steering CARVES: it rotates the velocity vector toward the input without
    // ever adding speed, so a slide keeps exactly the momentum it had.
    const wl = Math.hypot(wishDir.x, wishDir.z)
    if (wl > 0.01 && this.horizontalSpeed > 0.4) {
      const sp = this.horizontalSpeed
      const ca = (this.vel.x * wishDir.x + this.vel.z * wishDir.z) / (sp * wl)
      const cross = (this.vel.x * wishDir.z - this.vel.z * wishDir.x)
      const angle = Math.atan2(cross / (sp * wl), ca)
      const maxTurn = TUNE.slideSteer * dt
      const turn = clamp(angle, -maxTurn, maxTurn)
      const cs = Math.cos(turn), sn = Math.sin(turn)
      const vx = this.vel.x, vz = this.vel.z
      this.vel.x = vx * cs - vz * sn
      this.vel.z = vx * sn + vz * cs
    }
  }

  startSlide () {
    const hs = this.horizontalSpeed
    this.sliding = true
    this.crouching = true
    this.slideTime = 0
    this.slideEntrySpeed = hs
    this.targetHeight = TUNE.slideHeight
    if (hs > 0.001) {
      const k = TUNE.slideBoost / hs
      this.vel.x += this.vel.x * k
      this.vel.z += this.vel.z * k
    }
    this.emit('slideStart', { speed: hs, downhill: this.groundNormal.y < 0.99 })
  }

  endSlide () {
    if (!this.sliding) return
    this.sliding = false
    this.slideCooldown = TUNE.slideCooldown
    this.slideHopTimer = 0.5
    if (!this.inputCache.crouch) this.tryStand()
    this.targetHeight = this.crouching ? TUNE.crouchHeight : TUNE.standHeight
  }

  jump () {
    const hs = this.horizontalSpeed
    if (this.sliding) {
      this.sliding = false
      this.slideCooldown = TUNE.slideCooldown * 0.5
      this.slideHopTimer = 0.75
      // SLIDE JUMP — horizontal velocity is never reset; a small bonus rewards
      // hopping out while still fast.
      if (hs > 6.0) {
        const bonus = clamp((hs - 6.5) * TUNE.slideHopBonus, 0, TUNE.slideHopBonusMax)
        const k = bonus / hs
        this.vel.x += this.vel.x * k
        this.vel.z += this.vel.z * k
      }
      if (hs > 8.5) this.emit('fastSlideJump', { speed: hs })
      this.emit('slideJump', { speed: hs })
    } else {
      this.emit('jump', { speed: hs })
    }
    this.vel.y = TUNE.jumpVel
    this.grounded = false
    this.coyote = 0
    this.jumpBuffer = 0
    this.wasGrounded = false
    this.targetHeight = this.crouching ? TUNE.crouchHeight : TUNE.standHeight
    this.height = Math.min(this.height, TUNE.crouchHeight)
  }

  onLand () {
    this.landImpact = clamp(this.lastFallSpeed / 15, 0, 1.5)
    this.lastLandSpeed = this.horizontalSpeed
    this.emit('land', { speed: this.horizontalSpeed, fall: this.lastFallSpeed })
    // LAND → SLIDE, instantly: crouch held (or a fresh slide-hop) resumes the
    // slide with zero momentum loss.
    const hs = this.horizontalSpeed
    if (this.slideCooldown <= 0 &&
        ((this.inputCache.crouch && hs > TUNE.slideMinSpeed) ||
         (this.slideHopTimer > 0 && this.inputCache.crouch && hs > 3.8))) {
      this.startSlide()
    }
  }

  tryStand () {
    if (!this.crouching) return
    if (!this.world.overlaps(this.pos, this.radius, TUNE.standHeight)) {
      this.crouching = false
      this.targetHeight = TUNE.standHeight
    } else {
      this.targetHeight = TUNE.crouchHeight
    }
  }

  moveAndCollide (dt) {
    const r = this.radius
    const entryVy = this.vel.y
    const startX = this.pos.x, startY = this.pos.y, startZ = this.pos.z
    const startVx = this.vel.x, startVz = this.vel.z
    const disp = this.vel.length() * dt
    const sub = Math.min(6, Math.max(1, Math.ceil(disp / (r * 0.6))))
    const sdt = dt / sub
    let grounded = false
    let gn = null
    const hs0 = Math.hypot(startVx, startVz)
    this.wallHit = false
    this.headHit = false

    for (let s = 0; s < sub; s++) {
      this.pos.addScaledVector(this.vel, sdt)
      for (let it = 0; it < 6; it++) {
        const contacts = this.world.capsuleContacts(this.pos, r, this.height, this._contacts)
        if (!contacts.length) break
        let deep = contacts[0]
        for (const c of contacts) if (c.pen > deep.pen) deep = c
        const n = deep.n
        this.pos.addScaledVector(n, deep.pen + 1e-4)
        const vn = this.vel.dot(n)
        if (vn < 0) this.vel.addScaledVector(n, -vn)   // only kill into-surface speed
        if (n.y > 0.55) { grounded = true; gn = n }
        else if (n.y < -0.5) this.headHit = true
        else { this.wallHit = true; _n.copy(n) }
      }
    }

    // ── step up ────────────────────────────────────────────────────────────
    // Small edges must never eat momentum, so we re-run the whole frame from
    // the start position at a raised height and restore the original
    // horizontal velocity when it works.
    // Trigger on a wall hit OR when a stair nose / lip stole a big chunk of
    // momentum. Either way the frame is re-run as a step and the original
    // velocity is restored, so climbing never costs speed.
    const endSpeed = Math.hypot(this.vel.x, this.vel.z)
    const momentumEaten = hs0 > 1.0 && endSpeed < hs0 * 0.75
    if (this.wasGrounded && (this.wallHit || momentumEaten)) {
      if (hs0 > 0.4) {
        const dx = startVx / hs0, dz = startVz / hs0
        const probe = r * 0.85 + hs0 * dt
        const tr = r * 0.88          // a hair of tolerance so steep stairs still read as steps
        for (let up = 0.08; up <= TUNE.stepHeight; up += 0.06) {
          const t = _v.set(startX + dx * probe, startY + up, startZ + dz * probe)
          if (this.world.overlaps(t, tr, this.height)) continue
          // descend until we touch something: that is the new floor.
          // The first contact is always shallow, so its normal is trustworthy.
          let restY = null
          let ny = 0
          for (let d = 0.0; d <= up + 0.3; d += 0.03) {
            const p = _v2.copy(t)
            p.y -= d
            const pen = this.world.deepestContact(p, r, this.height, _n)
            if (pen > 1e-3) { restY = p.y + (d > 0 ? 0.03 : 0); ny = _n.y; break }
          }
          if (restY === null || ny <= 0.55 || restY < startY - 0.06) continue
          const p = _v2.set(t.x, restY, t.z)
          if (this.world.overlaps(p, r, this.height)) continue
          this.pos.copy(p)
          this.vel.x = startVx
          this.vel.z = startVz
          this.vel.y = entryVy
          grounded = true
          gn = _n.clone()
          this.wallHit = false
          break
        }
      }
    }

    // ── ground snap ────────────────────────────────────────────────────────
    // Keeps you glued to descending slopes / stairs instead of launching off
    // every ramp crest.
    // Glue to the floor when we just left a *flat* surface (stair noses, tiny
    // lips). Ramps keep their launch, so slopes never feel sticky.
    const flatLaunch = this.wasGrounded && this.groundNormal.y > 0.95 && this.vel.y < 3.0
    if (!grounded && (this.vel.y <= 1.2 || flatLaunch)) {
      const snap = TUNE.groundSnap + Math.max(0, -this.vel.y) * dt
      const test = _v.copy(this.pos)
      test.y -= snap
      const pen = this.world.deepestContact(test, r, this.height, _n)
      if (pen > 0 && _n.y > 0.55 && pen <= snap + 0.03) {
        this.pos.copy(test).addScaledVector(_n, pen + 1e-4)
        grounded = true
        gn = _n.clone()
        const vn = this.vel.dot(gn)
        if (vn < 0) this.vel.addScaledVector(gn, -vn)
        // flat surfaces: absorb the little pop a stair nose creates (ramps keep theirs)
        else if (gn.y > 0.95 && this.vel.y > 0) this.vel.y = 0
        for (let it = 0; it < 3; it++) {
          const cs = this.world.capsuleContacts(this.pos, r, this.height, this._contacts)
          if (!cs.length) break
          let deep = cs[0]
          for (const c of cs) if (c.pen > deep.pen) deep = c
          this.pos.addScaledVector(deep.n, deep.pen + 1e-4)
          const v2 = this.vel.dot(deep.n)
          if (v2 < 0) this.vel.addScaledVector(deep.n, -v2)
        }
      }
    }

    // smooth collision height morph — no popping, no snagging on ceilings
    const rate = 1 - Math.exp(-18 * dt)
    this.height += (this.targetHeight - this.height) * rate
    if (Math.abs(this.height - this.targetHeight) < 0.01) this.height = this.targetHeight

    this.grounded = grounded
    this.lastFallSpeed = grounded ? Math.max(0, -entryVy) : Math.max(0, -this.vel.y)
    if (grounded && gn) this.groundNormal.copy(gn)
    else if (!grounded) this.groundNormal.set(0, 1, 0)
    if (grounded && this.vel.y < 0) this.vel.y = 0
  }

  snapshot () {
    return {
      speed: this.horizontalSpeed,
      vert: this.vel.y,
      vel: this.vel.clone(),
      grounded: this.grounded,
      sliding: this.sliding,
      sprinting: this.sprinting,
      crouching: this.crouching,
      slope: this.groundNormal.y,
      height: this.height,
      pos: this.pos.clone(),
      top: this.topSpeed,
      chains: this.tracker.progress(),
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Chain tracker: proves the nine required chains actually work, in game.
// ────────────────────────────────────────────────────────────────────────────
export const CHAINS = [
  { id: 1, name: 'SPRINT → SLIDE', seq: ['sprintOn', 'slideStart'] },
  { id: 2, name: 'SPRINT → SLIDE → JUMP', seq: ['sprintOn', 'slideStart', 'slideJump'] },
  { id: 3, name: 'SPRINT → JUMP → AIR STRAFE', seq: ['sprintOn', 'jump', 'airstrafe'] },
  { id: 4, name: 'SPRINT → SLIDE → JUMP → AIR STRAFE → LAND → SLIDE', seq: ['sprintOn', 'slideStart', 'slideJump', 'airstrafe', 'land', 'slideStart'] },
  { id: 5, name: 'DOWNHILL SPRINT → SLIDE', seq: ['downhill', 'slideStart'] },
  { id: 6, name: 'HIGH-SPEED SLIDE → JUMP', seq: ['slideStart', 'fastSlideJump'] },
  { id: 7, name: 'STRAFE → JUMP → AIR STRAFE → LAND', seq: ['strafe', 'jump', 'airstrafe', 'land'] },
  { id: 8, name: 'JUMP BUFFER → LAND → JUMP', seq: ['jumpBuffered', 'land', 'jump'] },
  { id: 9, name: 'COYOTE TIME → JUMP', seq: ['leftGround', 'coyoteJump'] },
]

export class ChainTracker {
  constructor () { this.done = {}; this.order = []; this.maxGap = 1.5 }
  ingest (events) {
    const last = events[events.length - 1]
    if (!last) return
    for (const c of CHAINS) {
      if (this.done[c.id]) continue
      if (last.type !== c.seq[c.seq.length - 1]) continue
      const found = []
      let ei = events.length - 1
      let ok = true
      for (let s = c.seq.length - 1; s >= 0; s--) {
        let j = ei
        while (j >= 0 && events[j].type !== c.seq[s]) j--
        if (j < 0) { ok = false; break }
        found.push(events[j])
        ei = j - 1
      }
      if (!ok) continue
      found.reverse()
      for (let k = 1; k < found.length; k++) {
        if (found[k].t - found[k - 1].t > this.maxGap) { ok = false; break }
      }
      if (!ok) continue
      this.done[c.id] = true
      this.order.push(c.id)
    }
  }
  progress () { return { done: this.done, count: this.order.length, total: CHAINS.length } }
}
