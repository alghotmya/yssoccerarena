/**
 * Canvas renderer for Face-Off Snake — visual style adapted from bibhuticoder/snake.io (MIT).
 */
import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import { ARENA_HEIGHT, ARENA_WIDTH, WORLD_PAD } from './constants'
import type { SnakeEngine } from './engine'
import type { Worm } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class SnakeRenderer {
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

  draw(engine: SnakeEngine) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    this.drawBackdrop()
    this.drawBorder()
    for (const food of engine.foods) this.drawFood(food.x, food.y, food.size, food.color)
    if (engine.p1.alive) this.drawWorm(engine.p1)
    if (engine.p2.alive) this.drawWorm(engine.p2)
    if (engine.phase === 'countdown') {
      this.drawBanner(engine.countdown > 0 ? String(Math.ceil(engine.countdown)) : 'SLITHER!')
    }
    if (engine.phase === 'ko') this.drawBanner('KO!')
  }

  private drawBackdrop() {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
    g.addColorStop(0, '#17202A')
    g.addColorStop(1, '#0d1520')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < ARENA_WIDTH; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ARENA_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y < ARENA_HEIGHT; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(ARENA_WIDTH, y)
      ctx.stroke()
    }
  }

  private drawBorder() {
    const ctx = this.ctx
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.55)'
    ctx.lineWidth = 4
    ctx.strokeRect(WORLD_PAD, WORLD_PAD, ARENA_WIDTH - WORLD_PAD * 2, ARENA_HEIGHT - WORLD_PAD * 2)
  }

  private drawFood(x: number, y: number, size: number, color: string) {
    const ctx = this.ctx
    ctx.globalAlpha = 0.55
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = shade(color, 0.5)
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawWorm(worm: Worm) {
    const ctx = this.ctx
    for (let i = worm.segments.length - 1; i >= 1; i--) {
      const s = worm.segments[i]!
      const radius = Math.max(2, worm.size - i * 0.015)
      const grd = ctx.createRadialGradient(s.x, s.y, 2, s.x + 4, s.y + 4, radius + 4)
      grd.addColorStop(0, worm.midColor)
      grd.addColorStop(1, worm.color)
      ctx.fillStyle = worm.color
      ctx.beginPath()
      ctx.arc(s.x, s.y, radius + 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    const head = worm.segments[0]!
    const x = head.x
    const y = head.y
    const size = worm.size

    const grd = ctx.createRadialGradient(x, y, 2, x + 4, y + 4, size + 4)
    grd.addColorStop(0, worm.midColor)
    grd.addColorStop(1, worm.color)
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(x, y, size + 1, 0, Math.PI * 2)
    ctx.fill()

    if (worm.boost) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, size + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Two-eye branch head (from upstream snake.io)
    const d = size * 1.9
    let p1 = {
      x: x + d * Math.cos(worm.angle),
      y: y + d * Math.sin(worm.angle),
    }
    p1 = rotate(p1, head, Math.PI / 6)
    const p2 = rotate({ x: p1.x, y: p1.y }, head, -Math.PI / 3)
    this.drawEye(p1.x, p1.y, size, worm.angle, worm.color)
    this.drawEye(p2.x, p2.y, size, worm.angle, worm.color)

    const face = this.faces[worm.id][worm.expression]
    if (face) {
      const fs = size * 1.1
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, fs * 0.55, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(face, x - fs / 2, y - fs / 2, fs, fs)
      ctx.restore()
    }
  }

  private drawEye(ex: number, ey: number, size: number, angle: number, color: string) {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(ex, ey, size / 2 + 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'whitesmoke'
    ctx.beginPath()
    ctx.arc(ex, ey, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'black'
    ctx.beginPath()
    ctx.arc(ex + Math.cos(angle), ey + Math.sin(angle), size / 4, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawBanner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, ARENA_HEIGHT / 2 - 60, ARENA_WIDTH, 120)
    ctx.fillStyle = '#ffd23f'
    ctx.font = 'bold 72px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
  }
}

function rotate(p: { x: number; y: number }, c: { x: number; y: number }, angle: number) {
  const si = Math.sin(angle)
  const co = Math.cos(angle)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: dx * co - dy * si + c.x, y: dx * si + dy * co + c.y }
}

function shade(hex: string, lum: number) {
  const clean = hex.replace(/[^0-9a-f]/gi, '')
  const full = clean.length < 6 ? clean[0]! + clean[0] + clean[1]! + clean[1] + clean[2]! + clean[2] : clean
  let rgb = '#'
  for (let i = 0; i < 3; i++) {
    const c = parseInt(full.slice(i * 2, i * 2 + 2), 16)
    const n = Math.round(Math.min(255, Math.max(0, c + c * lum)))
      .toString(16)
      .padStart(2, '0')
    rgb += n
  }
  return rgb
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
