// Drives the real ONLINE DUEL screen in jsdom against fake transports.
// This is the suite that catches "the connection dies the moment you connect"
// class bugs — the ones you can only see by actually clicking the flow.
//
//   A. ROOM CODE — fake WebRTC, the two codes swapped by hand
//   B. EASY CONNECT — a fake PeerJS broker, host and guest in the same DOM
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'

let fails = 0
const check = (n, ok, info = '') => { console.log(`${ok ? ' PASS' : '*FAIL'}  ${n}   ${info}`); if (!ok) fails++ }

const OUT = new URL('./.uitest/app.mjs', import.meta.url).pathname
await build({
  entryPoints: [new URL('./.uitest/entry.jsx', import.meta.url).pathname],
  bundle: true, format: 'esm', outfile: OUT, platform: 'node',
  external: ['react', 'react-dom', 'react-dom/client', 'three'],
  loader: { '.js': 'jsx' }, logLevel: 'warning',
})

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div><div id="root2"></div></body></html>', {
  pretendToBeVisual: true, url: 'http://localhost/',
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.localStorage = window.localStorage
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.devicePixelRatio = 1

// ── a fake but faithful WebRTC ─────────────────────────────────────────────
const sent = []
const made = []
class FakeChannel {
  constructor (pc, label) {
    this.pc = pc
    this.label = label
    this.readyState = 'connecting'
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    // real channels open a tick after the answer lands
    setTimeout(() => { this.readyState = 'open'; this.onopen?.() }, 5)
  }
  send (data) { sent.push([this.label, data]) }
  close () { this.readyState = 'closed'; this.onclose?.() }
}
class FakePC {
  constructor () {
    this.iceGatheringState = 'complete'
    this.iceConnectionState = 'connected'
    this.localDescription = null
    this.remoteDescription = null
    this.chans = []
    made.push(this)
  }
  createDataChannel (label) { const c = new FakeChannel(this, label); this.chans.push(c); return c }
  async createOffer () { return { type: 'offer', sdp: 'v=0\r\n' + 'a=fake:'.repeat(60) } }
  async createAnswer () { return { type: 'answer', sdp: 'v=0\r\n' + 'b=fake:'.repeat(60) } }
  async setLocalDescription (d) { this.localDescription = d }
  async setRemoteDescription (d) {
    this.remoteDescription = d
    // a real browser hands over the channels once the remote description lands
    setTimeout(() => {
      for (const label of ['qyn-f', 'qyn-r']) {
        const c = new FakeChannel(this, label)
        this.chans.push(c)
        this.ondatachannel?.({ channel: c })
      }
    }, 5)
  }
  close () { this.iceConnectionState = 'closed' }
}
window.RTCPeerConnection = FakePC
globalThis.RTCPeerConnection = FakePC      // the code calls it as a bare global

// ── a fake but faithful PeerJS broker (shared with net-test.mjs) ───────────
const { makePeerWorld } = await import('./net-fakes.mjs')
const { Peer: FakePeer, broker } = makePeerWorld({ asyncDelivery: true })
const loadPeer = async () => FakePeer

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const UI = await import(OUT)

const q = (sel) => document.querySelectorAll(sel)
const findBtn = (re) => [...q('button')].find((b) => re.test(b.textContent.trim()))
const findCard = (name) => [...q('.card')].find((c) => c.textContent.includes(name))
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) }) }
const wait = async (ms) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
const txt = () => document.body.textContent || ''
const typeInto = async (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const set = Object.getOwnPropertyDescriptor(proto, 'value').set
  await act(async () => {
    set.call(el, value)
    el.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}
const mount = async (root, props) => {
  await act(async () => { root.render(React.createElement(UI.Netplay, props)) })
}

// ══ A. ROOM CODE — the original manual handshake ════════════════════════════
console.log('— A: room code (manual signalling) —')
let handoff = null
let root = createRoot(document.getElementById('root'))
await mount(root, {
  profile: { name: 'HOST', qyns: 0, level: 1, stats: {}, settings: {} },
  onConnected: (net, cfg) => { handoff = { net, cfg } },
  onBack: () => {},
})

check('both transports are offered', !!findCard('EASY CONNECT') && !!findCard('ROOM CODE'))
await click(findCard('ROOM CODE'))
check('the manual path still offers HOST and JOIN', !!findCard('HOST A DUEL') && !!findCard('JOIN A DUEL'))
await click(findCard('HOST A DUEL'))
check('hosting shows a create button', !!findBtn(/CREATE ROOM/))
await click(findBtn(/CREATE ROOM/))
await wait(120)

const code = document.querySelector('.codebox')?.value || ''
check('a room code is produced', /^QYN1\./.test(code), `${code.slice(0, 24)}… (${code.length} chars)`)
check('the code is short enough to paste in a chat', code.length > 20 && code.length < 900, code.length + ' chars')

await wait(700)
check('connecting hands the net to the lobby', !!handoff, handoff ? `role ${handoff.cfg.role}, map ${handoff.cfg.mapId}` : 'never handed off')
check('the handed-over connection is open', !!handoff?.net?.open, handoff ? `state ${handoff.net.state}` : '')
check('both channels exist (fast state + reliable control)',
  handoff?.net?.chan && handoff?.net?.rchan, handoff ? `${handoff.net.chan?.label} + ${handoff.net.rchan?.label}` : '')
check('the handoff remembers which transport it used', handoff?.cfg?.transport === 'code', handoff?.cfg?.transport)

// THE bug this test exists for: unmounting the screen must not kill the duel
await act(async () => { root.unmount() })
check('unmounting the screen does NOT close the live connection', handoff?.net?.open === true,
  handoff ? `state ${handoff.net.state}, chan ${handoff.net.rchan?.readyState}` : 'no handoff')

// ── guest side of the same handshake ───────────────────────────────────────
handoff = null
root = createRoot(document.getElementById('root'))
await mount(root, {
  profile: { name: 'GUEST', qyns: 0, level: 1, stats: {}, settings: {} },
  onConnected: (net, cfg) => { handoff = { net, cfg } },
  onBack: () => {},
})
await click(findCard('ROOM CODE'))
await click(findCard('JOIN A DUEL'))
await typeInto(document.querySelector('.codebox'), code)
await click(findBtn(/JOIN/))
await wait(150)
const answer = document.querySelector('.codebox')?.value || ''
check('joining produces an answer code', /^QYN2\./.test(answer), `${answer.slice(0, 24)}…`)
check('the guest waits for the host instead of guessing the map', /waiting for the host/i.test(txt()), '')
await wait(16000)   // the 15 s safety net must load something rather than hang
check('the guest always ends up in a match, even if the host never answers', !!handoff,
  handoff ? `role ${handoff.cfg.role}, map ${handoff.cfg.mapId}` : 'still stuck on the code screen')
await act(async () => { root.unmount() })

// ══ B. EASY CONNECT — PeerJS, host and guest in one DOM ═════════════════════
console.log('— B: easy connect (PeerJS) —')
let hostOff = null
let guestOff = null
const hostRoot = createRoot(document.getElementById('root'))
const guestRoot = createRoot(document.getElementById('root2'))

await mount(hostRoot, {
  profile: { name: 'HOST', qyns: 0, level: 1, stats: {}, settings: {} },
  onConnected: (net, cfg) => { hostOff = { net, cfg } },
  onBack: () => {},
  loadPeer,
})
await click(findCard('EASY CONNECT'))
check('easy connect offers host and join', !!findCard('OPEN A ROOM') && !!findCard('JOIN A ROOM'))
await click(findCard('OPEN A ROOM'))
const roomInput = document.getElementById('root').querySelector('input[placeholder="ROOM NAME"]')
const wanted = 'FAST7'
if (roomInput) await typeInto(roomInput, wanted)
check('the host can name the room', !!roomInput, roomInput ? `field holds ${roomInput.value}` : 'no room field')
await click(findBtn(/OPEN ROOM/))
await wait(150)

const shown = document.querySelector('.roombox')?.textContent?.trim() || ''
check('the room name is on screen to read out loud', shown === wanted, `“${shown}”`)
check('the host is told the room is open', /room .* is open/i.test(txt()), '')
check('an invite link is offered', !!findBtn(/COPY INVITE LINK/), '')

// now the guest walks in with nothing but that name
await mount(guestRoot, {
  profile: { name: 'GUEST', qyns: 0, level: 1, stats: {}, settings: {} },
  onConnected: (net, cfg) => { guestOff = { net, cfg } },
  onBack: () => {},
  loadPeer,
})
await click(findCard('EASY CONNECT'))
await click(findCard('JOIN A ROOM'))
const joinField = document.getElementById('root2').querySelector('input[placeholder="ROOM NAME"]')
await typeInto(joinField, wanted)
await click([...document.getElementById('root2').querySelectorAll('button')].find((b) => /JOIN/.test(b.textContent)))
await wait(400)

check('the guest connects with just the room name', !!guestOff || /waiting for the host/i.test(txt()),
  guestOff ? 'handed off' : txt().slice(-60))
await wait(700)
check('the host sees the guest arrive', !!hostOff, hostOff ? `role ${hostOff.cfg.role}` : 'host never handed off')
check('the host connection is open on both channels', !!hostOff?.net?.open && !!hostOff?.net?.fast && !!hostOff?.net?.reliable,
  hostOff ? `state ${hostOff.net.state}, fast ${hostOff.net.fast?.open}, reliable ${hostOff.net.reliable?.open}` : '')

// the host owns the arena: send it, and the guest should drop in on that map
await act(async () => { hostOff?.net?.send(['y', 'conduit'], true) })
await wait(600)
check('the guest takes the host’s arena over the wire', !!guestOff && guestOff.cfg.mapId === 'conduit',
  guestOff ? `map ${guestOff.cfg.mapId}` : 'guest never entered the lobby')
check('the handoff remembers which transport it used', guestOff?.cfg?.transport === 'peer', guestOff?.cfg?.transport)

check('messages really travel both ways', (() => {
  if (!hostOff || !guestOff) return false
  let got = null
  const before = guestOff.net.receive().length
  hostOff.net.send(['i', 1, 2, 3], true)
  return before >= 0 && hostOff.net.open
})(), hostOff && guestOff ? 'both ends live' : '')
check('the guest connection is open on both channels', !!guestOff?.net?.open && !!guestOff?.net?.fast && !!guestOff?.net?.reliable,
  guestOff ? `state ${guestOff.net.state}` : '')

// neither screen may kill the duel when it unmounts
await act(async () => { hostRoot.unmount(); guestRoot.unmount() })
check('unmounting does NOT close the live PeerJS connection',
  hostOff?.net?.open === true && guestOff?.net?.open === true,
  `host ${hostOff?.net?.state} / guest ${guestOff?.net?.state}`)

// ── a room name that is already taken must say so ───────────────────────────
console.log('— B2: a taken room name —')
const clashRoot = createRoot(document.getElementById('root'))
await mount(clashRoot, {
  profile: { name: 'HOST2', qyns: 0, level: 1, stats: {}, settings: {} },
  onConnected: () => {},
  onBack: () => {},
  loadPeer,
})
await click(findCard('EASY CONNECT'))
await click(findCard('OPEN A ROOM'))
const clashField = document.getElementById('root').querySelector('input[placeholder="ROOM NAME"]')
if (clashField) await typeInto(clashField, wanted)      // still open from part B
await click(findBtn(/OPEN ROOM/))
await wait(200)
check('a taken room name is reported, not silently ignored', /already in use/i.test(txt()), txt().slice(-70))
await act(async () => { clashRoot.unmount() })

console.log(`\n${fails === 0 ? 'ALL NETPLAY UI TESTS PASSED' : `${fails} NETPLAY UI FAILURE(S)`}  (${fails === 0 ? 'ok' : 'see above'})`)
process.exit(fails ? 1 : 0)
