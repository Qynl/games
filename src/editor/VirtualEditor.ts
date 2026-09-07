// VirtualEditor — the AI's "project" plus the script sandbox host.
//
// The virtual project is a lightweight filesystem-like view over the world
// state the AI actually owns (WorldAPI), which keeps the two in sync by
// construction:
//
//   world/         — one "file" describing the current world
//   scripts/*.js   — AI-generated scripts (stored on the WorldAPI)
//   events.log     — rolling event stream
//   project.json   — goals + metadata
//
// Scripts execute ONLY inside the sandbox (ai/sandbox.ts) against the
// WorldAPI surface. There is no file access, no shell, no network: the
// sandbox statically rejects browser/Node APIs and the WorldAPI only
// mutates in-memory world data.

import type { WorldAPI } from '../world/WorldAPI'
import type { GameEngine } from '../game/GameEngine'
import { runSandboxed, type SandboxApi } from '../ai/sandbox'

export interface EditorFile {
  name: string
  kind: 'file' | 'folder'
  size: number
  note: string
  mtime: number
  code?: string
}

export interface VirtualEditorOpts {
  api: WorldAPI
  engine: GameEngine
  onChanged?: () => void
}

const FACADE_METHODS = [
  'createObject', 'deleteObject', 'moveObject', 'rotateObject', 'scaleObject', 'paintObject',
  'physicsBody', 'material', 'cloneObject', 'getObject', 'findObjectsNear', 'listObjects',
  'countObjects', 'clearObjects', 'addZone', 'createNPC', 'npcChat', 'removeNPC',
  'createVehicle', 'removeVehicle', 'createTerrain', 'clearTerrain', 'changeWeather',
  'changeTime', 'setDayNightCycle', 'modifyWorld', 'setLight', 'createObjective',
  'createEvent', 'listEvents', 'createScript', 'listScripts', 'status',
] as const

export function makeWorldFacade(api: WorldAPI): Record<string, unknown> {
  const raw = api as unknown as Record<string, unknown>
  const facade: Record<string, unknown> = {}
  for (const name of FACADE_METHODS) {
    const fn = raw[name]
    if (typeof fn === 'function') facade[name] = fn.bind(api)
  }
  return facade
}

export class VirtualEditor {
  private api: WorldAPI
  private engine: GameEngine
  private onChanged: () => void
  /** per-script evaluation accumulator */
  private acc = new Map<string, number>()
  scriptRunning: Record<string, boolean> = {}
  lastResults: Record<string, string> = {}

  constructor(opts: VirtualEditorOpts) {
    this.api = opts.api
    this.engine = opts.engine
    this.onChanged = opts.onChanged ?? (() => {})
  }

  changed() {
    this.onChanged()
  }

  deleteScript(name: string) {
    const removed = this.api.scripts.filter((s) => s.name === name)
    this.api.scripts = this.api.scripts.filter((s) => s.name !== name)
    for (const s of removed) this.acc.delete(s.id)
    delete this.scriptRunning[name]
    delete this.lastResults[name]
    this.changed()
  }

  setScriptRunning(name: string, on: boolean) {
    this.scriptRunning[name] = on
    this.changed()
  }

  /** the virtual project tree (derived) */
  files(): EditorFile[] {
    const now = Date.now()
    const out: EditorFile[] = []
    const w = this.api
    out.push({
      name: 'world.json',
      kind: 'file',
      size: 1 + w.objects.length + w.npcs.length,
      note: `objects ${w.objects.length} · npcs ${w.npcs.length} · vehicles ${w.vehicles.length} · terrain ${w.terrain ? 'hills' : 'flat'}`,
      mtime: now,
    })
    out.push({
      name: 'scripts',
      kind: 'folder',
      size: w.scripts.length,
      note: `${w.scripts.length} script${w.scripts.length === 1 ? '' : 's'} — generated code runs sandboxed`,
      mtime: now,
    })
    for (const s of w.scripts.slice(-6)) {
      out.push({
        name: `scripts/${s.name}.js`,
        kind: 'file',
        size: Math.max(1, Math.round(s.code.length / 80)),
        note: `${s.code.length} chars · ${this.scriptRunning[s.name] ? 'RUNNING' : 'stopped'}`,
        mtime: s.created,
        code: s.code,
      })
    }
    out.push({
      name: 'events.log',
      kind: 'file',
      size: Math.min(99, this.engine.events.length),
      note: `${Math.min(this.engine.events.length, 99)} recent world events`,
      mtime: now,
    })
    out.push({
      name: 'project.json',
      kind: 'file',
      size: 1 + w.goals.length,
      note: w.name,
      mtime: now,
    })
    return out
  }

  eventsTail(n = 24): string[] {
    return this.engine.events.slice(-n).map((e) => `[${new Date(e.at).toLocaleTimeString()}] ${e.text}`)
  }

  /** run scripts that are enabled, roughly every 0.9s each */
  tick(dt: number) {
    for (const s of this.api.scripts) {
      if (!this.scriptRunning[s.name]) continue
      const t = (this.acc.get(s.id) ?? 0) + dt
      if (t < 0.9) {
        this.acc.set(s.id, t)
        continue
      }
      this.acc.set(s.id, 0)
      this.runOnce(s.name, s.code)
    }
  }

  private changeKey(): string {
    const w = this.api
    return [w.objects.length, w.npcs.length, w.vehicles.length, w.zones.length, w.scripts.length].join(',')
  }

  runOnce(name: string, code: string): { ok: boolean; out?: unknown; error?: string } {
    const before = this.changeKey()
    const api = { w: makeWorldFacade(this.api) }
    const res = runSandboxed(code, api as SandboxApi)
    if (res.ok) {
      this.lastResults[name] = res.output === null || res.output === undefined ? 'ran' : JSON.stringify(res.output)
      // if the script added/removed world entries, ask the engine to rebuild
      // (colliders + scene sync); pure position/color edits sync per-frame
      if (this.changeKey() !== before) this.api.commit(`script "${name}" changed the world`)
    } else {
      this.lastResults[name] = `ERROR: ${res.error ?? 'unknown'}`
    }
    return res
  }
}
