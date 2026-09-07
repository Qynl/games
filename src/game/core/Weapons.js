import { WEAPON_MAP } from '../data/weapons.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// ────────────────────────────────────────────────────────────────────────────
//  RECOIL PATTERNS
//  Every automatic gun climbs the same way every single time. That is what
//  makes a spray learnable: the 6th shot always goes to the same place, so a
//  player who practises the pull-down hits, and a player who does not does not.
//  Values are [vertical, horizontal] units; the weapon's own recoil.v scales
//  them, so the shape is the pattern and the size is the gun.
// ────────────────────────────────────────────────────────────────────────────
export const RECOIL_PATTERNS = {
  none: [[0, 0]],
  // steady climb with a lazy S — the classic rifle spray
  rifle: [[0.80, 0.05], [0.88, -0.14], [0.95, 0.20], [1.02, -0.16], [1.08, 0.30],
    [1.14, -0.24], [1.20, 0.36], [1.26, -0.28], [1.32, 0.40], [1.36, -0.18],
    [1.40, 0.44], [1.44, -0.30]],
  // light climb, wide sway — controllable, but it wanders
  smg: [[0.62, 0.10], [0.70, -0.22], [0.78, 0.30], [0.84, -0.34], [0.90, 0.40],
    [0.94, -0.42], [0.98, 0.46], [1.02, -0.38], [1.05, 0.48], [1.08, -0.30],
    [1.10, 0.50], [1.12, -0.34]],
  // heavy, slow, drifts hard to one side — you have to steer it
  lmg: [[0.55, 0.12], [0.62, 0.26], [0.70, 0.44], [0.78, 0.30], [0.86, 0.52],
    [0.92, 0.22], [0.98, 0.58], [1.02, 0.14], [1.06, 0.60], [1.08, 0.10],
    [1.10, 0.62], [1.12, 0.06]],
  // three round bursts: tight, then it resets
  burst: [[0.85, 0.04], [0.95, -0.16], [1.10, 0.26]],
  // semi autos: one honest kick per trigger pull
  marksman: [[1.0, 0.10], [1.15, -0.14], [1.3, 0.18]],
  pistol: [[0.95, 0.06], [1.05, -0.18], [1.15, 0.22]],
  shotgun: [[1.0, 0.14], [1.1, -0.20], [1.2, 0.26]],
  beam: [[0.9, 0.03], [0.95, -0.05], [1.0, 0.08]],
  // a big single hit — the gun is slow enough that the pattern always resets
  heavy: [[1.0, 0.12]],
}

const PATTERN_BY_KIND = {
  rifle: 'rifle', carbine: 'rifle', smg: 'smg', lmg: 'lmg', dmr: 'marksman',
  sniper: 'heavy', shotgun: 'shotgun', pistol: 'pistol', revolver: 'heavy',
  energy: 'beam', beam: 'beam', melee: 'none', launcher: 'heavy',
}

export function patternFor (def) {
  const key = def.stats.pattern || PATTERN_BY_KIND[def.model?.kind] || 'rifle'
  return RECOIL_PATTERNS[key] || RECOIL_PATTERNS.rifle
}

export function patternTable (def, n = 12) {
  const p = patternFor(def)
  const v = def.stats.recoil?.v ?? 1
  const out = []
  for (let i = 0; i < n; i++) {
    const step = p[Math.min(i, p.length - 1)]
    out.push([(v * step[0]).toFixed(2), (v * step[1]).toFixed(2)])
  }
  return out
}

const DEG = Math.PI / 180

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
    this.recoilIndex = 0
    this.recoilIdle = 9
    this.recoilDebt = { p: 0, y: 0 }
    this._kick = null
    this._rec = null
  }

  // The aim displacement waiting to be applied to whoever holds this gun.
  // Split in two: recovery is spent BEFORE a shot (so a tap after a pause is
  // honest), the kick is spent AFTER it (so this bullet flies where you aimed).
  takeKick () { const k = this._kick; this._kick = null; return k }
  takeRecovery () { const r = this._rec; this._rec = null; return r }

  addAim (p, y) {
    this._kick = this._kick || { p: 0, y: 0 }
    this._kick.p += p
    this._kick.y += y
    this.recoilDebt.p += p
    this.recoilDebt.y += y
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
    this.recoilIdle += dt
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

    // ── recoil: pattern memory, then the aim comes home on its own ──────────
    if (this.recoilIdle > 0.45) this.recoilIndex = 0
    if (this.recoilIdle > 0.16 && (Math.abs(this.recoilDebt.p) > 1e-5 || Math.abs(this.recoilDebt.y) > 1e-5)) {
      // stop shooting and the gun settles back to where you were aiming —
      // control the spray while it happens, and tapping stays accurate
      const k = Math.min(1, dt * (this.def.stats.recoil?.recover ?? 7) * 0.55)
      this.addAim(-this.recoilDebt.p * k, -this.recoilDebt.y * k)
    }

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

    // deterministic climb: shot N always kicks the same way
    if (!this.isMelee) {
      const pat = patternFor(this.def)
      const step = pat[Math.min(this.recoilIndex, pat.length - 1)]
      const v = s.recoil?.v ?? 1
      const mul = (1 - this.ads * 0.28) * (s.pellets ? 1.2 : 1)
      this.addAim(v * step[0] * DEG * mul, v * step[1] * DEG * mul)
      this.recoilIndex++
      this.recoilIdle = 0
    }

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
