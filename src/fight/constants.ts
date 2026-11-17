export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720
export const GROUND_Y = 620

export const GRAVITY = 2600
export const MOVE_SPEED = 360
export const JUMP_SPEED = -860
export const MAX_HEALTH = 100

export const PUNCH_DAMAGE = 10
export const PUNCH_REACH = 78
export const PUNCH_ACTIVE = 0.12
export const PUNCH_COOLDOWN = 0.32
export const PUNCH_KNOCK = 340

export const KICK_DAMAGE = 16
export const KICK_REACH = 104
export const KICK_ACTIVE = 0.16
export const KICK_COOLDOWN = 0.48
export const KICK_KNOCK = 520

export const HITSTUN = 0.28
export const KO_PAUSE = 1.5
export const FIGHT_COUNTDOWN = 3

export const FIGHTER_COLOR = {
  1: '#2f6fed',
  2: '#e23d3d',
} as const

export const ROUND_OPTIONS = [2, 3, 5] as const
