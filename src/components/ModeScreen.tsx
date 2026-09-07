import { useState } from 'react'
import { SaveData } from '../game/save'
import { MODES, ModeDef } from '../game/types'
import { brawlerById } from '../game/brawlers'
import { UiButton, Portrait, Bar } from '../ui/ui'
import { rankForTrophies } from '../game/types'
import { audio } from '../game/audio'

interface Props {
  save: SaveData
  brawlerId: string
  onBack: () => void
  onPickBrawler: () => void
  onStart: (mode: ModeDef, brawlerId: string) => void
}

export default function ModeScreen({ save, brawlerId, onBack, onPickBrawler, onStart }: Props) {
  const [selected, setSelected] = useState<ModeDef>(MODES[0])
  const b = brawlerById(brawlerId)
  const trophies = save.trophies[brawlerId] ?? 0
  const rank = rankForTrophies(trophies)

  return (
    <div className="screen mode-screen">
      <div className="screen-header">
        <UiButton variant="dark" onClick={onBack}>
          ←
        </UiButton>
        <h2 className="screen-title">BATTLE</h2>
        <div className="spacer" />
      </div>

      <div className="mode-layout">
        <div className="mode-list">
          {MODES.map((m) => (
            <div
              key={m.id}
              className={`mode-card ${selected.id === m.id ? 'selected' : ''}`}
              onClick={() => {
                setSelected(m)
                audio.uiClick()
              }}
            >
              <div className="mode-icon">{m.icon}</div>
              <div className="mode-info">
                <div className="mode-name">{m.name}</div>
                <div className="mode-tagline">{m.tagline}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
              {selected.id === m.id && <div className="mode-check">✓</div>}
            </div>
          ))}
        </div>

        <div className="mode-side">
          <div className="selected-brawler-card" onClick={onPickBrawler}>
            <Portrait id={b.id} className="side-portrait" />
            <div className="side-brawler-info">
              <div className="side-brawler-name">{b.name}</div>
              <div className="side-brawler-rank">
                {rank.name} · {trophies} 🏆
              </div>
              <Bar value={trophies % 100} max={100} color="#ffd23f" height={6} />
            </div>
            <div className="change-hint">CHANGE ↻</div>
          </div>
          <UiButton
            variant="primary"
            className="btn-huge btn-start"
            onClick={() => onStart(selected, brawlerId)}
          >
            BRAWL!
          </UiButton>
          <div className="mode-hint">
            {selected.id === 'gem' && '💎 Grab crystals from the mine. Hold 10 as a team to win!'}
            {selected.id === 'showdown' && '💀 10 brawlers. Smash boxes, grab cubes, outrun the gas.'}
            {selected.id === 'bounty' && '⭐ Every takedown earns stars. First team to 10 wins!'}
          </div>
        </div>
      </div>
    </div>
  )
}
