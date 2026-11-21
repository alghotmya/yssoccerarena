/** Viewport inspired by Neon Rumble (960×540), scaled up for Face-Off. */
export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720
export const GROUND_Y = 620
export const LEFT_WALL = 60
export const RIGHT_WALL = ARENA_WIDTH - 60

export const MAX_HEALTH = 1000
export const METER_MAX = 100
export const SPECIAL_COST = 35
export const ROUND_OPTIONS = [2, 3] as const
export const OPEN_COUNTDOWN = 3
export const KO_PAUSE = 1.6
export const ROUND_TIME = 99

export const MOVE_SPEED = 220
export const JUMP_SPEED = 520
export const GRAVITY = 1400
export const BODY_W = 46
export const STAND_H = 140
export const CROUCH_H = 88

export const P1_COLOR = '#e23d3d'
export const P2_COLOR = '#2f6fed'

/** Frame-data style moves adapted from Neon Rumble's move table (MIT). */
export const MOVES = {
  punch: {
    label: 'jab',
    startup: 0.07,
    active: 0.05,
    recovery: 0.12,
    damage: 55,
    hitstun: 0.22,
    blockstun: 0.14,
    reach: 78,
    height: 34,
    oy: 110,
    knock: 180,
    meterGain: 8,
  },
  kick: {
    label: 'kick',
    startup: 0.14,
    active: 0.08,
    recovery: 0.28,
    damage: 95,
    hitstun: 0.34,
    blockstun: 0.22,
    reach: 96,
    height: 42,
    oy: 70,
    knock: 320,
    meterGain: 12,
  },
  special: {
    label: 'blast',
    startup: 0.18,
    active: 0.05,
    recovery: 0.32,
    damage: 70,
    hitstun: 0.28,
    blockstun: 0.18,
    reach: 0,
    height: 28,
    oy: 100,
    knock: 140,
    meterGain: 0,
    projectile: true,
  },
} as const

export type MoveKey = keyof typeof MOVES

export const PROJ_SPEED = 420
export const PROJ_RADIUS = 14
export const PROJ_LIFE = 1.8
