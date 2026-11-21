/**
 * Face-Off Snake engine — TypeScript rewrite inspired by bibhuticoder/snake.io (MIT).
 * See ./NOTICE.md and ./LICENSE.
 */
import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BASE_SPEED,
  BOOST_DRAIN,
  BOOST_SPEED,
  FOOD_COLORS,
  FOOD_COUNT,
  HEAD_SIZE,
  KO_PAUSE,
  MAX_SIZE,
  MIN_SEGMENTS,
  OPEN_COUNTDOWN,
  P1_COLOR,
  P2_COLOR,
  RESPAWN_COUNTDOWN,
  SEGMENT_GAP,
  START_LENGTH,
  TURN_RATE,
  WORLD_PAD,
} from './constants'
import type { SnakeFood, SnakePhase, SnakeSettings, SnakeSnapshot, Worm } from './types'

const PHYSICS_DT = 1 / 120

export class SnakeEngine {
  p1: Worm
  p2: Worm
  foods: SnakeFood[] = []
  phase: SnakePhase = 'countdown'
  countdown = OPEN_COUNTDOWN
  winner: PlayerId | null = null
  lastHit: PlayerId | null = null

  private settings: SnakeSettings
  private input: InputManager
  private onSnapshot: (s: SnakeSnapshot) => void
  private onEat: () => void
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
  private boostAcc = { 1: 0, 2: 0 }
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: SnakeSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (s: SnakeSnapshot) => void
      onEat: () => void
      onHit: () => void
      onKo: () => void
      onWin: () => void
      onTick: (v: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onEat = hooks.onEat
    this.onHit = hooks.onHit
    this.onKo = hooks.onKo
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.p1 = makeWorm(1)
    this.p2 = makeWorm(2)
    this.foods = spawnFoods(FOOD_COUNT)
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
    this.p1 = makeWorm(1)
    this.p2 = makeWorm(2)
    this.foods = spawnFoods(FOOD_COUNT)
    this.winner = null
    this.lastHit = null
    this.phase = 'countdown'
    this.countdown = OPEN_COUNTDOWN
    this.lastCountdownInt = -1
    this.koTimer = 0
    this.boostAcc = { 1: 0, 2: 0 }
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
    this.checkFood(this.p1)
    this.checkFood(this.p2)
    this.checkKills()
  }

  private control(worm: Worm, seat: 1 | 2, dt: number) {
    if (!worm.alive) return
    worm.invuln = Math.max(0, worm.invuln - dt)

    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()
    if (move.x !== 0 || move.y !== 0) {
      const target = Math.atan2(move.y, move.x)
      worm.angle = turnToward(worm.angle, target, TURN_RATE * dt)
    }

    worm.boost = this.boostHeld(seat) && worm.segments.length > MIN_SEGMENTS
    const speed = worm.boost ? BOOST_SPEED : BASE_SPEED
    const head = worm.segments[0]!
    head.x += Math.cos(worm.angle) * speed * dt
    head.y += Math.sin(worm.angle) * speed * dt

    for (let i = 1; i < worm.segments.length; i++) {
      const prev = worm.segments[i - 1]!
      const seg = worm.segments[i]!
      const dx = prev.x - seg.x
      const dy = prev.y - seg.y
      const dist = Math.hypot(dx, dy) || 1
      const gap = SEGMENT_GAP * (worm.size / HEAD_SIZE)
      if (dist > gap) {
        const t = (dist - gap) / dist
        seg.x += dx * t
        seg.y += dy * t
      }
    }

    if (worm.boost) {
      this.boostAcc[seat] += BOOST_DRAIN * dt
      while (this.boostAcc[seat] >= 1 && worm.segments.length > MIN_SEGMENTS) {
        this.boostAcc[seat] -= 1
        const dropped = worm.segments.pop()!
        this.foods.push({
          x: dropped.x,
          y: dropped.y,
          size: rand(2, 5),
          color: FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!,
        })
        this.refreshSize(worm)
      }
    }

    if (
      head.x < WORLD_PAD ||
      head.y < WORLD_PAD ||
      head.x > ARENA_WIDTH - WORLD_PAD ||
      head.y > ARENA_HEIGHT - WORLD_PAD
    ) {
      this.kill(worm)
    }
  }

  private boostHeld(seat: 1 | 2) {
    if (this.input.localMode === 'both') {
      return seat === 1 ? this.input.isDown('Space') : this.input.isDown('Enter')
    }
    if (seat === this.input.localMode) return this.input.isDown('Space')
    return false
  }

  private checkFood(worm: Worm) {
    if (!worm.alive) return
    const head = worm.segments[0]!
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i]!
      if (Math.hypot(head.x - food.x, head.y - food.y) < worm.size + food.size) {
        this.foods.splice(i, 1)
        worm.segments.push({ x: -999, y: -999 })
        this.refreshSize(worm)
        this.onEat()
        this.foods.push(randomFood())
        this.emit()
      }
    }
  }

  private checkKills() {
    if (this.p1.alive && this.p1.invuln <= 0 && hitsBody(this.p1, this.p2)) {
      this.kill(this.p1)
      return
    }
    if (this.p2.alive && this.p2.invuln <= 0 && hitsBody(this.p2, this.p1)) {
      this.kill(this.p2)
    }
  }

  private kill(victim: Worm) {
    if (!victim.alive || this.phase !== 'battle') return
    victim.alive = false
    victim.expression = 'sad'
    for (let i = 0; i < victim.segments.length; i += 3) {
      const s = victim.segments[i]!
      this.foods.push({
        x: s.x,
        y: s.y,
        size: rand(3, 6),
        color: FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!,
      })
    }
    const killer = victim.id === 1 ? this.p2 : this.p1
    killer.expression = 'amazed'
    killer.score += 1
    this.lastHit = killer.id
    this.onHit()
    this.phase = 'ko'
    this.koTimer = KO_PAUSE
    if (killer.score >= this.settings.winningScore) this.winner = killer.id
    this.onKo()
    this.emit()
  }

  private refreshSize(worm: Worm) {
    const grown = Math.floor(worm.segments.length / 28)
    worm.size = Math.min(MAX_SIZE, HEAD_SIZE + grown)
  }

  private resetRound() {
    const s1 = this.p1.score
    const s2 = this.p2.score
    this.p1 = makeWorm(1)
    this.p2 = makeWorm(2)
    this.p1.score = s1
    this.p2.score = s2
    this.foods = spawnFoods(FOOD_COUNT)
    this.boostAcc = { 1: 0, 2: 0 }
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): SnakeSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.p1.score,
      score2: this.p2.score,
      length1: this.p1.segments.length,
      length2: this.p2.segments.length,
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
      foods: this.foods.map((f) => ({ ...f })),
      p1: serializeWorm(this.p1),
      p2: serializeWorm(this.p2),
    }
  }

  applyNetworkState(state: ReturnType<SnakeEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.winner = state.winner
    this.lastHit = state.lastHit
    this.koTimer = state.koTimer
    this.foods = state.foods.map((f) => ({ ...f }))
    Object.assign(this.p1, state.p1, { segments: state.p1.segments.map((s) => ({ ...s })) })
    Object.assign(this.p2, state.p2, { segments: state.p2.segments.map((s) => ({ ...s })) })
    this.emit()
  }
}

function serializeWorm(worm: Worm) {
  return {
    ...worm,
    segments: worm.segments.map((s) => ({ ...s })),
  }
}

function makeWorm(id: PlayerId): Worm {
  const p1 = id === 1
  const color = p1 ? P1_COLOR : P2_COLOR
  const x = p1 ? ARENA_WIDTH * 0.28 : ARENA_WIDTH * 0.72
  const y = ARENA_HEIGHT * 0.5
  const angle = p1 ? 0 : Math.PI
  const segments = []
  for (let i = 0; i < START_LENGTH; i++) {
    segments.push({
      x: x - Math.cos(angle) * SEGMENT_GAP * i,
      y: y - Math.sin(angle) * SEGMENT_GAP * i,
    })
  }
  const expression: Expression = 'happy'
  return {
    id,
    segments,
    angle,
    size: HEAD_SIZE,
    score: 0,
    expression,
    alive: true,
    boost: false,
    color,
    midColor: shade(color, 0.35),
    invuln: 0.75,
  }
}

function spawnFoods(n: number) {
  const list: SnakeFood[] = []
  for (let i = 0; i < n; i++) list.push(randomFood())
  return list
}

function randomFood(): SnakeFood {
  return {
    x: rand(WORLD_PAD + 20, ARENA_WIDTH - WORLD_PAD - 20),
    y: rand(WORLD_PAD + 20, ARENA_HEIGHT - WORLD_PAD - 20),
    size: rand(2.5, 5.5),
    color: FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!,
  }
}

function hitsBody(attacker: Worm, target: Worm) {
  if (!target.alive) return false
  const head = attacker.segments[0]!
  // Skip a few near-head segments so close passes / spawn don't false-positive.
  for (let i = 4; i < target.segments.length; i += 2) {
    const s = target.segments[i]!
    if (Math.hypot(head.x - s.x, head.y - s.y) < attacker.size + target.size * 0.85) {
      return true
    }
  }
  return false
}

function turnToward(current: number, target: number, maxDelta: number) {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  if (Math.abs(diff) <= maxDelta) return target
  return current + Math.sign(diff) * maxDelta
}

function shade(hex: string, lum: number) {
  const clean = hex.replace('#', '')
  let out = '#'
  for (let i = 0; i < 3; i++) {
    const c = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    const n = Math.round(Math.min(255, Math.max(0, c + c * lum)))
      .toString(16)
      .padStart(2, '0')
    out += n
  }
  return out
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}
