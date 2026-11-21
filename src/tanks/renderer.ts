import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import { ARENA_HEIGHT, ARENA_WIDTH, BULLET_RADIUS, TANK_RADIUS, WALLS } from './constants'
import type { TanksEngine } from './engine'
import type { Tank } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class TanksRenderer {
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

  draw(engine: TanksEngine) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    this.drawArena()
    this.drawWalls()
    for (const b of engine.bullets) this.drawBullet(b.x, b.y, b.color)
    this.drawTank(engine.p1)
    this.drawTank(engine.p2)
    for (const p of engine.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 3)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (engine.phase === 'countdown') {
      this.drawBanner(engine.countdown > 0 ? String(Math.ceil(engine.countdown)) : 'FIRE!')
    }
    if (engine.phase === 'ko') this.drawBanner('HIT!')
  }

  private drawArena() {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    g.addColorStop(0, '#1a0f2e')
    g.addColorStop(0.5, '#2a1848')
    g.addColorStop(1, '#1c2840')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    ctx.strokeStyle = 'rgba(255, 210, 63, 0.18)'
    ctx.lineWidth = 2
    for (let x = 80; x < ARENA_WIDTH; x += 80) {
      ctx.beginPath()
      ctx.moveTo(x, 28)
      ctx.lineTo(x, ARENA_HEIGHT - 28)
      ctx.stroke()
    }
    for (let y = 80; y < ARENA_HEIGHT; y += 80) {
      ctx.beginPath()
      ctx.moveTo(28, y)
      ctx.lineTo(ARENA_WIDTH - 28, y)
      ctx.stroke()
    }
  }

  private drawWalls() {
    const ctx = this.ctx
    for (const w of WALLS) {
      const grad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h)
      grad.addColorStop(0, '#5a3a78')
      grad.addColorStop(1, '#2a1638')
      ctx.fillStyle = grad
      ctx.fillRect(w.x, w.y, w.w, w.h)
      ctx.strokeStyle = '#ffd23f'
      ctx.lineWidth = 3
      ctx.strokeRect(w.x + 1.5, w.y + 1.5, w.w - 3, w.h - 3)
    }
  }

  private drawTank(tank: Tank) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(tank.x, tank.y)
    ctx.rotate(tank.angle)

    if (tank.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(0, 0, TANK_RADIUS + 8, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#1a1020'
    ctx.fillRect(-18, -22, 36, 44)
    ctx.fillStyle = tank.color
    ctx.beginPath()
    ctx.roundRect(-22, -18, 44, 36, 8)
    ctx.fill()
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#2a2118'
    ctx.fillRect(8, -6, 34, 12)
    ctx.fillStyle = tank.color
    ctx.fillRect(8, -4, 30, 8)

    const face = this.faces[tank.id][tank.expression]
    if (face) {
      ctx.save()
      ctx.rotate(-tank.angle)
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(face, -16, -16, 32, 32)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff6d8'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawBullet(x: number, y: number, color: string) {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff6d8'
    ctx.beginPath()
    ctx.arc(x, y, BULLET_RADIUS * 0.45, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawBanner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(12, 4, 20, 0.45)'
    ctx.fillRect(0, ARENA_HEIGHT / 2 - 60, ARENA_WIDTH, 120)
    ctx.font = "700 72px 'Lilita One', Impact, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffd23f'
    ctx.strokeStyle = '#12081c'
    ctx.lineWidth = 8
    ctx.strokeText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
    ctx.fillText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
  }
}

function placeholder() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#444'
  ctx.fillRect(0, 0, 64, 64)
  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}
