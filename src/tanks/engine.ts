import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BULLET_LIFE,
  BULLET_RADIUS,
  BULLET_SPEED,
  FIRE_COOLDOWN,
  HIT_DAMAGE,
  KO_PAUSE,
  MAX_HEALTH,
  OPEN_COUNTDOWN,
  P1_COLOR,
  P2_COLOR,
  RESPAWN_COUNTDOWN,
  TANK_RADIUS,
  TANK_SPEED,
  TANK_TURN,
  WALLS,
} from './constants'
import type { Bullet, Tank, TankParticle, TanksPhase, TanksSettings, TanksSnapshot } from './types'

const PHYSICS_DT = 1 / 120

export class TanksEngine {
  p1: Tank
  p2: Tank
  bullets: Bullet[] = []
  particles: TankParticle[] = []
  phase: TanksPhase = 'countdown'
  countdown = OPEN_COUNTDOWN
  winner: PlayerId | null = null
  lastHit: PlayerId | null = null

  private settings: TanksSettings
  private input: InputManager
  private onSnapshot: (snapshot: TanksSnapshot) => void
  private onFire: () => void
  private onHit: () => void
  private onWall: () => void
  private onKo: () => void
  private onWin: () => void
  private onTick: (value: number) => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private koTimer = 0
  private lastCountdownInt = -1
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: TanksSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (snapshot: TanksSnapshot) => void
      onFire: () => void
      onHit: () => void
      onWall: () => void
      onKo: () => void
      onWin: () => void
      onTick: (value: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onFire = hooks.onFire
    this.onHit = hooks.onHit
    this.onWall = hooks.onWall
    this.onKo = hooks.onKo
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.p1 = makeTank(1)
    this.p2 = makeTank(2)
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
    this.p1 = makeTank(1)
    this.p2 = makeTank(2)
    this.bullets = []
    this.particles = []
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
    this.updateParticles(dt)

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
    this.integrateBullets(dt)
    this.resolveHits()
  }

  private control(tank: Tank, seat: 1 | 2, dt: number) {
    tank.cooldown = Math.max(0, tank.cooldown - dt)
    tank.flash = Math.max(0, tank.flash - dt)
    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()

    if (move.x !== 0 || move.y !== 0) {
      const target = Math.atan2(move.y, move.x)
      let diff = target - tank.angle
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const maxTurn = TANK_TURN * dt
      tank.angle += Math.max(-maxTurn, Math.min(maxTurn, diff))
      const nx = tank.x + Math.cos(tank.angle) * TANK_SPEED * dt
      const ny = tank.y + Math.sin(tank.angle) * TANK_SPEED * dt
      if (!circleHitsWall(nx, tank.y, TANK_RADIUS)) tank.x = nx
      if (!circleHitsWall(tank.x, ny, TANK_RADIUS)) tank.y = ny
      tank.x = clamp(tank.x, TANK_RADIUS + 28, ARENA_WIDTH - TANK_RADIUS - 28)
      tank.y = clamp(tank.y, TANK_RADIUS + 28, ARENA_HEIGHT - TANK_RADIUS - 28)
    }

    if (this.input.seatActionA(seat) && tank.cooldown <= 0) {
      this.fire(tank)
    }
  }

  private fire(tank: Tank) {
    tank.cooldown = FIRE_COOLDOWN
    const muzzle = TANK_RADIUS + 10
    this.bullets.push({
      x: tank.x + Math.cos(tank.angle) * muzzle,
      y: tank.y + Math.sin(tank.angle) * muzzle,
      vx: Math.cos(tank.angle) * BULLET_SPEED,
      vy: Math.sin(tank.angle) * BULLET_SPEED,
      life: BULLET_LIFE,
      owner: tank.id,
      color: tank.color,
    })
    this.onFire()
  }

  private integrateBullets(dt: number) {
    for (const b of this.bullets) {
      b.life -= dt
      const nx = b.x + b.vx * dt
      const ny = b.y + b.vy * dt
      if (circleHitsWall(nx, b.y, BULLET_RADIUS)) {
        b.vx *= -1
        this.onWall()
        this.spark(b.x, b.y, '#ffd23f')
      } else {
        b.x = nx
      }
      if (circleHitsWall(b.x, ny, BULLET_RADIUS)) {
        b.vy *= -1
        this.onWall()
        this.spark(b.x, b.y, '#ffd23f')
      } else {
        b.y = ny
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0)
  }

  private resolveHits() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!
      const target = b.owner === 1 ? this.p2 : this.p1
      const dx = target.x - b.x
      const dy = target.y - b.y
      if (dx * dx + dy * dy > (TANK_RADIUS + BULLET_RADIUS) ** 2) continue
      this.bullets.splice(i, 1)
      target.health = Math.max(0, target.health - HIT_DAMAGE)
      target.flash = 0.22
      target.expression = target.health <= 30 ? 'sad' : 'angry'
      const attacker = b.owner === 1 ? this.p1 : this.p2
      attacker.expression = 'happy'
      this.lastHit = b.owner
      this.spark(target.x, target.y, target.color)
      this.onHit()
      if (target.health <= 0) {
        this.scoreKo(attacker, target)
        return
      }
      this.emit()
    }
  }

  private scoreKo(attacker: Tank, defender: Tank) {
    attacker.score += 1
    attacker.expression = 'amazed'
    defender.expression = 'sad'
    this.bullets = []
    this.koTimer = KO_PAUSE
    this.phase = 'ko'
    if (attacker.score >= this.settings.winningScore) this.winner = attacker.id
    this.onKo()
    this.emit()
  }

  private resetRound() {
    const s1 = this.p1.score
    const s2 = this.p2.score
    this.p1 = makeTank(1)
    this.p2 = makeTank(2)
    this.p1.score = s1
    this.p2.score = s2
    this.bullets = []
  }

  private spark(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 80 + Math.random() * 180
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.25,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): TanksSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.p1.score,
      score2: this.p2.score,
      health1: this.p1.health,
      health2: this.p2.health,
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
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      bullets: this.bullets.map((b) => ({ ...b })),
    }
  }

  applyNetworkState(state: ReturnType<TanksEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.winner = state.winner
    this.lastHit = state.lastHit
    this.koTimer = state.koTimer
    Object.assign(this.p1, state.p1)
    Object.assign(this.p2, state.p2)
    this.bullets = state.bullets.map((b) => ({ ...b }))
    this.emit()
  }
}

function makeTank(id: PlayerId): Tank {
  const expression: Expression = 'happy'
  return {
    id,
    x: id === 1 ? 180 : ARENA_WIDTH - 180,
    y: ARENA_HEIGHT / 2,
    angle: id === 1 ? 0 : Math.PI,
    health: MAX_HEALTH,
    score: 0,
    expression,
    cooldown: 0,
    flash: 0,
    color: id === 1 ? P1_COLOR : P2_COLOR,
  }
}

function circleHitsWall(x: number, y: number, r: number) {
  for (const w of WALLS) {
    const nearestX = clamp(x, w.x, w.x + w.w)
    const nearestY = clamp(y, w.y, w.y + w.h)
    const dx = x - nearestX
    const dy = y - nearestY
    if (dx * dx + dy * dy < r * r) return true
  }
  return false
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
