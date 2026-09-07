import * as THREE from 'three'
import { TUNE } from './Movement.js'

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// ────────────────────────────────────────────────────────────────────────────
//  First person camera: restrained, readable feedback. Nothing here is allowed
//  to disconnect the player from what the movement is actually doing.
// ────────────────────────────────────────────────────────────────────────────
export class CameraRig {
  constructor (camera) {
    this.camera = camera
    this.yaw = 0
    this.pitch = 0
    this.baseFov = 95
    this.fov = this.baseFov
    this.eye = TUNE.standEye
    this.eyeTarget = TUNE.standEye
    this.dip = 0
    this.dipVel = 0
    this.roll = 0
    this.bob = 0
    this.bobPhase = 0
    this.slideTilt = 0
    this.recoil = new THREE.Vector2()     // pitch / yaw kick (radians)
    this.recoilVel = new THREE.Vector2()
    this.shake = 0
    this.pos = new THREE.Vector3()
    this.sprintBlend = 0
    this.slideBlend = 0
    this.landPunch = 0
  }

  reset (yaw = 0) {
    this.yaw = yaw
    this.pitch = 0
    this.dip = this.dipVel = 0
    this.roll = 0
    this.recoil.set(0, 0)
    this.recoilVel.set(0, 0)
    this.shake = 0
    this.eye = TUNE.standEye
  }

  addRecoil (v, h) {
    this.recoilVel.x -= v * 0.02
    this.recoilVel.y += (Math.random() - 0.5) * h * 0.02
  }

  addShake (amount) { this.shake = Math.min(1.2, this.shake + amount) }

  update (dt, mv, ads, adsFov, opts = {}) {
    // ── look ────────────────────────────────────────────────────────────────
    this.yaw = mv.yaw
    this.pitch = clamp(mv.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01)

    // ── eye height (smooth, never snaps between stances) ────────────────────
    this.eyeTarget = mv.sliding ? TUNE.slideEye : mv.crouching ? TUNE.crouchEye : TUNE.standEye
    const eyeRate = 1 - Math.exp(-(mv.sliding ? 16 : 12) * dt)
    this.eye = lerp(this.eye, this.eyeTarget, eyeRate)

    // ── landing dip: a critically damped spring ─────────────────────────────
    if (mv.landImpact > 0) {
      this.dipVel -= mv.landImpact * 3.4
      mv.landImpact = 0
    }
    const k = 190, c = 22
    this.dipVel += (-k * this.dip - c * this.dipVel) * dt
    this.dip += this.dipVel * dt
    this.dip = clamp(this.dip, -0.42, 0.2)

    // ── blends ──────────────────────────────────────────────────────────────
    const sprinting = mv.sprinting && mv.horizontalSpeed > 7.5 && mv.grounded
    this.sprintBlend = lerp(this.sprintBlend, sprinting ? 1 : 0, 1 - Math.exp(-9 * dt))
    this.slideBlend = lerp(this.slideBlend, mv.sliding ? 1 : 0, 1 - Math.exp(-14 * dt))

    // ── roll: strafe lean + slide lean ──────────────────────────────────────
    const right = Math.sin(this.yaw), cosY = Math.cos(this.yaw)
    const lateral = (-mv.vel.x * cosY + mv.vel.z * right) // +right/-left
    const targetRoll = clamp(-lateral / 13, -1, 1) * 0.055 + this.slideBlend * lateral * 0.004
    this.roll = lerp(this.roll, targetRoll, 1 - Math.exp(-8 * dt))

    // ── walk bob (subtle, speed scaled, only on the ground) ─────────────────
    const sp = mv.horizontalSpeed
    const bobAmp = mv.grounded && !mv.sliding ? clamp(sp / 11, 0, 1.2) * 0.022 : 0
    this.bobPhase += dt * (6.5 + sp * 0.55)
    this.bob = Math.sin(this.bobPhase) * bobAmp
    const bobX = Math.cos(this.bobPhase * 0.5) * bobAmp * 0.9

    // ── fov: sprint + slide push, ads pull ──────────────────────────────────
    const speedFov = clamp((sp - 6) / 9, 0, 1)
    let fovTarget = this.baseFov + this.sprintBlend * 7 + speedFov * 5 + this.slideBlend * 3
    if (ads > 0.01 && adsFov) fovTarget = lerp(fovTarget, adsFov, ads)
    // a tiny kick of fov on landing sells the impact without shaking anything
    fovTarget += clamp(-this.dip, 0, 0.4) * 8
    this.fov = lerp(this.fov, fovTarget, 1 - Math.exp(-(ads > 0.5 ? 18 : 11) * dt))

    // ── recoil spring back to zero ──────────────────────────────────────────
    this.recoilVel.multiplyScalar(Math.exp(-14 * dt))
    this.recoil.addScaledVector(this.recoilVel, dt * 60)
    this.recoil.multiplyScalar(Math.exp(-9 * dt))

    this.shake = Math.max(0, this.shake - dt * 2.6)
    const sh = this.shake * this.shake * 0.02

    // ── apply ───────────────────────────────────────────────────────────────
    this.pos.set(mv.pos.x, mv.pos.y + this.eye + this.dip + this.bob, mv.pos.z)
    this.camera.position.copy(this.pos)
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.set(
      this.pitch + this.recoil.x + (Math.random() - 0.5) * sh,
      this.yaw + this.recoil.y + (Math.random() - 0.5) * sh,
      this.roll,
    )
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov
      this.camera.updateProjectionMatrix()
    }
    this._bobX = bobX
  }
}
