// Drives the real ONLINE DUEL screen in jsdom against a fake WebRTC stack.
// This is the suite that catches "the connection dies the moment you connect"
// class bugs — the ones you can only see by actually clicking the flow.
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

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
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

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const UI = await import(OUT)

const container = document.getElementById('root')
const q = (sel) => document.querySelectorAll(sel)
const findBtn = (re) => [...q('button')].find((b) => re.test(b.textContent.trim()))
const findCard = (name) => [...q('.card')].find((c) => c.textContent.includes(name))
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) }) }
const wait = async (ms) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
const txt = () => document.body.textContent || ''

// ── HOST flow ──────────────────────────────────────────────────────────────
let handoff = null
let root = createRoot(container)
await act(async () => {
  root.render(React.createElement(UI.Netplay, {
    profile: { name: 'HOST', qyns: 0, level: 1, stats: {}, settings: {} },
    onConnected: (net, cfg) => { handoff = { net, cfg } },
    onBack: () => {},
  }))
})

check('the online screen offers HOST and JOIN', !!findCard('HOST A DUEL') && !!findCard('JOIN A DUEL'))
await click(findCard('HOST A DUEL'))
check('hosting shows a create button', !!findBtn(/CREATE ROOM/))
await click(findBtn(/CREATE ROOM/))
await wait(120)

const code = document.querySelector('.codebox')?.value || ''
check('a room code is produced', /^QYN1\./.test(code), `${code.slice(0, 24)}… (${code.length} chars)`)
check('the code is short enough to paste in a chat', code.length > 20 && code.length < 900, code.length + ' chars')

// the channel opens → the lobby takes over
await wait(700)
check('connecting hands the net to the lobby', !!handoff, handoff ? `role ${handoff.cfg.role}, map ${handoff.cfg.mapId}` : 'never handed off')
check('the handed-over connection is open', !!handoff?.net?.open, handoff ? `state ${handoff.net.state}` : '')
check('both channels exist (fast state + reliable control)',
  handoff?.net?.chan && handoff?.net?.rchan, handoff ? `${handoff.net.chan?.label} + ${handoff.net.rchan?.label}` : '')

// THE bug this test exists for: unmounting the screen must not kill the duel
await act(async () => { root.unmount() })
check('unmounting the screen does NOT close the live connection', handoff?.net?.open === true,
  handoff ? `state ${handoff.net.state}, chan ${handoff.net.rchan?.readyState}` : 'no handoff')

// ── JOIN flow ──────────────────────────────────────────────────────────────
handoff = null
root = createRoot(container)
await act(async () => {
  root.render(React.createElement(UI.Netplay, {
    profile: { name: 'GUEST', qyns: 0, level: 1, stats: {}, settings: {} },
    onConnected: (net, cfg) => { handoff = { net, cfg } },
    onBack: () => {},
  }))
})
await click(findCard('JOIN A DUEL'))
// React tracks the value property, so a plain assignment is invisible to it
const pasteBox = document.querySelector('.codebox')
const setValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
await act(async () => {
  setValue.call(pasteBox, code)
  pasteBox.dispatchEvent(new window.Event('input', { bubbles: true }))
})
await click(findBtn(/JOIN/))
await wait(150)
const answer = document.querySelector('.codebox')?.value || ''
check('joining produces an answer code', /^QYN2\./.test(answer), `${answer.slice(0, 24)}…`)
check('the guest waits for the host instead of guessing the map', /waiting for the host/i.test(txt()), '')
// the host's map choice arrives on the wire → the guest drops into the lobby
await act(async () => { handoff?.net?.receive?.() })
const gnet = handoff?.net
check('the guest does not enter the lobby before the host picks a map', !handoff, handoff ? 'entered too early' : 'still waiting')
await wait(16000)   // the 15 s safety net must load something rather than hang
check('the guest always ends up in a match, even if the host never answers', !!handoff,
  handoff ? `role ${handoff.cfg.role}, map ${handoff.cfg.mapId}` : 'still stuck on the code screen')
await act(async () => { root.unmount() })

console.log(`\n${fails === 0 ? 'ALL NETPLAY UI TESTS PASSED' : `${fails} NETPLAY UI FAILURE(S)`}  (${fails === 0 ? 'ok' : 'see above'})`)
process.exit(fails ? 1 : 0)
