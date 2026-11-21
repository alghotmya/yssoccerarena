/**
 * Procedural jet / sky renderer with player-face cockpits.
 * Inspired by Space-Jam's procedural art (MIT).
 */
import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import { ARENA_HEIGHT, ARENA_WIDTH, POWER } from './constants'
import type { JetsEngine } from './engine'
import type { LevelFx } from './levels'
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
    for (const m of engine.missiles) this.missile(m.x, m.y, m.r)
    for (const b of engine.pbul) this.playerShot(b.x, b.y, b.r, b.dmg)
    for (const p of engine.pilots) {
      if (p.alive) this.drawPilot(p)
    }
    for (const p of engine.parts) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (engine.phase === 'intro' || engine.phase === 'bossWarn') {
      this.banner(engine.toast || engine.lvl.name)
    }
    if (engine.phase === 'cleared') {
      const rank = engine.rank !== '—' ? ` · RANK ${engine.rank}` : ''
      this.banner(`SECTOR CLEAR${rank}`)
    }
    ctx.restore()
  }

  private drawBackground(engine: JetsEngine) {
    const ctx = this.ctx
    const t = engine.lvl.theme
    const fx = t.fx
    const time = performance.now() / 1000
    const scroll = engine.scrollX ?? 0

    const g = ctx.createLinearGradient(0, 0, ARENA_WIDTH * 0.2, ARENA_HEIGHT)
    g.addColorStop(0, t.a)
    g.addColorStop(0.55, mixHex(t.a, t.b, 0.45))
    g.addColorStop(1, t.b)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    // Distant planet / body
    const px = ARENA_WIDTH * 0.78 - (scroll * 0.02) % 40
    const py = ARENA_HEIGHT * 0.28
    const planet = ctx.createRadialGradient(px - 20, py - 20, 10, px, py, 110)
    planet.addColorStop(0, withAlpha(t.nebula, 0.55))
    planet.addColorStop(0.6, withAlpha(t.nebula, 0.18))
    planet.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = planet
    ctx.beginPath()
    ctx.arc(px, py, 110, 0, Math.PI * 2)
    ctx.fill()

    // Nebula clouds
    ctx.fillStyle = t.nebula
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.ellipse(ARENA_WIDTH * 0.65, ARENA_HEIGHT * 0.4, 280, 130, 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.1
    ctx.beginPath()
    ctx.ellipse(ARENA_WIDTH * 0.3, ARENA_HEIGHT * 0.7, 220, 90, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    this.drawFx(fx, t.star, t.nebula, scroll, time)

    ctx.fillStyle = t.star
    for (const s of engine.stars) {
      ctx.globalAlpha = 0.45 + s.size * 0.22
      if (s.size > 2) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(s.x, s.y, s.size, s.size)
      }
    }
    ctx.globalAlpha = 1

    // Horizon vignette
    const vig = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
    vig.addColorStop(0, 'rgba(0,0,0,0.25)')
    vig.addColorStop(0.35, 'rgba(0,0,0,0)')
    vig.addColorStop(0.85, 'rgba(0,0,0,0)')
    vig.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  }

  private drawFx(fx: LevelFx, star: string, nebula: string, scroll: number, time: number) {
    const ctx = this.ctx
    if (fx === 'stars') return

    if (fx === 'debris' || fx === 'chrome') {
      ctx.fillStyle = withAlpha(star, 0.35)
      for (let i = 0; i < 18; i++) {
        const x = ((i * 97 + scroll * (0.4 + (i % 3) * 0.2)) % (ARENA_WIDTH + 40)) - 20
        const y = (i * 73) % ARENA_HEIGHT
        const s = 3 + (i % 5)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate((i + time) * 0.2)
        ctx.fillRect(-s, -s / 2, s * 2, s)
        ctx.restore()
      }
    }

    if (fx === 'aurora' || fx === 'biolume' || fx === 'plasma') {
      for (let i = 0; i < 4; i++) {
        const wave = ctx.createLinearGradient(0, 0, ARENA_WIDTH, 0)
        wave.addColorStop(0, 'rgba(0,0,0,0)')
        wave.addColorStop(0.5, withAlpha(nebula, 0.2))
        wave.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = wave
        const y = 80 + i * 140 + Math.sin(time * 0.7 + i) * 18
        ctx.fillRect(0, y, ARENA_WIDTH, 40)
      }
    }

    if (fx === 'grid' || fx === 'digital') {
      ctx.strokeStyle = withAlpha(nebula, 0.22)
      ctx.lineWidth = 1
      const off = scroll * 0.5
      for (let x = -((off % 48) as number); x < ARENA_WIDTH; x += 48) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, ARENA_HEIGHT)
        ctx.stroke()
      }
      for (let y = 0; y < ARENA_HEIGHT; y += 48) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(ARENA_WIDTH, y)
        ctx.stroke()
      }
    }

    if (fx === 'rings') {
      ctx.strokeStyle = withAlpha(star, 0.25)
      ctx.lineWidth = 3
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(
          ARENA_WIDTH * 0.7,
          ARENA_HEIGHT * 0.35,
          160 + i * 40,
          40 + i * 10,
          0.4,
          0,
          Math.PI * 2,
        )
        ctx.stroke()
      }
    }

    if (fx === 'rain' || fx === 'digital') {
      ctx.strokeStyle = withAlpha(nebula, fx === 'digital' ? 0.35 : 0.28)
      ctx.lineWidth = 1.5
      for (let i = 0; i < 40; i++) {
        const x = ((i * 53 + scroll * 2) % ARENA_WIDTH)
        const y = ((i * 91 + time * 180) % ARENA_HEIGHT)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4, y + 16)
        ctx.stroke()
      }
    }

    if (fx === 'embers') {
      for (let i = 0; i < 24; i++) {
        const x = ((i * 67 + scroll * 1.2) % ARENA_WIDTH)
        const y = ARENA_HEIGHT - ((i * 41 + time * 40) % ARENA_HEIGHT)
        ctx.fillStyle = withAlpha(i % 2 ? '#ff6a30' : '#ffd07a', 0.45)
        ctx.beginPath()
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (fx === 'ice') {
      ctx.strokeStyle = withAlpha(star, 0.2)
      ctx.lineWidth = 1
      for (let i = 0; i < 12; i++) {
        const x = ((i * 110 + scroll * 0.3) % ARENA_WIDTH)
        const y = 40 + (i * 55) % (ARENA_HEIGHT - 80)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + 18, y + 8)
        ctx.lineTo(x + 8, y + 22)
        ctx.closePath()
        ctx.stroke()
      }
    }

    if (fx === 'lightning') {
      if (Math.sin(time * 9) > 0.92) {
        ctx.strokeStyle = withAlpha(star, 0.7)
        ctx.lineWidth = 2
        let x = ARENA_WIDTH * (0.4 + Math.sin(time) * 0.2)
        let y = 0
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let i = 0; i < 6; i++) {
          x += (Math.random() - 0.5) * 60
          y += ARENA_HEIGHT / 6
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    if (fx === 'warp') {
      ctx.strokeStyle = withAlpha(nebula, 0.3)
      ctx.lineWidth = 1.5
      for (let i = 0; i < 16; i++) {
        const y = (i / 16) * ARENA_HEIGHT
        const bulge = Math.sin(time * 2 + i * 0.4) * 30
        ctx.beginPath()
        ctx.moveTo(ARENA_WIDTH * 0.35, y)
        ctx.quadraticCurveTo(ARENA_WIDTH * 0.7 + bulge, y + 10, ARENA_WIDTH, y)
        ctx.stroke()
      }
    }
  }

  private drawPilot(p: JetPilot) {
    const ctx = this.ctx
    if (p.iframe > 0 && Math.floor(p.iframe * 12) % 2 === 0) return
    const t = performance.now() / 1000
    const flicker = 0.75 + Math.sin(t * 28 + p.id * 3) * 0.25
    const mega = p.mega > 0

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

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(p.x - 2, p.y + 22, 26, 6, 0, 0, Math.PI * 2)
    ctx.fill()

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

    ctx.fillStyle = mega ? '#ff6b35' : '#ffd23f'
    ctx.beginPath()
    ctx.moveTo(p.x + 34, p.y)
    ctx.lineTo(p.x + 22, p.y - 5)
    ctx.lineTo(p.x + 22, p.y + 5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = shade(p.color, -15)
    ctx.beginPath()
    ctx.moveTo(p.x - 10, p.y - 2)
    ctx.lineTo(p.x - 22, p.y - 20)
    ctx.lineTo(p.x - 16, p.y - 2)
    ctx.closePath()
    ctx.fill()

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
    if (e.flash > 0) ctx.globalAlpha = 0.55
    const x = e.x
    const y = e.y
    const w = e.w
    const h = e.h

    // Engine glow
    ctx.fillStyle = withAlpha(e.color, 0.35)
    ctx.beginPath()
    ctx.ellipse(x + w * 0.35, y, 10, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    if (e.type === 'turret') {
      ctx.fillStyle = shade(e.color, -20)
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 8)
      ctx.fill()
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.arc(x - 4, y, h * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#12081c'
      ctx.fillRect(x - w / 2 - 8, y - 3, 14, 6)
    } else if (e.type === 'gunship') {
      ctx.fillStyle = shade(e.color, -15)
      ctx.beginPath()
      ctx.moveTo(x - w / 2, y)
      ctx.lineTo(x + w / 2, y - h / 2)
      ctx.lineTo(x + w / 3, y)
      ctx.lineTo(x + w / 2, y + h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = shade(e.color, 25)
      ctx.fillRect(x - 6, y - h / 2 - 4, 10, 4)
      ctx.fillRect(x - 6, y + h / 2, 10, 4)
    } else if (e.type === 'kamikaze') {
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.moveTo(x - w / 2, y)
      ctx.lineTo(x + w / 2, y - h / 3)
      ctx.lineTo(x + w / 4, y)
      ctx.lineTo(x + w / 2, y + h / 3)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffd24a'
      ctx.beginPath()
      ctx.arc(x - w / 4, y, 4, 0, Math.PI * 2)
      ctx.fill()
    } else if (e.type === 'weaver') {
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.ellipse(x, y, w / 2, h / 2.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = withAlpha('#fff', 0.4)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y - h / 2)
      ctx.lineTo(x + 8, y)
      ctx.lineTo(x, y + h / 2)
      ctx.stroke()
    } else {
      // scout / diver
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.moveTo(x - w / 2, y)
      ctx.lineTo(x + w / 2, y - h / 2)
      ctx.lineTo(x + w / 3, y)
      ctx.lineTo(x + w / 2, y + h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = withAlpha('#fff', 0.35)
      ctx.lineWidth = 1
      ctx.stroke()
    }

    if (e.hp < e.maxHp) {
      const pct = Math.max(0, e.hp / e.maxHp)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(x - 14, y - h / 2 - 8, 28, 3)
      ctx.fillStyle = '#ff5e6c'
      ctx.fillRect(x - 14, y - h / 2 - 8, 28 * pct, 3)
    }
    ctx.restore()
  }

  private drawBoss(b: JetBoss) {
    const ctx = this.ctx
    const t = performance.now() / 1000
    ctx.save()
    if (b.flash > 0) ctx.globalAlpha = 0.55

    // Aura
    const aura = ctx.createRadialGradient(b.x, b.y, 20, b.x, b.y, b.w)
    aura.addColorStop(0, withAlpha(b.color, 0.35))
    aura.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.w * 0.75, 0, Math.PI * 2)
    ctx.fill()

    // Hull
    const hull = ctx.createLinearGradient(b.x - b.w / 2, b.y, b.x + b.w / 2, b.y)
    hull.addColorStop(0, shade(b.color, -40))
    hull.addColorStop(0.5, b.color)
    hull.addColorStop(1, shade(b.color, 20))
    ctx.fillStyle = hull
    ctx.beginPath()
    ctx.moveTo(b.x + b.w / 2, b.y)
    ctx.lineTo(b.x + b.w / 6, b.y - b.h / 2)
    ctx.lineTo(b.x - b.w / 2, b.y - b.h / 3)
    ctx.lineTo(b.x - b.w / 2, b.y + b.h / 3)
    ctx.lineTo(b.x + b.w / 6, b.y + b.h / 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Wings
    ctx.fillStyle = shade(b.color, -20)
    ctx.beginPath()
    ctx.moveTo(b.x, b.y - 10)
    ctx.lineTo(b.x - 30, b.y - b.h * 0.7)
    ctx.lineTo(b.x + 20, b.y - 20)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(b.x, b.y + 10)
    ctx.lineTo(b.x - 30, b.y + b.h * 0.7)
    ctx.lineTo(b.x + 20, b.y + 20)
    ctx.closePath()
    ctx.fill()

    // Eye
    const pulse = 8 + Math.sin(t * 6) * 2
    ctx.fillStyle = '#12081c'
    ctx.beginPath()
    ctx.arc(b.x - 18, b.y, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = b.color
    ctx.beginPath()
    ctx.arc(b.x - 18, b.y, pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(b.x - 14, b.y - 4, 3, 0, Math.PI * 2)
    ctx.fill()

    // Name plate
    ctx.font = "700 14px 'Lilita One', Impact, sans-serif"
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff6d8'
    ctx.fillText(b.name, b.x, b.y - b.h / 2 - 12)
    ctx.restore()

    const pct = Math.max(0, b.hp / b.maxHp)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(ARENA_WIDTH / 2 - 180, 18, 360, 16)
    const bar = ctx.createLinearGradient(ARENA_WIDTH / 2 - 180, 0, ARENA_WIDTH / 2 + 180, 0)
    bar.addColorStop(0, shade(b.color, -30))
    bar.addColorStop(1, b.color)
    ctx.fillStyle = bar
    ctx.fillRect(ARENA_WIDTH / 2 - 180, 18, 360 * pct, 16)
    ctx.strokeStyle = '#fff6d8'
    ctx.strokeRect(ARENA_WIDTH / 2 - 180, 18, 360, 16)
  }

  private drawPower(x: number, y: number, kind: string) {
    const ctx = this.ctx
    const info = POWER[kind]
    const pulse = 12 + Math.sin(performance.now() / 140 + x) * 2
    ctx.fillStyle = info?.color ?? '#fff'
    ctx.shadowColor = info?.color ?? '#fff'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(x, y, pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#12081c'
    ctx.font = '800 13px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(kind, x, y + 1)
  }

  private playerShot(x: number, y: number, r: number, dmg: number) {
    const ctx = this.ctx
    const color = dmg > 1 ? '#ff9f43' : '#ffd23f'
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.ellipse(x, y, r + 2, r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  private missile(x: number, y: number, r: number) {
    const ctx = this.ctx
    ctx.fillStyle = '#00e5ff'
    ctx.shadowColor = '#00e5ff'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(x + r + 4, y)
    ctx.lineTo(x - r, y - r)
    ctx.lineTo(x - r, y + r)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
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
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, ARENA_HEIGHT / 2 - 54, ARENA_WIDTH, 108)
    ctx.font = "700 40px 'Lilita One', Impact, sans-serif"
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

function withAlpha(color: string, a: number) {
  if (color.startsWith('#')) {
    const n = color.slice(1)
    const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
    const num = parseInt(full, 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    return `rgba(${r},${g},${b},${a})`
  }
  return color
}

function mixHex(a: string, b: string, t: number) {
  const parse = (hex: string) => {
    const n = hex.replace('#', '')
    const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
    const num = parseInt(full, 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
  }
  const A = parse(a)
  const B = parse(b)
  const r = Math.round(A.r + (B.r - A.r) * t)
  const g = Math.round(A.g + (B.g - A.g) * t)
  const bl = Math.round(A.b + (B.b - A.b) * t)
  return `rgb(${r},${g},${bl})`
}
