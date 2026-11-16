interface ScoreboardProps {
  name1: string
  name2: string
  score1: number
  score2: number
  pulse: boolean
  winningScore: number
}

export function Scoreboard({
  name1,
  name2,
  score1,
  score2,
  pulse,
  winningScore,
}: ScoreboardProps) {
  return (
    <div className={`scoreboard ${pulse ? 'pulse' : ''}`}>
      <div className="score-side p1">
        <span className="score-name">{name1}</span>
        <span className="score-num">{score1}</span>
      </div>
      <div className="score-center">
        <span className="score-dash">—</span>
        <span className="score-target">First to {winningScore}</span>
      </div>
      <div className="score-side p2">
        <span className="score-num">{score2}</span>
        <span className="score-name">{name2}</span>
      </div>
    </div>
  )
}
