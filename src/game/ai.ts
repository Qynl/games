import { BrawlerState } from './entities'
import type { GameState } from './state'
import type { Projectile } from './entities'
import { findPath, hasLineOfSight } from './pathfind'
import { solidTile } from './maps'
import { Vec, v, dist, norm, angDiff, clamp, rand, pick, chance } from './util'
import { TILE } from './types'
import { brawlerById } from './brawlers'

export interface AIData {
  wanderTarget: Vec
  repath: number
  aimAngle: number
  shotTimer: number
  superTimer: number
  leaderWish: Vec | null
  teamWishT: number
  strafeSide: 1 | -1
  strafeT: number
}

export function makeAI(b: BrawlerState): AIData {
  return {
    wanderTarget: b.pos,
    repath: 0,
    aimAngle: b.aim,
    shotTimer: rand(0.2, 0.8),
    superTimer: rand(1, 3),
    leaderWish: null,
    teamWishT: 0,
    strafeSide: b.id % 2 === 0 ? 1 : -1,
    strafeT: 0,
  }
}

const SPAWN: Record<number, Vec> = {}

export function registerSpawns(g: GameState) {
  for (const s of g.map.spawns) SPAWN[s.team] = s.pos
}

function findRallyPoint(g: GameState, team: number): Vec {
  if (g.mode.id === 'showdown') return v()
  if (g.mode.id === 'heist') {
    const enemySafe = g.safes.find((s) => s.team !== team && !s.dead)
    if (enemySafe) return v(enemySafe.pos.x + rand(-1, 1) * TILE, enemySafe.pos.y + rand(-1, 1) * TILE)
    return v((g.map.w / 2) * TILE, (g.map.h / 2) * TILE)
  }
  const m = g.map.mine
  if (!m) return v()
  const mine = m
  // rally at the mine, slightly toward your own side
  const jitter = v(rand(-1.2, 1.2) * TILE, rand(-1.2, 1.2) * TILE)
  void SPAWN[team]
  return v(mine.x * TILE + jitter.x, mine.y * TILE + jitter.y)
}

function enemiesOf(g: GameState, me: BrawlerState): BrawlerState[] {
  return g.brawlers.filter(
    (b) => !b.dead && b.id !== me.id && (g.mode.id === 'showdown' || b.team !== me.team)
  )
}

function alliesOf(g: GameState, me: BrawlerState): BrawlerState[] {
  if (g.mode.id === 'showdown') return []
  return g.brawlers.filter((b) => !b.dead && b.id !== me.id && b.team === me.team)
}

export function updateAI(g: GameState, me: BrawlerState, ai: AIData, dt: number) {
  const def = brawlerById(me.def.id)
  const enemies = enemiesOf(g, me)
  const allies = alliesOf(g, me)

  // -------- showtime has a whole different brain --------
  if (g.mode.id === 'showdown') {
    updateShowdownAI(g, me, ai, dt, enemies)
    return
  }

  const myTeam = me.team
  const enemyTeam = myTeam === 0 ? 1 : 0

  // --- HEIST brain: keep pressure on the enemy safe ---
  if (g.mode.id === 'heist') {
    const enemySafe = g.safes.find((s) => s.team !== myTeam && !s.dead)
    const mySafe = g.safes.find((s) => s.team === myTeam && !s.dead)
    // defense duty: if enemies are near OUR safe, fight them
    let defenders = 0
    let bestDefender: BrawlerState | null = null
    let bestD = Infinity
    if (mySafe) {
      for (const e of enemies) {
        if (dist(e.pos, mySafe.pos) < 5 * TILE) {
          defenders++
          const d = dist(me.pos, e.pos)
          if (d < bestD) {
            bestD = d
            bestDefender = e
          }
        }
      }
    }
    if (defenders >= 1 && (chance(0.6) || defenders >= 2)) {
      // peel off to defend
      const target = bestDefender
      if (target) {
        const d = dist(me.pos, target.pos)
        if (d < me.attackRange * 0.95 && hasLineOfSight(g.map, me.pos, target.pos)) {
          const lead = v(target.pos.x + target.vel.x * 0.25, target.pos.y + target.vel.y * 0.25)
          const a = Math.atan2(lead.y - me.pos.y, lead.x - me.pos.x) + rand(-0.15, 0.15)
          ai.aimAngle = a
          me.aim = a
          ai.shotTimer -= dt
          if (ai.shotTimer <= 0) {
            g.tryFire(me)
            ai.shotTimer = rand(0.28, 0.6)
          }
        } else {
          const away = norm(v(me.pos.x - target.pos.x, me.pos.y - target.pos.y))
          const desired = v(me.pos.x + away.x * 3 * TILE, me.pos.y + away.y * 3 * TILE)
          moveToward(g, me, ai, desired, dt, def.speed)
        }
        if (me.superCharge >= 1) {
          ai.superTimer -= dt
          if (ai.superTimer <= 0) {
            g.trySuper(me, ai.aimAngle)
            ai.superTimer = rand(2.5, 5)
          }
        }
        return
      }
    }
    // attack the safe — but fight enemies that block the way
    if (enemySafe) {
      // engage nearby enemies first (they'll shred us otherwise)
      let blocker: BrawlerState | null = null
      let bd = Infinity
      for (const e of enemies) {
        const d = dist(me.pos, e.pos)
        if (d < 3.2 * TILE && hasLineOfSight(g.map, me.pos, e.pos) && d < bd) {
          bd = d
          blocker = e
        }
      }
      if (blocker && bd < me.attackRange * 1.05) {
        const lead = v(blocker.pos.x + blocker.vel.x * 0.3, blocker.pos.y + blocker.vel.y * 0.3)
        const a = Math.atan2(lead.y - me.pos.y, lead.x - me.pos.x) + rand(-0.12, 0.12)
        ai.aimAngle = a
        me.aim = a
        ai.shotTimer -= dt
        if (ai.shotTimer <= 0) {
          g.tryFire(me)
          ai.shotTimer = rand(0.26, 0.55)
        }
        if (bd < me.attackRange * 0.4) {
          const away = norm(v(me.pos.x - blocker.pos.x, me.pos.y - blocker.pos.y))
          moveToward(g, me, ai, v(me.pos.x + away.x * 3 * TILE, me.pos.y + away.y * 3 * TILE), dt, def.speed)
        }
      } else {
        const d = dist(me.pos, enemySafe.pos)
        if (d < me.attackRange * 0.9 && hasLineOfSight(g.map, me.pos, enemySafe.pos)) {
          const a = Math.atan2(enemySafe.pos.y - me.pos.y, enemySafe.pos.x - me.pos.x) + rand(-0.12, 0.12)
          ai.aimAngle = a
          me.aim = a
          ai.shotTimer -= dt
          if (ai.shotTimer <= 0) {
            g.tryFire(me)
            ai.shotTimer = rand(0.25, 0.5)
          }
        } else if (d > 1.6 * TILE) {
          moveToward(g, me, ai, enemySafe.pos, dt, def.speed)
        } else {
          const away = norm(v(me.pos.x - enemySafe.pos.x, me.pos.y - enemySafe.pos.y))
          const desired = v(me.pos.x + away.x * 4 * TILE, me.pos.y + away.y * 4 * TILE)
          moveToward(g, me, ai, desired, dt, def.speed)
        }
      }
      if (me.superCharge >= 1) {
        ai.superTimer -= dt
        if (ai.superTimer <= 0) {
          g.trySuper(me, ai.aimAngle)
          ai.superTimer = rand(2.5, 5)
        }
      }
      return
    }
    // safe already destroyed: fall through to normal combat
  }

  // --- target selection: gem carrier > lowest hp > nearest ---
  let target: BrawlerState | null = null
  if (enemies.length > 0) {
    const myCount = g.teamGems[myTeam === 1 ? 1 : 0] ?? 0
    const carrier = enemies.find((e) => (e.gems ?? 0) >= 4 && myCount >= 7)
    const byHp = [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
    const lowHp = byHp[0]
    const distTo = (b: BrawlerState) => dist(me.pos, b.pos)
    const nearest = [...enemies].sort((a, b) => distTo(a) - distTo(b))[0]
    if (carrier && distTo(carrier) < 12 * TILE) target = carrier
    else if (lowHp && lowHp.hp / lowHp.maxHp < 0.28 && distTo(lowHp) < 9 * TILE) target = lowHp
    else target = nearest
  }

  // --- strategic wish for the team ---
  const meCarrying = (me.gems ?? 0) >= 3
  const countdownActive = g.gemTimer !== null && g.gemTimer > 0
  const enemyCountdown = g.gemTimerTeam === enemyTeam && countdownActive

  let wish: 'retreat' | 'push' | 'hold' | null = null
  if (countdownActive && g.gemTimerTeam === myTeam) {
    wish = 'retreat' // we hold the countdown: kite like crazy
  } else if (enemyCountdown) {
    wish = 'push' // hunt the enemy carrier team at all costs
  } else if (meCarrying) {
    wish = 'hold'
  }

  let desired: Vec | null = null
  if (wish === 'retreat') {
    // toward our spawn corner
    const spawnPts = g.map.spawns.filter((s) => s.team === myTeam).map((s) => s.pos)
    desired =
      spawnPts.length > 0
        ? v(pick(spawnPts).x * TILE + rand(-2, 2) * TILE, pick(spawnPts).y * TILE + rand(-2, 2) * TILE)
        : v((g.map.w / 2) * TILE, (g.map.h / 2) * TILE)
  } else if (wish === 'push') {
    desired = target ? target.pos : findRallyPoint(g, myTeam)
  } else if (wish === 'hold') {
    desired = findRallyPoint(g, myTeam)
  }

  // --- aim & shoot ---
  const aimRange = me.def.attack.range * 0.92
  let aimTarget: Vec | null = null
  if (target) {
    const d = dist(me.pos, target.pos)
    const los = hasLineOfSight(g.map, me.pos, target.pos)
    if (d < aimRange && los) aimTarget = target.pos
    else if (d < aimRange * 1.6 && los && chance(0.15)) aimTarget = target.pos
    else if (d < aimRange * 0.7) {
      // too close to shoot: back away
      const away = norm(v(me.pos.x - target.pos.x, me.pos.y - target.pos.y))
      desired = v(me.pos.x + away.x * 3 * TILE, me.pos.y + away.y * 3 * TILE)
    }
  }
  if (aimTarget) {
    const lead = v(aimTarget.x + target!.vel.x * 0.3, aimTarget.y + target!.vel.y * 0.3)
    const a = Math.atan2(lead.y - me.pos.y, lead.x - me.pos.x) + rand(-0.1, 0.1)
    ai.aimAngle = a
    me.aim = a
    ai.shotTimer -= dt
    if (ai.shotTimer <= 0) {
      g.tryFire(me)
      ai.shotTimer = rand(0.26, 0.55)
    }
  } else {
    // face where we're moving, mostly
    const moving = desired && dist(desired, me.pos) > 1.2 * TILE
    if (moving) {
      me.aim = Math.atan2(desired!.y - me.pos.y, desired!.x - me.pos.x)
    }
    ai.aimAngle = me.aim
    ai.shotTimer -= dt * 0.5
  }

  // --- super usage ---
  if (me.superCharge >= 1 && me.ammo === 0) ai.superTimer -= dt
  else if (me.superCharge >= 1 && target && dist(me.pos, target.pos) < me.superRange * 0.8) ai.superTimer -= dt
  if (ai.superTimer <= 0 && me.superCharge >= 1) {
    g.trySuper(me, aimTarget ? ai.aimAngle : me.aim)
    ai.superTimer = rand(2.5, 5)
  }

  // --- gadget: pop defensive gadgets when hurt and engaged ---
  if (
    me.gadgetLeft > 0 &&
    me.gadgetCd <= 0 &&
    me.hp / me.maxHp < 0.45 &&
    enemies.some((e) => dist(e.pos, me.pos) < 5 * TILE)
  ) {
    g.tryGadget(me)
  }

  // --- movement: kite, strafe, or push ---
  const lowHp = me.hp / me.maxHp < 0.28
  const threatened = enemies.some((e) => dist(e.pos, me.pos) < 4.5 * TILE)
  if (lowHp && !threatened && !countdownActive) {
    // retreat to spawn to regen
    const spawnPts = g.map.spawns.filter((s) => s.team === myTeam).map((s) => v(s.pos.x * TILE, s.pos.y * TILE))
    desired = spawnPts.length > 0 ? pick(spawnPts) : v((g.map.w / 2) * TILE, (g.map.h / 2) * TILE)
  }

  if (target && aimTarget && !lowHp) {
    // combat positioning: keep the ideal range band, circle-strafe inside it
    const d = dist(me.pos, target.pos)
    const optLo = me.attackRange * 0.42
    const optHi = me.attackRange * 0.82
    ai.strafeT -= dt
    if (ai.strafeT <= 0) {
      ai.strafeSide = chance(0.5) ? 1 : -1
      ai.strafeT = rand(0.8, 1.6)
    }
    const toT = norm(v(target.pos.x - me.pos.x, target.pos.y - me.pos.y))
    const perp = v(-toT.y, toT.x)
    let mv: Vec
    if (d < optLo) {
      // back off while circling
      mv = norm(v(-toT.x * 1 + perp.x * 0.55 * ai.strafeSide, -toT.y * 1 + perp.y * 0.55 * ai.strafeSide))
    } else if (d < optHi) {
      // circle-strafe
      mv = v(perp.x * ai.strafeSide, perp.y * ai.strafeSide)
    } else {
      // push in
      mv = toT
    }
    const wallSafe = avoidWalls(g.map, me.pos, mv)
    me.mx = wallSafe.x
    me.my = wallSafe.y
  } else {
    if (!desired) desired = findRallyPoint(g, me.team)
    moveToward(g, me, ai, desired, dt, def.speed)
  }
}

function updateShowdownAI(
  g: GameState,
  me: BrawlerState,
  ai: AIData,
  dt: number,
  enemies: BrawlerState[]
) {
  const def = brawlerById(me.def.id)

  // --- decide: hunt boxes, hunt brawlers, or flee gas ---
  const gasEdge = g.gas ? g.gas.radius : Infinity
  const dGas = dist(me.pos, g.gas?.center ?? v()) - gasEdge
  const inGas = dGas > -0.5 * TILE

  let desired: Vec | null = null
  let strafe: Vec | null = null

  // flee gas
  if (inGas) {
    const toCenter = norm(v(g.gas!.center.x - me.pos.x, g.gas!.center.y - me.pos.y))
    desired = v(me.pos.x + toCenter.x * 6 * TILE, me.pos.y + toCenter.y * 6 * TILE)
  } else {
    // fight if strong or threatened
    const cubes = me.cubes ?? 0
    const hurt = me.hp / me.maxHp < 0.3
    let victim: BrawlerState | null = null
    for (const e of enemies) {
      const d = dist(me.pos, e.pos)
      if (d < 5 * TILE && (hurt || e.cubes <= cubes + 1) && hasLineOfSight(g.map, me.pos, e.pos)) {
        if (!victim || dist(me.pos, e.pos) < dist(me.pos, victim.pos)) victim = e
      }
    }
    const fleeFrom: BrawlerState[] = []
    for (const e of enemies) {
      if (dist(me.pos, e.pos) < 5.5 * TILE && (hurt || e.cubes > cubes + 1)) fleeFrom.push(e)
    }
    if (fleeFrom.length > 0) {
      const f = fleeFrom[0]
      const away = norm(v(me.pos.x - f.pos.x, me.pos.y - f.pos.y))
      desired = v(me.pos.x + away.x * 6 * TILE, me.pos.y + away.y * 6 * TILE)
    } else if (victim) {
      const lead = v(victim.pos.x + victim.vel.x * 0.3, victim.pos.y + victim.vel.y * 0.3)
      const a = Math.atan2(lead.y - me.pos.y, lead.x - me.pos.x) + rand(-0.1, 0.1)
      ai.aimAngle = a
      me.aim = a
      const d = dist(me.pos, victim.pos)
      if (d > def.attack.range * 0.55 && d < def.attack.range * 0.98) {
        ai.shotTimer -= dt
        if (ai.shotTimer <= 0) {
          g.tryFire(me)
          ai.shotTimer = rand(0.3, 0.65)
        }
      }
      // strafe to stay hard to hit
      ai.strafeT -= dt
      if (ai.strafeT <= 0) {
        ai.strafeSide = chance(0.5) ? 1 : -1
        ai.strafeT = rand(0.7, 1.4)
      }
      const toV = norm(v(victim.pos.x - me.pos.x, victim.pos.y - me.pos.y))
      const perp = v(-toV.y, toV.x)
      if (d < def.attack.range * 0.45) {
        const away = norm(v(me.pos.x - victim.pos.x, me.pos.y - victim.pos.y))
        strafe = v(away.x * 0.85 + perp.x * 0.5 * ai.strafeSide, away.y * 0.85 + perp.y * 0.5 * ai.strafeSide)
      } else if (d < def.attack.range * 0.9) {
        strafe = v(perp.x * ai.strafeSide, perp.y * ai.strafeSide)
      } else {
        desired = victim.pos
      }
    } else {
      // hunt nearest box
      const box = g.boxes
        .filter((b) => !b.broken)
        .sort((a, b) => dist(me.pos, a.pos) - dist(me.pos, b.pos))[0]
      if (box) {
        const d = dist(me.pos, box.pos)
        if (d < def.attack.range * 0.8 && hasLineOfSight(g.map, me.pos, box.pos)) {
          const a = Math.atan2(box.pos.y - me.pos.y, box.pos.x - me.pos.x)
          ai.aimAngle = a
          me.aim = a
          ai.shotTimer -= dt
          if (ai.shotTimer <= 0) {
            g.tryFire(me)
            ai.shotTimer = rand(0.25, 0.4)
          }
        } else if (d > 1.2 * TILE) {
          desired = box.pos
        }
      }
      // stragglers: pick fights at mid/late game
      if (enemies.length > 0 && g.timeLeft < g.mode.duration * 0.45 && chance(0.004)) {
        const prey = pick(enemies)
        if (prey.cubes <= cubes + 1) desired = prey.pos
      }
    }
  }

  // super when it helps
  if (me.superCharge >= 1) {
    ai.superTimer -= dt
    if (ai.superTimer <= 0) {
      const any = enemies.some((e) => dist(me.pos, e.pos) < me.superRange)
      if (any) {
        g.trySuper(me, ai.aimAngle)
        ai.superTimer = rand(2, 4)
      } else {
        ai.superTimer = 0.6
      }
    }
  }

  // gadget: pop when hurt and someone's close
  if (
    me.gadgetLeft > 0 &&
    me.gadgetCd <= 0 &&
    me.hp / me.maxHp < 0.45 &&
    enemies.some((e) => dist(e.pos, me.pos) < 4.5 * TILE)
  ) {
    g.tryGadget(me)
  }

  if (strafe) {
    const wallSafe = avoidWalls(g.map, me.pos, strafe)
    me.mx = wallSafe.x
    me.my = wallSafe.y
  } else {
    if (!desired) {
      // hold position, occasionally stroll
      if (chance(dt * 0.4)) desired = v(me.pos.x + rand(-5, 5) * TILE, me.pos.y + rand(-5, 5) * TILE)
    }
    if (desired) moveToward(g, me, ai, desired, dt, def.speed * (me.cubes > 3 ? 1.06 : 1))
  }
}

// shared movement: pathfind around walls, avoid water, jitter wander
function moveToward(
  g: GameState,
  me: BrawlerState,
  ai: AIData,
  target: Vec,
  dt: number,
  speed: number
) {
  ai.repath -= dt
  const tooFar = dist(me.pos, ai.wanderTarget) > 9 * TILE
  const blockedMove = dist(me.pos, target) > 0.6 * TILE && dist(me.pos, ai.wanderTarget) < 0.3 * TILE
  if (ai.repath <= 0 || tooFar || blockedMove) {
    ai.repath = rand(0.7, 1.2)
    const jx = clamp(Math.floor(target.x / TILE), 0, g.map.w - 1)
    const jy = clamp(Math.floor(target.y / TILE), 0, g.map.h - 1)
    if (dist(me.pos, target) > 0.7 * TILE) {
      const path = findPath(
        g.map,
        v(Math.floor(me.pos.x / TILE) + 0.5, Math.floor(me.pos.y / TILE) + 0.5),
        v(jx + 0.5, jy + 0.5)
      )
      if (path && path.length > 0) {
        // follow the furthest node in the lookahead window
        const node = path[Math.min(3, path.length - 1)]
        // path nodes are in tile space — convert to world pixels
        ai.wanderTarget = v(node.x * TILE, node.y * TILE)
      } else {
        ai.wanderTarget = v(me.pos.x + rand(-3, 3) * TILE, me.pos.y + rand(-3, 3) * TILE)
      }
    } else {
      ai.wanderTarget = me.pos
    }
  }

  const want = dist(me.pos, target) > 0.5 * TILE ? ai.wanderTarget : me.pos
  const toWander = dist(me.pos, want)
  if (toWander > 0.35 * TILE) {
    const dir = norm(v(want.x - me.pos.x, want.y - me.pos.y))
    me.mx = dir.x
    me.my = dir.y
    const moving = Math.hypot(me.mx, me.my)
    if (moving > 0) {
      // spread out from allies a little
      const allies = g.brawlers.filter(
        (b) => !b.dead && b.id !== me.id && b.team === me.team && dist(b.pos, me.pos) < 1.3 * TILE
      )
      if (allies.length > 0) {
        const a = allies[0]
        const push = norm(v(me.pos.x - a.pos.x, me.pos.y - a.pos.y))
        me.mx += push.x * 0.8
        me.my += push.y * 0.8
      }
      const ml = Math.hypot(me.mx, me.my)
      me.mx /= ml
      me.my /= ml
    }
  } else {
    me.mx = 0
    me.my = 0
  }
}

export function predictProjectiles(g: GameState, me: BrawlerState): Projectile[] {
  return g.projectiles.filter((p) => {
    if (p.ownerTeam === me.team) return false
    const d = dist(p.pos, me.pos)
    if (d > 5 * TILE) return false
    const rel = v(p.pos.x - me.pos.x, p.pos.y - me.pos.y)
    const dot = rel.x * p.vel.x + rel.y * p.vel.y
    return dot > 0
  })
}

export function dodgeVector(g: GameState, me: BrawlerState): Vec | null {
  let acc = v()
  let n = 0
  for (const p of g.projectiles) {
    if (p.ownerTeam === me.team) continue
    const d = dist(p.pos, me.pos)
    if (d > 4 * TILE || d < 0.001) continue
    const rel = v(p.pos.x - me.pos.x, p.pos.y - me.pos.y)
    const dot = rel.x * p.vel.x + rel.y * p.vel.y
    if (dot > 0 && d < 2.2 * TILE) {
      const perp = v(-p.vel.y, p.vel.x)
      const pl = Math.hypot(perp.x, perp.y) || 1
      const side = rel.x * perp.x + rel.y * perp.y > 0 ? 1 : -1
      acc = v(acc.x + (perp.x / pl) * side * (1 - d / (2.5 * TILE)), acc.y + (perp.y / pl) * side * (1 - d / (2.5 * TILE)))
      n++
    }
  }
  if (n === 0) return null
  return norm(acc)
}

export function avoidBullets(g: GameState, me: BrawlerState, dt: number, speed: number) {
  const dodge = dodgeVector(g, me)
  if (dodge) {
    me.mx += dodge.x * 1.4
    me.my += dodge.y * 1.4
    const l = Math.hypot(me.mx, me.my) || 1
    me.mx /= l
    me.my /= l
  }
  void dt
  void speed
}

export function avoidWalls(map: any, pos: Vec, dir: Vec): Vec {
  const look = v(pos.x + dir.x * 1.6 * TILE, pos.y + dir.y * 1.6 * TILE)
  const tx = Math.floor(look.x / TILE)
  const ty = Math.floor(look.y / TILE)
  const tile = tx >= 0 && ty >= 0 && tx < map.w && ty < map.h ? map.tiles[ty * map.w + tx] : 0
  if (solidTile(tile)) {
    // steer around: try perpendicular
    const perp = v(-dir.y, dir.x)
    const l1 = v(look.x + perp.x * TILE, look.y + perp.y * TILE)
    const t1x = Math.floor(l1.x / TILE)
    const t1y = Math.floor(l1.y / TILE)
    const t1 = t1x >= 0 && t1y >= 0 && t1x < map.w && t1y < map.h ? map.tiles[t1y * map.w + t1x] : 0
    if (!solidTile(t1)) return perp
    return v(dir.y, -dir.x)
  }
  return dir
}

// dodge enemies that are aiming at us (threat anticipation)
export function dodgeThreat(g: GameState, me: BrawlerState): Vec | null {
  let acc = v()
  let n = 0
  for (const e of g.brawlers) {
    if (e.dead || e.id === me.id) continue
    if (g.mode.id !== 'showdown' && e.team === me.team) continue
    const d = dist(me.pos, e.pos)
    const eRange = e.attackRange
    if (d > eRange * 1.5) continue
    const toMe = norm(v(me.pos.x - e.pos.x, me.pos.y - e.pos.y))
    const facing = Math.cos(angDiff(Math.atan2(toMe.y, toMe.x), e.aim))
    if (facing > 0.7) {
      const perp = v(-toMe.y, toMe.x)
      const w = (1.3 - d / (eRange * 1.5)) * 1.6
      acc = v(acc.x + perp.x * w, acc.y + perp.y * w)
      n++
    }
  }
  if (n === 0) return null
  return norm(acc)
}

export function spreadFromAllies(g: GameState, me: BrawlerState) {
  const allies = g.brawlers.filter(
    (b) => !b.dead && b.id !== me.id && b.team === me.team && dist(b.pos, me.pos) < 1.2 * TILE
  )
  if (allies.length > 0) {
    const a = allies[0]
    const push = norm(v(me.pos.x - a.pos.x, me.pos.y - a.pos.y))
    me.mx += push.x * 0.9
    me.my += push.y * 0.9
    const l = Math.hypot(me.mx, me.my) || 1
    me.mx /= l
    me.my /= l
  }
}

export function lerpAim(me: BrawlerState, dir: Vec, t: number) {
  const targetA = Math.atan2(dir.y, dir.x)
  let diff = angDiff(targetA, me.aim)
  me.aim += diff * Math.min(1, t)
}

export function faceEnemy(me: BrawlerState, g: GameState) {
  const enemies = g.brawlers.filter(
    (b) => !b.dead && b.id !== me.id && (g.mode.id === 'showdown' || b.team !== me.team)
  )
  let best: BrawlerState | null = null
  let bd = Infinity
  for (const e of enemies) {
    const d = dist(me.pos, e.pos)
    if (d < bd) {
      bd = d
      best = e
    }
  }
  if (best && bd < 6 * TILE && hasLineOfSight(g.map, me.pos, best.pos)) {
    const a = Math.atan2(best.pos.y - me.pos.y, best.pos.x - me.pos.x)
    const diff = angDiff(a, me.aim)
    me.aim += diff * 0.4
  }
  return best
}
