import React from 'react'
import { SKINS, SKIN_MAP } from '../game/data/skins.js'
import { unlockSkin } from '../game/core/Persistence.js'

const hex = (n) => '#' + (n ?? 0).toString(16).padStart(6, '0')

export default function Skins ({ profile, save, onBack, toast }) {
  const setSkin = (s) => {
    if (!profile.skins.includes(s.id)) {
      const p = structuredClone(profile)
      if (!unlockSkin(p, s.id, s.qyn)) { toast('NOT ENOUGH QYNS', true); return }
      save(p)
      toast(`${s.name} UNLOCKED`)
      return
    }
    save({ ...profile, skin: s.id })
    toast(`${s.name} EQUIPPED`)
  }
  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>SKINS</small></div>
        <div className="wallet">
          <div className="chip"><b>{profile.qyns}</b> ◈ QYNS</div>
          <button className="btn sm ghost" onClick={onBack}>◀ MENU</button>
        </div>
      </div>
      <div className="content">
        <div className="h">WEAPON SKINS — APPLIED TO EVERY GUN YOU CARRY</div>
        <div className="skins">
          {SKINS.map((s) => {
            const owned = profile.skins.includes(s.id)
            const on = profile.skin === s.id
            return (
              <div key={s.id} className={`card ${on ? 'on' : ''} ${owned ? '' : 'locked'}`} onClick={() => setSkin(s)}>
                <div className="nm">{s.name}</div>
                <div className="ds">{s.desc}</div>
                <div className="swatch">
                  <i style={{ background: hex(s.body ?? 0x2f3947) }} />
                  <i style={{ background: hex(s.accent ?? 0x6ee7ff) }} />
                  <i style={{ background: hex(s.glow ?? s.accent ?? 0x6ee7ff) }} />
                  <i style={{ background: s.trim }} />
                </div>
                <div className="mt">
                  {owned ? <span className="price own">{on ? '● EQUIPPED' : 'OWNED'}</span>
                    : <span className="price">{s.qyn} ◈ — BUY</span>}
                  {s.reactive && <span style={{ color: 'var(--vi)', fontSize: 9, letterSpacing: '.1em' }}>REACTIVE</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
