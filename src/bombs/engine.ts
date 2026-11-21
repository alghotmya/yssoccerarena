import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  BLAST_RANGE,
  BLAST_TIME,
  BOMB_COOLDOWN,
  BOMB_FUSE,
  COLS,
  GRID_H,
  GRID_W,
  KO_PAUSE,
  MAX_BOMBS,
  OPEN_COUNTDOWN,
  ORIGIN_X,
  ORIGIN_Y,
  P1_COLOR,
  P2_COLOR,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  RESPAWN_COUNTDOWN,
  ROWS,
  TILE,
} from './constants'
import type {
  Blast,
  Bomb,
  Bomber,
  BombsPhase,
  BombsSettings,
  BombsSnapshot,
  TileKind,
} from './types'

const PHYSICS_DT = 1 / 120

export class BombsEngine {
  grid: TileKind[][] = []
  p1: Bomber
  p2: Bomber
  bombs: Bomb[] = []
  blasts: Blast[] = []
  phase: BombsPhase = 'countdown'
  countdown = OPEN_COUNTDOWN
  winner: PlayerId | null = null
  lastHit: PlayerId | null = null

  private settings: BombsSettings
  private input: InputManager
  private onSnapshot: (s: BombsSnapshot) => void
  private onPlace: () => void
  private onBoom: () => void
  private onHit: () => void
  private onKo: () => void
  private onWin: () => void
  private onTick: (v: number) => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private koTimer = 0
  private lastCountdownInt = -1
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: BombsSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (s: BombsSnapshot) => void
      onPlace: () => void
      onBoom: () => void
      onHit: () => void
      onKo: () => void
      onWin: () => void
      onTick: (v: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onPlace = hooks.onPlace
    this.onBoom = hooks.onBoom
    this.onHit = hooks.onHit
    this.onKo = hooks.onKo
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.grid = buildGrid()
    this.p1 = makeBomber(1)
    this.p2 = makeBomber(2)
  }

  start() {
    if (this.running) return
    this.running = true
    this.input.start()
    this.lastTime = performance.now()
    this.emit()
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.input.stop()
  }

  rematch() {
    this.grid = buildGrid()
    this.p1 = makeBomber(1)
    this.p2 = makeBomber(2)
    this.bombs = []
    this.blasts = []
    this.winner = null
    this.lastHit = null
    this.phase = 'countdown'
    this.countdown = OPEN_COUNTDOWN
    this.lastCountdownInt = -1
    this.koTimer = 0
    this.emit()
  }

  private frame = (now: number) => {
    if (!this.running) return
    const elapsed = Math.min(0.05, (now - this.lastTime) / 1000)
    this.lastTime = now
    if (this.networkRole !== 'guest') {
      this.accumulator += elapsed
      while (this.accumulator >= PHYSICS_DT) {
        this.step(PHYSICS_DT)
        this.accumulator -= PHYSICS_DT
      }
      this.input.endFrame()
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private step(dt: number) {
    for (const b of this.blasts) b.life -= dt
    this.blasts = this.blasts.filter((b) => b.life > 0)

    if (this.phase === 'countdown') {
      this.countdown -= dt
      const next = Math.ceil(this.countdown)
      if (next !== this.lastCountdownInt && next >= 0) {
        this.lastCountdownInt = next
        this.onTick(next)
        this.emit()
      }
      if (this.countdown <= 0) {
        this.phase = 'battle'
        this.emit()
      }
      return
    }

    if (this.phase === 'ko') {
      this.koTimer -= dt
      if (this.koTimer <= 0) {
        if (this.winner) {
          this.phase = 'gameover'
          this.onWin()
          this.emit()
        } else {
          this.resetRound()
          this.phase = 'countdown'
          this.countdown = RESPAWN_COUNTDOWN
          this.lastCountdownInt = -1
          this.emit()
        }
      }
      return
    }

    if (this.phase !== 'battle') return

    this.control(this.p1, 1, dt)
    this.control(this.p2, 2, dt)
    this.tickBombs(dt)
    this.checkBlastHits()
  }

  private control(player: Bomber, seat: 1 | 2, dt: number) {
    if (!player.alive) return
    player.cooldown = Math.max(0, player.cooldown - dt)
    player.flash = Math.max(0, player.flash - dt)
    player.invuln = Math.max(0, player.invuln - dt)

    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()
    if (move.x !== 0 || move.y !== 0) {
      const nx = player.x + move.x * PLAYER_SPEED * dt
      const ny = player.y + move.y * PLAYER_SPEED * dt
      if (this.canOccupy(nx, player.y, player)) player.x = nx
      if (this.canOccupy(player.x, ny, player)) player.y = ny
      player.x = clamp(player.x, ORIGIN_X + PLAYER_RADIUS, ORIGIN_X + GRID_W - PLAYER_RADIUS)
      player.y = clamp(player.y, ORIGIN_Y + PLAYER_RADIUS, ORIGIN_Y + GRID_H - PLAYER_RADIUS)
    }

    if (this.input.seatActionA(seat) && player.cooldown <= 0) {
      this.tryPlace(player)
    }
  }

  private tryPlace(player: Bomber) {
    const owned = this.bombs.filter((b) => b.owner === player.id).length
    if (owned >= MAX_BOMBS) return
    const { col, row } = worldToTile(player.x, player.y)
    if (!inBounds(col, row)) return
    if (this.grid[row]![col] !== 'empty') return
    if (this.bombs.some((b) => b.col === col && b.row === row)) return
    this.bombs.push({ col, row, fuse: BOMB_FUSE, owner: player.id })
    player.cooldown = BOMB_COOLDOWN
    this.onPlace()
  }

  private tickBombs(dt: number) {
    for (const b of this.bombs) b.fuse -= dt
    const queue: Bomb[] = this.bombs.filter((b) => b.fuse <= 0)
    if (queue.length === 0) return
    this.bombs = this.bombs.filter((b) => b.fuse > 0)
    while (queue.length > 0) {
      const bomb = queue.shift()!
      this.detonate(bomb, queue)
    }
    this.onBoom()
  }

  private detonate(bomb: Bomb, queue: Bomb[]) {
    const cells = [[bomb.col, bomb.row]] as Array<[number, number]>
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= BLAST_RANGE; i++) {
        const c = bomb.col + dx * i
        const r = bomb.row + dy * i
        if (!inBounds(c, r)) break
        const kind = this.grid[r]![c]!
        if (kind === 'hard') break
        cells.push([c, r])
        if (kind === 'soft') {
          this.grid[r]![c] = 'empty'
          break
        }
        const chained = this.bombs.findIndex((b) => b.col === c && b.row === r)
        if (chained >= 0) {
          queue.push(this.bombs.splice(chained, 1)[0]!)
        }
      }
    }
    for (const [c, r] of cells) {
      if (!this.blasts.some((b) => b.col === c && b.row === r)) {
        this.blasts.push({ col: c, row: r, life: BLAST_TIME })
      }
    }
  }

  private checkBlastHits() {
    if (this.blasts.length === 0) return
    for (const player of [this.p1, this.p2]) {
      if (!player.alive || player.invuln > 0) continue
      const { col, row } = worldToTile(player.x, player.y)
      if (!this.blasts.some((b) => b.col === col && b.row === row)) continue
      player.alive = false
      player.flash = 0.3
      player.expression = 'sad'
      const other = player.id === 1 ? this.p2 : this.p1
      other.expression = 'amazed'
      other.score += 1
      this.lastHit = other.id
      this.onHit()
      this.phase = 'ko'
      this.koTimer = KO_PAUSE
      this.bombs = []
      if (other.score >= this.settings.winningScore) this.winner = other.id
      this.onKo()
      this.emit()
      return
    }
  }

  private canOccupy(x: number, y: number, self: Bomber) {
    const samples = [
      [x - PLAYER_RADIUS * 0.7, y - PLAYER_RADIUS * 0.7],
      [x + PLAYER_RADIUS * 0.7, y - PLAYER_RADIUS * 0.7],
      [x - PLAYER_RADIUS * 0.7, y + PLAYER_RADIUS * 0.7],
      [x + PLAYER_RADIUS * 0.7, y + PLAYER_RADIUS * 0.7],
    ]
    for (const [sx, sy] of samples) {
      const { col, row } = worldToTile(sx!, sy!)
      if (!inBounds(col, row)) return false
      const kind = this.grid[row]![col]!
      if (kind === 'hard' || kind === 'soft') return false
    }
    const { col, row } = worldToTile(x, y)
    const bomb = this.bombs.find((b) => b.col === col && b.row === row)
    if (bomb) {
      const { col: sc, row: sr } = worldToTile(self.x, self.y)
      if (sc !== col || sr !== row) return false
    }
    return true
  }

  private resetRound() {
    const s1 = this.p1.score
    const s2 = this.p2.score
    this.grid = buildGrid()
    this.p1 = makeBomber(1)
    this.p2 = makeBomber(2)
    this.p1.score = s1
    this.p2.score = s2
    this.bombs = []
    this.blasts = []
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): BombsSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.p1.score,
      score2: this.p2.score,
      expression1: this.p1.expression,
      expression2: this.p2.expression,
      winner: this.winner,
      lastHit: this.lastHit,
    }
  }

  exportNetworkState() {
    return {
      phase: this.phase,
      countdown: this.countdown,
      winner: this.winner,
      lastHit: this.lastHit,
      koTimer: this.koTimer,
      grid: this.grid.map((row) => [...row]),
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      bombs: this.bombs.map((b) => ({ ...b })),
      blasts: this.blasts.map((b) => ({ ...b })),
    }
  }

  applyNetworkState(state: ReturnType<BombsEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.winner = state.winner
    this.lastHit = state.lastHit
    this.koTimer = state.koTimer
    this.grid = state.grid.map((row) => [...row])
    Object.assign(this.p1, state.p1)
    Object.assign(this.p2, state.p2)
    this.bombs = state.bombs.map((b) => ({ ...b }))
    this.blasts = state.blasts.map((b) => ({ ...b }))
    this.emit()
  }
}

function buildGrid(): TileKind[][] {
  const grid: TileKind[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: TileKind[] = []
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) row.push('hard')
      else if (r % 2 === 0 && c % 2 === 0) row.push('hard')
      else if (isSpawnClear(c, r)) row.push('empty')
      else row.push(Math.random() < 0.72 ? 'soft' : 'empty')
    }
    grid.push(row)
  }
  return grid
}

function isSpawnClear(c: number, r: number) {
  const nearP1 = c <= 2 && r <= 2
  const nearP2 = c >= COLS - 3 && r >= ROWS - 3
  return nearP1 || nearP2
}

function makeBomber(id: PlayerId): Bomber {
  const expression: Expression = 'happy'
  const p1 = id === 1
  return {
    id,
    x: ORIGIN_X + (p1 ? 1.5 : COLS - 1.5) * TILE,
    y: ORIGIN_Y + (p1 ? 1.5 : ROWS - 1.5) * TILE,
    score: 0,
    expression,
    cooldown: 0,
    alive: true,
    flash: 0,
    color: p1 ? P1_COLOR : P2_COLOR,
    invuln: 0.6,
  }
}

function worldToTile(x: number, y: number) {
  return {
    col: Math.floor((x - ORIGIN_X) / TILE),
    row: Math.floor((y - ORIGIN_Y) / TILE),
  }
}

function inBounds(col: number, row: number) {
  return col >= 0 && row >= 0 && col < COLS && row < ROWS
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
