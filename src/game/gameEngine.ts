import {
  BALL_DRAG,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  COUNTDOWN_DURATION,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL_CELEBRATION_DURATION,
  ROUND_RESTART_COUNTDOWN,
  KICK_COOLDOWN,
  KICK_RANGE,
  KICK_STRENGTH,
  PHYSICS_DT,
  PLAYER1_COLOR,
  PLAYER2_COLOR,
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  TOUCH_STRENGTH,
} from './constants'
import {
  clampPlayer,
  distance,
  getGoalMouth,
  resolveBallPlayer,
  resolveBallWalls,
  resolvePlayerPlayer,
} from './collision'
import { InputManager } from './input'
import {
  expressionsForGoal,
  expressionsForKickoff,
  expressionsForMatchEnd,
  expressionsForNearMiss,
  expressionsForSave,
  type ExpressionEvent,
} from './expressions'
import type {
  BallState,
  ConfettiPiece,
  EngineCallbacks,
  Expression,
  GamePhase,
  GameSnapshot,
  MatchSettings,
  Particle,
  PlayerId,
  PlayerState,
} from '../types'

export class GameEngine {
  ball: BallState
  player1: PlayerState
  player2: PlayerState
  particles: Particle[] = []
  confetti: ConfettiPiece[] = []

  phase: GamePhase = 'countdown'
  countdown = COUNTDOWN_DURATION
  score1 = 0
  score2 = 0
  lastScorer: PlayerId | null = null
  spectacular = false
  goalCelebrationTimer = 0
  winner: PlayerId | null = null
  nearMissFlash = 0
  expression1: Expression = 'happy'
  expression2: Expression = 'happy'

  private settings: MatchSettings
  private input: InputManager
  private callbacks: EngineCallbacks
  private accumulator = 0
  private raf = 0
  private lastTime = 0
  private running = false
  private expressionFollowUp: ExpressionEvent['followUp'] | null = null
  private expressionFollowTimer = 0
  private expressionHoldTimer = 0
  private nearMissCooldown = 0
  private saveCooldown = 0
  private wallSfxCooldown = 0
  private lastCountdownInt = -1
  private goalLocked = false
  /** Host runs physics; guest only applies networked state. */
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(settings: MatchSettings, input: InputManager, callbacks: EngineCallbacks) {
    this.settings = settings
    this.input = input
    this.callbacks = callbacks
    this.ball = createBall()
    this.player1 = createPlayer(1, FIELD_WIDTH * 0.22, FIELD_HEIGHT / 2, PLAYER1_COLOR)
    this.player2 = createPlayer(2, FIELD_WIDTH * 0.78, FIELD_HEIGHT / 2, PLAYER2_COLOR)
    this.applyExpressions(expressionsForKickoff())
  }

  start() {
    if (this.running) return
    this.running = true
    this.input.start()
    this.lastTime = performance.now()
    this.phase = 'countdown'
    this.countdown = COUNTDOWN_DURATION
    this.lastCountdownInt = -1
    this.resetRound(false)
    this.emitSnapshot()
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.input.stop()
  }

  rematch() {
    this.score1 = 0
    this.score2 = 0
    this.winner = null
    this.phase = 'countdown'
    this.countdown = COUNTDOWN_DURATION
    this.lastCountdownInt = -1
    this.goalLocked = false
    this.confetti = []
    this.applyExpressions(expressionsForKickoff())
    this.resetRound(false)
    this.emitSnapshot()
  }

  private frame = (now: number) => {
    if (!this.running) return
    const elapsed = Math.min(0.05, (now - this.lastTime) / 1000)
    this.lastTime = now

    if (this.networkRole === 'guest') {
      this.updateVisuals(elapsed)
      this.raf = requestAnimationFrame(this.frame)
      return
    }

    this.accumulator += elapsed
    while (this.accumulator >= PHYSICS_DT) {
      this.fixedUpdate(PHYSICS_DT)
      this.accumulator -= PHYSICS_DT
    }

    this.updateVisuals(elapsed)
    this.input.endFrame()
    this.raf = requestAnimationFrame(this.frame)
  }

  private fixedUpdate(dt: number) {
    this.updateExpressionTimers(dt)
    this.nearMissCooldown = Math.max(0, this.nearMissCooldown - dt)
    this.saveCooldown = Math.max(0, this.saveCooldown - dt)
    this.wallSfxCooldown = Math.max(0, this.wallSfxCooldown - dt)
    this.nearMissFlash = Math.max(0, this.nearMissFlash - dt)

    if (this.phase === 'countdown') {
      this.countdown -= dt
      const nextInt = Math.ceil(this.countdown)
      if (nextInt !== this.lastCountdownInt && nextInt >= 0) {
        this.lastCountdownInt = nextInt
        this.callbacks.onCountdownTick(nextInt)
        this.emitSnapshot()
      }
      if (this.countdown <= 0) {
        this.phase = 'playing'
        this.emitSnapshot()
      }
      this.updatePlayers(dt, false)
      return
    }

    if (this.phase === 'goal') {
      this.goalCelebrationTimer -= dt
      this.updateConfetti(dt)
      if (this.goalCelebrationTimer <= 0) {
        if (this.winner) {
          this.phase = 'gameover'
          this.callbacks.onMatchEnd(this.winner)
          this.emitSnapshot()
        } else {
          this.phase = 'countdown'
          this.countdown = ROUND_RESTART_COUNTDOWN
          this.lastCountdownInt = -1
          this.resetRound(true)
          this.emitSnapshot()
        }
      }
      return
    }

    if (this.phase === 'gameover') {
      this.updateConfetti(dt)
      return
    }

    if (this.phase !== 'playing') return

    this.updatePlayers(dt, true)
    this.updateBall(dt)
  }

  private updatePlayers(dt: number, canKick: boolean) {
    this.stepPlayer(
      this.player1,
      this.input.getPlayer1Move(),
      canKick && this.input.seatActionA(1),
      dt,
    )
    this.stepPlayer(
      this.player2,
      this.input.getPlayer2Move(),
      canKick && this.input.seatActionA(2),
      dt,
    )
    resolvePlayerPlayer(this.player1, this.player2)
    clampPlayer(this.player1)
    clampPlayer(this.player2)
  }

  exportNetworkState() {
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.score1,
      score2: this.score2,
      lastScorer: this.lastScorer,
      spectacular: this.spectacular,
      goalCelebrationTimer: this.goalCelebrationTimer,
      expression1: this.expression1,
      expression2: this.expression2,
      winner: this.winner,
      nearMissFlash: this.nearMissFlash,
      ball: { ...this.ball },
      player1: { ...this.player1 },
      player2: { ...this.player2 },
    }
  }

  applyNetworkState(state: ReturnType<GameEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.score1 = state.score1
    this.score2 = state.score2
    this.lastScorer = state.lastScorer
    this.spectacular = state.spectacular
    this.goalCelebrationTimer = state.goalCelebrationTimer
    this.expression1 = state.expression1
    this.expression2 = state.expression2
    this.winner = state.winner
    this.nearMissFlash = state.nearMissFlash
    Object.assign(this.ball, state.ball)
    Object.assign(this.player1, state.player1)
    Object.assign(this.player2, state.player2)
    this.emitSnapshot()
  }

  private stepPlayer(
    player: PlayerState,
    move: { x: number; y: number },
    kickPressed: boolean,
    dt: number,
  ) {
    player.kickCooldown = Math.max(0, player.kickCooldown - dt)
    player.kickAnim = Math.max(0, player.kickAnim - dt)

    if (move.x !== 0 || move.y !== 0) {
      player.facingX = move.x
      player.facingY = move.y
      player.vx += move.x * PLAYER_ACCEL * dt
      player.vy += move.y * PLAYER_ACCEL * dt
      player.walkPhase += dt * 12
    } else {
      player.vx *= PLAYER_FRICTION
      player.vy *= PLAYER_FRICTION
      player.walkPhase += dt * 2
    }

    const speed = Math.hypot(player.vx, player.vy)
    if (speed > PLAYER_SPEED) {
      player.vx = (player.vx / speed) * PLAYER_SPEED
      player.vy = (player.vy / speed) * PLAYER_SPEED
    }

    player.x += player.vx * dt
    player.y += player.vy * dt
    clampPlayer(player)

    if (kickPressed && player.kickCooldown <= 0) {
      this.tryKick(player)
    }
  }

  private tryKick(player: PlayerState) {
    player.kickCooldown = KICK_COOLDOWN
    player.kickAnim = 0.22
    const dist = distance(player.x, player.y, this.ball.x, this.ball.y)
    if (dist > KICK_RANGE + this.ball.radius) return

    let dirX = player.facingX
    let dirY = player.facingY
    if (dirX === 0 && dirY === 0) {
      dirX = player.id === 1 ? 1 : -1
      dirY = 0
    }

    const toBallX = this.ball.x - player.x
    const toBallY = this.ball.y - player.y
    const toBallLen = Math.hypot(toBallX, toBallY) || 1
    dirX = dirX * 0.55 + (toBallX / toBallLen) * 0.45
    dirY = dirY * 0.55 + (toBallY / toBallLen) * 0.45
    const len = Math.hypot(dirX, dirY) || 1
    dirX /= len
    dirY /= len

    const power = KICK_STRENGTH * (1 - dist / (KICK_RANGE + this.ball.radius) * 0.25)
    this.ball.vx += dirX * power
    this.ball.vy += dirY * power
    this.ball.squash = 0.55
    this.spawnImpact(this.ball.x, this.ball.y, player.color)
    this.clampBallSpeed()
    this.callbacks.onKick()
  }

  private updateBall(dt: number) {
    const drag = Math.exp(-BALL_DRAG * dt)
    this.ball.vx *= drag
    this.ball.vy *= drag
    this.clampBallSpeed()

    // Substeps for tunneling prevention
    const steps = 3
    const stepDt = dt / steps
    for (let i = 0; i < steps; i++) {
      this.ball.x += this.ball.vx * stepDt
      this.ball.y += this.ball.vy * stepDt

      if (resolveBallPlayer(this.ball, this.player1, TOUCH_STRENGTH)) {
        this.callbacks.onPlayerHit()
        this.checkSave(this.player1)
      }
      if (resolveBallPlayer(this.ball, this.player2, TOUCH_STRENGTH)) {
        this.callbacks.onPlayerHit()
        this.checkSave(this.player2)
      }

      const wall = resolveBallWalls(this.ball)
      if (wall.hit) {
        this.ball.squash = 0.75
        this.spawnImpact(this.ball.x, this.ball.y, '#ffffff')
        if (this.wallSfxCooldown <= 0) {
          this.wallSfxCooldown = 0.09
          this.callbacks.onWallHit()
        }
      }
      if (wall.nearMiss && this.nearMissCooldown <= 0) {
        this.nearMissCooldown = 1.5
        this.nearMissFlash = 0.8
        this.applyExpressions(expressionsForNearMiss())
        this.callbacks.onNearMiss()
        this.emitSnapshot()
      }

      if (!this.goalLocked && wall.goal) {
        this.registerGoal(wall.goal)
        return
      }
    }

    this.ball.squash += (1 - this.ball.squash) * Math.min(1, dt * 8)
  }

  private checkSave(player: PlayerState) {
    if (this.saveCooldown > 0) return
    const mouth = getGoalMouth()
    const defendingLeft = player.id === 1
    const nearOwnGoal = defendingLeft
      ? this.ball.x < FIELD_WIDTH * 0.18
      : this.ball.x > FIELD_WIDTH * 0.82
    const inMouthBand = this.ball.y > mouth.top - 30 && this.ball.y < mouth.bottom + 30
    const speed = Math.hypot(this.ball.vx, this.ball.vy)
    const headingIn =
      (defendingLeft && this.ball.vx < -120) || (!defendingLeft && this.ball.vx > 120)

    if (nearOwnGoal && inMouthBand && speed > 220 && headingIn) {
      this.saveCooldown = 2
      this.applyExpressions(expressionsForSave(player.id))
      this.callbacks.onSave(player.id)
      this.emitSnapshot()
    }
  }

  private registerGoal(scorer: PlayerId) {
    this.goalLocked = true
    this.lastScorer = scorer
    if (scorer === 1) this.score1 += 1
    else this.score2 += 1

    const speed = Math.hypot(this.ball.vx, this.ball.vy)
    this.spectacular = speed > 620
    this.applyExpressions(expressionsForGoal(scorer, this.spectacular))
    this.spawnGoalConfetti(scorer)
    this.phase = 'goal'
    this.goalCelebrationTimer = GOAL_CELEBRATION_DURATION
    this.ball.vx = 0
    this.ball.vy = 0

    if (this.score1 >= this.settings.winningScore) {
      this.winner = 1
      this.applyExpressions(expressionsForMatchEnd(1))
    } else if (this.score2 >= this.settings.winningScore) {
      this.winner = 2
      this.applyExpressions(expressionsForMatchEnd(2))
    }

    this.callbacks.onGoal(scorer, this.spectacular)
    this.emitSnapshot()
  }

  private resetRound(keepScore: boolean) {
    void keepScore
    this.ball = createBall()
    this.player1.x = FIELD_WIDTH * 0.22
    this.player1.y = FIELD_HEIGHT / 2
    this.player1.vx = 0
    this.player1.vy = 0
    this.player1.facingX = 1
    this.player1.facingY = 0
    this.player1.kickCooldown = 0
    this.player1.kickAnim = 0

    this.player2.x = FIELD_WIDTH * 0.78
    this.player2.y = FIELD_HEIGHT / 2
    this.player2.vx = 0
    this.player2.vy = 0
    this.player2.facingX = -1
    this.player2.facingY = 0
    this.player2.kickCooldown = 0
    this.player2.kickAnim = 0

    this.goalLocked = false
    this.particles = []
    if (!this.winner) this.confetti = []
  }

  private applyExpressions(event: ExpressionEvent) {
    this.expression1 = event.player1
    this.expression2 = event.player2
    this.player1.expression = event.player1
    this.player2.expression = event.player2
    this.expressionHoldTimer = event.holdSeconds ?? 0
    this.expressionFollowUp = event.followUp ?? null
    this.expressionFollowTimer = event.followUp?.afterSeconds ?? 0
  }

  private updateExpressionTimers(dt: number) {
    if (this.expressionFollowUp && this.expressionFollowTimer > 0) {
      this.expressionFollowTimer -= dt
      if (this.expressionFollowTimer <= 0) {
        this.expression1 = this.expressionFollowUp.player1
        this.expression2 = this.expressionFollowUp.player2
        this.player1.expression = this.expression1
        this.player2.expression = this.expression2
        this.expressionFollowUp = null
        this.emitSnapshot()
      }
    } else if (this.expressionHoldTimer > 0 && this.phase === 'playing') {
      this.expressionHoldTimer -= dt
      if (this.expressionHoldTimer <= 0) {
        this.expression1 = 'happy'
        this.expression2 = 'happy'
        this.player1.expression = 'happy'
        this.player2.expression = 'happy'
        this.emitSnapshot()
      }
    }
  }

  private clampBallSpeed() {
    const speed = Math.hypot(this.ball.vx, this.ball.vy)
    if (speed > BALL_MAX_SPEED) {
      this.ball.vx = (this.ball.vx / speed) * BALL_MAX_SPEED
      this.ball.vy = (this.ball.vy / speed) * BALL_MAX_SPEED
    }
  }

  private spawnImpact(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 60 + Math.random() * 140
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  private spawnGoalConfetti(scorer: PlayerId) {
    const colors =
      scorer === 1
        ? ['#e23d3d', '#ff8a8a', '#ffffff', '#ffd166']
        : ['#2f6fed', '#7eb6ff', '#ffffff', '#ffd166']
    for (let i = 0; i < 70; i++) {
      this.confetti.push({
        x: FIELD_WIDTH / 2 + (Math.random() - 0.5) * 200,
        y: FIELD_HEIGHT * 0.2 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 280,
        vy: 80 + Math.random() * 220,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        color: colors[i % colors.length]!,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        life: 1.8 + Math.random(),
      })
    }
  }

  private updateConfetti(dt: number) {
    for (const c of this.confetti) {
      c.vy += 280 * dt
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.rot += c.vr * dt
      c.life -= dt
    }
    this.confetti = this.confetti.filter((c) => c.life > 0)
  }

  private updateVisuals(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)

    if (this.phase === 'goal' || this.phase === 'gameover') {
      this.updateConfetti(dt)
    }
  }

  private emitSnapshot() {
    const snapshot: GameSnapshot = {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.score1,
      score2: this.score2,
      lastScorer: this.lastScorer,
      spectacular: this.spectacular,
      goalCelebrationTimer: this.goalCelebrationTimer,
      expression1: this.expression1,
      expression2: this.expression2,
      winner: this.winner,
      nearMissFlash: this.nearMissFlash,
    }
    this.callbacks.onSnapshot(snapshot)
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: this.score1,
      score2: this.score2,
      lastScorer: this.lastScorer,
      spectacular: this.spectacular,
      goalCelebrationTimer: this.goalCelebrationTimer,
      expression1: this.expression1,
      expression2: this.expression2,
      winner: this.winner,
      nearMissFlash: this.nearMissFlash,
    }
  }
}

function createBall(): BallState {
  return {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    squash: 1,
  }
}

function createPlayer(id: PlayerId, x: number, y: number, color: string): PlayerState {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PLAYER_RADIUS,
    facingX: id === 1 ? 1 : -1,
    facingY: 0,
    expression: 'happy',
    kickCooldown: 0,
    kickAnim: 0,
    walkPhase: 0,
    color,
  }
}
