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

// NOTE: meta-script tools (createScript/listScripts) are deliberately NOT part
// of the facade: a running script must never be able to spawn more scripts.
const FACADE_METHODS = [
  'createObject', 'deleteObject', 'moveObject', 'rotateObject', 'scaleObject', 'paintObject',
  'physicsBody', 'material', 'cloneObject', 'getObject', 'findObjectsNear', 'listObjects',
  'countObjects', 'clearObjects', 'addZone', 'createNPC', 'npcChat', 'removeNPC',
  'createVehicle', 'removeVehicle', 'createTerrain', 'clearTerrain', 'changeWeather',
  'changeTime', 'setDayNightCycle', 'modifyWorld', 'setLight', 'createObjective',
  'createEvent', 'listEvents', 'status',
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

  /**
   * Save (or replace) a script, enable it and immediately run it once through
   * the sandbox so callers — the editor UI or the AI itself — get instant
   * validation feedback (syntax errors, blocked APIs, runtime errors).
   */
  saveScript(name: string, code: string): { ok: boolean; name: string; error?: string } {
    if (!name.trim() || !code.trim()) return { ok: false, name, error: 'script name and code are required' }
    this.api.scripts = this.api.scripts.filter((s) => s.name !== name.trim())
    const res = this.api.createScript({ name: name.trim(), code })
    this.setScriptRunning(res.name, true)
    const run = this.runOnce(res.name, code)
    this.engine.log(
      run.ok ? `script "${res.name}" saved, sandbox-checked and running` : `script rejected (${res.name}): ${run.error}`,
      run.ok ? 'ok' : 'error',
    )
    this.changed()
    return { ok: run.ok, name: res.name, error: run.ok ? undefined : run.error }
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
      const res = this.runOnce(s.name, s.code)
      // a script failing while running should refresh the editor + AI context
      if (!res.ok) this.changed()
    }
  }

  /** cheap but broad signature of everything scripts can mutate */
  private changeKey(): string {
    const w = this.api
    const sig = (o: { id: string; pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] | number; color?: string; visible?: boolean; solid?: boolean; tags?: string[]; opacity?: number }) =>
      `${o.id}:${o.pos.map((n) => n.toFixed(1)).join(',')};${o.rot.map((n) => n.toFixed(2)).join(',')};${(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]).map((n) => n.toFixed(2)).join(',')};${o.color ?? ''};${o.visible !== false};${o.solid !== false};${(o.tags ?? []).join('+')}`
    let hash = 0
    const feed = (s: string) => {
      for (let i = 0; i < s.length; i++) hash = (hash * 33 + s.charCodeAt(i)) >>> 0
    }
    feed(w.objects.map(sig).join('|'))
    feed(w.npcs.map(sig).join('|'))
    feed(w.vehicles.map(sig).join('|'))
    feed(String(w.terrain !== null) + String(w.weather.rain) + w.timeOfDay.toFixed(2) + w.sky.color + w.goals.length)
    return String(hash)
  }

  runOnce(name: string, code: string): { ok: boolean; out?: unknown; error?: string } {
    const before = this.changeKey()
    const api = { w: makeWorldFacade(this.api) }
    const res = runSandboxed(code, api as SandboxApi)
    if (res.ok) {
      this.lastResults[name] = res.output === null || res.output === undefined ? 'ran' : JSON.stringify(res.output)
      // scripts can move/scale/paint/clear — any world mutation needs the
      // engine to rebuild colliders and the scene to resync
      if (this.changeKey() !== before) this.api.commit(`script "${name}" changed the world`)
    } else {
      this.lastResults[name] = `ERROR: ${res.error ?? 'unknown'}`
    }
    return res
  }
}
