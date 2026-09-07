import * as THREE from 'three'

/** Mutable player state shared with the AI and scene systems. */
export const playerState = {
  pos: new THREE.Vector3(0, 0, 8),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  onGround: true,
  moving: false,
  sprinting: false,
  jumping: false,
  speed: 0,
  idleFor: 0,
  jumpCount: 0,
  lastJumpAt: 0,
}

export function snapshotPlayer(): Record<string, unknown> {
  const p = playerState
  return {
    x: Math.round(p.pos.x * 10) / 10,
    y: Math.round(p.pos.y * 10) / 10,
    z: Math.round(p.pos.z * 10) / 10,
    moving: p.moving,
    sprinting: p.sprinting,
    jumping: p.jumping,
    onGround: p.onGround,
    speed: Math.round(p.speed * 10) / 10,
    idleFor: Math.round(p.idleFor),
  }
}