import type { Expression, PlayerId } from '../types'
import type { HitZone } from './constants'

export interface SpearSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export type SpearPhase = 'aim' | 'flight' | 'result' | 'gameover'

export interface SpearSnapshot {
  phase: SpearPhase
  turn: PlayerId
  score1: number
  score2: number
  expression1: Expression
  expression2: Expression
  zone: HitZone | null
  points: number
  winner: PlayerId | null
}
