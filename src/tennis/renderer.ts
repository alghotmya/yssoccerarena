import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import {
  BALL_RADIUS,
  COURT_BOTTOM,
  COURT_HEIGHT,
  COURT_LEFT,
  COURT_RIGHT,
  COURT_TOP,
  COURT_WIDTH,
  NET_X,
} from './constants'
import type { TennisEngine } from './engine'
import type { TennisPlayer } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class TennisRenderer {
  private ctx: CanvasRenderingContext2D
  private faces: FaceMap = {
    1: { happy: null, amazed: null, angry: null, sad: null },
    2: { happy: null, amazed: null, angry: null, sad: null },
  }

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    canvas.width = COURT_WIDTH
    canvas.height = COURT_HEIGHT
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
      entries.map(async ([id, expression, src]) => {
        this.faces[id][expression] = await load(src)
      }),
    )
  }

  draw(engine: TennisEngine) {
    this.drawCourt()
    this.drawPlayer(engine.p1)
    this.drawPlayer(engine.p2)
    this.drawBall(engine)
    if (engine.phase === 'countdown') {
      const value = Math.ceil(engine.countdown)
      this.drawBanner(value > 0 ? String(value) : 'SERVE!')
    } else if (engine.phase === 'point') {
      this.drawBanner('POINT!')
    } else if (engine.ball.held && engine.phase === 'rally') {
      this.drawServeTag()
    }
  }

  private drawCourt() {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, COURT_HEIGHT)
    sky.addColorStop(0, '#12081f')
    sky.addColorStop(0.45, '#1b2450')
    sky.addColorStop(1, '#0d1a12')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT)

    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffe14a' : '#7ad7ff'
      ctx.globalAlpha = 0.85
      ctx.fillRect(80 + i * 150, 28, 46, 10)
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = '#146b38'
    ctx.fillRect(COURT_LEFT - 18, COURT_TOP - 18, COURT_RIGHT - COURT_LEFT + 36, COURT_BOTTOM - COURT_TOP + 36)
    ctx.fillStyle = '#1f8f4c'
    ctx.fillRect(COURT_LEFT, COURT_TOP, COURT_RIGHT - COURT_LEFT, COURT_BOTTOM - COURT_TOP)

    ctx.strokeStyle = 'rgba(255,255,255,0.92)'
    ctx.lineWidth = 4
    ctx.strokeRect(COURT_LEFT, COURT_TOP, COURT_RIGHT - COURT_LEFT, COURT_BOTTOM - COURT_TOP)
    ctx.beginPath()
    ctx.moveTo(NET_X, COURT_TOP)
    ctx.lineTo(NET_X, COURT_BOTTOM)
    ctx.moveTo(COURT_LEFT, (COURT_TOP + COURT_BOTTOM) / 2)
    ctx.lineTo(COURT_RIGHT, (COURT_TOP + COURT_BOTTOM) / 2)
    const service = 180
    ctx.moveTo(NET_X - service, COURT_TOP)
    ctx.lineTo(NET_X - service, COURT_BOTTOM)
    ctx.moveTo(NET_X + service, COURT_TOP)
    ctx.lineTo(NET_X + service, COURT_BOTTOM)
    ctx.stroke()

    ctx.strokeStyle = '#d7ffe8'
    ctx.lineWidth = 8
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.moveTo(NET_X, COURT_TOP - 10)
    ctx.lineTo(NET_X, COURT_BOTTOM + 10)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffe14a'
    ctx.fillRect(NET_X - 7, COURT_TOP - 16, 14, 14)
    ctx.fillRect(NET_X - 7, COURT_BOTTOM + 2, 14, 14)
  }

  private drawPlayer(player: TennisPlayer) {
    const ctx = this.ctx
    const walk = Math.sin(player.walk) * 6
    const swing = player.swing > 0 ? 1 : 0

    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(player.x, player.y + 34, 22, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(player.x, player.y)
    ctx.strokeStyle = player.color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 8)
    ctx.lineTo(-10 - walk * 0.3, 30)
    ctx.moveTo(0, 8)
    ctx.lineTo(10 + walk * 0.3, 30)
    ctx.moveTo(0, -8)
    ctx.lineTo(0, 10)
    ctx.stroke()

    const racketX = player.facing * (20 + swing * 26)
    const racketY = -2 - swing * 10
    ctx.beginPath()
    ctx.moveTo(player.facing * 8, -2)
    ctx.lineTo(racketX, racketY)
    ctx.strokeStyle = '#f6f1e4'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(racketX + player.facing * 8, racketY, 11, 15, player.facing * 0.2, 0, Math.PI * 2)
    ctx.stroke()

    const headR = 22
    const face = this.faces[player.id][player.expression]
    ctx.beginPath()
    ctx.arc(0, -28, headR, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, -28, headR - 2, 0, Math.PI * 2)
    ctx.clip()
    if (face) ctx.drawImage(face, -headR + 2, -28 - headR + 2, (headR - 2) * 2, (headR - 2) * 2)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(0, -28, headR, 0, Math.PI * 2)
    ctx.strokeStyle = player.color
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
  }

  private drawBall(engine: TennisEngine) {
    const ctx = this.ctx
    const { x, y } = engine.ball
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(x + 2, y + BALL_RADIUS + 4, BALL_RADIUS, BALL_RADIUS * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()

    const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, BALL_RADIUS)
    grad.addColorStop(0, '#f7ff8a')
    grad.addColorStop(0.6, '#d6e22a')
    grad.addColorStop(1, '#8ea814')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, BALL_RADIUS * 0.55, 0.2, 2.4)
    ctx.stroke()
  }

  private drawServeTag() {
    const ctx = this.ctx
    ctx.font = '900 42px "Lilita One", "Fredoka", Impact, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 8
    ctx.strokeStyle = '#14081f'
    ctx.strokeText('SERVE', COURT_WIDTH / 2, 48)
    ctx.fillStyle = '#ffe14a'
    ctx.fillText('SERVE', COURT_WIDTH / 2, 48)
  }

  private drawBanner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(8, 0, 20, 0.38)'
    ctx.fillRect(0, 0, COURT_WIDTH, COURT_HEIGHT)
    ctx.font = '900 120px "Lilita One", "Fredoka", Impact, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 16
    ctx.strokeStyle = '#14081f'
    ctx.strokeText(text, COURT_WIDTH / 2, COURT_HEIGHT / 2)
    ctx.fillStyle = text === 'POINT!' ? '#7CFFB2' : '#ffe14a'
    ctx.fillText(text, COURT_WIDTH / 2, COURT_HEIGHT / 2)
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
