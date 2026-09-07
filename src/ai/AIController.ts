// AIController — the autonomous brain.
//
// Loop (not request-driven):
//   1. observe the world + the player (compact snapshot)
//   2. think about what it wants to do (Ollama planner prompt)
//   3. act through tools (WorldAPI) or speak
//   4. read the tool results on the next observation and react
//   5. repeat, on its own schedule — or when the player interrupts
//
// Everything is decoupled from React: the controller only pushes small UI
// state updates through onUi() and speaks through onSpeech().

import type { CurrentTask, Expression, LogLine, Phase, SpeechEntry } from '../types'
import { capLen } from '../utils/helpers'
import type { OllamaClient } from './OllamaClient'
import type { Memory } from './Memory'
import type { VirtualEditor } from '../editor/VirtualEditor'
import type { GameEngine, EngineEvent } from '../game/GameEngine'
import { makePlannerSystem, ACTOR_TOOLS } from './prompts'
import { buildContext } from './ContextBuilder'

export interface Bubble {
  id: number
  text: string
  at: number
  dur: number
  energy: number
}

export interface AiUiState {
  phase: Phase
  expr: Expression
  phaseDetail: string
  bubble: Bubble | null
  thinking: string
  modelBusy: boolean
}

export interface AIControllerOpts {
  engine: GameEngine
  ollama: OllamaClient
  memory: Memory
  editor: VirtualEditor
  getSettings: () => { model: string; autonomous: boolean; interval: number; ollamaUrl: string }
  onUi: (partial: Partial<AiUiState>) => void
  onSpeech: (speaker: 'ai' | 'system' | 'npc', text: string) => void
  onLog: (line: LogLine) => void
}

interface QueueItem {
  kind: 'msg' | 'event' | 'action'
  text: string
  at: number
  force: boolean
}

const MAX_TOOLS_PER_CYCLE = 12

const OFFLINE_LINES = [
  '...my brain is offline. hold on.',
  'I would build something right now but my model server is gone.',
  'if you see this, Ollama is not running. fix it, I have IDEAS.',
  'no thoughts. head empty. (ollama offline)',
  'I can see you. I just cannot think. awkward.',
]

export class AIController {
  engine: GameEngine
  ollama: OllamaClient
  memory: Memory
  editor: VirtualEditor
  getSettings: AIControllerOpts['getSettings']
  private onUi: AIControllerOpts['onUi']
  private onSpeech: AIControllerOpts['onSpeech']
  private onLog: AIControllerOpts['onLog']

  phase: Phase = 'idle'
  expr: Expression = 'neutral'
  private phaseDetail = ''
  private bubble: Bubble | null = null
  private thinking = ''
  busy = false
  started = false
  online = false
  private bubbleId = 0

  private tickN = 0
  private nextTickAt = 0
  private lastSeenEvent = 0
  private lastReplyAt = 0
  private queue: QueueItem[] = []
  private offlineAt = 0
  private idleSince = performance.now()
  private errorStreak = 0
  private lastOutcome = ''
  private cycleActive = false
  private lastOfflineSpeak = 0
  private sessionStart = performance.now()
  private greeted = false
  private offlineIdx = 0
  /** rolling chat/speech memory shown to the model */
  private speechLog: SpeechEntry[] = []
  private speechId = 0

  constructor(opts: AIControllerOpts) {
    this.engine = opts.engine
    this.ollama = opts.ollama
    this.memory = opts.memory
    this.editor = opts.editor
    this.getSettings = opts.getSettings
    this.onUi = opts.onUi
    this.onSpeech = opts.onSpeech
    this.onLog = opts.onLog
    this.nextTickAt = performance.now() + 2500
  }

  // -------------------------------------------------------------- UI state
  private setState(p: Partial<AiUiState>) {
    if (p.phase !== undefined) this.phase = p.phase
    if (p.expr !== undefined) this.expr = p.expr
    if (p.phaseDetail !== undefined) this.phaseDetail = p.phaseDetail
    if (p.bubble !== undefined) this.bubble = p.bubble
    if (p.thinking !== undefined) this.thinking = p.thinking
    this.onUi({
      phase: this.phase,
      expr: this.expr,
      phaseDetail: this.phaseDetail,
      bubble: this.bubble,
      thinking: this.thinking,
      modelBusy: this.busy,
    })
  }

  getPhaseDetail() {
    return this.phaseDetail
  }

  // ------------------------------------------------------------- speaking
  private logSpeech(speaker: SpeechEntry['speaker'], text: string) {
    this.speechLog.push({ id: ++this.speechId, speaker, text, at: Date.now() })
    if (this.speechLog.length > 30) this.speechLog.shift()
  }

  /** speak without a face bubble (used for longer narration lines) */
  private chatSay(text: string) {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return
    this.logSpeech('ai', clean)
    this.onSpeech('ai', clean)
  }

  speak(text: string, energy = 0.7) {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return
    this.logSpeech('ai', clean)
    this.onSpeech('ai', clean)
    const dur = Math.min(9, 2 + clean.length * 0.045)
    this.setState({
      bubble: { id: ++this.bubbleId, text: clean, at: performance.now(), dur, energy },
    })
    if (!this.busy) {
      this.setState({ phase: 'speaking' })
      setTimeout(() => {
        if (this.phase === 'speaking' && !this.busy) this.setState({ phase: 'idle' })
      }, Math.min(dur * 1000, 6000))
    }
    this.memory.note(`AI said: "${capLen(clean, 90)}"`)
  }

  systemSay(text: string) {
    this.onSpeech('system', text)
  }

  /** called by the session when the player sends a chat message */
  playerSaid(text: string) {
    this.logSpeech('player', text)
    this.memory.observe(`player said "${capLen(text, 70)}"`, 'fact', 1)
    this.queue.push({ kind: 'msg', text, at: performance.now(), force: false })
  }

  /** external nudge (UI buttons etc.) */
  nudge(text: string, force = false) {
    this.queue.push({ kind: 'action', text, at: performance.now(), force })
  }

  // ------------------------------------------------------------------ tick
  update(dt: number) {
    void dt
    // drain engine events
    const evs = this.engine.events
    while (this.lastSeenEvent < evs.length) {
      const e = evs[this.lastSeenEvent]
      this.lastSeenEvent += 1
      this.handleEngineEvent(e)
    }
    if (this.cycleActive) return // llm in flight; events queue up
    const now = performance.now()
    // a pending player message or priority event triggers an early cycle
    const urgent = this.queue.find((q) => q.kind === 'msg' || q.force)
    if (urgent && now - this.lastReplyAt > 600) {
      this.cycle('react')
      return
    }
    const s = this.getSettings()
    const online = this.online
    if (now < this.nextTickAt) return
    if (!online) {
      // offline: never build, but still a presence — mutters to itself
      // sometimes and answers when spoken to
      this.idleSince = now
      if (this.queue.length && now - this.lastReplyAt > 3000) {
        this.offlineReact()
      } else if (now - this.lastOfflineSpeak > 40000 + Math.random() * 30000) {
        this.lastOfflineSpeak = now
        const line = OFFLINE_LINES[this.offlineIdx % OFFLINE_LINES.length]
        this.offlineIdx += 1
        this.speak(line, 0.35)
      }
      this.nextTickAt = now + 8000 + Math.random() * 7000
      return
    }
    if (!s.autonomous) {
      this.setState({ phase: 'idle', phaseDetail: 'autonomous loop paused' })
      this.scheduleNext('auto', true)
      return
    }
    if (!this.queue.length && !this.engine.course && !this.engine.api.scripts.length && now - this.sessionStart < 30000) {
      void s
      this.scheduleNext('startup')
      this.cycle('startup')
      return
    }
    this.cycle('auto')
  }

  private offlineReact() {
    const line = OFFLINE_LINES[this.offlineIdx % OFFLINE_LINES.length]
    this.offlineIdx += 1
    const q = this.queue.shift()
    if (q?.kind === 'msg') this.onSpeech('system', '(Ollama offline)')
    this.speak(line, 0.4)
    this.lastReplyAt = performance.now()
  }

  private handleEngineEvent(e: EngineEvent) {
    const prio = ['win', 'death', 'loseLife', 'scene', 'react', 'outOfBounds', 'squish'].includes(e.kind)
    if (e.kind === 'win') {
      this.memory.observe(`the player completed "${this.engine.course?.title ?? 'a course'}"`, 'fact', 3)
      this.queue.unshift({ kind: 'event', text: e.text, at: performance.now(), force: true })
      return
    }
    if (e.kind === 'death') {
      this.memory.observe('the player keeps dying — they are either brave or careless', 'fact', 1)
    }
    if (prio) {
      this.queue.unshift({ kind: 'event', text: e.text, at: performance.now(), force: false })
    }
    if (e.kind === 'npcTalk') return // npc chatter is not for the ai
    if (e.kind === 'checkpoint' || e.kind === 'collect' || e.kind === 'fall' || e.kind === 'hazard') {
      this.memory.note(e.text)
    }
  }

  // ---------------------------------------------------------------- cycles
  /** next wake-up: respects the user's interval setting */
  private scheduleNext(reason: 'auto' | 'react' | 'startup', idle = false) {
    const iv = Math.min(12, Math.max(1.2, this.getSettings().interval || 2.6))
    const base = idle ? iv * 1.9 : iv
    const jitter = 0.85 + Math.random() * 0.5
    let ms = base * 1000 * jitter
    if (reason === 'react') ms = Math.min(ms, Math.max(1400, iv * 560))
    if (reason === 'startup') ms = 1100
    this.nextTickAt = performance.now() + ms
  }

  private async cycle(reason: 'auto' | 'react' | 'startup') {
    if (this.cycleActive) return
    this.cycleActive = true
    this.busy = true
    this.setState({ modelBusy: true })
    try {
      this.tickN += 1
      const s = this.getSettings()
      const useShort = /(7b|3b|1\.5b|8b|llama3\.2|qwen2\.5:1)/i.test(s.model) && reason === 'auto'
      const ctx = this.observe(reason)
      this.setState({ phase: 'thinking', expr: 'thinking', phaseDetail: reason === 'react' ? 'reacting' : 'thinking about the world' })
      const res = await this.ollama.chat({
        model: s.model,
        system: makePlannerSystem(useShort),
        messages: [{ role: 'user', content: ctx }],
        temperature: reason === 'auto' ? 0.95 : 0.75,
        maxTokens: 780,
      })
      if (!res.ok) {
        this.online = false
        this.setState({ phase: 'offline', expr: 'error', phaseDetail: res.error ?? 'ollama offline' })
        this.onLog({ at: Date.now(), text: `AI call failed: ${res.error}`, level: 'error' })
        this.scheduleNext(reason, true)
        return
      }
      this.online = true
      if (!this.greeted) this.greeted = true
      this.setState({ phase: 'working', expr: 'working' })
      await this.actOnReply(res.text)
      this.lastReplyAt = performance.now()
      this.scheduleNext(reason, this.lastOutcome.startsWith('idle'))
      this.idleSince = performance.now()
    } catch (e) {
      this.onLog({ at: Date.now(), text: `AI loop error: ${e instanceof Error ? e.message : String(e)}`, level: 'error' })
      this.setState({ phase: 'error', expr: 'error' })
      this.scheduleNext(reason, true)
    } finally {
      this.busy = false
      this.cycleActive = false
      this.setState({ modelBusy: false })
      if (this.phase === 'working' || this.phase === 'thinking') this.setState({ phase: 'idle' })
    }
  }

  /** compact observation text for the planner model */
  private observe(reason: 'auto' | 'react' | 'startup'): string {
    const p = this.engine.playerSnapshot()
    const now = performance.now()
    const sinceLast = this.lastReplyAt
    const playerActions = this.engine.activitySince(Math.max(0, now - 6000))
    const activityMs = now - Math.max(this.engine.lastActivityAt(), this.engine.api.lastMessageAt)
    // a lightweight sense of "current project" so the model keeps iterating
    // on what exists instead of starting from zero every single turn
    const course = this.engine.course
    const task = course
      ? {
          id: 'project',
          goal: `ongoing project: "${course.title}" — ${course.objective}`,
          plan: [
            `check the current state of "${course.title}" (use status/listObjects)`,
            'fix or improve what the player would notice; keep it playable',
            `make sure it is winnable (${course.winMode}) — checkpoints, no impossible jumps`,
          ],
          stepIndex: 0,
          startedAt: Date.now(),
          deadline: Date.now() + 3600e3,
        }
      : null
    const ctx = buildContext({
      memory: this.memory,
      player: p,
      objectsNear: (this.engine.contextData().objectsNear ?? []) as { name: string; kind: string; d: number; at: number[] }[],
      npcsNear: (this.engine.contextData().npcsNear ?? []) as { name: string; kind: string; d: number; animating: boolean }[],
      worldStatus: this.engine.worldStatus(),
      recentHistory: this.engine.history.slice(-8),
      recentSpeech: this.speechLog,
      task,
      phase: this.phase,
      chatOpen: false,
      nowSec: (now - this.sessionStart) / 1000,
      tick: this.tickN,
      model: this.getSettings().model,
      uptimeSec: (now - this.sessionStart) / 1000,
      playerActivitySec: activityMs / 1000,
    })

    const parts: string[] = []
    parts.push(`Reason for this turn: ${reason === 'react' ? 'the player or a big event interrupted you — react now' : reason === 'startup' ? 'session start — introduce yourself and start doing something' : 'autonomous decision turn'}`)
    if (reason === 'react') {
      const msgs = this.queue.filter((q) => q.kind === 'msg').map((q) => q.text).slice(-2)
      if (msgs.length) parts.push(`[player message] ${msgs.join(' | ')}`)
      const evs = this.queue.filter((q) => q.kind === 'event').map((q) => q.text).slice(-3)
      if (evs.length) parts.push(`[big event just now] ${evs.join(' | ')}`)
    } else {
      const evs = this.queue.filter((q) => q.kind === 'event').map((q) => q.text).slice(-4)
      if (evs.length) parts.push(`[recent big events] ${evs.join(' | ')}`)
    }
    if (playerActions.length) {
      const kinds = countActions(playerActions)
      const desc = Object.entries(kinds).map(([k, v]) => `${k} x${v}`).join(', ')
      parts.push(`[player actions last 6s] ${desc}`)
    } else {
      parts.push('[player actions last 6s] none')
    }
    parts.push(`[last turn] ${this.lastOutcome || 'first turn of the session'}`)
    parts.push('[you] below:')
    parts.push(ctx)
    parts.push('\nNow decide what to do. Respond with a natural short line of dialogue and/or tool calls.')
    // clear consumed interrupts (events already reflected above)
    this.queue = []
    void sinceLast
    return parts.join('\n')
  }

  /** execute the model's reply: speech lines + tool calls */
  private async actOnReply(reply: string) {
    const lines = this.parse(reply)
    let built = 0
    let said = 0
    let tools = 0
    const results: string[] = []
    let stoppedEarly = false
    for (const line of lines) {
      if (line.kind === 'say') {
        said += 1
        const t = (line.text ?? '').trim()
        if (!t) continue
        // short lines pop as face bubbles; longer narration is chat-only
        if (t.length <= 88 && said <= 3) this.speak(t, 0.8)
        else this.chatSay(t)
      } else if (line.kind === 'tool') {
        if (tools >= MAX_TOOLS_PER_CYCLE) {
          stoppedEarly = true
          continue
        }
        tools += 1
        this.setState({ phase: 'working', expr: 'working', phaseDetail: `running ${line.name}()` })
        const r = this.runTool(line.name ?? '', line.args)
        results.push(r.trim())
        if (r.startsWith('error') || r.startsWith('fail')) this.errorStreak += 1
        else this.errorStreak = 0
        built += 1
        // let the UI breathe between builds
        if (tools % 4 === 0) await sleep(40)
      }
    }
    if (this.errorStreak >= 4) {
      this.errorStreak = 0
      this.speak('ok, that API call keeps failing. changing approach.', 0.6)
      this.memory.observe('I keep failing a WorldAPI call — I should look up exact names/args', 'lesson', 2)
    }
    if (built) this.engine.api.commit('AI applied changes to the world')
    if (results.length) {
      this.lastOutcome = `I ${said ? 'spoke' : ''}${said && tools ? ' and ' : ''}${tools ? `made ${tools} tool call${tools === 1 ? '' : 's'}` : 'did not use tools'}.` +
        (stoppedEarly ? ' (more actions queued for next turns)' : '') +
        `\n[tool results]\n${results.slice(-MAX_TOOLS_PER_CYCLE).join('\n')}`
    } else if (said) {
      this.lastOutcome = `I said: "${reply.slice(0, 90)}"`
    } else {
      this.lastOutcome = 'idle — nothing to do'
    }
    // remember failures for self-correction next turn
    const errors = results.filter((r) => r.startsWith('error') || r.startsWith('fail'))
    if (errors.length) this.lastOutcome += `\n[WARNING] ${errors.length} tool call(s) failed this turn — check names/args/limits and retry differently next turn`
  }

  // ---------------------------------------------------------------- parser
  /**
   * Model replies are fragile free text; we intentionally accept several
   * shapes: <tool>name</tool> + JSON on the next line, same-line JSON after
   * the closing tag, multi-line JSON objects, stray markdown fences, quote
   * bubbles "..." and <bubble>…</bubble> lines. Anything else becomes
   * spoken narration. Never throws.
   */
  private parse(reply: string): { kind: 'say' | 'tool'; text?: string; name?: string; args?: unknown }[] {
    const out: { kind: 'say' | 'tool'; text?: string; name?: string; args?: unknown }[] = []
    const lines = reply.split('\n').filter((l) => !/^\s*```/.test(l))
    let textBuf: string[] = []
    const pushSay = (raw: string) => {
      const t = raw.replace(/<\/?[a-zA-Z][^>]*>/g, '').replace(/^[\s*>-]+/, '').trim()
      if (t) out.push({ kind: 'say', text: t })
    }
    const flushText = () => {
      const t = textBuf.join(' ').trim()
      textBuf = []
      if (t) {
        // text that is not a bubble tag goes to chat-style speech
        out.push({ kind: 'say', text: t })
      }
    }
    const parseJson = (raw: string): unknown | undefined => {
      const clean = raw.replace(/,\s*([}\]])/g, '$1')
      try {
        const v = JSON.parse(clean)
        return v && typeof v === 'object' && !Array.isArray(v) ? v : undefined
      } catch {
        return undefined
      }
    }

    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      if (!line) {
        i++
        continue
      }
      // fence contents may still hold valid calls; skip fence markers only
      if (line.startsWith('```')) {
        i++
        continue
      }
      // inline bubble: <bubble>text</bubble> possibly wrapped with other text
      const bubbleMatch = line.match(/^<bubble>([\s\S]*?)<\/bubble>$/i)
      if (bubbleMatch) {
        flushText()
        const t = bubbleMatch[1].trim()
        if (t) out.push({ kind: 'say', text: t })
        i++
        continue
      }
      // <bubble> that opens but closes later — gather until close tag
      if (/<bubble>/i.test(line) && !/<\/bubble>/i.test(line)) {
        const buf = [line]
        let j = i + 1
        while (j < lines.length && !/<\/bubble>/i.test(lines[j])) {
          buf.push(lines[j])
          j++
        }
        if (j < lines.length) buf.push(lines[j])
        const joined = buf.join(' ').replace(/<\/?bubble>/gi, '').trim()
        flushText()
        if (joined) out.push({ kind: 'say', text: joined })
        i = j + 1
        continue
      }
      // tool call: <tool>name</tool> optionally followed by JSON on the same line
      const toolMatch = line.match(/^<tool>([a-zA-Z0-9_.-]+)<\/tool>\s*(.*)$/i)
      if (toolMatch) {
        flushText()
        const name = toolMatch[1].trim()
        let argsRaw = toolMatch[2].trim()
        let consumed = i
        if (!argsRaw) {
          // next non-empty line(s) hold the JSON object
          let j = i + 1
          const buf: string[] = []
          let depth = 0
          while (j < lines.length) {
            const cand = lines[j].trim()
            if (!cand && !buf.length) {
              j++
              continue
            }
            // stop at the next call/tag
            if (/^<\/?[a-zA-Z]/.test(cand) && !cand.startsWith('{')) break
            buf.push(cand)
            for (const c of cand) {
              if (c === '{' || c === '[') depth++
              else if (c === '}' || c === ']') depth--
            }
            if (depth <= 0) break
            j++
          }
          if (buf.length) {
            argsRaw = buf.join(' ')
            consumed = Math.min(j, lines.length - 1)
            if (consumed < i) consumed = i
          }
        }
        const args = argsRaw ? parseJson(argsRaw) : undefined
        out.push({ kind: 'tool', name, args: args ?? {} })
        i = Math.max(i + 1, consumed + 1)
        continue
      }
      // quoted one-liner "..." / “...”
      const quote = line.match(/^["“](.{1,140})["”]$/)
      if (quote) {
        flushText()
        out.push({ kind: 'say', text: quote[1].trim() })
        i++
        continue
      }
      // plain narration — buffer adjacent lines into one speech entry
      textBuf.push(line)
      i++
    }
    flushText()
    return out
  }

  // ------------------------------------------------------------ tool runner
  runTool(name: string, rawArgs: unknown): string {
    const api = this.engine.api
    const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>
    const pick = (k: string, d = ''): string => (typeof args[k] === 'string' ? String(args[k]).trim() : d)
    const pickArr = (k: string): number[] | null => {
      const v = args[k]
      return Array.isArray(v) && v.length >= 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
        ? (v as number[])
        : null
    }
    const pickNum = (k: string, d?: number): number | undefined => (typeof args[k] === 'number' ? Number(args[k]) : d)
    const a3 = (k: string): [number, number, number] | undefined => {
      const v = pickArr(k)
      return v && v.length === 3 ? (v as [number, number, number]) : undefined
    }
    const tryApi = (fn: () => unknown): string => {
      try {
        const v = fn()
        if (v === undefined || v === null) return 'ok'
        // world-state objects are summarized — the full blob is not useful
        const o = v as { id?: string; name?: string; kind?: string } | null
        if (typeof v === 'object' && v !== null && typeof o?.id === 'string' && typeof o?.name === 'string') {
          const n = o.kind ?? o.id.slice(0, 3)
          return `ok: ${n} "${o.name}" (${o.id})`
        }
        const s = typeof v === 'string' ? v : JSON.stringify(v)
        return capLen(s, 300)
      } catch (e) {
        this.onLog({ at: Date.now(), text: `WorldAPI error in ${name}: ${e instanceof Error ? e.message : String(e)}`, level: 'error' })
        return `error: ${e instanceof Error ? e.message : String(e)}`
      }
    }
    switch (name) {
      case 'say': {
        const text = String(args.text ?? args.line ?? '')
        if (text) this.speak(text, 0.8)
        return `ok: said "${capLen(text, 60)}"`
      }
      case 'chat': {
        const text = String(args.text ?? '')
        if (text) this.speak(text, 0.8)
        return 'ok'
      }
      case 'createGame': {
        const label = String(args.label ?? args.scene ?? args.name ?? '')
        if (!label) return 'error: createGame needs a label'
        return this.buildGame(label)
      }
      case 'recall': {
        const q = String(args.query ?? args.text ?? '')
        const facts = this.memory.recall(q || undefined)
        return facts.length ? facts.map((f) => `"${f.text}"`).join(' | ') : 'no relevant memories yet'
      }
      case 'remember': {
        this.memory.observe(String(args.text ?? args.fact ?? ''), 'fact', 1)
        return 'ok: remembered'
      }
      case 'addObjective':
        return tryApi(() => api.createObjective(String(args.text ?? '')))
      case 'listTools':
        return ACTOR_TOOLS.join('\n')
      // -------- convenience verbs that map onto object tags/recipes --------
      case 'createCollectible': {
        const pos = a3('pos')
        if (!pos) return 'error: createCollectible needs pos:[x,y,z]'
        const count = Math.max(1, Math.min(20, Math.round(pickNum('count', 1) ?? 1)))
        const made: string[] = []
        for (let i = 0; i < count; i++) {
          const o = api.createObject({
            kind: 'gem',
            shape: 'gem',
            name: `coin_${made.length}`,
            pos: [pos[0] + (i % 3) * 1.4 - 1.4, pos[1] + 1.1, pos[2] + Math.floor(i / 3) * 1.4],
            scale: 0.5,
            color: '#ffd23f',
            emissive: '#ffd23f',
            emissiveIntensity: 1,
            category: 'prop',
            tags: ['collectible'],
            body: 'kinematic',
            solid: false,
          })
          made.push(o.name)
        }
        return `ok: ${made.length} coins placed`
      }
      case 'createCheckpoint': {
        const pos = a3('pos')
        if (!pos) return 'error: createCheckpoint needs pos:[x,y,z]'
        const o = api.createObject({
          kind: 'cp',
          shape: 'cylinder',
          name: pick('name', 'cp') || 'cp',
          pos,
          scale: [0.5, 2.4, 0.5],
          color: '#7ecb6b',
          category: 'block',
          tags: ['checkpoint'],
          solid: false,
        })
        return `ok: checkpoint "${o.name}" at ${pos[0].toFixed(0)},${pos[2].toFixed(0)}`
      }
      case 'addZone': {
        // map zone mode onto the engine's tag language
        const pos = a3('pos')
        const size = a3('size')
        if (!pos || !size) return 'error: addZone needs pos + size:[x,y,z]'
        const mode = pick('mode', 'message')
        if (mode === 'hazard' || mode === 'lava') {
          const o = api.createObject({
            kind: 'lava',
            shape: 'box',
            name: pick('name', 'lava'),
            pos: [pos[0], pos[1] + 0.03, pos[2]],
            scale: size,
            color: '#ff5a1e',
            emissive: '#ff5a1e',
            emissiveIntensity: 1.2,
            category: 'block',
            tags: ['hazard'],
            solid: false,
          })
          return `ok: hazard zone "${o.name}" (lava — warns the player to jump it)`
        }
        if (mode === 'checkpoint') {
          const o = api.createObject({
            kind: 'cp',
            shape: 'cylinder',
            name: pick('name', 'cp'),
            pos,
            scale: [0.6, Math.max(size[1] ?? 1, 2.4), 0.6],
            color: '#7ecb6b',
            category: 'block',
            tags: ['checkpoint'],
            solid: false,
          })
          return `ok: checkpoint zone "${o.name}"`
        }
        if (mode === 'win' || mode === 'finish') {
          const o = api.createObject({
            kind: 'finish',
            shape: 'torus',
            name: pick('name', 'finish_gate'),
            pos: [pos[0], pos[1] + (size[1] ?? 3) / 2 + 1, pos[2]],
            scale: 1.6,
            color: '#ffd23f',
            emissive: '#ffd23f',
            emissiveIntensity: 1.4,
            category: 'block',
            tags: ['finish'],
            solid: false,
          })
          return `ok: finish gate "${o.name}" (walk through it — wins the current course)`
        }
        return `ok: message zone ${pick('name', 'zone')} recorded (${pick('message', '') || 'no message'})`
      }
      default: {
        // WorldAPI passthrough. Single-object-argument methods pass `args`
        // straight through; positional ones are adapted here.
        const fn = (api as unknown as Record<string, unknown>)[name]
        if (typeof fn !== 'function') return `error: unknown tool "${name}"`
        const call = (p: unknown[] = [args]) => tryApi(() => (fn as (...a: unknown[]) => unknown).call(api, ...p))
        switch (name) {
          case 'createObject': {
            const o = { ...args } as Record<string, unknown>
            if (Array.isArray(o.rot)) o.rot = (o.rot as number[]).map((d) => d * (Math.PI / 180))
            return call([o])
          }
          case 'deleteObject':
            return call([pick('id') || pick('name')])
          case 'moveObject':
            return call([pick('id') || pick('name'), a3('pos') ?? [0, 0, 0]])
          case 'rotateObject': {
            const deg = a3('rot')
            const rad = deg ? (deg.map((d) => d * (Math.PI / 180)) as [number, number, number]) : [0, 0, 0]
            return call([pick('id') || pick('name'), rad])
          }
          case 'scaleObject':
            return call([pick('id') || pick('name'), (args.scale as number | number[]) ?? 1])
          case 'paintObject':
            return call([pick('id') || pick('name'), pick('color', '#7fa1c4')])
          case 'physicsBody':
            return call([pick('id') || pick('name'), pick('body', 'static') as 'static' | 'dynamic' | 'kinematic'])
          case 'material':
            return call([pick('id') || pick('name'), args])
          case 'cloneObject':
            return call([pick('id') || pick('name')])
          case 'getObject':
            return call([pick('id') || pick('name')])
          case 'listObjects':
            return call([{ filter: pick('filter', 'all'), count: pickNum('count', 12) }])
          case 'findObjectsNear':
            return call([a3('pos') ?? [0, 0, 0], pickNum('radius', 10), pick('filter', 'all')])
          case 'countObjects':
            return call([])
          case 'clearObjects':
            return call([{ except: Array.isArray(args.except) ? (args.except as string[]) : undefined }])
          case 'removeNPC':
            return call([pick('name') || pick('id')])
          case 'npcChat':
            return call([pick('name'), [pick('text')]])
          case 'removeVehicle':
            return call([pick('name') || pick('id')])
          case 'changeWeather': {
            const w = pick('weather')
            if (w) return call([{ rain: w === 'rain' || w === 'snow', intensity: w === 'clear' ? 0.1 : 0.7 }])
            return call([{ rain: Boolean(args.rain), intensity: pickNum('intensity', 0.6) }])
          }
          case 'changeTime':
            return call([pickNum('time', 12)])
          case 'setDayNightCycle':
            return call([pickNum('secondsPerDay', 300)])
          case 'createObjective':
            return call([pick('text')])
          case 'status':
          case 'listScripts':
          case 'listEvents':
          case 'clearTerrain':
            return call([])
          default:
            return call([args])
        }
      }
    }
  }

  /** createGame via the recipe engine */
  private buildGame(label: string): string {
    const api = this.engine.api
    const info = this.engine.buildScene(label)
    if (!info || !info.built) return `error: could not create game "${label}"`
    if (info.objective) {
      api.createObjective(info.objective)
      this.systemSay(`objective: ${info.objective}`)
    }
    this.memory.observe(`I built a "${info.title}" scenario`, 'fact', 2)
    this.speak(`ok. ${info.title}. ready.`, 0.5)
    return `ok: scene built — "${info.title}". ${info.description}`
  }

  // ------------------------------------------------------------------ misc
  setOnline(o: boolean) {
    if (this.online === o) return
    this.online = o
    if (!o) {
      // not a crash — the head just dozes until its model server returns
      this.setState({ phase: 'offline', expr: 'sleep', phaseDetail: 'waiting for Ollama' })
      this.nextTickAt = performance.now() + 3000
    } else {
      this.setState({ phase: 'idle', expr: 'neutral', phaseDetail: 'online' })
      this.queue.push({ kind: 'action', text: 'reconnected', at: performance.now(), force: true })
      this.scheduleNext('startup')
    }
  }

  uiBubble(): Bubble | null {
    return this.bubble
  }
}

function countActions(actions: { type: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of actions) out[a.type] = (out[a.type] ?? 0) + 1
  return out
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
