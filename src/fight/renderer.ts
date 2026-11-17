import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import { ARENA_HEIGHT, ARENA_WIDTH, GROUND_Y } from './constants'
import type { FightEngine } from './engine'
import type { Fighter } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class FightRenderer {
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
        img.onerror = () => resolve(placeholder(src))
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

  draw(engine: FightEngine) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    this.drawArena()
    this.drawFighter(engine.p1)
    this.drawFighter(engine.p2)
    if (engine.phase === 'countdown') this.drawBanner(engine.countdown > 0 ? String(Math.ceil(engine.countdown)) : 'FIGHT!')
    if (engine.phase === 'ko') this.drawBanner('K.O.!')
  }

  private drawArena() {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
    sky.addColorStop(0, '#1b2a4a')
    sky.addColorStop(0.55, '#314e7a')
    sky.addColorStop(1, '#c47a4a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    ctx.fillStyle = '#6b4a32'
    ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, ARENA_HEIGHT - GROUND_Y)
    ctx.fillStyle = '#3f8f4a'
    ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, 18)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(48, GROUND_Y)
    ctx.lineTo(ARENA_WIDTH - 48, GROUND_Y)
    ctx.stroke()
  }

  private drawFighter(f: Fighter) {
    const ctx = this.ctx
    const feet = f.y
    const bob = f.onGround ? Math.sin(f.walk) * 3 : 0
    const punch = f.attack === 'punch' ? 1 : 0
    const kick = f.attack === 'kick' ? 1 : 0
    const leg = f.onGround && Math.abs(f.vx) > 20 ? Math.sin(f.walk) * 16 : 0

    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(f.x, GROUND_Y + 8, 36, 10, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(f.x, feet + bob)
    ctx.strokeStyle = f.color
    ctx.fillStyle = f.color
    ctx.lineWidth = 7
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(-8, -52)
    ctx.lineTo(-10 - leg, -6)
    ctx.moveTo(8, -52)
    ctx.lineTo(kick ? f.facing * 54 : 12 + leg, kick ? -28 : -6)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -108)
    ctx.lineTo(0, -48)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -90)
    ctx.lineTo(f.facing * (punch ? 62 : 28), punch ? -96 : -70)
    ctx.moveTo(0, -90)
    ctx.lineTo(-f.facing * 24, -64)
    ctx.stroke()

    const headR = 26
    const face = this.faces[f.id][f.expression]
    ctx.beginPath()
    ctx.arc(0, -128, headR + 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, -128, headR, 0, Math.PI * 2)
    ctx.clip()
    if (face) ctx.drawImage(face, -headR, -128 - headR, headR * 2, headR * 2)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(0, -128, headR + 3, 0, Math.PI * 2)
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
  }

  private drawBanner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 110px "Trebuchet MS", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.lineWidth = 8
    ctx.strokeText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
    ctx.fillText(text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
  }
}

function placeholder(label: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#334'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#fff'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label.split('/').pop() ?? 'P', 64, 68)
  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}
