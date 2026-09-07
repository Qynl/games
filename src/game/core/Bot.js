import * as THREE from 'three'
import { TUNE } from './Movement.js'

const _v = new THREE.Vector3()
const _dir = new THREE.Vector3()

export const DIFFICULTY = {
  easy: { react: 0.55, err: 3.4, turn: 4.5, burst: [0.35, 0.8], strafe: 0.5, seeThrough: 0.55, hp: 1 },
  normal: { react: 0.34, err: 1.9, turn: 7.0, burst: [0.5, 1.3], strafe: 0.8, seeThrough: 0.7, hp: 1 },
  hard: { react: 0.2, err: 1.0, turn: 10.5, burst: [0.7, 1.9], strafe: 1.0, seeThrough: 0.85, hp: 1 },
  qyn: { react: 0.13, err: 0.55, turn: 14, burst: [0.9, 2.4], strafe: 1.2, seeThrough: 1, hp: 1 },
}

// Bots drive the *same* movement controller as the player, just with synthetic
// input — so they slide, air-strafe and get stuck in exactly the same world.
export class Bot {
  constructor (fighter, level = 'normal') {
    this.f = fighter
    this.d = DIFFICULTY[level] || DIFFICULTY.normal
    this.level = level
    this.target = null
    this.think = 0
    this.react = 0
    this.strafeDir = Math.random() < 0.5 ? 1 : -1
    this.strafeTimer = 0
    this.fireHold = 0
    this.firePause = 0
    this.wanderAngle = Math.random() * Math.PI * 2
    this.wanderTimer = 0
    this.jumpCd = 0
    this.slideCd = 0
    this.lastSeen = new THREE.Vector3()
    this.hasSeen = false
    this.aimYaw = 0
    this.aimPitch = 0
    this.stuckTimer = 0
  }

  pickTarget (game) {
    let best = null, bestD = Infinity
    for (const f of game.fighters) {
      if (!f.alive || f.team === this.f.team) continue
      const d = f.mv.pos.distanceToSquared(this.f.mv.pos)
      if (d < bestD) { bestD = d; best = f }
    }
    return best
  }

  update (dt, game) {
    const f = this.f
    if (!f.alive) return
    this.think -= dt
    this.strafeTimer -= dt
    this.jumpCd -= dt
    this.slideCd -= dt
    this.firePause -= dt
    this.wanderTimer -= dt
    this.react -= dt

    if (this.think <= 0) {
      this.think = 0.12 + Math.random() * 0.15
      this.target = this.pickTarget(game)
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 0.7 + Math.random() * 1.4
        if (Math.random() < 0.55) this.strafeDir *= -1
      }
    }
    if (this.dummy) {
      // range dummies: face the player, never shoot back
      const p = game.player
      if (p) {
        const d = new THREE.Vector3().subVectors(p.mv.pos, f.mv.pos)
        f.mv.yaw = Math.atan2(-d.x, -d.z)
      }
      const inp0 = f.input
      inp0.forward = 0; inp0.right = 0; inp0.jump = false; inp0.crouch = false; inp0.sprint = false
      f.wantFire = false
      return
    }
    const t = this.target
    const inp = f.input
    inp.forward = 0
    inp.right = 0
    inp.jumpPressed = false
    inp.crouchPressed = false

    if (!t) {
      // wander toward the middle of the map
      this.wanderAngle += (Math.random() - 0.5) * dt * 2
      inp.forward = 1
      inp.sprint = true
      f.mv.yaw = this.wanderAngle
      this.aimYaw = this.wanderAngle
      this.aimPitch = 0
      return
    }

    const dist = f.mv.pos.distanceTo(t.mv.pos)
    _dir.copy(t.mv.pos).sub(f.mv.pos)
    const flat = Math.hypot(_dir.x, _dir.z)
    const wantYaw = Math.atan2(-_dir.x, -_dir.z)
    const eyeY = t.mv.pos.y + 1.1
    const myEye = f.mv.pos.y + f.mv.height * 0.9
    const wantPitch = Math.atan2(eyeY - myEye, flat)

    // ── aim with error + turn rate ────────────────────────────────────────
    const err = (Math.random() - 0.5) * this.d.err * 0.0174
    const turn = this.d.turn * dt
    this.aimYaw += clampAngle(wantYaw + err - this.aimYaw) * Math.min(1, turn)
    this.aimPitch += (wantPitch + err * 0.5 - this.aimPitch) * Math.min(1, turn)
    f.mv.yaw = this.aimYaw
    f.mv.pitch = this.aimPitch

    // ── line of sight ─────────────────────────────────────────────────────
    const from = _v.set(f.mv.pos.x, myEye, f.mv.pos.z)
    const dir = new THREE.Vector3().copy(t.mv.pos).setY(eyeY).sub(from).normalize()
    const hit = game.world.physics.raycast(from, dir, dist + 0.5)
    const los = !hit || hit.dist > dist - 0.4
    if (los) { this.hasSeen = true; this.lastSeen.copy(t.mv.pos); if (this.react < -0.5) this.react = this.d.react }
    else this.react = Math.max(this.react, this.d.react * 0.6)

    // ── movement: close the gap, strafe, use the map ───────────────────────
    const ideal = 9 + Math.random() * 6
    if (dist > ideal) inp.forward = 1
    else if (dist < 4.5) inp.forward = -0.6
    inp.right = this.strafeDir * this.d.strafe * (dist < 16 ? 1 : 0.35)
    inp.sprint = dist > 8
    inp.crouch = false

    // steer around obstacles: feelers left / right / ahead
    const ahead = new THREE.Vector3(Math.sin(f.mv.yaw) * -1, 0, Math.cos(f.mv.yaw) * -1)
    const probe = (ang, len) => {
      const d2 = ahead.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang)
      const o = _v.set(f.mv.pos.x, f.mv.pos.y + 0.9, f.mv.pos.z)
      return game.world.physics.raycast(o, d2, len)
    }
    const fa = probe(0, 3.2)
    const fl = probe(0.6, 2.6)
    const fr = probe(-0.6, 2.6)
    if (fa) { inp.right += (fl && !fr) ? 1 : (fr && !fl) ? -1 : (Math.random() < 0.5 ? 1 : -1) }
    if (fa && fa.dist < 1.6 && f.mv.grounded && this.jumpCd <= 0) { inp.jump = true; inp.jumpPressed = true; this.jumpCd = 0.7 }

    // don't walk into the void
    const groundAhead = (() => {
      const d3 = ahead.clone()
      const o = new THREE.Vector3(f.mv.pos.x + d3.x * 2.0, f.mv.pos.y + 0.6, f.mv.pos.z + d3.z * 2.0)
      const down = new THREE.Vector3(0, -1, 0)
      return game.world.physics.raycast(o, down, 4)
    })()
    if (!groundAhead && f.mv.grounded) {
      inp.right = this.strafeDir * 1.0
      inp.forward = Math.max(inp.forward, 0.4)
      if (this.jumpCd <= 0 && Math.random() < 0.4) { inp.jump = true; inp.jumpPressed = true; this.jumpCd = 1.1 }
    }

    // flair: bots slide-hop when closing at speed
    if (f.mv.grounded && f.mv.horizontalSpeed > TUNE.slideMinSpeed + 1.2 && this.slideCd <= 0 && dist > 6 && Math.random() < 0.03) {
      inp.crouch = true
      inp.crouchPressed = true
      this.slideCd = 1.6 + Math.random() * 2
      setTimeout(() => { if (this.f.input) { this.f.input.jump = true; this.f.input.jumpPressed = true } }, 260)
    }
    if (f.mv.sliding && f.mv.slideTime > 0.5) { inp.crouch = false }

    // unstick
    if (f.mv.horizontalSpeed < 0.6 && f.mv.grounded) {
      this.stuckTimer += dt
      if (this.stuckTimer > 0.6) {
        inp.right = this.strafeDir
        inp.forward = -1
        if (this.jumpCd <= 0) { inp.jump = true; inp.jumpPressed = true; this.jumpCd = 1 }
        if (this.stuckTimer > 1.6) { this.stuckTimer = 0; this.strafeDir *= -1 }
      }
    } else this.stuckTimer = 0

    // ── shoot ─────────────────────────────────────────────────────────────
    const w = f.weapons[f.slot]
    if (los && this.react <= 0 && this.firePause <= 0) {
      const angErr = Math.abs(clampAngle(wantYaw - f.mv.yaw))
      const inCone = angErr < (0.035 + 1.6 / Math.max(3, dist))
      if (inCone && dist < 70) {
        if (this.fireHold <= 0) { this.fireHold = this.d.burst[0] + Math.random() * (this.d.burst[1] - this.d.burst[0]) }
      }
    }
    if (this.fireHold > 0) {
      this.fireHold -= dt
      f.wantFire = true
      if (this.fireHold <= 0) this.firePause = 0.18 + Math.random() * 0.5
    } else {
      f.wantFire = false
      if (w && w.ammo <= 0 && !w.reloading) f.requestReload = true
    }
    f.wantAds = dist > 16 && los && this.fireHold <= 0
  }
}

function clampAngle (a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
