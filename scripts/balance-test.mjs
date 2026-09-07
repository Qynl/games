import { WEAPONS, bySlot } from '../src/game/data/weapons.js'
import { momentumScale } from '../src/game/core/Weapons.js'

const HP = 150
const pad = (s, n) => String(s).padEnd(n)
const num = (v, n = 1) => String((typeof v === 'number' && isFinite(v) ? v : 0).toFixed(n)).padStart(6)

console.log(pad('ID', 12) + pad('NAME', 15) + pad('SLOT', 10) + num('DPS') + num('TTK') + num('EFF') + num('RANGE') + num('MAG') + num('SPD') + '   QYN')
const ttkOf = (w, momSpeed = 12) => {
  const s = w.stats
  const mom = momentumScale(momSpeed, w.slot === 'melee' ? 'melee' : 'gun')
  if (s.type === 'melee') {
    const dmg = s.dmg * mom * (0.7 + 0.3 * (s.back ?? 1.3) * 0.25) // a few backstabs
    return Math.ceil(HP / dmg) / s.rate
  }
  const head = s.head ?? 1.5
  const per = (s.dmg ?? 20) * (s.charge ? s.chargeMul : 1) * mom * (0.7 + 0.3 * head)
  const perPellet = s.pellets ? per * s.pellets * 0.8 : per       // shotguns connect ~80% up close
  const shot = s.pellets ? perPellet : per
  const need = Math.max(1, Math.ceil(HP / shot))
  const cyc = 60 / (s.rpm || 120)
  let t
  if (s.charge) t = (need - 1) * (cyc + (s.charge ?? 0.5)) + (s.charge ?? 0.5)
  else if (s.burst) {
    const perBurst = s.burst
    const bursts = Math.ceil(need / perBurst)
    const gate = Math.max(cyc * perBurst, s.burstDelay ?? 0)
    t = (bursts - 1) * gate + (need - 1) * cyc
  } else t = (need - 1) * cyc
  if (s.bolt) t += cyc * 0.5 * need
  if (s.mag && need > s.mag) t += (s.reload ?? 1.6) * Math.ceil((need - s.mag) / s.mag)
  return Math.max(0.1, t)
}

let warns = []
console.log(pad('ID', 12) + pad('NAME', 15) + pad('SLOT', 10) + num('TTK idle') + num('TTK moving') + num('RANGE') + num('MAG') + num('SPD') + '   QYN')
for (const w of WEAPONS) {
  const s = w.stats
  const t0 = w.slot === 'utility' ? 0 : ttkOf(w, 0)
  const t1 = w.slot === 'utility' ? 0 : ttkOf(w, w.slot === 'melee' ? 17 : 13)
  console.log(pad(w.id, 12) + pad(w.name, 15) + pad(w.slot, 10) + num(t0, 2) + num(t1, 2) + num(s.range ?? s.reach ?? 0) + num(s.mag ?? 0) + num(s.speed ?? 0, 2) + '  ' + pad(w.qyn, 6))
  if (w.slot === 'utility') continue
  if (t1 < 0.28) warns.push(`${w.id} kills in ${t1.toFixed(2)}s while moving — too fast`)
  if (t1 > 1.4) warns.push(`${w.id} takes ${t1.toFixed(2)}s at full speed — too slow`)
}

console.log('\nMOMENTUM DAMAGE  (the faster you move, the harder you hit)')
for (const sp of [0, 5, 8, 11, 14, 17, 20]) {
  console.log(`  ${num(sp)} m/s → gun x${momentumScale(sp, 'gun').toFixed(2)}   melee x${momentumScale(sp, 'melee').toFixed(2)}`)
}
console.log('\n' + (warns.length ? 'WARNINGS:\n  ' + warns.join('\n  ') : 'no balance warnings'))
process.exit(0)
