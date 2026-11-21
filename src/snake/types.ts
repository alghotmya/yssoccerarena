import type { Expression, PlayerId } from '../types'

export interface SnakeSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export type SnakePhase = 'countdown' | 'battle' | 'gameover'
export type WormKind = 'human' | 'bot'

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
  /** Unique id across humans + bots */
  uid: string
  /** 1 | 2 for humans; 0 for bots */
  seat: 0 | PlayerId
  kind: WormKind
  name: string
  segments: Segment[]
  angle: number
  size: number
  /** Kill count */
  kills: number
  expression: Expression
  alive: boolean
  boost: boolean
  color: string
  midColor: string
  invuln: number
  respawnIn: number
  /** Bot wandering */
  aiTimer: number
  aiTurn: number
}

export interface LeaderRow {
  uid: string
  name: string
  kind: WormKind
  length: number
  kills: number
  color: string
  alive: boolean
  you?: boolean
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
  leaderboard: LeaderRow[]
  aliveBots: number
  totalBots: number
}
