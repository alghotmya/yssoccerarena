export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720
export const GROUND_Y = 640

export const THROWER_X = 250
export const THROWER_Y = 470
export const TARGET_X = 980

export const BODY_POINTS = 5
export const ARM_POINTS = 3
export const LEG_POINTS = 2

export interface ZoneRect {
  id: 'body' | 'arm' | 'leg'
  x: number
  y: number
  w: number
  h: number
  points: number
  label: string
}

export const ZONES: ZoneRect[] = [
  { id: 'body', x: 900, y: 230, w: 160, h: 180, points: BODY_POINTS, label: 'BODY' },
  { id: 'arm', x: 790, y: 260, w: 110, h: 120, points: ARM_POINTS, label: 'ARM' },
  { id: 'arm', x: 1060, y: 260, w: 110, h: 120, points: ARM_POINTS, label: 'ARM' },
  { id: 'leg', x: 930, y: 410, w: 100, h: 200, points: LEG_POINTS, label: 'LEG' },
]

export const FLIGHT_TIME = 0.7
export const RESULT_TIME = 1.35
export const SCORE_OPTIONS = [11, 15, 21] as const

export const P1_COLOR = '#e23d3d'
export const P2_COLOR = '#2f6fed'

export type HitZone = 'body' | 'arm' | 'leg' | 'miss'

export const ZONE_POINTS: Record<HitZone, number> = {
  body: BODY_POINTS,
  arm: ARM_POINTS,
  leg: LEG_POINTS,
  miss: 0,
}
