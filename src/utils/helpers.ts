// Small shared utilities.

export function uid(prefix = 'obj'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function damp(a: number, b: number, lambda: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-lambda * dt))
}

/** Smoothly interpolate a 3D position toward a target. */
export function damp3(
  out: { x: number; y: number; z: number },
  tx: number,
  ty: number,
  tz: number,
  lambda: number,
  dt: number,
): void {
  const k = 1 - Math.exp(-lambda * dt)
  out.x += (tx - out.x) * k
  out.y += (ty - out.y) * k
  out.z += (tz - out.z) * k
}

export function dist2d(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx
  const dz = az - bz
  return Math.sqrt(dx * dx + dz * dz)
}

export function dist3(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): number {
  const dx = ax - bx
  const dy = ay - by
  const dz = az - bz
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function vecLen(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z)
}

export function fmtClock(t: number): string {
  const h = Math.floor(t / 3600) % 24
  const m = Math.floor((t % 3600) / 60)
  const mm = String(m).padStart(2, '0')
  return `${h}:${mm}`
}

/** e.g. 3.2 -> "3.2", 12 -> "12" */
export function fmtNum(n: number): string {
  return String(Math.round(n * 10) / 10)
}

export function rng01(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic smooth noise from a seed (used by terrain & foliage). */
export class Simplex1D {
  private perm: Uint8Array
  constructor(seed: number) {
    const rnd = rng01(seed)
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      const t = p[i]
      p[i] = p[j]
      p[j] = t
    }
    this.perm = new Uint8Array(512)
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]
  }
  private grad(h: number, x: number): number {
    return (h & 1) === 0 ? x : -x
  }
  noise(x: number): number {
    const fl = Math.floor(x)
    const X = ((fl % 256) + 256) % 256
    const xf = x - fl
    const u = xf * xf * (3 - 2 * xf)
    const a = this.grad(this.perm[X], xf)
    const b = this.grad(this.perm[X + 1], xf - 1)
    return a + u * (b - a)
  }
  /** octaves of noise in [-1,1] */
  fbm(x: number, octaves: number, lac = 2): number {
    let amp = 1
    let freq = 1
    let sum = 0
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += this.noise(x * freq) * amp
      norm += amp
      amp *= 0.5
      freq *= lac
    }
    return norm > 0 ? sum / norm : 0
  }
  noise2(x: number, z: number): number {
    return (this.noise(x) + this.noise(z + 1000)) * 0.5 +
      this.noise((x + z) * 0.7 + 37) * 0.3 +
      this.noise((x - z) * 1.3 + 7) * 0.2
  }
  fbm2(x: number, z: number, octaves = 3): number {
    let amp = 1
    let sum = 0
    let norm = 0
    let px = x
    let pz = z
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2(px, pz) * amp
      norm += amp
      amp *= 0.5
      px *= 2.1
      pz *= 2.1
    }
    return norm > 0 ? sum / norm : 0
  }
}

/** Multiplicative hash -> deterministic pseudo random from strings. */
export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pick<T>(arr: T[], rnd: () => number = Math.random): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length]
}

export function capLen(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export function isProd(): boolean {
  return import.meta.env?.PROD === true
}

export const AI_NAME = 'CREATOR'
export const PLAYER_NAME = 'You'
