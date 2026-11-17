import { useRef } from 'react'
import { AudioManager } from '../game/audio'

interface GameSelectProps {
  onSoccer: () => void
  onFight: () => void
  onTennis: () => void
  onSpear: () => void
}

export function GameSelect({ onSoccer, onFight, onTennis, onSpear }: GameSelectProps) {
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
        <p className="subtitle">Red on the left. Blue on the right. One keyboard.</p>
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
        <button type="button" className="game-card volley" onClick={() => choose(onTennis)}>
          <span className="game-emoji" aria-hidden>
            🎾
          </span>
          <strong>Volley Arcade</strong>
          <span>Smash the ball past your rival. First to the target wins!</span>
        </button>
        <button type="button" className="game-card spear" onClick={() => choose(onSpear)}>
          <span className="game-emoji" aria-hidden>
            🎯
          </span>
          <strong>Spear Arcade</strong>
          <span>Take turns. Hit the body, arm, or leg!</span>
        </button>
      </div>
    </div>
  )
}
