import { useRef } from 'react'
import { AudioManager } from '../game/audio'

interface GameSelectProps {
  onSoccer: () => void
  onFight: () => void
}

export function GameSelect({ onSoccer, onFight }: GameSelectProps) {
  const audio = useRef(new AudioManager())
  const choose = (play: () => void) => {
    audio.current.resume()
    audio.current.play('coin')
    play()
  }

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Insert coin</p>
        <h1>Choose your game</h1>
        <p className="subtitle">Blue on the left. Red on the right. One keyboard.</p>
      </header>
      <div className="game-pick">
        <button type="button" className="game-card soccer" onClick={() => choose(onSoccer)}>
          <span className="game-emoji" aria-hidden>
            ⚽
          </span>
          <strong>Face-Off Soccer</strong>
          <span>Kick the ball. Score a goal. Be the champion!</span>
        </button>
        <button type="button" className="game-card fight" onClick={() => choose(onFight)}>
          <span className="game-emoji" aria-hidden>
            🥊
          </span>
          <strong>Stickman Fight</strong>
          <span>Jump, punch, and kick. Win the rounds!</span>
        </button>
      </div>
    </div>
  )
}
