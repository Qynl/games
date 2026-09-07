// Overlays — the 2D HUD over the 3D world: crosshair, status chip,
// AI speech bubble (anchored to the head), NPC chat bubbles (anchored to
// NPCs), toasts, objectives and interaction hints.

import { useEffect, useRef, useState } from 'react'
import type { GameSession } from '../game/Session'
import type { Expression, Phase } from '../types'

const PHASE_LABEL: Record<Phase, string> = {
  boot: 'boot',
  thinking: 'thinking',
  working: 'working',
  speaking: 'speaking',
  idle: 'idle',
  error: 'error',
  offline: 'offline',
}

const EXPR_GLYPH: Record<Expression, string> = {
  neutral: '•‿•',
  happy: '˶ᵔ ᵕ ᵔ˶',
  excited: '✧◡✧',
  thinking: '(￢_￢)',
  working: 'ᕙ(▀̿̿Ĺ̯̿̿▀̿ ̿)ᕗ',
  annoyed: '(¬_¬)',
  laugh: '(≧▽≦)',
  sleep: '(￣ρ￣)',
  error: '(×_×)',
  focused: '◉_◉',
}

const PHASE_COLOR: Record<Phase, string> = {
  boot: '#8a93b5',
  thinking: '#b9a7ff',
  working: '#59b7ff',
  speaking: '#7ef0c0',
  idle: '#a8b6cc',
  error: '#ff5a4e',
  offline: '#ff5a4e',
}

function useCameraProjector(session: GameSession): (x: number, y: number, z: number) => { x: number; y: number } | null {
  return (x, y, z) => {
    const cam = session.camera
    if (!cam) return null
    const v = new THREE_XYZ(x, y, z)
    const ok = v.project(cam)
    if (!ok) return null
    return { x: v.sx, y: v.sy }
  }
}

// minimal vector class for projection (avoids importing three in HUD)
class THREE_XYZ {
  x: number; y: number; z: number
  sx = 0
  sy = 0
  constructor(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z }
  project(cam: { matrixWorldInverse: unknown; projectionMatrix: unknown; matrixWorld: { elements: number[] } }): boolean {
    const mw = cam.matrixWorldInverse as { elements: number[] }
    const mp = cam.projectionMatrix as { elements: number[] }
    const e = mw.elements
    const x = e[0] * this.x + e[4] * this.y + e[8] * this.z + e[12]
    const y = e[1] * this.x + e[5] * this.y + e[9] * this.z + e[13]
    const z = e[2] * this.x + e[6] * this.y + e[10] * this.z + e[14]
    const w = e[3] * this.x + e[7] * this.y + e[11] * this.z + e[15]
    if (w <= 0.01) return false
    const pe = mp.elements
    const nx = (pe[0] * x + pe[4] * y + pe[8] * z + pe[12] * w) / w
    const ny = (pe[1] * x + pe[5] * y + pe[9] * z + pe[13] * w) / w
    const nz = (pe[2] * x + pe[6] * y + pe[10] * z + pe[14] * w) / w
    if (nz > 1) return false
    this.sx = (nx * 0.5 + 0.5) * 100
    this.sy = (-ny * 0.5 + 0.5) * 100
    return true
  }
}

export function Overlays({ session }: { session: GameSession }) {
  const [, force] = useState(0)
  useEffect(() => session.listen(() => force((c) => c + 1)), [session])

  const bubbleRef = useRef<HTMLDivElement>(null)
  const bubbleInfo = useRef<{ id: number; text: string; endsAt: number } | null>(null)
  const npcBubblesRef = useRef<HTMLDivElement>(null)
  const npcCache = useRef(new Map<string, { el: HTMLDivElement; name: string; endsAt: number }>())
  const crossRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLDivElement>(null)
  const bootsRef = useRef<HTMLDivElement>(null)
  const moleRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // head speech bubble
    const onFrame = () => {
      // ai bubble lifecycle
      const b = session.ui.bubble
      if (b && (!bubbleInfo.current || bubbleInfo.current.id !== b.id)) {
        bubbleInfo.current = { id: b.id, text: b.text, endsAt: performance.now() + b.dur * 1000 }
      }
      if (bubbleInfo.current && bubbleRef.current) {
        const info = bubbleInfo.current
        if (performance.now() > info.endsAt) {
          bubbleInfo.current = null
          bubbleRef.current.style.opacity = '0'
        } else {
          const hx = session.headPos.x
          const hy = session.headPos.y
          const hz = session.headPos.z
          const p = useCameraProjector(session)(hx, hy + 4.1, hz)
          bubbleRef.current.textContent = info.text
          if (p) {
            bubbleRef.current.style.left = p.x + '%'
            bubbleRef.current.style.top = Math.max(2, p.y - 2) + '%'
            bubbleRef.current.style.opacity = '1'
          } else {
            bubbleRef.current.style.opacity = '0'
          }
        }
      }
      // npc chat bubbles
      if (npcBubblesRef.current) {
        const now = performance.now()
        for (const [name, item] of npcCache.current) {
          if (now > item.endsAt) {
            item.el.remove()
            npcCache.current.delete(name)
            continue
          }
          const npc = session.engine.api.npcs.find((n) => n.name === name)
          if (!npc) {
            item.el.remove()
            npcCache.current.delete(name)
            continue
          }
          const p = useCameraProjector(session)(npc.pos[0], npc.pos[1] + 2.5, npc.pos[2])
          if (p) {
            item.el.style.left = p.x + '%'
            item.el.style.top = p.y + '%'
          }
        }
        for (const chat of session.npcChats) {
          const existing = npcCache.current.get(chat.name)
          if (existing) {
            existing.el.textContent = chat.text
            existing.endsAt = chat.t0 + 5000
          } else {
            const el = document.createElement('div')
            el.className = 'npc-bubble'
            el.textContent = chat.text
            npcBubblesRef.current.appendChild(el)
            npcCache.current.set(chat.name, { el, name: chat.name, endsAt: chat.t0 + 5000 })
          }
        }
      }
      // interact hint (textContent — names come from the AI and must never
      // be injected as HTML into the HUD)
      if (hintRef.current) {
        const h = session.engine.interactHint
        const on = session.ui.controlsOn && h
        hintRef.current.style.opacity = on ? '1' : '0'
        if (h) {
          const label = h.kind === 'npc' ? `talk to ${h.name}` : h.kind === 'mole' ? `whack the mole` : h.name
          hintRef.current.textContent = `[E] ${label}`
        }
      }
      // course run timer chip
      if (timeRef.current) {
        const course = session.engine.course
        const show = course && !course.finished && course.winMode !== 'none'
        timeRef.current.style.display = show ? 'flex' : 'none'
        if (show) timeRef.current.textContent = `⏱ ${Math.floor(session.engine.courseRunSec() ?? 0)}s`
      }
      // power-up chips: boots remaining + mole course progress
      if (bootsRef.current) {
        const boots = session.engine.powerStatus().boots
        bootsRef.current.style.display = boots > 0 ? 'flex' : 'none'
        if (boots > 0) bootsRef.current.textContent = `👢 air-jump ${boots}s`
      }
      if (moleRef.current) {
        const m = session.engine.moleProgress()
        moleRef.current.style.display = m ? 'flex' : 'none'
        if (m) moleRef.current.textContent = `🔨 ${m.hit}/${m.total} moles`
      }
      // damage / win screen flash
      if (flashRef.current) {
        const rem = session.flashUntil - performance.now()
        if (rem > 0) {
          const k = Math.min(1, rem / (session.flashKind === 'win' ? 900 : 600))
          flashRef.current.className = `screen-flash flash-${session.flashKind}`
          flashRef.current.style.opacity = String(k * (session.flashKind === 'win' ? 0.5 : 0.42))
        } else {
          flashRef.current.style.opacity = '0'
        }
      }
      // status chip refresh (cheap) — model names are escaped text
      if (statusRef.current) {
        const ui = session.ui
        const chip = statusRef.current
        const online = ui.connected
        const modelShort = esc((ui.model.split(':')[0] ?? ui.model).slice(0, 18))
        chip.innerHTML = `<span class="dot" style="background:${PHASE_COLOR[online ? ui.phase : 'offline']}"></span><span class="st-t">${online ? (ui.phase === 'offline' ? 'offline' : PHASE_LABEL[ui.phase]) : 'offline'}</span><span class="st-e">${ui.expr ? EXPR_GLYPH[ui.expr] : ''}</span><span class="st-m">${online ? modelShort : 'no AI'}</span>`
      }
      requestAnimationFrame(onFrame)
    }
    const raf = requestAnimationFrame(onFrame)
    return () => cancelAnimationFrame(raf)
  }, [session])

  const ui = session.ui
  const goals = session.engine.api.goals.filter((g) => !g.done)
  const activeGoal = goals[0]?.text ?? null
  const engine = session.engine

  return (
    <div className="overlay-root">
      {/* full-screen damage/win flash + vignette */}
      <div className="screen-flash" ref={flashRef} style={{ opacity: 0 }} />
      <div className="vignette" />
      {/* crosshair */}
      <div className={`crosshair${engine.interactHint ? ' crosshair-hot' : ''}`} ref={crossRef}>
        <div className="cross-dot" />
      </div>

      {/* interaction hint */}
      <div className="interact-hint" ref={hintRef} />

      {/* top-left: AI status + objective */}
      <div className="top-left">
        <div className="status-chip" ref={statusRef} title={`${ui.model} @ ${ui.ollamaUrl}`} />
        <div className={`phase-caption ${ui.phase}`}>
          {ui.connected ? (
            ui.bubble ? (
              <span className="caption-text">{cap(ui.bubble.text, 46)}</span>
            ) : ui.phaseDetail ? (
              <span className="caption-text">{ui.phaseDetail}</span>
            ) : (
              <span className="caption-text">watching you…</span>
            )
          ) : (
            <span className="caption-text warn">AI offline — start Ollama ({ui.ollamaUrl})</span>
          )}
        </div>
        {engine.course && (
          <div className="course-tag">
            <span className="course-title">{engine.course.title}</span>
            {activeGoal && <span className="course-goal">{activeGoal}</span>}
          </div>
        )}
        <div className="sandbox-note" title="AI-generated code runs in the page-local sandbox — browser, file, network, storage and timer APIs are blocked. It can only change this world through w.* and can never touch your PC.">
          <span className="sn-shield">🛡</span> AI code sandboxed — can't reach your PC
        </div>
      </div>

      {/* top-right: stats */}
      <div className="top-right">
        <div className="mini-chip time-chip" ref={timeRef} style={{ display: 'none' }} />
        <div className="mini-chip boots-chip" ref={bootsRef} style={{ display: 'none' }} />
        <div className="mini-chip mole-chip" ref={moleRef} style={{ display: 'none' }} />
        <div className="mini-chip">⌁ {Math.floor(engine.api.timeOfDay)}:{(engine.api.timeOfDay % 1) * 60 < 10 ? '0' : ''}{Math.floor((engine.api.timeOfDay % 1) * 60)}</div>
        <div className="mini-chip">{engine.api.weather.rain ? '☂ rain' : '☀ clear'}</div>
        <div className="mini-chip">obj {engine.api.objects.length}</div>
        <div className="mini-chip lives" title="lives">
          {'♥'.repeat(Math.max(0, engine.player.lives))}
          <span className="hp">HP {engine.player.hp}</span>
        </div>
      </div>

      {/* floating speech bubble above the AI head */}
      <div className="ai-bubble" ref={bubbleRef} style={{ opacity: 0 }} />

      {/* floating NPC chat bubbles */}
      <div className="npc-bubbles" ref={npcBubblesRef} />

      {/* toasts */}
      <div className="toasts">
        {session.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} style={{ animationDuration: `${t.dur}s` }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* hint bar at first spawn */}
      {!session.hasPlayed && !ui.controlsOn && !ui.showSettings && ui.panel === 'none' && (
        <div className="start-hint">
          <div className="start-title">CREATOR</div>
          <div className="start-sub">a tiny world being built live by an AI that knows you are here</div>
          <div className="start-keys">
            <span><b>WASD</b> move</span><span><b>Mouse</b> look</span><span><b>Space</b> jump</span><span><b>Ctrl</b> crouch</span><span><b>E</b> use</span><span><b>T</b> talk</span><span><b>B</b> editor</span>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              session.setSettingsOpen(false)
              session.setPanel('none')
              session.setControls(true)
              document.querySelector('canvas')?.requestPointerLock()
            }}
          >
            click to enter the world
          </button>
          <div className="start-safety">🛡 the AI builds inside this page's sandbox — its code can never touch your PC</div>
          {!ui.connected && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (document.pointerLockElement) document.exitPointerLock()
                session.setSettingsOpen(true)
              }}
            >
              configure AI (Ollama)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function cap(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** escape text that ends up inside innerHTML-built HUD chips */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}

export function useSessionTick(session: GameSession): number {
  const [rev, force] = useState(0)
  useEffect(() => session.listen(() => force((r) => r + 1)), [session])
  return rev
}
