import type { EnemyId } from './levels'

export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720

export const ENEMY: Record<
  EnemyId,
  {
    w: number
    h: number
    hp: number
    score: number
    speed: number
    behavior: string
    color: string
    fire: number
    spread?: boolean
  }
> = {
  scout: { w: 38, h: 26, hp: 1, score: 50, speed: 3.2, behavior: 'straight', color: '#ff5e6c', fire: 0 },
  weaver: { w: 38, h: 28, hp: 1, score: 70, speed: 2.6, behavior: 'sine', color: '#b06bff', fire: 0 },
  diver: { w: 38, h: 28, hp: 1, score: 90, speed: 3.0, behavior: 'diver', color: '#ff9f43', fire: 0 },
  kamikaze: { w: 32, h: 24, hp: 1, score: 80, speed: 4.2, behavior: 'homing', color: '#ffd24a', fire: 0 },
  gunship: {
    w: 50,
    h: 36,
    hp: 3,
    score: 130,
    speed: 2.0,
    behavior: 'straight',
    color: '#4aa0ff',
    fire: 1.4,
    spread: true,
  },
  turret: { w: 52, h: 42, hp: 4, score: 150, speed: 1.4, behavior: 'straight', color: '#7ea06a', fire: 1.1 },
}

export const POWER: Record<string, { name: string; color: string }> = {
  W: { name: 'Weapon up', color: '#39ff9e' },
  H: { name: 'Homing missiles', color: '#00e5ff' },
  R: { name: 'Rapid fire', color: '#ffd24a' },
  S: { name: 'Shield', color: '#7b8cff' },
  B: { name: 'Smart bomb', color: '#ff5e7e' },
  L: { name: 'Extra life', color: '#ff2e97' },
}

export const P1_COLOR = '#e23d3d'
export const P2_COLOR = '#2f6fed'
