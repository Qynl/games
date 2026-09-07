import { world, useWorld } from '../world/WorldStore'
import { getControls } from '../player/controls'

interface HUDProps {
  chatOpen: boolean
  editorOpen: boolean
  onToggleChat: () => void
  onToggleEditor: () => void
  onToggleSettings: () => void
}

export function HUD({ chatOpen, editorOpen, onToggleChat, onToggleEditor, onToggleSettings }: HUDProps): JSX.Element {
  useWorld()
  const s = world.aiStatus
  const controls = getControls()

  const active = world.objectives.filter((o) => o.status === 'active').slice(-3)
  const completed = world.objectives.filter((o) => o.status === 'complete').slice(-1)
  const objs = [...active, ...completed]
  const feed = world.feed.slice(-4).reverse()

  const dotClass =
    s.mood === 'thinking'
      ? 'dot thinking'
      : s.mode === 'online'
        ? 'dot online'
        : s.mode === 'autopilot'
          ? 'dot autopilot'
          : 'dot offline'

  const statusLabel =
    s.mode === 'online' ? 'CREATOR · ONLINE' : s.mode === 'autopilot' ? 'CREATOR · AUTOPILOT' : 'CREATOR · OFFLINE'

  return (
    <>
      <div className="hud-top-left">
        <div className="hud-chip">
          <span className={dotClass} />
          <span>{statusLabel}</span>
          {s.model ? <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>({s.model})</span> : null}
        </div>
        <div className="hud-chip" style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, maxWidth: 320 }}>
          {s.task || '…'}
        </div>
      </div>

      <div className="hud-top-right">
        <div className="hud-chip">◎ {world.score}</div>
        <button className={`btn btn-icon ${chatOpen ? 'btn-active' : ''}`} onClick={onToggleChat} title="Chat (C)">
          💬
        </button>
        <button className={`btn btn-icon ${editorOpen ? 'btn-active' : ''}`} onClick={onToggleEditor} title="Virtual editor (E)">
          🛠️
        </button>
        <button className="btn btn-icon" onClick={onToggleSettings} title="Ollama settings">
          ⚙️
        </button>
      </div>

      {objs.length > 0 && (
        <div className="hud-objectives">
          {objs.map((o) => (
            <div key={o.id} className={`objective ${o.status === 'complete' ? 'complete' : ''}`}>
              <span className="flag">{o.status === 'complete' ? '✔' : '◆'}</span>
              {o.title}
            </div>
          ))}
        </div>
      )}

      <div className="hud-feed">
        {feed.map((f) => (
          <div key={f.id} className={`feed-item ${f.source === 'ai' ? 'ai' : f.source === 'system' ? 'system' : ''}`}>
            {f.text}
          </div>
        ))}
      </div>

      {(controls.locked || controls.dragMode) && <div className="crosshair" />}
    </>
  )
}