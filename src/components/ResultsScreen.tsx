import { useState, useEffect } from 'react'
import { SaveData } from '../game/save'
import { MatchResult, ModeDef } from '../game/types'
import { brawlerById } from '../game/brawlers'
import { UiButton, Portrait } from '../ui/ui'
import { fmtTime } from '../game/util'
import { audio } from '../game/audio'

interface Props {
  save: SaveData
  result: MatchResult
  mode: ModeDef
  brawlerId: string
  onContinue: () => void
  onMenu: () => void
}

export default function ResultsScreen({ save, result, mode, brawlerId, onContinue, onMenu }: Props) {
  const b = brawlerById(brawlerId)
  const won = result.won
  const draw = result.draw
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (won) audio.win()
    else if (draw) audio.countTick()
    else audio.lose()
    const t = window.setTimeout(() => setRevealed(true), 300)
    return () => window.clearTimeout(t)
  }, [won, draw])

  return (
    <div className="screen results-screen">
      <div className={`results-banner ${won ? 'won' : draw ? 'draw' : 'lost'}`}>
        {won ? 'VICTORY!' : draw ? 'DRAW' : 'DEFEAT'}
      </div>
      <div className="results-sub">
        {result.mode === 'showdown'
          ? `You placed #${result.placement} of ${result.placementTotal}`
          : result.mode === 'heist'
            ? `Smashed ${Math.round((result.safeDamage ?? 0) / 1000)}k damage into the enemy safe`
            : `${mode.name}${result.mode === 'bounty' ? ` · ${result.stars} stars` : ` · ${result.gemsCollected} gems collected`}`}
      </div>

      <div className="results-trophy">
        <span className={`trophy-delta ${result.trophies >= 0 ? 'up' : 'down'}`}>
          {result.trophies >= 0 ? '+' : ''}
          {result.trophies} 🏆
        </span>
        <span className="trophy-total">
          {b.name}: {save.trophies[brawlerId] ?? 0} total
        </span>
      </div>

      <div className={`results-card ${revealed ? 'revealed' : ''}`}>
        <Portrait id={b.id} className="results-portrait" />
        <div className="results-stats">
          <div className="stat"><span>💥 Kills</span><b>{result.kills}</b></div>
          <div className="stat"><span>💀 Deaths</span><b>{result.deaths}</b></div>
          <div className="stat"><span>⚔️ Damage</span><b>{result.damage.toLocaleString()}</b></div>
          {result.mode === 'gem' && (
            <div className="stat"><span>💎 Gems collected</span><b>{result.gemsCollected}</b></div>
          )}
          {result.mode === 'heist' && (
            <div className="stat"><span>💰 Safe damage</span><b>{(result.safeDamage ?? 0).toLocaleString()}</b></div>
          )}
          <div className="stat"><span>⏱ Match time</span><b>{fmtTime(result.duration)}</b></div>
          <div className="stat"><span>🔥 Streak</span><b>{save.streak}</b></div>
        </div>
      </div>

      {result.starPlayer && result.starPlayer.kills > 0 && (
        <div className={`star-player ${revealed ? 'revealed' : ''}`}>
          <span className="star-icon">⭐</span>
          <span>
            STAR PLAYER: <b>{result.starPlayer.name}</b> — {result.starPlayer.kills} kills,{' '}
            {result.starPlayer.damage.toLocaleString()} damage
          </span>
        </div>
      )}

      <div className="results-actions">
        <UiButton variant="primary" className="btn-huge" onClick={onContinue}>
          BATTLE AGAIN
        </UiButton>
        <UiButton variant="secondary" onClick={onMenu}>
          MAIN MENU
        </UiButton>
      </div>
    </div>
  )
}
