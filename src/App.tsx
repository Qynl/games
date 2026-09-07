import { useState, useEffect, useCallback } from 'react'
import MenuScreen from './components/MenuScreen'
import ModeScreen from './components/ModeScreen'
import BrawlerScreen from './components/BrawlerScreen'
import ShopScreen from './components/ShopScreen'
import GameScreen from './components/GameScreen'
import ResultsScreen from './components/ResultsScreen'
import SettingsModal from './components/SettingsModal'
import { loadSave, applyMatchResult, applyAudioSettings, SaveData } from './game/save'
import { unlockAudio } from './game/audio'
import { MatchResult, ModeDef } from './game/types'
import { useSaveState } from './ui/ui'

export type Screen =
  | { name: 'menu' }
  | { name: 'modes' }
  | { name: 'brawlers' }
  | { name: 'shop' }
  | { name: 'game'; mode: ModeDef; brawlerId: string }
  | { name: 'results'; result: MatchResult; mode: ModeDef; brawlerId: string }

export default function App() {
  const [save, setSave] = useSaveState(loadSave())
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [showSettings, setShowSettings] = useState(false)

  const showTabs = !['game', 'results'].includes(screen.name)

  useEffect(() => {
    applyAudioSettings(save)
  }, [save.muted, save.settings.sfx, save.settings.music])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const handleFinish = useCallback(
    (result: MatchResult, mode: ModeDef, brawlerId: string) => {
      setSave(applyMatchResult(save, brawlerId, result))
      setScreen({ name: 'results', result, mode, brawlerId })
    },
    [save, setSave]
  )

  return (
    <div className="app">
      {screen.name === 'menu' && (
        <MenuScreen
          save={save}
          onPlay={() => setScreen({ name: 'modes' })}
          onBrawlers={() => setScreen({ name: 'brawlers' })}
          onShop={() => setScreen({ name: 'shop' })}
          onSettings={() => setShowSettings(true)}
          setSave={setSave}
        />
      )}
      {screen.name === 'modes' && (
        <ModeScreen
          save={save}
          brawlerId={save.unlocked[0]}
          onBack={() => setScreen({ name: 'menu' })}
          onPickBrawler={() => setScreen({ name: 'brawlers' })}
          onStart={(mode, brawlerId) => setScreen({ name: 'game', mode, brawlerId })}
        />
      )}
      {screen.name === 'brawlers' && (
        <BrawlerScreen
          save={save}
          setSave={setSave}
          onBack={() => setScreen({ name: 'menu' })}
        />
      )}
      {screen.name === 'shop' && (
        <ShopScreen
          save={save}
          setSave={setSave}
          onBack={() => setScreen({ name: 'menu' })}
        />
      )}
      {screen.name === 'game' && (
        <GameScreen
          mode={screen.mode}
          brawlerId={screen.brawlerId}
          onExit={() => setScreen({ name: 'menu' })}
          onFinish={(r) => handleFinish(r, screen.mode, screen.brawlerId)}
        />
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          save={save}
          result={screen.result}
          mode={screen.mode}
          brawlerId={screen.brawlerId}
          onContinue={() => setScreen({ name: 'modes' })}
          onMenu={() => setScreen({ name: 'menu' })}
        />
      )}
      {showSettings && (
        <SettingsModal
          save={save}
          setSave={setSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showTabs && (
        <nav className="bottom-tabs">
          <button
            className={`tab-btn ${screen.name === 'menu' ? 'active' : ''}`}
            onClick={() => setScreen({ name: 'menu' })}
          >
            <span className="tab-icon">🏠</span>
            <span className="tab-label">Home</span>
          </button>
          <button
            className={`tab-btn ${['modes', 'results'].includes(screen.name) ? 'active' : ''}`}
            onClick={() => setScreen({ name: 'modes' })}
          >
            <span className="tab-icon">⚔️</span>
            <span className="tab-label">Battle</span>
          </button>
          <button
            className={`tab-btn ${screen.name === 'brawlers' ? 'active' : ''}`}
            onClick={() => setScreen({ name: 'brawlers' })}
          >
            <span className="tab-icon">🧑‍🎤</span>
            <span className="tab-label">Brawlers</span>
          </button>
          <button
            className={`tab-btn ${screen.name === 'shop' ? 'active' : ''}`}
            onClick={() => setScreen({ name: 'shop' })}
          >
            <span className="tab-icon">🛒</span>
            <span className="tab-label">Shop</span>
          </button>
        </nav>
      )}
    </div>
  )
}
