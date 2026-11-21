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
    const t = performance.now() / 1000
    const flicker = 0.75 + Math.sin(t * 28 + p.id * 3) * 0.25
    const mega = p.mega > 0

    // Twin afterburners
    for (const oy of [-7, 7]) {
      const flame = ctx.createRadialGradient(p.x - 28, p.y + oy, 1, p.x - 28, p.y + oy, 22 * flicker)
      flame.addColorStop(0, mega ? '#fff8c8' : '#fff4a8')
      flame.addColorStop(0.35, p.accent)
      flame.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = flame
      ctx.beginPath()
      ctx.ellipse(p.x - 30, p.y + oy, 18 * flicker, 5.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(p.x - 2, p.y + 22, 26, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // Main wings (swept)
    const wingGrad = ctx.createLinearGradient(p.x - 20, p.y, p.x + 10, p.y)
    wingGrad.addColorStop(0, shade(p.color, -25))
    wingGrad.addColorStop(1, p.accent)
    ctx.fillStyle = wingGrad
    ctx.beginPath()
    ctx.moveTo(p.x + 2, p.y - 2)
    ctx.lineTo(p.x - 10, p.y - 34)
    ctx.lineTo(p.x - 28, p.y - 30)
    ctx.lineTo(p.x - 8, p.y - 6)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(p.x + 2, p.y + 2)
    ctx.lineTo(p.x - 10, p.y + 34)
    ctx.lineTo(p.x - 28, p.y + 30)
    ctx.lineTo(p.x - 8, p.y + 6)
    ctx.closePath()
    ctx.fill()

    // Wing tips / hardpoints
    ctx.fillStyle = '#ffd23f'
    ctx.fillRect(p.x - 26, p.y - 32, 8, 3)
    ctx.fillRect(p.x - 26, p.y + 29, 8, 3)
    if (p.power >= 3) {
      ctx.fillStyle = p.homing ? '#00e5ff' : '#fff6d8'
      ctx.beginPath()
      ctx.arc(p.x - 14, p.y - 22, 3, 0, Math.PI * 2)
      ctx.arc(p.x - 14, p.y + 22, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Fuselage body
    const body = ctx.createLinearGradient(p.x - 24, p.y, p.x + 32, p.y)
    body.addColorStop(0, shade(p.color, -40))
    body.addColorStop(0.45, p.color)
    body.addColorStop(1, shade(p.color, 30))
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(p.x + 34, p.y)
    ctx.quadraticCurveTo(p.x + 18, p.y - 12, p.x - 4, p.y - 14)
    ctx.lineTo(p.x - 26, p.y - 7)
    ctx.lineTo(p.x - 26, p.y + 7)
    ctx.lineTo(p.x - 4, p.y + 14)
    ctx.quadraticCurveTo(p.x + 18, p.y + 12, p.x + 34, p.y)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,246,216,0.85)'
    ctx.lineWidth = 1.6
    ctx.stroke()

    // Intake / nose glow
    ctx.fillStyle = mega ? '#ff6b35' : '#ffd23f'
    ctx.beginPath()
    ctx.moveTo(p.x + 34, p.y)
    ctx.lineTo(p.x + 22, p.y - 5)
    ctx.lineTo(p.x + 22, p.y + 5)
    ctx.closePath()
    ctx.fill()

    // Vertical stabilizer
    ctx.fillStyle = shade(p.color, -15)
    ctx.beginPath()
    ctx.moveTo(p.x - 10, p.y - 2)
    ctx.lineTo(p.x - 22, p.y - 20)
    ctx.lineTo(p.x - 16, p.y - 2)
    ctx.closePath()
    ctx.fill()

    // Canopy glass ring + face
    const face = this.faces[p.id][p.expression]
    const r = 11
    const cx = p.x + 6
    ctx.fillStyle = 'rgba(180,230,255,0.35)'
    ctx.beginPath()
    ctx.ellipse(cx, p.y, r + 2, r - 1, 0, 0, Math.PI * 2)
    ctx.fill()
    if (face) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, p.y, r, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(face, cx - r, p.y - r, r * 2, r * 2)
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(cx, p.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Panel line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(p.x - 18, p.y)
    ctx.lineTo(p.x + 18, p.y)
    ctx.stroke()

    if (p.shield > 0) {
      const pulse = 0.45 + Math.sin(t * 8) * 0.25
      ctx.strokeStyle = `rgba(123,180,255,${pulse})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(p.x, p.y, 36, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = `rgba(200,230,255,${pulse * 0.5})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, 40, 0, Math.PI * 2)
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
    const pulse = 12 + Math.sin(performance.now() / 140 + x) * 2
    ctx.fillStyle = info?.color ?? '#fff'
    ctx.shadowColor = info?.color ?? '#fff'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(x, y, pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#12081c'
    ctx.font = '800 13px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(kind, x, y + 1)
  }

  private dot(x: number, y: number, r: number, color: string) {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
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

function shade(hex: string, amount: number) {
  const n = hex.replace('#', '')
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount))
  const b = Math.max(0, Math.min(255, (num & 255) + amount))
  return `rgb(${r},${g},${b})`
}
