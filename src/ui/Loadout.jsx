import React, { useState, useEffect, useMemo } from 'react'
import { WEAPONS, bySlot, RARITY, SLOTS } from '../game/data/weapons.js'
import { MAPS } from '../game/data/maps.js'

function WeaponCard ({ w, owned, equipped, onPick, onBuy, qyns }) {
  const r = RARITY[w.rarity]
  return (
    <div className={`card ${equipped ? 'on' : ''} ${owned ? '' : 'locked'}`} onClick={() => (owned ? onPick(w) : onBuy(w))}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="nm" style={{ color: r.color }}>{w.name}</div>
        <span className="tag" style={{ color: r.color }}>{r.label}</span>
      </div>
      <div className="ds">{w.desc}</div>
      <div className="stats4">
        {w.slot !== 'utility' && <>
          <div><span>DMG</span><b>{w.stats.dmg}</b></div>
          <div><span>RPM</span><b>{w.stats.rpm}</b></div>
          <div><span>MAG</span><b>{w.stats.mag ?? '—'}</b></div>
          <div><span>SPD</span><b>{((w.stats.speed ?? 1) * 100).toFixed(0)}%</b></div>
        </>}
        {w.slot === 'utility' && <>
          <div><span>TYPE</span><b style={{ fontSize: 10 }}>{String(w.stats.type).toUpperCase()}</b></div>
          <div><span>USES</span><b>{w.stats.count}</b></div>
          <div><span>RAD</span><b>{w.stats.radius ?? '—'}</b></div>
          <div><span>DMG</span><b>{w.stats.dmg ?? '—'}</b></div>
        </>}
      </div>
      <div className="mt">
        {owned
          ? <span className="price own">{equipped ? 'EQUIPPED' : 'OWNED'}</span>
          : <span className="price">{w.qyns} ◈ {qyns < w.qyns ? '(NEED MORE)' : ''}</span>}
        <span>{w.slot.toUpperCase()}</span>
      </div>
    </div>
  )
}

export default function Loadout ({ profile, onStart, onBack, mapId, mode, save }) {
  const [step, setStep] = useState(0)
  const [loadout, setLoadout] = useState({ ...profile.loadout })
  const [phase, setPhase] = useState('pick')   // pick | waiting | go
  const [ready, setReady] = useState([])
  const map = MAPS.find((m) => m.id === mapId)
  const slot = SLOTS[step]
  const owned = (id) => profile.unlocked.includes(id)
  const teamSize = mode.teamA
  const enemySize = mode.teamB

  const bots = useMemo(() => Array.from({ length: teamSize + enemySize - 1 }, (_, i) => i), [teamSize, enemySize])

  useEffect(() => {
    if (phase !== 'waiting') return
    let n = 0
    const t = setInterval(() => {
      n++
      setReady((r) => [...r, n])
      if (n >= bots.length) {
        clearInterval(t)
        setTimeout(() => { setPhase('go'); setTimeout(() => onStart(loadout), 700) }, 500)
      }
    }, 260 + Math.random() * 220)
    return () => clearInterval(t)
  }, [phase])

  const pick = (w) => {
    const next = { ...loadout, [slot.id]: w.id }
    setLoadout(next)
    if (step < SLOTS.length - 1) setStep(step + 1)
    else {
      const p = { ...profile, loadout: next }
      save(p)
      setPhase('waiting')
    }
  }

  const buy = (w) => {
    if (profile.qyns < w.qyns) return
    const p = { ...profile, qyns: profile.qyns - w.qyns, unlocked: [...profile.unlocked, w.id] }
    save(p)
  }

  if (phase !== 'pick') {
    return (
      <div className="screen">
        <div className="hero">
          <h1 style={{ fontSize: 'clamp(40px,7vw,86px)' }}>{phase === 'go' ? 'MATCH START' : 'LOCKING IN'}</h1>
          <p>{map?.name} · {mode.name}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            {SLOTS.map((s) => (
              <div key={s.id} className="chip" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                <span style={{ fontSize: 8.5, letterSpacing: '.2em', color: 'var(--dim)' }}>{s.name}</span>
                <b style={{ color: 'var(--cy)' }}>{(WEAPONS.find((w) => w.id === loadout[s.id]) || {}).name}</b>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
            {bots.map((b) => (
              <div key={b} className={`chip ${ready.includes(b + 1) ? 'cy' : ''}`} style={{ minWidth: 108, justifyContent: 'center' }}>
                {ready.includes(b + 1) ? '✓ READY' : 'CHOOSING…'}
              </div>
            ))}
            <div className="chip cy" style={{ minWidth: 108, justifyContent: 'center' }}>✓ YOU</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>LOADOUT</small></div>
        <div className="nav">
          {SLOTS.map((s, i) => (
            <button key={s.id} className={i === step ? 'on' : ''} onClick={() => i <= step && setStep(i)}>
              {i + 1}. {s.name}
            </button>
          ))}
        </div>
        <div className="wallet">
          <div className="chip"><b>{profile.qyns}</b> ◈ QYNS</div>
          <button className="btn sm ghost" onClick={onBack}>BACK</button>
        </div>
      </div>
      <div className="content">
        <div className="h">{slot.name} — {slot.hint}</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(238px,1fr))' }}>
          {bySlot(slot.id).map((w) => (
            <WeaponCard key={w.id} w={w} owned={owned(w.id)} equipped={loadout[slot.id] === w.id}
              onPick={pick} onBuy={buy} qyns={profile.qyns} />
          ))}
        </div>
        <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>◀ {SLOTS[step - 1].name}</button>}
          <div className="hint" style={{ flex: 1 }}>
            Slot {step + 1} of {SLOTS.length} — pick your <b style={{ color: 'var(--cy)' }}>{slot.name}</b>.
            Keys buy the rest in the Armory.
          </div>
          <button className="btn pri" onClick={() => setStep(Math.min(SLOTS.length - 1, step + 1))}>
            {step === SLOTS.length - 1 ? 'READY ▶' : 'NEXT ▶'}
          </button>
        </div>
      </div>
    </div>
  )
}
