import { FACE_PATHS } from '../game/constants'
import type { Expression } from '../types'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  COLS,
  ORIGIN_X,
  ORIGIN_Y,
  PLAYER_RADIUS,
  ROWS,
  TILE,
} from './constants'
import type { BombsEngine } from './engine'
import type { Bomber } from './types'

type FaceMap = Record<1 | 2, Record<Expression, HTMLImageElement | null>>

export class BombsRenderer {
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

  draw(engine: BombsEngine) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    this.drawBackdrop()
    this.drawGrid(engine)
    for (const blast of engine.blasts) this.drawBlast(blast.col, blast.row, blast.life)
    for (const bomb of engine.bombs) this.drawBomb(bomb.col, bomb.row, bomb.fuse)
    if (engine.p1.alive) this.drawPlayer(engine.p1)
    if (engine.p2.alive) this.drawPlayer(engine.p2)
    if (engine.phase === 'countdown') {
      this.drawBanner(engine.countdown > 0 ? String(Math.ceil(engine.countdown)) : 'BOMB!')
    }
    if (engine.phase === 'ko') this.drawBanner('BLAST!')
  }

  private drawBackdrop() {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
    g.addColorStop(0, '#1c1030')
    g.addColorStop(1, '#2a1840')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  }

  private drawGrid(engine: BombsEngine) {
    const ctx = this.ctx
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = ORIGIN_X + c * TILE
        const y = ORIGIN_Y + r * TILE
        const kind = engine.grid[r]![c]!
        if (kind === 'hard') {
          ctx.fillStyle = '#3a2a55'
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4)
          ctx.strokeStyle = '#ffd23f'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8)
        } else if (kind === 'soft') {
          ctx.fillStyle = '#8a4a2a'
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6)
          ctx.fillStyle = '#c46a3a'
          ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16)
        } else {
          ctx.fillStyle = (c + r) % 2 === 0 ? 'rgba(255,210,63,0.06)' : 'rgba(61,255,243,0.05)'
          ctx.fillRect(x, y, TILE, TILE)
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,210,63,0.35)'
    ctx.lineWidth = 3
    ctx.strokeRect(ORIGIN_X, ORIGIN_Y, COLS * TILE, ROWS * TILE)
  }

  private drawBomb(col: number, row: number, fuse: number) {
    const ctx = this.ctx
    const x = ORIGIN_X + col * TILE + TILE / 2
    const y = ORIGIN_Y + row * TILE + TILE / 2
    const pulse = 1 + Math.sin(fuse * 14) * 0.08
    ctx.fillStyle = '#12081c'
    ctx.beginPath()
    ctx.arc(x, y, 14 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = '#ff3d6e'
    ctx.beginPath()
    ctx.moveTo(x + 8, y - 10)
    ctx.quadraticCurveTo(x + 16, y - 22, x + 10, y - 28)
    ctx.stroke()
  }

  private drawBlast(col: number, row: number, life: number) {
    const ctx = this.ctx
    const x = ORIGIN_X + col * TILE + 4
    const y = ORIGIN_Y + row * TILE + 4
    ctx.globalAlpha = Math.min(1, life * 2.2)
    ctx.fillStyle = '#ffb703'
    ctx.fillRect(x, y, TILE - 8, TILE - 8)
    ctx.fillStyle = '#ff3d6e'
    ctx.fillRect(x + 8, y + 8, TILE - 24, TILE - 24)
    ctx.globalAlpha = 1
  }

  private drawPlayer(player: Bomber) {
    const ctx = this.ctx
    if (player.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(player.x, player.y, PLAYER_RADIUS + 8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = player.color
    ctx.beginPath()
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff6d8'
    ctx.lineWidth = 3
    ctx.stroke()

    const face = this.faces[player.id][player.expression]
    if (face) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(player.x, player.y, 14, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(face, player.x - 14, player.y - 14, 28, 28)
      ctx.restore()
    }
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
  ctx.fillStyle = '#555'
  ctx.fillRect(0, 0, 64, 64)
  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}
