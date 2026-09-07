import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../world/WorldStore'
import { api } from '../world/WorldAPI'
import { SHAPE_INFO } from '../world/defs'
import { playerState } from './state'
import { getControls, requestPointerLock, setDragging } from './controls'
import { clamp } from '../utils/math'

const EYE = 1.62
const HALF_Y = 0.9
const BOUNDS = 55

export function Player(): JSX.Element | null {
  const { camera, gl } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const vel = useRef(new THREE.Vector3())
  const onGround = useRef(true)
  const bob = useRef(0)
  const nearTimer = useRef(0)
  const idleTimer = useRef(0)

  useEffect(() => {
    const isUi = (e: Event): boolean =>
      !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select, button, [data-ui]')

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (isUi(e)) return
      keys.current[e.code] = true
    }
    const onKeyUp = (e: KeyboardEvent): void => {
      keys.current[e.code] = false
    }
    const onMouseMove = (e: MouseEvent): void => {
      const c = getControls()
      if (c.locked) {
        playerState.yaw -= e.movementX * 0.0022
        playerState.pitch = clamp(playerState.pitch - e.movementY * 0.0022, -1.5, 1.5)
      } else if (c.dragging) {
        playerState.yaw -= e.movementX * 0.0035
        playerState.pitch = clamp(playerState.pitch - e.movementY * 0.0035, -1.5, 1.5)
      }
    }
    const onMouseDown = (e: MouseEvent): void => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, button, [data-ui]')) return
      const c = getControls()
      if (!c.locked && !c.dragMode) requestPointerLock()
      else if (!c.locked && c.dragMode) setDragging(true)
    }
    const onMouseUp = (): void => setDragging(false)
    const onBlur = (): void => {
      keys.current = {}
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [gl])

  const resolveCollisions = (pos: THREE.Vector3, velV: THREE.Vector3): void => {
    const tryBox = (
      cx: number, cy: number, cz: number,
      hx: number, hy: number, hz: number
    ): void => {
      const minX = cx - hx - 0.4
      const maxX = cx + hx + 0.4
      const minY = cy - hy - HALF_Y
      const maxY = cy + hy + HALF_Y
      const minZ = cz - hz - 0.4
      const maxZ = cz + hz + 0.4
      if (pos.x < minX || pos.x > maxX || pos.y < minY || pos.y > maxY || pos.z < minZ || pos.z > maxZ) return
      const ox = Math.min(pos.x - minX, maxX - pos.x)
      const oy = Math.min(pos.y - minY, maxY - pos.y)
      const oz = Math.min(pos.z - minZ, maxZ - pos.z)
      if (ox <= oy && ox <= oz) {
        pos.x = pos.x < cx ? minX : maxX
        velV.x = 0
      } else if (oy <= ox && oy <= oz) {
        pos.y = pos.y < cy ? minY : maxY
        if (velV.y < 0) {
          velV.y = 0
          onGround.current = true
          playerState.jumping = false
        }
      } else {
        pos.z = pos.z < cz ? minZ : maxZ
        velV.z = 0
      }
    }
    for (const o of world.objects.values()) {
      const info = SHAPE_INFO[o.shape]
      const hx = (info.size[0] * o.scale[0]) / 2
      const hy = (info.size[1] * o.scale[1]) / 2
      const hz = (info.size[2] * o.scale[2]) / 2
      tryBox(o.position[0], o.position[1], o.position[2], hx, hy, hz)
    }
    for (const n of world.npcs.values()) {
      tryBox(n.position[0], 0.8, n.position[2], 0.45, 0.8, 0.45)
    }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const k = keys.current
    const ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    const iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const sprint = !!(k.ShiftLeft || k.ShiftRight)
    const wantJump = !!k.Space

    const sin = Math.sin(playerState.yaw)
    const cos = Math.cos(playerState.yaw)
    const fwd = new THREE.Vector3(-sin, 0, -cos)
    const right = new THREE.Vector3(cos, 0, -sin)
    const wish = new THREE.Vector3()
    wish.addScaledVector(fwd, iz).addScaledVector(right, ix)
    if (wish.lengthSq() > 1) wish.normalize()
    wish.multiplyScalar(sprint ? world.params.sprintSpeed : world.params.walkSpeed)

    const accel = onGround.current ? 12 : 4
    vel.current.x += (wish.x - vel.current.x) * Math.min(1, accel * dt)
    vel.current.z += (wish.z - vel.current.z) * Math.min(1, accel * dt)

    vel.current.y -= world.params.gravity * dt
    if (wantJump && onGround.current) {
      vel.current.y = world.params.jump
      onGround.current = false
      playerState.jumping = true
      playerState.jumpCount += 1
      playerState.lastJumpAt = Date.now()
    }

    const pos = playerState.pos
    pos.addScaledVector(vel.current, dt)

    if (pos.y < HALF_Y) {
      if (vel.current.y < 0) {
        pos.y = HALF_Y
        vel.current.y = 0
        onGround.current = true
        playerState.jumping = false
      }
    }
    const bx = BOUNDS - 0.4
    const bz = BOUNDS - 0.4
    if (pos.x < -bx) { pos.x = -bx; vel.current.x = Math.max(0, vel.current.x) }
    if (pos.x > bx) { pos.x = bx; vel.current.x = Math.min(0, vel.current.x) }
    if (pos.z < -bz) { pos.z = -bz; vel.current.z = Math.max(0, vel.current.z) }
    if (pos.z > bz) { pos.z = bz; vel.current.z = Math.min(0, vel.current.z) }

    resolveCollisions(pos, vel.current)

    camera.position.set(pos.x, pos.y + EYE, pos.z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = playerState.yaw
    camera.rotation.x = playerState.pitch

    const hSpeed = Math.hypot(vel.current.x, vel.current.z)
    const moving = hSpeed > 0.7 && onGround.current
    playerState.moving = moving
    playerState.sprinting = moving && sprint
    playerState.speed = hSpeed
    playerState.onGround = onGround.current
    if (moving) {
      bob.current += dt * (sprint ? 11 : 8)
      camera.position.y += Math.sin(bob.current * 2) * 0.035
    }

    if (hSpeed < 0.5) idleTimer.current += dt
    else idleTimer.current = 0
    playerState.idleFor = idleTimer.current

    nearTimer.current -= dt
    if (nearTimer.current <= 0) {
      nearTimer.current = 0.35
      // coins
      for (const o of world.objects.values()) {
        if (o.shape === 'coin') {
          const d = Math.hypot(pos.x - o.position[0], pos.y - o.position[1], pos.z - o.position[2])
          if (d < 1.4) {
            world.collectCoin(o.id)
            api.onCoinCollected()
            world.addFeed(`+1 coin (${world.score} total)`, 'world')
          }
        }
      }
      // proximity events
      for (const ev of world.events.values()) {
        if (ev.trigger === 'proximity' && !ev.done) {
          const d = Math.hypot(pos.x - ev.position[0], pos.y - ev.position[1], pos.z - ev.position[2])
          if (d < ev.radius) api.triggerEvent(ev.id)
        }
      }
    }
  })

  return null
}