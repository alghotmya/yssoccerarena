import { FACE_PATHS } from '../game/constants'
import type { Expression, PlayerId } from '../types'

interface GoalCelebrationProps {
  scorer: PlayerId | null
  name1: string
  name2: string
  expression1: Expression
  expression2: Expression
  spectacular: boolean
}

export function GoalCelebration({
  scorer,
  name1,
  name2,
  expression1,
  expression2,
  spectacular,
}: GoalCelebrationProps) {
  if (!scorer) return null
  const scorerName = scorer === 1 ? name1 : name2

  return (
    <div className="overlay celebration">
      <div className="celebration-panel">
        <div className="celebration-banner">
          <p className="goal-shout">{spectacular ? 'AMAZING GOAL!' : 'GOOOAL!'}</p>
          <p className="goal-scorer">{scorerName} scores!</p>
        </div>
        <div className="celebration-faces">
          <Portrait
            src={FACE_PATHS[1][expression1]}
            name={name1}
            expression={expression1}
            color="blue"
          />
          <Portrait
            src={FACE_PATHS[2][expression2]}
            name={name2}
            expression={expression2}
            color="red"
          />
        </div>
      </div>
    </div>
  )
}

function Portrait({
  src,
  name,
  expression,
  color,
}: {
  src: string
  name: string
  expression: Expression
  color: 'blue' | 'red'
}) {
  return (
    <div className={`portrait-card ${color}`}>
      <img src={src} alt={`${name} ${expression}`} />
      <span>{name}</span>
    </div>
  )
}
