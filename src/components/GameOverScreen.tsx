import { FACE_PATHS } from '../game/constants'
import type { PlayerId } from '../types'

interface GameOverScreenProps {
  winner: PlayerId
  name1: string
  name2: string
  score1: number
  score2: number
  onRematch: () => void
  onNewGame: () => void
  onChangePlayers: () => void
}

export function GameOverScreen({
  winner,
  name1,
  name2,
  score1,
  score2,
  onRematch,
  onNewGame,
  onChangePlayers,
}: GameOverScreenProps) {
  const winnerName = winner === 1 ? name1 : name2
  const loserName = winner === 1 ? name2 : name1

  return (
    <div className="overlay gameover">
      <div className="gameover-card">
        <div className="trophy" aria-hidden>
          🏆
        </div>
        <h2>{winnerName} Wins!</h2>
        <p className="final-score">
          {score1} — {score2}
        </p>
        <div className="gameover-faces">
          <div className="portrait-card blue">
            <img
              src={FACE_PATHS[1][winner === 1 ? 'happy' : 'sad']}
              alt={name1}
            />
            <span>{winner === 1 ? 'Champion' : loserName}</span>
          </div>
          <div className="portrait-card red">
            <img
              src={FACE_PATHS[2][winner === 2 ? 'happy' : 'sad']}
              alt={name2}
            />
            <span>{winner === 2 ? 'Champion' : loserName}</span>
          </div>
        </div>
        <div className="gameover-actions">
          <button type="button" className="btn primary" onClick={onRematch}>
            Rematch
          </button>
          <button type="button" className="btn" onClick={onNewGame}>
            New Game
          </button>
          <button type="button" className="btn ghost" onClick={onChangePlayers}>
            Change Players
          </button>
        </div>
      </div>
    </div>
  )
}
