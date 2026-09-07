import { WEAPON_MAP } from '../data/weapons.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// ── momentum is the damage multiplier of the whole game ─────────────────────
export function momentumScale (speed, kind = 'gun') {
  const t = clamp((speed - 5) / 12, 0, 1.5)
  return 1 + t * (kind === 'melee' ? 1.0 : 0.55)
}

export class Weapon {
  constructor (defId, skin) {
    this.setId(defId)
    this.skin = skin
    this.reset(true)
  }

  setId (id) {
    this.def = WEAPON_MAP[id] || WEAPON_MAP.vex9
    this.id = this.def.id
  }

  reset (full = true) {
    const s = this.def.stats
    this.ammo = s.mag ?? 1
    if (full) this.reserve = s.reserve ?? 0
    this.fireTimer = 0
    this.reloadTimer = 0
    this.reloading = false
    this.burstLeft = 0
    this.burstTimer = 0
    this.charge = 0
    this.charging = false
    this.bloom = 0
    this.spin = 0
    this.boltTimer = 0
    this.ads = 0
    this.shots = 0
    this.lastFire = -99
  }

  get isMelee () { return this.def.stats.type === 'melee' }
  get isUtility () { return ['throw', 'self', 'hook', 'place'].includes(this.def.stats.type) }
  get empty () { return !this.isMelee && !this.isUtility && this.ammo <= 0 }
  get canReload () { return !this.isMelee && !this.reloading && this.ammo < this.def.stats.mag && this.reserve > 0 }

  startReload () {
    if (!this.canReload) return false
    this.reloading = true
    this.reloadTimer = this.def.stats.reload
    return true
  }

  cancelReload () { this.reloading = false; this.reloadTimer = 0 }

  finishReload () {
    const s = this.def.stats
    const need = s.mag - this.ammo
    const take = Math.min(need, this.reserve)
    this.ammo += take
    this.reserve -= take
    this.reloading = false
  }

  // ctx: { dt, speed, grounded, sliding, crouching, wantAds, wantFire, wantFirePressed, t }
  update (dt, ctx) {
    const s = this.def.stats
    this.fireTimer = Math.max(0, this.fireTimer - dt)
    this.burstTimer = Math.max(0, this.burstTimer - dt)
    this.boltTimer = Math.max(0, this.boltTimer - dt)
    if (this.reloading) {
      this.reloadTimer -= dt
      if (this.reloadTimer <= 0) this.finishReload()
    }
    const adsRate = 1 / Math.max(0.05, s.adsTime ?? 0.2)
    const wantAds = ctx.wantAds && !this.reloading && !this.slidingBlocked
    this.ads = clamp(this.ads + (wantAds ? dt * adsRate : -dt * adsRate * 1.35), 0, 1)
    this.bloom = Math.max(0, this.bloom - dt * (this.isMelee ? 6 : 3.2))
    this.spin = Math.max(0, this.spin - dt * 1.6)

    if (s.charge) {
      if (ctx.wantFire && !this.reloading && this.ammo > 0 && this.fireTimer <= 0) {
        this.charging = true
        this.charge = Math.min(1, this.charge + dt / s.charge)
      }
    }
  }

  // returns a shot descriptor or null
  tryFire (ctx) {
    const s = this.def.stats
    if (this.reloading || this.fireTimer > 0 || this.boltTimer > 0) return null
    // nobody is pulling the trigger → nothing fires (a burst in progress still finishes)
    const asking = !!(ctx.wantFire || ctx.wantFirePressed || ctx.wantFireReleased)
    if (!asking && !(s.burst && this.burstLeft > 0)) return null
    if (this.isMelee) {
      if (ctx.t - this.lastFire < 1 / s.rate) return null
      this.lastFire = ctx.t
      this.bloom = Math.min(3, this.bloom + 1)
      return { def: this.def, pellets: 1, spread: 0, dmg: s.dmg, kind: 'melee' }
    }
    if (this.isUtility) return null
    if (this.ammo <= 0) return null

    // semi / burst / charge gate
    if (s.charge) {
      if (!this.charging) return null
      if (!ctx.wantFireReleased && this.charge < 1) return null
      if (this.charge < 0.12) return null
    } else if (!s.auto) {
      if (!ctx.wantFirePressed) return null
    }

    if (s.burst) {
      if (this.burstLeft <= 0) {
        if (!ctx.wantFirePressed && !ctx.wantFire) return null
        if (!ctx.wantFirePressed) return null
        this.burstLeft = s.burst
      }
      this.burstLeft--
    }

    this.ammo--
    this.shots++
    this.fireTimer = 60 / s.rpm
    this.lastFire = ctx.t
    if (s.burst && this.burstLeft > 0) this.burstTimer = s.burstDelay / s.burst
    if (s.bolt) this.boltTimer = this.fireTimer * 1.5
    this.spin = Math.min(1, this.spin + 0.34)

    const chargeMul = s.charge ? 1 + (s.chargeMul - 1) * this.charge : 1
    this.charge = 0
    this.charging = false

    const spread = this.currentSpread(ctx)
    this.bloom = Math.min(this.isMelee ? 3 : 4.2, this.bloom + (s.pellets ? 1.6 : 0.85))
    return {
      def: this.def,
      pellets: s.pellets ?? 1,
      spread,
      dmg: (s.dmg ?? 20) * chargeMul,
      charge: chargeMul,
      kind: s.type,
    }
  }

  currentSpread (ctx) {
    const s = this.def.stats
    let base = (s.spreadHip ?? 2) + ((s.spreadAds ?? 0.3) - (s.spreadHip ?? 2)) * this.ads
    // moving makes you inaccurate, sliding even more — but speed also means damage
    const move = clamp(ctx.speed / 12, 0, 1.3)
    base += move * (ctx.sliding ? 2.1 : 1.35) * (1 - this.ads * 0.65)
    if (!ctx.grounded) base += 1.9 * (1 - this.ads * 0.5)
    if (ctx.crouching && ctx.grounded) base *= 0.62
    base += this.bloom * 0.5
    if (s.spin) base *= 1 + (1 - this.spin) * 1.1
    return Math.max(0, base)
  }

  falloffMul (dist) {
    const s = this.def.stats
    if (!s.falloff) return 1
    const [a, b, min] = s.falloff
    if (dist <= a) return 1
    if (dist >= b) return min
    return 1 + (min - 1) * ((dist - a) / (b - a))
  }
}

// Utility runtime (grenades / devices) — one charge per round by default.
export class UtilitySlot {
  constructor (defId) { this.setId(defId); this.reset() }
  setId (id) { this.def = WEAPON_MAP[id] || WEAPON_MAP.frag; this.id = this.def.id }
  reset () { this.uses = this.def.stats.count ?? 1; this.cooldown = 0 }
  update (dt) { this.cooldown = Math.max(0, this.cooldown - dt) }
  canUse () { return this.uses > 0 && this.cooldown <= 0 }
  consume () { this.uses--; this.cooldown = 0.7 }
}
