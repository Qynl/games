import { BrawlerDef, attackRangeOf, superRangeOf } from './brawlers'
import { GameMap, solidTile, blocksBullet, tileAt, T_WALL } from './maps'
import { ParticleSystem } from './particles'
import { Vec, v, dist, dist2, norm, clamp, rand, lerp, angDiff, approachAng } from './util'
import { TILE, TeamId } from './types'
import { AIData } from './ai'
import { audio } from './audio'

export interface BrawlerState {
  id: number
  def: BrawlerDef
  team: TeamId
  name: string
  isPlayer: boolean
  isBot: boolean
  pos: Vec
  vel: Vec
  aim: number
  aimVis: number
  hp: number
  maxHp: number
  ammo: number
  reloadT: number
  reloadMul: number
  reloadMulT: number
  superCharge: number
  gems: number
  cubes: number
  dead: boolean
  deathT: number
  respawnT: number
  spawnProt: number
  invulnT: number
  shieldT: number
  speedMul: number
  speedMulT: number
  dmgMul: number
  dmgMulT: number
  slowT: number
  slowMul: number
  stunT: number
  hitFlash: number
  knockVx: number
  knockVy: number
  mx: number
  my: number
  moving: boolean
  walkPhase: number
  bobPhase: number
  dashT: number
  dashDir: Vec
  leap: { start: Vec; target: Vec; t: number; dur: number; hitIds: number[] } | null
  gadgetLeft: number
  gadgetCd: number
  bot: AIData | null
  stars: number
  kills: number
  deaths: number
  damage: number
  gemsCollected: number
  emote: { icon: string; t: number } | null
  attackRange: number
  superRange: number
  healPulse: number
}

let NEXT_ID = 1

export function createBrawler(
  def: BrawlerDef,
  team: TeamId,
  pos: Vec,
  name: string,
  isPlayer: boolean,
  isBot: boolean
): BrawlerState {
  return {
    id: NEXT_ID++,
    def,
    team,
    name,
    isPlayer,
    isBot,
    pos: { ...pos },
    vel: v(),
    aim: team === 1 ? Math.PI : 0,
    aimVis: team === 1 ? Math.PI : 0,
    hp: def.hp,
    maxHp: def.hp,
    ammo: def.ammoMax,
    reloadT: 0,
    reloadMul: 1,
    reloadMulT: 0,
    superCharge: 0,
    gems: 0,
    cubes: 1,
    dead: false,
    deathT: 0,
    respawnT: 0,
    spawnProt: 0,
    invulnT: 0,
    shieldT: 0,
    speedMul: 1,
    speedMulT: 0,
    dmgMul: 1,
    dmgMulT: 0,
    slowT: 0,
    slowMul: 1,
    stunT: 0,
    hitFlash: 0,
    knockVx: 0,
    knockVy: 0,
    mx: 0,
    my: 0,
    moving: false,
    walkPhase: rand(0, 10),
    bobPhase: rand(0, Math.PI * 2),
    dashT: 0,
    dashDir: v(1, 0),
    leap: null,
    gadgetLeft: 3,
    gadgetCd: 0,
    bot: null,
    stars: 0,
    kills: 0,
    deaths: 0,
    damage: 0,
    gemsCollected: 0,
    emote: null,
    attackRange: attackRangeOf(def),
    superRange: superRangeOf(def),
    healPulse: 0,
  }
}

export function updateBrawler(
  g: { map: GameMap; time: number },
  b: BrawlerState,
  dt: number,
  particles: ParticleSystem
) {
  b.bobPhase += dt * 3
  b.hitFlash = Math.max(0, b.hitFlash - dt * 5)
  b.invulnT = Math.max(0, b.invulnT - dt)
  b.shieldT = Math.max(0, b.shieldT - dt)
  b.spawnProt = Math.max(0, b.spawnProt - dt)
  b.stunT = Math.max(0, b.stunT - dt)
  b.slowT = Math.max(0, b.slowT - dt)
  b.slowMul = b.slowT > 0 ? 0.45 : 1
  b.speedMulT = Math.max(0, b.speedMulT - dt)
  b.speedMul = b.speedMulT > 0 ? 1.22 : 1
  b.dmgMulT = Math.max(0, b.dmgMulT - dt)
  b.dmgMul = b.dmgMulT > 0 ? 1.3 : 1
  b.reloadMulT = Math.max(0, b.reloadMulT - dt)
  b.reloadMul = b.reloadMulT > 0 ? 1.9 : 1
  b.gadgetCd = Math.max(0, b.gadgetCd - dt)
  b.healPulse = Math.max(0, b.healPulse - dt * 2)

  // reload
  if (b.ammo < b.def.ammoMax) {
    b.reloadT -= dt
    if (b.reloadT <= 0) {
      b.ammo++
      b.reloadT = b.def.reload / b.reloadMul
      if (b.ammo === b.def.ammoMax) b.reloadT = b.def.reload / b.reloadMul
    }
  }

  if (b.dead) {
    b.deathT += dt
    b.knockVx *= Math.exp(-6 * dt)
    b.knockVy *= Math.exp(-6 * dt)
    return
  }

  // leap override (fully airborne, landing resolved by the game state)
  if (b.leap) {
    const lp = b.leap
    lp.t += dt
    const tt = clamp(lp.t / lp.dur, 0, 1)
    b.pos.x = lerp(lp.start.x, lp.target.x, tt)
    b.pos.y = lerp(lp.start.y, lp.target.y, tt)
    b.invulnT = Math.max(b.invulnT, 0.05)
    return
  }

  // movement
  let vx = 0
  let vy = 0
  if (b.dashT > 0) {
    b.dashT -= dt
    vx = b.dashDir.x * 950
    vy = b.dashDir.y * 950
  } else if (b.stunT <= 0) {
    const speed = b.def.speed * b.speedMul * b.slowMul
    vx = b.mx * speed + b.knockVx
    vy = b.my * speed + b.knockVy
  } else {
    vx = b.knockVx
    vy = b.knockVy
  }
  b.knockVx *= Math.exp(-5 * dt)
  b.knockVy *= Math.exp(-5 * dt)

  b.pos.x += vx * dt
  if (collideMap(g.map, b.pos, 12)) b.pos.x -= vx * dt
  b.pos.y += vy * dt
  if (collideMap(g.map, b.pos, 12)) b.pos.y -= vy * dt

  b.pos.x = clamp(b.pos.x, 0.5 * TILE, g.map.w * TILE - 0.5 * TILE)
  b.pos.y = clamp(b.pos.y, 0.5 * TILE, g.map.h * TILE - 0.5 * TILE)

  b.vel.x = lerp(b.vel.x, vx, dt * 10)
  b.vel.y = lerp(b.vel.y, vy, dt * 10)
  b.moving = Math.hypot(vx, vy) > 14
  if (b.moving) b.walkPhase += dt * Math.hypot(vx, vy) * 0.028
  b.aimVis = approachAng(b.aimVis, b.aim, dt * 16)

  if (b.emote) {
    b.emote.t -= dt
    if (b.emote.t <= 0) b.emote = null
  }

  // footstep dust
  if (b.moving && Math.random() < dt * 8) {
    particles.spawn({
      x: b.pos.x + rand(-4, 4),
      y: b.pos.y + 10,
      vx: -vx * 0.15 + rand(-8, 8),
      vy: rand(-6, 2),
      life: 0.35,
      maxLife: 0.35,
      size: rand(2.5, 4.5),
      color: 'rgba(255,255,255,0.5)',
      shape: 'circle',
      z: 1,
    })
  }
}

function collideMap(map: GameMap, pos: Vec, r: number): boolean {
  const minX = Math.floor((pos.x - r) / TILE)
  const maxX = Math.floor((pos.x + r) / TILE)
  const minY = Math.floor((pos.y - r) / TILE)
  const maxY = Math.floor((pos.y + r) / TILE)
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      const t = tileAt(map, tx, ty)
      if (!solidTile(t)) continue
      // circle vs tile rect
      const cx = clamp(pos.x, tx * TILE, tx * TILE + TILE)
      const cy = clamp(pos.y, ty * TILE, ty * TILE + TILE)
      if (dist2(pos, v(cx, cy)) < r * r) return true
    }
  }
  return false
}

// ================= PROJECTILES =================

export type ProjectileKind =
  | 'bullet' | 'rocket' | 'lob' | 'wave' | 'slash' | 'megarocket' | 'megabullet' | 'megawave' | 'turret'

export interface Projectile {
  id: number
  kind: ProjectileKind
  ownerId: number
  ownerTeam: TeamId
  pos: Vec
  vel: Vec
  start: Vec
  end: Vec
  t: number
  dur: number
  damage: number
  splash: number
  pierce: number
  knock: number
  life: number
  maxLife: number
  color: string
  size: number
  fromSuper: boolean
  hitIds: number[]
  arcH: number
  spin: number
  width: number
}

let NEXT_PROJ = 1

export function spawnProjectile(p: Partial<Projectile>): Projectile {
  const proj: Projectile = {
    id: NEXT_PROJ++,
    kind: 'bullet',
    ownerId: -1,
    ownerTeam: 0,
    pos: v(),
    vel: v(),
    start: v(),
    end: v(),
    t: 0,
    dur: 1,
    damage: 0,
    splash: 0,
    pierce: 1,
    knock: 0,
    life: 2,
    maxLife: 2,
    color: '#ffd23f',
    size: 5,
    fromSuper: false,
    hitIds: [],
    arcH: 0,
    spin: 0,
    width: 0,
    ...p,
  }
  return proj
}

export function updateProjectiles(
  g: {
    map: GameMap
    projectiles: Projectile[]
    particles: ParticleSystem
    brawlers: BrawlerState[]
    mode: { id: string }
    time: number
    shake: number
    teamGems: number[]
    teamStars: number[]
    gas: { center: Vec; radius: number } | null
  },
  dt: number,
  onHit: (target: BrawlerState, dmg: number, sourceId: number, opts?: { knock?: number; color?: string }) => void,
  onExplode: (pos: Vec, splash: number, dmg: number, sourceId: number, knock: number, color: string) => void
) {
  const projs = g.projectiles
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]
    p.life -= dt
    p.spin += dt * 10
    if (p.life <= 0) {
      projs.splice(i, 1)
      continue
    }

    if (p.kind === 'lob') {
      p.t += dt
      const tt = clamp(p.t / p.dur, 0, 1)
      p.pos.x = lerp(p.start.x, p.end.x, tt)
      p.pos.y = lerp(p.start.y, p.end.y, tt)
      if (p.t >= p.dur) {
        projs.splice(i, 1)
        onExplode(p.end, p.splash, p.damage, p.ownerId, p.knock, p.color)
        g.particles.burst(p.end, p.color, 14, { speed: 200, size: 6, life: 0.45, gravity: 300 })
        continue
      }
    } else {
      p.pos.x += p.vel.x * dt
      p.pos.y += p.vel.y * dt
      // rocket flame trail
      if ((p.kind === 'rocket' || p.kind === 'megarocket') && Math.random() < dt * 40) {
        const sp = Math.hypot(p.vel.x, p.vel.y) || 1
        g.particles.spawn({
          x: p.pos.x - (p.vel.x / sp) * 9 + rand(-3, 3),
          y: p.pos.y - (p.vel.y / sp) * 9 + rand(-3, 3),
          vx: rand(-20, 20),
          vy: rand(-20, 20),
          life: 0.25,
          maxLife: 0.25,
          size: rand(2.5, 5),
          color: 'rgba(255,150,60,0.85)',
          shape: 'circle',
          z: 5,
        })
      }
    }

    // wall collision
    const tx = Math.floor(p.pos.x / TILE)
    const ty = Math.floor(p.pos.y / TILE)
    const tile = tileAt(g.map, tx, ty)
    if (blocksBullet(tile)) {
      if (p.kind === 'rocket' || p.kind === 'megarocket') {
        onExplode(p.pos, p.splash, p.damage, p.ownerId, p.knock, p.color)
      }
      g.particles.sparkBurst(p.pos, p.color, 5, 90)
      projs.splice(i, 1)
      continue
    }

    // brawler hit
    const radius = p.kind === 'wave' ? p.width / 2 : p.size + 6
    let hit = false
    if (p.damage > 0) {
      for (const b of g.brawlers) {
      if (b.dead || b.id === p.ownerId || b.spawnProt > 0 || b.invulnT > 0) continue
      if (p.hitIds.includes(b.id)) continue
      if (g.mode.id !== 'showdown' && b.team === p.ownerTeam) continue
      if (dist2(p.pos, b.pos) < Math.pow(radius + 12, 2)) {
        // damage falloff over traveled distance
        const traveled = p.kind === 'lob' ? 0 : dist(p.start, p.pos)
        const full = p.maxLife > 0 ? dist(p.start, p.end) : 1
        const falloff = p.kind === 'wave' || p.kind === 'slash' ? 1 : lerp(1, 0.55, clamp(traveled / Math.max(1, full), 0, 1))
        const dmg = Math.round(p.damage * falloff)
        onHit(b, dmg, p.ownerId, { knock: p.knock, color: p.color })
        p.hitIds.push(b.id)
        if (p.kind === 'rocket' || p.kind === 'megarocket' || p.kind === 'lob') {
          onExplode(p.pos, p.splash, p.damage, p.ownerId, p.knock, p.color)
          g.particles.burst(p.pos, p.color, 14, { speed: 200, size: 6, life: 0.45, gravity: 300 })
          hit = true
          break
        }
        if (p.kind === 'slash' || p.kind === 'wave') {
          p.pierce--
          if (p.pierce <= 0) {
            hit = true
            break
          }
        } else {
          hit = true
          break
        }
      }
      }
    }
    if (hit) {
      g.particles.sparkBurst(p.pos, p.color, 7, 120)
      projs.splice(i, 1)
    }
  }
}

export function findBrawlerById(g: { brawlers: BrawlerState[] }, id: number): BrawlerState | null {
  return g.brawlers.find((b) => b.id === id) ?? null
}

export function healBrawler(b: BrawlerState, amount: number) {
  b.hp = Math.min(b.maxHp, b.hp + amount)
}
