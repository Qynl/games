import React from 'react'
import { xpForLevel } from '../game/core/Persistence.js'

export default function Result ({ data, profile, onAgain, onLobby }) {
  const won = data.winner === 'a'
  const st = data.stats || {}
  const acc = st.shots ? Math.round((st.hits / st.shots) * 100) : 0
  const board = (data.board || []).slice().sort((a, b) => b.damage - a.damage)
  const mvp = board[0]
  return (
    <div className="screen">
      <div className="hero">
        <h1 style={{ fontSize: 'clamp(40px,8vw,104px)', background: won
          ? 'linear-gradient(96deg,#39d98a,#fff 50%,#6ee7ff)' : 'linear-gradient(96deg,#ff4d6d,#fff 50%,#ff8a3d)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          {won ? 'MATCH WON' : 'MATCH LOST'}
        </h1>
        <p>{data.scoreA} — {data.scoreB}</p>
        <div className="row" style={{ marginTop: 24, justifyContent: 'center' }}>
          {[
            ['ROUNDS', `${data.scoreA}/${data.scoreA + data.scoreB}`],
            ['KILLS', st.kills || 0],
            ['DEATHS', st.deaths || 0],
            ['HEADSHOTS', st.headshots || 0],
            ['DAMAGE', Math.round(st.damage || 0)],
            ['ACCURACY', acc + '%'],
            ['TOP SPEED', (st.topSpeed || 0).toFixed(1) + ' m/s'],
          ].map(([k, v]) => (
            <div key={k} className="chip" style={{ flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 116 }}>
              <span style={{ fontSize: 8.5, letterSpacing: '.18em', color: 'var(--dim)' }}>{k}</span>
              <b style={{ fontSize: 17, color: 'var(--cy)' }}>{v}</b>
            </div>
          ))}
        </div>
        {board.length > 1 && (
          <div style={{ width: 460, marginTop: 28 }}>
            <div className="h" style={{ textAlign: 'left' }}>SCOREBOARD</div>
            {board.map((r, i) => (
              <div key={r.name} className={`br ${r.you ? 'you' : ''}`} style={{
                display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 70px 48px', gap: 8,
                fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 6px',
                background: i === 0 ? 'rgba(255,209,102,.09)' : 'rgba(255,255,255,.022)',
                borderLeft: `2px solid ${r.you ? 'var(--cy)' : r.team === 'a' ? 'rgba(110,231,255,.35)' : 'rgba(255,138,61,.35)'}`,
              }}>
                <span style={{ textAlign: 'left' }}>{r.name}{i === 0 ? ' ★' : ''}</span>
                <span style={{ textAlign: 'right', color: 'var(--gr)' }}>{r.kills}</span>
                <span style={{ textAlign: 'right', color: 'var(--rd)' }}>{r.deaths}</span>
                <span style={{ textAlign: 'right', color: 'var(--vi)' }}>{r.assists || 0}</span>
                <span style={{ textAlign: 'right', color: 'var(--dim)' }}>{r.damage}</span>
                <span style={{ textAlign: 'right', color: 'var(--dim2)' }}>{r.acc}%</span>
              </div>
            ))}
            {mvp && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--gd)', letterSpacing: '.2em' }}>
              MVP — {mvp.name} · {mvp.damage} DAMAGE · TOP {mvp.topSpeed} M/S</div>}
          </div>
        )}

        <div className="h" style={{ marginTop: 34, width: 460, textAlign: 'left' }}>REWARDS</div>
        <div style={{ width: 460 }}>
          {Object.entries(data.breakdown || {}).map(([k, v]) => (
            <div key={k} className="kfi" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, width: '100%' }}>
              <span style={{ color: 'var(--dim)' }}>{k.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
              <b style={{ color: 'var(--gd)' }}>+{v} ◈</b>
            </div>
          ))}
          <div className="kfi" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, width: '100%', borderRightColor: 'var(--gd)' }}>
            <b>TOTAL</b>
            <b style={{ color: 'var(--gd)' }}>+{data.qyns} ◈  ·  +{data.xp} XP</b>
          </div>
          {data.levels > 0 && <div style={{ marginTop: 12, color: 'var(--vi)', letterSpacing: '.2em', fontSize: 12 }}>
            LEVEL UP → {profile.level}</div>}
          <div className="bar" style={{ marginTop: 10 }}><i style={{ width: (profile.xp / xpForLevel(profile.level)) * 100 + '%' }} /></div>
        </div>
        <div className="row" style={{ marginTop: 30 }}>
          <button className="btn pri" onClick={onAgain}>PLAY AGAIN</button>
          <button className="btn" onClick={onLobby}>BACK TO LOBBY</button>
        </div>
      </div>
    </div>
  )
}
