import type { Expression, PlayerId } from '../types'

export interface BombsSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export type BombsPhase = 'countdown' | 'battle' | 'ko' | 'gameover'
export type TileKind = 'empty' | 'hard' | 'soft'

export interface Bomber {
  id: PlayerId
  x: number
  y: number
  score: number
  expression: Expression
  cooldown: number
  alive: boolean
  flash: number
  color: string
  invuln: number
}

export interface Bomb {
  col: number
  row: number
  fuse: number
  owner: PlayerId
}

export interface Blast {
  col: number
  row: number
  life: number
}

export interface BombsSnapshot {
  phase: BombsPhase
  countdown: number
  score1: number
  score2: number
  expression1: Expression
  expression2: Expression
  winner: PlayerId | null
  lastHit: PlayerId | null
}
