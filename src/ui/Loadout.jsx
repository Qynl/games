import React, { useState, useEffect, useMemo } from 'react'
import { WEAPONS, bySlot, RARITY, SLOTS, WEAPON_MAP } from '../game/data/weapons.js'
import { MAPS } from '../game/data/maps.js'
import { rollName, rollPing } from '../game/data/names.js'

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

export default function Loadout ({ profile, onStart, onBack, mapId, mode, save, peerName }) {
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

  // the rest of the lobby: names, pings, and the gun they locked in
  const roster = useMemo(() => {
    const pool = WEAPONS.filter((w) => w.slot === 'primary')
    const mk = (team) => ({
      name: rollName(),
      ping: rollPing(),
      team,
      weapon: pool[Math.floor(Math.random() * pool.length)],
    })
    return {
      mates: Array.from({ length: Math.max(0, teamSize - 1) }, () => mk('a')),
      foes: Array.from({ length: enemySize }, () => mk('b')),
    }
  }, [teamSize, enemySize])

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
    // hard safety net: never strand the player on this screen
    const bail = setTimeout(() => { if (phase === 'waiting') onStart(loadout) }, 6000)
    return () => { clearInterval(t); clearTimeout(bail) }
  }, [phase])

  const lockIn = (next) => {
    const l = next || loadout
    const p = { ...profile, loadout: l }
    save(p)
    setPhase('waiting')
  }

  const pick = (w) => {
    const next = { ...loadout, [slot.id]: w.id }
    setLoadout(next)
    if (step < SLOTS.length - 1) setStep(step + 1)
    else lockIn(next)
  }

  const readyUp = () => { if (phase === 'pick') lockIn() }

  const buy = (w) => {
    if (profile.qyns < w.qyns) return
    const p = { ...profile, qyns: profile.qyns - w.qyns, unlocked: [...profile.unlocked, w.id] }
    save(p)
  }

  if (phase !== 'pick') {
    const row = (p, i, mine) => (
      <div key={i} className={`prow ${p.team === 'a' ? 'a' : 'b'} ${mine ? 'you' : ''} ${ready.includes(i + 1) || mine ? 'rdy' : ''}`}>
        <span className="pdot" />
        <span className="pnm">{mine ? 'YOU' : p.name}</span>
        <span className="pwp">{mine ? (WEAPON_MAP[loadout.primary] || {}).name : p.online ? 'LINKED' : p.weapon?.name}</span>
        <span className="ppg">{mine ? 'HOST' : p.online ? 'P2P' : p.ping + 'ms'}</span>
        <span className="prd">{ready.includes(i + 1) || mine ? '✓ READY' : p.online ? 'CONNECTED' : 'CHOOSING…'}</span>
      </div>
    )
    return (
      <div className="screen">
        <div className="hero" style={{ maxWidth: 760 }}>
          <h1 style={{ fontSize: 'clamp(34px,6vw,64px)' }}>{phase === 'go' ? 'MATCH START' : 'LOCKING IN'}</h1>
          <p>{map?.name} · {mode.name} · FIRST TO 5 · 150 HP</p>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {SLOTS.map((s) => (
              <div key={s.id} className="chip" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                <span style={{ fontSize: 8.5, letterSpacing: '.2em', color: 'var(--dim)' }}>{s.name}</span>
                <b style={{ color: 'var(--cy)' }}>{(WEAPON_MAP[loadout[s.id]] || {}).name}</b>
              </div>
            ))}
          </div>

          <div className="pboard">
            <div className="pteam">
              <div className="pth a">YOUR TEAM</div>
              {row({ name: 'YOU', team: 'a' }, 0, true)}
              {roster.mates.map((p, i) => row(p, i + 1))}
            </div>
            <div className="pteam">
              <div className="pth b">ENEMY TEAM</div>
              {roster.foes.map((p, i) => row(p, i + 1 + roster.mates.length))}
            </div>
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
          {step === SLOTS.length - 1
            ? <button className="btn pri" onClick={readyUp}>START MATCH ▶</button>
            : <button className="btn pri" onClick={() => setStep(step + 1)}>NEXT ▶</button>}
        </div>
      </div>
    </div>
  )
}
