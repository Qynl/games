// ────────────────────────────────────────────────────────────────────────────
//  PeerJS transport — the same duel, without swapping codes.
//
//  The wire protocol is byte-for-byte what Net.js speaks: two channels (one
//  unreliable for 30 Hz snapshots, one reliable for everything that must
//  land), the same ping pairs, the same message arrays. Only the handshake
//  changes. PeerJS runs a public broker that introduces the two browsers;
//  once they have met, the game traffic is still straight peer to peer.
//
//  If the broker is unreachable (or you would rather trust nobody at all)
//  the ROOM CODE transport in Net.js needs no server of any kind.
// ────────────────────────────────────────────────────────────────────────────

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }] }

// unambiguous: no O/0, no I/1, no look-alike pairs — these get read aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeRoom (s) {
  return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14)
}

export function randomRoom () {
  let out = ''
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return out
}

const ID_PREFIX = 'qyngun-'
export const roomToId = (room) => ID_PREFIX + normalizeRoom(room)
export const idToRoom = (id) => String(id || '').replace(/^qyngun-/i, '')

const loadPeerDefault = async () => (await import('peerjs')).default

export class PeerNet {
  constructor (opts = {}) {
    this.kind = 'peer'
    this.role = null            // 'host' | 'guest'
    this.state = 'idle'         // idle | offering | answering | connecting | open | closed | error
    this.error = null
    this.inbox = []
    this.onState = () => {}
    this.ping = 0
    this.rtt = 80               // best guess until the first ping lands
    this.ready = false          // reliable channel up
    this.fastReady = false      // snapshot channel up
    this.room = null
    this.peer = null
    this.fast = null
    this.reliable = null
    this._pingT = 0
    this._lastRecv = 0
    this._deadline = 0
    this._loadPeer = opts.loadPeer || loadPeerDefault
    this._broker = opts.broker || {}
  }

  get open () {
    return this.state === 'open' && !!this.fast && !!this.reliable &&
      this.fast.open !== false && this.reliable.open !== false
  }

  setState (s, err) {
    this.state = s
    this.error = err || null
    if (s === 'offering' || s === 'answering' || s === 'connecting') this._armWatchdog()
    this.onState(s, this.error)
  }

  _armWatchdog () {
    if (this._deadline && this._deadline !== -1) return
    this._deadline = -1
    setTimeout(() => {
      if (this.state === 'open' || this.state === 'closed') { this._deadline = 0; return }
      this.setState('error', 'Nobody answered. Check the room name and try again — or use ROOM CODE, which needs no broker at all.')
    }, 25000)
  }

  // the broker config: blank fields mean "use the PeerJS cloud"
  _options () {
    const b = this._broker
    const o = { debug: 0, config: ICE }
    const host = b.peerHost || b.host
    if (host) {
      o.host = host
      o.port = Number(b.peerPort || b.port) || 443
      o.path = b.peerPath || b.path || '/'
      o.secure = b.peerSecure === undefined ? b.secure !== false : b.peerSecure !== false
      if (b.peerKey || b.key) o.key = b.peerKey || b.key
    }
    return o
  }

  // PeerJS reports in error codes; players need sentences.
  _friendly (e) {
    const room = this.room || '—'
    switch (e?.type || '') {
      case 'unavailable-id': return `Room ${room} is already in use — pick another name.`
      case 'peer-unavailable': return `No open room called ${room}. Check the spelling, and make sure the host pressed OPEN ROOM.`
      case 'network':
      case 'server-error':
      case 'socket-error':
      case 'ssl-unavailable':
        return 'Could not reach the connection broker. Check your connection, or switch to ROOM CODE — it needs no server.'
      case 'browser-incompatible': return 'This browser cannot do WebRTC. Try Chrome, Edge, Firefox or Safari.'
      case 'disconnected': return 'Lost the broker link. Trying to reconnect…'
      default: return e?.message || 'Connection failed.'
    }
  }

  _onPeerError (e) {
    const t = e?.type || ''
    if (t === 'disconnected') {
      // the broker link dropped, not the duel: try to get it back
      try { this.peer?.reconnect() } catch (err) { /* already gone */ }
      if (this.state === 'open') return
    }
    if (t === 'webrtc') return      // transient: ICE is still working it out
    if (this.state !== 'open') this.setState('error', this._friendly(e))
  }

  _wire (conn, reliable) {
    this[reliable ? 'reliable' : 'fast'] = conn
    conn.on('open', () => {
      this._lastRecv = performance.now()
      this._deadline = 0
      if (reliable) this.ready = true; else this.fastReady = true
      if (this.ready && this.fastReady) this.setState('open')
    })
    conn.on('data', (msg) => {
      this._lastRecv = performance.now()
      try {
        if (Array.isArray(msg) && msg[0] === 'p') this.send(['q', msg[1]], true)
        else if (Array.isArray(msg) && msg[0] === 'q') {
          const rtt = Math.max(0, performance.now() - msg[1])
          // smooth, but jump on big spikes so the HUD never lies
          this.rtt = this.rtt ? this.rtt * 0.8 + rtt * 0.2 : rtt
          this.ping = Math.round(this.rtt)
        } else this.inbox.push(msg)
      } catch (err) { /* ignore malformed */ }
      if (this.inbox.length > 400) this.inbox.splice(0, 200)
    })
    conn.on('close', () => { if (reliable) { this.ready = false; this.setState('closed') } })
    conn.on('error', (e) => {
      if (this.state !== 'open') this.setState('error', e?.message || 'Link error.')
    })
  }

  _brokerOpen (peer) {
    return new Promise((resolve, reject) => {
      let done = false
      const ok = (id) => { if (!done) { done = true; resolve(id) } }
      const no = (e) => { if (!done) { done = true; reject(e) } }
      peer.on('open', ok)
      peer.on('error', no)
      // a peer can open before there was anyone listening — believe the flag
      // rather than sitting on a promise nobody will ever settle
      if (peer.open && peer.id) ok(peer.id)
      setTimeout(() => no(new Error('The connection broker did not answer. Check your connection, or use ROOM CODE.')), 20000)
    })
  }

  // HOST: claim the room name, then wait for someone to walk in.
  async host (room) {
    if (typeof RTCPeerConnection === 'undefined' && typeof window === 'undefined') {
      throw new Error('WebRTC is not available in this browser.')
    }
    this.role = 'host'
    this.room = normalizeRoom(room) || randomRoom()
    this.setState('offering')
    const Peer = await this._loadPeer()
    const peer = new Peer(roomToId(this.room), this._options())
    this.peer = peer
    try {
      await this._brokerOpen(peer)
    } catch (e) {
      const m = this._friendly(e)
      this.setState('error', m)
      throw new Error(m)          // the screen shows the sentence, not the error code
    }
    peer.on('error', (e) => this._onPeerError(e))
    peer.on('connection', (conn) => {
      const kind = conn.metadata && conn.metadata.kind
      const reliable = kind ? kind === 'r' : conn.reliable !== false
      this._wire(conn, reliable)
      this.setState('connecting')
    })
    this.setState('connecting')
    return this.room
  }

  // GUEST: walk into a room that is already open.
  async join (room) {
    if (typeof RTCPeerConnection === 'undefined' && typeof window === 'undefined') {
      throw new Error('WebRTC is not available in this browser.')
    }
    this.role = 'guest'
    this.room = normalizeRoom(room)
    if (!this.room) throw new Error('Enter the room name your friend gave you.')
    this.setState('answering')
    const Peer = await this._loadPeer()
    const peer = new Peer(undefined, this._options())
    this.peer = peer
    try {
      await this._brokerOpen(peer)
    } catch (e) {
      const m = this._friendly(e)
      this.setState('error', m)
      throw new Error(m)
    }
    peer.on('error', (e) => this._onPeerError(e))
    this.setState('connecting')
    const id = roomToId(this.room)
    this._wire(peer.connect(id, { reliable: false, metadata: { kind: 'f' } }), false)
    this._wire(peer.connect(id, { reliable: true, metadata: { kind: 'r' } }), true)
    return this.room
  }

  send (msg, fast = false) {
    const c = fast ? this.fast : this.reliable
    if (!c || c.open === false) return false
    try { c.send(msg); return true } catch (e) { return false }
  }

  receive () {
    const out = this.inbox
    this.inbox = []
    return out
  }

  tick (dt) {
    if (!this.open) return
    this._pingT -= dt
    if (this._pingT <= 0) { this._pingT = 1; this.send(['p', performance.now()], true) }
    if (this._lastRecv && performance.now() - this._lastRecv > 9000) {
      this.setState('error', 'The other player stopped responding.')
    }
  }

  close () {
    try { this.fast?.close() } catch (e) { /* already gone */ }
    try { this.reliable?.close() } catch (e) { /* already gone */ }
    try { this.peer?.destroy() } catch (e) { /* already gone */ }
    this.ready = this.fastReady = false
    this.setState('closed')
  }
}
