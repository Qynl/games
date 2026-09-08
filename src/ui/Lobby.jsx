import React, { useState } from 'react'
import { MODES, MAPS } from '../game/data/maps.js'

export default function Lobby ({ profile, onQueue, onOnline, onBack }) {
  const [modeId, setModeId] = useState('1v1')
  const [mapId, setMapId] = useState('yard')
  const [bots, setBots] = useState(profile.settings.botLevel || 'normal')
  const mode = MODES.find((m) => m.id === modeId)
  const map = MAPS.find((m) => m.id === mapId)
  const eligible = MAPS.filter((m) => m.modes.includes(modeId === 'range' ? 'range' : (mode.bots > 0 || mode.teamA >= 3 ? '3v3' : mode.teamA >= 2 ? '2v2' : '1v1')))

  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>LOBBY</small></div>
        <div className="wallet">
          <div className="chip"><b>{profile.qyns}</b> ◈ QYNS</div>
          <button className="btn sm ghost" onClick={onBack}>◀ MENU</button>
        </div>
      </div>
      <div className="content">
        <div className="h">GAME MODE</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))' }}>
          {MODES.map((m) => (
            <div key={m.id} className={`card ${modeId === m.id ? 'on' : ''}`} onClick={() => {
              setModeId(m.id)
              if (m.id === 'range') setMapId('range')
              else if (mapId === 'range' || !MAPS.find((x) => x.id === mapId)?.modes.includes(m.id === 'range' ? 'range' : '1v1')) setMapId('yard')
            }}>
              <div className="nm">{m.name}</div>
              <div className="ds">{m.desc}</div>
              <div className="mt">
                <span>{m.bots > 0 ? `${m.bots} BOTS` : 'PVP'}</span>
                <span style={{ color: 'var(--cy)' }}>{m.teamA}v{m.teamB}</span>
              </div>
            </div>
          ))}
        </div>

        {modeId !== 'range' && (
          <>
            <div className="h" style={{ marginTop: 26 }}>MAP</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
              {MAPS.filter((m) => m.modes.includes('1v1') || m.modes.includes('2v2')).map((m) => (
                <div key={m.id} className={`card ${mapId === m.id ? 'on' : ''}`} onClick={() => setMapId(m.id)}>
                  <div className="nm">{m.name} <span style={{ color: 'var(--dim)', fontSize: 10 }}>{m.sub}</span></div>
                  <div className="ds">{m.desc}</div>
                  <div className="mt"><span>{m.brushes.length} BRUSHES</span><span style={{ color: 'var(--cy)' }}>SELECT</span></div>
                </div>
              ))}
            </div>
            <div className="h" style={{ marginTop: 26 }}>BOT DIFFICULTY</div>
            <div className="row">
              {['easy', 'normal', 'hard', 'qyn'].map((d) => (
                <button key={d} className={`btn sm ${bots === d ? 'pri' : 'ghost'}`} onClick={() => setBots(d)}>{d.toUpperCase()}</button>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 34, display: 'flex', gap: 14, alignItems: 'center' }}>
          <button className="btn pri" style={{ padding: '15px 40px', fontSize: 13 }} onClick={() => onQueue({ modeId, mapId, bots })}>
            {modeId === 'range' ? 'ENTER RANGE ▶' : 'QUEUE ▶'}
          </button>
          <div className="hint">
            {modeId === 'range'
              ? 'Free roam. Every weapon unlocked to try. Dummies respawn forever.'
              : `${mode.name} on ${map?.name} · first to 5 rounds · 150 HP · instant reset.`}
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          <button className="btn" style={{ padding: '13px 28px', fontSize: 12 }} onClick={onOnline}>ONLINE DUEL ▶</button>
          <div className="hint">
            Real 1 v 1 over WebRTC. You and a friend swap two codes — no server, no account.
          </div>
        </div>
      </div>
    </div>
  )
}
