import { InputManager } from '../game/input'
import type { PlayerId } from '../types'
import {
  BALL_DRAG,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BLOCK_SPEED,
  COURT_BOTTOM,
  COURT_HEIGHT,
  COURT_LEFT,
  COURT_WIDTH,
  COURT_RIGHT,
  COURT_TOP,
  HIT_SPEED,
  NET_X,
  OPEN_COUNTDOWN,
  P1_COLOR,
  P2_COLOR,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  POINT_PAUSE,
  SERVE_COUNTDOWN,
  SWING_COOLDOWN,
  SWING_REACH,
  SWING_TIME,
} from './constants'
import type { TennisBall, TennisPhase, TennisPlayer, TennisSettings, TennisSnapshot } from './types'

const PHYSICS_DT = 1 / 120

export class TennisEngine {
  p1: TennisPlayer
  p2: TennisPlayer
  ball: TennisBall
  phase: TennisPhase = 'countdown'
  countdown = OPEN_COUNTDOWN
  server: PlayerId = 1
  winner: PlayerId | null = null
  pointFor: PlayerId | null = null

  private settings: TennisSettings
  private input: InputManager
  private onSnapshot: (snapshot: TennisSnapshot) => void
  private onHit: () => void
  private onBounce: () => void
  private onPoint: () => void
  private onWin: () => void
  private onTick: (value: number) => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private pointTimer = 0
  private lastCountdownInt = -1
  private hitLock = 0
  private lastHitter: PlayerId | null = null
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: TennisSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (snapshot: TennisSnapshot) => void
      onHit: () => void
      onBounce: () => void
      onPoint: () => void
      onWin: () => void
      onTick: (value: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onHit = hooks.onHit
    this.onBounce = hooks.onBounce
    this.onPoint = hooks.onPoint
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.p1 = makePlayer(1)
    this.p2 = makePlayer(2)
    this.ball = heldBall(this.serverPlayer())
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
    this.winner = null
    this.pointFor = null
    this.server = 1
    this.p1 = makePlayer(1)
    this.p2 = makePlayer(2)
    this.ball = heldBall(this.p1)
    this.phase = 'countdown'
    this.countdown = OPEN_COUNTDOWN
    this.lastCountdownInt = -1
    this.pointTimer = 0
    this.hitLock = 0
    this.lastHitter = null
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
      this.placeHeldBall()
      this.countdown -= dt
      const next = Math.ceil(this.countdown)
      if (next !== this.lastCountdownInt && next >= 0) {
        this.lastCountdownInt = next
        this.onTick(next)
        this.emit()
      }
      if (this.countdown <= 0) {
        this.phase = 'rally'
        this.emit()
      }
      return
    }

    if (this.phase === 'point') {
      this.pointTimer -= dt
      if (this.pointTimer <= 0) {
        if (this.winner) {
          this.phase = 'gameover'
          this.onWin()
          this.emit()
        } else {
          this.server = this.server === 1 ? 2 : 1
          this.resetRally()
          this.phase = 'countdown'
          this.countdown = SERVE_COUNTDOWN
          this.lastCountdownInt = -1
          this.emit()
        }
      }
      return
    }

    if (this.phase !== 'rally') return

    this.hitLock = Math.max(0, this.hitLock - dt)
    const move1 = this.input.getPlayer1Move()
    const move2 = this.input.getPlayer2Move()
    this.move(this.p1, move1, dt)
    this.move(this.p2, move2, dt)
    this.trySwing(this.p1, this.input.seatActionA(1), move1.y)
    this.trySwing(this.p2, this.input.seatActionA(2), move2.y)

    if (this.ball.held) {
      this.placeHeldBall()
      return
    }

    this.integrateBall(dt)
    this.bounceWalls()
    this.block(this.p1)
    this.block(this.p2)
    this.checkPoint()
    if (this.phase !== 'rally') return
    this.updateExpressions()
  }

  private move(player: TennisPlayer, move: { x: number; y: number }, dt: number) {
    player.cooldown = Math.max(0, player.cooldown - dt)
    if (player.swing > 0) player.swing = Math.max(0, player.swing - dt)
    const minX = player.id === 1 ? COURT_LEFT + 28 : NET_X + 36
    const maxX = player.id === 1 ? NET_X - 36 : COURT_RIGHT - 28
    player.x = clamp(player.x + move.x * PLAYER_SPEED * dt, minX, maxX)
    player.y = clamp(player.y + move.y * PLAYER_SPEED * dt, COURT_TOP + 24, COURT_BOTTOM - 24)
    player.facing = player.id === 1 ? 1 : -1
    if (move.x !== 0 || move.y !== 0) player.walk += dt * 10
  }

  private trySwing(player: TennisPlayer, pressed: boolean, aimY: number) {
    if (!pressed || player.cooldown > 0) return
    player.swing = SWING_TIME
    player.cooldown = SWING_COOLDOWN
    if (this.ball.held) {
      if (player.id !== this.server) return
      this.launch(player, aimY, HIT_SPEED * 0.86)
      return
    }
    if (this.hitLock > 0 && this.lastHitter === player.id) return
    const dx = this.ball.x - player.x
    const dy = this.ball.y - player.y
    if (dx * dx + dy * dy > SWING_REACH * SWING_REACH) return
    const coming =
      player.id === 1 ? this.ball.vx <= 40 : this.ball.vx >= -40
    if (!coming && Math.abs(dx) > PLAYER_RADIUS) return
    const pace = Math.min(180, Math.hypot(this.ball.vx, this.ball.vy) * 0.18)
    this.launch(player, aimY + dy / SWING_REACH, HIT_SPEED + pace)
  }

  private launch(player: TennisPlayer, aimY: number, speed: number) {
    const dir = player.id === 1 ? 1 : -1
    const vy = clamp(aimY, -1.15, 1.15) * 520
    let vx = dir * speed
    const mag = Math.hypot(vx, vy)
    if (mag > BALL_MAX_SPEED) {
      vx = (vx / mag) * BALL_MAX_SPEED
      this.ball.vy = (vy / mag) * BALL_MAX_SPEED
    } else {
      this.ball.vy = vy
    }
    this.ball.vx = vx
    this.ball.held = false
    const push = PLAYER_RADIUS + BALL_RADIUS + 6
    this.ball.x = player.x + dir * push
    this.ball.y = clamp(player.y + aimY * 18, COURT_TOP + BALL_RADIUS, COURT_BOTTOM - BALL_RADIUS)
    this.lastHitter = player.id
    this.hitLock = 0.16
    player.expression = 'happy'
    this.onHit()
    this.emit()
  }

  private integrateBall(dt: number) {
    const drag = Math.exp(-BALL_DRAG * dt)
    this.ball.vx *= drag
    this.ball.vy *= drag
    this.ball.x += this.ball.vx * dt
    this.ball.y += this.ball.vy * dt
  }

  private bounceWalls() {
    let bounced = false
    if (this.ball.y - BALL_RADIUS <= COURT_TOP && this.ball.vy < 0) {
      this.ball.y = COURT_TOP + BALL_RADIUS
      this.ball.vy = Math.abs(this.ball.vy)
      bounced = true
    } else if (this.ball.y + BALL_RADIUS >= COURT_BOTTOM && this.ball.vy > 0) {
      this.ball.y = COURT_BOTTOM - BALL_RADIUS
      this.ball.vy = -Math.abs(this.ball.vy)
      bounced = true
    }
    if (bounced) this.onBounce()
  }

  private block(player: TennisPlayer) {
    if (this.hitLock > 0 && this.lastHitter === player.id) return
    const dx = this.ball.x - player.x
    const dy = this.ball.y - player.y
    const dist = Math.hypot(dx, dy)
    const min = PLAYER_RADIUS + BALL_RADIUS
    if (dist >= min || dist === 0) return
    const nx = dx / dist
    const ny = dy / dist
    this.ball.x = player.x + nx * (min + 1)
    this.ball.y = player.y + ny * (min + 1)
    const dir = player.id === 1 ? 1 : -1
    this.ball.vx = dir * BLOCK_SPEED
    this.ball.vy = clamp(ny * 380, -420, 420)
    this.lastHitter = player.id
    this.hitLock = 0.12
    player.expression = 'amazed'
    this.onHit()
  }

  private checkPoint() {
    if (this.ball.x + BALL_RADIUS < COURT_LEFT) this.scorePoint(2)
    else if (this.ball.x - BALL_RADIUS > COURT_RIGHT) this.scorePoint(1)
  }

  private scorePoint(winner: PlayerId) {
    const scorer = winner === 1 ? this.p1 : this.p2
    const other = winner === 1 ? this.p2 : this.p1
    scorer.score += 1
    scorer.expression = 'happy'
    other.expression = 'sad'
    this.pointFor = winner
    this.phase = 'point'
    this.pointTimer = POINT_PAUSE
    this.ball.vx = 0
    this.ball.vy = 0
    if (scorer.score >= this.settings.winningScore) this.winner = winner
    this.onPoint()
    this.emit()
  }

  private updateExpressions() {
    const threat = (player: TennisPlayer) => {
      const closing = player.id === 1 ? this.ball.vx < -200 : this.ball.vx > 200
      return closing && Math.abs(this.ball.x - player.x) < 180
    }
    if (this.p1.swing <= 0) this.p1.expression = threat(this.p1) ? 'amazed' : 'happy'
    if (this.p2.swing <= 0) this.p2.expression = threat(this.p2) ? 'amazed' : 'happy'
  }

  private resetRally() {
    this.p1.x = 240
    this.p1.y = COURT_HEIGHT / 2
    this.p2.x = COURT_WIDTH - 240
    this.p2.y = COURT_HEIGHT / 2
    this.p1.expression = 'happy'
    this.p2.expression = 'happy'
    this.p1.swing = 0
    this.p2.swing = 0
    this.ball = heldBall(this.serverPlayer())
    this.hitLock = 0
    this.lastHitter = null
    this.pointFor = null
  }

  private placeHeldBall() {
    const server = this.serverPlayer()
    this.ball.held = true
    this.ball.vx = 0
    this.ball.vy = 0
    this.ball.x = server.x + server.facing * 42
    this.ball.y = server.y
  }

  private serverPlayer() {
    return this.server === 1 ? this.p1 : this.p2
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): TennisSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.p1.score,
      score2: this.p2.score,
      expression1: this.p1.expression,
      expression2: this.p2.expression,
      server: this.server,
      winner: this.winner,
      pointFor: this.pointFor,
    }
  }

  exportNetworkState() {
    return {
      phase: this.phase,
      countdown: this.countdown,
      server: this.server,
      winner: this.winner,
      pointFor: this.pointFor,
      pointTimer: this.pointTimer,
      hitLock: this.hitLock,
      lastHitter: this.lastHitter,
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      ball: { ...this.ball },
    }
  }

  applyNetworkState(state: ReturnType<TennisEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.server = state.server
    this.winner = state.winner
    this.pointFor = state.pointFor
    this.pointTimer = state.pointTimer
    this.hitLock = state.hitLock
    this.lastHitter = state.lastHitter
    Object.assign(this.p1, state.p1)
    Object.assign(this.p2, state.p2)
    Object.assign(this.ball, state.ball)
    this.emit()
  }
}

function makePlayer(id: PlayerId): TennisPlayer {
  return {
    id,
    x: id === 1 ? 240 : COURT_WIDTH - 240,
    y: COURT_HEIGHT / 2,
    facing: id === 1 ? 1 : -1,
    score: 0,
    expression: 'happy',
    swing: 0,
    cooldown: 0,
    walk: 0,
    color: id === 1 ? P1_COLOR : P2_COLOR,
  }
}

function heldBall(server: TennisPlayer): TennisBall {
  return {
    x: server.x + server.facing * 42,
    y: server.y,
    vx: 0,
    vy: 0,
    held: true,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
