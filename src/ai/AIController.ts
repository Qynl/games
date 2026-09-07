import { world } from '../world/WorldStore'
import { api } from '../world/WorldAPI'
import { OllamaClient } from './OllamaClient'
import { SYSTEM_PROMPT, buildObservation } from './prompts'
import { directorReply, directorTick } from './director'
import { pick, rand, short } from '../utils/math'
import type { AIPlan, Mood, ToolCall } from '../types'

const LS_ENDPOINT = 'creator.ai.endpoint'
const LS_MODEL = 'creator.ai.model'
const LS_AUTOPILOT = 'creator.ai.autopilot'

const DEFAULT_ENDPOINT = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2'

function lsGet(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Robust JSON extraction from an LLM reply. */
export function parsePlan(raw: string): AIPlan | null {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    // plain chat line
    return { thought: '', chat: text.slice(0, 300), actions: [] }
  }
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Partial<AIPlan>
    const actions: ToolCall[] = Array.isArray(obj.actions)
      ? obj.actions.filter((a) => a && typeof a.tool === 'string')
      : []
    return {
      thought: typeof obj.thought === 'string' ? obj.thought : '',
      chat: typeof obj.chat === 'string' ? obj.chat : undefined,
      actions,
      memory: typeof obj.memory === 'string' ? obj.memory : undefined,
    }
  } catch {
    return null
  }
}

class AIController {
  client = new OllamaClient(lsGet(LS_ENDPOINT, DEFAULT_ENDPOINT), lsGet(LS_MODEL, DEFAULT_MODEL))
  mode: 'online' | 'autopilot' | 'offline' = 'offline'
  private timer: number | null = null
  private busy = false
  private initialized = false
  private consecutiveErrors = 0
  private pendingPlayerMessage: string | null = null
  private lastOnlineMood: Mood = 'idle'

  constructor() {
    world.tryLoadMemory()
  }

  async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true
    world.setAI({ model: this.client.model, task: 'connecting to Ollama…', mood: 'thinking' })

    const wantAutopilot = lsGet(LS_AUTOPILOT, '') === 'on'
    const online = await this.client.ping()
    if (online) {
      this.mode = 'online'
      world.setAI({
        mode: 'online',
        task: 'online — autonomous',
        mood: 'idle',
        speaking: 'oh, you\'re here. good. i was about to start building.',
      })
      window.setTimeout(() => world.setAI({ speaking: null }), 6000)
    } else if (wantAutopilot || lsGet(LS_AUTOPILOT, 'auto') === 'auto') {
      this.mode = 'autopilot'
      world.setAI({
        mode: 'autopilot',
        task: 'local autopilot (Ollama offline)',
        mood: 'idle',
        speaking: 'ollama is offline, so you get the cheap me. still building though.',
      })
      window.setTimeout(() => world.setAI({ speaking: null }), 6000)
    } else {
      this.mode = 'offline'
      world.setAI({ mode: 'offline', task: 'offline — Ollama unreachable', mood: 'idle' })
      world.addFeed('AI offline: Ollama unreachable at ' + this.client.endpoint, 'system')
    }
    this.schedule(4000)
  }

  private schedule(ms: number): void {
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => void this.tick(), ms)
  }

  private async tick(): Promise<void> {
    if (document.hidden || this.busy) {
      this.schedule(5000)
      return
    }
    world.setAI({ mood: 'thinking', loopCount: world.aiStatus.loopCount + 1 })
    const obs = buildObservation()
    if (this.mode === 'online') {
      await this.onlineTick(obs)
      this.schedule(rand(8, 14) * 1000)
    } else if (this.mode === 'autopilot') {
      this.autopilotTick()
      this.schedule(rand(5, 9) * 1000)
    } else {
      this.schedule(10000)
    }
  }

  private async onlineTick(obs: string): Promise<void> {
    this.busy = true
    const prompt = `${obs}\n\nRespond with your JSON plan now.`
    try {
      const raw = await this.client.generate(prompt, SYSTEM_PROMPT)
      const plan = parsePlan(raw)
      if (!plan) {
        this.consecutiveErrors += 1
        world.setAI({ mood: 'error', task: 'could not parse my own output' })
        world.addFeed('AI: I wrote garbage. One sec.', 'system')
        this.scheduleNext(this.consecutiveErrors > 2 ? 30000 : 8000)
        return
      }
      this.consecutiveErrors = 0
      this.executePlan(plan)
      this.scheduleNext(rand(8, 14) * 1000)
    } catch (err) {
      this.consecutiveErrors += 1
      const msg = err instanceof Error ? err.message : String(err)
      world.setAI({ mood: 'error', task: `ollama error: ${short(msg, 40)}` })
      world.addFeed(`Ollama error: ${msg}`, 'system')
      if (this.consecutiveErrors >= 3) {
        world.addFeed('AI: falling back to local autopilot until Ollama is back.', 'system')
        this.mode = 'autopilot'
        world.setAI({ mode: 'autopilot', task: 'autopilot (Ollama error)' })
      }
      this.scheduleNext(this.consecutiveErrors > 2 ? 30000 : 10000)
    } finally {
      this.busy = false
    }
  }

  private scheduleNext(ms: number): void {
    this.schedule(ms)
  }

  private autopilotTick(): void {
    const plan = directorTick()
    this.executePlan(plan)
  }

  private executePlan(plan: AIPlan): void {
    if (plan.memory) world.addMemory(plan.memory)
    if (plan.chat) this.speak(plan.chat)
    if (plan.actions.length > 0) {
      api.runPlan(plan)
    }
    const mood: Mood = plan.actions.length > 0 ? 'working' : 'idle'
    world.setAI({
      mood,
      task: plan.thought ? short(plan.thought, 80) : world.aiStatus.task,
      lastAction: plan.actions[0]?.tool ?? '',
    })
    this.lastOnlineMood = mood
    if (mood === 'working') {
      window.setTimeout(() => {
        if (world.aiStatus.mood === 'working' && !this.busy) {
          world.setAI({ mood: 'idle' })
        }
      }, 2800)
    }
  }

  speak(text: string): void {
    world.addChat('ai', text)
    world.setAI({ speaking: text, mood: 'speaking' })
    window.setTimeout(() => {
      if (world.aiStatus.speaking === text) {
        world.setAI({ speaking: null, mood: this.busy ? 'thinking' : 'idle' })
      }
    }, 6000)
  }

  async handlePlayerMessage(text: string): Promise<void> {
    const clean = text.trim()
    if (!clean) return
    world.addChat('player', clean)
    world.addFeed(`player: ${clean}`, 'player')

    if (this.mode === 'offline') {
      this.speak('(I\'m offline right now. Connect Ollama or enable autopilot in settings.)')
      return
    }
    if (this.mode === 'autopilot') {
      const plan = directorReply(clean)
      this.executePlan(plan)
      return
    }
    // online — answer immediately but keep working
    if (this.busy) {
      this.pendingPlayerMessage = clean
      this.speak(pick(['hold on, let me finish this.', 'wait wait, I\'m cooking.', 'give me a sec.']))
      return
    }
    this.busy = true
    try {
      const obs = buildObservation()
      const prompt = `The player just said: "${clean}"\n\nObservation:\n${obs}\n\nRespond with your JSON plan. You can answer AND keep building, or just answer.`
      const raw = await this.client.generate(prompt, SYSTEM_PROMPT)
      const plan = parsePlan(raw)
      if (plan) this.executePlan(plan)
      else this.speak('…what? hold on, I lost my train of thought.')
    } catch {
      this.speak('...')
    } finally {
      this.busy = false
      const pending = this.pendingPlayerMessage
      this.pendingPlayerMessage = null
      if (pending) void this.handlePlayerMessage(pending)
    }
  }

  async reconfigure(endpoint: string, model: string): Promise<boolean> {
    this.client = new OllamaClient(endpoint, model || DEFAULT_MODEL)
    lsSet(LS_ENDPOINT, endpoint)
    lsSet(LS_MODEL, this.client.model)
    const online = await this.client.ping()
    if (online) {
      this.mode = 'online'
      world.setAI({ mode: 'online', model: this.client.model, task: 'online — autonomous', mood: 'idle' })
      world.addFeed(`AI connected to Ollama (${this.client.model})`, 'system')
    } else {
      world.setAI({ mode: 'autopilot', model: this.client.model, task: 'autopilot (Ollama offline)', mood: 'idle' })
      world.addFeed('Ollama still unreachable — autopilot active', 'system')
    }
    return online
  }

  setAutopilot(on: boolean): void {
    this.mode = on ? 'autopilot' : 'online'
    lsSet(LS_AUTOPILOT, on ? 'on' : 'off')
    if (on) {
      world.setAI({ mode: 'autopilot', task: 'local autopilot', mood: 'idle' })
    } else {
      void this.reconfigure(this.client.endpoint, this.client.model)
    }
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = null
    this.initialized = false // allow re-init (React StrictMode remounts)
  }
}

export const ai = new AIController()