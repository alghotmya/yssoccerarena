/**
 * Face-Off Snake engine — TypeScript rewrite inspired by bibhuticoder/snake.io (MIT).
 * Widescreen arena, bots, respawns, leaderboard. See ./NOTICE.md and ./LICENSE.
 */
import { InputManager } from '../game/input'
import type { PlayerId } from '../types'
import {
  BASE_SPEED,
  BOOST_DRAIN,
  BOOST_SPEED,
  BOT_COUNT,
  BOT_NAMES,
  BOT_TURN_RATE,
  FOOD_COLORS,
  FOOD_COUNT,
  HEAD_SIZE,
  MAX_SIZE,
  MIN_SEGMENTS,
  OPEN_COUNTDOWN,
  P1_COLOR,
  P2_COLOR,
  RESPAWN_DELAY,
  SEGMENT_GAP,
  START_LENGTH,
  TURN_RATE,
  WORLD_HEIGHT,
  WORLD_PAD,
  WORLD_WIDTH,
} from './constants'
import type {
  LeaderRow,
  SnakeFood,
  SnakePhase,
  SnakeSettings,
  SnakeSnapshot,
  Worm,
} from './types'

const PHYSICS_DT = 1 / 120

export class SnakeEngine {
  worms: Worm[] = []
  foods: SnakeFood[] = []
  phase: SnakePhase = 'countdown'
  countdown = OPEN_COUNTDOWN
  winner: PlayerId | null = null

  private settings: SnakeSettings
  private input: InputManager
  private onSnapshot: (s: SnakeSnapshot) => void
  private onEat: () => void
  private onHit: () => void
  private onWin: () => void
  private onTick: (v: number) => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private lastCountdownInt = -1
  private boostAcc = new Map<string, number>()
  private emitAcc = 0
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: SnakeSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (s: SnakeSnapshot) => void
      onEat: () => void
      onHit: () => void
      onWin: () => void
      onTick: (v: number) => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onEat = hooks.onEat
    this.onHit = hooks.onHit
    this.onWin = hooks.onWin
    this.onTick = hooks.onTick
    this.resetArena(true)
  }

  get p1() {
    return this.worms.find((w) => w.seat === 1)!
  }

  get p2() {
    return this.worms.find((w) => w.seat === 2)!
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
    this.phase = 'countdown'
    this.countdown = OPEN_COUNTDOWN
    this.lastCountdownInt = -1
    this.resetArena(true)
    this.emit()
  }

  private resetArena(resetScores: boolean) {
    const s1 = resetScores ? 0 : (this.p1?.kills ?? 0)
    const s2 = resetScores ? 0 : (this.p2?.kills ?? 0)
    this.worms = [
      makeHuman(1, this.settings.player1Name, P1_COLOR),
      makeHuman(2, this.settings.player2Name, P2_COLOR),
      ...makeBots(BOT_COUNT),
    ]
    this.p1.kills = s1
    this.p2.kills = s2
    this.foods = spawnFoods(FOOD_COUNT)
    this.boostAcc.clear()
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
      this.emitAcc += elapsed
      if (this.emitAcc >= 0.12) {
        this.emitAcc = 0
        this.emit()
      }
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

    if (this.phase !== 'battle') return

    for (const worm of this.worms) {
      if (!worm.alive) {
        worm.respawnIn -= dt
        if (worm.respawnIn <= 0) this.respawn(worm)
        continue
      }
      if (worm.kind === 'human') this.controlHuman(worm, worm.seat as 1 | 2, dt)
      else this.controlBot(worm, dt)
      this.moveBody(worm, dt)
      this.checkFood(worm)
      this.checkWorldEdge(worm)
    }

    this.checkCollisions()
    this.maintainBotCount()
  }

  private controlHuman(worm: Worm, seat: 1 | 2, dt: number) {
    worm.invuln = Math.max(0, worm.invuln - dt)
    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()
    if (move.x !== 0 || move.y !== 0) {
      worm.angle = turnToward(worm.angle, Math.atan2(move.y, move.x), TURN_RATE * dt)
    }
    worm.boost = this.boostHeld(seat) && worm.segments.length > MIN_SEGMENTS
  }

  private controlBot(worm: Worm, dt: number) {
    worm.invuln = Math.max(0, worm.invuln - dt)
    worm.aiTimer -= dt
    if (worm.aiTimer <= 0) {
      worm.aiTimer = 0.4 + Math.random() * 1.2
      worm.aiTurn = (Math.random() - 0.5) * 1.8
      // Steer toward nearest food sometimes
      if (Math.random() < 0.55) {
        const head = worm.segments[0]!
        let best: SnakeFood | null = null
        let bestD = 420
        for (const f of this.foods) {
          const d = Math.hypot(f.x - head.x, f.y - head.y)
          if (d < bestD) {
            bestD = d
            best = f
          }
        }
        if (best) {
          worm.angle = turnToward(
            worm.angle,
            Math.atan2(best.y - head.y, best.x - head.x),
            BOT_TURN_RATE * dt * 8,
          )
          worm.aiTurn = 0
        }
      }
      // Dodge nearby larger snakes
      const threat = this.nearestThreat(worm)
      if (threat) {
        const head = worm.segments[0]!
        const th = threat.segments[0]!
        const away = Math.atan2(head.y - th.y, head.x - th.x)
        worm.angle = turnToward(worm.angle, away, BOT_TURN_RATE * dt * 10)
        worm.boost = worm.segments.length > MIN_SEGMENTS + 4
      } else {
        worm.boost = Math.random() < 0.08 && worm.segments.length > MIN_SEGMENTS + 6
      }
    }
    if (worm.aiTurn !== 0) {
      worm.angle += worm.aiTurn * dt
      worm.aiTurn *= 0.98
    }
  }

  private nearestThreat(worm: Worm): Worm | null {
    const head = worm.segments[0]!
    let best: Worm | null = null
    let bestD = 160
    for (const other of this.worms) {
      if (other === worm || !other.alive) continue
      if (other.segments.length < worm.segments.length + 4) continue
      const d = Math.hypot(other.segments[0]!.x - head.x, other.segments[0]!.y - head.y)
      if (d < bestD) {
        bestD = d
        best = other
      }
    }
    return best
  }

  private moveBody(worm: Worm, dt: number) {
    const speed = worm.boost ? BOOST_SPEED : BASE_SPEED * (worm.kind === 'bot' ? 0.92 : 1)
    const head = worm.segments[0]!
    head.x += Math.cos(worm.angle) * speed * dt
    head.y += Math.sin(worm.angle) * speed * dt

    const gap = SEGMENT_GAP * (worm.size / HEAD_SIZE)
    for (let i = 1; i < worm.segments.length; i++) {
      const prev = worm.segments[i - 1]!
      const seg = worm.segments[i]!
      const dx = prev.x - seg.x
      const dy = prev.y - seg.y
      const dist = Math.hypot(dx, dy) || 1
      if (dist > gap) {
        const t = (dist - gap) / dist
        seg.x += dx * t
        seg.y += dy * t
      }
    }

    if (worm.boost) {
      const key = worm.uid
      const acc = (this.boostAcc.get(key) ?? 0) + BOOST_DRAIN * dt
      let left = acc
      while (left >= 1 && worm.segments.length > MIN_SEGMENTS) {
        left -= 1
        const dropped = worm.segments.pop()!
        this.foods.push({
          x: dropped.x,
          y: dropped.y,
          size: rand(2, 5),
          color: FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!,
        })
        this.refreshSize(worm)
      }
      this.boostAcc.set(key, left)
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
    const head = worm.segments[0]!
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i]!
      if (Math.hypot(head.x - food.x, head.y - food.y) < worm.size + food.size) {
        this.foods.splice(i, 1)
        worm.segments.push({ x: head.x, y: head.y })
        this.refreshSize(worm)
        if (worm.kind === 'human') this.onEat()
        if (this.foods.length < FOOD_COUNT) this.foods.push(randomFood())
      }
    }
  }

  private checkWorldEdge(worm: Worm) {
    const head = worm.segments[0]!
    if (
      head.x < WORLD_PAD ||
      head.y < WORLD_PAD ||
      head.x > WORLD_WIDTH - WORLD_PAD ||
      head.y > WORLD_HEIGHT - WORLD_PAD
    ) {
      this.kill(worm, null)
    }
  }

  private checkCollisions() {
    const alive = this.worms.filter((w) => w.alive && w.invuln <= 0)
    for (const attacker of alive) {
      for (const target of alive) {
        if (attacker === target) continue
        if (hitsBody(attacker, target)) {
          this.kill(attacker, target)
          break
        }
      }
    }
  }

  private kill(victim: Worm, killer: Worm | null) {
    if (!victim.alive || this.phase !== 'battle') return
    victim.alive = false
    victim.expression = 'sad'
    victim.boost = false
    victim.respawnIn = RESPAWN_DELAY
    for (let i = 0; i < victim.segments.length; i += 2) {
      const s = victim.segments[i]!
      this.foods.push({
        x: s.x,
        y: s.y,
        size: rand(3, 6),
        color: FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!,
      })
    }
    if (killer && killer.alive) {
      killer.kills += 1
      killer.expression = 'amazed'
      if (killer.kind === 'human' || victim.kind === 'human') this.onHit()
      if (killer.seat === 1 || killer.seat === 2) {
        if (killer.kills >= this.settings.winningScore) {
          this.winner = killer.seat
          this.phase = 'gameover'
          this.onWin()
          this.emit()
          return
        }
      }
    }
    this.emit()
  }

  private respawn(worm: Worm) {
    const spot = randomSpawn()
    const angle = Math.random() * Math.PI * 2
    worm.segments = []
    for (let i = 0; i < START_LENGTH; i++) {
      worm.segments.push({
        x: spot.x - Math.cos(angle) * SEGMENT_GAP * i,
        y: spot.y - Math.sin(angle) * SEGMENT_GAP * i,
      })
    }
    worm.angle = angle
    worm.size = HEAD_SIZE
    worm.alive = true
    worm.expression = 'happy'
    worm.invuln = 1.2
    worm.respawnIn = 0
    worm.boost = false
  }

  private maintainBotCount() {
    const bots = this.worms.filter((w) => w.kind === 'bot')
    if (bots.length < BOT_COUNT) {
      this.worms.push(...makeBots(BOT_COUNT - bots.length))
    }
  }

  private refreshSize(worm: Worm) {
    const grown = Math.floor(worm.segments.length / 26)
    worm.size = Math.min(MAX_SIZE, HEAD_SIZE + grown)
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): SnakeSnapshot {
    const p1 = this.p1
    const p2 = this.p2
    return {
      phase: this.phase,
      countdown: this.countdown,
      score1: p1.kills,
      score2: p2.kills,
      length1: p1.alive ? p1.segments.length : 0,
      length2: p2.alive ? p2.segments.length : 0,
      expression1: p1.expression,
      expression2: p2.expression,
      winner: this.winner,
      leaderboard: this.buildLeaderboard(),
      aliveBots: this.worms.filter((w) => w.kind === 'bot' && w.alive).length,
      totalBots: this.worms.filter((w) => w.kind === 'bot').length,
    }
  }

  buildLeaderboard(focusSeat?: 0 | PlayerId): LeaderRow[] {
    return [...this.worms]
      .map((w) => ({
        uid: w.uid,
        name: w.name,
        kind: w.kind,
        length: w.alive ? w.segments.length : 0,
        kills: w.kills,
        color: w.color,
        alive: w.alive,
        you: focusSeat != null ? w.seat === focusSeat : w.kind === 'human',
      }))
      .sort((a, b) => b.length - a.length || b.kills - a.kills)
      .slice(0, 10)
  }

  exportNetworkState() {
    return {
      phase: this.phase,
      countdown: round1(this.countdown),
      winner: this.winner,
      foods: this.foods.map((f) => ({
        x: round1(f.x),
        y: round1(f.y),
        size: round1(f.size),
        color: f.color,
      })),
      worms: this.worms.map((w) => serializeWorm(w)),
    }
  }

  applyNetworkState(state: ReturnType<SnakeEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.countdown = state.countdown
    this.winner = state.winner
    this.foods = state.foods.map((f) => ({ ...f }))
    // Rebuild worm list by uid
    const next: Worm[] = []
    for (const src of state.worms) {
      let w = this.worms.find((x) => x.uid === src.uid)
      if (!w) {
        w = {
          uid: src.uid,
          seat: src.seat,
          kind: src.kind,
          name: src.name,
          segments: [],
          angle: 0,
          size: HEAD_SIZE,
          kills: 0,
          expression: 'happy',
          alive: true,
          boost: false,
          color: src.color,
          midColor: src.midColor,
          invuln: 0,
          respawnIn: 0,
          aiTimer: 0,
          aiTurn: 0,
        }
      }
      applyWorm(w, src)
      next.push(w)
    }
    this.worms = next
    this.emit()
  }
}

function serializeWorm(worm: Worm) {
  // Downsample body for network size
  const step = worm.segments.length > 40 ? 2 : 1
  const segments = []
  for (let i = 0; i < worm.segments.length; i += step) {
    const s = worm.segments[i]!
    segments.push({ x: round1(s.x), y: round1(s.y) })
  }
  if (segments.length === 0 && worm.segments[0]) {
    segments.push({ x: round1(worm.segments[0].x), y: round1(worm.segments[0].y) })
  }
  return {
    uid: worm.uid,
    seat: worm.seat,
    kind: worm.kind,
    name: worm.name,
    angle: round2(worm.angle),
    size: worm.size,
    kills: worm.kills,
    expression: worm.expression,
    alive: worm.alive,
    boost: worm.boost,
    color: worm.color,
    midColor: worm.midColor,
    invuln: round1(worm.invuln),
    respawnIn: round1(worm.respawnIn),
    segments,
  }
}

function applyWorm(target: Worm, src: ReturnType<typeof serializeWorm>) {
  target.seat = src.seat
  target.kind = src.kind
  target.name = src.name
  target.angle = src.angle
  target.size = src.size
  target.kills = src.kills
  target.expression = src.expression
  target.alive = src.alive
  target.boost = src.boost
  target.color = src.color
  target.midColor = src.midColor
  target.invuln = src.invuln
  target.respawnIn = src.respawnIn
  target.segments = src.segments.map((s) => ({ ...s }))
}

function makeHuman(seat: PlayerId, name: string, color: string): Worm {
  const spot = seat === 1
    ? { x: WORLD_WIDTH * 0.35, y: WORLD_HEIGHT * 0.5 }
    : { x: WORLD_WIDTH * 0.65, y: WORLD_HEIGHT * 0.5 }
  const angle = seat === 1 ? 0 : Math.PI
  return {
    uid: `p${seat}`,
    seat,
    kind: 'human',
    name,
    segments: buildSegments(spot.x, spot.y, angle, START_LENGTH),
    angle,
    size: HEAD_SIZE,
    kills: 0,
    expression: 'happy',
    alive: true,
    boost: false,
    color,
    midColor: shade(color, 0.35),
    invuln: 1,
    respawnIn: 0,
    aiTimer: 0,
    aiTurn: 0,
  }
}

function makeBots(n: number): Worm[] {
  const bots: Worm[] = []
  const used = new Set<string>()
  for (let i = 0; i < n; i++) {
    let name = BOT_NAMES[randInt(0, BOT_NAMES.length - 1)]!
    let tries = 0
    while (used.has(name) && tries < 20) {
      name = BOT_NAMES[randInt(0, BOT_NAMES.length - 1)]!
      tries++
    }
    used.add(name)
    const color = FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!
    const spot = randomSpawn()
    const angle = Math.random() * Math.PI * 2
    const len = START_LENGTH + randInt(0, 18)
    bots.push({
      uid: `bot-${i}-${Math.random().toString(36).slice(2, 7)}`,
      seat: 0,
      kind: 'bot',
      name,
      segments: buildSegments(spot.x, spot.y, angle, len),
      angle,
      size: HEAD_SIZE,
      kills: 0,
      expression: 'happy',
      alive: true,
      boost: false,
      color,
      midColor: shade(color, 0.35),
      invuln: 0.5,
      respawnIn: 0,
      aiTimer: Math.random(),
      aiTurn: 0,
    })
  }
  return bots
}

function buildSegments(x: number, y: number, angle: number, length: number) {
  const segments = []
  for (let i = 0; i < length; i++) {
    segments.push({
      x: x - Math.cos(angle) * SEGMENT_GAP * i,
      y: y - Math.sin(angle) * SEGMENT_GAP * i,
    })
  }
  return segments
}

function spawnFoods(n: number) {
  const list: SnakeFood[] = []
  for (let i = 0; i < n; i++) list.push(randomFood())
  return list
}

function randomFood(): SnakeFood {
  return {
    x: rand(WORLD_PAD + 30, WORLD_WIDTH - WORLD_PAD - 30),
    y: rand(WORLD_PAD + 30, WORLD_HEIGHT - WORLD_PAD - 30),
    size: rand(2.5, 5.5),
    color: FOOD_COLORS[randInt(0, FOOD_COLORS.length - 1)]!,
  }
}

function randomSpawn() {
  return {
    x: rand(WORLD_PAD + 120, WORLD_WIDTH - WORLD_PAD - 120),
    y: rand(WORLD_PAD + 120, WORLD_HEIGHT - WORLD_PAD - 120),
  }
}

function hitsBody(attacker: Worm, target: Worm) {
  const head = attacker.segments[0]!
  for (let i = 5; i < target.segments.length; i += 2) {
    const s = target.segments[i]!
    if (Math.hypot(head.x - s.x, head.y - s.y) < attacker.size + target.size * 0.8) {
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

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}
