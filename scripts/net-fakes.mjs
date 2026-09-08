// ────────────────────────────────────────────────────────────────────────────
//  A fake PeerJS broker, so the suites can drive the real PeerNet class with
//  no network and no broker in sight.
//
//  Delivery here is synchronous: the suites that measure latency and loss use
//  their own link fake, and this one exists to prove the *protocol* survives
//  the transport — hello, snapshots, damage, kills, match state.
// ────────────────────────────────────────────────────────────────────────────

export function makePeerWorld (opts = {}) {
  const { asyncDelivery = false } = opts
  const broker = new Map()
  const events = []
  let autoIds = 0

  class FakeConn {
    constructor (peer, remote, options) {
      this.peer = peer
      this.remote = remote
      this.options = options || {}
      this.reliable = !!this.options.reliable
      this.metadata = this.options.metadata
      this.open = false
      this.h = {}
      this.pair = null
    }
    on (ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this }
    emit (ev, ...a) { for (const f of this.h[ev] || []) f(...a) }
    _open () { this.open = true; this.emit('open') }
    send (data) {
      const p = this.pair
      if (!p) return
      // a channel hands over a copy, never the object you sent
      const wire = JSON.parse(JSON.stringify(data))
      events.push([this.peer.id, this.reliable ? 'r' : 'f', Array.isArray(data) ? data[0] : '?'])
      const go = () => p.emit('data', wire)
      if (asyncDelivery) setTimeout(go, 3); else go()
    }
    close () { this.open = false; this.emit('close') }
  }

  class FakePeer {
    constructor (id, options) {
      this.options = options || {}
      this.id = id || null
      this.open = false
      this.destroyed = false
      this.conns = []
      this.h = {}
      const settle = () => {
        if (id && broker.has(id)) {
          this.emit('error', { type: 'unavailable-id', message: `ID ${id} is taken` })
          return
        }
        this.id = this.id || ('gen-' + (++autoIds))
        this.open = true
        broker.set(this.id, this)
        this.emit('open', this.id)
      }
      // a microtask, not a timer: senders register their listeners in the same
      // synchronous block, so they are always in place by the time this runs
      if (asyncDelivery) setTimeout(settle, 5); else queueMicrotask(settle)
    }
    on (ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this }
    emit (ev, ...a) { for (const f of this.h[ev] || []) f(...a) }
    connect (remoteId, options) {
      const target = broker.get(remoteId)
      if (!target) {
        const fail = () => this.emit('error', { type: 'peer-unavailable', message: `Peer ${remoteId} is not available` })
        if (asyncDelivery) setTimeout(fail, 5); else queueMicrotask(fail)
        return null
      }
      const mine = new FakeConn(this, target, options)
      const theirs = new FakeConn(target, this, options)
      mine.pair = theirs; theirs.pair = mine
      this.conns.push(mine); target.conns.push(theirs)
      const open = () => { target.emit('connection', theirs); mine._open(); theirs._open() }
      if (asyncDelivery) setTimeout(open, 5); else queueMicrotask(open)
      return mine
    }
    destroy () { this.destroyed = true; if (this.id) broker.delete(this.id) }
    reconnect () { this.emit('open', this.id) }
  }

  return { Peer: FakePeer, broker, events }
}
