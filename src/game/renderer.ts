import { GameState } from './state'
import { BrawlerState, Projectile } from './entities'
import { BrawlerDef, Look } from './brawlers'
import { GameMap, tileAt, T_GRASS, T_WALL, T_WATER, T_BUSH } from './maps'
import { TILE, TEAM_COLORS, TeamId } from './types'
import { Vec, v, clamp, lerp, dist } from './util'

export class Renderer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  mapCache: HTMLCanvasElement | null = null
  mapCacheKey = ''
  dpr = 1
  cw = 800
  ch = 600
  scale = 1
  viewX = 0
  viewY = 0
  private shakeT = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  resize() {
    const parent = this.canvas.parentElement
    const w = parent ? parent.clientWidth : window.innerWidth
    const h = parent ? parent.clientHeight : window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cw = Math.max(320, w)
    this.ch = Math.max(240, h)
    this.canvas.width = Math.round(this.cw * this.dpr)
    this.canvas.height = Math.round(this.ch * this.dpr)
    this.canvas.style.width = this.cw + 'px'
    this.canvas.style.height = this.ch + 'px'
  }

  private ensureMapCache(map: GameMap) {
    const key = map.id
    if (this.mapCache && this.mapCacheKey === key) return
    const c = document.createElement('canvas')
    c.width = map.w * TILE
    c.height = map.h * TILE
    const ctx = c.getContext('2d')!
    drawMapTo(ctx, map)
    this.mapCache = c
    this.mapCacheKey = key
  }

  render(g: GameState, dt: number, pointerWorld: Vec | null) {
    const ctx = this.ctx
    const map = g.map

    if (this.cw === 0 || this.ch === 0) this.resize()

    // camera
    const target = g.player ?? g.brawlers[0]
    const desiredScale = clamp(
      Math.min(this.cw / (map.w * TILE + 60), this.ch / (map.h * TILE + 120)),
      0.55,
      1.6
    )
    this.scale = lerp(this.scale, desiredScale, 1 - Math.exp(-dt * 4))
    this.shakeT = Math.max(0, this.shakeT - dt * 2)

    const sx = (Math.random() - 0.5) * g.shake * 14
    const sy = (Math.random() - 0.5) * g.shake * 14
    this.viewX = (target?.pos.x ?? map.w * TILE / 2) - this.cw / (2 * this.scale) + sx
    this.viewY = (target?.pos.y ?? map.h * TILE / 2) - this.ch / (2 * this.scale) + sy
    this.viewX = clamp(this.viewX, -20, map.w * TILE - this.cw / this.scale + 20)
    this.viewY = clamp(this.viewY, -20, map.h * TILE - this.ch / this.scale + 20)

    // clear
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = '#10230f'
    ctx.fillRect(0, 0, this.cw, this.ch)

    ctx.save()
    ctx.translate(this.cw / 2, this.ch / 2)
    ctx.scale(this.scale, this.scale)
    ctx.translate(-target.pos.x, -target.pos.y)

    const viewW = this.cw / this.scale
    const viewH = this.ch / this.scale
    const vx0 = target.pos.x - viewW / 2
    const vy0 = target.pos.y - viewH / 2

    // ---- map ----
    this.ensureMapCache(map)
    ctx.drawImage(
      this.mapCache!,
      vx0, vy0, viewW, viewH,
      vx0, vy0, viewW, viewH
    )

    // gem mine
    if (map.mine && g.mode.id === 'gem') {
      this.drawMine(ctx, map.mine, g.time)
    }

    // gas (under entities)
    if (g.gas) this.drawGas(ctx, g)

    // ---- pickups ----
    for (const pk of g.pickups) {
      const bounce = Math.sin(pk.t * 6) * 2
      ctx.save()
      ctx.translate(pk.pos.x, pk.pos.y + bounce)
      if (pk.kind === 'gem') {
        ctx.fillStyle = 'rgba(156,77,255,0.25)'
        ctx.beginPath()
        ctx.ellipse(0, 7, 7, 3.5, 0, 0, Math.PI * 2)
        ctx.fill()
        drawGem(ctx, 0, 0, 6, pk.t)
      } else {
        ctx.fillStyle = 'rgba(255,210,63,0.22)'
        ctx.beginPath()
        ctx.ellipse(0, 7, 7, 3.5, 0, 0, Math.PI * 2)
        ctx.fill()
        drawCube(ctx, 0, 0, 7, pk.t)
      }
      ctx.restore()
    }

    // ---- puddles ----
    for (const p of g.puddles) {
      const a = clamp(p.life / 2, 0, 1) * 0.5
      ctx.fillStyle = `rgba(176,77,255,${a})`
      ctx.beginPath()
      ctx.ellipse(p.pos.x, p.pos.y, 46, 40, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(220,160,255,${a * 0.8})`
      ctx.beginPath()
      ctx.ellipse(p.pos.x, p.pos.y + 2, 34, 28, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // ---- boxes ----
    for (const box of g.boxes) {
      if (box.broken) continue
      const sh = (Math.random() - 0.5) * box.shake * 6
      ctx.save()
      ctx.translate(box.pos.x + sh, box.pos.y)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(0, 11, 16, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      drawCrate(ctx, 0, -8, 28, 28, box.hp < 500)
      ctx.restore()
    }

    // ---- turrets ----
    for (const t of g.turrets) {
      ctx.save()
      ctx.translate(t.pos.x, t.pos.y)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      const bob = Math.sin(g.time * 4 + t.id) * 1.5
      ctx.translate(0, bob)
      // base
      ctx.fillStyle = '#2b3a4a'
      ctx.beginPath()
      ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3f5568'
      ctx.beginPath()
      ctx.ellipse(0, -3, 8, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      // head
      ctx.fillStyle = '#37e5ff'
      ctx.beginPath()
      ctx.arc(0, -10, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0d2b36'
      ctx.beginPath()
      ctx.arc(0, -10, 3.2, 0, Math.PI * 2)
      ctx.fill()
      // hp
      const hpFrac = clamp(t.hp / t.maxHp, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      rr(ctx, -8, -24, 16, 4, 2)
      ctx.fill()
      ctx.fillStyle = hpFrac > 0.5 ? '#4ade80' : hpFrac > 0.25 ? '#facc15' : '#f87171'
      rr(ctx, -8, -24, 16 * hpFrac, 4, 2)
      ctx.fill()
      ctx.restore()
    }

    // ---- tombstones ----
    for (const ts of g.tombstones) {
      ctx.save()
      ctx.translate(ts.x, ts.y)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(0, 6, 10, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      const col = ts.team === 1 ? '#8a3b32' : ts.team === 0 ? '#3b5c8a' : '#5f6b76'
      ctx.fillStyle = col
      rr(ctx, -8, -16, 16, 22, 5)
      ctx.fill()
      ctx.fillStyle = '#d8dde3'
      ctx.beginPath()
      ctx.arc(0, -11, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = col
      rr(ctx, -6, -14, 12, 5, 3)
      ctx.fill()
      ctx.restore()
    }

    // ---- brawlers sorted by y ----
    const sorted = [...g.brawlers].sort((a, b) => a.pos.y - b.pos.y)
    for (const b of sorted) {
      this.drawBrawler(ctx, g, b, pointerWorld)
    }

    // ---- projectiles ----
    for (const p of g.projectiles) {
      this.drawProjectile(ctx, g, p)
    }

    // ---- particles ----
    for (const pt of g.particles.list) {
      const a = clamp(pt.life / pt.maxLife, 0, 1)
      ctx.save()
      ctx.globalAlpha = a
      ctx.translate(pt.x, pt.y)
      ctx.rotate(pt.rot)
      if (pt.text) {
        ctx.rotate(-pt.rot)
        ctx.font = `800 ${pt.size}px Nunito, sans-serif`
        ctx.textAlign = 'center'
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.lineWidth = 3
        ctx.strokeText(pt.text, 0, 0)
        ctx.fillStyle = pt.color
        ctx.fillText(pt.text, 0, 0)
      } else if (pt.shape === 'spark') {
        ctx.fillStyle = pt.color
        ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2)
      } else if (pt.shape === 'gem') {
        drawGem(ctx, 0, 0, pt.size * 0.8, pt.rot * 3)
      } else {
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(0, 0, pt.size * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // ---- player aim ----
    const p = g.player
    if (p && !p.dead && g.phase !== 'ended') {
      const aimWorld = pointerWorld
        ? pointerWorld
        : v(
            p.pos.x + Math.cos(p.aim) * 80,
            p.pos.y + Math.sin(p.aim) * 80
          )
      const range = p.attackRange
      const inRange = dist(p.pos, aimWorld) <= range
      ctx.save()
      ctx.strokeStyle = inRange ? 'rgba(255,255,255,0.28)' : 'rgba(255,80,80,0.4)'
      ctx.lineWidth = 2.5
      ctx.setLineDash([10, 10])
      ctx.beginPath()
      ctx.arc(p.pos.x, p.pos.y, range, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      // reticle
      const rx = clamp(aimWorld.x, p.pos.x - range, p.pos.x + range)
      const ry = clamp(aimWorld.y, p.pos.y - range, p.pos.y + range)
      const pulse = 1 + Math.sin(g.time * 8) * 0.15
      ctx.strokeStyle = inRange ? 'rgba(255,255,255,0.9)' : 'rgba(255,90,90,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(rx, ry, 7 * pulse, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.arc(rx, ry, 1.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()

    // vignette
    const vg = ctx.createRadialGradient(
      this.cw / 2, this.ch / 2, Math.min(this.cw, this.ch) * 0.38,
      this.cw / 2, this.ch / 2, Math.max(this.cw, this.ch) * 0.72
    )
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(8,12,20,0.42)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, this.cw, this.ch)
  }

  private drawMine(ctx: CanvasRenderingContext2D, mine: Vec, time: number) {
    const x = mine.x * TILE
    const y = mine.y * TILE
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(0, 8, 18, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    // pedestal
    ctx.fillStyle = '#6b5a8a'
    rr(ctx, -14, -8, 28, 16, 5)
    ctx.fill()
    ctx.fillStyle = '#85739f'
    rr(ctx, -10, -12, 20, 8, 4)
    ctx.fill()
    const pulse = 1 + Math.sin(time * 3) * 0.08
    const glow = ctx.createRadialGradient(0, -16, 2, 0, -16, 26)
    glow.addColorStop(0, 'rgba(156,77,255,0.55)')
    glow.addColorStop(1, 'rgba(156,77,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, -16, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.translate(0, -18 + Math.sin(time * 2) * 2)
    ctx.rotate(Math.sin(time * 1.4) * 0.2)
    ctx.scale(pulse, pulse)
    drawGem(ctx, 0, 0, 9, time)
    ctx.restore()
    ctx.restore()
  }

  private drawGas(ctx: CanvasRenderingContext2D, g: GameState) {
    const gas = g.gas!
    const r = gas.radius
    ctx.save()
    // outside fill
    ctx.beginPath()
    ctx.rect(
      gas.center.x - r - 2000, gas.center.y - r - 2000,
      r * 2 + 4000, r * 2 + 4000
    )
    ctx.arc(gas.center.x, gas.center.y, r, 0, Math.PI * 2, true)
    ctx.fillStyle = 'rgba(140,255,90,0.30)'
    ctx.fill()
    // wavy edge
    ctx.strokeStyle = 'rgba(200,255,140,0.9)'
    ctx.lineWidth = 6
    ctx.beginPath()
    const wob = 4
    const steps = 90
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2
      const rr2 = r + Math.sin(a * 5 + g.time * 2.2) * wob + Math.sin(a * 11 - g.time * 3) * 2
      const x = gas.center.x + Math.cos(a) * rr2
      const y = gas.center.y + Math.sin(a) * rr2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(140,255,90,0.25)'
    ctx.lineWidth = 14
    ctx.stroke()
    ctx.restore()
  }

  private drawBrawler(
    ctx: CanvasRenderingContext2D,
    g: GameState,
    b: BrawlerState,
    pointerWorld: Vec | null
  ) {
    if (b.dead) return
    ctx.save()
    ctx.translate(b.pos.x, b.pos.y)

    const speedNorm = Math.min(1, Math.hypot(b.vel.x, b.vel.y) / (b.def.speed + 40))
    const bounce = b.moving ? Math.abs(Math.sin(b.walkPhase * 2)) * 2.4 : Math.sin(b.bobPhase) * 1.2

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.26)'
    ctx.beginPath()
    ctx.ellipse(0, 12, 13 * (1 + speedNorm * 0.06), 5.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // team ring
    const ringColor = b.isPlayer ? '#4ade80' : TEAM_COLORS[b.team]
    ctx.strokeStyle = ringColor
    ctx.globalAlpha = 0.85
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(0, 10, 14, 6.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // super glow
    if (b.superCharge >= 1) {
      const glowPulse = 0.5 + Math.sin(g.time * 6) * 0.3
      ctx.fillStyle = `rgba(255,210,63,${glowPulse * 0.35})`
      ctx.beginPath()
      ctx.ellipse(0, 4, 20, 12, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // spawn protection
    if (b.spawnProt > 0) {
      ctx.strokeStyle = 'rgba(140,210,255,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, -4, 17 + Math.sin(g.time * 10) * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
    // shield
    if (b.shieldT > 0) {
      const a = 0.35 + Math.sin(g.time * 10) * 0.12
      ctx.fillStyle = `rgba(90,160,255,${a})`
      ctx.beginPath()
      ctx.arc(0, -6, 19, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(180,220,255,0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    ctx.restore()

    // ---- body (upright, squash & bounce) ----
    ctx.save()
    ctx.translate(b.pos.x, b.pos.y)
    ctx.scale(1 + speedNorm * 0.06, 1 - speedNorm * 0.1 + Math.sin(b.bobPhase) * 0.02)
    ctx.translate(0, -bounce)
    const flip = Math.cos(b.aimVis) < 0 ? -1 : 1
    // legs
    const step = Math.sin(b.walkPhase * 2) * speedNorm * 3
    ctx.fillStyle = shade(b.def.colors.body, -30)
    ctx.beginPath()
    ctx.ellipse(-3 + step * 0.6, 8, 3.6, 3, 0, 0, Math.PI * 2)
    ctx.ellipse(3 - step * 0.6, 8, 3.6, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    // body
    ctx.fillStyle = b.def.colors.body
    rr(ctx, -8, -8, 16, 18, 7)
    ctx.fill()
    ctx.strokeStyle = b.def.colors.outline
    ctx.lineWidth = 2.5
    rr(ctx, -8, -8, 16, 18, 7)
    ctx.stroke()
    // belt
    ctx.fillStyle = shade(b.def.colors.body, -45)
    ctx.fillRect(-8, 3, 16, 3.5)
    ctx.fillStyle = b.def.colors.accent
    ctx.fillRect(-2.5, 2.6, 5, 4.4)
    // head
    ctx.fillStyle = b.def.colors.skin
    ctx.beginPath()
    ctx.arc(0, -16, 9.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = b.def.colors.outline
    ctx.lineWidth = 2.5
    ctx.stroke()
    // face direction dot eyes
    const eyeOff = flip * 3
    ctx.fillStyle = '#1d1d1d'
    ctx.beginPath()
    ctx.arc(eyeOff - 2.5, -17.5, 1.6, 0, Math.PI * 2)
    ctx.arc(eyeOff + 2.5, -17.5, 1.6, 0, Math.PI * 2)
    ctx.fill()
    // muzzle
    if (b.def.look.muzzle) {
      ctx.fillStyle = shade(b.def.colors.skin, -18)
      ctx.beginPath()
      ctx.ellipse(eyeOff, -13.5, 3.4, 2.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    this.drawHat(ctx, b.def)
    // weapon rotated to aim
    ctx.save()
    ctx.rotate(b.aimVis)
    ctx.scale(flip, 1)
    this.drawWeapon(ctx, b, b.def)
    ctx.restore()
    ctx.restore()

    // ---- overlays (screen space, above body) ----
    ctx.save()
    ctx.translate(b.pos.x, b.pos.y)
    // hit flash
    if (b.hitFlash > 0) {
      ctx.globalAlpha = b.hitFlash * 0.55
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(0, -6, 13, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // carried gems
    if (b.gems > 0) {
      const gx = b.gems > 9 ? -13 : -11
      drawGem(ctx, gx, -30 + Math.sin(g.time * 5) * 1.5, 5, g.time)
      ctx.font = '900 10px Nunito, sans-serif'
      ctx.textAlign = 'left'
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'
      ctx.lineWidth = 3
      ctx.strokeText(`${b.gems}`, gx + 6, -27)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${b.gems}`, gx + 6, -27)
    }
    // cubes
    if (b.cubes > 1) {
      drawCube(ctx, 12, -28 + Math.sin(g.time * 5 + 2) * 1.5, 5.5, g.time)
      ctx.font = '900 9px Nunito, sans-serif'
      ctx.textAlign = 'left'
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'
      ctx.lineWidth = 3
      ctx.strokeText(`${b.cubes}`, 18, -24)
      ctx.fillStyle = '#ffd23f'
      ctx.fillText(`${b.cubes}`, 18, -24)
    }
    // emote
    if (b.emote) {
      const et = b.emote.t
      ctx.globalAlpha = clamp(et / 0.4, 0, 1)
      ctx.font = '20px sans-serif'
      ctx.textAlign = 'center'
      const pop = 1 + Math.max(0, et - 1.3) * 6
      ctx.scale(pop, pop)
      ctx.fillText(b.emote.icon, 0, -38)
      ctx.globalAlpha = 1
    }
    // name + hp
    const nameColor = b.isPlayer ? '#4ade80' : b.team === 0 ? '#9ec3ff' : '#ff9d94'
    ctx.font = '800 9px Nunito, sans-serif'
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'
    ctx.lineWidth = 3
    ctx.strokeText(b.name, 0, -44)
    ctx.fillStyle = nameColor
    ctx.fillText(b.name, 0, -44)
    const hpFrac = clamp(b.hp / b.maxHp, 0, 1)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    rr(ctx, -14, -41, 28, 4.5, 2.5)
    ctx.fill()
    ctx.fillStyle = hpFrac > 0.5 ? '#4ade80' : hpFrac > 0.25 ? '#facc15' : '#f87171'
    rr(ctx, -13, -40, 26 * hpFrac, 3.5, 2)
    ctx.fill()
    // player marker
    if (b.isPlayer) {
      const bob = Math.sin(g.time * 6) * 2
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(0, -52 + bob)
      ctx.lineTo(-5, -60 + bob)
      ctx.lineTo(5, -60 + bob)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    void pointerWorld
  }

  private drawHat(ctx: CanvasRenderingContext2D, def: BrawlerDef) {
    const look = def.look
    const o = def.colors.outline
    ctx.lineWidth = 2
    switch (look.hat) {
      case 'helmet': {
        ctx.fillStyle = '#7a8b99'
        ctx.beginPath()
        ctx.arc(0, -20, 10.5, Math.PI, 0)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        ctx.fillStyle = '#94a6b4'
        ctx.fillRect(-10, -21.5, 20, 3)
        break
      }
      case 'goggles': {
        ctx.fillStyle = '#f4b942'
        ctx.fillRect(-11, -20.5, 22, 3.4)
        ctx.strokeStyle = o
        ctx.strokeRect(-11, -20.5, 22, 3.4)
        ctx.fillStyle = '#5dd9ff'
        ctx.beginPath()
        ctx.arc(-4.5, -19.2, 4.4, 0, Math.PI * 2)
        ctx.arc(4.5, -19.2, 4.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        break
      }
      case 'cap': {
        ctx.fillStyle = '#2e6fd8'
        ctx.beginPath()
        ctx.arc(0, -20, 10, Math.PI, 0)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        ctx.fillStyle = '#2e6fd8'
        rr(ctx, 2, -21, 12, 3.5, 2)
        ctx.fill()
        break
      }
      case 'headband': {
        ctx.fillStyle = '#f5c542'
        ctx.fillRect(-9.5, -21.5, 19, 4)
        ctx.strokeStyle = o
        ctx.strokeRect(-9.5, -21.5, 19, 4)
        ctx.fillStyle = '#f5c542'
        ctx.beginPath()
        ctx.moveTo(9, -22)
        ctx.lineTo(14, -16)
        ctx.lineTo(9, -12)
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'beaker': {
        ctx.fillStyle = '#8fd3ff'
        ctx.beginPath()
        ctx.arc(0, -21, 9, Math.PI, 0.15)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        ctx.fillStyle = '#c86bff'
        ctx.fillRect(-4, -23.5, 8, 2.5)
        break
      }
      case 'headphones': {
        ctx.fillStyle = '#2ec4a8'
        ctx.beginPath()
        ctx.arc(0, -21, 9.5, Math.PI, 0)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        ctx.fillStyle = '#1d7a6c'
        ctx.beginPath()
        ctx.arc(-9.5, -19, 3, 0, Math.PI * 2)
        ctx.arc(9.5, -19, 3, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'hood': {
        ctx.fillStyle = '#26221a'
        ctx.beginPath()
        ctx.arc(0, -19.5, 10, Math.PI * 1.05, -Math.PI * 0.05)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        ctx.fillStyle = '#e8c820'
        ctx.fillRect(-9, -19, 18, 3)
        break
      }
      case 'visor': {
        ctx.fillStyle = '#0d47a1'
        ctx.beginPath()
        ctx.arc(0, -19.5, 10, Math.PI * 0.92, Math.PI * 0.08)
        ctx.fill()
        ctx.strokeStyle = o
        ctx.stroke()
        ctx.fillStyle = '#26e0ff'
        rr(ctx, -6.5, -21, 13, 5, 2.5)
        ctx.fill()
        ctx.fillStyle = '#aef6ff'
        ctx.fillRect(-5, -20.4, 4, 2)
        break
      }
    }
  }

  private drawWeapon(ctx: CanvasRenderingContext2D, b: BrawlerState, def: BrawlerDef) {
    const o = def.colors.outline
    const superGlow = b.superCharge >= 1
    ctx.save()
    if (superGlow) {
      ctx.shadowColor = '#ffd23f'
      ctx.shadowBlur = 10
    }
    ctx.strokeStyle = o
    ctx.lineWidth = 2
    switch (def.look.weapon) {
      case 'shotgun': {
        ctx.fillStyle = '#6b4a2b'
        rr(ctx, 4, -4, 14, 5, 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#4a3018'
        rr(ctx, 15, -3, 5, 7, 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ffd23f'
        rr(ctx, 20, -1.5, 3, 4, 1.5)
        ctx.fill()
        break
      }
      case 'bazooka': {
        ctx.fillStyle = '#3f6d43'
        rr(ctx, 3, -6, 15, 8, 4)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ffd23f'
        rr(ctx, 17, -7.5, 4, 11, 2)
        ctx.fill()
        ctx.stroke()
        break
      }
      case 'rifle': {
        ctx.fillStyle = '#b9c6d4'
        rr(ctx, 4, -3.5, 20, 4.5, 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#2e6fd8'
        rr(ctx, 10, -5.5, 6, 3, 1.5)
        ctx.fill()
        break
      }
      case 'gloves': {
        ctx.fillStyle = '#c0392b'
        ctx.beginPath()
        ctx.arc(10, -3, 6, 0, Math.PI * 2)
        ctx.arc(14, 4, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#f5c542'
        ctx.beginPath()
        ctx.arc(10, -3, 3.4, 0, Math.PI * 2)
        ctx.arc(14, 4, 3.4, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'bottles': {
        ctx.fillStyle = '#c86bff'
        ctx.beginPath()
        ctx.arc(9, -5, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#8fd3ff'
        ctx.fillRect(8, -9, 2, 3)
        break
      }
      case 'amp': {
        ctx.fillStyle = '#2ec4a8'
        rr(ctx, 4, -7, 10, 10, 3)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#0e5f52'
        ctx.beginPath()
        ctx.arc(9, -2, 3, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'blades': {
        ctx.fillStyle = '#e8f0f8'
        ctx.beginPath()
        ctx.moveTo(6, -10)
        ctx.lineTo(22, -8)
        ctx.lineTo(6, -3)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#e8f0f8'
        ctx.beginPath()
        ctx.moveTo(7, 2)
        ctx.lineTo(22, 5)
        ctx.lineTo(7, 8)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
      case 'smg': {
        ctx.fillStyle = '#39424d'
        rr(ctx, 4, -4.5, 12, 6, 2.5)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#26e0ff'
        rr(ctx, 15, -3.5, 4, 4, 2)
        ctx.fill()
        ctx.fillStyle = '#4a5563'
        ctx.fillRect(6, 2, 4, 5)
        break
      }
    }
    ctx.restore()
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, g: GameState, p: Projectile) {
    ctx.save()
    switch (p.kind) {
      case 'lob': {
        const tt = clamp(p.t / p.dur, 0, 1)
        const h = Math.sin(Math.PI * tt) * p.arcH
        const gx = p.pos.x
        const gy = p.pos.y
        // ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath()
        ctx.ellipse(gx, gy + 6, 6, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.translate(gx, gy - h)
        ctx.rotate(p.spin)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.35, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'slash': {
        // arc sector
        const owner = g.brawlers.find((b) => b.id === p.ownerId)
        const aim = owner?.aimVis ?? 0
        const lifeFrac = clamp(p.life / p.maxLife, 0, 1)
        ctx.translate(p.pos.x, p.pos.y)
        ctx.rotate(aim)
        ctx.globalAlpha = lifeFrac * 0.85
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, p.size, -p.width / 2, p.width / 2)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = lifeFrac
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, p.size * 0.2, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'wave': {
        ctx.translate(p.pos.x, p.pos.y)
        const rot = Math.atan2(p.vel.y, p.vel.x)
        ctx.rotate(rot)
        ctx.globalAlpha = 0.8
        ctx.fillStyle = p.color
        rr(ctx, -p.width / 2, -12, p.width, 24, 12)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        rr(ctx, -p.width / 2 + 6, -6, p.width - 12, 6, 3)
        ctx.fill()
        break
      }
      default: {
        // bullets, rockets
        const isRocket = p.kind === 'rocket' || p.kind === 'megarocket'
        const trail = p.vel.x !== 0 || p.vel.y !== 0
        if (trail) {
          const tl = Math.hypot(p.vel.x, p.vel.y)
          const tx = p.pos.x - (p.vel.x / tl) * (isRocket ? 12 : 8)
          const ty = p.pos.y - (p.vel.y / tl) * (isRocket ? 12 : 8)
          ctx.strokeStyle = isRocket ? 'rgba(255,140,60,0.7)' : 'rgba(255,220,120,0.55)'
          ctx.lineWidth = isRocket ? 6 : p.size * 0.8
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(tx, ty)
          ctx.lineTo(p.pos.x, p.pos.y)
          ctx.stroke()
        }
        ctx.translate(p.pos.x, p.pos.y)
        ctx.rotate(Math.atan2(p.vel.y, p.vel.x))
        ctx.fillStyle = p.color
        if (isRocket) {
          rr(ctx, -p.size, -p.size * 0.55, p.size * 2, p.size * 1.1, 4)
          ctx.fill()
          ctx.fillStyle = '#ff5c33'
          ctx.beginPath()
          ctx.moveTo(-p.size * 0.5, -p.size * 0.55)
          ctx.lineTo(-p.size * 1.3, 0)
          ctx.lineTo(-p.size * 0.5, p.size * 0.55)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.75)'
          ctx.beginPath()
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
    }
    ctx.restore()
  }
}

// ---------- shared drawing helpers ----------

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr2 = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr2, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr2)
  ctx.arcTo(x + w, y + h, x, y + h, rr2)
  ctx.arcTo(x, y + h, x, y, rr2)
  ctx.arcTo(x, y, x + w, y, rr2)
  ctx.closePath()
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = clamp(((n >> 16) & 255) + amt, 0, 255)
  const g = clamp(((n >> 8) & 255) + amt, 0, 255)
  const b = clamp((n & 255) + amt, 0, 255)
  return `rgb(${r},${g},${b})`
}

function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 2 + x) * 0.25)
  ctx.fillStyle = '#b04dff'
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.lineTo(s * 0.85, -s * 0.15)
  ctx.lineTo(s * 0.5, s)
  ctx.lineTo(-s * 0.5, s)
  ctx.lineTo(-s * 0.85, -s * 0.15)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(40,10,70,0.65)'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.75)
  ctx.lineTo(s * 0.35, -s * 0.1)
  ctx.lineTo(0, s * 0.15)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawCube(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 1.6 + x) * 0.2)
  ctx.fillStyle = '#ffd23f'
  ctx.beginPath()
  ctx.arc(0, 0, s, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#b8860b'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.fillStyle = '#fff3b0'
  ctx.beginPath()
  ctx.arc(-s * 0.3, -s * 0.3, s * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cracked: boolean
) {
  ctx.fillStyle = '#9c6b3a'
  rr(ctx, x, y, w, h, 4)
  ctx.fill()
  ctx.strokeStyle = '#4a2f16'
  ctx.lineWidth = 2.5
  rr(ctx, x, y, w, h, 4)
  ctx.stroke()
  ctx.strokeStyle = '#7a4f26'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + w * 0.5, y)
  ctx.lineTo(x + w * 0.5, y + h)
  ctx.moveTo(x, y + h * 0.5)
  ctx.lineTo(x + w, y + h * 0.5)
  ctx.stroke()
  ctx.fillStyle = '#c98a4e'
  ctx.fillRect(x + 3, y + 3, w - 6, 2.5)
  if (cracked) {
    ctx.strokeStyle = '#3a2410'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x + w * 0.3, y + 2)
    ctx.lineTo(x + w * 0.45, y + h * 0.4)
    ctx.lineTo(x + w * 0.3, y + h * 0.75)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + w * 0.7, y + h * 0.15)
    ctx.lineTo(x + w * 0.6, y + h * 0.5)
    ctx.lineTo(x + w * 0.75, y + h - 2)
    ctx.stroke()
  }
}

function drawMapTo(ctx: CanvasRenderingContext2D, map: GameMap) {
  const w = map.w
  const h = map.h
  // grass base
  ctx.fillStyle = '#79c74f'
  ctx.fillRect(0, 0, w * TILE, h * TILE)
  const grassA = '#79c74f'
  const grassB = '#71be47'
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = tileAt(map, x, y)
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = grassA
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
      } else {
        ctx.fillStyle = grassB
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
      }
      void t
    }
  }
  // subtle grass blades
  ctx.fillStyle = 'rgba(40,110,30,0.16)'
  for (let i = 0; i < w * h * 1.2; i++) {
    const x = (i * 37 % (w * TILE))
    const y = (i * 71 % (h * TILE))
    ctx.fillRect(x, y, 1.5, 3)
  }

  // water
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_WATER) continue
      const px = x * TILE
      const py = y * TILE
      ctx.fillStyle = '#2f8fdd'
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(px + 4, py + 8, 14, 2.5)
      ctx.fillRect(px + 14, py + 20, 12, 2.5)
    }
  }
  // water edges
  ctx.strokeStyle = '#1e5f96'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_WATER) continue
      const px = x * TILE
      const py = y * TILE
      if (tileAt(map, x, y - 1) !== T_WATER) { ctx.moveTo(px, py); ctx.lineTo(px + TILE, py) }
      if (tileAt(map, x, y + 1) !== T_WATER) { ctx.moveTo(px, py + TILE); ctx.lineTo(px + TILE, py + TILE) }
      if (tileAt(map, x - 1, y) !== T_WATER) { ctx.moveTo(px, py); ctx.lineTo(px, py + TILE) }
      if (tileAt(map, x + 1, y) !== T_WATER) { ctx.moveTo(px + TILE, py); ctx.lineTo(px + TILE, py + TILE) }
    }
  }
  ctx.stroke()

  // walls
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_WALL) continue
      const px = x * TILE
      const py = y * TILE
      ctx.fillStyle = '#a56a33'
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2)
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fillRect(px + 2, py + 2, TILE - 4, 5)
      ctx.fillStyle = 'rgba(60,35,12,0.25)'
      ctx.fillRect(px + 2, py + TILE - 8, TILE - 4, 6)
    }
  }
  ctx.strokeStyle = '#4a2f16'
  ctx.lineWidth = 4
  ctx.beginPath()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_WALL) continue
      const px = x * TILE
      const py = y * TILE
      if (tileAt(map, x, y - 1) !== T_WALL) { ctx.moveTo(px, py); ctx.lineTo(px + TILE, py) }
      if (tileAt(map, x, y + 1) !== T_WALL) { ctx.moveTo(px, py + TILE); ctx.lineTo(px + TILE, py + TILE) }
      if (tileAt(map, x - 1, y) !== T_WALL) { ctx.moveTo(px, py); ctx.lineTo(px, py + TILE) }
      if (tileAt(map, x + 1, y) !== T_WALL) { ctx.moveTo(px + TILE, py); ctx.lineTo(px + TILE, py + TILE) }
    }
  }
  ctx.stroke()

  // bushes (merged blobs)
  const bushPad = 3
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_BUSH) continue
      const px = x * TILE - bushPad
      const py = y * TILE - bushPad
      const s = TILE + bushPad * 2
      ctx.fillStyle = '#2f9e44'
      rr(ctx, px, py, s, s, 9)
      ctx.fill()
    }
  }
  // bush texture dots
  ctx.fillStyle = 'rgba(16,90,40,0.5)'
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_BUSH) continue
      const seed = x * 7 + y * 13
      for (let i = 0; i < 4; i++) {
        const ox = ((seed * (i + 3) * 17) % (TILE - 8)) + 4
        const oy = ((seed * (i + 5) * 31) % (TILE - 8)) + 4
        ctx.beginPath()
        ctx.arc(x * TILE + ox, y * TILE + oy, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  // bush outline
  ctx.strokeStyle = '#1c6e30'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tileAt(map, x, y) !== T_BUSH) continue
      const px = x * TILE - bushPad
      const py = y * TILE - bushPad
      const s = TILE + bushPad * 2
      if (tileAt(map, x, y - 1) !== T_BUSH) { ctx.moveTo(px, py + 2); ctx.lineTo(px + s, py + 2) }
      if (tileAt(map, x, y + 1) !== T_BUSH) { ctx.moveTo(px, py + s - 2); ctx.lineTo(px + s, py + s - 2) }
      if (tileAt(map, x - 1, y) !== T_BUSH) { ctx.moveTo(px + 2, py); ctx.lineTo(px + 2, py + s) }
      if (tileAt(map, x + 1, y) !== T_BUSH) { ctx.moveTo(px + s - 2, py); ctx.lineTo(px + s - 2, py + s) }
    }
  }
  ctx.stroke()

  // map border
  ctx.strokeStyle = 'rgba(20,40,16,0.8)'
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, w * TILE, h * TILE)
}
