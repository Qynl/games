import { SaveData } from '../game/save'
import { MatchResult, ModeDef } from '../game/types'
import { brawlerById } from '../game/brawlers'
import { UiButton, Portrait } from '../ui/ui'
import { fmtTime } from '../game/util'

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

  return (
    <div className="screen results-screen">
      <div className={`results-banner ${won ? 'won' : draw ? 'draw' : 'lost'}`}>
        {won ? 'VICTORY!' : draw ? 'DRAW' : 'DEFEAT'}
      </div>
      <div className="results-sub">
        {result.mode === 'showdown'
          ? `You placed #${result.placement} of ${result.placementTotal}`
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

      <div className="results-card">
        <Portrait id={b.id} className="results-portrait" />
        <div className="results-stats">
          <div className="stat"><span>💥 Kills</span><b>{result.kills}</b></div>
          <div className="stat"><span>💀 Deaths</span><b>{result.deaths}</b></div>
          <div className="stat"><span>⚔️ Damage</span><b>{result.damage.toLocaleString()}</b></div>
          {result.mode === 'gem' && (
            <div className="stat"><span>💎 Gems collected</span><b>{result.gemsCollected}</b></div>
          )}
          <div className="stat"><span>⏱ Match time</span><b>{fmtTime(result.duration)}</b></div>
          <div className="stat"><span>🔥 Streak</span><b>{save.streak}</b></div>
        </div>
      </div>

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
