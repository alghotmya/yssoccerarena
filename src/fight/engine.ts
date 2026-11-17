import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  ARENA_WIDTH,
  FIGHT_COUNTDOWN,
  FIGHTER_COLOR,
  GRAVITY,
  GROUND_Y,
  HITSTUN,
  JUMP_SPEED,
  KICK_ACTIVE,
  KICK_COOLDOWN,
  KICK_DAMAGE,
  KICK_KNOCK,
  KICK_REACH,
  KO_PAUSE,
  MAX_HEALTH,
  MOVE_SPEED,
  PUNCH_ACTIVE,
  PUNCH_COOLDOWN,
  PUNCH_DAMAGE,
  PUNCH_KNOCK,
  PUNCH_REACH,
} from './constants'
import type { Fighter, FightPhase, FightSettings, FightSnapshot } from './types'

const PHYSICS_DT = 1 / 120
const BODY_R = 28

export class FightEngine {
  p1: Fighter
  p2: Fighter
  phase: FightPhase = 'countdown'
  countdown = FIGHT_COUNTDOWN
  winner: PlayerId | null = null
  lastHit: PlayerId | null = null

  private settings: FightSettings
  private input: InputManager
  private onSnapshot: (snapshot: FightSnapshot) => void
  private onAttack: (kind: 'punch' | 'kick') => void
  private onJump: () => void
  private onHit: () => void
  private onKo: () => void
  private onWin: () => void
  private onTick: (value: number) => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private koTimer = 0
  private lastCountdownInt = -1

  constructor(
    settings: FightSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (snapshot: FightSnapshot) => void
      onAttack: (kind: 'punch' | 'kick') => void
      onJump: () => void
      onHit: () => void
      onKo: () => void
      onWin: () => void
      onTick: (value: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onAttack = hooks.onAttack
    this.onJump = hooks.onJump
    this.onHit = hooks.onHit
    this.onKo = hooks.onKo
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.p1 = makeFighter(1, 280)
    this.p2 = makeFighter(2, ARENA_WIDTH - 280)
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
    this.lastHit = null
    this.p1 = makeFighter(1, 280)
    this.p2 = makeFighter(2, ARENA_WIDTH - 280)
    this.phase = 'countdown'
    this.countdown = FIGHT_COUNTDOWN
    this.lastCountdownInt = -1
    this.koTimer = 0
    this.emit()
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
    if (this.phase === 'countdown') {
      this.countdown -= dt
      const next = Math.ceil(this.countdown)
      if (next !== this.lastCountdownInt && next >= 0) {
        this.lastCountdownInt = next
        this.onTick(next)
        this.emit()
      }
      if (this.countdown <= 0) {
        this.phase = 'fighting'
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
          this.resetPositions()
          this.phase = 'countdown'
          this.countdown = 2
          this.lastCountdownInt = -1
          this.emit()
        }
      }
      return
    }

    if (this.phase !== 'fighting') return

    this.control(this.p1, this.input.getPlayer1Move(), this.input.isDown('KeyW'), this.input.consumeJustPressed('Space'), this.input.consumeJustPressed('KeyS'), dt)
    this.control(this.p2, this.input.getPlayer2Move(), this.input.isDown('ArrowUp'), this.input.consumeJustPressed('Enter'), this.input.consumeJustPressed('ArrowDown'), dt)
    this.integrate(this.p1, dt)
    this.integrate(this.p2, dt)
    this.separate()
    this.resolveAttack(this.p1, this.p2)
    if (this.phase !== 'fighting') return
    this.resolveAttack(this.p2, this.p1)
    this.faceEachOther()
  }

  private control(
    fighter: Fighter,
    move: { x: number; y: number },
    jump: boolean,
    punch: boolean,
    kick: boolean,
    dt: number,
  ) {
    fighter.cooldown = Math.max(0, fighter.cooldown - dt)
    fighter.hitstun = Math.max(0, fighter.hitstun - dt)
    if (fighter.attack !== 'none') {
      fighter.attackTime -= dt
      if (fighter.attackTime <= 0) fighter.attack = 'none'
    }

    const busy = fighter.hitstun > 0 || fighter.attack !== 'none'
    if (!busy) {
      fighter.vx = move.x * MOVE_SPEED
      if (move.x !== 0) fighter.facing = move.x > 0 ? 1 : -1
      if (jump && fighter.onGround) {
        fighter.vy = JUMP_SPEED
        fighter.onGround = false
        this.onJump()
      }
      if (punch && fighter.cooldown <= 0) this.startAttack(fighter, 'punch')
      else if (kick && fighter.cooldown <= 0) this.startAttack(fighter, 'kick')
      if (Math.abs(fighter.vx) > 10 && fighter.onGround) fighter.walk += dt * 12
    } else if (fighter.hitstun > 0) {
      fighter.vx *= 0.92
    }
  }

  private startAttack(fighter: Fighter, kind: 'punch' | 'kick') {
    fighter.attack = kind
    fighter.attackHit = false
    fighter.attackTime = kind === 'punch' ? PUNCH_ACTIVE : KICK_ACTIVE
    fighter.cooldown = kind === 'punch' ? PUNCH_COOLDOWN : KICK_COOLDOWN
    fighter.expression = 'angry'
    this.onAttack(kind)
  }

  private integrate(fighter: Fighter, dt: number) {
    fighter.vy += GRAVITY * dt
    fighter.x += fighter.vx * dt
    fighter.y += fighter.vy * dt

    const minX = 70
    const maxX = ARENA_WIDTH - 70
    if (fighter.x < minX) {
      fighter.x = minX
      fighter.vx = 0
    } else if (fighter.x > maxX) {
      fighter.x = maxX
      fighter.vx = 0
    }

    if (fighter.y >= GROUND_Y) {
      fighter.y = GROUND_Y
      fighter.vy = 0
      fighter.onGround = true
    } else {
      fighter.onGround = false
    }

    if (fighter.hitstun <= 0 && fighter.attack === 'none' && fighter.expression === 'angry') {
      fighter.expression = 'happy'
    }
  }

  private separate() {
    const dx = this.p2.x - this.p1.x
    const dist = Math.abs(dx)
    const min = BODY_R * 2
    if (dist >= min || dist === 0) return
    const push = (min - dist) / 2
    const dir = dx >= 0 ? 1 : -1
    this.p1.x -= dir * push
    this.p2.x += dir * push
  }

  private resolveAttack(attacker: Fighter, defender: Fighter) {
    if (attacker.attack === 'none' || attacker.attackHit) return
    const reach = attacker.attack === 'punch' ? PUNCH_REACH : KICK_REACH
    const height = attacker.attack === 'punch' ? 78 : 36
    const hx = attacker.x + attacker.facing * (reach * 0.55)
    const hy = attacker.y - height
    const dx = defender.x - hx
    const dy = defender.y - 70 - hy
    if (dx * dx + dy * dy > (BODY_R + 18) * (BODY_R + 18)) return

    attacker.attackHit = true
    const damage = attacker.attack === 'punch' ? PUNCH_DAMAGE : KICK_DAMAGE
    const knock = attacker.attack === 'punch' ? PUNCH_KNOCK : KICK_KNOCK
    defender.health = Math.max(0, defender.health - damage)
    defender.vx = attacker.facing * knock
    defender.vy = attacker.attack === 'kick' ? -280 : -80
    defender.hitstun = HITSTUN
    defender.expression = defender.health <= 0 ? 'sad' : 'angry'
    attacker.expression = 'happy'
    this.lastHit = attacker.id
    this.onHit()

    if (defender.health <= 0) this.scoreKo(attacker, defender)
    else this.emit()
  }

  private scoreKo(attacker: Fighter, defender: Fighter) {
    attacker.rounds += 1
    attacker.expression = 'happy'
    defender.expression = 'sad'
    this.koTimer = KO_PAUSE
    this.phase = 'ko'
    if (attacker.rounds >= this.settings.roundsToWin) {
      this.winner = attacker.id
    }
    this.onKo()
    this.emit()
  }

  private faceEachOther() {
    if (this.p1.hitstun <= 0 && this.p1.attack === 'none' && Math.abs(this.p1.vx) < 20) {
      this.p1.facing = this.p2.x >= this.p1.x ? 1 : -1
    }
    if (this.p2.hitstun <= 0 && this.p2.attack === 'none' && Math.abs(this.p2.vx) < 20) {
      this.p2.facing = this.p1.x >= this.p2.x ? 1 : -1
    }
  }

  private resetPositions() {
    const rounds1 = this.p1.rounds
    const rounds2 = this.p2.rounds
    this.p1 = makeFighter(1, 280)
    this.p2 = makeFighter(2, ARENA_WIDTH - 280)
    this.p1.rounds = rounds1
    this.p2.rounds = rounds2
    this.p1.expression = 'happy'
    this.p2.expression = 'happy'
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): FightSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      health1: this.p1.health,
      health2: this.p2.health,
      rounds1: this.p1.rounds,
      rounds2: this.p2.rounds,
      expression1: this.p1.expression,
      expression2: this.p2.expression,
      winner: this.winner,
      lastHit: this.lastHit,
    }
  }
}

function makeFighter(id: PlayerId, x: number): Fighter {
  const expression: Expression = 'happy'
  return {
    id,
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: id === 1 ? 1 : -1,
    health: MAX_HEALTH,
    rounds: 0,
    expression,
    onGround: true,
    attack: 'none',
    attackTime: 0,
    attackHit: false,
    cooldown: 0,
    hitstun: 0,
    walk: 0,
    color: FIGHTER_COLOR[id],
  }
}
