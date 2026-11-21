/** Viewport — widescreen like classic slither/snake.io */
export const VIEW_WIDTH = 1600
export const VIEW_HEIGHT = 800

/** Large shared world (camera scrolls) */
export const WORLD_WIDTH = 4800
export const WORLD_HEIGHT = 2700

export const WORLD_PAD = 40
export const FOOD_COUNT = 220
export const BOT_COUNT = 12
export const START_LENGTH = 12
export const SEGMENT_GAP = 9
export const BASE_SPEED = 175
export const BOOST_SPEED = 290
export const TURN_RATE = 4.4
export const BOT_TURN_RATE = 2.6
export const HEAD_SIZE = 16
export const MAX_SIZE = 30
export const MIN_SEGMENTS = 8
export const BOOST_DRAIN = 12
export const OPEN_COUNTDOWN = 3
export const RESPAWN_DELAY = 1.8
export const SCORE_OPTIONS = [5, 10, 15] as const

export const P1_COLOR = '#e23d3d'
export const P2_COLOR = '#2f6fed'

export const FOOD_COLORS = [
  '#C0392B',
  '#E74C3C',
  '#9B59B6',
  '#8E44AD',
  '#2980B9',
  '#3498DB',
  '#17A589',
  '#138D75',
  '#229954',
  '#28B463',
  '#D4AC0D',
  '#D68910',
  '#CA6F1E',
  '#BA4A00',
] as const

export const BOT_NAMES = [
  'Viper',
  'Noodle',
  'Zigzag',
  'Coil',
  'Slither',
  'Pixel',
  'Neon',
  'Orbit',
  'Dash',
  'Blink',
  'Racer',
  'Comet',
  'Jade',
  'Ember',
  'Frost',
  'Nova',
] as const
