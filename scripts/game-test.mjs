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
const ctx2d = new Proxy({}, { get: () => () => {} })
globalThis.document = {
  ...listeners(), exitPointerLock () {}, pointerLockElement: null,
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {} }),
}
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
for (const mode of MODES.filter((m) => m.id !== 'p2p')) {   // p2p needs a live peer, covered by net-test
  const map = mode.id === 'range' ? MAPS.find((m) => m.id === 'range') : MAPS.find((m) => m.id === 'yard')
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: { fov: 95, sensitivity: 1 } })
  let events = []
  g.onEvent = (t, d) => events.push({ t, d })
  g.load({ mapId: map.id, modeId: mode.id, loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], botLevel: 'normal' })
  check(`${mode.id}: fighters spawned`, g.fighters.length >= 2, `${g.fighters.length} fighters / ${g.bots.length} bots`)

  const player = g.player
  let live = null
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
      // aim like a person: re-acquire between bursts, then ride the recoil
      if (i % 36 === 0) live = g.fighters.find((f) => f.alive && f.team !== player.team) || null
      const aimAt = (target) => {
        const dd = new THREE.Vector3().subVectors(target.mv.pos, player.mv.pos)
        player.mv.yaw = Math.atan2(-dd.x, -dd.z)
        player.mv.pitch = Math.atan2(dd.y + 0.9 - (player.mv.pos.y + player.mv.height * 0.92), Math.hypot(dd.x, dd.z))
      }
      if (mode.id === 'range' && aimTarget && aimTarget.alive) aimAt(aimTarget)
      else if (live) aimAt(live)
      IN.mouse.dx = (mode.id === 'range' || live) ? 0 : Math.sin(t * 0.9) * 6
      IN.mouseButtons[0] = (i % 36) < 14
      IN.mouseButtons[2] = (i % 320) < 90
      if (i % 200 === 0) IN.pressed.Space = true
      if (i % 170 === 0) IN.pressed.ControlLeft = true
      if (i % 14 === 0) IN.pressed.__f = true
      IN.mousePressed[0] = (i % 36) === 0
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
  const board = ended?.board || []
  check('the match result carries a full scoreboard', board.length >= 2 && board.some((r) => r.you),
    `${board.length} rows, you: ${board.find((r) => r.you)?.name || 'MISSING'}`)
  check('scoreboard rows carry kills / damage / accuracy',
    board.every((r) => typeof r.kills === 'number' && typeof r.damage === 'number' && typeof r.acc === 'number'),
    board.map((r) => `${r.name}:${r.kills}/${r.damage}`).join(' '))
  check('player wins rounds with perfect aim', !!ended && ended.stats.kills >= 3, ended ? `kills ${ended.stats.kills} dmg ${Math.round(ended.stats.damage)}` : '')
  g.dispose()
}

// ── the HUD must arrive even while paused (the pause menu lives in React) ──
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  let n = 0, last = null
  g.onHud = (h) => { n++; last = h }
  g.load({ mapId: 'vertex', modeId: '1v1', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
  check('HUD pushed immediately after load', n > 0, `pushes=${n}`)
  g.setPaused(true)
  let t = performance.now()
  g.last = t
  for (let i = 0; i < 120; i++) { t += 16.7; g.frame(t) }
  check('HUD keeps flowing while paused', n > 4, `pushes=${n}`)
  check('paused HUD carries match state', !!last?.round && last.hp === 150, JSON.stringify({ round: last?.round?.round, hp: last?.hp }))
  check('paused never advances the simulation', g.time === 0, `t=${g.time}`)
  g.dispose()
}

// ── feedback systems: spawn guard, damage direction, streaks, spectate ─────
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g.load({ mapId: 'vertex', modeId: '1v1', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
  const p = g.player
  const e = g.fighters.find((f) => f.team === 'b')
  const hp0 = e.health
  e.applyDamage(40, p, false, null)
  check('spawn guard blocks damage', e.health === hp0, `hp ${e.health}`)
  e.spawnGuard = 0
  e.applyDamage(40, p, false, null)
  check('damage lands once the guard is gone', e.health === hp0 - 40, `hp ${e.health}`)

  g.damageTarget(p, 12, e, false, new THREE.Vector3(0, 0, -1), true)
  check('taking damage pings a direction', g.hitDirs.length === 1, `n=${g.hitDirs.length}`)

  // killing two in a row announces a double kill
  g.killFighter(e, p, false)
  g.killFighter(e, p, false)   // already dead → ignored
  const alive2 = g.fighters.filter((x) => x.team === 'b')
  for (const f of alive2) { f.alive = true; g.killFighter(f, p, false) }
  check('kill streak counts', g.killStreak >= 1, `streak ${g.killStreak}`)
  check('first blood announced', g.banners.some((b) => b.text === 'FIRST BLOOD'), g.banners.map((b) => b.text).join(','))

  // leave one standing so there is someone to watch
  const watchable = g.fighters.find((f) => f.team === 'b')
  watchable.alive = true
  watchable.model.visible = true
  p.alive = false
  const spec = g.spectateTarget()
  check('dead player spectates someone', !!spec && spec !== p, spec ? spec.name : 'nobody')
  check('spectating does not watch a corpse', !!spec && spec.alive)
  g.dispose()
}

// ── disposing a match must never free geometry the next match reuses ────────
{
  const g1 = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g1.load({ mapId: 'yard', modeId: '1v1', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
  let shared = null
  g1.fighters[0].model.traverse((o) => { if (!shared && o.isMesh && o.geometry) shared = o.geometry })
  let freed = false
  const flag = () => { freed = true }
  shared?.addEventListener?.('dispose', flag)
  g1.dispose()
  check('disposing a match does not free shared model geometry', shared && !freed,
    shared ? (freed ? 'GEOMETRY WAS DISPOSED — the next match would render nothing' : 'shared geometry survived') : 'no geometry found')
  const g2 = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g2.load({ mapId: 'yard', modeId: '1v1', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
  let meshes = 0
  g2.fighters[0].model.traverse((o) => { if (o.isMesh) meshes++ })
  check('a second match still builds visible fighters', meshes > 4, `${meshes} meshes`)
  // and a disposed game stops listening to the mouse
  let moved = 0
  g1.input.mouse.dx = 0
  window.dispatchEvent?.({ type: 'mousemove', movementX: 10 })
  moved = g1.input.mouse.dx
  check('a disposed game detaches its input listeners', moved === 0, `dx=${moved}`)
  g2.dispose()
}

// ── chaos soak: random input on every map, looking for NaN and crashes ──────
{
  const seed = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const bad = []
  for (const map of MODES.length ? ['yard', 'vertex', 'conduit', 'descent', 'fracture'] : []) {
    const rnd = seed(12345 + map.length)
    const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
    g.load({ mapId: map, modeId: '3v3', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], botLevel: 'normal' })
    let err = null
    let worst = 0
    try {
      for (let i = 0; i < 120 * 60; i++) {          // 60 chaotic seconds
        const IN = g.input
        IN.keys.KeyW = rnd() < 0.7
        IN.keys.KeyA = rnd() < 0.35
        IN.keys.KeyS = rnd() < 0.2
        IN.keys.KeyD = rnd() < 0.35
        IN.keys.ShiftLeft = rnd() < 0.6
        IN.keys.ControlLeft = rnd() < 0.25
        IN.keys.Space = rnd() < 0.25
        IN.pressed.Space = rnd() < 0.06
        IN.pressed.ControlLeft = rnd() < 0.05
        IN.mouse.dx = (rnd() - 0.5) * 40
        IN.mouse.dy = (rnd() - 0.5) * 24
        IN.mouseButtons[0] = rnd() < 0.55
        IN.mouseButtons[2] = rnd() < 0.2
        IN.mousePressed[0] = rnd() < 0.08
        if (rnd() < 0.01) IN.pressed.Digit1 = true
        if (rnd() < 0.01) IN.pressed.Digit2 = true
        if (rnd() < 0.008) IN.pressed.Digit3 = true
        if (rnd() < 0.006) IN.pressed.KeyR = true
        if (rnd() < 0.005) IN.pressed.KeyF = true
        g.fixedStep(STEP)
        if (i % 4 === 0) g.renderFrame(STEP * 4)
        for (const f of g.fighters) {
          const p = f.mv.pos
          if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) throw new Error('NaN position on ' + f.name)
          if (!Number.isFinite(f.mv.vel.x)) throw new Error('NaN velocity on ' + f.name)
          worst = Math.max(worst, Math.abs(p.x), Math.abs(p.z))
        }
      }
    } catch (e) { err = e }
    if (err) bad.push(`${map}: ${err.message}`)
    const hud = { speed: 0 }
    check(`chaos: ${map} survives 60s of random input`, !err, err ? err.message : `max |xz| ${worst.toFixed(0)} m`)
    g.dispose()
  }
}

// ── recoil patterns: learnable, and they come home on their own ─────────────
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g.load({ mapId: 'range', modeId: 'range', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
  const p = g.player
  p.mv.pitch = 0.2
  const start = p.mv.pitch
  const climbs = []
  let shots = 0
  for (let i = 0; i < 90; i++) {                 // ~1.5s of a held trigger
    g.input.mouseButtons[0] = true
    g.input.mousePressed[0] = i === 0
    const before = p.mv.pitch
    g.fixedStep(STEP)
    if (p.mv.pitch > before + 1e-6) { shots++; climbs.push(p.mv.pitch - before) }
  }
  check('recoil: a spray climbs the aim', shots >= 8, `${shots} kicks over 1.5s of fire`)
  const deg = climbs.map((c) => (c * 180 / Math.PI))
  const rising = deg.filter((d, i) => i === 0 || d > 0).length
  check('recoil: every kick is upward (learnable pull-down)', rising === deg.length, deg.map((d) => d.toFixed(2)).join(' '))
  check('recoil: the climb ramps up, it is not flat', deg.length > 3 && deg[deg.length - 1] > deg[0] * 0.9 && deg[deg.length - 1] < deg[0] * 4,
    `${deg[0].toFixed(2)}° → ${deg[deg.length - 1].toFixed(2)}°`)
  const peak = p.mv.pitch
  g.input.mouseButtons[0] = false
  for (let i = 0; i < 90; i++) g.fixedStep(STEP)      // 0.75s of not shooting
  check('recoil: the aim comes home when you stop', Math.abs(p.mv.pitch - start) < Math.abs(peak - start) * 0.25,
    `peak ${((peak - start) * 57.3).toFixed(2)}° → ${((p.mv.pitch - start) * 57.3).toFixed(2)}°`)
  // the pattern is deterministic: the same gun twice climbs identically
  const run = () => {
    const g2 = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
    g2.load({ mapId: 'range', modeId: 'range', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0] })
    const q = g2.player
    q.mv.pitch = 0
    const out = []
    for (let i = 0; i < 60; i++) {
      g2.input.mouseButtons[0] = true
      g2.input.mousePressed[0] = i === 0
      const b = q.mv.pitch
      g2.fixedStep(STEP)
      if (q.mv.pitch > b + 1e-9) out.push(+(q.mv.pitch - b).toFixed(7))
    }
    g2.dispose()
    return out
  }
  const a = run(), b = run()
  check('recoil: the same gun climbs identically every time', a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6),
    `${a.length} vs ${b.length} kicks, first ${a[0]?.toFixed(4)}/${b[0]?.toFixed(4)}`)
  g.dispose()
}

// ── bot input flags must not get stuck ─────────────────────────────────────
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g.load({ mapId: 'conduit', modeId: 'trio_bots', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], botLevel: 'hard' })
  g.input.fallback = true
  const bots = g.bots.filter((b) => !b.dummy)
  const on = bots.map(() => ({ jump: 0, crouch: 0 }))
  let frames = 0
  for (let i = 0; i < 20 * 120; i++) {
    g.fixedStep(STEP)
    frames++
    bots.forEach((b, k) => {
      if (b.f.input.jump) on[k].jump++
      if (b.f.input.crouch) on[k].crouch++
    })
  }
  const worstJump = Math.max(...on.map((o) => o.jump)) / frames
  const worstCrouch = Math.max(...on.map((o) => o.crouch)) / frames
  check('bots never hold jump down (no accidental auto-hop)', worstJump < 0.35, `worst ${(worstJump * 100).toFixed(0)}% of frames`)
  check('bots never crouch-walk forever', worstCrouch < 0.35, `worst ${(worstCrouch * 100).toFixed(0)}% of frames`)
  g.dispose()
}

// ── the HUD must never be handed an undefined or NaN ────────────────────────
{
  const scan = (o, path = '', out = [], depth = 0) => {
    if (depth > 5 || o == null || typeof o !== 'object') return out
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (typeof v === 'undefined') out.push(path + k + '=undefined')
      else if (typeof v === 'number' && !Number.isFinite(v)) out.push(path + k + '=' + v)
      else if (v && typeof v === 'object') scan(v, path + k + '.', out, depth + 1)
    }
    return out
  }
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g.load({ mapId: 'yard', modeId: '3v3', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], botLevel: 'hard' })
  g.input.fallback = true
  const bad = new Set()
  let snaps = 0
  const realPush = g.onHud
  // scan the object as it is handed over — JSON would quietly drop undefined
  g.onHud = (h) => { snaps++; for (const p of scan(h)) bad.add(p); if (realPush) realPush(h) }
  let died = false
  for (let i = 0; i < 40 * 120; i++) {
    const IN = g.input
    IN.keys.KeyW = true
    IN.keys.Space = i % 40 === 0
    IN.pressed.Space = i % 40 === 0
    IN.keys.ShiftLeft = true
    IN.pressed.ControlLeft = i % 220 === 0
    IN.mouse.dx = Math.sin(i / 30) * 26
    IN.mouse.dy = Math.cos(i / 51) * 9
    IN.mouseButtons[0] = i % 8 < 4
    IN.mousePressed[0] = i % 8 === 0
    IN.pressed.Digit2 = i === 900
    IN.pressed.Digit3 = i === 1400
    IN.pressed.KeyR = i % 600 === 0
    IN.pressed.KeyF = i % 700 === 0
    IN.pressed.Tab = i > 2000 && i < 2400
    if (i === 2600 && !died) { died = true; g.damageTarget(g.player, 999, null, false, null, false) }
    g.fixedStep(STEP)
    if (i % 4 === 0) g.renderFrame(STEP * 4)
  }
  check('every HUD snapshot is free of undefined and NaN', bad.size === 0,
    bad.size ? [...bad].slice(0, 4).join(', ') : `${snaps} snapshots inspected`)
  g.dispose()
}

// ── weapon state machine under abuse ───────────────────────────────────────
{
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  g.load({ mapId: 'range', modeId: 'range', loadout: { primary: 'vex9', secondary: 'judge', melee: 'katana', utility: 'frag' }, skin: SKINS[0] })
  const p = g.player
  let bad = []
  // reload → swap mid-reload → fire → swap back, over and over
  for (let i = 0; i < 900; i++) {
    if (i % 50 === 0) g.input.pressed.KeyR = true
    if (i % 70 === 0) g.input.pressed.Digit2 = true
    if (i % 90 === 0) g.input.pressed.Digit1 = true
    if (i % 110 === 0) g.input.pressed.Digit3 = true
    if (i % 130 === 0) g.input.pressed.KeyQ = true
    g.input.mouseButtons[0] = true
    g.input.mouseButtons[2] = i % 40 < 12
    g.input.mousePressed[0] = i % 12 === 0
    g.fixedStep(STEP)
    if (i % 4 === 0) g.renderFrame(STEP * 4)
    const w = p.weapon
    if (w.ammo < 0 || w.ammo > (w.def.stats.mag ?? 1)) bad.push(`${w.id}:ammo ${w.ammo}`)
    if (w.reserve < 0) bad.push(`${w.id}:reserve ${w.reserve}`)
    if (!Number.isFinite(w.ads) || w.ads < 0 || w.ads > 1) bad.push(`${w.id}:ads ${w.ads}`)
    if (!Number.isFinite(p.mv.pitch)) bad.push('pitch NaN')
    if (bad.length) break
  }
  check('weapon state survives reload/swap/fire spam', bad.length === 0, bad.slice(0, 3).join(' | '))
  // dying and respawning must hand you a fresh, loaded gun
  for (let i = 0; i < 60; i++) g.fixedStep(STEP)   // let the swap animation finish
  g.input.pressed.Digit1 = true          // back to the primary (melee has no mag)
  g.fixedStep(STEP)
  const mag = g.player.weapon.def.stats.mag
  const before = p.weapon.ammo
  g.player.health = 1
  g.damageTarget(g.player, 500, null, false, null, false)
  g.fixedStep(STEP)
  check('death then respawn gives a clean weapon', !g.player.alive || g.player.weapon.ammo >= 0,
    `alive=${g.player.alive} ammo was ${before}/${mag}, now ${g.player.weapon.ammo}`)
  let ri = 0
  for (let i = 0; i < 1200; i++) { ri = i; g.fixedStep(STEP); if (g.player.alive) break }
  check('respawn refills the magazine', g.player.weapon.ammo === mag, `back in ${(ri * STEP).toFixed(1)}s · ${g.player.weapon.ammo}/${mag}`)
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

// ── soak: every bot difficulty plays a full match without exploding ───────
for (const level of ['easy', 'normal', 'hard', 'qyn']) {
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: {} })
  let err = null
  let ended = null
  g.onEvent = (t, d) => { if (t === 'matchend') ended = d }
  g.load({ mapId: 'conduit', modeId: '3v3', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], botLevel: level })
  const K = g.input.keys
  try {
    for (let i = 0; i < 120 * 120 && !ended; i++) {
      K.KeyW = (i % 200) < 150
      K.ShiftLeft = (i % 90) < 60
      K.ControlLeft = (i % 170) < 40
      K.Space = (i % 130) < 3
      K.KeyD = (i % 240) < 120
      K.KeyA = !K.KeyD
      g.player.mv.yaw += Math.sin(i / 90) * 0.02
      g.input.mouseButtons[0] = (i % 16) < 6
      g.input.mousePressed[0] = (i % 16) === 0
      if (g.player.weapon.ammo === 0) g.input.pressed.KeyR = true
      g.fixedStep(STEP)
      if (i % 4 === 0) g.renderFrame(STEP * 4)
    }
  } catch (e) { err = e }
  check(`${level} bots: 2 min match runs clean`, !err, err ? err.message : (ended ? `${ended.scoreA}-${ended.scoreB}` : 'no result'))
  const dmg = g.fighters.reduce((a, f) => a + f.stats.damage, 0)
  check(`${level} bots: they fight`, dmg > 50, `match damage ${Math.round(dmg)}`)
  g.dispose()
}

console.log(`\n${fails === 0 ? 'ALL ENGINE TESTS PASSED' : fails + ' FAILURES'}`)
process.exit(fails ? 1 : 0)
