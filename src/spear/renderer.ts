import { FACE_PATHS } from '../game/constants'
import type { Expression, PlayerId } from '../types'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  GROUND_Y,
  P1_COLOR,
  P2_COLOR,
  TARGET_X,
  THROWER_X,
  THROWER_Y,
  ZONES,
  ZONE_POINTS,
} from './constants'
import type { SpearEngine } from './engine'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class SpearRenderer {
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
      entries.map(async ([id, expression, src]) => {
        this.faces[id][expression] = await load(src)
      }),
    )
  }

  draw(engine: SpearEngine) {
    this.drawArena()
    const target: PlayerId = engine.turn === 1 ? 2 : 1
    this.drawZones()
    this.drawTarget(target, engine.turn === 1 ? engine.expression2 : engine.expression1)
    this.drawThrower(engine.turn, engine.turn === 1 ? engine.expression1 : engine.expression2, engine.phase === 'flight')
    this.drawAim(engine)
    this.drawSpear(engine)
    if (engine.phase === 'result' && engine.zone) {
      const label = engine.zone === 'miss' ? 'MISS' : `${engine.zone.toUpperCase()} +${ZONE_POINTS[engine.zone]}`
      this.drawBanner(label, engine.zone !== 'miss')
    }
  }

  private drawArena() {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
    sky.addColorStop(0, '#12081f')
    sky.addColorStop(0.55, '#24124a')
    sky.addColorStop(1, '#1a1208')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffe14a' : '#7ad7ff'
      ctx.fillRect(70 + i * 150, 36, 42, 10)
    }
    ctx.fillStyle = '#243018'
    ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, ARENA_HEIGHT - GROUND_Y)
    ctx.fillStyle = '#3cbe58'
    ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, 18)
  }

  private drawThrower(id: PlayerId, expression: Expression, throwing: boolean) {
    const ctx = this.ctx
    const color = id === 1 ? P1_COLOR : P2_COLOR
    ctx.save()
    ctx.translate(THROWER_X, GROUND_Y)
    ctx.strokeStyle = color
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-10, -8)
    ctx.lineTo(-16, 0)
    ctx.moveTo(10, -8)
    ctx.lineTo(18, 0)
    ctx.moveTo(0, -78)
    ctx.lineTo(0, -12)
    ctx.moveTo(0, -62)
    ctx.lineTo(throwing ? 54 : 28, throwing ? -96 : -40)
    ctx.moveTo(0, -62)
    ctx.lineTo(-22, -36)
    ctx.stroke()
    this.drawHead(id, expression, 0, -108, color)
    ctx.restore()
  }

  private drawZones() {
    const ctx = this.ctx
    const fills = {
      body: 'rgba(255, 210, 63, 0.35)',
      arm: 'rgba(255, 61, 110, 0.32)',
      leg: 'rgba(61, 255, 243, 0.32)',
    }
    for (const zone of ZONES) {
      ctx.fillStyle = fills[zone.id]
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 3
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h)
      ctx.fillStyle = '#fff6d8'
      ctx.font = '700 18px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h / 2)
    }
  }

  private drawTarget(id: PlayerId, expression: Expression) {
    const ctx = this.ctx
    const color = id === 1 ? P1_COLOR : P2_COLOR
    const body = ZONES[0]
    ctx.strokeStyle = color
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(TARGET_X, body.y + body.h)
    ctx.lineTo(TARGET_X - 16, GROUND_Y)
    ctx.moveTo(TARGET_X, body.y + body.h)
    ctx.lineTo(TARGET_X + 16, GROUND_Y)
    ctx.moveTo(TARGET_X, body.y)
    ctx.lineTo(TARGET_X, body.y + body.h)
    ctx.moveTo(TARGET_X, body.y + 40)
    ctx.lineTo(TARGET_X - 120, body.y + 70)
    ctx.moveTo(TARGET_X, body.y + 40)
    ctx.lineTo(TARGET_X + 120, body.y + 70)
    ctx.stroke()
    this.drawHead(id, expression, TARGET_X, body.y - 36, color)
  }

  private drawHead(id: PlayerId, expression: Expression, x: number, y: number, color: string) {
    const ctx = this.ctx
    const r = 28
    const face = this.faces[id][expression]
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r - 2, 0, Math.PI * 2)
    ctx.clip()
    if (face) ctx.drawImage(face, x - r + 2, y - r + 2, (r - 2) * 2, (r - 2) * 2)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.stroke()
  }

  private drawAim(engine: SpearEngine) {
    if (engine.phase !== 'aim') return
    const ctx = this.ctx
    ctx.strokeStyle = '#ffe14a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(engine.aimX, engine.aimY, 18, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(engine.aimX - 28, engine.aimY)
    ctx.lineTo(engine.aimX + 28, engine.aimY)
    ctx.moveTo(engine.aimX, engine.aimY - 28)
    ctx.lineTo(engine.aimX, engine.aimY + 28)
    ctx.stroke()
  }

  private drawSpear(engine: SpearEngine) {
    if (engine.phase === 'aim') return
    const ctx = this.ctx
    const { x, y, t } = engine.spearPosition()
    const angle = Math.atan2(engine.lockedY - THROWER_Y, engine.lockedX - THROWER_X) - (1 - t) * 0.6
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.strokeStyle = '#f6e7c1'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(-46, 0)
    ctx.lineTo(18, 0)
    ctx.stroke()
    ctx.fillStyle = '#d9dde6'
    ctx.beginPath()
    ctx.moveTo(18, 0)
    ctx.lineTo(0, -7)
    ctx.lineTo(0, 7)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  private drawBanner(text: string, hit: boolean) {
    const ctx = this.ctx
    ctx.font = '900 92px "Lilita One", Impact, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 14
    ctx.strokeStyle = '#14081f'
    ctx.strokeText(text, ARENA_WIDTH / 2, 120)
    ctx.fillStyle = hit ? '#ffe14a' : '#ff7a9a'
    ctx.fillText(text, ARENA_WIDTH / 2, 120)
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
