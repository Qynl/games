// PlayerController — first-person movement/physics (pure math, no Three.js)
// + keyboard/mouse input.
//
// Conventions:
//   yaw 0 => facing +z (toward the AI head's sky spot); +yaw rotates toward +x
//   camera forward = (sin yaw*cos pitch, sin pitch, cos yaw*cos pitch)
//   player body = vertical AABB: radius 0.36, height 1.76 (crouch 1.25)

import type { PlayerState } from '../types'
import { clamp, dist2d } from '../utils/helpers'

export const GRAVITY = 24
export const JUMP_SPEED = 9.6
export const WALK_SPEED = 6.2
export const EYE_HEIGHT = 1.62
export const BODY_H = 1.76
export const BODY_H_CROUCH = 1.25
export const BODY_R = 0.36
export const STEP_UP = 0.45

export interface ColliderBox {
  x: number; y: number; z: number
  hx: number; hy: number; hz: number
  id: string
}

export interface PlayerEvents {
  onAction: (a: { type: 'move' | 'jump' | 'jump2' | 'crouch' | 'interact' | 'run' | 'look'; at: number }) => void
  onInteractRequest: () => void
  onFootstep: () => void
  onJump: () => void
  onLand: (hard: boolean) => void
}

export class PlayerController {
  pos = { x: 0, y: 5, z: 6 }
  vel = { x: 0, y: 0, z: 0 }
  yaw = 0
  pitch = 0
  grounded = false
  onGroundId: string | null = null
  /** set by the engine while double-jump boots are active */
  doubleJump = false
  private airJumpUsed = false
  private spaceWasDown = false
  hp = 3
  lives = 3
  alive = true
  private invuln = 0
  crouching = false
  moveTime = 0
  moving = false
  speedFactor = 1

  inVehicle: string | null = null
  vehicleSeatY = 0.9
  vehicleAngle = 0

  private keys = new Set<string>()
  private sensitivity = 1
  private interactQueued = false
  private stepAcc = 0
  private ev: PlayerEvents
  private terrainHeightAt: (x: number, z: number) => number
  private colliders: ColliderBox[] = []
  private worldBound = 55.5
  private fallFromY = -1

  constructor(ev: PlayerEvents) {
    this.ev = ev
    this.terrainHeightAt = () => 0
  }

  syncWorld(opts: {
    terrainHeightAt: (x: number, z: number) => number
    colliders: ColliderBox[]
    sensitivity: number
  }) {
    this.terrainHeightAt = opts.terrainHeightAt
    this.colliders = opts.colliders
    this.sensitivity = opts.sensitivity
  }

  // ------------------------------------------------------------- input api
  private keyHandler = (e: KeyboardEvent, down: boolean) => {
    const k = e.code
    if (down) {
      this.keys.add(k)
      if (k === 'KeyE') {
        this.interactQueued = true
        this.ev.onAction({ type: 'interact', at: performance.now() })
      }
      if (k === 'Space' && !e.repeat) this.ev.onAction({ type: 'jump', at: performance.now() })
      if (k === 'ControlLeft') this.ev.onAction({ type: 'crouch', at: performance.now() })
      if (k === 'ShiftLeft') this.ev.onAction({ type: 'run', at: performance.now() })
    } else {
      this.keys.delete(k)
    }
    if (!e.repeat && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'ShiftLeft', 'ControlLeft'].includes(k)) {
      this.ev.onAction({ type: 'move', at: performance.now() })
    }
  }

  bind() {
    const kd = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      this.keyHandler(e, true)
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault()
    }
    const ku = (e: KeyboardEvent) => this.keyHandler(e, false)
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement === null) return
      const sens = 0.00215 * this.sensitivity
      this.yaw -= e.movementX * sens
      this.pitch = clamp(this.pitch - e.movementY * sens, -1.55, 1.55)
      this.ev.onAction({ type: 'look', at: performance.now() })
    }
    const lock = () => this.ev.onAction({ type: 'look', at: performance.now() })
    document.addEventListener('keydown', kd)
    document.addEventListener('keyup', ku)
    document.addEventListener('mousemove', mm)
    document.addEventListener('pointerlockchange', lock)
    this.cleanupInput = () => {
      document.removeEventListener('keydown', kd)
      document.removeEventListener('keyup', ku)
      document.removeEventListener('mousemove', mm)
      document.removeEventListener('pointerlockchange', lock)
    }
  }

  cleanupInput: () => void = () => {}

  /** drop a queued E press (used when leaving a vehicle) */
  swallowInteract() {
    this.interactQueued = false
    this.keys.delete('KeyE')
    this.keys.delete('KeyF')
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement !== null
  }

  keysHeld() {
    return this.keys
  }

  // --------------------------------------------------------------- vectors
  forwardVec(): { x: number; z: number } {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }
  }

  rightVec(): { x: number; z: number } {
    return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) }
  }

  viewDir(): { x: number; y: number; z: number } {
    const cy = Math.cos(this.pitch)
    return {
      x: Math.sin(this.yaw) * cy,
      y: Math.sin(this.pitch),
      z: Math.cos(this.yaw) * cy,
    }
  }

  eyePos(): { x: number; y: number; z: number } {
    const h = this.crouching ? EYE_HEIGHT - 0.5 : EYE_HEIGHT
    return { x: this.pos.x, y: this.pos.y + h, z: this.pos.z }
  }

  bodyHeight(): number {
    return this.crouching ? BODY_H_CROUCH : BODY_H
  }

  // ------------------------------------------------------------- state ops
  queueTeleport(x: number, y: number, z: number, yaw?: number) {
    this.pos.x = x
    this.pos.y = y
    this.pos.z = z
    this.vel.x = 0
    this.vel.y = 0
    this.vel.z = 0
    if (yaw !== undefined) this.yaw = yaw
    this.grounded = false
    this.invuln = Math.max(this.invuln, 1.1)
  }

  applyImpulse(x: number, y: number, z: number) {
    this.vel.x += x
    this.vel.y += y
    this.vel.z += z
  }

  damage(n = 1): boolean {
    if (this.invuln > 0 || !this.alive || this.hp <= 0) return false
    this.hp -= n
    this.invuln = 1.5
    this.ev.onAction({ type: 'move', at: performance.now() }) // "ouch" counts as activity
    if (this.hp <= 0) {
      this.hp = 0
      this.alive = false
      return true
    }
    return false
  }

  respawn(x: number, y: number, z: number) {
    this.alive = true
    this.hp = 3
    this.queueTeleport(x, y, z)
  }

  // ---------------------------------------------------------------- update
  update(dt: number, freezeInput = false) {
    this.invuln = Math.max(0, this.invuln - dt)
    this.crouching = !freezeInput && (this.keys.has('ControlLeft') || this.keys.has('KeyC'))
    const h = this.bodyHeight()

    if (this.inVehicle) return

    if (!this.alive) {
      this.vel.x = 0
      this.vel.z = 0
      this.vel.y = Math.min(this.vel.y, 0)
      this.grounded = false
      return
    }

    const run = this.keys.has('ShiftLeft') && !this.crouching
    const speed = WALK_SPEED * (run ? 1.45 : 1) * (this.crouching ? 0.45 : 1) * this.speedFactor
    const fw = this.forwardVec()
    const rt = this.rightVec()
    let ix = 0
    let iz = 0
    if (!freezeInput) {
      if (this.keys.has('KeyW')) iz += 1
      if (this.keys.has('KeyS')) iz -= 1
      if (this.keys.has('KeyD')) ix += 1
      if (this.keys.has('KeyA')) ix -= 1
    }
    const il = Math.hypot(ix, iz)
    if (il > 0) {
      ix /= il
      iz /= il
    }
    this.moving = !freezeInput && il > 0
    if (this.moving) this.moveTime += dt
    this.speedFactor = Math.min(1, this.speedFactor + dt * 3)

    const wishX = (fw.x * iz + rt.x * ix) * speed
    const wishZ = (fw.z * iz + rt.z * ix) * speed
    const accel = this.grounded ? 40 : 13
    this.vel.x += (wishX - this.vel.x) * Math.min(1, accel * dt)
    this.vel.z += (wishZ - this.vel.z) * Math.min(1, accel * dt)
    if (il === 0 && this.grounded) {
      const fr = Math.max(0, 1 - 9 * dt)
      this.vel.x *= fr
      this.vel.z *= fr
    }

    const spaceDown = !freezeInput && this.keys.has('Space') && !this.crouching
    const spacePressed = spaceDown && !this.spaceWasDown
    this.spaceWasDown = spaceDown
    if (this.grounded) this.airJumpUsed = false
    if (spacePressed && this.grounded) {
      this.vel.y = JUMP_SPEED
      this.grounded = false
      this.ev.onAction({ type: 'jump', at: performance.now() })
      this.ev.onJump()
      this.fallFromY = this.pos.y
    } else if (spacePressed && this.doubleJump && !this.airJumpUsed && this.vel.y < 2.5) {
      // double-jump boots: one air jump per flight, only while falling/apex
      this.vel.y = JUMP_SPEED * 0.97
      this.airJumpUsed = true
      this.ev.onAction({ type: 'jump2', at: performance.now() })
      this.ev.onJump()
    }

    this.vel.y -= GRAVITY * dt
    this.vel.y = Math.max(this.vel.y, -42)

    // horizontal
    this.moveHorizontal(this.vel.x * dt, h)
    this.moveHorizontalZ(this.vel.z * dt, h)
    this.moveVertical(this.vel.y * dt, h)

    // terrain ground
    const gy = this.terrainHeightAt(this.pos.x, this.pos.z)
    if (!this.grounded && this.pos.y <= gy && this.vel.y <= 0.01) {
      this.pos.y = gy
      this.grounded = true
      this.vel.y = 0
      this.onGroundId = 'terrain'
    }

    // fall tracking: record the highest airborne point while falling
    if (!this.grounded && this.vel.y <= 0.05) {
      this.fallFromY = Math.max(this.fallFromY, this.pos.y)
    }
    if (this.grounded && this.fallFromY >= 0) {
      const fell = this.fallFromY - this.pos.y
      this.fallFromY = -1
      if (fell > 0.7) this.ev.onLand(fell > 7.5)
    }

    if (this.grounded && this.moving) {
      this.stepAcc += dt * (run ? 1.55 : 1.1)
      if (this.stepAcc > 0.4) {
        this.stepAcc = 0
        this.ev.onFootstep()
      }
    }

    // bounds — beyond the plate the engine handles (out-of-bounds flag)
    if (Math.abs(this.pos.x) > this.worldBound || Math.abs(this.pos.z) > this.worldBound) {
      this.outOfBounds = true
    }
    this.pos.x = clamp(this.pos.x, -this.worldBound, this.worldBound)
    this.pos.z = clamp(this.pos.z, -this.worldBound, this.worldBound)

    if (this.interactQueued) {
      this.interactQueued = false
      this.ev.onInteractRequest()
    }
  }

  outOfBounds = false

  // ------------------------------------------------------------- collisions
  private freeAt(x: number, feetY: number, z: number, h: number): boolean {
    const r = BODY_R
    const minY = feetY
    const maxY = feetY + h
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r) {
        const cmin = c.y - c.hy
        const cmax = c.y + c.hy
        if (minY < cmax && maxY > cmin) return false
      }
    }
    return true
  }

  /** highest box top under the player's column, in (ny, currentFeet] */
  private supportTop(x: number, z: number, ny: number): number | null {
    const r = BODY_R
    let best: number | null = null
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r) {
        const top = c.y + c.hy
        if (top > ny - 0.001 && top <= this.pos.y + 0.05) {
          if (best === null || top > best) best = top
        }
      }
    }
    return best
  }

  private moveHorizontal(dx: number, h: number) {
    if (dx === 0) return
    const nx = this.pos.x + dx
    if (this.freeAt(nx, this.pos.y, this.pos.z, h)) {
      this.pos.x = nx
      return
    }
    // try stepping up
    for (let dy = 0.12; dy <= STEP_UP + 0.001; dy += 0.12) {
      if (this.freeAt(nx, this.pos.y + dy, this.pos.z, h) && this.freeAt(nx, this.pos.y + dy + h - 0.05, this.pos.z, 0.1)) {
        this.pos.x = nx
        this.pos.y += dy
        this.vel.y = 0
        return
      }
    }
    this.vel.x = 0
  }

  private moveHorizontalZ(dz: number, h: number) {
    if (dz === 0) return
    const nz = this.pos.z + dz
    if (this.freeAt(this.pos.x, this.pos.y, nz, h)) {
      this.pos.z = nz
      return
    }
    for (let dy = 0.12; dy <= STEP_UP + 0.001; dy += 0.12) {
      if (this.freeAt(this.pos.x, this.pos.y + dy, nz, h) && this.freeAt(this.pos.x, this.pos.y + dy + h - 0.05, nz, 0.1)) {
        this.pos.z = nz
        this.pos.y += dy
        this.vel.y = 0
        return
      }
    }
    this.vel.z = 0
  }

  private moveVertical(dy: number, h: number) {
    if (dy === 0) return
    const ny = this.pos.y + dy
    const groundBelow = this.freeAt(this.pos.x, ny, this.pos.z, h)
    if (groundBelow) {
      this.pos.y = ny
      return
    }
    if (dy < 0) {
      // landed on a surface
      const top = this.supportTop(this.pos.x, this.pos.z, ny)
      if (top !== null) {
        this.pos.y = top
        this.vel.y = 0
        this.grounded = true
        this.onGroundId = this.colliderIdAt(this.pos.x, this.pos.y + 0.06, this.pos.z)
        return
      }
    }
    if (dy > 0) this.vel.y = 0
    else this.vel.y = 0
  }

  private colliderIdAt(x: number, y: number, z: number): string | null {
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.hx && Math.abs(y - c.y) < c.hy && Math.abs(z - c.z) < c.hz) return c.id
    }
    return null
  }

  snapshot(): PlayerState {
    return {
      pos: [this.pos.x, this.pos.y, this.pos.z],
      vel: [this.vel.x, this.vel.y, this.vel.z],
      grounded: this.grounded,
      yaw: this.yaw,
      pitch: this.pitch,
      hp: Math.max(0, this.hp),
      lives: this.lives,
      alive: this.alive,
      onGroundId: this.onGroundId,
    }
  }
}

export function distToSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax
  const abz = bz - az
  const len2 = abx * abx + abz * abz
  if (len2 < 1e-6) return dist2d(x, z, ax, az)
  const t = clamp(((x - ax) * abx + (z - az) * abz) / len2, 0, 1)
  return dist2d(x, z, ax + abx * t, az + abz * t)
}
