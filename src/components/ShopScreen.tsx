import { useState } from 'react'
import { SaveData, claimDaily, openBox, nextUnlocks, buyBrawler } from '../game/save'
import { BrawlerDef } from '../game/brawlers'
import { UiButton, Portrait, ResourceBar } from '../ui/ui'
import { audio } from '../game/audio'

interface Props {
  save: SaveData
  setSave: (s: SaveData) => void
  onBack: () => void
}

export default function ShopScreen({ save, setSave, onBack }: Props) {
  const [opening, setOpening] = useState<null | { def: BrawlerDef; isNew: boolean }>(null)
  const [shaking, setShaking] = useState(false)
  const [claimed, setClaimed] = useState(save.lastDaily === new Date().toISOString().slice(0, 10))
  const offers = nextUnlocks(save)

  const doOpen = (guaranteedId?: string) => {
    if (save.boxes <= 0) {
      audio.hit()
      return
    }
    setShaking(true)
    audio.boxBreak()
    window.setTimeout(() => {
      setShaking(false)
      const res = openBox(save, guaranteedId)
      setSave(res.save)
      setOpening({ def: res.def, isNew: res.isNew })
      if (res.isNew) audio.superReady()
      else audio.cube()
    }, 900)
  }

  const doDaily = () => {
    const next = claimDaily(save)
    setSave(next)
    setClaimed(true)
    audio.cube()
  }

  return (
    <div className="screen shop-screen">
      <div className="screen-header">
        <UiButton variant="dark" onClick={onBack}>
          ←
        </UiButton>
        <h2 className="screen-title">SHOP</h2>
        <ResourceBar save={save} />
      </div>

      <div className="shop-grid">
        <div className="shop-card">
          <div className="shop-card-title">DAILY GIFT</div>
          <div className="shop-icon">🎁</div>
          <div className="shop-desc">Free Brawl Box + 15 keys every day!</div>
          <UiButton variant="primary" onClick={doDaily} disabled={claimed}>
            {claimed ? 'CLAIMED ✓' : 'CLAIM FREE'}
          </UiButton>
        </div>

        <div className={`shop-card ${shaking ? 'shaking' : ''}`}>
          <div className="shop-card-title">BRAWL BOX</div>
          <div className="shop-icon">📦</div>
          <div className="shop-desc">
            You have <b>{save.boxes}</b> box{save.boxes > 1 ? 'es' : ''} ready!
          </div>
          <UiButton variant="secondary" onClick={() => doOpen()} disabled={save.boxes <= 0}>
            OPEN BOX
          </UiButton>
        </div>

        <div className="shop-card">
          <div className="shop-card-title">BRAWLER OFFERS</div>
          <div className="offer-list">
            {offers.map((o) => (
              <div key={o.def.id} className="offer-row">
                <Portrait id={o.def.id} className="offer-portrait" />
                <div className="offer-info">
                  <div className="offer-name">{o.def.name}</div>
                  <div className="offer-sub">{o.def.title}</div>
                </div>
                <UiButton
                  variant="primary"
                  onClick={() => {
                    setSave(buyBrawler(save, o.def.id, o.cost))
                    audio.cube()
                  }}
                  disabled={save.keys < o.cost}
                >
                  🔑 {o.cost}
                </UiButton>
              </div>
            ))}
          </div>
        </div>
      </div>

      {opening && (
        <div className="reveal-overlay" onClick={() => setOpening(null)}>
          <div className={`reveal-card ${opening.isNew ? 'reveal-new' : ''}`}>
            <div className="reveal-label">{opening.isNew ? '★ NEW BRAWLER ★' : 'BRAWLER UNLOCKED... AGAIN!'}</div>
            <Portrait id={opening.def.id} className="reveal-portrait" />
            <div className="reveal-name">{opening.def.name}</div>
            <div className="reveal-title">{opening.def.title}</div>
            <UiButton variant="primary" onClick={() => setOpening(null)}>
              AWESOME!
            </UiButton>
          </div>
        </div>
      )}
    </div>
  )
}
