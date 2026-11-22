import type { Expression, PlayerId } from '../types'
import type { JetsDifficulty } from './difficulty'
import type { EnemyId } from './levels'

export interface JetsSettings {
  player1Name: string
  player2Name: string
  coop: boolean
  difficulty: JetsDifficulty
  soundEnabled: boolean
}

export type JetsPhase =
  | 'intro'
  | 'playing'
  | 'bossWarn'
  | 'cleared'
  | 'gameover'
  | 'victory'

export interface JetPilot {
  id: PlayerId
  x: number
  y: number
  w: number
  h: number
  speed: number
  power: number
  homing: boolean
  homingTimer: number
  rapid: number
  shield: number
  pierce: number
  mega: number
  fireTimer: number
  fireRate: number
  iframe: number
  alive: boolean
  expression: Expression
  color: string
  accent: string
}

export interface JetEnemy {
  type: EnemyId
  x: number
  y: number
  baseY: number
  w: number
  h: number
  hp: number
  maxHp: number
  speed: number
  behavior: string
  color: string
  score: number
  fire: number
  spread: boolean
  fireTimer: number
  t: number
  amp: number
  flash: number
  dropsPower: boolean
}

export interface JetBoss {
  x: number
  y: number
  tx: number
  w: number
  h: number
  hp: number
  maxHp: number
  color: string
  name: string
  t: number
  fireTimer: number
  moveDir: number
  flash: number
  entering: boolean
}

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  dmg: number
  life?: number
  owner?: PlayerId
}

export interface PowerUp {
  x: number
  y: number
  kind: string
  vx: number
  t: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface Star {
  x: number
  y: number
  speed: number
  size: number
}

export interface JetsSnapshot {
  phase: JetsPhase
  levelIndex: number
  levelName: string
  levelTag: string
  difficulty: JetsDifficulty
  difficultyLabel: string
  score: number
  lives: number
  maxLives: number
  bombs: number
  maxBombs: number
  killed: number
  quota: number
  combo: number
  maxCombo: number
  power: number
  power2: number
  homing: boolean
  shield: number
  rapid: number
  pierce: number
  mega: number
  heroMeter: number
  heroReady: boolean
  perfectStreak: number
  rank: string
  sectorBonus: number
  bossHp: number
  bossMax: number
  bossName: string | null
  toast: string
  expression1: Expression
  expression2: Expression
  won: boolean
}
