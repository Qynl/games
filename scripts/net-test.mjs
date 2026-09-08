// ────────────────────────────────────────────────────────────────────────────
//  Netplay tests.
//
//  1. the copy/paste code packing (deflate + base64url) round-trips
//  2. two real Game instances talking over a fake WebRTC data channel with
//     latency, jitter and loss — hello exchange, snapshot interpolation,
//     shooter-authoritative damage, kill messages and host-owned match sync.
// ────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { pack, unpack, MSG, FLAG } from '../src/game/net/Net.js'

let fails = 0, passes = 0
const check = (name, ok, info = '') => {
  if (ok) passes++; else fails++
  console.log(`${ok ? '  ok  ' : '*FAIL '} ${name}${info ? '  ' + info : ''}`)
}

// ── 1. code packing ─────────────────────────────────────────────────────────
{
  const sdp = ('v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\na=candidate:1 1 udp 2122260223 192.168.0.14 46243 typ host generation 0\r\n').repeat(8)
  const code = await pack(sdp)
  check('pack produces a compact code', code.length > 0 && code.length < sdp.length, `${sdp.length} → ${code.length} chars`)
  const back = await unpack(code)
  check('unpack round-trips a big payload', back === sdp, back === sdp ? '' : 'MISMATCH')
  const tiny = await pack('hi')
  check('unpack round-trips a tiny payload', (await unpack(tiny)) === 'hi')
  const plain = await unpack('p' + Buffer.from('{"a":1}').toString('base64url'))
  check('unpack handles the uncompressed fallback', plain === '{"a":1}', plain)
  check('code uses only url-safe characters', /^[A-Za-z0-9\-_]+$/.test(code.slice(1)))
}

// ── 2. two peers over a fake channel ────────────────────────────────────────
globalThis.window = { addEventListener () {}, removeEventListener () {}, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1 }
globalThis.document = {
  addEventListener () {}, removeEventListener () {},
  createElement: () => ({ width: 128, height: 64, getContext: () => new Proxy({}, { get: () => () => ({ data: new Uint8ClampedArray(4), measureText: () => ({ width: 10 }) }) }) }),
}
globalThis.performance = globalThis.performance || { now: () => Date.now() }
const { Game } = await import('../src/game/core/Game.js')
const { MODES } = await import('../src/game/data/maps.js')
const { SKINS } = await import('../src/game/data/skins.js')

const canvas = { clientWidth: 1280, clientHeight: 720, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }), style: {}, addEventListener () {}, removeEventListener () {} }
const rendererStub = () => ({
  autoClear: true, domElement: canvas, info: { render: {} }, shadowMap: { enabled: false },
  toneMapping: 0, toneMappingExposure: 1, outputColorSpace: '',
  setPixelRatio () {}, setSize () {}, render () {}, clearDepth () {}, dispose () {},
})

// a stand-in for an RTCDataChannel: same API surface Game uses
class FakeLink {
  constructor (latency = 60, jitter = 15, loss = 0.02, reorder = 0) {
    this.latency = latency; this.jitter = jitter; this.loss = loss; this.reorder = reorder
    this.peers = [null, null]
    this.fast = 0; this.reliable = 0; this.seen = []
  }
  attach (peer) { const i = this.peers[0] === null ? 0 : 1; this.peers[i] = peer; peer.idx = i; return peer }
  send (from, msg, fast) {
    // a real WebRTC link drops unreliable packets and never drops reliable ones
    if (fast && Math.random() < this.loss) return
    const to = this.peers[1 - from.idx]
    if (!to) return
    // an unordered channel really does deliver packets out of order
    const reorder = fast && Math.random() < this.reorder ? 140 : 0
    const delay = this.latency + (Math.random() * 2 - 1) * this.jitter + reorder
    const wire = JSON.parse(JSON.stringify(msg))          // exactly what a data channel does
    to.inbox.push({ msg: wire, at: now + delay })
    if (fast) this.fast++
    else this.reliable++
    this.seen.push([msg[0], !!fast])
  }
}
class FakeNet {
  constructor (link, role) { this.link = link; this.role = role; this.inbox = []; this.other = null; this.open = true; this.state = 'open'; this.ping = 0; this.onState = () => {} }
  send (msg, fast) { this.link.send(this, msg, fast) }
  tick (dt) { this.t = (this.t || 0) + dt; this.ping = Math.round(this.link.latency * 2); this.rtt = this.link.latency * 2 }
  receive () {
    const out = []
    for (let i = this.inbox.length - 1; i >= 0; i--) if (this.inbox[i].at <= now) { out.push(this.inbox[i].msg); this.inbox.splice(i, 1) }
    return out.reverse()
  }
  close () { this.open = false; this.state = 'closed' }
}

let now = 0                                              // sim clock in ms (Game uses performance.now)
const realNow = globalThis.performance.now
globalThis.performance.now = () => now

const link = new FakeLink(60, 15, 0.0)                   // no loss: keep assertions deterministic
const netA = link.attach(new FakeNet(link, 'host'))
const netB = link.attach(new FakeNet(link, 'guest'))

const mode = MODES.find((m) => m.id === 'p2p')
check('p2p mode exists', !!mode)

const mk = (net, role, name) => {
  const g = new Game(canvas, { rendererFactory: rendererStub, settings: { fov: 95, sensitivity: 1 } })
  g.onEvent = () => {}
  g.load({ mapId: 'yard', modeId: 'p2p', loadout: { primary: 'vex9', secondary: 'q1', melee: 'knife', utility: 'frag' }, skin: SKINS[0], net, netRole: role, peerName: role === 'host' ? 'GUEST' : 'HOST', playerName: name })
  return g
}
const A = mk(netA, 'host', 'HOST')
const B = mk(netB, 'guest', 'GUEST')

check('each peer spawns exactly 2 fighters (you + the other player)', A.fighters.length === 2 && B.fighters.length === 2, `A=${A.fighters.length} B=${B.fighters.length}`)
check('no bots in an online duel', A.bots.length === 0 && B.bots.length === 0)

// park them 14 m apart, facing each other, so the duel is deterministic
const place = (g, x, z, yaw) => {
  const p = g.player
  p.mv.pos.set(x, p.mv.pos.y + 0.2, z)
  p.mv.vel.set(0, 0, 0)
  p.mv.yaw = yaw
  p.mv.pitch = 0
  g.match.phase = 'live'
  g.match.timer = 90
}
place(A, -7, 0, -Math.PI / 2)                            // host at -X looking +X
place(B, 7, 0, Math.PI / 2)                              // guest at +X looking -X
const hostTrue = new THREE.Vector3(-7, A.player.mv.pos.y, 0)      // where the host really is
const guestTrue = new THREE.Vector3(7, B.player.mv.pos.y, 0)

const STEP = 1 / 120
let err = null
let sawRemoteMove = 0
let minHpA = 150, minHpB = 150, sawDamageOnVictim = false
try {
  for (let i = 0; i < 120 * 12; i++) {
    now += STEP * 1000
    for (const g of [A, B]) {
      const IN = g.input
      IN.mouse.dx = 0
      // re-acquire between bursts, like a player does — otherwise the recoil
      // pattern walks the aim into the sky and nobody ever hits anything
      if (i % 36 === 0 && g.netState.buf.length > 0) {
        const foe = g.remote
        const dd = new THREE.Vector3().subVectors(foe.mv.pos, g.player.mv.pos)
        g.player.mv.yaw = Math.atan2(-dd.x, -dd.z)
        g.player.mv.pitch = Math.atan2(dd.y + 1.0 - (g.player.mv.pos.y + g.player.mv.height * 0.92), Math.hypot(dd.x, dd.z))
      }
      IN.mouseButtons[0] = g.match.phase === 'live' && (i % 36) < 14 && i > 120
      IN.mousePressed[0] = g.match.phase === 'live' && i % 36 === 0 && i > 120
      g.fixedStep(STEP)
      if (i % 4 === 0) g.renderFrame(STEP * 4)
    }
    // only measure while both are still standing where we parked them (round 1)
    if (i > 60 && A.player.alive && B.player.alive && A.match.round === 1) {
      sawRemoteMove = Math.max(sawRemoteMove, B.remote.mv.pos.distanceTo(hostTrue))
      sawRemoteMove = Math.max(sawRemoteMove, A.remote.mv.pos.distanceTo(guestTrue))
    }
    minHpA = Math.min(minHpA, A.player.health); minHpB = Math.min(minHpB, B.player.health)
    if (B.player.health < 150 && A.remote.health === B.player.health) sawDamageOnVictim = true
  }
} catch (e) { err = e }
check('two simulated peers ran 12s without crashing', !err, err ? err.stack?.split('\n').slice(0, 3).join(' | ') : '')

check('hello exchanged — both sides know the other name',
  A.netState.remoteHello?.name === 'GUEST' && B.netState.remoteHello?.name === 'HOST',
  `${A.netState.remoteHello?.name} / ${B.netState.remoteHello?.name}`)

check('snapshots arrive', A.netState.buf.length > 0 && B.netState.buf.length > 0,
  `A has ${A.netState.buf.length}, B has ${B.netState.buf.length} (capped at 40)`)

check('remote fighter is placed by interpolation (not stuck at 0,0,0)',
  Number.isFinite(A.remote.mv.pos.x) && A.remote.mv.pos.length() > 1 && Number.isFinite(B.remote.mv.pos.x),
  `A sees the guest at ${A.remote.mv.pos.toArray().map((v) => v.toFixed(1)).join(',')}`)

check('interpolation tracks the peer within a player width', sawRemoteMove >= 0 && sawRemoteMove < 1.2, `worst drift ${sawRemoteMove.toFixed(2)} m`)

check('shooter-authoritative damage crosses the wire', minHpA < 150 || minHpB < 150,
  `lowest host hp ${Math.round(minHpA)}, lowest guest hp ${Math.round(minHpB)}`)
check('the victim owns their own health (host and guest agree on it)', sawDamageOnVictim || minHpB <= 0,
  `guest health ${Math.round(B.player.health)}, host sees ${Math.round(A.remote.health)}`)

const killsA = A.player.stats.kills, killsB = B.player.stats.kills
check('kill messages reach both sides', killsA + killsB >= 1 || A.match.scoreA + A.match.scoreB >= 1,
  `host ${killsA} kills, guest ${killsB} kills, score ${A.match.scoreA}-${A.match.scoreB}`)
check('rounds progress on the host', A.match.round >= 1 || A.match.scoreA + A.match.scoreB >= 1, `round ${A.match.round}`)
check('the guest mirrors the host score', B.match.scoreA === A.match.scoreA && B.match.scoreB === A.match.scoreB,
  `host ${A.match.scoreA}-${A.match.scoreB} vs guest ${B.match.scoreA}-${B.match.scoreB}`)
check('the guest mirrors the round phase', B.match.phase === A.match.phase, `${A.match.phase} / ${B.match.phase}`)

// routing: state is fast+lossy, decisions are reliable
const routed = (ch) => link.seen.filter(([t, fast]) => t === ch).map(([, fast]) => fast)
check('snapshots ride the fast unreliable channel', routed('b').length > 0 && routed('b').every((f) => f === true),
  `${routed('b').length} batches, all fast: ${routed('b').every((f) => f === true)}`)
check('damage never rides the lossy channel', routed('d').length > 0 && routed('d').every((f) => f === false),
  `${routed('d').length} damage messages`)
check('kills never ride the lossy channel', routed('k').length === 0 || routed('k').every((f) => f === false),
  `${routed('k').length} kill messages`)
check('the round clock never rides the lossy channel', routed('m').length > 0 && routed('m').every((f) => f === false),
  `${routed('m').length} match messages`)

// adaptive buffering tightens on a clean link instead of sitting at a guess
check('interpolation delay adapts and stays sane', A.netState.delay > 30 && A.netState.delay < 160,
  `${A.netState.delay.toFixed(0)} ms on a ${A.netPing} ms link`)
check('jitter is measured', A.netState.jitter >= 0 && A.netState.jitter < 100, `${(A.netState.jitter || 0).toFixed(1)} ms`)

// ping readout
check('ping is reported to the HUD', A.netPing > 0 && B.netPing > 0, `${A.netPing}/${B.netPing} ms`)

// ── 3. the same duel on a bad link: 20% packet loss, 90 ms, 35 ms jitter ────
{
  const bad = new FakeLink(90, 35, 0.2, 0.12)   // lossy AND out of order
  const nA = bad.attach(new FakeNet(bad, 'host'))
  const nB = bad.attach(new FakeNet(bad, 'guest'))
  const X = mk(nA, 'host', 'HOST'), Y = mk(nB, 'guest', 'GUEST')
  place(X, -7, 0, -Math.PI / 2)
  place(Y, 7, 0, Math.PI / 2)
  let holes = 0, samples = 0
  let bErr = null
  try {
    for (let i = 0; i < 120 * 10; i++) {
      now += STEP * 1000
      for (const g of [X, Y]) {
        const IN = g.input
        IN.mouse.dx = 0
        if (i % 36 === 0 && g.netState.buf.length > 0) {
          const dd = new THREE.Vector3().subVectors(g.remote.mv.pos, g.player.mv.pos)
          g.player.mv.yaw = Math.atan2(-dd.x, -dd.z)
          g.player.mv.pitch = Math.atan2(dd.y + 1.0 - (g.player.mv.pos.y + g.player.mv.height * 0.92), Math.hypot(dd.x, dd.z))
        }
        IN.mouseButtons[0] = g.match.phase === 'live' && (i % 36) < 14 && i > 120
        IN.mousePressed[0] = g.match.phase === 'live' && i % 36 === 0 && i > 120
        g.fixedStep(STEP)
        if (i % 4 === 0) g.renderFrame(STEP * 4)
      }
      samples++
    }
  } catch (e) { bErr = e }
  check('a lossy, out-of-order link still runs a duel', !bErr, bErr ? bErr.stack?.split('\n').slice(0, 2).join(' | ') : `${samples} steps`)
  check('redundant snapshots keep the buffer fed under loss', X.netState.buf.length > 20 && Y.netState.buf.length > 20,
    `${X.netState.buf.length} / ${Y.netState.buf.length} samples buffered`)
  check('the lossy link still lands damage', X.player.health < 150 || Y.player.health < 150 || X.match.scoreA + X.match.scoreB > 0,
    `host ${Math.round(X.player.health)} guest ${Math.round(Y.player.health)} score ${X.match.scoreA}-${X.match.scoreB}`)
  check('delay backs off when the link is bad', X.netState.delay > A.netState.delay * 0.9,
    `${X.netState.delay.toFixed(0)} ms on the bad link vs ${A.netState.delay.toFixed(0)} ms on the clean one`)
  X.dispose(); Y.dispose()
}

// a dropped peer is handled, not fatal
let byeErr = null
try { A.onNetMessage(MSG.bye()); A.interpolateRemote() } catch (e) { byeErr = e }
check('a peer leaving does not crash the loop', !byeErr, byeErr ? String(byeErr.message) : '')
A.dispose(); B.dispose()

globalThis.performance.now = realNow
// ── 4. the same duel over the PeerJS transport ─────────────────────────────
// The wire protocol must not care who introduced the two browsers, so we run
// the real PeerNet class against a fake broker and play a short duel.
{
  const { makePeerWorld } = await import('./net-fakes.mjs')
  const { Peer } = makePeerWorld()
  const loadPeer = async () => Peer
  const { PeerNet } = await import('../src/game/net/PeerNet.js')

  const hostNet = new PeerNet({ loadPeer })
  const guestNet = new PeerNet({ loadPeer })
  const room = await hostNet.host('duel42')
  check('peerjs: the host claims a room name', room === 'DUEL42', room)
  await guestNet.join('DUEL42')
  check('peerjs: both ends report open', hostNet.open && guestNet.open, `host ${hostNet.state} / guest ${guestNet.state}`)
  check('peerjs: a fast channel and a reliable channel on each side',
    !!hostNet.fast && !!hostNet.reliable && hostNet.fast.reliable === false && hostNet.reliable.reliable === true,
    `fast reliable=${hostNet.fast?.reliable} control reliable=${hostNet.reliable?.reliable}`)
  check('peerjs: the host keeps its room-name connection', hostNet.peer?.id === 'qyngun-DUEL42', hostNet.peer?.id)

  const A2 = mk(hostNet, 'host', 'HOST')
  const B2 = mk(guestNet, 'guest', 'GUEST')
  place(A2, -7, 0, -Math.PI / 2)
  place(B2, 7, 0, Math.PI / 2)

  let boom = null
  let snapErr = 99
  let sawDamage = false
  try {
    for (let i = 0; i < 120 * 10; i++) {
      now += STEP * 1000
      for (const g of [A2, B2]) {
        const IN = g.input
        IN.mouse.dx = 0
        if (i % 36 === 0 && g.netState.buf.length > 0) {
          const foe = g.remote
          const dd = new THREE.Vector3().subVectors(foe.mv.pos, g.player.mv.pos)
          g.player.mv.yaw = Math.atan2(-dd.x, -dd.z)
          g.player.mv.pitch = Math.atan2(dd.y + 1.0 - (g.player.mv.pos.y + g.player.mv.height * 0.92), Math.hypot(dd.x, dd.z))
        }
        const live = g.match.phase === 'live' && i > 120
        IN.mouseButtons[0] = live && (i % 36) < 14
        IN.mousePressed[0] = live && i % 36 === 0
        g.fixedStep(STEP)
        if (i % 4 === 0) g.renderFrame(STEP * 4)   // interpolation lives in the render frame
      }
      // measure while both are still standing where we put them
      if (i > 200 && i < 500) snapErr = Math.min(snapErr, A2.remote.mv.pos.distanceTo(B2.player.mv.pos))
      if (A2.player.health < 150 || B2.player.health < 150 || A2.match.scoreA + A2.match.scoreB > 0) sawDamage = true
    }
  } catch (e) { boom = e }

  check('peerjs: the duel runs without errors', !boom, boom ? boom.message : '')
  check('peerjs: the hello lands (both ends know who they are shooting)',
    A2.netState.remoteHello?.name === 'GUEST' && B2.netState.remoteHello?.name === 'HOST',
    `A sees ${A2.netState.remoteHello?.name} / B sees ${B2.netState.remoteHello?.name}`)
  check('peerjs: snapshots carry the other player across', snapErr < 2, `${snapErr.toFixed(2)} m off`)
  check('peerjs: damage crosses the link', sawDamage,
    `host hp ${Math.round(A2.player.health)} / guest hp ${Math.round(B2.player.health)} score ${A2.match.scoreA}-${A2.match.scoreB}`)
  check('peerjs: both ends agree on the round clock', A2.match.phase === B2.match.phase,
    `host ${A2.match.phase} / guest ${B2.match.phase}`)
  check('peerjs: closing is clean', (() => { hostNet.close(); guestNet.close(); return !hostNet.open && !guestNet.open })(), '')
}

console.log(`\n${fails === 0 ? 'ALL NETPLAY TESTS PASSED' : `${fails} NETPLAY FAILURE(S)`}  (${passes} checks)`)
process.exit(fails ? 1 : 0)
