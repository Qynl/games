// ────────────────────────────────────────────────────────────────────────────
//  Peer-to-peer netplay over WebRTC.
//
//  There is no signalling server, so the handshake is a copy/paste exchange:
//    HOST   → creates an offer  → shows  CODE A
//    GUEST  → pastes CODE A     → creates an answer → shows CODE B
//    HOST   → pastes CODE B     → connected
//
//  Both peers then push 30 Hz snapshots of their own fighter and render the
//  other one with interpolation + a little extrapolation. Damage is
//  shooter-authoritative (you hit what you see), which keeps a 1v1 honest
//  enough without a server and never lies about what was on your screen.
// ────────────────────────────────────────────────────────────────────────────

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }] }

const NAT_HINT = 'Could not reach the other player. WebRTC punches through most home routers, but some networks block it (symmetric NAT, mobile data, strict VPNs). Try the same Wi-Fi, a different network, or turn off a VPN.'

export const NET_OK = typeof window !== 'undefined' && !!window.RTCPeerConnection

// ── code encoding: deflate-raw → base64url, with a plain fallback ──────────
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
function toB64url (bytes) {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2]
    out += B64[a >> 2]
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)]
    if (b === undefined) break
    out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)]
    if (c === undefined) break
    out += B64[c & 63]
  }
  return out
}
function fromB64url (s) {
  const bytes = []
  let buf = 0, bits = 0
  for (const ch of s) {
    const v = B64.indexOf(ch)
    if (v < 0) continue
    buf = (buf << 6) | v
    bits += 6
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 0xff) }
  }
  return new Uint8Array(bytes)
}

export async function pack (text) {
  const raw = new TextEncoder().encode(text)
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw')
      const buf = await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer()
      return 'z' + toB64url(new Uint8Array(buf))
    } catch (e) { /* fall through to plain */ }
  }
  return 'p' + toB64url(raw)
}

export async function unpack (code) {
  const body = code.trim().replace(/^QYN\d\./, '')
  const bytes = fromB64url(body.slice(1))
  if (body[0] === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed codes — ask for a plain one.')
    const ds = new DecompressionStream('deflate-raw')
    const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer()
    return new TextDecoder().decode(buf)
  }
  return new TextDecoder().decode(bytes)
}

// ── the connection ─────────────────────────────────────────────────────────
export class Net {
  constructor () {
    this.role = null          // 'host' | 'guest'
    this.pc = null
    this.chan = null
    this.state = 'idle'       // idle | offering | answering | connecting | open | closed | error
    this.inbox = []
    this.onState = () => {}
    this.ping = 0
    this._pingT = 0
    this._lastRecv = 0
    this._deadline = 0
    this.error = null
  }

  get open () { return this.state === 'open' && this.chan && this.chan.readyState === 'open' }

  setState (s, err) {
    this.state = s
    this.error = err || null
    if (s === 'offering' || s === 'answering' || s === 'connecting') this._armWatchdog()
    this.onState(s, this.error)
  }

  // If the two browsers can't punch through NAT there is nobody to tell us,
  // so give up with an honest message instead of spinning forever.
  _armWatchdog () {
    if (this._deadline && this._deadline !== -1) return
    this._deadline = -1
    setTimeout(() => {
      if (this.state === 'open' || this.state === 'closed') { this._deadline = 0; return }
      this.setState('error', NAT_HINT)
    }, 25000)
  }

  _attach (pc, chan) {
    this.pc = pc
    this.chan = chan
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState
      if (s === 'failed') this.setState('error', NAT_HINT)
      else if (s === 'disconnected' && this.state === 'open') this.setState('connecting', 'Link unstable — trying to recover…')
      else if (s === 'connected' && this.state === 'connecting') { this.error = null; this.setState('connecting') }
      else if (s === 'closed') this.setState('closed')
    }
    chan.onopen = () => {
      this._lastRecv = performance.now()
      this._pingT = 0
      this._deadline = 0
      this.setState('open')
    }
    chan.onclose = () => this.setState('closed')
    chan.onmessage = (e) => {
      this._lastRecv = performance.now()
      try {
        const msg = JSON.parse(e.data)
        if (msg[0] === 'p') this.send(['q', msg[1]])
        else if (msg[0] === 'q') this.ping = Math.max(0, Math.round(performance.now() - msg[1]))
        else this.inbox.push(msg)
      } catch (err) { /* ignore malformed */ }
      if (this.inbox.length > 400) this.inbox.splice(0, 200)
    }
  }

  // Wait for ICE to finish so the code contains every candidate we have.
  _gathered (pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve()
      let done = false
      const fin = () => { if (!done) { done = true; resolve() } }
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') fin() }
      setTimeout(fin, 4000)   // don't wait forever on a slow STUN
    })
  }

  async host () {
    if (!NET_OK) throw new Error('WebRTC is not available in this browser.')
    this.role = 'host'
    this.setState('offering')
    const pc = new RTCPeerConnection(ICE)
    const chan = pc.createDataChannel('qyngun', { ordered: false, maxRetransmits: 0 })
    this._attach(pc, chan)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await this._gathered(pc)
    return 'QYN1.' + (await pack(JSON.stringify(pc.localDescription)))
  }

  async join (code) {
    if (!NET_OK) throw new Error('WebRTC is not available in this browser.')
    this.role = 'guest'
    this.setState('answering')
    const desc = JSON.parse(await unpack(code))
    const pc = new RTCPeerConnection(ICE)
    let chan = null
    pc.ondatachannel = (e) => { chan = e.channel; this._attach(pc, chan) }
    await pc.setRemoteDescription(desc)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await this._gathered(pc)
    return 'QYN2.' + (await pack(JSON.stringify(pc.localDescription)))
  }

  async accept (code) {
    const desc = JSON.parse(await unpack(code))
    await this.pc.setRemoteDescription(desc)
    this.setState('connecting')
  }

  send (msg) {
    if (!this.open) return false
    try { this.chan.send(JSON.stringify(msg)); return true } catch (e) { return false }
  }

  // Drain everything received since the last call.
  receive () {
    const out = this.inbox
    this.inbox = []
    return out
  }

  tick (dt) {
    if (!this.open) return
    this._pingT -= dt
    if (this._pingT <= 0) { this._pingT = 1; this.send(['p', performance.now()]) }
    if (this._lastRecv && performance.now() - this._lastRecv > 9000) this.setState('error', 'The other player stopped responding.')
  }

  close () {
    try { this.chan?.close() } catch (e) {}
    try { this.pc?.close() } catch (e) {}
    this.setState('closed')
  }
}

// ── message builders (compact arrays — this runs 30×/second) ───────────────
export const MSG = {
  // 0:t 1..3 pos 4..6 vel 7 yaw 8 pitch 9 flags 10 hp 11 slot 12 ammo 13 speed
  snapshot: (t, mv, flags, hp, slot, ammo) =>
    ['s', +t.toFixed(3), +mv.pos.x.toFixed(2), +mv.pos.y.toFixed(2), +mv.pos.z.toFixed(2),
      +mv.vel.x.toFixed(2), +mv.vel.y.toFixed(2), +mv.vel.z.toFixed(2),
      +mv.yaw.toFixed(3), +mv.pitch.toFixed(3), flags, Math.round(hp),
      slot, ammo | 0, +mv.horizontalSpeed.toFixed(2)],

  damage: (amount, head, hpLeft) => ['d', Math.round(amount), head ? 1 : 0, Math.round(hpLeft)],
  kill: (killer, victim, head, weapon) => ['k', killer, victim, head ? 1 : 0, weapon],
  shot: (x, y, z, dx, dy, dz, weapon) =>
    ['f', +x.toFixed(2), +y.toFixed(2), +z.toFixed(2), +dx.toFixed(3), +dy.toFixed(3), +dz.toFixed(3), weapon],
  hit: (x, y, z) => ['i', +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)],
  match: (phase, round, scoreA, scoreB, timer) => ['m', phase, round, scoreA, scoreB, +timer.toFixed(2)],
  hello: (name, loadout, skin) => ['l', name, loadout, skin],
  ready: (mapId, modeId) => ['y', mapId, modeId],
  spawn: (index) => ['r', index],
  bye: () => ['x'],
}

export const FLAG = { grounded: 1, sliding: 2, sprinting: 4, crouching: 8, alive: 16, firing: 32, reloading: 64 }
