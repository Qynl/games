import { useEffect, useRef, useState, useCallback } from 'react'
import { GameState, GameEvent } from '../game/state'
import { Renderer } from '../game/renderer'
import { InputManager, createInputState, screenToWorld } from '../game/input'
import { ModeDef, MODE_MAP, MatchResult } from '../game/types'
import { fmtTime } from '../game/util'
import { Vec, v } from '../game/util'
import { brawlerById } from '../game/brawlers'

function clampVec(p: { x: number; y: number }, max: number) {
  const l = Math.hypot(p.x, p.y)
  if (l <= max) return { x: p.x, y: p.y }
  return { x: (p.x / l) * max, y: (p.y / l) * max }
}
import { audio } from '../game/audio'
import SettingsModal from './SettingsModal'
import { loadSave } from '../game/save'

interface Props {
  mode: ModeDef
  brawlerId: string
  onExit: () => void
  onFinish: (r: MatchResult) => void
}

interface HudState {
  hp: number
  maxHp: number
  ammo: number
  ammoMax: number
  reloadFrac: number
  superCharge: number
  gadgets: number
  timeLeft: number
  teamGems: [number, number]
  teamStars: [number, number]
  gemTimer: number | null
  gemTimerTeam: number | null
  alive: number
  total: number
  cubes: number
  placement: number | null
  phase: string
  countdownT: number
  safeHp: [number, number]
}

export default function GameScreen({ mode, brawlerId, onExit, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const inputRef = useRef<InputManager | null>(null)
  const inputState = useRef(createInputState())
  const pointerWorld = useRef<Vec | null>(null)
  const pausedRef = useRef(false)
  const finishedRef = useRef(false)
  const joyKnobRef = useRef<HTMLDivElement>(null)
  const aimKnobRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [hud, setHud] = useState<HudState>({
    hp: 1, maxHp: 1, ammo: 0, ammoMax: 3, reloadFrac: 0, superCharge: 0, gadgets: 3,
    timeLeft: mode.duration, teamGems: [0, 0], teamStars: [0, 0], gemTimer: null,
    gemTimerTeam: null, alive: 0, total: mode.teamSize, cubes: 1, placement: null,
    phase: 'countdown', countdownT: 3.4, safeHp: [1, 1],
  })
  const [events, setEvents] = useState<GameEvent[]>([])
  const [touch, setTouch] = useState(false)
  const [endedText, setEndedText] = useState<{ title: string; sub: string; won: boolean } | null>(null)
  const [fireHeld, setFireHeld] = useState(false)
  const hudRef = useRef(hud)
  hudRef.current = hud

  const readHud = useCallback((): HudState => {
    const g = gameRef.current
    if (!g) return hudRef.current
    const p = g.player
    const alive = g.brawlers.filter((b) => !b.dead).length
    return {
      hp: p?.hp ?? 0,
      maxHp: p?.maxHp ?? 1,
      ammo: p?.ammo ?? 0,
      ammoMax: p?.def.ammoMax ?? 3,
      reloadFrac: p ? 1 - Math.min(1, p.reloadT / Math.max(0.1, p.def.reload / p.reloadMul)) : 0,
      superCharge: p?.superCharge ?? 0,
      gadgets: p?.gadgetLeft ?? 0,
      timeLeft: Math.max(0, g.timeLeft),
      teamGems: [...g.teamGems],
      teamStars: [...g.teamStars],
      gemTimer: g.gemTimer,
      gemTimerTeam: g.gemTimerTeam ?? null,
      alive,
      total: g.mode.teamSize,
      cubes: p?.cubes ?? 1,
      placement: g.playerPlacement,
      phase: g.phase,
      countdownT: g.countdownT,
      safeHp: [
        g.safes.find((s) => s.team === 0) ? (g.safes.find((s) => s.team === 0)!.hp / g.safes.find((s) => s.team === 0)!.maxHp) : 1,
        g.safes.find((s) => s.team === 1) ? (g.safes.find((s) => s.team === 1)!.hp / g.safes.find((s) => s.team === 1)!.maxHp) : 1,
      ],
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const save = loadSave()
    audio.init()
    audio.startMusic(true)
    audio.setSfxVolume(save.settings.sfx)
    audio.setMusicVolume(save.settings.music)
    audio.setMuted(save.muted)

    const g = new GameState(mode, MODE_MAP[mode.id], brawlerId)
    gameRef.current = g
    const renderer = new Renderer(canvas)
    renderer.resize()
    rendererRef.current = renderer

    const input = new InputManager(canvas, inputState.current)
    inputRef.current = input
    input.onSuperPressed = () => g.queueSuper()
    input.onGadgetPressed = () => g.queueGadget()
    input.onEmotePressed = () => g.queueEmote('😤')
    input.onAimRelease = (dir) => {
      // screen-space release vector -> world direction
      if (dir) {
        g.fireOnce({ x: dir.x / renderer.scale, y: dir.y / renderer.scale })
      } else {
        g.fireOnce(null)
      }
    }
    g.onEvent = () => setEvents([...g.events])
    g.onEnd = (r) => {
      if (finishedRef.current) return
      finishedRef.current = true
      const won = r.won
      setEndedText({
        title: won ? 'VICTORY!' : r.draw ? 'DRAW' : 'DEFEAT',
        sub: r.draw ? 'Nobody wins today' : won ? '+8 trophies' : `${r.trophies} trophies`,
        won,
      })
      window.setTimeout(() => onFinish(r), 2200)
    }

    const onResize = () => renderer.resize()
    window.addEventListener('resize', onResize)

    let raf = 0
    let last = performance.now()
    let hudLast = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      if (!pausedRef.current) {
        input.update(g)
        const st = inputState.current
        const p = g.player
        if (p) {
          if (input.isAimStickActive()) {
            // virtual aim stick: screen-space direction is good enough
            if (Math.hypot(st.aim.x, st.aim.y) > 6) {
              g.setAim(st.aim.x, st.aim.y)
            }
            pointerWorld.current = null
          } else {
            const aimWorld = screenToWorld(g, renderer, st.aimScreen.x, st.aimScreen.y)
            g.setAim(aimWorld.x - p.pos.x, aimWorld.y - p.pos.y)
            pointerWorld.current = aimWorld
          }

          // drag-to-move on the arena (touch): overrides when no stick/keys held
          const mp = input.getCanvasMovePoint()
          if (mp && !(st.move.x || st.move.y) && !input.isAimStickActive()) {
            const w = screenToWorld(g, renderer, mp.x, mp.y)
            const dx = w.x - p.pos.x
            const dy = w.y - p.pos.y
            const d = Math.hypot(dx, dy)
            if (d > 24) {
              g.setMove(dx / d, dy / d)
              renderer.moveTarget = w
            } else {
              g.setMove(0, 0)
              renderer.moveTarget = null
            }
          } else {
            renderer.moveTarget = null
          }
        }
        g.update(dt)
        renderer.render(g, dt, pointerWorld.current)
      }

      if (now - hudLast > 90) {
        hudLast = now
        setHud(readHud())
      }
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      input.dispose()
      g.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaused((p) => {
          pausedRef.current = !p
          return !p
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const togglePause = (val: boolean) => {
    pausedRef.current = val
    setPaused(val)
  }

  const quit = () => {
    audio.stopMusic()
    onExit()
  }

  const p = gameRef.current?.player ?? null
  const def = brawlerById(brawlerId)
  const phase = hud.phase

  const superReady = hud.superCharge >= 1

  return (
    <div className="game-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      {/* ------- top HUD ------- */}
      <div className="hud-top">
        <div className="hud-left">
          <div className="hud-player">
            <span className={`hud-name ${p && p.team === 1 ? 'red' : 'blue'}`}>
              {def.name}
            </span>
            <div className="hud-hpbar">
              <div className="hud-hpfill" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
              <span className="hud-hptext">{hud.hp}/{hud.maxHp}</span>
            </div>
            <div className="hud-ammo">
              {Array.from({ length: hud.ammoMax }).map((_, i) => (
                <div
                  key={i}
                  className={`ammo-pip ${i < hud.ammo ? 'full' : ''} ${i === hud.ammo && hud.reloadFrac > 0.05 ? 'reloading' : ''}`}
                  style={i === hud.ammo && hud.ammo < hud.ammoMax ? { ['--reload' as any]: `${hud.reloadFrac}` } : undefined}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="hud-center">
          <div className="hud-timer">{fmtTime(hud.timeLeft)}</div>
          {mode.id === 'gem' && (
            <div className="hud-gems">
              <span className="gem-blue">🔵 {hud.teamGems[0]}</span>
              <span className="gem-vs">—</span>
              <span className="gem-red">🔴 {hud.teamGems[1]}</span>
            </div>
          )}
          {mode.id === 'bounty' && (
            <div className="hud-gems">
              <span className="gem-blue">⭐ {hud.teamStars[0]}</span>
              <span className="gem-vs">—</span>
              <span className="gem-red">⭐ {hud.teamStars[1]}</span>
            </div>
          )}
          {mode.id === 'showdown' && (
            <div className="hud-gems">
              <span>💀 {hud.alive} alive</span>
              <span className="gem-vs">·</span>
              <span>⚡ {hud.cubes} cubes</span>
            </div>
          )}
          {mode.id === 'heist' && (
            <div className="hud-safes">
              <div className="safe-hud-bar">
                <span className="safe-label blue">🔵 {Math.round(hud.safeHp[0] * 100)}%</span>
                <div className="safe-hud-track">
                  <div className="safe-hud-fill blue" style={{ width: `${hud.safeHp[0] * 100}%` }} />
                </div>
              </div>
              <div className="safe-hud-bar">
                <span className="safe-label red">🔴 {Math.round(hud.safeHp[1] * 100)}%</span>
                <div className="safe-hud-track">
                  <div className="safe-hud-fill red" style={{ width: `${hud.safeHp[1] * 100}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="hud-right">
          <button className="hud-btn pause-btn" onClick={() => togglePause(true)}>
            ⏸
          </button>
        </div>
      </div>

      {/* events feed */}
      <div className="event-feed">
        {events.map((e, i) => (
          <div key={`${e.text}-${i}`} className={`event-item ev-${e.kind}`}>
            {e.text}
          </div>
        ))}
      </div>

      {/* gem countdown banner */}
      {mode.id === 'gem' && hud.gemTimer !== null && hud.gemTimerTeam !== null && (
        <div className={`gem-banner ${hud.gemTimerTeam === 0 ? 'friendly' : 'enemy'}`}>
          {hud.gemTimerTeam === 0 ? (
            <>
              💎 HOLD THE GEMS! <b>{Math.ceil(hud.gemTimer)}s</b>
            </>
          ) : (
            <>
              ⚠️ ENEMY HAS 10 GEMS — TAKE THEM DOWN! <b>{Math.ceil(hud.gemTimer)}s</b>
            </>
          )}
        </div>
      )}

      {/* countdown */}
      {phase === 'countdown' && (
        <div className="countdown-overlay">
          <div className="countdown-big">{Math.max(1, Math.ceil(hud.countdownT))}</div>
          <div className="countdown-sub">
            {mode.id === 'gem' && 'GRAB THE GEMS! 💎'}
            {mode.id === 'bounty' && 'COLLECT STARS! ⭐'}
            {mode.id === 'showdown' && 'LAST ONE STANDING WINS! 💀'}
          </div>
        </div>
      )}

      {/* ended overlay */}
      {endedText && (
        <div className={`ended-overlay ${endedText.won ? 'won' : 'lost'}`}>
          <div className="ended-title">{endedText.title}</div>
          <div className="ended-sub">{endedText.sub}</div>
        </div>
      )}

      {/* ------- bottom controls ------- */}
      <div className="hud-bottom">
        {/* move joystick — works with mouse AND touch */}
        <div
          className="joy-zone"
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            const r = e.currentTarget.getBoundingClientRect()
            inputRef.current?.joyDown(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2)
            setTouch(true)
          }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const dx = e.clientX - r.left - r.width / 2
            const dy = e.clientY - r.top - r.height / 2
            inputRef.current?.joyMove(dx, dy)
            if (joyKnobRef.current) {
              const k = clampVec({ x: dx, y: dy }, 34)
              joyKnobRef.current.style.transform = `translate(${k.x}px, ${k.y}px)`
            }
          }}
          onPointerUp={() => {
            inputRef.current?.joyUp()
            if (joyKnobRef.current) joyKnobRef.current.style.transform = 'translate(0px, 0px)'
          }}
          onPointerCancel={() => {
            inputRef.current?.joyUp()
            if (joyKnobRef.current) joyKnobRef.current.style.transform = 'translate(0px, 0px)'
          }}
        >
          <div className="joy-base" />
          <div className="joy-knob" ref={joyKnobRef} />
          <span className="zone-label">MOVE</span>
        </div>

        {/* aim joystick: tap = auto-aim shot · drag & release = aimed shot · hold = spray */}
        <div
          className="aim-zone"
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            const r = e.currentTarget.getBoundingClientRect()
            inputRef.current?.aimDown(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2)
            setTouch(true)
          }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const dx = e.clientX - r.left - r.width / 2
            const dy = e.clientY - r.top - r.height / 2
            inputRef.current?.aimMove(dx, dy)
            if (aimKnobRef.current) {
              const a = clampVec({ x: dx, y: dy }, 40)
              aimKnobRef.current.style.transform = `translate(${a.x}px, ${a.y}px)`
            }
          }}
          onPointerUp={() => {
            inputRef.current?.aimUp()
            if (aimKnobRef.current) aimKnobRef.current.style.transform = 'translate(0px, 0px)'
          }}
          onPointerCancel={() => {
            inputRef.current?.aimUp()
            if (aimKnobRef.current) aimKnobRef.current.style.transform = 'translate(0px, 0px)'
          }}
        >
          <div className="joy-base aim-base" />
          <div className="aim-knob" ref={aimKnobRef} />
          <span className="zone-label">AIM</span>
        </div>

        <div
          className={`fire-btn ${fireHeld ? 'active' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            inputRef.current?.setFireButton(true)
            setFireHeld(true)
            setTouch(true)
          }}
          onPointerUp={(e) => {
            e.preventDefault()
            inputRef.current?.setFireButton(false)
            setFireHeld(false)
          }}
          onPointerLeave={() => {
            inputRef.current?.setFireButton(false)
            setFireHeld(false)
          }}
        >
          {fireHeld ? '🔥' : '✊'}
        </div>

        {!touch && (
          <div className="kb-hints">
            <span><b>WASD</b> move</span>
            <span><b>MOUSE</b> aim</span>
            <span><b>CLICK</b> fire</span>
            <span><b>RIGHT-CLICK / E</b> super</span>
            <span><b>Q</b> gadget</span>
          </div>
        )}

        <div className="ability-buttons">
          <button
            className={`ability-btn gadget-btn ${hud.gadgets > 0 ? '' : 'empty'}`}
            onPointerDown={(e) => {
              e.preventDefault()
              gameRef.current?.queueGadget()
            }}
          >
            🧪<span className="ability-count">{hud.gadgets}</span>
          </button>
          <button
            className={`ability-btn super-btn ${superReady ? 'ready' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              gameRef.current?.queueSuper()
            }}
          >
            <span
              className="super-fill"
              style={{ height: `${Math.min(100, hud.superCharge * 100)}%` }}
            />
            {def.superName}
          </button>
        </div>
      </div>

      {/* pause overlay */}
      {paused && (
        <div className="pause-overlay">
          <div className="pause-card">
            <div className="pause-title">PAUSED</div>
            <button className="ui-btn ui-btn-primary" onClick={() => togglePause(false)}>
              RESUME
            </button>
            <button className="ui-btn ui-btn-secondary" onClick={() => setShowSettings(true)}>
              SETTINGS
            </button>
            <button className="ui-btn ui-btn-danger" onClick={quit}>
              QUIT MATCH
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          save={loadSave()}
          setSave={(s) => {
            audio.setSfxVolume(s.settings.sfx)
            audio.setMusicVolume(s.settings.music)
            audio.setMuted(s.muted)
            import('../game/save').then(({ persistSave }) => persistSave(s))
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
