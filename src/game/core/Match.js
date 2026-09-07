// ────────────────────────────────────────────────────────────────────────────
//  QUEUE → MATCH → SHORT ROUND (150 hp) → WIN/LOSE → INSTANT RESET → FIRST TO 5
// ────────────────────────────────────────────────────────────────────────────
export const ROUND_HP = 150
export const FIRST_TO = 5

export class Match {
  constructor (game, mode) {
    this.game = game
    this.mode = mode
    this.scoreA = 0
    this.scoreB = 0
    this.round = 0
    this.phase = 'countdown'   // countdown | live | roundend | matchend
    this.timer = 3.0
    this.roundTime = 0
    this.roundLimit = 90
    this.lastWinner = null
    this.log = []
  }

  get isRange () { return this.mode.id === 'range' }

  begin () {
    this.scoreA = 0
    this.scoreB = 0
    this.round = 0
    this.startRound(true)
  }

  startRound (first = false) {
    this.round++
    this.phase = 'countdown'
    this.timer = first ? 2.6 : 2.0
    this.roundTime = 0
    this.game.resetRound()
    this.game.emit('round', { round: this.round, phase: 'countdown', scoreA: this.scoreA, scoreB: this.scoreB })
  }

  goLive () {
    this.phase = 'live'
    this.game.emit('round', { round: this.round, phase: 'live', scoreA: this.scoreA, scoreB: this.scoreB })
  }

  update (dt) {
    if (this.isRange) {
      this.phase = 'live'
      // re-arm the respawn, never restart it — restarting every frame is what
      // used to leave a player dead in the range forever
      const p = this.game.player
      if (p && !p.alive && p.respawnTimer <= 0) this.game.respawnPlayer(1.2)
      return
    }
    if (this.phase === 'countdown') {
      this.timer -= dt
      if (this.timer <= 0) this.goLive()
      return
    }
    if (this.phase === 'live') {
      this.roundTime += dt
      const alive = this.game.aliveByTeam()
      if (alive.a === 0 || alive.b === 0 || this.roundTime > this.roundLimit) {
        const winner = alive.a === 0 && alive.b === 0 ? null : alive.a === 0 ? 'b' : alive.b === 0 ? 'a' : null
        this.endRound(winner)
      }
      return
    }
    if (this.phase === 'roundend') {
      this.timer -= dt
      if (this.timer <= 0) {
        if (this.scoreA >= FIRST_TO || this.scoreB >= FIRST_TO) {
          this.phase = 'matchend'
          this.game.emit('matchend', {
            winner: this.scoreA >= FIRST_TO ? 'a' : 'b',
            scoreA: this.scoreA, scoreB: this.scoreB,
            stats: this.game.player.stats,
            board: this.game.buildBoard(),
          })
        } else this.startRound()
      }
      return
    }
  }

  endRound (winner) {
    this.phase = 'roundend'
    this.timer = 2.6
    this.lastWinner = winner
    if (winner === 'a') this.scoreA++
    else if (winner === 'b') this.scoreB++
    this.log.push({ round: this.round, winner })
    // the round lands in slow motion — but never in netplay, where the other
    // player's clock has to keep running at the same speed as ours
    if (!this.game.net && winner) this.game.slowmo = 0.5
    this.game.emit('roundend', {
      winner, scoreA: this.scoreA, scoreB: this.scoreB, round: this.round,
      firstTo: FIRST_TO,
    })
  }
}
