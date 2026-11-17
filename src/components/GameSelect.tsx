interface GameSelectProps {
  onSoccer: () => void
  onFight: () => void
}

export function GameSelect({ onSoccer, onFight }: GameSelectProps) {
  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Two games. One keyboard.</p>
        <h1>Pick a Game</h1>
        <p className="subtitle">Both are local. Two players, two computers not required.</p>
      </header>
      <div className="game-pick">
        <button type="button" className="game-card soccer" onClick={onSoccer}>
          <span className="game-emoji" aria-hidden>
            ⚽
          </span>
          <strong>Face-Off Soccer</strong>
          <span>Kick the ball into the goal. First to the winning score takes the match.</span>
        </button>
        <button type="button" className="game-card fight" onClick={onFight}>
          <span className="game-emoji" aria-hidden>
            🥊
          </span>
          <strong>Stickman Fight</strong>
          <span>Punch and kick. Knock out your rival and win the rounds.</span>
        </button>
      </div>
    </div>
  )
}
