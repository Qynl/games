import React, { useState } from 'react'

export default function Title ({ profile, onPlay, onArmory, onSkins, onSettings }) {
  const [help, setHelp] = useState(false)
  return (
    <div className="screen">
      <div className="hero">
        <h1>QYNGUN</h1>
        <p>MOMENTUM IS DAMAGE</p>
        <div className="cta">
          <button className="btn pri" style={{ padding: '15px 34px', fontSize: 13 }} onClick={onPlay}>▶ ENTER LOBBY</button>
          <button className="btn" onClick={onArmory}>ARMORY</button>
          <button className="btn" onClick={onSkins}>SKINS</button>
          <button className="btn" onClick={onSettings}>SETTINGS</button>
          <button className="btn ghost" onClick={() => setHelp(!help)}>{help ? 'CLOSE' : 'MOVEMENT GUIDE'}</button>
        </div>
        <div className="keys">
          <span><b>WASD</b> MOVE</span><span><b>SHIFT</b> SPRINT</span><span><b>CTRL</b> SLIDE</span>
          <span><b>SPACE</b> JUMP</span><span><b>RMB</b> AIM</span><span><b>F</b> UTILITY</span>
        </div>
        {help && (
          <div className="panel" style={{ position: 'static', marginTop: 34, maxWidth: 800, textAlign: 'left', clipPath: 'none' }}>
            <div className="h">THE CHAIN</div>
            <div className="hint" style={{ fontSize: 12.5, lineHeight: 2 }}>
              <div>SPRINT <span style={{ color: 'var(--cy)' }}>→</span> SLIDE <span style={{ color: 'var(--cy)' }}>→</span> JUMP
                <span style={{ color: 'var(--cy)' }}>→</span> AIR STRAFE <span style={{ color: 'var(--cy)' }}>→</span> LAND
                <span style={{ color: 'var(--cy)' }}>→</span> SLIDE</div>
              <div style={{ color: 'var(--dim)' }}>
                • Sliding while sprinting keeps every bit of your speed — the slide is momentum, not an animation.<br />
                • Jump out of a slide without losing horizontal velocity; hop early for a small bonus.<br />
                • In the air, <b style={{ color: 'var(--cy)' }}>A</b>/<b style={{ color: 'var(--cy)' }}>D</b> plus a smooth mouse turn
                curves your path and <i>gains</i> speed. Holding W does nothing up there.<br />
                • Downhill sprints and slides accelerate. Uphill bleeds. Slopes are never walls.<br />
                • Jump is buffered before landing and coyote-timed after leaving a ledge. Both are invisible.<br />
                • <b style={{ color: 'var(--or)' }}>Damage scales with speed.</b> A 15 m/s knife hit does double.
              </div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 30, display: 'flex', gap: 14 }}>
          <div className="chip"><b>{profile.qyns}</b> ◈ QYNS</div>
          <div className="chip">LEVEL <b>{profile.level}</b></div>
          <div className="chip">{profile.stats.kills} <b>KILLS</b></div>
          <div className="chip">TOP <b>{profile.stats.topSpeed || 0}</b> M/S</div>
        </div>
      </div>
    </div>
  )
}
