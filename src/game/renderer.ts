import {
  FACE_PATHS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL_DEPTH,
  GOAL_WIDTH,
  PLAYER1_COLOR,
  PLAYER2_COLOR,
  WALL_THICKNESS,
} from './constants'
import { getGoalMouth } from './collision'
import type { GameEngine } from './gameEngine'
import type {
  BallState,
  ConfettiPiece,
  Expression,
  Particle,
  PlayerState,
} from '../types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private faces: FaceMap = {
    1: { happy: null, amazed: null, angry: null, sad: null },
    2: { happy: null, amazed: null, angry: null, sad: null },
  }
  private ready = false

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    canvas.width = FIELD_WIDTH
    canvas.height = FIELD_HEIGHT
  }

  async loadFaces() {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(createPlaceholder(src))
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
      entries.map(async ([player, expr, src]) => {
        this.faces[player][expr] = await load(src)
      }),
    )
    this.ready = true
  }

  draw(engine: GameEngine) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
    this.drawField()
    this.drawGoals()
    this.drawParticles(engine.particles)
    this.drawBallShadow(engine.ball)
    this.drawPlayer(engine.player1)
    this.drawPlayer(engine.player2)
    this.drawBall(engine.ball)
    this.drawConfetti(engine.confetti)

    if (engine.phase === 'countdown') {
      this.drawCountdown(engine.countdown)
    }
  }

  private drawField() {
    const ctx = this.ctx
    const stripeW = FIELD_WIDTH / 12
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#4ed56a' : '#3cbe58'
      ctx.fillRect(i * stripeW, 0, stripeW + 1, FIELD_HEIGHT)
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.92)'
    ctx.lineWidth = 4
    ctx.strokeRect(
      WALL_THICKNESS,
      WALL_THICKNESS,
      FIELD_WIDTH - WALL_THICKNESS * 2,
      FIELD_HEIGHT - WALL_THICKNESS * 2,
    )

    ctx.beginPath()
    ctx.moveTo(FIELD_WIDTH / 2, WALL_THICKNESS)
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - WALL_THICKNESS)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 70, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(WALL_THICKNESS + 90, FIELD_HEIGHT / 2, 55, -Math.PI / 2.4, Math.PI / 2.4)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(
      FIELD_WIDTH - WALL_THICKNESS - 90,
      FIELD_HEIGHT / 2,
      55,
      Math.PI - Math.PI / 2.4,
      Math.PI + Math.PI / 2.4,
    )
    ctx.stroke()

    const grad = ctx.createRadialGradient(
      FIELD_WIDTH / 2,
      FIELD_HEIGHT / 2,
      FIELD_HEIGHT * 0.2,
      FIELD_WIDTH / 2,
      FIELD_HEIGHT / 2,
      FIELD_WIDTH * 0.7,
    )
    grad.addColorStop(0, 'rgba(255,255,255,0.08)')
    grad.addColorStop(1, 'rgba(0,0,0,0.08)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
  }

  private drawGoals() {
    const ctx = this.ctx
    const mouth = getGoalMouth()
    const half = GOAL_WIDTH / 2

    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(WALL_THICKNESS - GOAL_DEPTH, mouth.top, GOAL_DEPTH, GOAL_WIDTH)
    ctx.fillStyle = PLAYER1_COLOR
    ctx.fillRect(WALL_THICKNESS - GOAL_DEPTH, mouth.top - 6, GOAL_DEPTH + 6, 8)
    ctx.fillRect(WALL_THICKNESS - GOAL_DEPTH, mouth.bottom - 2, GOAL_DEPTH + 6, 8)
    ctx.fillRect(WALL_THICKNESS - GOAL_DEPTH, mouth.top, 8, GOAL_WIDTH)

    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(FIELD_WIDTH - WALL_THICKNESS, mouth.top, GOAL_DEPTH, GOAL_WIDTH)
    ctx.fillStyle = PLAYER2_COLOR
    ctx.fillRect(FIELD_WIDTH - WALL_THICKNESS - 6, mouth.top - 6, GOAL_DEPTH + 6, 8)
    ctx.fillRect(FIELD_WIDTH - WALL_THICKNESS - 6, mouth.bottom - 2, GOAL_DEPTH + 6, 8)
    ctx.fillRect(FIELD_WIDTH - WALL_THICKNESS + GOAL_DEPTH - 8, mouth.top, 8, GOAL_WIDTH)

    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(WALL_THICKNESS, FIELD_HEIGHT / 2 - half, 70, GOAL_WIDTH)
    ctx.strokeRect(FIELD_WIDTH - WALL_THICKNESS - 70, FIELD_HEIGHT / 2 - half, 70, GOAL_WIDTH)

    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      const y = mouth.top + (i + 1) * (GOAL_WIDTH / 7)
      ctx.beginPath()
      ctx.moveTo(WALL_THICKNESS - GOAL_DEPTH, y)
      ctx.lineTo(WALL_THICKNESS, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(FIELD_WIDTH - WALL_THICKNESS, y)
      ctx.lineTo(FIELD_WIDTH - WALL_THICKNESS + GOAL_DEPTH, y)
      ctx.stroke()
    }
  }

  private drawPlayer(player: PlayerState) {
    const ctx = this.ctx
    const kick = player.kickAnim > 0 ? 1 - player.kickAnim / 0.22 : 0
    const walk = Math.sin(player.walkPhase) * (Math.hypot(player.vx, player.vy) > 20 ? 8 : 2)
    const idle = Math.sin(player.walkPhase * 0.6) * 1.5

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(player.x, player.y + 34, 20, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(player.x, player.y + idle)

    ctx.strokeStyle = player.color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 8)
    ctx.lineTo(-10 - walk * 0.3, 30)
    ctx.moveTo(0, 8)
    ctx.lineTo(10 + walk * 0.3, 30)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -8)
    ctx.lineTo(0, 10)
    ctx.stroke()

    const armSwing = walk * 0.5
    const kickArm = kick * 18 * (player.facingX >= 0 ? 1 : -1)
    ctx.beginPath()
    ctx.moveTo(0, -2)
    ctx.lineTo(-14 - armSwing + kickArm * 0.2, 10)
    ctx.moveTo(0, -2)
    ctx.lineTo(14 + armSwing + kickArm, 6 - kick * 8)
    ctx.stroke()

    const headR = 22
    const face = this.ready ? this.faces[player.id][player.expression] : null
    ctx.beginPath()
    ctx.arc(0, -28, headR, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, -28, headR - 2, 0, Math.PI * 2)
    ctx.clip()
    if (face) {
      ctx.drawImage(face, -headR + 2, -28 - headR + 2, (headR - 2) * 2, (headR - 2) * 2)
    } else {
      ctx.fillStyle = player.color
      ctx.fillRect(-headR, -28 - headR, headR * 2, headR * 2)
    }
    ctx.restore()

    ctx.beginPath()
    ctx.arc(0, -28, headR, 0, Math.PI * 2)
    ctx.strokeStyle = player.color
    ctx.lineWidth = 4
    ctx.stroke()

    if (kick > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * kick})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(player.facingX * 20, 4, 10 + kick * 10, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawBallShadow(ball: BallState) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(
      ball.x + 2,
      ball.y + ball.radius + 4,
      ball.radius * 0.9,
      ball.radius * 0.4,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  private drawBall(ball: BallState) {
    const ctx = this.ctx
    const sx = ball.squash
    const sy = 2 - ball.squash
    ctx.save()
    ctx.translate(ball.x, ball.y)
    ctx.scale(sx, sy)

    const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ball.radius)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.5, '#f2f2f2')
    grad.addColorStop(1, '#c8c8c8')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(a) * ball.radius * 0.45
      const y = Math.sin(a) * ball.radius * 0.45
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = hexToRgba(p.color, alpha)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawConfetti(pieces: ConfettiPiece[]) {
    const ctx = this.ctx
    for (const c of pieces) {
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      ctx.globalAlpha = Math.min(1, c.life)
      ctx.fillStyle = c.color
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  private drawCountdown(countdown: number) {
    const ctx = this.ctx
    const value = countdown > 0 ? Math.ceil(countdown) : 0
    const text = value > 0 ? String(value) : 'GO!'
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
    ctx.fillStyle = '#fff'
    ctx.font = '900 128px "Lilita One", Impact, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 8
    ctx.strokeText(text, FIELD_WIDTH / 2, FIELD_HEIGHT / 2)
    ctx.fillText(text, FIELD_WIDTH / 2, FIELD_HEIGHT / 2)
  }
}

function hexToRgba(hex: string, alpha: number) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  const cleaned = hex.replace('#', '')
  const full =
    cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned
  const num = Number.parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function createPlaceholder(label: string): HTMLImageElement {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#445'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#fff'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('FACE', 64, 60)
  ctx.fillText(label.split('/').pop() ?? '', 64, 78)
  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}
