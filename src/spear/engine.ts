import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  FLIGHT_TIME,
  RESULT_TIME,
  TARGET_X,
  THROWER_X,
  THROWER_Y,
  ZONES,
  ZONE_POINTS,
  type HitZone,
} from './constants'
import type { SpearPhase, SpearSettings, SpearSnapshot } from './types'

const PHYSICS_DT = 1 / 120

export class SpearEngine {
  phase: SpearPhase = 'aim'
  turn: PlayerId = 1
  score1 = 0
  score2 = 0
  expression1: Expression = 'happy'
  expression2: Expression = 'happy'
  zone: HitZone | null = null
  points = 0
  winner: PlayerId | null = null
  aimX = TARGET_X
  aimY = 360
  spearT = 0
  lockedX = TARGET_X
  lockedY = 360

  private settings: SpearSettings
  private input: InputManager
  private onSnapshot: (snapshot: SpearSnapshot) => void
  private onThrow: () => void
  private onHit: (zone: HitZone) => void
  private onWin: () => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private aimClock = 0
  private resultTimer = 0

  constructor(
    settings: SpearSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (snapshot: SpearSnapshot) => void
      onThrow: () => void
      onHit: (zone: HitZone) => void
      onWin: () => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onThrow = hooks.onThrow
    this.onHit = hooks.onHit
    this.onWin = hooks.onWin
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
    this.phase = 'aim'
    this.turn = 1
    this.score1 = 0
    this.score2 = 0
    this.expression1 = 'happy'
    this.expression2 = 'happy'
    this.zone = null
    this.points = 0
    this.winner = null
    this.spearT = 0
    this.aimClock = 0
    this.resultTimer = 0
    this.emit()
  }

  spearPosition() {
    const t = this.phase === 'aim' ? 0 : Math.min(1, this.spearT / FLIGHT_TIME)
    const x = THROWER_X + (this.lockedX - THROWER_X) * t
    const y = THROWER_Y + (this.lockedY - THROWER_Y) * t - Math.sin(t * Math.PI) * 90
    return { x, y, t }
  }

  private frame = (now: number) => {
    if (!this.running) return
    const elapsed = Math.min(0.05, (now - this.lastTime) / 1000)
    this.lastTime = now
    this.accumulator += elapsed
    while (this.accumulator >= PHYSICS_DT) {
      this.step(PHYSICS_DT)
      this.accumulator -= PHYSICS_DT
    }
    this.input.endFrame()
    this.raf = requestAnimationFrame(this.frame)
  }

  private step(dt: number) {
    if (this.phase === 'aim') {
      this.aimClock += dt * 1.15
      this.aimY = 190 + (Math.sin(this.aimClock) * 0.5 + 0.5) * 450
      this.aimX = TARGET_X + Math.sin(this.aimClock * 0.7) * 160
      const pressed =
        this.turn === 1
          ? this.input.consumeJustPressed('Space')
          : this.input.consumeJustPressed('Enter')
      if (pressed) this.throwSpear()
      return
    }

    if (this.phase === 'flight') {
      this.spearT += dt
      if (this.spearT >= FLIGHT_TIME) this.resolve()
      return
    }

    if (this.phase === 'result') {
      this.resultTimer -= dt
      if (this.resultTimer <= 0) {
        if (this.winner) {
          this.phase = 'gameover'
          this.onWin()
          this.emit()
        } else {
          this.turn = this.turn === 1 ? 2 : 1
          this.phase = 'aim'
          this.zone = null
          this.points = 0
          this.expression1 = 'happy'
          this.expression2 = 'happy'
          this.emit()
        }
      }
    }
  }

  private throwSpear() {
    this.lockedX = this.aimX
    this.lockedY = this.aimY
    this.spearT = 0
    this.phase = 'flight'
    this.onThrow()
    this.emit()
  }

  private resolve() {
    const zone = zoneAt(this.lockedX, this.lockedY)
    const points = ZONE_POINTS[zone]
    this.zone = zone
    this.points = points
    if (this.turn === 1) this.score1 += points
    else this.score2 += points

    const throwerHappy = points > 0
    if (this.turn === 1) {
      this.expression1 = throwerHappy ? (zone === 'body' ? 'amazed' : 'happy') : 'sad'
      this.expression2 = throwerHappy ? (zone === 'body' ? 'amazed' : 'angry') : 'happy'
    } else {
      this.expression2 = throwerHappy ? (zone === 'body' ? 'amazed' : 'happy') : 'sad'
      this.expression1 = throwerHappy ? (zone === 'body' ? 'amazed' : 'angry') : 'happy'
    }

    const total = this.turn === 1 ? this.score1 : this.score2
    if (total >= this.settings.winningScore) this.winner = this.turn
    this.phase = 'result'
    this.resultTimer = RESULT_TIME
    this.onHit(zone)
    this.emit()
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): SpearSnapshot {
    return {
      phase: this.phase,
      turn: this.turn,
      score1: this.score1,
      score2: this.score2,
      expression1: this.expression1,
      expression2: this.expression2,
      zone: this.zone,
      points: this.points,
      winner: this.winner,
    }
  }
}

function zoneAt(x: number, y: number): HitZone {
  const hit = ZONES.find((zone) => x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h)
  return hit?.id ?? 'miss'
}
