export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720

export const TANK_RADIUS = 28
export const TANK_SPEED = 260
export const TANK_TURN = 3.4
export const FIRE_COOLDOWN = 0.42
export const BULLET_SPEED = 620
export const BULLET_RADIUS = 7
export const BULLET_LIFE = 1.85
export const HIT_DAMAGE = 22
export const MAX_HEALTH = 100

export const OPEN_COUNTDOWN = 3
export const RESPAWN_COUNTDOWN = 1.6
export const KO_PAUSE = 1.35
export const SCORE_OPTIONS = [3, 5, 7] as const

export const P1_COLOR = '#e23d3d'
export const P2_COLOR = '#2f6fed'

/** Static wall blocks: x, y, w, h (arena coords). */
export const WALLS: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 0, y: 0, w: ARENA_WIDTH, h: 28 },
  { x: 0, y: ARENA_HEIGHT - 28, w: ARENA_WIDTH, h: 28 },
  { x: 0, y: 0, w: 28, h: ARENA_HEIGHT },
  { x: ARENA_WIDTH - 28, y: 0, w: 28, h: ARENA_HEIGHT },
  { x: 220, y: 160, w: 160, h: 36 },
  { x: 900, y: 160, w: 160, h: 36 },
  { x: 220, y: 520, w: 160, h: 36 },
  { x: 900, y: 520, w: 160, h: 36 },
  { x: 560, y: 250, w: 40, h: 220 },
  { x: 680, y: 250, w: 40, h: 220 },
  { x: 380, y: 340, w: 120, h: 36 },
  { x: 780, y: 340, w: 120, h: 36 },
]
