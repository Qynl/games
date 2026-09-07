// Memory — short-term episodic memory + persistent session facts.
// Persisted across page reloads via localStorage (only in-memory data:
// no files, no system access).

export interface MemoryFact {
  id: string
  text: string
  kind: 'fact' | 'lesson' | 'note'
  at: number
  lastSeen: number
  weight: number
}

const KEY = 'creator.memory.v1'
const SHORT_TERM_MAX = 16
const FACTS_MAX = 26
const AGREE_MIN = 3

export class Memory {
  /** recent observations/outcomes — kept in order, oldest first */
  shortTerm: string[] = []
  /** consolidated, persistent facts */
  facts: MemoryFact[] = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const data = JSON.parse(raw) as { facts?: MemoryFact[] }
      if (Array.isArray(data.facts)) {
        this.facts = data.facts
          .filter((f) => typeof f?.text === 'string')
          .slice(-FACTS_MAX)
      }
    } catch {
      this.facts = []
    }
  }

  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ facts: this.facts.slice(-FACTS_MAX) }))
    } catch {
      // ignore quota / privacy mode
    }
  }

  /** push an event/observation into short-term memory */
  note(text: string) {
    this.shortTerm.push(text)
    if (this.shortTerm.length > SHORT_TERM_MAX) this.shortTerm.shift()
  }

  /** observe a durable fact; reinforces when it keeps showing up */
  observe(text: string, kind: MemoryFact['kind'] = 'fact', weight = 1) {
    const key = text.toLowerCase()
    const now = Date.now()
    const existing = this.facts.find((f) => f.text.toLowerCase() === key)
    if (existing) {
      existing.lastSeen = now
      existing.weight = Math.min(10, existing.weight + weight)
      if (existing.weight >= AGREE_MIN) {
        // it's a well established fact — surface more prominently
      }
      this.persist()
      return
    }
    // avoid near-duplicate clutter
    if (this.facts.some((f) => f.text.toLowerCase().includes(key.slice(0, 24)))) return
    this.facts.push({
      id: Math.random().toString(36).slice(2, 10),
      text,
      kind,
      at: now,
      lastSeen: now,
      weight: weight,
    })
    if (this.facts.length > FACTS_MAX) {
      this.facts.sort((a, b) => b.weight - a.weight)
      this.facts = this.facts.slice(0, FACTS_MAX)
    }
    this.persist()
  }

  /** list facts relevant to keywords in a query */
  recall(query?: string): MemoryFact[] {
    const q = (query ?? '').toLowerCase().split(/\W+/).filter((w) => w.length > 3)
    let list = this.facts
    if (q.length) {
      const scored = this.facts.map((f) => ({
        f,
        score: q.reduce((s, w) => s + (f.text.toLowerCase().includes(w) ? 1 : 0), 0),
      }))
      scored.sort((a, b) => b.score - a.score || b.f.weight - a.f.weight)
      list = scored.slice(0, 6).map((s) => s.f)
      if (list[0] && q.some((w) => !list[0].text.toLowerCase().includes(w))) {
        // fall back to most recent weighted facts as well
      }
      return list
    }
    return [...list].sort((a, b) => b.weight - a.weight).slice(0, 8)
  }

  forgetFact(text: string) {
    this.facts = this.facts.filter((f) => !f.text.toLowerCase().includes(text.toLowerCase()))
    this.persist()
  }

  clear() {
    this.shortTerm = []
    this.facts = []
    this.persist()
  }

  lastLines(n: number): string[] {
    return this.shortTerm.slice(-n)
  }
}
