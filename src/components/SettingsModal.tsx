import { useState } from 'react'
import { SaveData, defaultSave } from '../game/save'
import { UiButton } from '../ui/ui'

interface Props {
  save: SaveData
  setSave: (s: SaveData) => void
  onClose: () => void
}

export default function SettingsModal({ save, setSave, onClose }: Props) {
  const [name, setName] = useState(save.playerName)

  const commitName = () => {
    setSave({ ...save, playerName: name.trim().slice(0, 14) || 'Ace' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">SETTINGS</div>

        <label className="setting-row">
          <span>Player name</span>
          <input
            className="text-input"
            value={name}
            maxLength={14}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
          />
        </label>

        <label className="setting-row">
          <span>🔊 Sound effects</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(save.settings.sfx * 100)}
            onChange={(e) =>
              setSave({
                ...save,
                settings: { ...save.settings, sfx: Number(e.target.value) / 100 },
              })
            }
          />
        </label>

        <label className="setting-row">
          <span>🎵 Music</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(save.settings.music * 100)}
            onChange={(e) =>
              setSave({
                ...save,
                settings: { ...save.settings, music: Number(e.target.value) / 100 },
              })
            }
          />
        </label>

        <label className="setting-row">
          <span>🔇 Mute all</span>
          <input
            type="checkbox"
            checked={save.muted}
            onChange={(e) => setSave({ ...save, muted: e.target.checked })}
          />
        </label>

        <div className="modal-actions">
          <UiButton variant="danger" onClick={() => setSave(defaultSave())}>
            RESET PROGRESS
          </UiButton>
          <UiButton variant="primary" onClick={onClose}>
            DONE
          </UiButton>
        </div>

        <div className="modal-credit">
          Fan-made browser game. Original characters & art. Not affiliated with any
          commercial game.
        </div>
      </div>
    </div>
  )
}
