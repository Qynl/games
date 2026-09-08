import * as THREE from 'three'
import { PhysicsWorld, Brush } from '../src/game/core/Physics.js'
import { MovementController, TUNE, CHAINS } from '../src/game/core/Movement.js'

const DT = 1 / 120

function makeWorld () {
  const w = new PhysicsWorld(8)
  // big flat ground, top surface at y = 0
  w.add(new Brush({ center: [0, -1, 0], half: [80, 1, 80], color: 0x8899aa, tag: 'ground' }))
  // downhill ramp: from y=6 down to y=0 going +X
  w.add(new Brush({ center: [30, 1.4, 0], half: [9, 0.35, 6], rot: [0, 0, -0.36], tag: 'ramp' }))
  // raised platform with an edge (coyote + jump buffer tests)
  w.add(new Brush({ center: [-30, 2, 0], half: [8, 0.4, 8], tag: 'plat' }))
  // stairs (off to the side so they never interfere with straight-line runs)
  for (let i = 0; i < 14; i++) w.add(new Brush({ center: [45, 0.1 + i * 0.1, -20 - i * 0.45], half: [3, 0.1 + i * 0.1, 0.225], tag: 'stair' }))
  w.build()
  return w
}

function mkInput () {
  return { forward: 0, right: 0, jump: false, crouch: false, slide: false, sprint: false,
    jumpPressed: false, crouchPressed: false, slidePressed: false, dashPressed: false, mouseDx: 0 }
}

class Sim {
  constructor (pos = [0, 0.05, 0], yaw = 0) {
    this.w = makeWorld()
    this.m = new MovementController(this.w)
    this.m.reset(new THREE.Vector3(...pos), yaw)
    this.input = mkInput()
    this.m.grounded = true
    this.log = []
  }
  set (o) { Object.assign(this.input, o); return this }
  step (n = 1) {
    for (let i = 0; i < n; i++) {
      this.m.step(DT, this.input)
      this.input.jumpPressed = false
      this.input.crouchPressed = false
      this.input.slidePressed = false
      this.input.dashPressed = false
    }
    return this
  }
  press (k) { this.input[k] = true; this.input[k + 'Pressed'] = true; return this.step(1) }
  hold (k, v = true) { this.input[k] = v; return this }
  release (k) { this.input[k] = false; return this }
  hs () { return this.m.horizontalSpeed }
  run (seconds, fn) {
    const n = Math.round(seconds / DT)
    for (let i = 0; i < n; i++) { if (fn) fn(i * DT, this); this.step(1) }
    return this
  }
  settle () { return this.step(30) }
}

const results = []
const check = (name, cond, info) => { results.push({ name, ok: !!cond, info }); }

// ── sanity: acceleration is smooth, not snapping ────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1); s.hold('sprint', true)
  const samples = []
  s.run(0.4, (t, sim) => { if (Math.round(t / DT) % 12 === 0) samples.push(sim.hs()) })
  const walkTop = (() => { const a = new Sim(); a.hold('forward', 1); a.settle(); a.run(2); return a.hs() })()
  const sprintTop = (() => { const a = new Sim(); a.hold('forward', 1); a.hold('sprint', true); a.settle(); a.run(2); return a.hs() })()
  const monotone = samples.every((v, i) => i === 0 || v >= samples[i - 1] - 1e-6)
  check('walk reaches ~' + TUNE.walkSpeed, Math.abs(walkTop - TUNE.walkSpeed) < 0.25, walkTop.toFixed(2))
  check('sprint reaches ~' + TUNE.sprintSpeed, Math.abs(sprintTop - TUNE.sprintSpeed) < 0.3, sprintTop.toFixed(2))
  check('sprint accelerates smoothly (no snap)', monotone && samples[1] > 0.5 && samples[1] < 9.5 && samples[3] < 10.3, samples.map(v => v.toFixed(1)).join(' '))
  check('sprint is noticeably faster than walk', sprintTop / walkTop > 1.5, (sprintTop / walkTop).toFixed(2) + 'x')
}

// ── 1. SPRINT → SLIDE ──────────────────────────────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1).hold('sprint', true).step(150)
  const before = s.hs()
  s.press('crouch')
  const after = s.hs()
  check('1 SPRINT → SLIDE: slide starts & keeps momentum', s.m.sliding && after > before, `${before.toFixed(2)} → ${after.toFixed(2)}`)
  s.run(0.6)
  check('1 slide keeps high speed after 0.6s', s.hs() > TUNE.sprintSpeed * 0.75, s.hs().toFixed(2))
  s.run(3)
  check('1 slide ends naturally when slow', !s.m.sliding, 'speed ' + s.hs().toFixed(2))
}

// ── 2. SPRINT → SLIDE → JUMP ───────────────────────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1).hold('sprint', true).step(150)
  s.press('crouch').step(18)
  const preJump = s.hs()
  s.press('jump')
  const postJump = s.hs()
  check('2 SLIDE → JUMP preserves horizontal momentum', !s.m.sliding && postJump >= preJump - 0.01 && s.m.vel.y > 7, `${preJump.toFixed(2)} → ${postJump.toFixed(2)}  vy=${s.m.vel.y.toFixed(2)}`)
  check('2 slide jump gives a speed bonus', postJump > preJump, '+' + (postJump - preJump).toFixed(3))
}

// ── 3. SPRINT → JUMP → AIR STRAFE ──────────────────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1).hold('sprint', true).step(150)
  const ground = s.hs()
  s.press('jump')
  const air = s.hs()
  let peak = air
  s.run(1.0, () => {
    s.input.mouseDx = 4
    s.input.right = 1
    s.input.forward = 0
    optimalTurn(s)
    peak = Math.max(peak, s.hs())
  })
  check('3 jump does not reset momentum', air >= ground - 0.01, `${ground.toFixed(2)} → ${air.toFixed(2)}`)
  check('3 AIR STRAFE gains speed', peak > air + 0.8, `${air.toFixed(2)} → peak ${peak.toFixed(2)}`)
}

// ── 4. SPRINT → SLIDE → JUMP → AIR STRAFE → LAND → SLIDE ───────────────────
{
  const s = new Sim()
  s.hold('forward', 1).hold('sprint', true).step(150)
  s.press('crouch').step(16)
  const slideSpeed = s.hs()
  s.press('jump')
  const jumpSpeed = s.hs()
  let peak = jumpSpeed
  let landed = false
  let slideAfterLand = false
  s.run(2.5, () => {
    if (!s.m.grounded) { s.input.mouseDx = 4; s.input.right = 1; s.input.forward = 0; optimalTurn(s); peak = Math.max(peak, s.hs()) }
    else if (jumpSpeed > 0 && !landed) {
      landed = true
      if (s.m.sliding) slideAfterLand = true
    }
  })
  check('4 full chain: momentum never drops', jumpSpeed >= slideSpeed - 0.01 && peak > slideSpeed, `slide ${slideSpeed.toFixed(2)} → jump ${jumpSpeed.toFixed(2)} → peak ${peak.toFixed(2)}`)
  check('4 LAND → SLIDE resumes instantly', slideAfterLand, 'sliding on land: ' + slideAfterLand)
  check('4 chain tracker fired', s.m.tracker.done[4] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
}

// ── 5. DOWNHILL SPRINT → SLIDE ─────────────────────────────────────────────
{
  const s = new Sim([21.5, 6.2, 0], -Math.PI / 2)   // top of the ramp, facing +X
  s.hold('forward', 1).hold('sprint', true).step(30)
  s.run(1.2)
  const beforeSlide = s.hs()
  s.press('crouch')
  let peak = s.hs()
  s.run(1.5, () => { if (s.m.sliding) peak = Math.max(peak, s.hs()) })
  check('5 DOWNHILL SPRINT → SLIDE gains speed', peak > beforeSlide + 0.2, `${beforeSlide.toFixed(2)} → ${peak.toFixed(2)} (slope ${s.m.groundNormal.y.toFixed(3)})`)
  check('5 chain tracker fired', s.m.tracker.done[5] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
}

// ── 6. HIGH-SPEED SLIDE → JUMP ─────────────────────────────────────────────
{
  const s = new Sim([21.5, 6.2, 0], -Math.PI / 2)
  s.hold('forward', 1).hold('sprint', true).run(1.1)
  s.press('crouch').step(20)
  const pre = s.hs()
  s.press('jump')
  check('6 HIGH-SPEED SLIDE → JUMP keeps it', pre > 8.5 && s.hs() >= pre - 0.01, `slide ${pre.toFixed(2)} → air ${s.hs().toFixed(2)}`)
  check('6 chain tracker fired', s.m.tracker.done[6] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
}

// ── 7. STRAFE → JUMP → AIR STRAFE → LAND ───────────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1).hold('sprint', true).step(120)
  s.input.forward = 0
  s.hold('right', 1).step(40)
  const pre = s.hs()
  s.press('jump')
  let peak = s.hs()
  s.run(1.4, () => { if (!s.m.grounded) { s.input.mouseDx = 4; optimalTurn(s); peak = Math.max(peak, s.hs()) } })
  s.run(1.0)
  check('7 STRAFE → JUMP → AIR STRAFE → LAND', s.m.grounded && peak > pre, `${pre.toFixed(2)} → ${peak.toFixed(2)}`)
  check('7 chain tracker fired', s.m.tracker.done[7] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
}

// ── 8. JUMP BUFFER ─────────────────────────────────────────────────────────
{
  const s = new Sim([-24, 2.5, 0])   // right at the edge of the platform
  s.hold('forward', 1).step(1)
  let guard = 0
  while (s.m.grounded && guard++ < 600) s.step(1)
  check('8 (setup) walked off the ledge', !s.m.grounded && guard < 600, 'frames ' + guard)
  let buffered = false
  let jumpedAfterLanding = false
  let framesAfterLanding = 99
  for (let i = 0; i < 600 && !jumpedAfterLanding; i++) {
    if (!s.m.grounded) {
      const t = timeToLand(s)
      if (t < 0.09 && t > 0 && !buffered) { s.press('jump'); buffered = true }
      else s.step(1)
    } else {
      if (framesAfterLanding > 50) framesAfterLanding = 0
      framesAfterLanding++
      s.step(1)
      if (s.m.vel.y > 5) jumpedAfterLanding = true
    }
  }
  check('8 JUMP BUFFER fires right after landing',
    buffered && jumpedAfterLanding && framesAfterLanding <= 4,
    `vy ${s.m.vel.y.toFixed(2)} after ${framesAfterLanding} frames`)
  check('8 chain tracker fired', s.m.tracker.done[8] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
}

// rotate the view so the strafe axis stays perpendicular to velocity:
// what a skilled player does with the mouse while air strafing.
function optimalTurn (s) {
  const v = s.m.vel
  const phi = Math.atan2(v.z, v.x)
  s.m.yaw = -(phi - Math.PI / 2)
}

function timeToLand (s) {
  // crude ballistic estimate
  const g = TUNE.gravity, vy = s.m.vel.y, y = s.m.pos.y
  const disc = vy * vy + 2 * g * y
  if (disc < 0) return 999
  return (vy + Math.sqrt(disc)) / g
}

// ── 9. COYOTE TIME ─────────────────────────────────────────────────────────
{
  const s = new Sim([-30, 2.5, 0])
  s.hold('forward', 1).hold('sprint', true).step(240)
  while (s.m.grounded) s.step(1)
  s.step(4)   // ~0.033s after leaving the ledge
  const wasAir = !s.m.grounded
  s.press('jump')
  check('9 COYOTE TIME jump works just after the ledge', wasAir && s.m.vel.y > 5, `vy ${s.m.vel.y.toFixed(2)}`)
  check('9 chain tracker fired', s.m.tracker.done[9] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
}

// ── stairs / steps ─────────────────────────────────────────────────────────
{
  const s = new Sim([45, 0.05, -16], 0)  // facing -Z toward the stairs
  s.hold('forward', 1).hold('sprint', true).step(60)
  const before = s.hs()
  let minSpeed = 99
  let maxY = 0
  s.run(1.6, () => { if (s.m.grounded) minSpeed = Math.min(minSpeed, s.hs()); maxY = Math.max(maxY, s.m.pos.y) })
  check('stairs do not eat momentum', minSpeed > before * 0.85, `min ${minSpeed.toFixed(2)} of ${before.toFixed(2)}`)
  check('stairs are climbable', maxY > 2.4, 'peak y=' + maxY.toFixed(2))
}

// ── walls ──────────────────────────────────────────────────────────────────
{
  const w = makeWorld()
  w.add(new Brush({ center: [10, 3, 0], half: [0.5, 3, 10], tag: 'wall' }))
  w.build()
  const m = new MovementController(w)
  m.reset(new THREE.Vector3(0, 0.05, 0), -Math.PI / 2)
  m.grounded = true
  const inp = { forward: 1, right: 0, jump: false, crouch: false, sprint: true, jumpPressed: false, crouchPressed: false, mouseDx: 0 }
  for (let i = 0; i < 400; i++) { m.step(DT, inp); inp.jumpPressed = false; inp.crouchPressed = false }
  check('walls stop the player', m.pos.x < 9.7, 'x=' + m.pos.x.toFixed(2))
  check('no jitter against walls', Math.abs(m.vel.x) < 0.2, 'vx=' + m.vel.x.toFixed(3))
}

// ── no infinite speed exploit ──────────────────────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1).hold('sprint', true)
  let peak = 0
  s.run(20, () => {
    peak = Math.max(peak, s.hs())
    if (!s.m.grounded) { s.m.yaw += 0.05; s.input.mouseDx = 8; s.input.right = 1; s.input.forward = 0 }
    if (s.m.grounded) { s.input.right = 0; s.input.forward = 1; if (s.m.sliding) s.press('jump') }
    if (s.m.grounded && !s.m.sliding && Math.random() < 0.004) s.press('crouch')
  })
  check('speed stays bounded under spam', peak < 26, 'peak ' + peak.toFixed(2))
}

// ── 10. WALL RUN ───────────────────────────────────────────────────────────
{
  // sprint along a wall, jump into it, run it, kick off it
  const s = new Sim([5.3, 0.05, 14], 0)      // yaw 0 → forward is -Z, right is +X
  s.w.add(new Brush({ center: [6.4, 3, 0], half: [0.4, 3, 30], tag: 'wall' }))
  s.w.build()
  s.hold('forward', 1).hold('right', 0.45).hold('sprint', true)
  s.run(1.6)                                  // build sprint speed along the wall
  const before = s.hs()
  s.release('sprint'); s.step(2); s.hold('sprint', true); s.step(2)   // re-sprint: the chain window is 1.5s
  s.press('jump')
  let seen = false, onWall = 0, peak = 0
  for (let i = 0; i < 96; i++) {
    s.step(1)
    if (s.m.wallRunning) { seen = true; onWall++; peak = Math.max(peak, s.hs()) }
  }
  check('10 WALL RUN: attaches to a wall at speed', seen, `ran ${onWall} steps, peak ${peak.toFixed(2)} m/s`)
  check('10 WALL RUN: keeps the momentum it arrived with', peak >= before - 0.8, `${before.toFixed(2)} → ${peak.toFixed(2)}`)
  check('10 WALL RUN: hangs instead of dropping', s.m.vel.y > -TUNE.wallRunMaxFall - 0.6, `vy ${s.m.vel.y.toFixed(2)}`)
  const vyBefore = s.m.vel.y
  s.press('jump')
  check('10 WALL JUMP: kicks up and off the wall', s.m.vel.y > 6.5 && s.m.vel.x < -2.5,
    `vy ${s.m.vel.y.toFixed(2)} vx ${s.m.vel.x.toFixed(2)}`)
  check('10 chain tracker fired', s.m.tracker.done[10], JSON.stringify(s.m.tracker.order))
  // the run is time limited — you cannot circle a room forever
  const s2 = new Sim([5.3, 0.05, 14], 0)
  s2.w.add(new Brush({ center: [6.4, 3, 0], half: [0.4, 3, 30], tag: 'wall' }))
  s2.w.build()
  s2.hold('forward', 1).hold('right', 0.45).hold('sprint', true)
  s2.run(1.6); s2.press('jump')
  let steps = 0
  for (let i = 0; i < 400; i++) { s2.step(1); if (s2.m.wallRunning) steps++; if (s2.m.grounded) break }
  check('10 WALL RUN: ends on its own (no infinite wall cling)', !s2.m.wallRunning && steps > 20 && steps < 220, `${steps} steps on the wall`)
}

// ── 12. LEDGE GRAB / MANTLE ────────────────────────────────────────────────
{
  // a 2.6 m crate: far above your own jump apex (1.37 m). You meet the wall on
  // the way down with the lip ~1.3 m over your feet — that is the ledge grab.
  const s = new Sim([0, 0.05, 0], 0)          // forward is -Z
  s.w.add(new Brush({ center: [0, 1.3, -8.5], half: [6, 1.3, 2], tag: 'ledge' }))   // top at y = 2.6
  s.w.build()
  s.hold('forward', 1).hold('sprint', true)
  s.run(0.35)
  let mantled = false, after = 0
  for (let i = 0; i < 300; i++) {
    if (!mantled && s.m.grounded && s.m.pos.z < -2.9 && s.m.pos.z > -3.4) s.press('jump')
    s.step(1)
    if (s.m.events.some((e) => e.type === 'mantle')) mantled = true
    if (mantled && ++after > 90) break
  }
  check('12 MANTLE: a lip the jump cannot clear is grabbed', mantled,
    `ended at y=${s.m.pos.y.toFixed(2)} z=${s.m.pos.z.toFixed(2)}`)
  check('12 MANTLE: you end up standing on it', s.m.grounded && s.m.pos.y > 2.4, `y=${s.m.pos.y.toFixed(2)} grounded=${s.m.grounded}`)
  check('12 MANTLE: keeps forward speed', s.hs() > 4, `${s.hs().toFixed(2)} m/s`)
  // a 3 m wall is NOT climbable by mantling — you have to earn that height
  const s2 = new Sim([0, 0.05, 0], 0)
  s2.w.add(new Brush({ center: [0, 1.5, -8.5], half: [6, 1.5, 2], tag: 'wall' }))
  s2.w.build()
  s2.hold('forward', 1).hold('sprint', true)
  let mantled2 = false
  s2.run(4, () => {
    if (s2.m.grounded && s2.m.pos.z < -4.5 && s2.m.pos.z > -5.2) s2.press('jump')
    if (s2.m.events.some((e) => e.type === 'mantle')) mantled2 = true
  })
  check('12 MANTLE: does not scale tall walls', !mantled2 && s2.m.pos.y < 1.0, `y=${s2.m.pos.y.toFixed(2)}`)
}

// ── 14. THE DIVE: SHIFT with no floor under you ────────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1); s.hold('sprint', true)
  s.run(1.8)
  const before = s.hs()
  s.press('jump')
  s.step(20)
  const vy0 = s.m.vel.y
  s.input.slidePressed = true
  s.step(1)
  check('14 DIVE: SHIFT in the air starts a dive', s.m.diving === true, `diving=${s.m.diving}`)
  check('14 DIVE: it throws you down, hard', s.m.vel.y < vy0 - 8, `${vy0.toFixed(1)} → ${s.m.vel.y.toFixed(1)} m/s`)
  check('14 DIVE: and forward faster than you went in', s.hs() > before * 1.05, `${before.toFixed(2)} → ${s.hs().toFixed(2)} m/s`)
  check('14 DIVE: you go small (harder to hit)', s.m.targetHeight <= 1.0, `height target ${s.m.targetHeight}`)

  // one per jump: a second press must not kick again
  const vy1 = s.m.vel.y
  s.input.slidePressed = true
  s.step(1)
  check('14 DIVE: only one dive per jump', s.m.vel.y >= vy1 - 0.6, `${vy1.toFixed(1)} → ${s.m.vel.y.toFixed(1)}`)

  // and it pays the fall back as forward speed
  let landed = null
  s.hold('slide', true)
  s.run(2.5, () => { if (!landed && s.m.events.some((e) => e.type === 'diveLand')) landed = s.hs() })
  check('14 DIVE: landing pays the fall back as speed', landed !== null && landed > before,
    `in ${before.toFixed(2)} → out ${landed === null ? 'never landed' : landed.toFixed(2)} m/s`)

  // steering: you can aim a dive, not just fall in it
  const s2 = new Sim()
  s2.hold('forward', 1); s2.hold('sprint', true); s2.run(1.8)
  s2.press('jump'); s2.step(16)
  s2.input.slidePressed = true; s2.step(1)
  const yaw0 = s2.m.vel.x
  s2.hold('right', 1); s2.input.mouseDx = 14
  s2.step(30)
  check('14 DIVE: you can steer it (it is not a cutscene)', Math.abs(s2.m.vel.x - yaw0) > 1.5,
    `vx ${yaw0.toFixed(2)} → ${s2.m.vel.x.toFixed(2)}`)
}

// ── 15. DIVE → LAND → SLIDE (hold the key through the landing) ─────────────
{
  const s = new Sim()
  s.hold('forward', 1); s.hold('sprint', true); s.run(1.8)
  s.press('jump'); s.step(18)
  s.hold('slide', true); s.input.slidePressed = true; s.step(1)
  s.run(2.2, () => { s.input.mouseDx = 0 })
  check('15 DIVE → LAND → SLIDE chains', s.m.tracker.done[15] === true, JSON.stringify(Object.keys(s.m.tracker.done)))
  check('15 the slide is real (not just a crouch)', s.hs() > 4, `${s.hs().toFixed(2)} m/s`)
}

// ── 16. THE DASH (Q) ───────────────────────────────────────────────────────
{
  const from = (speedTarget) => {
    const s = new Sim()
    s.hold('forward', 1); s.hold('sprint', true); s.run(speedTarget ? 2.2 : 0)
    return s
  }
  // a standing dash is worth at least the floor
  const still = from(false)
  still.m.dash(-0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  check('16 DASH: from a standstill it still gets you going', still.hs() >= TUNE.dashFloor - 0.1,
    `${still.hs().toFixed(2)} m/s (floor ${TUNE.dashFloor})`)

  // a moving dash ADDS to what you have — this is the whole point
  const moving = from(true)
  const pre = moving.hs()
  moving.m.dash(0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  check('16 DASH: it adds to the speed you already earned', moving.hs() > pre + TUNE.dashImpulse - 0.2,
    `${pre.toFixed(2)} → ${moving.hs().toFixed(2)} m/s`)

  // and friction does not eat it immediately
  const kept = (() => { moving.step(Math.round(0.16 / DT)); return moving.hs() })()
  check('16 DASH: the burst survives friction for a beat', kept > pre + TUNE.dashImpulse * 0.6,
    `${kept.toFixed(2)} m/s after 0.16 s`)

  // chaining: dash, keep running, dash again
  const s3 = from(true)
  s3.m.dash(0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  const one = s3.hs()
  s3.m.dashWindow = 0
  s3.m.dash(0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  check('16 DASH: two dashes stack (and stay inside the cap)', s3.hs() > one && s3.hs() <= TUNE.dashMax + 0.01,
    `${one.toFixed(2)} → ${s3.hs().toFixed(2)} (cap ${TUNE.dashMax})`)

  // direction: mostly yours, but not entirely — momentum still argues
  const s4 = from(true)
  s4.m.dash(1, 0, TUNE.dashImpulse, TUNE.dashFloor)     // dash hard right while running forward (-Z)
  check('16 DASH: your keys steer most of it', Math.abs(s4.m.vel.x) > s4.hs() * 0.4,
    `vx ${s4.m.vel.x.toFixed(2)} of ${s4.hs().toFixed(2)}`)
  check('16 DASH: but not all of it — the old heading survives', s4.m.vel.z < -2,
    `vz ${s4.m.vel.z.toFixed(2)}`)

  // the burst is a burst: no Quake ground-strafing your way to 50 m/s
  const s6 = from(true)
  s6.m.dash(0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  const burst = s6.hs()
  let peak = burst
  s6.run(0.5, (t, sim) => { sim.input.right = 1; sim.input.mouseDx = 22; peak = Math.max(peak, sim.hs()) })
  check('16 DASH: the burst cannot be multiplied by steering', peak <= burst + 0.6,
    `${burst.toFixed(2)} → peak ${peak.toFixed(2)} m/s`)

  // in the air a dash keeps your fall — it is a redirect, not a lift
  const s5 = new Sim()
  s5.hold('forward', 1); s5.hold('sprint', true); s5.run(1.6)
  s5.press('jump'); s5.step(10)
  const vy = s5.m.vel.y
  s5.m.dash(0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  check('16 DASH: in the air it redirects without lifting you', s5.m.vel.y <= vy + 0.001 && s5.hs() > 12,
    `vy ${vy.toFixed(2)} → ${s5.m.vel.y.toFixed(2)}, hs ${s5.hs().toFixed(2)}`)
}


// ── 17. THE WHOLE CHAIN, with the new tools in it ──────────────────────────
{
  const s = new Sim()
  s.hold('forward', 1); s.hold('sprint', true)
  s.run(2.2)
  const vSprint = s.hs()

  s.press('crouch'); s.hold('crouch', true)
  s.step(26)
  const vSlide = s.hs()

  s.release('crouch')
  s.press('jump'); s.hold('jump', true)
  s.step(30)
  s.release('jump')
  const vJump = s.hs()

  s.input.slidePressed = true
  s.step(1)
  const vDive = s.hs()

  s.m.dash(0, -1, TUNE.dashImpulse, TUNE.dashFloor)
  const vDash = s.hs()

  s.hold('slide', true)
  let vLand = 0
  s.run(2.4, () => { if (s.m.grounded && !vLand) vLand = s.hs() })

  const steps = [['sprint', vSprint], ['slide', vSlide], ['jump', vJump], ['dive', vDive], ['dash', vDash], ['land', vLand]]
  const line = steps.map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' → ')
  check('17 FULL CHAIN: no link throws speed away',
    vSlide > vSprint && vJump >= vSlide - 0.2 && vDive > vJump && vDash > vDive, line)
  check('17 FULL CHAIN: you arrive at real speed', vLand > 13, `landed at ${vLand.toFixed(2)} m/s`)
  // the dive ceiling caps the landing; the slide that follows adds its own boost
  check('17 FULL CHAIN: it is earned, not free', vLand <= TUNE.diveLandCeil + TUNE.slideBoost + 0.01,
    `${vLand.toFixed(2)} m/s (dive ceiling ${TUNE.diveLandCeil} + slide ${TUNE.slideBoost})`)
}


let pass = 0
for (const r of results) {
  console.log(`${r.ok ? ' PASS' : '*FAIL'}  ${r.name}   ${r.info === undefined ? '' : '[' + r.info + ']'}`)
  if (r.ok) pass++
}
console.log(`\n${pass}/${results.length} checks passed`)
process.exit(pass === results.length ? 0 : 1)
