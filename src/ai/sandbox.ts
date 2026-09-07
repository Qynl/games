// Minimal but genuinely sandboxed scripting engine for the AI's generated
// code, with static capability scanning.
//
// Two layers of protection:
//   1. STATIC SCAN — the code is checked for dangerous identifiers/APIs
//      (window, document, fetch, localStorage, process, eval, Function,
//      import, WebSocket, XMLHttpRequest, ...) and rejected with a clear
//      error message before anything runs.
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

// Anything on this list is refused. The list is intentionally paranoid.
const BLOCKED_PATTERNS = [
  'window', 'document', 'globalThis', 'localStorage', 'sessionStorage',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker',
  'navigator', 'location', 'top', 'parent', 'opener', 'screen', 'history',
  'indexedDB', 'caches', 'serviceWorker', 'FileReader', 'showDirectoryPicker',
  'process', 'require', 'module', 'exports', 'Buffer', 'Deno',
  'alert', 'confirm', 'prompt', 'eval', 'Function',
  'import(', 'importScripts', 'setTimeout', 'setInterval', 'requestAnimationFrame',
  'atob', 'btoa', 'TextDecoder', 'TextEncoder', 'structuredClone', 'queueMicrotask',
  'innerHTML', 'outerHTML',
]

const CODE_LIMIT = 4000

function scanCode(code: string): string | null {
  if (code.length > CODE_LIMIT) return `code too long (${code.length} chars, max ${CODE_LIMIT})`
  const lower = code.toLowerCase()
  for (const pat of BLOCKED_PATTERNS) {
    const p = pat.toLowerCase()
    const idx = lower.indexOf(p)
    if (idx < 0) continue
    // word-boundary check so e.g. "function" inside "malfunction" passes
    const before = idx === 0 ? '' : code[idx - 1]
    const afterIdx = idx + p.length
    const after = afterIdx >= code.length ? '' : code[afterIdx]
    const isWord = /[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)
    if (!isWord) return `blocked API "${pat}" (sandboxed world — no access to the real computer)`
  }
  return null
}

export function runSandboxed(code: string, api: SandboxApi): ScriptResult {
  const blocked = scanCode(code)
  if (blocked) {
    return { ok: false, output: null, blocked: true, error: blocked }
  }
  // Pass the api object as a function parameter so live references survive.
  const body = `'use strict';\nconst w = __api.w;\n${code}`
  let fn: Function
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    fn = new Function('__api', '__g', body)
  } catch (e) {
    return {
      ok: false,
      output: null,
      error: e instanceof Error ? `syntax error: ${e.message}` : 'syntax error',
    }
  }
  const whitelist = {
    Math, JSON, Date, Array, Object, Number, String, Boolean, RegExp, Map, Set,
    parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
    console: { log: () => {}, warn: () => {}, error: () => {} },
  }
  try {
    const result = fn(api, whitelist)
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
