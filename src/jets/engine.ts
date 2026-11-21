/**
 * Face-Off Jets — TypeScript shmup adapted from DanMat/Space-Jam (MIT).
 * See ./NOTICE.md and ./LICENSE.
 */
import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import { ARENA_HEIGHT, ARENA_WIDTH, ENEMY, P1_COLOR, P2_COLOR, POWER } from './constants'
import { LEVELS, type EnemyId, type LevelDef } from './levels'
import type {
  Bullet,
  JetBoss,
  JetEnemy,
  JetPilot,
  JetsPhase,
  JetsSettings,
  JetsSnapshot,
  Particle,
  PowerUp,
  Star,
} from './types'

const PHYSICS_DT = 1 / 60

export class JetsEngine {
  pilots: JetPilot[] = []
  enemies: JetEnemy[] = []
  pbul: Bullet[] = []
  ebul: Bullet[] = []
  missiles: Bullet[] = []
  powerups: PowerUp[] = []
  parts: Particle[] = []
  stars: Star[] = []
  boss: JetBoss | null = null
  phase: JetsPhase = 'intro'
  levelIndex = 0
  lvl: LevelDef = LEVELS[0]!
  score = 0
  lives = 3
  bombs = 3
  combo = 0
  killed = 0
  quota = 0
  toast = ''
  won = false
  shake = 0

  private settings: JetsSettings
  private input: InputManager
  private onSnapshot: (s: JetsSnapshot) => void
  private onShoot: () => void
  private onHit: () => void
  private onBoom: () => void
  private onPower: () => void
  private onHurt: () => void
  private onWin: () => void
  private onLose: () => void
  private raf = 0
  private running = false
  private lastTime = 0
  private accumulator = 0
  private spawnTimer = 0
  private bossPending = false
  private introTimer = 0
  private clearedTimer = 0
  private toastTimer = 0
  private scrollX = 0
  networkRole: 'local' | 'host' | 'guest' = 'local'

  constructor(
    settings: JetsSettings,
    input: InputManager,
    hooks: {
      onSnapshot: (s: JetsSnapshot) => void
      onShoot: () => void
      onHit: () => void
      onBoom: () => void
      onPower: () => void
      onHurt: () => void
      onWin: () => void
      onLose: () => void
    },
  ) {
    this.settings = settings
    this.input = input
    this.onSnapshot = hooks.onSnapshot
    this.onShoot = hooks.onShoot
    this.onHit = hooks.onHit
    this.onBoom = hooks.onBoom
    this.onPower = hooks.onPower
    this.onHurt = hooks.onHurt
    this.onWin = hooks.onWin
    this.onLose = hooks.onLose
    this.makeStars()
    this.startCampaign()
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
    this.won = false
    this.score = 0
    this.lives = 3
    this.bombs = 3
    this.combo = 0
    this.startCampaign()
    this.emit()
  }

  useBomb() {
    if (this.bombs <= 0 || this.phase !== 'playing') return
    this.bombs -= 1
    this.shake = 0.9
    this.ebul = []
    this.onBoom()
    for (let i = this.enemies.length - 1; i >= 0; i--) this.damageEnemy(i, 3)
    if (this.boss && !this.boss.entering) {
      this.boss.hp -= 40
      this.burst(this.boss.x, this.boss.y, this.boss.color, 20)
      if (this.boss.hp <= 0) this.killBoss()
    }
    this.showToast('SMART BOMB!')
    this.emit()
  }

  private startCampaign() {
    this.levelIndex = 0
    this.beginLevel(0)
  }

  private beginLevel(index: number) {
    this.levelIndex = index
    this.lvl = LEVELS[index]!
    this.killed = 0
    this.quota = this.lvl.quota
    this.enemies = []
    this.pbul = []
    this.ebul = []
    this.missiles = []
    this.powerups = []
    this.parts = []
    this.boss = null
    this.bossPending = false
    this.spawnTimer = 0.8
    this.combo = 0
    this.pilots = [makePilot(1, 140, ARENA_HEIGHT * 0.45, P1_COLOR)]
    if (this.settings.coop) {
      this.pilots.push(makePilot(2, 140, ARENA_HEIGHT * 0.6, P2_COLOR))
    }
    this.phase = 'intro'
    this.introTimer = 2.2
    this.showToast(`${this.lvl.name} — ${this.lvl.tag}`)
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
      // Bomb edge (local: B/Shift · online: Shift as action B)
      const bomb =
        this.input.localMode === 'both'
          ? this.input.consumeJustPressed('ShiftLeft') || this.input.consumeJustPressed('KeyB')
          : this.input.seatActionB(1) || this.input.seatActionB(2)
      if (bomb) this.useBomb()
      this.input.endFrame()
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private step(dt: number) {
    this.shake = Math.max(0, this.shake - dt)
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) this.toast = ''
    }
    this.scrollStars(dt)

    if (this.phase === 'intro') {
      this.introTimer -= dt
      if (this.introTimer <= 0) {
        this.phase = 'playing'
        this.emit()
      }
      return
    }

    if (this.phase === 'cleared') {
      this.clearedTimer -= dt
      if (this.clearedTimer <= 0) {
        if (this.levelIndex + 1 >= LEVELS.length) {
          this.phase = 'victory'
          this.won = true
          this.onWin()
          this.emit()
        } else {
          this.beginLevel(this.levelIndex + 1)
        }
      }
      return
    }

    if (this.phase === 'bossWarn') {
      this.introTimer -= dt
      if (this.introTimer <= 0) {
        this.spawnBossNow()
        this.phase = 'playing'
      }
      return
    }

    if (this.phase !== 'playing') return

    for (const p of this.pilots) {
      if (p.alive) this.updatePilot(p, dt)
    }
    this.updateSpawning(dt)
    this.updateEnemies(dt)
    if (this.boss) this.updateBoss(dt)
    this.updatePBullets(dt)
    this.updateMissiles(dt)
    this.updateEBullets(dt)
    this.updatePowerups(dt)
    this.updateParts(dt)
    this.emit()
  }

  private updatePilot(p: JetPilot, dt: number) {
    const seat = p.id
    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()
    const f = dt * 60
    p.x += move.x * p.speed * f
    p.y += move.y * p.speed * f
    p.x = clamp(p.x, 40, ARENA_WIDTH * 0.55)
    p.y = clamp(p.y, 40, ARENA_HEIGHT - 40)
    if (p.iframe > 0) p.iframe -= dt
    if (p.shield > 0) p.shield -= dt
    if (p.rapid > 0) p.rapid -= dt
    p.fireTimer -= dt
    if (p.fireTimer <= 0) {
      p.fireTimer = p.rapid > 0 ? p.fireRate * 0.55 : p.fireRate
      this.fireMain(p)
    }
    if (p.homing) {
      p.homingTimer -= dt
      if (p.homingTimer <= 0) {
        p.homingTimer = 0.5
        this.fireMissiles(p)
      }
    }
  }

  private fireMain(p: JetPilot) {
    const n = p.power
    let angles: number[]
    if (n === 1) angles = [0]
    else if (n === 2) angles = [-0.05, 0.05]
    else if (n === 3) angles = [-0.14, 0, 0.14]
    else if (n === 4) angles = [-0.2, -0.07, 0.07, 0.2]
    else angles = [-0.26, -0.13, 0, 0.13, 0.26]
    const sp = 12
    for (const a of angles) {
      this.pbul.push({
        x: p.x + p.w / 2,
        y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 4,
        dmg: 1,
        owner: p.id,
      })
    }
    this.onShoot()
  }

  private fireMissiles(p: JetPilot) {
    for (const dy of [-12, 12]) {
      this.missiles.push({
        x: p.x,
        y: p.y + dy,
        vx: 4,
        vy: dy * 0.15,
        r: 5,
        dmg: 2,
        life: 2.5,
        owner: p.id,
      })
    }
  }

  private updateSpawning(dt: number) {
    if (this.bossPending || this.boss) return
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.lvl.spawnEvery
      if (Math.random() < this.lvl.formations) this.spawnFormation()
      else this.spawnEnemy(pick(this.lvl.enemies))
    }
    if (this.killed >= this.quota) this.queueBoss()
  }

  private queueBoss() {
    this.bossPending = true
    this.phase = 'bossWarn'
    this.introTimer = 1.0
    this.showToast(`⚠ ${this.lvl.boss.name}`)
  }

  private spawnBossNow() {
    this.boss = {
      x: ARENA_WIDTH + 120,
      y: ARENA_HEIGHT / 2,
      tx: ARENA_WIDTH - 180,
      w: 130,
      h: 140,
      hp: this.lvl.boss.hp,
      maxHp: this.lvl.boss.hp,
      color: this.lvl.boss.color,
      name: this.lvl.boss.name,
      t: 0,
      fireTimer: 1.5,
      moveDir: 1,
      flash: 0,
      entering: true,
    }
    this.bossPending = false
  }

  private spawnEnemy(type: EnemyId, y?: number): JetEnemy {
    const b = ENEMY[type]
    const e: JetEnemy = {
      type,
      x: ARENA_WIDTH + 40,
      y: y ?? rand(60, ARENA_HEIGHT - 60),
      baseY: 0,
      w: b.w,
      h: b.h,
      hp: b.hp,
      maxHp: b.hp,
      speed: b.speed,
      behavior: b.behavior,
      color: b.color,
      score: b.score,
      fire: b.fire || 0,
      spread: Boolean(b.spread),
      fireTimer: rand(0.5, 1.5),
      t: rand(0, Math.PI * 2),
      amp: rand(30, 70),
      flash: 0,
      dropsPower: Math.random() < 0.14,
    }
    e.baseY = e.y
    this.enemies.push(e)
    return e
  }

  private spawnFormation() {
    const type = pick(this.lvl.enemies)
    const y0 = rand(90, ARENA_HEIGHT - 180)
    const n = 4 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const e = this.spawnEnemy(type, y0 + i * (ENEMY[type].h + 14))
      e.x = ARENA_WIDTH + 40 + i * 28
    }
    this.enemies[this.enemies.length - 1]!.dropsPower = true
  }

  private updateEnemies(dt: number) {
    const f = dt * 60
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!
      e.x -= e.speed * f
      if (e.behavior === 'sine') {
        e.t += dt * 3
        e.y = e.baseY + Math.sin(e.t) * e.amp
      } else if (e.behavior === 'diver') {
        const target = this.nearestPilot(e.x, e.y)
        if (e.x > ARENA_WIDTH * 0.5 && target) {
          e.y += Math.sign(target.y - e.y) * 2.4 * f
        }
      } else if (e.behavior === 'homing') {
        const target = this.nearestPilot(e.x, e.y)
        if (target) e.y += clamp(target.y - e.y, -3.2, 3.2) * f
      }
      if (e.flash > 0) e.flash -= dt
      if (e.fire > 0) {
        e.fireTimer -= dt
        if (e.fireTimer <= 0 && e.x < ARENA_WIDTH - 20) {
          e.fireTimer = e.fire
          this.enemyFire(e)
        }
      }
      for (const p of this.pilots) {
        if (!p.alive || p.iframe > 0 || p.shield > 0) continue
        if (hitRect(e, p)) {
          this.burst(e.x, e.y, e.color, 10)
          this.enemies.splice(i, 1)
          this.loseLife(p)
          break
        }
      }
      if (e.x < -60) this.enemies.splice(i, 1)
    }
  }

  private enemyFire(e: JetEnemy) {
    const target = this.nearestPilot(e.x, e.y)
    if (!target) return
    const ang = Math.atan2(target.y - e.y, target.x - e.x)
    const sp = 4.2
    if (e.spread) {
      for (let k = -1; k <= 1; k++) this.ebul.push(mkeb(e.x, e.y, ang + k * 0.2, sp))
    } else {
      this.ebul.push(mkeb(e.x, e.y, ang, sp))
    }
  }

  private updateBoss(dt: number) {
    const b = this.boss!
    const f = dt * 60
    if (b.entering) {
      b.x -= 3 * f
      if (b.x <= b.tx) {
        b.x = b.tx
        b.entering = false
      }
    } else {
      b.t += dt
      b.y += b.moveDir * 1.6 * f
      if (b.y < 100) {
        b.y = 100
        b.moveDir = 1
      } else if (b.y > ARENA_HEIGHT - 100) {
        b.y = ARENA_HEIGHT - 100
        b.moveDir = -1
      }
      b.fireTimer -= dt
      if (b.fireTimer <= 0) {
        b.fireTimer = clamp(1.3 - this.levelIndex * 0.06, 0.5, 1.3)
        this.bossFire()
      }
    }
    if (b.flash > 0) b.flash -= dt
    for (const p of this.pilots) {
      if (!p.alive || p.iframe > 0 || p.shield > 0) continue
      if (Math.abs(p.x - b.x) < b.w / 2 + p.w / 2 && Math.abs(p.y - b.y) < b.h / 2 + p.h / 2) {
        this.loseLife(p)
      }
    }
  }

  private bossFire() {
    const b = this.boss!
    const target = this.nearestPilot(b.x, b.y)
    if (!target) return
    const aim = Math.atan2(target.y - b.y, target.x - b.x)
    for (let k = -2; k <= 2; k++) {
      this.ebul.push(mkeb(b.x - b.w / 2, b.y, aim + k * 0.16, 4.4))
    }
    if (Math.random() < 0.4) {
      const e = this.spawnEnemy(pick(this.lvl.enemies), b.y)
      e.x = b.x - b.w / 2
    }
  }

  private killBoss() {
    if (!this.boss) return
    this.burst(this.boss.x, this.boss.y, this.boss.color, 40)
    this.shake = 1
    this.onBoom()
    this.score += 2000 * (this.levelIndex + 1)
    this.showToast(`${this.boss.name} DESTROYED`)
    this.boss = null
    this.bossPending = true
    this.phase = 'cleared'
    this.clearedTimer = 1.4
    this.bombs = Math.min(5, this.bombs + 1)
  }

  private updatePBullets(dt: number) {
    const f = dt * 60
    for (let i = this.pbul.length - 1; i >= 0; i--) {
      const b = this.pbul[i]!
      b.x += b.vx * f
      b.y += b.vy * f
      if (b.x > ARENA_WIDTH + 20 || b.y < -20 || b.y > ARENA_HEIGHT + 20) {
        this.pbul.splice(i, 1)
        continue
      }
      if (this.hitBoss(b)) {
        this.pbul.splice(i, 1)
        continue
      }
      let done = false
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j]!
        if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
          this.damageEnemy(j, b.dmg)
          done = true
          break
        }
      }
      if (done) this.pbul.splice(i, 1)
    }
  }

  private updateMissiles(dt: number) {
    const f = dt * 60
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i]!
      m.life = (m.life ?? 2) - dt
      const tgt = this.nearestHostile(m.x, m.y)
      if (tgt) {
        const a = Math.atan2(tgt.y - m.y, tgt.x - m.x)
        m.vx += Math.cos(a) * 0.6 * f
        m.vy += Math.sin(a) * 0.6 * f
      }
      const mag = Math.hypot(m.vx, m.vy)
      if (mag > 7) {
        m.vx *= 7 / mag
        m.vy *= 7 / mag
      }
      m.x += m.vx * f
      m.y += m.vy * f
      if ((m.life ?? 0) <= 0 || m.x > ARENA_WIDTH + 20 || m.x < -20) {
        this.missiles.splice(i, 1)
        continue
      }
      if (this.hitBoss(m)) {
        this.missiles.splice(i, 1)
        continue
      }
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j]!
        if (Math.abs(m.x - e.x) < e.w / 2 + 4 && Math.abs(m.y - e.y) < e.h / 2 + 4) {
          this.damageEnemy(j, m.dmg)
          this.burst(m.x, m.y, '#00e5ff', 5)
          this.missiles.splice(i, 1)
          break
        }
      }
    }
  }

  private hitBoss(b: Bullet) {
    if (!this.boss || this.boss.entering) return false
    if (Math.abs(b.x - this.boss.x) < this.boss.w / 2 && Math.abs(b.y - this.boss.y) < this.boss.h / 2) {
      this.boss.hp -= b.dmg
      this.boss.flash = 0.05
      this.burst(b.x, b.y, '#fff', 3)
      if (this.boss.hp <= 0) this.killBoss()
      return true
    }
    return false
  }

  private updateEBullets(dt: number) {
    const f = dt * 60
    for (let i = this.ebul.length - 1; i >= 0; i--) {
      const b = this.ebul[i]!
      b.x += b.vx * f
      b.y += b.vy * f
      if (b.x < -20 || b.x > ARENA_WIDTH + 20 || b.y < -20 || b.y > ARENA_HEIGHT + 20) {
        this.ebul.splice(i, 1)
        continue
      }
      for (const p of this.pilots) {
        if (!p.alive || p.iframe > 0 || p.shield > 0) continue
        if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.w / 2) ** 2) {
          this.loseLife(p)
          return
        }
      }
    }
  }

  private updatePowerups(dt: number) {
    const f = dt * 60
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const u = this.powerups[i]!
      u.x += u.vx * f
      u.t += dt
      u.y += Math.sin(u.t * 3) * 0.6 * f
      if (u.x < -30) {
        this.powerups.splice(i, 1)
        continue
      }
      for (const p of this.pilots) {
        if (!p.alive) continue
        if (Math.abs(u.x - p.x) < 28 && Math.abs(u.y - p.y) < 24) {
          this.applyPower(p, u.kind)
          this.powerups.splice(i, 1)
          break
        }
      }
    }
  }

  private applyPower(p: JetPilot, kind: string) {
    if (kind === 'W') p.power = Math.min(5, p.power + 1)
    else if (kind === 'H') p.homing = true
    else if (kind === 'R') p.rapid = 8
    else if (kind === 'S') p.shield = 6
    else if (kind === 'B') this.bombs = Math.min(5, this.bombs + 1)
    else if (kind === 'L') {
      this.lives = Math.min(5, this.lives + 1)
      this.score += 200
    }
    p.expression = 'amazed'
    this.onPower()
    this.showToast(POWER[kind]?.name ?? kind)
  }

  private damageEnemy(i: number, dmg: number) {
    const e = this.enemies[i]
    if (!e) return
    e.hp -= dmg
    e.flash = 0.07
    if (e.hp <= 0) {
      this.score += Math.round(e.score * this.comboMul())
      this.combo += 1
      this.killed += 1
      this.burst(e.x, e.y, e.color, 12)
      this.onHit()
      if (e.dropsPower) this.dropPower(e.x, e.y)
      this.enemies.splice(i, 1)
    }
  }

  private dropPower(x: number, y: number) {
    const keys = ['W', 'W', 'H', 'R', 'S', 'B', 'L']
    this.powerups.push({ x, y, kind: keys[(Math.random() * keys.length) | 0]!, vx: -1.4, t: 0 })
  }

  private loseLife(p: JetPilot) {
    this.ebul = []
    this.combo = 0
    this.onHurt()
    this.shake = 0.5
    if (p.power > 1) p.power -= 1
    p.iframe = 2
    p.expression = 'sad'
    this.lives -= 1
    if (this.lives <= 0) {
      p.alive = false
      this.phase = 'gameover'
      this.won = false
      this.onLose()
      this.emit()
      return
    }
    this.showToast('HIT!')
  }

  private nearestPilot(x: number, y: number) {
    let best: JetPilot | null = null
    let bd = Infinity
    for (const p of this.pilots) {
      if (!p.alive) continue
      const d = dist2(x, y, p.x, p.y)
      if (d < bd) {
        bd = d
        best = p
      }
    }
    return best
  }

  private nearestHostile(x: number, y: number) {
    let best: { x: number; y: number } | null =
      this.boss && !this.boss.entering ? this.boss : null
    let bd = best ? dist2(x, y, this.boss!.x, this.boss!.y) : Infinity
    for (const e of this.enemies) {
      const d = dist2(x, y, e.x, e.y)
      if (d < bd) {
        bd = d
        best = e
      }
    }
    return best
  }

  private comboMul() {
    return 1 + Math.min(this.combo, 20) * 0.1
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x,
        y,
        vx: rand(-4, 4),
        vy: rand(-4, 4),
        life: 1,
        color,
      })
    }
  }

  private updateParts(dt: number) {
    const f = dt * 60
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!
      p.x += p.vx * f
      p.y += p.vy * f
      p.vx *= 0.92
      p.vy *= 0.92
      p.life -= dt * 2
      if (p.life <= 0) this.parts.splice(i, 1)
    }
  }

  private makeStars() {
    this.stars = []
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        speed: 0.6 + Math.random() * 2.4,
        size: 1 + Math.random() * 2,
      })
    }
  }

  private scrollStars(dt: number) {
    const mul = this.lvl ? this.lvl.scrollSpeed / 2.5 : 1
    const f = dt * 60 * mul
    this.scrollX += f
    for (const s of this.stars) {
      s.x -= s.speed * f
      if (s.x < 0) {
        s.x = ARENA_WIDTH
        s.y = Math.random() * ARENA_HEIGHT
      }
    }
  }

  private showToast(msg: string) {
    this.toast = msg
    this.toastTimer = 1.6
  }

  private emit() {
    this.onSnapshot(this.getSnapshot())
  }

  getSnapshot(): JetsSnapshot {
    const p1 = this.pilots[0]
    const p2 = this.pilots[1]
    return {
      phase: this.phase,
      levelIndex: this.levelIndex,
      levelName: this.lvl.name,
      levelTag: this.lvl.tag,
      score: this.score,
      lives: this.lives,
      bombs: this.bombs,
      killed: this.killed,
      quota: this.quota,
      combo: this.combo,
      power: p1?.power ?? 1,
      homing: Boolean(p1?.homing),
      shield: p1?.shield ?? 0,
      rapid: p1?.rapid ?? 0,
      bossHp: this.boss?.hp ?? 0,
      bossMax: this.boss?.maxHp ?? 0,
      bossName: this.boss?.name ?? null,
      toast: this.toast,
      expression1: p1?.expression ?? 'happy',
      expression2: p2?.expression ?? 'happy',
      won: this.won,
    }
  }

  exportNetworkState() {
    return {
      phase: this.phase,
      levelIndex: this.levelIndex,
      score: this.score,
      lives: this.lives,
      bombs: this.bombs,
      killed: this.killed,
      quota: this.quota,
      combo: this.combo,
      toast: this.toast,
      won: this.won,
      pilots: this.pilots.map((p) => ({ ...p })),
      enemies: this.enemies.map((e) => ({ ...e })),
      boss: this.boss ? { ...this.boss } : null,
      pbul: this.pbul.map((b) => ({ ...b })),
      ebul: this.ebul.map((b) => ({ ...b })),
      missiles: this.missiles.map((b) => ({ ...b })),
      powerups: this.powerups.map((u) => ({ ...u })),
    }
  }

  applyNetworkState(state: ReturnType<JetsEngine['exportNetworkState']>) {
    this.phase = state.phase
    this.levelIndex = state.levelIndex
    this.lvl = LEVELS[state.levelIndex]!
    this.score = state.score
    this.lives = state.lives
    this.bombs = state.bombs
    this.killed = state.killed
    this.quota = state.quota
    this.combo = state.combo
    this.toast = state.toast
    this.won = state.won
    this.pilots = state.pilots.map((p) => ({ ...p }))
    this.enemies = state.enemies.map((e) => ({ ...e }))
    this.boss = state.boss ? { ...state.boss } : null
    this.pbul = state.pbul.map((b) => ({ ...b }))
    this.ebul = state.ebul.map((b) => ({ ...b }))
    this.missiles = state.missiles.map((b) => ({ ...b }))
    this.powerups = state.powerups.map((u) => ({ ...u }))
    this.emit()
  }
}

function makePilot(id: PlayerId, x: number, y: number, color: string): JetPilot {
  const expression: Expression = 'happy'
  return {
    id,
    x,
    y,
    w: 44,
    h: 28,
    speed: 5.2,
    power: 1,
    homing: false,
    homingTimer: 0,
    rapid: 0,
    shield: 0,
    fireTimer: 0,
    fireRate: 0.18,
    iframe: 1.5,
    alive: true,
    expression,
    color,
  }
}

function mkeb(x: number, y: number, ang: number, sp: number): Bullet {
  return { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5, dmg: 1 }
}

function hitRect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function pick<T>(a: T[]): T {
  return a[(Math.random() * a.length) | 0]!
}
