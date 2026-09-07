/**
 * Thin client for a locally running Ollama server.
 * Uses only the /api/chat and /api/tags endpoints.
 */
export interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class OllamaClient {
  endpoint: string
  model: string

  constructor(endpoint = 'http://localhost:11434', model = 'llama3.2') {
    this.endpoint = endpoint.replace(/\/+$/, '')
    this.model = model
  }

  private url(path: string): string {
    return `${this.endpoint}${path}`
  }

  private async fetchWithTimeout(
    path: string,
    init: RequestInit,
    ms: number
  ): Promise<Response> {
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), ms)
    try {
      return await fetch(this.url(path), { ...init, signal: ctrl.signal })
    } finally {
      window.clearTimeout(timer)
    }
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.fetchWithTimeout('/api/tags', { method: 'GET' }, 3000)
      return res.ok
    } catch {
      return false
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await this.fetchWithTimeout('/api/tags', { method: 'GET' }, 4000)
      if (!res.ok) return []
      const json = (await res.json()) as { models?: { name?: string }[] }
      return (json.models ?? []).map((m) => m.name ?? '').filter(Boolean)
    } catch {
      return []
    }
  }

  /**
   * Send a chat turn and return the raw assistant text.
   * Ollama is asked for structured JSON via the prompt; parsing happens upstream.
   */
  async generate(user: string, system: string): Promise<string> {
    const messages: ChatTurn[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]
    const res = await this.fetchWithTimeout(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          options: { temperature: 0.9 },
        }),
      },
      60000
    )
    if (!res.ok) {
      throw new Error(`Ollama responded ${res.status}`)
    }
    const json = (await res.json()) as { message?: { content?: string } }
    const content = json.message?.content ?? ''
    if (!content) throw new Error('empty response from Ollama')
    return content
  }
}