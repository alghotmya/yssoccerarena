/**
 * Face-Off Rumble — TypeScript fighter inspired by Neon Rumble (MIT).
 * See ./NOTICE.md and ./LICENSE.
 */
import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  ARENA_WIDTH,
  BODY_W,
  CROUCH_H,
  GRAVITY,
  GROUND_Y,
  JUMP_SPEED,
  KO_PAUSE,
  LEFT_WALL,
  MAX_HEALTH,
  METER_MAX,
  MOVE_SPEED,
  MOVES,
  OPEN_COUNTDOWN,
  PROJ_LIFE,
  PROJ_RADIUS,
  PROJ_SPEED,
  RIGHT_WALL,
  ROUND_TIME,
  SPECIAL_COST,
  STAND_H,
  type MoveKey,
} from './constants'
import type {
  Brawler,
  Projectile,
  RumblePhase,
  RumbleSettings,
  RumbleSnapshot,
  Spark,
} from './types'

const PHYSICS_DT = 1 / 120

export class RumbleEngine {
  p1: Brawler
  p2: Brawler
  projectiles: Projectile[] = []
  sparks: Spark[] = []
  phase: RumblePhase = 'countdown'
  countdown = OPEN_COUNTDOWN
  timer = ROUND_TIME
  winner: PlayerId | null = null
  lastHit: PlayerId | null = null
  combo = 0
  shake = 0
  hitstop = 0

  private settings: RumbleSettings
  private input: InputManager
  private onSnapshot: (s: RumbleSnapshot) => void
  private onAttack: (kind: MoveKey) => void
  private onJump: () => void
  private onHit: () => void
  private onBlock: () => void
  private onKo: () => void
  private onWin: () => void
  private onTick: (v: number) => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private koTimer = 0
  private lastCountdownInt = -1
  private clockAcc = 0
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: RumbleSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (s: RumbleSnapshot) => void
      onAttack: (kind: MoveKey) => void
      onJump: () => void
      onHit: () => void
      onBlock: () => void
      onKo: () => void
      onWin: () => void
      onTick: (v: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onAttack = hooks.onAttack
    this.onJump = hooks.onJump
    this.onHit = hooks.onHit
    this.onBlock = hooks.onBlock
    this.onKo = hooks.onKo
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.p1 = makeBrawler(1, 320)
    this.p2 = makeBrawler(2, ARENA_WIDTH - 320)
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
    this.combo = 0
    this.p1 = makeBrawler(1, 320)
    this.p2 = makeBrawler(2, ARENA_WIDTH - 320)
    this.projectiles = []
    this.sparks = []
    this.phase = 'countdown'
    this.countdown = OPEN_COUNTDOWN
    this.timer = ROUND_TIME
    this.lastCountdownInt = -1
    this.koTimer = 0
    this.hitstop = 0
    this.shake = 0
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
    this.shake = Math.max(0, this.shake - dt * 8)
    for (const s of this.sparks) {
      s.life -= dt
      s.x += s.vx * dt
      s.y += s.vy * dt
    }
    this.sparks = this.sparks.filter((s) => s.life > 0)

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt)
      return
    }

    if (this.phase === 'countdown') {
      this.countdown -= dt
      const next = Math.ceil(this.countdown)
      if (next !== this.lastCountdownInt && next >= 0) {
        this.lastCountdownInt = next
        this.onTick(next)
        this.emit()
      }
      if (this.countdown <= 0) {
        this.phase = 'fight'
        this.emit()
      }
      return
    }

    if (this.phase === 'ko') {
      this.koTimer -= dt
      this.tickProjectiles(dt)
      if (this.koTimer <= 0) {
        if (this.winner) {
          this.phase = 'gameover'
          this.onWin()
          this.emit()
        } else {
          this.resetRoundKeepWins()
          this.phase = 'countdown'
          this.countdown = OPEN_COUNTDOWN
          this.lastCountdownInt = -1
          this.emit()
        }
      }
      return
    }

    if (this.phase !== 'fight') return

    this.clockAcc += dt
    if (this.clockAcc >= 1) {
      this.clockAcc -= 1
      this.timer = Math.max(0, this.timer - 1)
      if (this.timer <= 0) this.endByTime()
      this.emit()
    }

    this.faceEachOther()
    this.control(this.p1, 1, dt)
    this.control(this.p2, 2, dt)
    this.physics(this.p1, dt)
    this.physics(this.p2, dt)
    this.separate()
    this.resolveStrikes()
    this.tickProjectiles(dt)
    this.checkKo()
  }

  private faceEachOther() {
    if (this.p1.x <= this.p2.x) {
      this.p1.facing = 1
      this.p2.facing = -1
    } else {
      this.p1.facing = -1
      this.p2.facing = 1
    }
  }

  private control(f: Brawler, seat: 1 | 2, dt: number) {
    f.flash = Math.max(0, f.flash - dt)
    if (f.state === 'ko') return

    if (f.state === 'hitstun' || f.state === 'blockstun') {
      f.stun -= dt
      if (f.stun <= 0) {
        f.state = 'idle'
        f.expression = 'angry'
      }
      return
    }

    if (f.state === 'attack') {
      f.moveTime += dt
      const move = f.move ? MOVES[f.move] : null
      if (move && f.move === 'special' && !f.hitDone && f.moveTime >= move.startup) {
        f.hitDone = true
        this.spawnProjectile(f)
      }
      const total = move ? move.startup + move.active + move.recovery : 0.3
      if (f.moveTime >= total) {
        f.state = 'idle'
        f.move = null
        f.moveTime = 0
        f.hitDone = false
      }
      return
    }

    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()
    f.crouching = move.y > 0.4 && f.onGround
    const holdingBack = (f.facing === 1 && move.x < -0.2) || (f.facing === -1 && move.x > 0.2)
    f.blocking = holdingBack && f.onGround

    if (f.onGround && !f.crouching) {
      f.vx = move.x * MOVE_SPEED
      if (Math.abs(move.x) > 0.1) f.walk += dt * 10
    } else if (f.onGround && f.crouching) {
      f.vx = 0
    }

    if (f.onGround && this.input.seatJumpHeld(seat) && move.y < -0.2) {
      f.vy = -JUMP_SPEED
      f.onGround = false
      this.onJump()
    }

    if (this.input.seatActionA(seat)) this.startMove(f, 'punch')
    else if (this.input.seatActionB(seat)) this.startMove(f, 'kick')
    else if (this.specialPressed(seat)) this.startMove(f, 'special')
  }

  private specialPressed(seat: 1 | 2) {
    if (this.input.localMode === 'both') {
      return seat === 1
        ? this.input.consumeJustPressed('KeyF')
        : this.input.consumeJustPressed('KeyL')
    }
    if (seat === this.input.localMode) return this.input.consumeJustPressed('KeyF')
    return false
  }

  private startMove(f: Brawler, key: MoveKey) {
    if (f.state !== 'idle') return
    if (key === 'special' && f.meter < SPECIAL_COST) return
    if (key === 'special') f.meter -= SPECIAL_COST
    f.state = 'attack'
    f.move = key
    f.moveTime = 0
    f.hitDone = false
    f.vx = 0
    f.expression = 'angry'
    this.onAttack(key)
  }

  private physics(f: Brawler, dt: number) {
    if (!f.onGround) {
      f.vy += GRAVITY * dt
      f.y += f.vy * dt
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y
        f.vy = 0
        f.onGround = true
      }
    } else {
      f.y = GROUND_Y
    }
    f.x += f.vx * dt
    f.x = clamp(f.x, LEFT_WALL + BODY_W / 2, RIGHT_WALL - BODY_W / 2)
    if (f.state === 'hitstun' || f.state === 'blockstun') {
      f.vx *= 0.9
    } else if (f.state === 'attack') {
      f.vx *= 0.7
    }
  }

  private separate() {
    const gap = BODY_W + 8
    const dx = this.p2.x - this.p1.x
    if (Math.abs(dx) < gap) {
      const push = (gap - Math.abs(dx)) / 2
      if (dx >= 0) {
        this.p1.x -= push
        this.p2.x += push
      } else {
        this.p1.x += push
        this.p2.x -= push
      }
      this.p1.x = clamp(this.p1.x, LEFT_WALL + BODY_W / 2, RIGHT_WALL - BODY_W / 2)
      this.p2.x = clamp(this.p2.x, LEFT_WALL + BODY_W / 2, RIGHT_WALL - BODY_W / 2)
    }
  }

  private resolveStrikes() {
    this.tryHit(this.p1, this.p2)
    this.tryHit(this.p2, this.p1)
  }

  private tryHit(attacker: Brawler, defender: Brawler) {
    if (attacker.state !== 'attack' || !attacker.move || attacker.hitDone) return
    if (attacker.move === 'special') return
    const move = MOVES[attacker.move]
    if (attacker.moveTime < move.startup || attacker.moveTime > move.startup + move.active) return

    const box = hitbox(attacker, move)
    const hurt = hurtbox(defender)
    if (!overlaps(box, hurt)) return

    attacker.hitDone = true
    attacker.meter = Math.min(METER_MAX, attacker.meter + move.meterGain)

    if (defender.blocking && defender.onGround && defender.state === 'idle') {
      defender.state = 'blockstun'
      defender.stun = move.blockstun
      defender.vx = attacker.facing * move.knock * 0.35
      defender.expression = 'amazed'
      defender.flash = 0.1
      this.onBlock()
      this.hitstop = 0.04
      this.combo = 0
      this.spawnSparks(box.x + box.w / 2, box.y + box.h / 2, '#88cfff')
      this.emit()
      return
    }

    defender.health = Math.max(0, defender.health - move.damage)
    defender.state = 'hitstun'
    defender.stun = move.hitstun
    defender.vx = attacker.facing * move.knock
    defender.expression = 'sad'
    defender.flash = 0.15
    attacker.expression = 'amazed'
    this.lastHit = attacker.id
    this.combo += 1
    this.onHit()
    this.hitstop = 0.07
    this.shake = 0.35
    this.spawnSparks(box.x + box.w / 2, box.y + box.h / 2, '#ffd23f')
    this.emit()
  }

  private spawnProjectile(owner: Brawler) {
    this.projectiles.push({
      owner: owner.id,
      x: owner.x + owner.facing * 50,
      y: owner.y - 100,
      vx: owner.facing * PROJ_SPEED,
      life: PROJ_LIFE,
      damage: MOVES.special.damage,
      color: owner.color,
    })
  }

  private tickProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.x += p.vx * dt
      p.life -= dt
      const target = p.owner === 1 ? this.p2 : this.p1
      if (target.state === 'ko') continue
      const hurt = hurtbox(target)
      const box = { x: p.x - PROJ_RADIUS, y: p.y - PROJ_RADIUS, w: PROJ_RADIUS * 2, h: PROJ_RADIUS * 2 }
      if (!overlaps(box, hurt)) continue
      p.life = 0
      if (target.blocking && target.onGround && target.state === 'idle') {
        target.state = 'blockstun'
        target.stun = MOVES.special.blockstun
        target.vx = Math.sign(p.vx) * 80
        this.onBlock()
        this.spawnSparks(p.x, p.y, '#88cfff')
      } else {
        target.health = Math.max(0, target.health - p.damage)
        target.state = 'hitstun'
        target.stun = MOVES.special.hitstun
        target.vx = Math.sign(p.vx) * MOVES.special.knock
        target.expression = 'sad'
        this.lastHit = p.owner
        this.combo += 1
        this.onHit()
        this.hitstop = 0.06
        this.shake = 0.3
        this.spawnSparks(p.x, p.y, '#ff7a59')
      }
      this.emit()
    }
    this.projectiles = this.projectiles.filter(
      (p) => p.life > 0 && p.x > -40 && p.x < ARENA_WIDTH + 40,
    )
  }

  private spawnSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 80 + Math.random() * 220
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.2 + Math.random() * 0.25,
        color,
      })
    }
  }

  private checkKo() {
    if (this.p1.health <= 0 || this.p2.health <= 0) this.finishRound()
  }

  private endByTime() {
    if (this.phase !== 'fight') return
    if (this.p1.health === this.p2.health) {
      // draw — both get nothing, reset
      this.finishRound(true)
      return
    }
    if (this.p1.health > this.p2.health) this.p2.health = 0
    else this.p1.health = 0
    this.finishRound()
  }

  private finishRound(draw = false) {
    if (this.phase !== 'fight') return
    this.phase = 'ko'
    this.koTimer = KO_PAUSE
    this.projectiles = []
    this.combo = 0
    if (draw) {
      this.onKo()
      this.emit()
      return
    }
    const loser = this.p1.health <= 0 ? this.p1 : this.p2
    const winner = loser.id === 1 ? this.p2 : this.p1
    loser.state = 'ko'
    loser.expression = 'sad'
    winner.expression = 'happy'
    winner.rounds += 1
    this.lastHit = winner.id
    if (winner.rounds >= this.settings.roundsToWin) this.winner = winner.id
    this.onKo()
    this.emit()
  }

  private resetRoundKeepWins() {
    const r1 = this.p1.rounds
    const r2 = this.p2.rounds
    this.p1 = makeBrawler(1, 320)
    this.p2 = makeBrawler(2, ARENA_WIDTH - 320)
    this.p1.rounds = r1
    this.p2.rounds = r2
    this.projectiles = []
    this.sparks = []
    this.timer = ROUND_TIME
    this.clockAcc = 0
    this.combo = 0
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): RumbleSnapshot {
    return {
      phase: this.phase,
      countdown: this.countdown,
      health1: this.p1.health,
      health2: this.p2.health,
      meter1: this.p1.meter,
      meter2: this.p2.meter,
      rounds1: this.p1.rounds,
      rounds2: this.p2.rounds,
      timer: this.timer,
      expression1: this.p1.expression,
      expression2: this.p2.expression,
      winner: this.winner,
      lastHit: this.lastHit,
      combo: this.combo,
    }
  }

  exportNetworkState() {
    return {
      phase: this.phase,
      countdown: this.countdown,
      timer: this.timer,
      winner: this.winner,
      lastHit: this.lastHit,
      combo: this.combo,
      koTimer: this.koTimer,
      hitstop: this.hitstop,
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      projectiles: this.projectiles.map((p) => ({ ...p })),
    }
  }

  applyNetworkState(state: ReturnType<RumbleEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.timer = state.timer
    this.winner = state.winner
    this.lastHit = state.lastHit
    this.combo = state.combo
    this.koTimer = state.koTimer
    this.hitstop = state.hitstop
    Object.assign(this.p1, state.p1)
    Object.assign(this.p2, state.p2)
    this.projectiles = state.projectiles.map((p) => ({ ...p }))
    this.emit()
  }
}

function makeBrawler(id: PlayerId, x: number): Brawler {
  const expression: Expression = 'angry'
  return {
    id,
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: id === 1 ? 1 : -1,
    health: MAX_HEALTH,
    meter: 40,
    rounds: 0,
    expression,
    onGround: true,
    crouching: false,
    blocking: false,
    state: 'idle',
    move: null,
    moveTime: 0,
    hitDone: false,
    stun: 0,
    walk: 0,
    color: id === 1 ? '#e23d3d' : '#2f6fed',
    flash: 0,
  }
}

function hurtbox(f: Brawler) {
  const h = f.crouching ? CROUCH_H : STAND_H
  return { x: f.x - BODY_W / 2, y: f.y - h, w: BODY_W, h }
}

function hitbox(f: Brawler, move: (typeof MOVES)[MoveKey]) {
  const left = f.facing > 0 ? f.x + 18 : f.x - 18 - move.reach
  return { x: left, y: f.y - move.oy, w: move.reach, h: move.height }
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
