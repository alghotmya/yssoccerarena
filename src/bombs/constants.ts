export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720

export const COLS = 15
export const ROWS = 11
export const TILE = 52
export const GRID_W = COLS * TILE
export const GRID_H = ROWS * TILE
export const ORIGIN_X = (ARENA_WIDTH - GRID_W) / 2
export const ORIGIN_Y = (ARENA_HEIGHT - GRID_H) / 2 + 8

export const PLAYER_RADIUS = 18
export const PLAYER_SPEED = 210
export const BOMB_FUSE = 2.1
export const BLAST_RANGE = 2
export const BLAST_TIME = 0.45
export const BOMB_COOLDOWN = 0.35
export const MAX_BOMBS = 2

export const OPEN_COUNTDOWN = 3
export const RESPAWN_COUNTDOWN = 1.7
export const KO_PAUSE = 1.4
export const SCORE_OPTIONS = [3, 5, 7] as const

export const P1_COLOR = '#e23d3d'
export const P2_COLOR = '#2f6fed'
