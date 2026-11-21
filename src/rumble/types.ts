import type { Expression, PlayerId } from '../types'
import type { MoveKey } from './constants'

export interface RumbleSettings {
  player1Name: string
  player2Name: string
  roundsToWin: number
  soundEnabled: boolean
}

export type RumblePhase = 'countdown' | 'fight' | 'ko' | 'gameover'
export type FighterState = 'idle' | 'attack' | 'hitstun' | 'blockstun' | 'ko'

export interface Brawler {
  id: PlayerId
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  health: number
  meter: number
  rounds: number
  expression: Expression
  onGround: boolean
  crouching: boolean
  blocking: boolean
  state: FighterState
  move: MoveKey | null
  moveTime: number
  hitDone: boolean
  stun: number
  walk: number
  color: string
  flash: number
}

export interface Projectile {
  owner: PlayerId
  x: number
  y: number
  vx: number
  life: number
  damage: number
  color: string
}

export interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface RumbleSnapshot {
  phase: RumblePhase
  countdown: number
  health1: number
  health2: number
  meter1: number
  meter2: number
  rounds1: number
  rounds2: number
  timer: number
  expression1: Expression
  expression2: Expression
  winner: PlayerId | null
  lastHit: PlayerId | null
  combo: number
}
