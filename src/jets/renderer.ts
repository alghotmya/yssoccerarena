/**
 * Procedural jet / sky renderer with player-face cockpits.
 * Inspired by Space-Jam's procedural art (MIT).
 */
import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import { ARENA_HEIGHT, ARENA_WIDTH, POWER } from './constants'
import type { JetsEngine } from './engine'
import type { JetBoss, JetEnemy, JetPilot } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class JetsRenderer {
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

  draw(engine: JetsEngine) {
    const ctx = this.ctx
    const sx = engine.shake > 0 ? (Math.random() - 0.5) * 10 * engine.shake : 0
    const sy = engine.shake > 0 ? (Math.random() - 0.5) * 8 * engine.shake : 0
    ctx.save()
    ctx.translate(sx, sy)
    this.drawBackground(engine)
    for (const u of engine.powerups) this.drawPower(u.x, u.y, u.kind)
    for (const e of engine.enemies) this.drawEnemy(e)
    if (engine.boss) this.drawBoss(engine.boss)
    for (const b of engine.ebul) this.dot(b.x, b.y, b.r, '#ff6b7a')
    for (const m of engine.missiles) this.dot(m.x, m.y, m.r + 1, '#00e5ff')
    for (const b of engine.pbul) this.dot(b.x, b.y, b.r, '#ffd23f')
    for (const p of engine.pilots) {
      if (p.alive) this.drawPilot(p)
    }
    for (const p of engine.parts) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, 3, 3)
      ctx.globalAlpha = 1
    }
    if (engine.phase === 'intro' || engine.phase === 'bossWarn') {
      this.banner(engine.toast || engine.lvl.name)
    }
    if (engine.phase === 'cleared') this.banner('SECTOR CLEAR')
    ctx.restore()
  }

  private drawBackground(engine: JetsEngine) {
    const ctx = this.ctx
    const t = engine.lvl.theme
    const g = ctx.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    g.addColorStop(0, t.a)
    g.addColorStop(1, t.b)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    ctx.fillStyle = t.nebula
    ctx.globalAlpha = 0.18
    ctx.beginPath()
    ctx.ellipse(ARENA_WIDTH * 0.7, ARENA_HEIGHT * 0.35, 260, 120, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.fillStyle = t.star
    for (const s of engine.stars) {
      ctx.globalAlpha = 0.5 + s.size * 0.2
      ctx.fillRect(s.x, s.y, s.size, s.size)
    }
    ctx.globalAlpha = 1
  }

  private drawPilot(p: JetPilot) {
    const ctx = this.ctx
    if (p.iframe > 0 && Math.floor(p.iframe * 12) % 2 === 0) return

    // Engine glow
    ctx.fillStyle = 'rgba(255,180,60,0.45)'
    ctx.beginPath()
    ctx.ellipse(p.x - 22, p.y, 14, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    // Fuselage
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.moveTo(p.x + 28, p.y)
    ctx.lineTo(p.x - 8, p.y - 16)
    ctx.lineTo(p.x - 22, p.y - 6)
    ctx.lineTo(p.x - 22, p.y + 6)
    ctx.lineTo(p.x - 8, p.y + 16)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 2
    ctx.stroke()

    // Wings
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.moveTo(p.x - 2, p.y)
    ctx.lineTo(p.x - 18, p.y - 28)
    ctx.lineTo(p.x + 6, p.y - 4)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(p.x - 2, p.y)
    ctx.lineTo(p.x - 18, p.y + 28)
    ctx.lineTo(p.x + 6, p.y + 4)
    ctx.closePath()
    ctx.fill()

    // Cockpit face
    const face = this.faces[p.id][p.expression]
    const r = 12
    if (face) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x + 4, p.y, r, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(face, p.x + 4 - r, p.y - r, r * 2, r * 2)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(p.x + 4, p.y, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff6d8'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(123,140,255,0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(p.x, p.y, 34, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  private drawEnemy(e: JetEnemy) {
    const ctx = this.ctx
    ctx.save()
    if (e.flash > 0) ctx.globalAlpha = 0.5
    ctx.fillStyle = e.color
    ctx.beginPath()
    ctx.moveTo(e.x - e.w / 2, e.y)
    ctx.lineTo(e.x + e.w / 2, e.y - e.h / 2)
    ctx.lineTo(e.x + e.w / 3, e.y)
    ctx.lineTo(e.x + e.w / 2, e.y + e.h / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  private drawBoss(b: JetBoss) {
    const ctx = this.ctx
    ctx.save()
    if (b.flash > 0) ctx.globalAlpha = 0.55
    ctx.fillStyle = b.color
    ctx.beginPath()
    ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 18)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()
    // Core eye
    ctx.fillStyle = '#12081c'
    ctx.beginPath()
    ctx.arc(b.x - 20, b.y, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff2e97'
    ctx.beginPath()
    ctx.arc(b.x - 20, b.y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // HP bar
    const pct = Math.max(0, b.hp / b.maxHp)
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(ARENA_WIDTH / 2 - 160, 24, 320, 14)
    ctx.fillStyle = b.color
    ctx.fillRect(ARENA_WIDTH / 2 - 160, 24, 320 * pct, 14)
    ctx.strokeStyle = '#fff6d8'
    ctx.strokeRect(ARENA_WIDTH / 2 - 160, 24, 320, 14)
  }

  private drawPower(x: number, y: number, kind: string) {
    const ctx = this.ctx
    const info = POWER[kind]
    ctx.fillStyle = info?.color ?? '#fff'
    ctx.beginPath()
    ctx.arc(x, y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#12081c'
    ctx.font = '700 14px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(kind, x, y + 1)
  }

  private dot(x: number, y: number, r: number, color: string) {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  private banner(text: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, ARENA_HEIGHT / 2 - 50, ARENA_WIDTH, 100)
    ctx.font = "700 42px 'Lilita One', Impact, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#12081c'
    ctx.lineWidth = 6
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
