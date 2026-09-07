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
  return { forward: 0, right: 0, jump: false, crouch: false, sprint: false, jumpPressed: false, crouchPressed: false, mouseDx: 0 }
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

let pass = 0
for (const r of results) {
  console.log(`${r.ok ? ' PASS' : '*FAIL'}  ${r.name}   ${r.info === undefined ? '' : '[' + r.info + ']'}`)
  if (r.ok) pass++
}
console.log(`\n${pass}/${results.length} checks passed`)
process.exit(pass === results.length ? 0 : 1)
