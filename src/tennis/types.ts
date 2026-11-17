import type { Expression, PlayerId } from '../types'

export interface TennisSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export type TennisPhase = 'countdown' | 'rally' | 'point' | 'gameover'

export interface TennisPlayer {
  id: PlayerId
  x: number
  y: number
  facing: 1 | -1
  score: number
  expression: Expression
  swing: number
  cooldown: number
  walk: number
  color: string
}

export interface TennisBall {
  x: number
  y: number
  vx: number
  vy: number
  held: boolean
}

export interface TennisSnapshot {
  phase: TennisPhase
  countdown: number
  score1: number
  score2: number
  expression1: Expression
  expression2: Expression
  server: PlayerId
  winner: PlayerId | null
  pointFor: PlayerId | null
}
