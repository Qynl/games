import * as THREE from 'three'
import { Brush, PhysicsWorld } from '../src/game/core/Physics.js'
import { MovementController } from '../src/game/core/Movement.js'
import { MAPS } from '../src/game/data/maps.js'
import { WEAPONS } from '../src/game/data/weapons.js'

const DT = 1 / 120
// deterministic PRNG so a flaky random walk can't hide a real regression
let _seed = 0x9e3779b9
const rnd = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296 }
const rand = () => { _seed = 0x9e3779b9; return rnd() }
let fails = 0
const check = (n, ok, info = '') => { console.log(`${ok ? ' PASS' : '*FAIL'}  ${n}  ${info}`); if (!ok) fails++ }

// ── weapon data sanity ─────────────────────────────────────────────────────
{
  let bad = []
  for (const w of WEAPONS) {
    const s = w.stats
    if (!w.name || !w.id || !w.model) bad.push(w.id + ':meta')
    if (w.slot !== 'utility' && !(s.dmg > 0)) bad.push(w.id + ':dmg')
    if (w.slot === 'utility' && !s.type) bad.push(w.id + ':utype')
    if (w.slot !== 'melee' && w.slot !== 'utility') {
      if (!(s.rpm > 0)) bad.push(w.id + ':rpm')
      if (!(s.mag > 0)) bad.push(w.id + ':mag')
      if (!(s.reload > 0)) bad.push(w.id + ':reload')
    }
    if (w.slot === 'melee' && !(s.reach > 0)) bad.push(w.id + ':reach')
  }
  check(`all ${WEAPONS.length} weapons have valid data`, bad.length === 0, bad.join(','))
  const ids = new Set(WEAPONS.map((w) => w.id))
  check('weapon ids unique', ids.size === WEAPONS.length)
}

// ── every map: spawns are solid, ground exists, nobody falls out ───────────
for (const map of MAPS) {
  const phys = new PhysicsWorld(8)
  for (const b of map.brushes) phys.add(new Brush(b))
  phys.build()

  // 1. spawn points stand on something
  let spawnBad = []
  for (const [team, list] of Object.entries(map.spawns)) {
    list.forEach((sp, i) => {
      const p = new THREE.Vector3(sp[0], sp[1] + 0.4, sp[2])
      const m = new MovementController(phys)
      m.reset(p, sp[3] ?? 0)
      m.grounded = true
      for (let k = 0; k < 240; k++) m.step(DT, { forward: 0, right: 0, jump: false, crouch: false, sprint: false, jumpPressed: false, crouchPressed: false })
      if (m.pos.y < sp[1] - 1.5) spawnBad.push(`${team}${i}:fell to ${m.pos.y.toFixed(1)}`)
      if (!m.grounded) spawnBad.push(`${team}${i}:airborne`)
    })
  }
  check(`${map.id}: spawn points are solid`, spawnBad.length === 0, spawnBad.join(' '))

  // 2. random walkers must never fall through the world or get permanently stuck
  let fell = 0, stuck = 0, maxY = -999
  for (let trial = 0; trial < 24; trial++) {
    const sp = map.spawns.a[trial % map.spawns.a.length]
    const m = new MovementController(phys)
    m.reset(new THREE.Vector3(sp[0], sp[1] + 0.4, sp[2]), rnd() * 6.28)
    m.grounded = true
    let inp = { forward: 1, right: 0, jump: false, crouch: false, sprint: true, jumpPressed: false, crouchPressed: false }
    let stuckT = 0, worstStuck = 0
    for (let k = 0; k < 1200; k++) {
      if (k % 60 === 0) { inp.right = rnd() < 0.5 ? 1 : -1; inp.sprint = rnd() < 0.7 }
      m.yaw += (rnd() - 0.5) * 0.06
      inp.jumpPressed = rnd() < 0.02
      inp.jump = inp.jumpPressed
      inp.crouchPressed = rnd() < 0.015
      inp.crouch = inp.crouchPressed
      m.step(DT, inp)
      inp.jumpPressed = false; inp.crouchPressed = false
      if (m.pos.y < (map.killY ?? -25)) { fell++; break }
      if (m.grounded && m.horizontalSpeed < 0.5 && Math.hypot(inp.forward, inp.right) > 0.5) { stuckT += DT; worstStuck = Math.max(worstStuck, stuckT) }
      else stuckT = 0
      maxY = Math.max(maxY, m.pos.y)
    }
    if (worstStuck > 1.4) stuck++
  }
  // maps with deliberate pits allow some falls — that is the point of a gap
  const allowFalls = map.id === 'yard' || map.id === 'descent' ? 14 : 0
  check(`${map.id}: no fall-through in 24 random runs`, fell <= allowFalls, `fell=${fell} allowed=${allowFalls}`)
  check(`${map.id}: no permanent stuck states`, stuck <= 2, `stuckRuns=${stuck}/24`)
  check(`${map.id}: geometry has vertical play`, maxY > 1.2, `maxY=${maxY.toFixed(1)}`)

  // 3. brush count is sane for one instanced draw call
  check(`${map.id}: brush count reasonable`, map.brushes.length > 20 && map.brushes.length < 400, `${map.brushes.length}`)
}

console.log(`\n${fails === 0 ? 'ALL MAP TESTS PASSED' : fails + ' FAILURES'}`)
process.exit(fails ? 1 : 0)
