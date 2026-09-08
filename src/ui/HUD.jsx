import React from 'react'
import { CHAINS } from '../game/core/Movement.js'

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1)

export default function HUD ({ hud, paused, needsLock, onResume, onQuit, showMv, mapName, mode }) {
  if (!hud) return null
  const gap = Math.min(26, 3 + (hud.spread || 0) * 2.6)
  const spd = hud.speed || 0
  const pct = Math.min(100, (spd / 18) * 100)
  const maxHp = hud.maxHp || 150
  const low = hud.hp / maxHp < 0.34
  const chains = hud.chains?.done || {}

  return (
    <div className="hud">
      <div className="vig" />
      {/* ── speed: the faster you go, the more the world streaks ── */}
      {hud.speed > 10 && (
        <div className={`speedlines ${hud.wallRunning ? 'wall' : ''} ${hud.sliding ? 'slide' : ''} ${hud.diving ? 'dive' : ''}`}
          style={{ opacity: Math.min(1, (hud.speed - 10) / 8) }} />
      )}

      <div className="dmg" style={{ opacity: hud.damageFlash * 0.9 }} />
      {low && hud.alive && <div className="lowhp" style={{ opacity: 0.5 + Math.sin(Date.now() / 260) * 0.25 }} />}
      <div className="flash" style={{ opacity: Math.min(0.92, (hud.flashTime || 0) * 0.6) }} />

      {/* ── crosshair ─────────────────────────────────────────────── */}
      <div className={`center cross ch-${hud.crosshair || 'cross'} ${hud.onTarget ? 'tgt' : ''}`} style={{ opacity: hud.ads > 0.9 ? 0 : 1 }}>
        <i className="d" style={{ width: 2 + (hud.reloading ? 0 : 1) }} />
        <i className="t" style={{ left: 21, top: 21 - gap - 4, width: 2, height: 5 }} />
        <i className="t" style={{ left: 21, top: 21 + gap, width: 2, height: 5 }} />
        <i className="t" style={{ left: 21 - gap - 4, top: 21, width: 5, height: 2 }} />
        <i className="t" style={{ left: 21 + gap, top: 21, width: 5, height: 2 }} />
        <i className="ring" style={{ width: gap * 2 + 11, height: gap * 2 + 11, left: 22 - gap - 5.5, top: 22 - gap - 5.5 }} />
        <div className={`hm ${hud.hitmarker > 0 ? 'on' : ''} ${hud.hitmarker > 0 && hud.headshot ? 'hs' : ''} ${hud.killHit > 0 ? 'kill' : ''}`}>
          <i /><i /><i /><i />
        </div>
      </div>

      {/* ── damage direction ──────────────────────────────────────── */}
      <div className="center dmgring">
        {(hud.hitDirs || []).map((h) => (
          <div key={h.id} className="dmga" style={{ transform: `rotate(${h.ang * 57.2958}deg)`, opacity: Math.min(1, h.t / 0.9) }}>
            <i />
          </div>
        ))}
      </div>

      {/* ── callout banners (double kill, match point…) ───────────── */}
      <div className="banners">
        {(hud.banners || []).map((b) => (
          <div key={b.id} className={`bann ${b.kind || 'info'}`} style={{ opacity: Math.min(1, b.t / 0.45) }}>{b.text}</div>
        ))}
      </div>

      {/* ── movement readout ──────────────────────────────────────── */}
      {showMv && (
        <div className="panel mv">
          <div className="t">MOVEMENT TELEMETRY</div>
          <div className="big">{f1(spd)}<small>M/S</small>
            <span style={{ float: 'right', fontSize: 12, color: 'var(--dim)' }}>TOP {f1(hud.topSpeed || 0)}</span>
          </div>
          <div className="spdbar">
            <i style={{ width: pct + '%' }} />
            <u style={{ left: '56%' }} />
          </div>
          <div className="l"><span>VELOCITY XZ</span><b>{f1(Math.hypot(hud.vel?.x || 0, hud.vel?.z || 0))}</b></div>
          <div className="l"><span>VELOCITY Y</span><b>{f1(hud.vert || 0)}</b></div>
          <div className="l"><span>STATE</span>
            <b className="on">{hud.wallRunning ? 'WALL' : hud.grounded ? (hud.sliding ? 'SLIDING' : 'GROUND') : 'AIR'}</b></div>
          <div className="l"><span>SLOPE</span><b>{(Math.acos(Math.min(1, hud.slope || 1)) * 57.3).toFixed(0)}°</b></div>
          <div className="pills">
            <span className={`pill ${hud.sprinting ? 'on' : ''}`}>SPRINT</span>
            <span className={`pill ${hud.sliding ? 'on' : ''}`}>SLIDE</span>
            <span className={`pill ${hud.crouching ? 'on' : ''}`}>CROUCH</span>
            <span className={`pill ${!hud.grounded ? 'on' : ''}`}>AIR</span>
            <span className={`pill ${hud.wallRunning ? 'on' : ''}`}>WALL</span>
            <span className={`pill ${hud.haste ? 'on' : ''}`}>HASTE</span>
          </div>
          <div className="t" style={{ marginTop: 10 }}>CHAINS {hud.chains?.count || 0}/{CHAINS.length}</div>
          <div className="chainrow">
            {CHAINS.map((c) => <i key={c.id} className={chains[c.id] ? 'on' : ''} title={c.name} />)}
          </div>
          <div style={{ marginTop: 6, fontSize: 9.5, color: 'var(--dim2)', lineHeight: 1.5, minHeight: 26 }}>
            {CHAINS.filter((c) => !chains[c.id])[0]?.name || 'ALL CHAINS CLEAN'}
          </div>
        </div>
      )}

      {/* ── health ────────────────────────────────────────────────── */}
      <div className="panel hp">
        {hud.spawnGuard > 0 && <div className="shield">SPAWN SHIELD {hud.spawnGuard.toFixed(1)}s</div>}
        <div className="n" style={{ color: low ? 'var(--rd)' : '#fff' }}>{hud.hp}<small> / {maxHp} HP</small></div>
        <div className={`hpbar ${low ? 'low' : ''}`}><i style={{ width: Math.max(0, (hud.hp / maxHp) * 100) + '%' }} /></div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em' }}>
          {mapName} · {String(mode).replace('_', ' ')}
        </div>
      </div>

      {/* ── weapon ────────────────────────────────────────────────── */}
      <div className="panel ammo">
        <div className="w">{hud.weapon}</div>
        <div className="n">{hud.ammo}<span> / {hud.reserve}</span></div>
        {hud.reloading && <div className="reload" style={{ position: 'static', marginTop: 6, width: '100%' }}>
          <i style={{ width: hud.reloadProgress * 100 + '%' }} /></div>}
        {hud.ammo !== '∞' && hud.ammo === 0 && !hud.reloading && (
          <div style={{ color: 'var(--rd)', fontSize: 11, letterSpacing: '.2em' }}>PRESS R</div>)}
      </div>
      <div className="panel util">
        [F] {hud.utility?.name} <b>×{hud.utility?.uses}</b>
      </div>
      {hud.dash && (
        <div className={`panel dashp ${hud.dash.charges > 0 ? '' : 'dry'}`}>
          <div className="lbl">[Q] DASH{hud.dash.gear ? ' +' : ''}</div>
          <div className="pips">
            {Array.from({ length: hud.dash.max }, (_, i) => (
              <i key={i} className={i < hud.dash.charges ? 'on' : ''} />
            ))}
          </div>
          {hud.dash.charges < hud.dash.max && (
            <div className="reload" style={{ position: 'static', marginTop: 5, width: '100%' }}>
              <i style={{ width: (1 - hud.dash.cd / hud.dash.cdMax) * 100 + '%' }} />
            </div>
          )}
        </div>
      )}

      {/* ── momentum damage ───────────────────────────────────────── */}
      {spd > 5 && (
        <div className="momentum">MOMENTUM DAMAGE ×{hud.momentum.toFixed(2)}</div>
      )}

      {/* ── netplay status ────────────────────────────────────────── */}
      {hud.net && (
        <div className="netind">
          <b style={{ color: hud.net.state === 'open' ? 'var(--gr)' : 'var(--rd)' }}>●</b>
          {hud.net.role === 'host' ? 'HOST' : 'GUEST'} · {hud.net.ping}ms
          {hud.net.peer && <span> · VS {hud.net.peer}</span>}
        </div>
      )}

      {/* ── score ─────────────────────────────────────────────────── */}
      <div className="score">
        <span className="r">ROUND {hud.round?.round}</span>
        <span className="a">{hud.round?.scoreA}</span>
        <span style={{ color: 'var(--dim)' }}>:</span>
        <span className="b">{hud.round?.scoreB}</span>
        <span className="r" style={hud.matchPoint ? { color: 'var(--gd)', fontWeight: 700 } : undefined}>
          {hud.matchPoint ? 'MATCH POINT' : 'FIRST TO 5'}</span>
      </div>

      {/* ── killfeed ──────────────────────────────────────────────── */}
      <div className="kf">
        {(hud.killfeed || []).slice(-5).map((k) => (
          <div key={k.id} className={`kfi ${k.mine ? 'mine' : ''}`}>
            <b style={{ color: k.mine ? 'var(--cy)' : 'var(--txt)' }}>{k.killer}</b>
            <span style={{ color: 'var(--dim)' }}> {k.head ? '⌖' : '›'} </span>
            <b>{k.victim}</b>
            {k.weapon && <i style={{ color: 'var(--dim2)', fontStyle: 'normal', marginLeft: 6 }}>{k.weapon}</i>}
          </div>
        ))}
      </div>

      {/* ── round banners ─────────────────────────────────────────── */}
      {hud.round?.phase === 'countdown' && (
        <div className="banner" style={{ color: 'var(--cy)' }}>
          ROUND {hud.round.round}
          <small>{Math.ceil(hud.round.timer)}</small>
        </div>
      )}
      {!hud.alive && hud.round?.phase === 'live' && (
        <div className="banner lose" style={{ fontSize: 22 }}>
          ELIMINATED
          <small>{hud.spectating ? `SPECTATING — ${hud.spectating} · ${Math.ceil(hud.respawnTimer || 0)}s` : `${Math.ceil(hud.respawnTimer || 0)}s`}</small>
        </div>
      )}
      {hud.round?.phase === 'roundend' && (
        <div className={`banner ${hud.round.scoreA > hud.round.scoreB ? 'win' : 'lose'}`}>
          {hud.lastWin ? 'ROUND WON' : hud.lastWin === false ? 'ROUND LOST' : 'ROUND OVER'}
          <small>{hud.round.scoreA} — {hud.round.scoreB}</small>
        </div>
      )}

      {/* ── scoreboard (hold V / TAB) ─────────────────────────────── */}
      {hud.scoreboard && hud.board && (
        <div className="board">
          <div className="bh">
            <span>{mapName} · {String(mode).replace('_', ' ')} · {hud.ping}ms</span>
            <span className="cy">{hud.round?.scoreA} — {hud.round?.scoreB}</span>
            <span>FIRST TO 5 · ROUND {hud.round?.round}</span>
          </div>
          {['a', 'b'].map((t) => (
            <div key={t} className={`bteam ${t}`}>
              <div className="bt">{t === 'a' ? 'YOUR TEAM' : 'ENEMY'}</div>
              {hud.board.filter((r) => r.team === t).sort((x, y) => y.kills - x.kills).map((r) => (
                <div key={r.name} className={`br ${r.you ? 'you' : ''} ${r.alive ? '' : 'dead'}`}>
                  <span className="bn">{r.name}<i className="bw">{r.weapon}</i></span>
                  <span className="bk">{r.kills}</span>
                  <span className="bd">{r.deaths}</span>
                  <span className="ba">{r.assists}</span>
                  <span className="bm">{r.damage}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="bf"><span>NAME</span><span>K</span><span>D</span><span>A</span><span>DMG</span></div>
        </div>
      )}

      {paused && (
        <div className="pause">
          <h2>{needsLock ? 'CLICK TO PLAY' : 'PAUSED'}</h2>
          {needsLock && (
            <div className="hint" style={{ textAlign: 'center', maxWidth: 460, marginBottom: 10 }}>
              Click the arena to capture your mouse. Mouse look, shooting and movement all live
              behind the pointer lock — press <span className="kbd">ESC</span> to release it.
            </div>
          )}
          <div className="hint" style={{ textAlign: 'center', maxWidth: 460, marginBottom: 10 }}>
            <span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span> move
            · <span className="kbd">SHIFT</span> slide / dive · <span className="kbd">Q</span> dash · <span className="kbd">CTRL</span> crouch
            · <span className="kbd">SPACE</span> jump · <span className="kbd">RMB</span> aim
            · <span className="kbd">F</span> utility · <span className="kbd">1</span><span className="kbd">2</span><span className="kbd">3</span> weapons
            · <span className="kbd">R</span> reload
          </div>
          <div className="row">
            <button className="btn pri" onClick={onResume}>{needsLock ? 'CLICK TO PLAY' : 'RESUME'}</button>
            <button className="btn" onClick={onQuit}>LEAVE MATCH</button>
          </div>
        </div>
      )}
    </div>
  )
}
