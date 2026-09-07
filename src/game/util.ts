export interface Vec {
  x: number
  y: number
}

export const v = (x = 0, y = 0): Vec => ({ x, y })
export const add = (a: Vec, b: Vec): Vec => v(a.x + b.x, a.y + b.y)
export const sub = (a: Vec, b: Vec): Vec => v(a.x - b.x, a.y - b.y)
export const mul = (a: Vec, s: number): Vec => v(a.x * s, a.y * s)
export const len = (a: Vec) => Math.hypot(a.x, a.y)
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
export const dist2 = (a: Vec, b: Vec) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}
export const norm = (a: Vec): Vec => {
  const l = len(a)
  return l > 0.0001 ? v(a.x / l, a.y / l) : v()
}
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
export const clamp01 = (x: number) => clamp(x, 0, 1)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const rand = (a = 1, b?: number) =>
  b === undefined ? Math.random() * a : a + Math.random() * (b - a)
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const chance = (p: number) => Math.random() < p
export const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export const angleOf = (a: Vec) => Math.atan2(a.y, a.x)
export const angDiff = (a: number, b: number) => {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
export const approach = (cur: number, target: number, delta: number) =>
  cur + clamp(target - cur, -delta, delta)
export const approachAng = (cur: number, target: number, delta: number) =>
  cur + clamp(angDiff(target, cur), -delta, delta)
export const vecFromAngle = (a: number, s = 1) => v(Math.cos(a) * s, Math.sin(a) * s)
export const fmtTime = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
export const smoothstep = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
