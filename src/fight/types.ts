import type { Expression, PlayerId } from '../types'

export interface FightSettings {
  player1Name: string
  player2Name: string
  roundsToWin: number
  soundEnabled: boolean
}

export type AttackKind = 'none' | 'punch' | 'kick'
export type FightPhase = 'countdown' | 'fighting' | 'ko' | 'gameover'

export interface Fighter {
  id: PlayerId
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  health: number
  rounds: number
  expression: Expression
  onGround: boolean
  attack: AttackKind
  attackTime: number
  attackHit: boolean
  cooldown: number
  hitstun: number
  walk: number
  color: string
}

export interface FightSnapshot {
  phase: FightPhase
  countdown: number
  health1: number
  health2: number
  rounds1: number
  rounds2: number
  expression1: Expression
  expression2: Expression
  winner: PlayerId | null
  lastHit: PlayerId | null
}
