/**
 * Neon-style fighter renderer with player face portraits.
 * Visual language inspired by Neon Rumble (MIT) + Face-Off portraits.
 */
import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BODY_W,
  CROUCH_H,
  GROUND_Y,
  MOVES,
  PROJ_RADIUS,
  STAND_H,
} from './constants'
import type { RumbleEngine } from './engine'
import type { Brawler } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class RumbleRenderer {
  private ctx: CanvasRenderingContext2D
  private faces: FaceMap = {
    1: { happy: null, amazed: null, angry: null, sad: null },
    2: { happy: null, amazed: null, angry: null, sad: null },
  }

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    canvas.width = ARENA_WIDTH
    canvas.height = ARENA_HEIGHT
  }

  async loadFaces() {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(placeholder())
        img.src = src
      })
    const entries: Array<[1 | 2, Expression, string]> = [
      [1, 'happy', FACE_PATHS[1].happy],
      [1, 'amazed', FACE_PATHS[1].amazed],
      [1, 'angry', FACE_PATHS[1].angry],
      [1, 'sad', FACE_PATHS[1].sad],
      [2, 'happy', FACE_PATHS[2].happy],
      [2, 'amazed', FACE_PATHS[2].amazed],
      [2, 'angry', FACE_PATHS[2].angry],
      [2, 'sad', FACE_PATHS[2].sad],
    ]
    await Promise.all(
      entries.map(async ([id, expr, src]) => {
        this.faces[id][expr] = await load(src)
      }),
    )
  }

  draw(engine: RumbleEngine) {
    const ctx = this.ctx
    const shakeX = engine.shake > 0 ? (Math.random() - 0.5) * 12 * engine.shake : 0
    const shakeY = engine.shake > 0 ? (Math.random() - 0.5) * 10 * engine.shake : 0
    ctx.save()
    ctx.translate(shakeX, shakeY)
    ctx.clearRect(-20, -20, ARENA_WIDTH + 40, ARENA_HEIGHT + 40)
    this.drawArena()
    this.drawFighter(engine.p1)
    this.drawFighter(engine.p2)
    for (const p of engine.projectiles) this.drawProjectile(p.x, p.y, p.color)
    for (const s of engine.sparks) {
      ctx.globalAlpha = Math.max(0, s.life * 3)
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (engine.phase === 'countdown') {
      this.drawBanner(engine.countdown > 0 ? String(Math.ceil(engine.countdown)) : 'FIGHT!')
    }
    if (engine.phase === 'ko') this.drawBanner('K.O.!')
    if (engine.combo >= 2) {
      ctx.fillStyle = '#ffd23f'
      ctx.font = "700 28px 'Lilita One', Impact, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText(`${engine.combo} HIT!`, ARENA_WIDTH / 2, 120)
    }
    ctx.restore()
  }

  private drawArena() {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
    sky.addColorStop(0, '#0a1020')
    sky.addColorStop(0.4, '#1a2850')
    sky.addColorStop(0.75, '#3a1a58')
    sky.addColorStop(1, '#ff4d8d')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    // Neon grid floor
    ctx.fillStyle = '#121826'
    ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, ARENA_HEIGHT - GROUND_Y)
    ctx.strokeStyle = 'rgba(57, 210, 255, 0.25)'
    ctx.lineWidth = 2
    for (let x = 0; x < ARENA_WIDTH; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, GROUND_Y)
      ctx.lineTo(x - 40, ARENA_HEIGHT)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255, 77, 141, 0.45)'
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(ARENA_WIDTH, GROUND_Y)
    ctx.stroke()

    // City silhouettes
    const buildings = [80, 180, 300, 420, 560, 700, 840, 980, 1100, 1200]
    buildings.forEach((x, i) => {
      const h = 70 + ((i * 53) % 150)
      ctx.fillStyle = i % 2 === 0 ? '#141a2e' : '#1c2440'
      ctx.fillRect(x, GROUND_Y - h, 70, h)
      ctx.fillStyle = i % 3 === 0 ? '#39d2ff' : '#ff4d8d'
      for (let wy = GROUND_Y - h + 12; wy < GROUND_Y - 10; wy += 18) {
        ctx.fillRect(x + 12, wy, 8, 8)
        ctx.fillRect(x + 40, wy, 8, 8)
      }
    })
  }

  private drawFighter(f: Brawler) {
    const ctx = this.ctx
    const h = f.crouching ? CROUCH_H : STAND_H
    const bodyTop = f.y - h

    if (f.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(f.x, f.y - h * 0.55, 48, 0, Math.PI * 2)
      ctx.fill()
    }

    // Legs
    ctx.strokeStyle = f.color
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    const legY = f.y - 8
    const sway = Math.sin(f.walk) * 10
    ctx.beginPath()
    ctx.moveTo(f.x, f.y - h * 0.35)
    ctx.lineTo(f.x - 14 + sway, legY)
    ctx.moveTo(f.x, f.y - h * 0.35)
    ctx.lineTo(f.x + 14 - sway, legY)
    ctx.stroke()

    // Torso
    ctx.fillStyle = f.color
    ctx.beginPath()
    ctx.roundRect(f.x - BODY_W / 2, bodyTop + 36, BODY_W, h - 48, 12)
    ctx.fill()
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 2
    ctx.stroke()

    // Attack limb
    if (f.state === 'attack' && f.move && f.move !== 'special') {
      const move = MOVES[f.move]
      const active =
        f.moveTime >= move.startup && f.moveTime <= move.startup + move.active
      const reach = active ? move.reach : move.reach * 0.45
      const ax = f.x + f.facing * (22 + reach * 0.5)
      const ay = f.y - move.oy + move.height / 2
      ctx.strokeStyle = f.color
      ctx.lineWidth = f.move === 'kick' ? 14 : 10
      ctx.beginPath()
      ctx.moveTo(f.x + f.facing * 16, f.y - h * 0.55)
      ctx.lineTo(ax, ay)
      ctx.stroke()
      if (active) {
        ctx.fillStyle = 'rgba(255,210,63,0.55)'
        ctx.beginPath()
        ctx.arc(ax, ay, 12, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Block pose
    if (f.blocking && f.state === 'idle') {
      ctx.strokeStyle = '#88cfff'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(f.x + f.facing * 8, f.y - h * 0.7)
      ctx.lineTo(f.x + f.facing * 28, f.y - h * 0.45)
      ctx.stroke()
    }

    // Head + face
    const headR = 26
    const hx = f.x
    const hy = bodyTop + headR + 4
    ctx.fillStyle = f.color
    ctx.beginPath()
    ctx.arc(hx, hy, headR + 2, 0, Math.PI * 2)
    ctx.fill()
    const face = this.faces[f.id][f.expression]
    if (face) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(hx, hy, headR, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(face, hx - headR, hy - headR, headR * 2, headR * 2)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(hx, hy, headR, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff6d8'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  private drawProjectile(x: number, y: number, color: string) {
    const ctx = this.ctx
    const g = ctx.createRadialGradient(x, y, 2, x, y, PROJ_RADIUS + 8)
    g.addColorStop(0, '#fff6d8')
    g.addColorStop(0.4, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, PROJ_RADIUS + 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, PROJ_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawBanner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, ARENA_HEIGHT / 2 - 56, ARENA_WIDTH, 112)
    ctx.font = "700 72px 'Lilita One', Impact, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#12081c'
    ctx.lineWidth = 8
    ctx.strokeText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
    ctx.fillStyle = '#ffd23f'
    ctx.fillText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
  }
}

function placeholder() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#888'
  ctx.fillRect(0, 0, 64, 64)
  const img = new Image()
  img.src = c.toDataURL()
  return img
}
