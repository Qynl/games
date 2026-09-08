import React from 'react'

function Slider ({ label, value, min, max, step, onChange, fmt }) {
  return (
    <div className="set">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <b style={{ width: 74, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt ? fmt(value) : value}</b>
    </div>
  )
}
function Toggle ({ label, value, onChange }) {
  return (
    <div className="set">
      <label>{label}</label>
      <div className={`sw ${value ? 'on' : ''}`} onClick={() => onChange(!value)}><i /></div>
    </div>
  )
}

export default function Settings ({ profile, save, onBack }) {
  const s = profile.settings
  const set = (k, v) => save({ ...profile, settings: { ...s, [k]: v } })
  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>SETTINGS</small></div>
        <div className="wallet"><button className="btn sm ghost" onClick={onBack}>◀ MENU</button></div>
      </div>
      <div className="content" style={{ maxWidth: 760 }}>
        <div className="h">FEEL</div>
        <Slider label="FIELD OF VIEW" value={s.fov} min={75} max={120} step={1} onChange={(v) => set('fov', v)} fmt={(v) => v + '°'} />
        <Toggle label="AUTO SPRINT" value={s.autoSprint !== false} onChange={(v) => set('autoSprint', v)} />
        <div className="hint" style={{ marginTop: 4 }}>Sprint by pushing forward. Off means sprint sits on E.</div>
        <Slider label="MOUSE SENSITIVITY" value={s.sensitivity} min={0.2} max={3} step={0.05} onChange={(v) => set('sensitivity', v)} fmt={(v) => v.toFixed(2)} />
        <Toggle label="INVERT Y" value={s.invertY} onChange={(v) => set('invertY', v)} />
        <Slider label="VOLUME" value={s.volume} min={0} max={1} step={0.05} onChange={(v) => set('volume', v)} fmt={(v) => Math.round(v * 100) + '%'} />
        <Toggle label="SOUND" value={s.sound} onChange={(v) => set('sound', v)} />

        <div className="h" style={{ marginTop: 26 }}>DISPLAY</div>
        <Slider label="BRIGHTNESS" value={s.brightness ?? 1} min={0.7} max={1.6} step={0.05}
          onChange={(v) => set('brightness', v)} fmt={(v) => Math.round(v * 100) + '%'} />
        <div className="hint" style={{ marginTop: 4 }}>1.00 is the intended look. Push it up if your screen is dim.</div>
        <div className="set">
          <label>QUALITY</label>
          <select className="sel" value={s.quality} onChange={(e) => set('quality', e.target.value)}>
            <option value="high">HIGH</option><option value="low">PERFORMANCE</option>
          </select>
        </div>
        <div className="set">
          <label>CROSSHAIR</label>
          <select className="sel" value={s.crosshair || 'cross'} onChange={(e) => set('crosshair', e.target.value)}>
            <option value="cross">CROSS</option><option value="dot">DOT</option>
            <option value="circle">CIRCLE</option><option value="tick">TICKS</option>
          </select>
        </div>
        <Toggle label="MOVEMENT TELEMETRY PANEL" value={s.showMovement} onChange={(v) => set('showMovement', v)} />
        <Toggle label="ADAPTIVE RESOLUTION" value={s.adaptive !== false} onChange={(v) => set('adaptive', v)} />
        <div className="hint" style={{ marginTop: 4 }}>Drops pixels instead of frames when the FPS dips.</div>

        <div className="h" style={{ marginTop: 26 }}>GAME</div>
        <div className="set">
          <label>BOT DIFFICULTY</label>
          <select className="sel" value={s.botLevel} onChange={(e) => set('botLevel', e.target.value)}>
            <option value="easy">EASY</option><option value="normal">NORMAL</option>
            <option value="hard">HARD</option><option value="qyn">QYN</option>
          </select>
        </div>
        <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
          <button className="btn ghost" onClick={() => {
            if (!confirm('Reset all progress, Qyns and unlocks?')) return
            localStorage.removeItem('qyngun.profile.v1')
            location.reload()
          }}>RESET PROGRESS</button>
        </div>
      </div>
    </div>
  )
}
