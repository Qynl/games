import React, { useState } from 'react'
import { WEAPONS, bySlot, RARITY, SLOTS } from '../game/data/weapons.js'
import { unlock } from '../game/core/Persistence.js'

export default function Armory ({ profile, save, onBack, toast }) {
  const [tab, setTab] = useState('primary')
  const owned = (id) => profile.unlocked.includes(id)

  const buy = (w) => {
    if (owned(w.id)) { toast(`${w.name} ALREADY OWNED`); return }
    const p = structuredClone(profile)
    if (!unlock(p, w.id, w.qyn)) { toast('NOT ENOUGH QYNS', true); return }
    save(p)
    toast(`${w.name} UNLOCKED`)
  }
  const equip = (w) => {
    if (!owned(w.id)) return buy(w)
    const p = { ...profile, loadout: { ...profile.loadout, [w.slot]: w.id } }
    save(p)
    toast(`${w.name} EQUIPPED`)
  }

  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>ARMORY</small></div>
        <div className="wallet">
          <div className="chip"><b>{profile.qyns}</b> ◈ QYNS</div>
          <button className="btn sm ghost" onClick={onBack}>◀ MENU</button>
        </div>
      </div>
      <div className="content">
        <div className="tabs">
          {SLOTS.map((s) => <button key={s.id} className={`tab ${tab === s.id ? 'on' : ''}`} onClick={() => setTab(s.id)}>{s.name}</button>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))' }}>
          {bySlot(tab).map((w) => {
            const r = RARITY[w.rarity]
            const isOwned = owned(w.id)
            const eq = profile.loadout[w.slot] === w.id
            return (
              <div key={w.id} className={`card ${eq ? 'on' : ''} ${isOwned ? '' : 'locked'}`} onClick={() => equip(w)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div className="nm" style={{ color: r.color }}>{w.name}</div>
                  <span className="tag" style={{ color: r.color }}>{r.label}</span>
                </div>
                <div className="ds">{w.desc}</div>
                <div className="stats4">
                  <div><span>DMG</span><b>{w.stats.dmg ?? '—'}</b></div>
                  <div><span>RPM</span><b>{w.stats.rpm ?? '—'}</b></div>
                  <div><span>MAG</span><b>{w.stats.mag ?? '—'}</b></div>
                  <div><span>RLD</span><b>{w.stats.reload ?? '—'}s</b></div>
                  <div><span>HEAD</span><b>×{w.stats.head ?? '—'}</b></div>
                  <div><span>RANGE</span><b>{w.stats.range ?? '—'}m</b></div>
                  <div><span>SPREAD</span><b>{w.stats.spreadHip ?? w.stats.reach ?? '—'}</b></div>
                  <div><span>SPEED</span><b>{((w.stats.speed ?? 1) * 100).toFixed(0)}%</b></div>
                </div>
                {w.stats.knock > 0 && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--or)' }}>KNOCKBACK {w.stats.knock}</div>}
                {w.stats.back && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--rd)' }}>BACKSTAB ×{w.stats.back}</div>}
                <div className="mt">
                  {isOwned
                    ? <span className="price own">{eq ? '● EQUIPPED' : 'OWNED — EQUIP'}</span>
                    : <span className="price">{w.qyn} ◈ — BUY</span>}
                  <span>{WEAPONS.indexOf(w) + 1}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
