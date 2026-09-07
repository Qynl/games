// GameSession — the wiring between engine, AI, editor, Ollama and the UI.
// The React layer subscribes to `listen()` and reads plain state fields;
// the session itself knows nothing about React.

import type { Camera } from 'three'
import type { Settings, SpeechEntry, UiPanel } from '../types'
import { loadSettings, saveSettings } from '../utils/settings'
import { OllamaClient } from '../ai/OllamaClient'
import { Memory } from '../ai/Memory'
import { aifx } from '../ai/aifx'
import { GameEngine, type EngineEvent } from './GameEngine'
import { VirtualEditor } from '../editor/VirtualEditor'
import { AIController, type AiUiState } from '../ai/AIController'

export interface SessionUi extends AiUiState {
  connected: boolean
  latency: number | null
  ollamaUrl: string
  model: string
  autoModel: boolean
  models: { name: string; short?: string }[]
  modelNote: string
  panel: UiPanel
  showSettings: boolean
  controlsOn: boolean
  autonomous: boolean
  interval: number
  speechOn: boolean
  sessionTime: number
  teleportList: string[]
}

export type SessionListener = (ch: 'ui' | 'world' | 'speech' | 'editor') => void

export class GameSession {
  settings: Settings = loadSettings()
  ollama = new OllamaClient(this.settings.ollamaUrl)
  memory = new Memory()
  engine: GameEngine
  editor: VirtualEditor
  ai: AIController
  speech: SpeechEntry[] = []
  /** last world build counter (bumped when objects change) */
  worldRev = 0
  uiRev = 0
  editorRev = 0
  ui: SessionUi
  camera: Camera | null = null
  time = 0
  online = false
  startedAt = performance.now()
  private listeners = new Set<SessionListener>()
  private speechId = 0
  private lastModelCheck = 0
  private connectPromise: Promise<void> | null = null
  private connectTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.engine = new GameEngine({
      onFeed: (e) => this.onEngineFeed(e),
      onLog: () => this.bump('editor'),
      onBuild: () => this.bump('world'),
    })
    this.editor = new VirtualEditor({
      api: this.engine.api,
      engine: this.engine,
      onChanged: () => this.bump('editor'),
    })
    this.ai = new AIController({
      engine: this.engine,
      ollama: this.ollama,
      memory: this.memory,
      editor: this.editor,
      getSettings: () => ({
        model: this.settings.model,
        autonomous: this.settings.autonomous,
        interval: this.settings.interval,
        ollamaUrl: this.settings.ollamaUrl,
      }),
      onUi: (partial) => {
        this.ui = { ...this.ui, ...partial }
        this.bump('ui')
      },
      onSpeech: (speaker, text) => this.addSpeech(speaker, text),
      onLog: (line) => {
        this.engine.logs.push(line)
        this.bump('editor')
      },
    })
    this.ui = {
      phase: 'offline',
      expr: 'neutral',
      phaseDetail: 'connecting…',
      bubble: null,
      thinking: '',
      modelBusy: false,
      connected: false,
      latency: null,
      ollamaUrl: this.settings.ollamaUrl,
      model: this.settings.model,
      autoModel: this.settings.autoModel,
      models: [],
      modelNote: '',
      panel: 'none',
      showSettings: false,
      controlsOn: false,
      autonomous: this.settings.autonomous,
      interval: this.settings.interval,
      speechOn: this.settings.speech,
      sessionTime: 0,
      teleportList: [],
    }
    this.engine.init()
  }

  private bump(ch: 'ui' | 'world' | 'speech' | 'editor') {
    if (ch === 'ui' || ch === 'speech') this.uiRev += 1
    else if (ch === 'world') this.worldRev += 1
    else if (ch === 'editor') this.editorRev += 1
    for (const l of [...this.listeners]) l(ch)
  }

  get player() {
    return this.engine.player
  }

  listen(fn: SessionListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  // -------------------------------------------------------- world overlays
  toasts: { id: number; text: string; t0: number; dur: number; kind: string }[] = []
  npcChats: { id: number; name: string; text: string; t0: number }[] = []
  private evCursor = 0
  private toastId = 0
  private npcChatId = 0

  private scanEvents() {
    const evs = this.engine.events
    while (this.evCursor < evs.length) {
      const e = evs[this.evCursor]
      this.evCursor += 1
      if (e.kind === 'npcTalk') {
        const m = e.text.match(/^([^:]+):\s*["“]?(.*?)["”]?$/)
        const name = m ? m[1].trim() : 'npc'
        const text = (m ? m[2] : e.text).trim()
        this.npcChats.push({ id: ++this.npcChatId, name, text, t0: performance.now() })
        if (this.npcChats.length > 4) this.npcChats.shift()
        this.bump('ui')
      } else if (['win', 'death', 'loseLife', 'scene', 'outOfBounds', 'squish', 'checkpoint', 'hazard'].includes(e.kind)) {
        this.toasts.push({ id: ++this.toastId, text: e.text, t0: performance.now(), dur: e.kind === 'win' ? 7 : e.kind === 'scene' ? 6 : 3.4, kind: e.kind })
        if (this.toasts.length > 5) this.toasts.shift()
        this.bump('ui')
      }
    }
    const now = performance.now()
    this.toasts = this.toasts.filter((t) => now - t.t0 < t.dur * 1000)
    this.npcChats = this.npcChats.filter((c) => now - c.t0 < 5200)
  }

  addSpeech(speaker: SpeechEntry['speaker'], text: string) {
    this.speech.push({ id: ++this.speechId, speaker, text, at: Date.now() })
    if (this.speech.length > 60) this.speech.shift()
    this.bump('speech')
  }

  // -------------------------------------------------------------- session
  start() {
    void this.connect()
    this.connectTimer = setInterval(() => {
      if (performance.now() - this.lastModelCheck > 12000) void this.connect()
    }, 12000)
  }

  dispose() {
    if (this.connectTimer) clearInterval(this.connectTimer)
  }

  async connect() {
    if (this.connectPromise) return this.connectPromise
    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = null
    })
    return this.connectPromise
  }

  private async doConnect() {
    const started = performance.now()
    const status = await this.ollama.ping()
    this.online = status.connected
    this.ui.latency = status.latencyMs
    this.ai.setOnline(this.online)
    if (status.connected) {
      const { names, infos, error } = await this.ollama.listModels()
      this.ui.models = names.map((n) => ({ name: n, short: infos[n]?.short }))
      if (!names.length) {
        this.ui.modelNote = error ? `server up, but listing failed (${error})` : 'server up — no models installed yet. run: ollama pull llama3.2'
        this.ui.connected = false
      } else {
        this.ui.connected = true
        this.ui.modelNote = ''
        if (this.settings.autoModel || !names.includes(this.settings.model)) {
          const preferred = this.pickModel(names)
          this.setModel(preferred, false)
        } else if (!names.includes(this.settings.model)) {
          this.ui.model = this.settings.model
        }
        aifx.configure({ volume: 0.5, muted: !this.settings.speech })
      }
      // wake the ai if the loop is idle
      this.ai.setOnline(true)
    } else {
      this.ui.modelNote = status.message
      this.ai.setOnline(false)
    }
    this.ui.sessionTime = (performance.now() - this.startedAt) / 1000
    void started
    this.bump('ui')
  }

  private pickModel(names: string[]): string {
    const order = [
      (n: string) => /llama3\.2/i.test(n) && !/:1b/i.test(n),
      (n: string) => /llama3\.1/i.test(n),
      (n: string) => /qwen2\.5/i.test(n) && !/:0\.5/i.test(n),
      (n: string) => /mistral/i.test(n),
      (n: string) => /gemma2/i.test(n),
      (n: string) => /phi3/i.test(n),
    ]
    for (const test of order) {
      const hit = names.find(test)
      if (hit) return hit
    }
    return names[0]
  }

  setModel(name: string, persist = true) {
    this.settings.model = name
    this.ui.model = name
    this.ollama.lastModel = name
    if (persist) saveSettings(this.settings)
    this.memory.note(`switched AI model to ${name}`)
    this.bump('ui')
  }

  setEndpoint(url: string, persist = true) {
    this.settings.ollamaUrl = url
    this.ui.ollamaUrl = url
    this.ollama.setEndpoint(url)
    if (persist) saveSettings(this.settings)
    this.bump('ui')
    void this.connect()
  }

  setAutonomous(on: boolean) {
    this.settings.autonomous = on
    this.ui.autonomous = on
    saveSettings(this.settings)
    this.bump('ui')
  }

  setInterval(sec: number) {
    this.settings.interval = sec
    this.ui.interval = sec
    saveSettings(this.settings)
    this.bump('ui')
  }

  setSpeech(on: boolean) {
    this.settings.speech = on
    this.ui.speechOn = on
    saveSettings(this.settings)
    aifx.configure({ muted: !on })
    this.bump('ui')
  }

  // ----------------------------------------------------------------- ui
  setPanel(p: UiPanel) {
    this.ui.panel = this.ui.panel === p ? 'none' : p
    this.bump('ui')
  }

  setSettingsOpen(open: boolean) {
    this.ui.showSettings = open
    this.bump('ui')
  }

  hasPlayed = false

  /** enable first-person controls (pointer locked / playing) */
  setControls(on: boolean) {
    this.ui.controlsOn = on
    if (on) this.hasPlayed = true
    this.engine.player.outOfBounds = false
    if (!on) {
      this.engine.player.vel.x = 0
      this.engine.player.vel.z = 0
    }
    this.bump('ui')
  }

  sendChat(text: string) {
    const clean = text.trim().slice(0, 400)
    if (!clean) return
    aifx.unlock()
    this.addSpeech('player', clean)
    this.engine.api.lastMessageAt = performance.now()
    this.ai.playerSaid(clean)
    this.bump('ui')
  }

  resetWorld() {
    this.engine.resetWorld()
    this.bump('world')
  }

  quickBuild(label: string) {
    const info = this.engine.buildScene(label)
    if (!info) return
    if (info.objective) {
      this.engine.api.createObjective(info.objective)
      this.addSpeech('system', `objective: ${info.objective}`)
    }
    this.addSpeech('system', `scenario built: ${info.title}`)
    this.bump('world')
    this.bump('ui')
  }

  saveScript(name: string, code: string) {
    if (!name.trim() || !code.trim()) return
    this.engine.api.scripts = this.engine.api.scripts.filter((s) => s.name !== name.trim())
    const res = this.engine.api.createScript({ name: name.trim(), code })
    this.editor.setScriptRunning(res.name, true)
    const run = this.editor.runOnce(res.name, code)
    this.engine.log(res.ok ? `script "${res.name}" saved and ran` : `script error: ${run.error}`, res.ok ? 'ok' : 'error')
    this.bump('editor')
  }

  setAutoModel(on: boolean) {
    this.settings.autoModel = on
    this.ui.autoModel = on
    saveSettings(this.settings)
    this.bump('ui')
  }

  teleportTo(id: string) {
    if (this.engine.teleportTo(id)) {
      this.bump('world')
    }
  }

  lookAtHead() {
    this.engine.lookAt(0, 20, 24)
  }

  // --------------------------------------------------------------- frame
  update(dt: number) {
    this.time += dt
    this.engine.update(dt)
    this.editor.tick(dt)
    this.ai.update(dt)
    this.scanEvents()
    this.ui.sessionTime = (performance.now() - this.startedAt) / 1000
    // keep the toast/npc state cheap: only bump UI when something changed is
    // handled inside scanEvents
  }

  private onEngineFeed(e: EngineEvent) {
    if (e.kind === 'scene' || e.kind === 'win') this.bump('world')
    if (e.kind === 'win' || e.kind === 'scene' || e.kind === 'npcTalk') this.bump('ui')
  }

  /** names the HUD uses for the teleport quick-list */
  refreshTeleportList() {
    const names = this.engine.api.objects
      .filter((o) => o.category !== 'zone' && o.visible !== false)
      .slice(-14)
      .map((o) => o.name)
    this.ui.teleportList = names
    this.bump('ui')
  }
}
