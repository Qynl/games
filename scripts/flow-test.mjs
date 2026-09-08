// Drives the real React UI in jsdom: title → lobby → loadout → match, twice.
// This is the suite that catches "the button does nothing" class bugs.
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'

let fails = 0
const check = (n, ok, info = '') => { console.log(`${ok ? ' PASS' : '*FAIL'}  ${n}  ${info}`); if (!ok) fails++ }

// ── bundle the app for node ────────────────────────────────────────────────
const OUT = new URL('./.uitest/app.mjs', import.meta.url).pathname
await build({
  entryPoints: [new URL('./.uitest/entry.jsx', import.meta.url).pathname],
  bundle: true, format: 'esm', outfile: OUT, platform: 'node',
  external: ['react', 'react-dom', 'react-dom/client', 'three'],
  loader: { '.js': 'jsx' }, logLevel: 'warning',
})

// ── browser environment ────────────────────────────────────────────────────
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

// stub renderer: the game runs its full simulation, just without pixels
window.__qyngunRendererFactory = (canvas) => ({
  autoClear: true, domElement: canvas, info: { render: { calls: 0, triangles: 0 } },
  setPixelRatio () {}, setSize () {}, render () {}, clearDepth () {}, dispose () {},
})

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const UI = await import(OUT)

const container = document.getElementById('root')
let root = null
const mount = async () => {
  if (root) await act(async () => { root.unmount() })
  root = createRoot(container)
  await act(async () => { root.render(React.createElement(UI.App)) })
}

const q = (sel) => document.querySelectorAll(sel)
const txt = () => document.body.textContent || ''
const findBtn = (re) => [...q('button')].find((b) => re.test(b.textContent.trim()))
const findCard = (name) => [...q('.card')].find((c) => c.textContent.includes(name))
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) }) }
const wait = async (ms) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
const waitFor = async (sel, ms = 9000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (document.querySelector(sel)) return true
    await wait(120)
  }
  return false
}

// walk title → lobby → loadout for a given mode
const toLoadout = async (modeCard) => {
  await click(findBtn(/ENTER LOBBY|PLAY/i))
  check('lobby renders modes', /GAME MODE/i.test(txt()))
  await click(findCard(modeCard))
  await click(findBtn(/QUEUE|ENTER RANGE/i))
  check('loadout screen reached', /LOADOUT/i.test(txt()))
}

// ══ PATH A — pick every slot by clicking cards (auto lock-in) ══════════════
console.log('— path A: pick cards in every slot —')
await mount()
check('title screen renders', /QYNGUN/i.test(txt()))
await toLoadout('1 v 1')
const slots = ['PRIMARY', 'SECONDARY', 'MELEE', 'UTILITY']
for (let i = 0; i < slots.length; i++) {
  check(`slot ${i + 1} (${slots[i]}) offered`, new RegExp(slots[i]).test(txt()))
  const card = [...q('.card:not(.locked)')][0]
  check(`  card pickable in slot ${i + 1}`, !!card)
  if (card) await click(card)
}
await wait(60)
check('picking the last slot locks in', /LOCKING IN|MATCH START/.test(txt()), txt().slice(0, 50))
// the fake lobby takes a moment to "fill up" — then the arena must appear
const gotHud = await waitFor('.hud')
let hud = document.querySelector('.hud')
check('HUD renders (no infinite LOADING ARENA)', gotHud)
if (hud) {
  const t = hud.textContent || ''
  check('  HUD shows health', /HP/.test(t))
  check('  HUD shows the score', /FIRST TO 5|MATCH POINT/.test(t))
  check('  HUD shows movement telemetry', /MOVEMENT|M\/S/.test(t))
  check('  HUD tells you to click before the lock', /CLICK TO PLAY/i.test(t))
}
check('canvas mounted', !!document.querySelector('canvas'))
// a real click asks for the lock; jsdom has none, so the fallback must engage
await click(document.querySelector('canvas'))
await wait(1400)
check('free-cursor fallback engages when pointer lock is blocked',
  !/CLICK TO PLAY/i.test(document.querySelector('.hud')?.textContent || ''),
  (document.querySelector('.hud')?.textContent || '').slice(0, 40))
check('simulation is running', (window.__qyn?.time || 0) > 0.2, `t=${(window.__qyn?.time || 0).toFixed(2)}s`)

// ══ PATH B — NEXT ▶ through the slots, then START MATCH (the dead button) ══
console.log('— path B: NEXT ▶ then START MATCH —')
await mount()
await toLoadout('2 v 2')
for (let i = 0; i < 3; i++) {
  const next = findBtn(/NEXT ▶/)
  check(`NEXT ▶ works (${i + 1}/3)`, !!next)
  if (next) await click(next)
}
const start = findBtn(/START MATCH/)
check('START MATCH button exists on the last slot', !!start)
if (start) {
  await click(start)
  await wait(60)
  check('START MATCH actually starts the match', /LOCKING IN|MATCH START/.test(txt()), txt().slice(0, 50))
} else fails++
const gotHud2 = await waitFor('.hud')
hud = document.querySelector('.hud')
check('HUD renders after START MATCH', gotHud2)
check('no crash text', !/Application error|Uncaught/i.test(txt()))

// ══ PATH C — shooting range loads and shows the range hint ═════════════════
console.log('— path C: shooting range —')
await mount()
await toLoadout('SHOOTING RANGE')
for (let i = 0; i < 4; i++) {
  const card = [...q('.card:not(.locked)')][0]
  if (card) await click(card)
}
const gotHud3 = await waitFor('.hud')
hud = document.querySelector('.hud')
check('range HUD renders', gotHud3)
check('range hint is shown', /CHANGE LOADOUT|DUMMIES/i.test(txt()))

// ══ PATH D — the shop: spend, own, equip, and keep it ═════════════════════
console.log('— path D: armory economy —')
await mount()
await click(findBtn(/^ARMORY$/i))
await wait(60)
const wallet = () => { const m = txt().match(/(\d+)\s*◈ QYNS/); return m ? +m[1] : null }
check('armory renders with a wallet', /QYNS/.test(txt()) && wallet() !== null, `${wallet()} ◈`)
const wallet0 = wallet()
const locked = [...q('.card.locked')][0]
check('there is something to buy', !!locked)
if (locked) {
  const name = (locked.querySelector('.nm')?.textContent || '').trim()
  const price = +(((locked.querySelector('.price')?.textContent) || '0').match(/\d+/) || [0])[0]
  await click(locked)
  await wait(80)
  const after = wallet()
  check(`buying ${name} charges exactly the price on the card`, after === wallet0 - price, `${wallet0} → ${after} (card said ${price})`)
  check('the purchase is confirmed', new RegExp(`${name} UNLOCKED`).test(txt()))
  const card1 = findCard(name)
  check('the card is no longer locked', card1 && !card1.className.includes('locked'))
  check('an owned card offers to equip', card1 && /EQUIP/.test(card1.textContent))
  await click(findCard(name))
  await wait(80)
  check('clicking an owned card equips it', /EQUIPPED/.test((findCard(name)?.textContent) || ''))
  check('equipping is free', wallet() === after, `${wallet()} ◈`)
  await click(findCard(name))
  await wait(80)
  check('equipping twice costs nothing', wallet() === after, `${wallet()} ◈`)
  // a reload must not hand the money back
  await mount()
  await click(findBtn(/^ARMORY$/i))
  await wait(80)
  check('the purchase survives a reload', wallet() === after, `${wallet()} ◈`)
  check('and the gun is still unlocked', !((findCard(name)?.className) || 'locked').includes('locked'))
}

await act(async () => { root.unmount() })
console.log(`\n${fails === 0 ? 'ALL FLOW TESTS PASSED' : fails + ' FAILURES'}`)
process.exit(fails ? 1 : 0)
