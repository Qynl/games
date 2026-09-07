// Headless end-to-end engine test: real physics, real bots, real match logic,
// stubbed renderer + DOM.
import * as THREE from 'three'

// ── minimal DOM ────────────────────────────────────────────────────────────
const listeners = () => ({ addEventListener () {}, removeEventListener () {} })
const canvas = {
  ...listeners(), clientWidth: 1280, clientHeight: 720,
  requestPointerLock () {}, getContext: () => null, style: {},
}
globalThis.window = { ...listeners(), devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720 }
globalThis.document = { ...listeners(), exitPointerLock () {}, pointerLockElement: null }
globalThis.requestAnimationFrame = () => 0
globalThis.cancelAnimationFrame = () => {}
globalThis.structuredClone = globalThis.structuredClone || ((o) => JSON.parse(JSON.stringify(o)))

const rendererStub = () => ({
  autoClear: true, domElement: canvas,
  info: { render: { calls: 0, triangles: 0 } },
  setPixelRatio () {}, setSize () {}, render () {}, clearDepth () {}, dispose () {},
})

const { Game } = await import('../src/game/core/Game.js')
const { buildViewModel } = await import('../src/game/core/ViewModels.js')
const { WEAPONS, WEAPON_MAP } = await import('../src/game/data/weapons.js')
const { SKINS } = await import('../src/game/data/skins.js')
const { MODES, MAPS } = await import('../src/game/data/maps.js')

let fails = 0
const check = (n, ok, info = '') => { console.log(`${ok ? ' PASS' : '*FAIL'}  ${n}  ${info}`); if (!ok) fails++ }

// ── every weapon builds a viewmodel ────────────────────────────────────────
{
  let bad = []
  for (const w of WEAPONS) {
    for (const skin of [null, SKINS[6]]) {
      try {
        const vm = buildViewModel(w, skin)
        let meshes = 0
        vm.group.traverse((o) => { if (o.isMesh) meshes++ })
        if (meshes < 2) bad.push(w.id + ':tooFewMeshes')
        if (!vm.muzzle) bad.push(w.id + ':noMuzzle')
        const box = new THREE.Box3().setFromObject(vm.group)
        const size = box.getSize(new THREE.Vector3())
        if (!(size.x > 0.05 && size.x < 2.2 && size.y < 1.2 && size.z < 2.2)) {
          bad.push(`${w.id}:size ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`)
        }
      } catch (e) { bad.push(w.id + ':' + e.message) }
    }
  }
  check(`all ${WEAPONS.length} viewmodels build with sane sizes`, bad.length === 0, bad.slice(0, 4).join(' '))
}

// ── full match simulation on every map/mode combo ──────────────────────────
const STEP = 1 / 120
for (const mode of MODES) {
  const map = mode.id === 'range' ? MAPS.find((m) => m.id === 'range') : MAPS.find((m) => m.id === 'yard')
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: { fov: 95, sensitivity: 1 } })
  let events = []
  g.onEvent = (t, d) => events.push({ t, d })
  g.load({ mapId: map.id, modeId: mode.id, loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], botLevel: 'normal' })
  check(`${mode.id}: fighters spawned`, g.fighters.length >= 2, `${g.fighters.length} fighters / ${g.bots.length} bots`)

  const player = g.player
  let err = null
  let maxTop = 0
  let maxBotDist = 0
  const t0 = Date.now()
  // drive the REAL input layer (keyboard state), like a player would
  const IN = g.input
  const K = IN.keys
  // on the range, aim at the first dummy so we can prove hits register
  const aimTarget = mode.id === 'range' ? g.fighters.find((f) => f.isDummy) : null
  try {
    for (let i = 0; i < 120 * 45; i++) {          // 45 simulated seconds
      const t = i * STEP
      K.KeyW = true
      K.ShiftLeft = true
      K.KeyD = Math.sin(t * 1.1) > 0
      K.KeyA = !K.KeyD
      K.Space = (i % 200) < 4
      K.ControlLeft = (i % 170) < 45
      if (aimTarget && aimTarget.alive) {
        const dd = new THREE.Vector3().subVectors(aimTarget.mv.pos, player.mv.pos)
        player.mv.yaw = Math.atan2(-dd.x, -dd.z)
        player.mv.pitch = Math.atan2(dd.y + 0.9 - (player.mv.pos.y + player.mv.height * 0.92), Math.hypot(dd.x, dd.z))
        IN.mouse.dx = 0
      } else {
        IN.mouse.dx = Math.sin(t * 0.9) * 6
      }
      IN.mouseButtons[0] = (i % 14) < 5
      IN.mouseButtons[2] = (i % 320) < 90
      if (i % 200 === 0) IN.pressed.Space = true
      if (i % 170 === 0) IN.pressed.ControlLeft = true
      if (i % 14 === 0) IN.pressed.__f = true
      IN.mousePressed[0] = (i % 14) === 0
      if (player.weapon.ammo === 0) IN.pressed.KeyR = true
      if (i === 1200) IN.pressed.Digit2 = true
      if (i === 2400) IN.pressed.Digit3 = true
      if (i === 3000) IN.pressed.KeyF = true
      if (i === 3600) IN.pressed.Digit1 = true
      if (i === 4200) IN.pressed.KeyF = true
      g.fixedStep(STEP)
      if (i % 4 === 0) g.renderFrame(STEP * 4)
      maxTop = Math.max(maxTop, player.mv.topSpeed)
      for (const b of g.bots) maxBotDist = Math.max(maxBotDist, b.f.mv.distance)
      if (g.match.phase === 'matchend') break
    }
  } catch (e) { err = e }
  const ms = Date.now() - t0
  if (err) { check(`${mode.id}: simulation ran without errors`, false, err.stack?.split('\n').slice(0, 2).join(' | ')); continue }
  check(`${mode.id}: simulation ran without errors`, true, `${ms}ms for 45s sim`)

  const st = player.stats
  if (mode.id === 'range') {
    check(`${mode.id}: dummies exist and take damage`, g.fighters.length > 5 && st.damage > 0, `dmg=${Math.round(st.damage)}`)
    check(`${mode.id}: infinite reserve ammo`, player.weapons.primary.reserve > 0 || player.weapons.primary.ammo > 0)
  } else {
    check(`${mode.id}: rounds progress`, g.match.round >= 1, `round ${g.match.round}, score ${g.match.scoreA}-${g.match.scoreB}`)
    const totalDmg = g.fighters.reduce((a, f) => a + f.stats.damage, 0)
    const totalKills = g.fighters.reduce((a, f) => a + f.stats.kills, 0)
    check(`${mode.id}: combat happens`, totalDmg > 0 || g.match.scoreA + g.match.scoreB > 0,
      `match dmg=${Math.round(totalDmg)} kills=${totalKills} score=${g.match.scoreA}-${g.match.scoreB} (you: ${Math.round(st.damage)}/${st.kills}/${st.deaths})`)
  }
  // (falling into a pit on QYN YARD is legal — you just have to be dead when you do)
  check(`${mode.id}: player stayed in the world`,
    !player.alive || (player.mv.pos.y > (map.killY ?? -25) && Math.abs(player.mv.pos.x) < 400),
    `pos ${player.mv.pos.toArray().map((v) => v.toFixed(1))} alive=${player.alive}`)
  check(`${mode.id}: movement chains detected`, Object.keys(player.mv.tracker.done).length > 0,
    'chains ' + JSON.stringify(player.mv.tracker.order))
  check(`${mode.id}: speed carried`, maxTop > 8, `top ${maxTop.toFixed(1)} m/s`)
  check(`${mode.id}: bots actually move`, mode.id === 'range' || maxBotDist > 5, `furthest bot ${maxBotDist.toFixed(0)} m`)
  g.dispose()
}

// ── match completes to first-to-5 ──────────────────────────────────────────
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  let ended = null
  g.onEvent = (t, d) => { if (t === 'matchend') ended = d }
  g.load({ mapId: 'vertex', modeId: '1v1', loadout: { primary: 'vex9', secondary: 'q1', melee: 'katana', utility: 'frag' }, skin: SKINS[0], botLevel: 'easy' })
  // give the player perfect aim: snap yaw at the enemy every step
  const enemy = g.fighters.find((f) => f.team === 'b')
  let steps = 0
  while (!ended && steps < 120 * 400) {
    const d = new THREE.Vector3().subVectors(enemy.mv.pos, g.player.mv.pos)
    g.player.mv.yaw = Math.atan2(-d.x, -d.z)
    g.player.mv.pitch = Math.atan2(d.y - 0.2, Math.hypot(d.x, d.z))
    g.input.keys.KeyD = steps % 240 < 120
    g.input.keys.KeyA = !g.input.keys.KeyD
    g.input.keys.KeyW = steps % 300 < 200
    g.input.keys.Space = steps % 180 < 3
    g.input.mouseButtons[0] = g.player.alive && enemy.alive
    g.input.mousePressed[0] = steps % 22 === 0
    if (g.player.weapon.ammo === 0) g.input.pressed.KeyR = true
    g.fixedStep(STEP)
    if (steps % 4 === 0) g.renderFrame(STEP * 4)
    steps++
  }
  check('a match reaches MATCH END (first to 5)', !!ended, ended ? `${ended.scoreA}-${ended.scoreB} in ${(steps / 120).toFixed(0)}s` : 'timed out')
  check('player wins rounds with perfect aim', !!ended && ended.stats.kills >= 3, ended ? `kills ${ended.stats.kills} dmg ${Math.round(ended.stats.damage)}` : '')
  g.dispose()
}

// ── every weapon can fire without exploding ────────────────────────────────
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g.load({ mapId: 'range', modeId: 'range', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
  let bad = []
  for (const w of WEAPONS) {
    try {
      const slot = w.slot === 'primary' ? 'primary' : w.slot === 'secondary' ? 'secondary' : w.slot === 'melee' ? 'melee' : 'utility'
      g.applyLoadout({ primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag', [slot]: w.id })
      g.player.slot = slot === 'utility' ? 'primary' : slot
      if (slot === 'utility') { g.useUtility(g.player); continue }
      for (let i = 0; i < 200; i++) {
        g.input.mouseButtons[0] = true
        g.input.mousePressed[0] = i % 10 === 0
        g.player.mv.yaw += 0.01
        if (g.player.weapon.ammo === 0) g.input.pressed.KeyR = true
        g.fixedStep(STEP)
        if (i % 4 === 0) g.renderFrame(STEP * 4)
      }
      g.input.mouseButtons[0] = false
      for (let i = 0; i < 60; i++) g.fixedStep(STEP)
    } catch (e) { bad.push(w.id + ': ' + e.message) }
  }
  check('all 40 weapons fire / deploy without errors', bad.length === 0, bad.slice(0, 3).join(' | '))
  g.dispose()
}

console.log(`\n${fails === 0 ? 'ALL ENGINE TESTS PASSED' : fails + ' FAILURES'}`)
process.exit(fails ? 1 : 0)
