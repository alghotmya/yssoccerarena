/**
 * Widescreen snake.io-style renderer with camera follow + minimap.
 * Visual ideas adapted from bibhuticoder/snake.io (MIT).
 */
import { FACE_PATHS } from '../game/constants'
import type { Expression, PlayerId } from '../types'
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_PAD,
  WORLD_WIDTH,
} from './constants'
import type { SnakeEngine } from './engine'
import type { Worm } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class SnakeRenderer {
  private ctx: CanvasRenderingContext2D
  private faces: FaceMap = {
    1: { happy: null, amazed: null, angry: null, sad: null },
    2: { happy: null, amazed: null, angry: null, sad: null },
  }
  /** Which human the camera follows (online seat / local primary). */
  focusSeat: PlayerId = 1
  /** Local couch: draw split cameras. */
  splitScreen = false

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    canvas.width = VIEW_WIDTH
    canvas.height = VIEW_HEIGHT
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
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)

    if (this.splitScreen) {
      this.drawHalf(engine, 1, 0, 0, VIEW_WIDTH / 2, VIEW_HEIGHT)
      this.drawHalf(engine, 2, VIEW_WIDTH / 2, 0, VIEW_WIDTH / 2, VIEW_HEIGHT)
      ctx.strokeStyle = 'rgba(255,210,63,0.55)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(VIEW_WIDTH / 2, 0)
      ctx.lineTo(VIEW_WIDTH / 2, VIEW_HEIGHT)
      ctx.stroke()
    } else {
      this.drawHalf(engine, this.focusSeat, 0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    }

    this.drawLeaderboard(engine)
    this.drawMinimap(engine)

    if (engine.phase === 'countdown') {
      this.drawBanner(engine.countdown > 0 ? String(Math.ceil(engine.countdown)) : 'GO!')
    }
  }

  private drawHalf(
    engine: SnakeEngine,
    seat: PlayerId,
    ox: number,
    oy: number,
    w: number,
    h: number,
  ) {
    const ctx = this.ctx
    const focus = engine.worms.find((x) => x.seat === seat) ?? engine.p1
    const head = focus.segments[0] ?? { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
    const camX = clamp(head.x - w / 2, 0, Math.max(0, WORLD_WIDTH - w))
    const camY = clamp(head.y - h / 2, 0, Math.max(0, WORLD_HEIGHT - h))

    ctx.save()
    ctx.beginPath()
    ctx.rect(ox, oy, w, h)
    ctx.clip()

    this.drawWorldBackdrop(ox, oy, w, h, camX, camY)
    this.drawWorldBorder(ox, oy, camX, camY)

    for (const food of engine.foods) {
      if (!inView(food.x, food.y, camX, camY, w, h, 20)) continue
      this.drawFood(ox + food.x - camX, oy + food.y - camY, food.size, food.color)
    }

    // Draw bots first, humans on top
    const ordered = [...engine.worms].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'bot' ? -1 : 1
      return 0
    })
    for (const worm of ordered) {
      if (!worm.alive) continue
      const hx = worm.segments[0]?.x ?? 0
      const hy = worm.segments[0]?.y ?? 0
      if (!inView(hx, hy, camX, camY, w, h, 200)) continue
      this.drawWorm(worm, ox - camX, oy - camY)
    }

    // Name tag for focus
    if (focus.alive && focus.segments[0]) {
      const sx = ox + focus.segments[0].x - camX
      const sy = oy + focus.segments[0].y - camY - focus.size - 14
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.font = '700 13px system-ui, sans-serif'
      ctx.textAlign = 'center'
      const label = focus.name
      const tw = ctx.measureText(label).width
      ctx.fillRect(sx - tw / 2 - 6, sy - 11, tw + 12, 16)
      ctx.fillStyle = '#fff6d8'
      ctx.fillText(label, sx, sy)
    }

    ctx.restore()
  }

  private drawWorldBackdrop(
    ox: number,
    oy: number,
    w: number,
    h: number,
    camX: number,
    camY: number,
  ) {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(ox, oy, ox, oy + h)
    g.addColorStop(0, '#1a2332')
    g.addColorStop(1, '#0b1018')
    ctx.fillStyle = g
    ctx.fillRect(ox, oy, w, h)

    // Hex-ish dotted grid like original
    ctx.fillStyle = 'rgba(255,255,255,0.045)'
    const step = 48
    const startX = ox - ((camX % step) + step) % step
    const startY = oy - ((camY % step) + step) % step
    for (let x = startX; x < ox + w + step; x += step) {
      for (let y = startY; y < oy + h + step; y += step) {
        const col = Math.floor((x - startX) / step)
        const jx = col % 2 === 0 ? 0 : step * 0.5
        ctx.beginPath()
        ctx.arc(x + jx, y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  private drawWorldBorder(ox: number, oy: number, camX: number, camY: number) {
    const ctx = this.ctx
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.4)'
    ctx.lineWidth = 6
    ctx.strokeRect(
      ox + WORLD_PAD - camX,
      oy + WORLD_PAD - camY,
      WORLD_WIDTH - WORLD_PAD * 2,
      WORLD_HEIGHT - WORLD_PAD * 2,
    )
  }

  private drawFood(x: number, y: number, size: number, color: string) {
    const ctx = this.ctx
    ctx.globalAlpha = 0.55
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = shade(color, 0.45)
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawWorm(worm: Worm, ox: number, oy: number) {
    const ctx = this.ctx
    for (let i = worm.segments.length - 1; i >= 1; i--) {
      const s = worm.segments[i]!
      const radius = Math.max(3, worm.size * 0.8 - i * 0.015)
      const x = ox + s.x
      const y = oy + s.y
      const grd = ctx.createRadialGradient(x, y, 1, x + 3, y + 3, radius + 3)
      grd.addColorStop(0, worm.midColor)
      grd.addColorStop(1, worm.color)
      ctx.fillStyle = worm.color
      ctx.beginPath()
      ctx.arc(x, y, radius + 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    const head = worm.segments[0]!
    const x = ox + head.x
    const y = oy + head.y
    const size = worm.size

    ctx.fillStyle = worm.color
    ctx.beginPath()
    ctx.arc(x, y, size + 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = worm.kind === 'human' ? '#fff6d8' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = worm.kind === 'human' ? 3 : 1.5
    ctx.stroke()

    if (worm.boost) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, size + 6, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (worm.kind === 'human' && (worm.seat === 1 || worm.seat === 2)) {
      const face = this.faces[worm.seat][worm.expression]
      const faceR = size * 0.9
      if (face) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, faceR, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(face, x - faceR, y - faceR, faceR * 2, faceR * 2)
        ctx.restore()
        ctx.beginPath()
        ctx.arc(x, y, faceR, 0, Math.PI * 2)
        ctx.strokeStyle = '#fff6d8'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    } else {
      // Bot eyes (from upstream snake.io vibe)
      const d = size * 0.55
      const ex = x + Math.cos(worm.angle) * d
      const ey = y + Math.sin(worm.angle) * d
      ctx.fillStyle = 'whitesmoke'
      ctx.beginPath()
      ctx.arc(ex, ey, size * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.arc(ex + Math.cos(worm.angle) * 2, ey + Math.sin(worm.angle) * 2, size * 0.16, 0, Math.PI * 2)
      ctx.fill()
    }

    // Name for bots when near
    if (worm.kind === 'bot') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '600 11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(worm.name, x, y - size - 8)
    }
  }

  private drawLeaderboard(engine: SnakeEngine) {
    const ctx = this.ctx
    const rows = engine.buildLeaderboard(this.focusSeat)
    const panelW = 240
    const panelX = VIEW_WIDTH - panelW - 14
    const panelY = 12
    const rowH = 22
    const panelH = 36 + rows.length * rowH

    ctx.fillStyle = 'rgba(8, 12, 20, 0.72)'
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)'
    ctx.lineWidth = 2
    roundRect(ctx, panelX, panelY, panelW, panelH, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffd23f'
    ctx.font = "700 14px 'Lilita One', system-ui, sans-serif"
    ctx.textAlign = 'left'
    ctx.fillText('LEADERBOARD', panelX + 14, panelY + 22)

    rows.forEach((row, i) => {
      const y = panelY + 40 + i * rowH
      ctx.fillStyle = row.you ? 'rgba(255,210,63,0.18)' : 'transparent'
      if (row.you) {
        ctx.fillRect(panelX + 6, y - 14, panelW - 12, rowH - 2)
      }
      ctx.fillStyle = row.color
      ctx.beginPath()
      ctx.arc(panelX + 18, y - 4, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = row.alive ? '#f5f0e6' : 'rgba(255,255,255,0.35)'
      ctx.font = row.you ? '700 12px system-ui' : '600 12px system-ui'
      ctx.textAlign = 'left'
      const tag = row.kind === 'bot' ? '🤖 ' : ''
      const you = row.you ? ' · you' : ''
      ctx.fillText(`${i + 1}. ${tag}${row.name}${you}`, panelX + 30, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillText(`${row.length}`, panelX + panelW - 14, y)
    })
  }

  private drawMinimap(engine: SnakeEngine) {
    const ctx = this.ctx
    const mw = 160
    const mh = 90
    const mx = 14
    const my = VIEW_HEIGHT - mh - 14
    ctx.fillStyle = 'rgba(8, 12, 20, 0.7)'
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    roundRect(ctx, mx, my, mw, mh, 8)
    ctx.fill()
    ctx.stroke()

    const sx = mw / WORLD_WIDTH
    const sy = mh / WORLD_HEIGHT
    for (const worm of engine.worms) {
      if (!worm.alive || !worm.segments[0]) continue
      ctx.fillStyle = worm.kind === 'human' ? worm.color : 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.arc(mx + worm.segments[0].x * sx, my + worm.segments[0].y * sy, worm.kind === 'human' ? 3.5 : 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawBanner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, VIEW_HEIGHT / 2 - 56, VIEW_WIDTH, 112)
    ctx.font = "700 72px 'Lilita One', Impact, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#12081c'
    ctx.lineWidth = 8
    ctx.strokeText(text, VIEW_WIDTH / 2, VIEW_HEIGHT / 2)
    ctx.fillStyle = '#ffd23f'
    ctx.fillText(text, VIEW_WIDTH / 2, VIEW_HEIGHT / 2)
  }
}

function inView(x: number, y: number, camX: number, camY: number, w: number, h: number, pad: number) {
  return x >= camX - pad && x <= camX + w + pad && y >= camY - pad && y <= camY + h + pad
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
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
