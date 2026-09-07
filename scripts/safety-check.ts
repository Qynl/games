// Safety self-test — run with: npm run test:safety
//
// Proves the AI-code sandbox stays page-local:
//  1. dangerous host/browser/Node APIs and JS escape tricks are rejected,
//  2. benign scripts that only use w.* + plain JS are accepted,
//  3. comments/strings mentioning scary words do not false-positive,
//  4. editor.saveScript sandbox-validates + auto-enables AI scripts.

import { runSandboxed } from '../src/ai/sandbox'
import { GameEngine } from '../src/game/GameEngine'
import { VirtualEditor, makeWorldFacade } from '../src/editor/VirtualEditor'

let pass = 0
let fail = 0
function check(cond: boolean, name: string, extra = ''): void {
  if (cond) {
    pass++
    console.log(`PASS ${name}`)
  } else {
    fail++
    console.log(`FAIL ${name} ${extra}`)
  }
}



const stubW = { createObject: () => ({ ok: true }) } as unknown as Record<string, unknown>

const MUST_RUN: [string, string][] = [
  ['plain world call', 'w.createObject({ kind: "cube", name: "x" }); "made"'],
  ['comments may mention scary words', '// fetch and document are only mentioned\n/* fetch( document( */\nw.createObject({ kind: "rock" }); 7'],
  ['strings may contain blocked words', 'const s = "top speed: 100"; w.createObject({ name: s })'],
  ['substring "stop" inside "top"? no — locals', 'let stop = 4; w.createObject({ x: stop })'],
  ['plain JS: math, loops', 'let acc = 0; for (let i = 0; i < 10; i++) acc += Math.sqrt(i); w.createObject({ acc })'],
  ['template with expression', 'const nm = "crate"; w.createObject({ kind: `${nm}_box` })'],
  ['keyword function is legal', 'function helper() { return 1 } helper()'],
]

const MUST_BLOCK: [string, string][] = [
  ['fetch', 'fetch("http://evil")'],
  ['fetch as variable', 'const f = fetch; f("http://evil")'],
  ['window/document', 'window.document.title'],
  ['globalThis', 'globalThis.fetch("http://x")'],
  ['self', 'self["fetch"]("http://x")'],
  ['XMLHttpRequest', 'new XMLHttpRequest()'],
  ['WebSocket', 'new WebSocket("ws://x")'],
  ['sendBeacon', 'navigator.sendBeacon("http://x")'],
  ['Image beacon', 'new Image().src = "http://x"'],
  ['localStorage', 'localStorage.setItem("a", "b")'],
  ['navigator', 'navigator.userAgent'],
  ['location', 'location.href'],
  ['process/require', 'require("fs"); process.env.HOME'],
  ['module/Buffer', 'module.exports = Buffer.from("x")'],
  ['alert/prompt', 'alert("hi"); prompt("hi")'],
  ['timers', 'setTimeout(f, 1); setInterval(f, 1); requestAnimationFrame(f)'],
  ['atob/btoa', 'atob("aGk=")'],
  ['eval', 'eval("1+1")'],
  ['new Function', 'new Function("return 1")()'],
  ['constructor chain', '[].filter.constructor("return 1")()'],
  ['__proto__ walk', '({}).__proto__.x = 1'],
  ['prototype pollution', 'Object.prototype.x = 1'],
  ['Proxy/Reflect', 'new Proxy({}, {}); Reflect.construct(Function, ["return 1"])'],
  ['WeakRef', 'new WeakRef({})'],
  ['dynamic import', 'import("http://x")'],
  ['import.meta', 'import.meta.url'],
  ['innerHTML/postMessage', 'document.body.innerHTML = "x"; postMessage("x")'],
  ['hex-escaped eval', "eval('\\x61lert(1)')"],
  ['blocked word as identifier', 'const top = 1; w.createObject({ x: top })'],
]

let failedOne = false
for (const [name, code] of MUST_RUN) {
  const r = runSandboxed(code, { w: stubW })
  const ok = !r.blocked
  if (!ok) failedOne = true
  check(ok, `allowed: ${name}`, JSON.stringify(r.error ?? r))
}

// runtime + syntax failures must come back as *reported errors*, never as
// blocked scans — the AI needs those messages to fix its code
for (const [name, code] of [
  ['runtime errors reported, not blocked', 'const a = null; a.x'],
  ['syntax errors reported, not blocked', 'function {'],
] as [string, string][]) {
  const r = runSandboxed(code, { w: stubW })
  const ok = !r.ok && !r.blocked && !!r.error
  if (!ok) failedOne = true
  check(ok, `reported: ${name}`, JSON.stringify(r))
}
for (const [name, code] of MUST_BLOCK) {
  const r = runSandboxed(code, { w: stubW })
  const ok = !r.ok && r.blocked === true
  if (!ok) failedOne = true
  check(ok, `blocked: ${name}`, JSON.stringify(r))
}

// editor integration: AI scripts get sandbox-validated, auto-enabled, deduped
if (!failedOne) {
  const engine = new GameEngine({})
  engine.init()
  const ve = new VirtualEditor({ api: engine.api, engine })

  // scripts see a trimmed w.* facade: world verbs yes, meta-script verbs no
  const facade = makeWorldFacade(engine.api)
  check(typeof facade.moveObject === 'function', 'facade: world verbs exposed')
  check(!('createScript' in facade), 'facade: no createScript (no scriptception)')
  check(!('listScripts' in facade), 'facade: no listScripts')

  const good = ve.saveScript('bobber', 'var t = Date.now() / 600; w.moveObject({ name: "x", pos: [3, 1.4 + Math.sin(t) * 0.5, 10] })')
  check(good.ok, 'saveScript: good AI script accepted', JSON.stringify(good))
  check(ve.scriptRunning['bobber'] === true, 'saveScript: good AI script auto-enabled')
  check(engine.api.scripts.length === 1, 'saveScript: script stored once')

  const bad = ve.saveScript('evil', 'fetch("http://evil")')
  check(!bad.ok && /blocked/i.test(bad.error ?? ''), 'saveScript: hostile script rejected by sandbox', JSON.stringify(bad))
  check((ve.lastResults['evil'] ?? '').includes('ERROR'), 'saveScript: rejection visible to the AI as ERROR')

  const again = ve.saveScript('bobber', 'w.createObject({ name: "q", kind: "cube", pos: [0, 1, 0] })')
  check(again.ok, 'saveScript: replacement accepted')
  check(engine.api.scripts.filter((s) => s.name === 'bobber').length === 1, 'saveScript: replacement replaces (no dupes)')
  check(engine.api.objects.some((o) => o.name === 'q'), 'saveScript: replacement side effect ran against the world API')
}

console.log(`\nSAFETY-CHECK ${fail === 0 ? 'OK' : `FAILED (${fail} failure${fail === 1 ? '' : 's'})`} — ${pass} passed`)

/** runner (scripts/run-safety-check.mjs) reads this to set the exit code */
export const result: { pass: number; fail: number } = { pass, fail }
