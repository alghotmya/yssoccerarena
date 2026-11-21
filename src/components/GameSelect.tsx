import { useRef } from 'react'
import { AudioManager } from '../game/audio'
import { SHOWCASE, SLIDE_MS } from '../showcase'
import { RotatingArt } from './RotatingArt'

interface GameSelectProps {
  onSoccer: () => void
  onFight: () => void
  onTennis: () => void
  onSpear: () => void
  onTanks: () => void
  onBombs: () => void
  onSnake: () => void
  onRumble: () => void
  onJets: () => void
}

export function GameSelect({
  onSoccer,
  onFight,
  onTennis,
  onSpear,
  onTanks,
  onBombs,
  onSnake,
  onRumble,
  onJets,
}: GameSelectProps) {
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
        <RotatingArt
          images={SHOWCASE}
          intervalMs={SLIDE_MS}
          className="front-art"
          alt="Player 1 versus Player 2"
        />
        <h1>Choose your game</h1>
        <p className="subtitle">
          Red on the left (arrows). Blue joins local with WASD. Online: arrows for everyone.
        </p>
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
        <button type="button" className="game-card tanks" onClick={() => choose(onTanks)}>
          <span className="game-emoji" aria-hidden>
            💥
          </span>
          <strong>Face-Off Tanks</strong>
          <span>Drive, aim, and blast. First to the target wins!</span>
        </button>
        <button type="button" className="game-card bombs" onClick={() => choose(onBombs)}>
          <span className="game-emoji" aria-hidden>
            💣
          </span>
          <strong>Face-Off Bombs</strong>
          <span>Plant bombs, crack crates, blast your rival!</span>
        </button>
        <button type="button" className="game-card snake" onClick={() => choose(onSnake)}>
          <span className="game-emoji" aria-hidden>
            🐍
          </span>
          <strong>Face-Off Snake</strong>
          <span>Widescreen arena with bots — climb the board!</span>
        </button>
        <button type="button" className="game-card rumble" onClick={() => choose(onRumble)}>
          <span className="game-emoji" aria-hidden>
            🥋
          </span>
          <strong>Face-Off Rumble</strong>
          <span>Punch, kick, blast — neon Street Fighter vibes!</span>
        </button>
        <button type="button" className="game-card jets" onClick={() => choose(onJets)}>
          <span className="game-emoji" aria-hidden>
            ✈️
          </span>
          <strong>Face-Off Jets</strong>
          <span>35 sectors, bosses & weapon upgrades — shoot everything!</span>
        </button>
      </div>
    </div>
  )
}
