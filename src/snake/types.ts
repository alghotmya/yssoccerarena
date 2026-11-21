import type { Expression, PlayerId } from '../types'

export interface SnakeSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export type SnakePhase = 'countdown' | 'battle' | 'ko' | 'gameover'

export interface Segment {
  x: number
  y: number
}

export interface SnakeFood {
  x: number
  y: number
  size: number
  color: string
}

export interface Worm {
  id: PlayerId
  segments: Segment[]
  angle: number
  size: number
  score: number
  expression: Expression
  alive: boolean
  boost: boolean
  color: string
  midColor: string
  invuln: number
}

export interface SnakeSnapshot {
  phase: SnakePhase
  countdown: number
  score1: number
  score2: number
  length1: number
  length2: number
  expression1: Expression
  expression2: Expression
  winner: PlayerId | null
  lastHit: PlayerId | null
}
