import { Vec, v, rand, norm } from './util'
import { TILE } from './types'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  gravity: number
  drag: number
  shape: 'circle' | 'spark' | 'gem'
  text?: string
  textLife?: number
  rot: number
  rotSpeed: number
  glow?: boolean
  z: number
}

export class ParticleSystem {
  list: Particle[] = []

  clear() {
    this.list.length = 0
  }

  spawn(p: Partial<Particle>) {
    this.list.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 6,
      color: '#fff',
      gravity: 0,
      drag: 0,
      shape: 'circle',
      rot: rand(Math.PI * 2),
      rotSpeed: 0,
      z: 5,
      ...p,
    })
  }

  burst(
    pos: Vec,
    color: string,
    n: number,
    opts: { speed?: number; size?: number; life?: number; gravity?: number; shape?: Particle['shape'] } = {}
  ) {
    const { speed = 120, size = 5, life = 0.5, gravity = 0, shape = 'circle' } = opts
    for (let i = 0; i < n; i++) {
      const dir = norm(v(rand(-1, 1), rand(-1, 1)))
      this.spawn({
        x: pos.x + rand(-6, 6),
        y: pos.y + rand(-6, 6),
        vx: dir.x * rand(speed * 0.3, speed),
        vy: dir.y * rand(speed * 0.3, speed),
        life: rand(life * 0.5, life * 1.2),
        maxLife: life,
        size: rand(size * 0.5, size * 1.3),
        color,
        gravity,
        drag: 0.92,
        shape,
      })
    }
  }

  sparkBurst(pos: Vec, color: string, n: number, speed = 180) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2)
      this.spawn({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * rand(speed * 0.4, speed),
        vy: Math.sin(a) * rand(speed * 0.4, speed),
        life: rand(0.15, 0.35),
        maxLife: 0.3,
        size: rand(2, 4),
        color,
        drag: 0.9,
        shape: 'spark',
        rotSpeed: rand(-8, 8),
      })
    }
  }

  gemBurst(pos: Vec, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2)
      const s = rand(60, 240)
      this.spawn({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rand(40, 140),
        life: rand(0.6, 1.1),
        maxLife: 1,
        size: rand(4, 7),
        color,
        gravity: 520,
        drag: 0.99,
        shape: 'gem',
        rotSpeed: rand(-6, 6),
        z: 8,
      })
    }
  }

  floatText(pos: Vec, text: string, color: string, size = 15) {
    this.spawn({
      x: pos.x + rand(-8, 8),
      y: pos.y - 18,
      vx: rand(-8, 8),
      vy: -46,
      life: 0.95,
      maxLife: 0.95,
      size,
      color,
      text,
      shape: 'circle',
      z: 12,
    })
  }

  dust(pos: Vec, n = 5) {
    this.burst(pos, 'rgba(255,255,255,0.55)', n, { speed: 55, size: 4, life: 0.4, gravity: -60 })
  }

  update(dt: number) {
    const l = this.list
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i]
      p.life -= dt
      if (p.life <= 0) {
        l.splice(i, 1)
        continue
      }
      p.vy += p.gravity * dt
      const drag = Math.pow(p.drag, dt * 60)
      p.vx *= drag
      p.vy *= drag
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.rotSpeed * dt
    }
  }

  get alive() {
    return this.list.length
  }
}

export function makeTombstone(pos: Vec, team: 0 | 1 | 2) {
  return {
    x: pos.x,
    y: pos.y,
    team,
    t: 0,
    w: TILE * 0.9,
    h: TILE * 0.5,
  }
}
export type Tombstone = ReturnType<typeof makeTombstone>
