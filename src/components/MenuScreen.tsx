import { useState } from 'react'
import { SaveData, totalTrophies } from '../game/save'
import { BRAWLERS } from '../game/brawlers'
import { UiButton, ResourceBar, Portrait } from '../ui/ui'
import { audio } from '../game/audio'
import menuBg from '../assets/menu-bg.jpg'

interface Props {
  save: SaveData
  onPlay: () => void
  onBrawlers: () => void
  onShop: () => void
  onSettings: () => void
  setSave: (s: SaveData) => void
}

export default function MenuScreen({ save, onPlay, onBrawlers, onShop, onSettings, setSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(save.playerName)

  const commitName = () => {
    const n = name.trim().slice(0, 14) || 'Ace'
    setSave({ ...save, playerName: n })
    setEditing(false)
    audio.uiClick()
  }

  const mascots = save.unlocked.slice(0, 4)

  return (
    <div className="menu-screen">
      <div className="menu-bg" style={{ backgroundImage: `url(${menuBg})` }} />
      <div className="menu-shade" />

      <div className="menu-top">
        <div className="player-chip" onClick={() => setEditing(true)}>
          {editing ? (
            <input
              className="name-input"
              value={name}
              maxLength={14}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="avatar">😎</span>
              <span className="player-name">{save.playerName}</span>
              <span className="edit-hint">✏️</span>
            </>
          )}
        </div>
        <ResourceBar save={save} />
        <button className="icon-btn" onClick={onSettings} title="Settings">
          ⚙️
        </button>
      </div>

      <div className="menu-center">
        <h1 className="logo">
          <span className="logo-line1">BRAWL</span>
          <span className="logo-line2">ARENA</span>
        </h1>
        <div className="menu-buttons">
          <UiButton variant="primary" className="btn-huge" onClick={onPlay}>
            PLAY
          </UiButton>
          <UiButton variant="secondary" onClick={onBrawlers}>
            BRAWLERS
          </UiButton>
          <UiButton variant="secondary" onClick={onShop}>
            SHOP
          </UiButton>
        </div>
        {save.boxes > 0 && (
          <div className="box-banner" onClick={onShop}>
            📦 {save.boxes} Brawl Box{save.boxes > 1 ? 'es' : ''} waiting to open!
          </div>
        )}
      </div>

      <div className="menu-bottom">
        <div className="mascot-row">
          {mascots.map((id) => (
            <Portrait key={id} id={id} className="mascot" />
          ))}
        </div>
        <div className="menu-stats">
          <span>🏆 {totalTrophies(save)}</span>
          <span>⭐ {save.wins} wins</span>
          <span>🔥 best streak {save.bestStreak}</span>
        </div>
      </div>

      <div className="tip">
        💡 Tip: {BRAWLERS[Math.floor(Math.random() * BRAWLERS.length)].name} says "{BRAWLERS[Math.floor(Math.random() * BRAWLERS.length)].desc}"
      </div>
    </div>
  )
}
