import type { Expression, PlayerId } from '../types'

export interface TanksSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export type TanksPhase = 'countdown' | 'battle' | 'ko' | 'gameover'

export interface Tank {
  id: PlayerId
  x: number
  y: number
  angle: number
  health: number
  score: number
  expression: Expression
  cooldown: number
  flash: number
  color: string
}

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  owner: PlayerId
  color: string
}

export interface TankParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

export interface TanksSnapshot {
  phase: TanksPhase
  countdown: number
  score1: number
  score2: number
  health1: number
  health2: number
  expression1: Expression
  expression2: Expression
  winner: PlayerId | null
  lastHit: PlayerId | null
}
