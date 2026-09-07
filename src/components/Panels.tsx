// Panels — chat, virtual-editor and settings overlays (DOM, non-intrusive).

import { useEffect, useRef, useState } from 'react'
import type { GameSession } from '../game/Session'
import { GAME_SCENES } from '../ai/tools'
import { useSessionTick } from './Overlays'

function PanelShell({ title, onClose, children, className }: { title: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel ${className ?? ''}`}>
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        <button className="panel-x" onClick={onClose}>✕</button>
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}

const QUICK_IDEAS = [
  'make me something to play',
  'build a castle',
  'make it rain',
  'turn on the night',
  'make the ground hilly',
  'give me a car',
  'what are you working on?',
  'scare me',
]

export function ChatPanel({ session }: { session: GameSession }) {
  useSessionTick(session)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [session.speech.length])
  const send = (t?: string) => {
    const msg = (t ?? text).trim()
    if (!msg) return
    session.sendChat(msg)
    setText('')
  }
  const busy = session.ui.modelBusy
  const last = session.speech[session.speech.length - 1]
  return (
    <PanelShell title="CHAT — talk to CREATOR" onClose={() => session.setPanel('chat')}>
      <div className="chat-suggests">
        {QUICK_IDEAS.map((q) => (
          <button key={q} className="chip-btn suggest" onClick={() => send(q)}>{q}</button>
        ))}
      </div>
      <div className="chat-list" ref={listRef}>
        {session.speech.map((s) => (
          <div key={s.id} className={`msg msg-${s.speaker}`}>
            <span className="msg-who">{s.speaker === 'ai' ? 'CREATOR' : s.speaker === 'player' ? 'you' : 'world'}</span>
            <span className="msg-text">{s.text}</span>
          </div>
        ))}
        {busy && (!last || last.speaker === 'player') && (
          <div className="typing-row"><i /><i /><i /></div>
        )}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={text}
          placeholder="say something to the AI…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
            if (e.key === 'Escape') session.setPanel('chat')
          }}
          autoFocus
        />
        <button className="btn-primary small" onClick={() => send()}>send</button>
      </div>
    </PanelShell>
  )
}

export function EditorPanel({ session }: { session: GameSession }) {
  useSessionTick(session)
  const [tab, setTab] = useState<'project' | 'scripts' | 'logs'>('project')
  const [code, setCode] = useState('')
  const [scriptName, setScriptName] = useState('my_script')
  const engine = session.engine
  const editor = session.editor

  return (
    <PanelShell title="VIRTUAL EDITOR — the AI's project" onClose={() => session.setPanel('editor')} className="panel-wide">
      <div className="tabs">
        <button className={`tab ${tab === 'project' ? 'on' : ''}`} onClick={() => setTab('project')}>project files</button>
        <button className={`tab ${tab === 'scripts' ? 'on' : ''}`} onClick={() => setTab('scripts')}>scripts</button>
        <button className={`tab ${tab === 'logs' ? 'on' : ''}`} onClick={() => setTab('logs')}>event log</button>
      </div>

      {tab === 'project' && (
        <div className="editor-tab">
          <div className="file-tree">
            {editor.files().map((f) => (
              <div key={f.name} className={`file-row ${f.kind === 'folder' ? 'folder' : ''}`}>
                <span className="file-icon">{f.kind === 'folder' ? '▸' : '·'}</span>
                <span className="file-name">{f.name}</span>
                <span className="file-note">{f.note}</span>
              </div>
            ))}
          </div>
          <div className="world-box">
            <div className="world-box-title">world snapshot</div>
            <pre className="world-pre">{prettyStatus(engine.worldStatus())}</pre>
          </div>
          <div className="quick-actions">
            <span className="qa-title">quick-build a scenario (tests the engine without Ollama):</span>
            <div className="qa-buttons">
              {GAME_SCENES.slice(0, 10).map((sc) => (
                <button key={sc} className="chip-btn" onClick={() => session.quickBuild(sc)}>{sc}</button>
              ))}
            </div>
            <div className="qa-actions">
              <button className="btn-ghost small" onClick={() => session.lookAtHead()}>look at the head</button>
              <select className="sel" value="" onChange={(e) => e.target.value && session.teleportTo(e.target.value)}>
                <option value="">teleport to object…</option>
                {session.ui.teleportList.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button className="btn-danger small" onClick={() => { if (confirm('Reset the world to a clean baseplate?')) session.resetWorld() }}>reset world</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'scripts' && (
        <div className="editor-tab">
          <div className="script-new">
            <input className="chat-input" value={scriptName} onChange={(e) => setScriptName(e.target.value.replace(/[^\w]/g, '_'))} placeholder="script name" />
            <textarea
              className="code-area"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={'// scripts run in the sandbox every ~0.9s\n// only the world API is available (w.*)\n\nw.createObject({ kind: "cube", name: "apple", pos: [0, 10, 0], scale: 0.5, color: "#ff5b3f" })'}
            />
            <div className="row">
              <button className="btn-primary small" onClick={() => { session.saveScript(scriptName, code); setCode('') }}>save + run</button>
              <span className="muted">scripts can only touch the world API — no files, no shell, no internet</span>
            </div>
          </div>
          <div className="script-list">
            {engine.api.scripts.length === 0 && <div className="muted pad">no scripts yet — the AI writes these, or you can</div>}
            {engine.api.scripts.map((s) => (
              <div key={s.id} className="script-row">
                <span className="file-name">{s.name}.js</span>
                <span className="muted">{s.code.length} chars</span>
                <button className={`chip-btn ${editor.scriptRunning[s.name] ? 'running' : ''}`} onClick={() => editor.setScriptRunning(s.name, !editor.scriptRunning[s.name])}>
                  {editor.scriptRunning[s.name] ? '■ stop' : '▶ run'}
                </button>
                <button className="chip-btn danger" onClick={() => editor.deleteScript(s.name)}>delete</button>
                {editor.lastResults[s.name] && <code className="last-result">{editor.lastResults[s.name]}</code>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="editor-tab">
          <div className="log-list">
            {engine.logs.slice(-60).map((l, i) => (
              <div key={i} className={`log-line log-${l.level}`}><span className="log-time">{new Date(l.at).toLocaleTimeString()}</span>{l.text}</div>
            ))}
            {engine.logs.length === 0 && <div className="muted">no events yet</div>}
          </div>
        </div>
      )}
    </PanelShell>
  )
}

function prettyStatus(w: Record<string, unknown>): string {
  const rows = [
    ['project', String(w.projectName ?? '-')],
    ['objects', String(w.objectCount ?? 0)],
    ['npcs', String(w.npcsTotal ?? 0)],
    ['vehicles', String(w.vehiclesTotal ?? 0)],
    ['terrain', String(w.terrain ?? 'flat')],
    ['weather', String(w.weather ?? 'clear')],
    ['time', String(w.time ?? '12:00')],
    ['course', String(w.course ?? 'none')],
  ]
  return rows.map(([k, v]) => `${k.padEnd(9)} ${v}`).join('\n')
}

export function SettingsPanel({ session }: { session: GameSession }) {
  useSessionTick(session)
  const [endpoint, setEndpoint] = useState(session.settings.ollamaUrl)
  const [modelText, setModelText] = useState(session.settings.model)
  const ui = session.ui
  return (
    <PanelShell title="SETTINGS — AI connection" onClose={() => session.setSettingsOpen(false)}>
      <div className="settings">
        <div className="set-row">
          <label>Ollama endpoint</label>
          <input className="chat-input" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:11434" />
          <button className="btn-primary small" onClick={() => session.setEndpoint(endpoint)}>connect</button>
        </div>
        <div className="conn-line">
          <span className={`dot-lg ${ui.connected ? 'ok' : 'bad'}`} />
          {ui.connected ? `connected · ${ui.model} · ${ui.latency ?? '-'}ms` : `offline — ${ui.modelNote || 'is Ollama running?'}`}
        </div>
        <div className="set-row col">
          <label>Model</label>
          {ui.models.length > 0 ? (
            <select className="sel wide" value={ui.model} onChange={(e) => session.setModel(e.target.value)}>
              {ui.models.map((m) => <option key={m.name} value={m.name}>{m.name}{m.short ? ` (${m.short})` : ''}</option>)}
            </select>
          ) : (
            <div className="row">
              <input
                className="chat-input"
                value={modelText}
                onChange={(e) => setModelText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') session.setModel(modelText) }}
                placeholder="type a model name, e.g. qwen2.5:7b"
              />
              <button className="btn-primary small" onClick={() => session.setModel(modelText)}>use</button>
            </div>
          )}
          {ui.models.length > 0 && (
            <label className="check">
              <input type="checkbox" checked={ui.autoModel} onChange={(e) => session.setAutoModel(e.target.checked)} />
              auto-pick a good model when connecting
            </label>
          )}
        </div>
        <div className="set-row">
          <label>autonomous AI loop</label>
          <button className={`toggle ${ui.autonomous ? 'on' : ''}`} onClick={() => session.setAutonomous(!ui.autonomous)}>{ui.autonomous ? 'ON' : 'OFF'}</button>
          <span className="muted">off = the AI only reacts to you</span>
        </div>
        <div className="set-row">
          <label>AI cycle speed (s)</label>
          <input type="range" min={1.2} max={10} step={0.2} value={ui.interval} onChange={(e) => session.setInterval(parseFloat(e.target.value))} />
          <span className="val">{ui.interval.toFixed(1)}</span>
        </div>
        <div className="set-row">
          <label>sound</label>
          <button className={`toggle ${ui.speechOn ? 'on' : ''}`} onClick={() => session.setSpeech(!ui.speechOn)}>{ui.speechOn ? 'ON' : 'OFF'}</button>
        </div>
        <div className="set-row">
          <label>mouse sensitivity</label>
          <input type="range" min={0.3} max={2.6} step={0.05} value={session.engine.sensitivity} onChange={(e) => session.engine.setSensitivity(parseFloat(e.target.value))} />
          <span className="val">{session.engine.sensitivity.toFixed(2)}</span>
        </div>
        <div className="set-row">
          <button className="btn-ghost small" onClick={() => { session.refreshTeleportList(); session.setModel(session.settings.model || ui.model) }}>refresh connection</button>
          <span className="muted pad-l">installed: {ui.models.length}</span>
        </div>
      </div>
    </PanelShell>
  )
}

export function PauseScreen({ session }: { session: GameSession }) {
  useSessionTick(session)
  return (
    <div className="pause-wrap">
      <div className="pause-card">
        <div className="pause-title">paused</div>
        <div className="start-keys">
          <span><b>WASD</b> move</span><span><b>Mouse</b> look</span><span><b>Space</b> jump</span><span><b>Ctrl</b> crouch</span><span><b>E</b> use</span><span><b>T</b> talk</span><span><b>B</b> editor</span>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            session.setPanel('none')
            session.setSettingsOpen(false)
            session.setControls(true)
            document.querySelector('canvas')?.requestPointerLock()
          }}
        >
          resume
        </button>
        <button className="btn-ghost" onClick={() => session.setSettingsOpen(true)}>
          AI settings
        </button>
      </div>
    </div>
  )
}
