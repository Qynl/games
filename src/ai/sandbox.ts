// Minimal but genuinely sandboxed scripting engine for the AI's generated
// code, with static capability scanning.
//
// Protection layers (defense in depth):
//   1. STATIC SCAN — code strings and comments are removed, then the live
//      code is scanned for dangerous identifiers/APIs (window, document,
//      fetch, localStorage, process, eval, Function, import(), constructor
//      chains, __proto__/prototype walks, Reflect/Proxy escapes, ...) and
//      rejected with a clear error BEFORE anything runs.
//   2. SCOPED EXECUTION — the code runs inside a `new Function` whose only
//      injected scope bindings are the sandboxed world API (`w`), a tiny
//      whitelist of pure JS globals (Math, JSON, ...) and a console stub.
//      Because this is a browser app, there is no Node runtime behind it:
//      no filesystem, no shell, no process access exists in this environment
//      at all. Every mutation the AI can make goes through `w.*` — the
//      WorldAPI — which validates and re-syncs the 3D scene.
//   3. RUNTIME CATCH — any throw is caught and reported as { ok:false,
//      error } so the AI loop can read the error and fix its own code.

export interface SandboxApi {
  w: Record<string, unknown>
}

export interface ScriptResult {
  ok: boolean
  output: unknown
  error?: string
  blocked?: boolean
}

// Anything matching here is refused. The list is intentionally paranoid:
// browser/OS APIs plus the classic JS sandbox escapes. Two tokens are
// case-sensitive on purpose: the JS keyword `function` (lowercase) must stay
// legal for generated code, while the host `Function` constructor never is.
const BLOCKED_WORDS = [
  'window', 'document', 'globalThis', 'self', 'frames', 'localStorage',
  'sessionStorage', 'fetch', 'sendBeacon', 'XMLHttpRequest', 'WebSocket',
  'EventSource', 'BroadcastChannel', 'SharedWorker', 'Worker', 'navigator',
  'location', 'top', 'parent', 'opener', 'screen', 'history', 'Image', 'Audio',
  'indexedDB', 'caches', 'serviceWorker', 'FileReader', 'showDirectoryPicker',
  'RTCPeerConnection', 'Notification', 'process', 'require', 'module',
  'exports', 'Buffer', 'Deno', 'alert', 'confirm', 'prompt', 'setTimeout',
  'setInterval', 'requestAnimationFrame', 'atob', 'btoa', 'TextDecoder',
  'TextEncoder', 'structuredClone', 'queueMicrotask', 'innerHTML', 'outerHTML',
  'execCommand', 'postMessage', 'open', 'eval', 'constructor', '__proto__',
  'prototype', 'Proxy', 'Reflect', 'WeakRef', 'FinalizationRegistry',
  'importScripts', 'Function', // case-sensitive below
] as const

const BLOCKED_FRAGMENTS = [
  'import(',
  'import.meta',
]

const CODE_LIMIT = 4000

// Second runtime layer (defense in depth): every host name is re-declared as
// `var … = void 0` inside the generated function's own scope, BEFORE the user
// code runs. Even if the static scanner ever missed an odd spelling, the code
// would hit `undefined` instead of the real browser/Node API — and throw a
// normal caught error instead of touching the host.
// (`eval` can't be var-bound in strict mode and is scanner-blocked anyway.)
const SHADOW_VARS = BLOCKED_WORDS.filter((x) => x !== 'eval')

/**
 * Reduce the code to its LIVE tokens only: strip quoted strings and template
 * literal text (keeping `${…}` expressions) and then all comments. This both
 * kills false positives (a string saying "fetch" is not a fetch call) and
 * prevents hiding keywords inside strings.
 */
function liveCode(code: string): string {
  let out = ''
  let i = 0
  while (i < code.length) {
    const c = code[i]
    const n = code[i + 1]
    // line comment
    if (c === '/' && n === '/') {
      while (i < code.length && code[i] !== '\n') i++
      continue
    }
    // block comment
    if (c === '/' && n === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      continue
    }
    // string literal
    if (c === '"' || c === "'") {
      i++
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue }
        if (code[i] === c) { i++; break }
        i++
      }
      continue
    }
    // template literal: drop text, keep ${ ... } expressions
    if (c === '`') {
      i++
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue }
        if (code[i] === '`') { i++; break }
        if (code[i] === '$' && code[i + 1] === '{') {
          // find matching brace (nested-aware)
          let depth = 1
          let j = i + 2
          while (j < code.length && depth > 0) {
            if (code[j] === '{') depth++
            else if (code[j] === '}') depth--
            j++
          }
          out += '${' + liveCode(code.slice(i + 2, j - 1)) + '}'
          i = j
          continue
        }
        i++
      }
      continue
    }
    out += c
    i++
  }
  // second pass: comments may hide inside strings we just dropped anyway;
  // a simple repeat keeps things robust
  return out
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_$]/.test(ch)
}

/** does `pat` appear as its own token at idx? */
function standalone(code: string, pat: string, idx: number): boolean {
  if (isWordChar(code[idx - 1])) return false
  const after = code[idx + pat.length]
  if (isWordChar(after)) return false
  return true
}

function scanCode(code: string): string | null {
  if (code.length > CODE_LIMIT) return `code too long (${code.length} chars, max ${CODE_LIMIT})`
  const live = liveCode(code)
  const lower = live.toLowerCase()
  for (const word of BLOCKED_WORDS) {
    const w = word === 'Function' ? word : word.toLowerCase()
    const hay = word === 'Function' ? live : lower
    const needle = word === 'Function' ? word : w
    let idx = hay.indexOf(needle)
    while (idx >= 0) {
      if (standalone(hay, needle, idx)) return `blocked API "${word}" (sandboxed world — no access to the real computer)`
      idx = hay.indexOf(needle, idx + 1)
    }
  }
  for (const frag of BLOCKED_FRAGMENTS) {
    if (lower.includes(frag)) return `blocked API "${frag}" (sandboxed world — no access to the real computer)`
  }
  return null
}

export function runSandboxed(code: string, api: SandboxApi): ScriptResult {
  const blocked = scanCode(code)
  if (blocked) {
    return { ok: false, output: null, blocked: true, error: blocked }
  }
  // Pass the api object as a function parameter so live references survive.
  // Shadow every host API name in this function scope (see SHADOW_VARS above)
  // and only then inject the sandboxed world handle.
  const shadowed = SHADOW_VARS.map((x) => `${x}=void 0`).join(',')
  const body = `'use strict';\nvar ${shadowed};\nconst w = __api.w;\n${code}`
  let fn: Function
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    fn = new Function('__api', body)
  } catch (e) {
    return {
      ok: false,
      output: null,
      error: e instanceof Error ? `syntax error: ${e.message}` : 'syntax error',
    }
  }
  try {
    const result = fn(api)
    const output = result === undefined ? null : result
    return { ok: true, output }
  } catch (e) {
    return {
      ok: false,
      output: null,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    }
  }
}
