// OllamaClient — thin, resilient wrapper around the local Ollama HTTP API.
//
// CREATOR talks to Ollama over the standard API:
//   GET  /api/tags            -> list installed models
//   POST /api/generate        -> single-turn completion
//   POST /api/chat            -> chat completion with history
// All calls are JSON + no streaming (keeps things simple and robust).
// The client never crashes the app: every method resolves to a "not
// connected" outcome and surfaces structured errors.

export interface OllamaModelInfo {
  name: string
  size: number
  /** "3.1b" style short label */
  short?: string
}

export interface OllamaStatus {
  connected: boolean
  message: string
  latencyMs: number | null
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  ok: boolean
  text: string
  model: string
  error?: string
}

interface TagsResponse {
  models?: { name: string; size?: number; details?: { parameter_size?: string } }[]
}

const DEFAULT_TIMEOUT_MS = 90000
const FETCH_TIMEOUT_MS = 4000

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

/** Normalize a user-typed endpoint to a base URL without a trailing slash. */
export function normalizeEndpoint(raw: string): string {
  let s = raw.trim()
  if (!s) s = 'http://localhost:11434'
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s
  s = s.replace(/\/+$/, '')
  // If the user pasted a full /api/... path, strip it.
  s = s.replace(/\/api\/?(generate|chat|tags)?$/, '')
  return s
}

export class OllamaClient {
  private base: string
  private proxied = false
  lastModel = ''

  constructor(endpoint: string) {
    this.base = normalizeEndpoint(endpoint)
  }

  setEndpoint(endpoint: string) {
    this.base = normalizeEndpoint(endpoint)
    this.proxied = false
  }

  get endpoint(): string {
    return this.base
  }

  private url(path: string): string {
    return `${this.base}${path}`
  }

  /**
   * fetch against the endpoint. If the direct call dies on a network/CORS
   * error (TypeError) and we are in the Vite dev server, retry through the
   * same-origin `/ollama` proxy — the dev server forwards it to Ollama, so
   * the app works even when Ollama denies cross-origin requests.
   */
  private async request(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    try {
      return await fetchWithTimeout(this.url(path), init, timeoutMs)
    } catch (e) {
      // CORS / connection failures surface as TypeErrors in browsers
      const dev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)
      if (dev && !this.proxied && e instanceof TypeError) {
        this.proxied = true
        return fetchWithTimeout(`/ollama${path}`, init, timeoutMs)
      }
      throw e
    }
  }

  /** Quick reachability check (cheap GET). */
  async ping(): Promise<OllamaStatus> {
    const started = performance.now()
    try {
      const res = await this.request('/api/tags', { method: 'GET' }, FETCH_TIMEOUT_MS)
      if (!res.ok) {
        return { connected: false, message: `Ollama responded ${res.status}`, latencyMs: null }
      }
      return { connected: true, message: 'connected', latencyMs: Math.round(performance.now() - started) }
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError'
        ? 'Ollama unreachable (timeout)'
        : 'Ollama unreachable'
      return { connected: false, message: msg, latencyMs: null }
    }
  }

  /** List locally installed models. */
  async listModels(): Promise<{ names: string[]; infos: Record<string, OllamaModelInfo>; error?: string }> {
    try {
      const res = await this.request('/api/tags', { method: 'GET' }, FETCH_TIMEOUT_MS)
      if (!res.ok) return { names: [], infos: {}, error: `HTTP ${res.status}` }
      const data = (await res.json()) as TagsResponse
      const names: string[] = []
      const infos: Record<string, OllamaModelInfo> = {}
      for (const m of data.models ?? []) {
        if (!m.name) continue
        names.push(m.name)
        const short = m.details?.parameter_size
        infos[m.name] = { name: m.name, size: m.size ?? 0, short }
      }
      names.sort((a, b) => a.localeCompare(b))
      return { names, infos }
    } catch {
      return { names: [], infos: {}, error: 'unreachable' }
    }
  }

  /**
   * Chat completion. `system` prompt, then turns; if `temperature` is
   * undefined a slightly greedy-but-creative default is used.
   */
  async chat(opts: {
    model: string
    system: string
    messages: ChatTurn[]
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
  }): Promise<ChatResponse> {
    const { model, system, messages, temperature = 0.85, maxTokens = 900, timeoutMs = DEFAULT_TIMEOUT_MS } = opts
    if (!model) return { ok: false, text: '', model: '', error: 'no model selected' }
    try {
      const res = await this.request(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: system }, ...messages],
            stream: false,
            options: { temperature, num_predict: maxTokens, num_ctx: 8192 },
          }),
        },
        timeoutMs,
      )
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        let reason = `HTTP ${res.status}`
        if (res.status === 404) reason = 'model not installed on this Ollama server'
        if (res.status === 400) reason = `request rejected: ${body.slice(0, 140)}`
        return { ok: false, text: '', model, error: reason }
      }
      const data = (await res.json()) as { message?: { content?: string }; error?: string; done?: boolean }
      if (data.error) return { ok: false, text: '', model, error: data.error }
      this.lastModel = model
      return { ok: true, text: (data.message?.content ?? '').trim(), model }
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError'
      return {
        ok: false,
        text: '',
        model,
        error: aborted ? `timed out after ${Math.round(timeoutMs / 1000)}s` : 'could not reach Ollama server',
      }
    }
  }
}
