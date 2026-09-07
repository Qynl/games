export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt))

export const rand = (a = 0, b = 1): number => a + Math.random() * (b - a)

export const randInt = (a: number, b: number): number => Math.floor(rand(a, b + 1))

export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const dist3 = (
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number
): number => Math.hypot(ax - bx, ay - by, az - bz)

let seq = 0
export const uid = (prefix = 'x'): string =>
  `${prefix}_${(seq++).toString(36)}${Date.now().toString(36).slice(-4)}`

export const fmtClock = (t: number): string => {
  const h = Math.floor(t)
  const m = Math.round((t - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export const fmtTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export const short = (s: string, n = 60): string =>
  s.length > n ? s.slice(0, n) + '…' : s