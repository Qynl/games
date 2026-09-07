import { GameMap, T_WALL, T_WATER, tileAt } from './maps'
import { Vec, v, dist } from './util'

// A* grid pathfinding. Walls + water block movement; bushes are passable.
export function findPath(map: GameMap, from: Vec, to: Vec, radiusTiles = 0): Vec[] | null {
  const start = v(Math.floor(from.x), Math.floor(from.y))
  const goal = v(Math.floor(to.x), Math.floor(to.y))
  const w = map.w
  const h = map.h

  const blocked = (tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return true
    const t = tileAt(map, tx, ty)
    if (t === T_WALL || t === T_WATER) return true
    return false
  }

  if (blocked(goal.x, goal.y)) {
    // relax goal: find nearest free tile within a few steps
    let best: Vec | null = null
    let bestD = Infinity
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nx = goal.x + dx
        const ny = goal.y + dy
        if (!blocked(nx, ny)) {
          const d = dist(v(nx + 0.5, ny + 0.5), to)
          if (d < bestD) {
            bestD = d
            best = v(nx, ny)
          }
        }
      }
    }
    if (!best) return null
    return findPath(map, from, { x: best.x + 0.5, y: best.y + 0.5 })
  }
  if (blocked(start.x, start.y)) return null

  const idx = (x: number, y: number) => y * w + x
  const open: number[] = []
  const gScore = new Float32Array(w * h).fill(Infinity)
  const fScore = new Float32Array(w * h).fill(Infinity)
  const came = new Int32Array(w * h).fill(-1)
  const closed = new Uint8Array(w * h)

  const si = idx(start.x, start.y)
  const gi = idx(goal.x, goal.y)
  gScore[si] = 0
  fScore[si] = Math.hypot(goal.x - start.x, goal.y - start.y)
  open.push(si)

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]

  let guard = 0
  while (open.length > 0 && guard++ < 4000) {
    // pop lowest f
    let bi = 0
    for (let i = 1; i < open.length; i++) if (fScore[open[i]] < fScore[open[bi]]) bi = i
    const cur = open.splice(bi, 1)[0]
    if (cur === gi) {
      // reconstruct
      const path: Vec[] = []
      let c = cur
      while (c !== -1) {
        path.push(v((c % w) + 0.5, Math.floor(c / w) + 0.5))
        c = came[c]
      }
      path.reverse()
      // drop the start node
      if (path.length > 0) path.shift()
      return path
    }
    closed[cur] = 1
    const cx = cur % w
    const cy = Math.floor(cur / w)
    for (const [dx, dy] of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      if (blocked(nx, ny)) continue
      const ni = idx(nx, ny)
      if (closed[ni]) continue
      const cost = dx !== 0 && dy !== 0 ? 1.414 : 1
      const tentative = gScore[cur] + cost
      if (tentative < gScore[ni]) {
        came[ni] = cur
        gScore[ni] = tentative
        fScore[ni] = tentative + Math.hypot(goal.x - nx, goal.y - ny)
        if (!open.includes(ni)) open.push(ni)
      }
    }
  }
  return null
}

// Simple line-of-sight: blocked by walls only.
export function hasLineOfSight(map: GameMap, a: Vec, b: Vec): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const steps = Math.ceil(Math.hypot(dx, dy) / 0.25)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const tx = Math.floor(a.x + dx * t)
    const ty = Math.floor(a.y + dy * t)
    const tile = tileAt(map, tx, ty)
    if (tile === T_WALL) return false
  }
  return true
}
