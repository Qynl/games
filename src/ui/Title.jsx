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
          <span><b>WASD</b> MOVE</span><span><b>SHIFT</b> SLIDE</span><span><b>Q</b> DASH</span>
          <span><b>SPACE</b> JUMP</span><span><b>RMB</b> AIM</span><span><b>F</b> UTILITY</span>
          <span><b>SHIFT</b> IN THE AIR = DIVE</span><span><b>CTRL</b> CROUCH</span>
          <span><b>SPACE</b> AT A WALL = RUN IT</span><span><b>SPACE</b> AGAIN = KICK OFF</span>
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
                • <b style={{ color: 'var(--cy)' }}>DASH (Q):</b> a burst that adds to the speed you
                already have — 7 m/s on top, and never less than 13. It only partly goes where your keys
                point, so a dash out of a fast line is worth more than one from a standstill. Works in the
                air, one charge, recharges in three seconds. The <i>DASH CHARGE</i> gear gives you two and
                makes each one harder.<br />
                • <b style={{ color: 'var(--cy)' }}>DIVE (SHIFT IN THE AIR):</b> you commit to the ground —
                down at 9.5 m/s and 13% faster forward, with more air control to steer it. Land one and the
                fall speed is paid back as forward speed, so a dive is a way to <i>buy</i> pace. One per
                jump. Hold SHIFT through the landing and you slide straight out of it.<br />
                • <b style={{ color: 'var(--cy)' }}>SPRINT IS AUTOMATIC</b> while you push forward — Shift
                belongs to the slide now. Turn it off in Settings and sprint moves to <b>E</b>.<br />
                • <b style={{ color: 'var(--cy)' }}>WALL RUN:</b> hit a wall in the air while moving along it fast
                and you stick to it — gravity nearly lets go for about a second, and your speed survives.
                Jump again to kick off it, twice per jump.<br />
                • <b style={{ color: 'var(--cy)' }}>LEDGE GRAB:</b> meet a lip your jump cannot quite clear and
                the vault happens by itself — it is real velocity, never a warp.<br />
                • <b style={{ color: 'var(--cy)' }}>Guns climb on a fixed pattern.</b> Shot six always goes to the
                same place, so the pull-down can be learned. Stop firing and the aim comes home.<br />
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
