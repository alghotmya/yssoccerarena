export type Expression = 'happy' | 'amazed' | 'angry' | 'sad'

export type PlayerId = 1 | 2

export type GamePhase =
  | 'setup'
  | 'countdown'
  | 'playing'
  | 'goal'
  | 'gameover'

export interface MatchSettings {
  player1Name: string
  player2Name: string
  winningScore: number
  soundEnabled: boolean
}

export interface OnlineSession {
  seat: PlayerId
  roomCode: string
}

export interface Vec2 {
  x: number
  y: number
}

export interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  squash: number
}

export interface PlayerState {
  id: PlayerId
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  facingX: number
  facingY: number
  expression: Expression
  kickCooldown: number
  kickAnim: number
  walkPhase: number
  color: string
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface ConfettiPiece {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  color: string
  w: number
  h: number
  life: number
}

export interface GameSnapshot {
  phase: GamePhase
  countdown: number
  score1: number
  score2: number
  lastScorer: PlayerId | null
  spectacular: boolean
  goalCelebrationTimer: number
  expression1: Expression
  expression2: Expression
  winner: PlayerId | null
  nearMissFlash: number
}

export interface EngineCallbacks {
  onGoal: (scorer: PlayerId, spectacular: boolean) => void
  onNearMiss: () => void
  onSave: (saver: PlayerId) => void
  onWallHit: () => void
  onPlayerHit: () => void
  onKick: () => void
  onCountdownTick: (value: number) => void
  onMatchEnd: (winner: PlayerId) => void
  onSnapshot: (snapshot: GameSnapshot) => void
}
