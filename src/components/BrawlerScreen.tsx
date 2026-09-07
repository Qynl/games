import { useState } from 'react'
import { SaveData, nextUnlocks, buyBrawler, rankLabel } from '../game/save'
import { BRAWLERS, brawlerById } from '../game/brawlers'
import { rankForTrophies } from '../game/types'
import { UiButton, Portrait, Bar } from '../ui/ui'
import { audio } from '../game/audio'

interface Props {
  save: SaveData
  setSave: (s: SaveData) => void
  onBack: () => void
}

export default function BrawlerScreen({ save, setSave, onBack }: Props) {
  const [selectedId, setSelectedId] = useState(save.unlocked[0] ?? 'rusty')
  const selected = brawlerById(selectedId)
  const unlocked = save.unlocked.includes(selectedId)
  const offers = nextUnlocks(save)
  const cost = offers.find((o) => o.def.id === selectedId)?.cost

  const statOf = (attack: any) => {
    switch (attack.kind) {
      case 'spread': return attack.pellets * attack.damage
      case 'burst': return attack.shots * attack.damage
      case 'rocket': case 'lob': return attack.damage
      case 'smg': return attack.damage
      case 'wave': return attack.damage
      case 'swipe': case 'slash': return attack.damage
      default: return attack.damage
    }
  }
  const maxHp = Math.max(...BRAWLERS.map((b) => b.hp))
  const maxDmg = Math.max(...BRAWLERS.map((b) => statOf(b.attack)))
  const maxSpeed = Math.max(...BRAWLERS.map((b) => b.speed))

  const handleBuy = () => {
    if (cost === undefined) return
    if (save.keys < cost) {
      audio.hit()
      return
    }
    setSave(buyBrawler(save, selectedId, cost))
    audio.cube()
  }

  return (
    <div className="screen brawler-screen">
      <div className="screen-header">
        <UiButton variant="dark" onClick={onBack}>
          ←
        </UiButton>
        <h2 className="screen-title">BRAWLERS</h2>
        <div className="spacer" />
      </div>

      <div className="brawler-grid">
        {BRAWLERS.map((b) => {
          const isUnlocked = save.unlocked.includes(b.id)
          return (
            <div
              key={b.id}
              className={`brawler-card ${selectedId === b.id ? 'selected' : ''} ${isUnlocked ? '' : 'locked'}`}
              onClick={() => {
                setSelectedId(b.id)
                audio.uiClick()
              }}
            >
              <Portrait id={b.id} className="card-portrait" />
              <div className="card-name">{isUnlocked ? b.name : '???'}</div>
              <div className="card-trophies">🏆 {save.trophies[b.id] ?? 0}</div>
              {isUnlocked && <div className="card-rank">{rankLabel(save, b.id)}</div>}
              {!isUnlocked && <div className="card-lock">🔒</div>}
            </div>
          )
        })}
      </div>

      <div className="brawler-detail">
        <Portrait id={selected.id} className="detail-portrait" />
        <div className="detail-info">
          <div className="detail-name">
            {unlocked ? selected.name : '???'}
            <span className="detail-title"> — {unlocked ? selected.title : 'Mystery Brawler'}</span>
          </div>
          {unlocked ? (
            <>
              <div className="detail-desc">{selected.desc}</div>
              <div className="stat-rows">
                <div className="stat-row">
                  <span>❤️ HEALTH</span>
                  <Bar value={selected.hp} max={maxHp} color="#4ade80" />
                  <span className="stat-val">{selected.hp}</span>
                </div>
                <div className="stat-row">
                  <span>⚔️ DAMAGE</span>
                  <Bar value={statOf(selected.attack)} max={maxDmg} color="#f87171" />
                  <span className="stat-val">{statOf(selected.attack)}</span>
                </div>
                <div className="stat-row">
                  <span>👟 SPEED</span>
                  <Bar value={selected.speed} max={maxSpeed} color="#4fc3ff" />
                  <span className="stat-val">{selected.speed}</span>
                </div>
              </div>
              <div className="ability-row">
                <div className="ability">
                  <b>ATTACK</b> — {attackDesc(selected.attack)}
                </div>
                <div className="ability">
                  <b>SUPER · {selected.superName}</b> — {superDesc(selected.super)}
                </div>
                <div className="ability">
                  <b>GADGET · {selected.gadget.name}</b> — {selected.gadget.desc}
                </div>
              </div>
              <div className="detail-rank">
                {rankForTrophies(save.trophies[selected.id] ?? 0).name} ·{' '}
                {save.trophies[selected.id] ?? 0} 🏆
              </div>
              <div className="detail-actions">
                <UiButton variant="primary" disabled>
                  SELECTED IN BATTLE ✓
                </UiButton>
              </div>
            </>
          ) : (
            <div className="locked-panel">
              <div className="locked-desc">
                {selected.id === 'moose'
                  ? 'Play your first Gem Grab match to unlock this brawler free!'
                  : 'Unlock this brawler with keys!'}
              </div>
              {cost !== undefined && (
                <UiButton variant="primary" onClick={handleBuy} disabled={save.keys < cost}>
                  🔑 UNLOCK — {cost} KEYS {save.keys < cost ? `(need ${cost - save.keys} more)` : ''}
                </UiButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function attackDesc(a: any): string {
  switch (a.kind) {
    case 'spread': return `Blasts ${a.pellets} pellets for up to ${a.pellets * a.damage} damage at close range.`
    case 'burst': return `Fires ${a.shots} quick shots dealing ${a.damage} damage each.`
    case 'rocket': return `Fires a rocket dealing ${a.damage} splash damage.`
    case 'lob': return `Lobs a bottle over walls for ${a.damage} splash damage.`
    case 'smg': return `Rapid fire dealing ${a.damage} damage per shot.`
    case 'wave': return `Sends a soundwave dealing ${a.damage} damage, piercing ${a.pierce} targets.`
    case 'swipe': return `A wide punch dealing ${a.damage} damage.`
    case 'slash': return `Slashes in an arc for ${a.damage} damage with a short dash.`
    default: return ''
  }
}

function superDesc(s: any): string {
  switch (s.kind) {
    case 'bigshot': return `A massive shotgun blast of ${s.pellets} heavy pellets with big knockback.`
    case 'barrage': return `Launches ${s.shots} rockets for ${s.damage} splash damage each.`
    case 'pierce': return `Fires ${s.shots} piercing shots through up to ${s.pierce} enemies.`
    case 'leap': return `Leap across the arena, crushing enemies for ${s.damage} damage on landing.`
    case 'megabottle': return `Hurls ${s.bottles} mega-bottles for ${s.damage} splash damage each.`
    case 'healwave': return `Heals you and all nearby teammates for ${s.heal} health.`
    case 'dashslash': return `Dash through enemies dealing ${s.damage} damage along the way.`
    case 'turret': return `Deploys a Buddy Bot that shoots enemies for ${s.damage} damage.`
    default: return ''
  }
}
