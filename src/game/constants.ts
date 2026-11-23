export const FIELD_WIDTH = 1280
export const FIELD_HEIGHT = 720

export const GOAL_WIDTH = 160
export const GOAL_DEPTH = 28
export const GOAL_POST_THICKNESS = 10

export const PLAYER_RADIUS = 28
export const PLAYER_SPEED = 320
export const PLAYER_ACCEL = 1800
export const PLAYER_FRICTION = 0.86
export const KICK_RANGE = 62
export const KICK_STRENGTH = 780
export const KICK_COOLDOWN = 0.35
export const TOUCH_STRENGTH = 220

export const BALL_RADIUS = 14
/** Per-second drag. Kept tiny so the ball rarely slows down. */
export const BALL_DRAG = 0.03
export const BALL_MAX_SPEED = 1100
/** Near-elastic walls so the ball stays lively. */
export const BOUNCE = 0.98
export const WALL_THICKNESS = 18

export const PHYSICS_DT = 1 / 120
export const COUNTDOWN_DURATION = 3
/** Shorter countdown after a goal so the round restarts quickly with the new score. */
export const ROUND_RESTART_COUNTDOWN = 1.6
export const GOAL_CELEBRATION_DURATION = 1.4
export const EXPRESSION_HOLD = 2

export const PLAYER1_COLOR = '#e23d3d'
export const PLAYER2_COLOR = '#2f6fed'

/** Cartoon avatars (no real player photos). Used for HUD, cockpits, and portraits. */
export const FACE_PATHS = {
  1: {
    happy: '/cartoons/p1-happy.svg',
    amazed: '/cartoons/p1-amazed.svg',
    angry: '/cartoons/p1-angry.svg',
    sad: '/cartoons/p1-sad.svg',
  },
  2: {
    happy: '/cartoons/p2-happy.svg',
    amazed: '/cartoons/p2-amazed.svg',
    angry: '/cartoons/p2-angry.svg',
    sad: '/cartoons/p2-sad.svg',
  },
} as const

export const WIN_SCORE_OPTIONS = [3, 5, 7, 10] as const
