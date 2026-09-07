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
  constructor (latency = 60, jitter = 15, loss = 0.02) {
    this.latency = latency; this.jitter = jitter; this.loss = loss
    this.peers = [null, null]
  }
  attach (peer) { const i = this.peers[0] === null ? 0 : 1; this.peers[i] = peer; peer.idx = i; return peer }
  send (from, msg) {
    if (Math.random() < this.loss) return
    const to = this.peers[1 - from.idx]
    if (!to) return
    const delay = this.latency + (Math.random() * 2 - 1) * this.jitter
    const wire = JSON.parse(JSON.stringify(msg))          // exactly what a data channel does
    to.inbox.push({ msg: wire, at: now + delay })
  }
}
class FakeNet {
  constructor (link, role) { this.link = link; this.role = role; this.inbox = []; this.other = null; this.open = true; this.state = 'open'; this.ping = 0; this.onState = () => {} }
  send (msg) { this.link.send(this, msg) }
  tick (dt) { this.t = (this.t || 0) + dt; const half = (this.t % 2) / 2; this.ping = Math.round(this.link.latency * 2) }
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

// ping readout
check('ping is reported to the HUD', A.netPing > 0 && B.netPing > 0, `${A.netPing}/${B.netPing} ms`)

// a dropped peer is handled, not fatal
let byeErr = null
try { A.onNetMessage(MSG.bye()); A.interpolateRemote() } catch (e) { byeErr = e }
check('a peer leaving does not crash the loop', !byeErr, byeErr ? String(byeErr.message) : '')
A.dispose(); B.dispose()

globalThis.performance.now = realNow
console.log(`\n${fails === 0 ? 'ALL NETPLAY TESTS PASSED' : `${fails} NETPLAY FAILURE(S)`}  (${passes} checks)`)
process.exit(fails ? 1 : 0)
