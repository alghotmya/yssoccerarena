/**
 * Face-Off Jets — TypeScript shmup adapted from DanMat/Space-Jam (MIT).
 * See ./NOTICE.md and ./LICENSE.
 */
import { InputManager } from '../game/input'
import type { Expression, PlayerId } from '../types'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ENEMY,
  MAX_BOMBS,
  MAX_LIVES,
  MAX_POWER,
  P1_COLOR,
  P2_COLOR,
  POWER,
} from './constants'
import { DIFF, type DiffPreset } from './difficulty'
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
const HERO_MAX = 100

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
  maxCombo = 0
  killed = 0
  quota = 0
  toast = ''
  won = false
  shake = 0
  rank = '—'
  sectorBonus = 0
  heroMeter = 0
  heroActive = 0
  perfectStreak = 0

  private settings: JetsSettings
  private diff: DiffPreset
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
  scrollX = 0
  private hitsThisLevel = 0
  private comboDecay = 0
  private secondWindUsed = false
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
    this.diff = DIFF[settings.difficulty] ?? DIFF.normal
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
    this.combo = 0
    this.maxCombo = 0
    this.rank = '—'
    this.sectorBonus = 0
    this.heroMeter = 0
    this.heroActive = 0
    this.perfectStreak = 0
    this.secondWindUsed = false
    this.startCampaign()
    this.emit()
  }

  useBomb() {
    if (this.bombs <= 0 || this.phase !== 'playing') return
    this.bombs -= 1
    this.triggerScreenClear(4 + Math.floor(this.levelIndex / 2), 45 + this.levelIndex * 5)
    this.showToast('SMART BOMB!')
    this.emit()
  }

  /** Activate hero burst when meter is full (Space or auto on baby). */
  useHeroBurst() {
    if (this.heroMeter < HERO_MAX || this.heroActive > 0 || this.phase !== 'playing') return
    this.heroMeter = 0
    this.heroActive = 6
    this.triggerScreenClear(6, 70 + this.levelIndex * 6)
    for (const p of this.pilots) {
      if (!p.alive) continue
      p.shield = Math.max(p.shield, 5)
      p.mega = Math.max(p.mega, 6)
      p.rapid = Math.max(p.rapid, 5)
      p.power = Math.min(MAX_POWER, p.power + 1)
      p.expression = 'amazed'
    }
    this.showToast('HERO BURST!')
    this.emit()
  }

  private triggerScreenClear(enemyDmg: number, bossDmg: number) {
    this.shake = 0.9
    this.ebul = []
    this.onBoom()
    for (let i = this.enemies.length - 1; i >= 0; i--) this.damageEnemy(i, enemyDmg)
    if (this.boss && !this.boss.entering) {
      this.boss.hp -= bossDmg
      this.burst(this.boss.x, this.boss.y, this.boss.color, 24)
      if (this.boss.hp <= 0) this.killBoss()
    }
  }

  private startCampaign() {
    this.lives = this.diff.lives
    this.bombs = this.diff.bombs
    this.levelIndex = 0
    this.beginLevel(0)
  }

  private beginLevel(index: number) {
    this.levelIndex = index
    this.lvl = LEVELS[index]!
    this.killed = 0
    this.quota = Math.max(8, Math.round(this.lvl.quota * this.diff.quotaMul))
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
    this.hitsThisLevel = 0
    this.sectorBonus = 0
    this.rank = '—'
    this.secondWindUsed = false
    const keep = this.pilots.map((p) => ({
      power: Math.max(1, p.power - (p.power > 3 ? 1 : 0)),
      homing: p.homing,
      rapid: Math.max(0, p.rapid * 0.25),
      pierce: Math.max(0, p.pierce * 0.2),
      mega: 0,
      shield: 0,
    }))
    const spd = 5.4 * this.diff.playerSpeed
    this.pilots = [makePilot(1, 140, ARENA_HEIGHT * 0.42, P1_COLOR, '#ffb347', spd)]
    if (this.settings.coop) {
      this.pilots.push(makePilot(2, 140, ARENA_HEIGHT * 0.62, P2_COLOR, '#7ec8ff', spd))
    }
    for (let i = 0; i < this.pilots.length; i++) {
      const p = this.pilots[i]!
      p.fireRate = 0.17 * this.diff.fireRateMul
      const prev = keep[i]
      if (index === 0) {
        p.power = this.diff.startPower
        p.homing = this.diff.startHoming
        p.shield = this.diff.startShield
      } else if (prev) {
        p.power = Math.min(MAX_POWER, Math.max(prev.power, index >= 2 ? 2 : 1))
        p.homing = prev.homing
        p.rapid = prev.rapid
        p.pierce = prev.pierce
      }
      if (index > 0 && index % 2 === 1) {
        p.power = Math.min(MAX_POWER, p.power + 1)
        p.shield = Math.max(p.shield, 2.5)
      }
      p.iframe = 1.8 * this.diff.iframeMul
    }
    this.phase = 'intro'
    this.introTimer = 2.2
    this.showToast(`${this.lvl.name} · ${this.diff.label}`)
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
      // Hero burst: Space / Enter (local) · Space online
      const hero =
        this.input.localMode === 'both'
          ? this.input.consumeJustPressed('Space') || this.input.consumeJustPressed('Enter')
          : this.input.seatActionA(1) || this.input.seatActionA(2)
      if (hero) this.useHeroBurst()
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

    if (this.combo > 0) {
      this.comboDecay -= dt
      if (this.comboDecay <= 0) {
        this.combo = Math.max(0, this.combo - 1)
        this.comboDecay = 1.2
      }
    }
    if (this.heroActive > 0) this.heroActive -= dt
    // Baby/easy: auto-burst when meter full and under heavy fire
    if (
      this.diff.bulletAssist &&
      this.heroMeter >= HERO_MAX &&
      this.ebul.length > 18 &&
      this.heroActive <= 0
    ) {
      this.useHeroBurst()
    }

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
    if (this.diff.bulletAssist) this.assistClearNearBullets()
    this.emit()
  }

  private assistClearNearBullets() {
    for (const p of this.pilots) {
      if (!p.alive) continue
      for (let i = this.ebul.length - 1; i >= 0; i--) {
        const b = this.ebul[i]!
        if (dist2(b.x, b.y, p.x, p.y) < 28 * 28) {
          this.ebul.splice(i, 1)
          this.parts.push({
            x: b.x,
            y: b.y,
            vx: rand(-1, 1),
            vy: rand(-1, 1),
            life: 0.3,
            color: '#7ef0ff',
          })
        }
      }
    }
  }

  private updatePilot(p: JetPilot, dt: number) {
    const seat = p.id
    const move = seat === 1 ? this.input.getPlayer1Move() : this.input.getPlayer2Move()
    const f = dt * 60
    const heroBoost = this.heroActive > 0 ? 1.15 : 1
    const spd = p.speed * (p.mega > 0 ? 1.12 : 1) * heroBoost
    p.x += move.x * spd * f
    p.y += move.y * spd * f
    p.x = clamp(p.x, 40, ARENA_WIDTH * 0.55)
    p.y = clamp(p.y, 40, ARENA_HEIGHT - 40)
    if (p.iframe > 0) p.iframe -= dt
    if (p.shield > 0) p.shield -= dt
    if (p.rapid > 0) p.rapid -= dt
    if (p.pierce > 0) p.pierce -= dt
    if (p.mega > 0) p.mega -= dt
    p.fireTimer -= dt
    if (p.fireTimer <= 0) {
      const rate =
        p.rapid > 0 ? p.fireRate * 0.42 : p.mega > 0 ? p.fireRate * 0.7 : p.fireRate
      p.fireTimer = rate * (this.heroActive > 0 ? 0.75 : 1)
      this.fireMain(p)
    }
    if (p.homing) {
      p.homingTimer -= dt
      if (p.homingTimer <= 0) {
        p.homingTimer = p.rapid > 0 ? 0.35 : 0.48
        this.fireMissiles(p)
      }
    }
    if (Math.random() < 0.55) {
      this.parts.push({
        x: p.x - 26,
        y: p.y + rand(-4, 4),
        vx: rand(-3.5, -1.2),
        vy: rand(-1.2, 1.2),
        life: 0.45,
        color: this.heroActive > 0 ? '#ffd23f' : p.id === 1 ? '#ff8a3d' : '#5ecbff',
      })
    }
  }

  private fireMain(p: JetPilot) {
    const n = Math.min(MAX_POWER, p.power)
    let angles: number[]
    if (n === 1) angles = [0]
    else if (n === 2) angles = [-0.06, 0.06]
    else if (n === 3) angles = [-0.15, 0, 0.15]
    else if (n === 4) angles = [-0.22, -0.08, 0.08, 0.22]
    else if (n === 5) angles = [-0.28, -0.14, 0, 0.14, 0.28]
    else angles = [-0.34, -0.2, -0.08, 0.08, 0.2, 0.34]
    const sp = p.mega > 0 ? 15 : 12.5
    const dmg = (p.mega > 0 ? 2 : 1) + (n >= 5 ? 1 : 0)
    const r = p.mega > 0 ? 6 : p.pierce > 0 ? 5 : 4
    for (const a of angles) {
      this.pbul.push({
        x: p.x + p.w / 2,
        y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r,
        dmg,
        life: p.pierce > 0 ? 3 : 1,
        owner: p.id,
      })
    }
    this.onShoot()
  }

  private fireMissiles(p: JetPilot) {
    const dyList = p.power >= 4 ? [-16, 0, 16] : [-12, 12]
    for (const dy of dyList) {
      this.missiles.push({
        x: p.x,
        y: p.y + dy,
        vx: 4.5,
        vy: dy * 0.12,
        r: 5,
        dmg: 2 + (p.mega > 0 ? 1 : 0),
        life: 2.8,
        owner: p.id,
      })
    }
  }

  private updateSpawning(dt: number) {
    if (this.bossPending || this.boss) return
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.lvl.spawnEvery * this.diff.spawnMul
      const formChance = Math.min(0.85, this.lvl.formations * this.diff.formationMul)
      if (Math.random() < formChance) this.spawnFormation()
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
    const hp = Math.max(30, Math.round(this.lvl.boss.hp * this.diff.bossHp))
    this.boss = {
      x: ARENA_WIDTH + 120,
      y: ARENA_HEIGHT / 2,
      tx: ARENA_WIDTH - 180,
      w: 130,
      h: 140,
      hp,
      maxHp: hp,
      color: this.lvl.boss.color,
      name: this.lvl.boss.name,
      t: 0,
      fireTimer: 1.5 * this.diff.enemyFire,
      moveDir: 1,
      flash: 0,
      entering: true,
    }
    this.bossPending = false
  }

  private spawnEnemy(type: EnemyId, y?: number): JetEnemy {
    const b = ENEMY[type]
    const lvlScale = 1 + this.levelIndex * 0.08
    const hp = Math.max(1, Math.round(b.hp * lvlScale * this.diff.enemyHp))
    const e: JetEnemy = {
      type,
      x: ARENA_WIDTH + 40,
      y: y ?? rand(60, ARENA_HEIGHT - 60),
      baseY: 0,
      w: b.w,
      h: b.h,
      hp,
      maxHp: hp,
      speed: b.speed * (1 + this.levelIndex * 0.035) * this.diff.enemySpeed,
      behavior: b.behavior,
      color: b.color,
      score: Math.round(b.score * this.lvl.scoreMul * this.diff.scoreMul),
      fire: b.fire ? b.fire * this.diff.enemyFire : 0,
      spread: Boolean(b.spread),
      fireTimer: rand(0.5, 1.5) * this.diff.enemyFire,
      t: rand(0, Math.PI * 2),
      amp: rand(30, 70),
      flash: 0,
      dropsPower: Math.random() < this.lvl.dropRate * this.diff.dropMul,
    }
    e.baseY = e.y
    this.enemies.push(e)
    return e
  }

  private spawnFormation() {
    const type = pick(this.lvl.enemies)
    const y0 = rand(90, ARENA_HEIGHT - 180)
    const extra = this.diff.id === 'superhero' || this.diff.id === 'hard' ? 1 : 0
    const n = 4 + ((Math.random() * 3) | 0) + extra
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
    const sp = 4.2 * this.diff.eBulletMul
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
    const sp = 4.4 * this.diff.eBulletMul
    const fans = this.diff.id === 'superhero' ? 3 : 2
    for (let k = -fans; k <= fans; k++) {
      this.ebul.push(mkeb(b.x - b.w / 2, b.y, aim + k * 0.16, sp))
    }
    if (Math.random() < (this.diff.id === 'baby' ? 0.2 : 0.4)) {
      const e = this.spawnEnemy(pick(this.lvl.enemies), b.y)
      e.x = b.x - b.w / 2
    }
  }

  private killBoss() {
    if (!this.boss) return
    this.burst(this.boss.x, this.boss.y, this.boss.color, 40)
    this.shake = 1
    this.onBoom()
    const bossPts = Math.round(2200 * (this.levelIndex + 1) * this.lvl.scoreMul)
    this.score += bossPts
    this.applySectorClearRewards()
    this.showToast(`${this.boss.name} DOWN · RANK ${this.rank} · +${this.sectorBonus}`)
    this.boss = null
    this.bossPending = true
    this.phase = 'cleared'
    this.clearedTimer = 2.0
    this.bombs = Math.min(MAX_BOMBS, this.bombs + 1)
    this.dropPower(ARENA_WIDTH * 0.55, ARENA_HEIGHT * 0.45)
    this.dropPower(ARENA_WIDTH * 0.55, ARENA_HEIGHT * 0.55)
  }

  private applySectorClearRewards() {
    const lifeBonus = this.lives * 600
    const comboBonus = Math.min(this.maxCombo, 40) * 120
    const cleanBonus = this.hitsThisLevel === 0 ? 2500 : this.hitsThisLevel <= 1 ? 1000 : 0
    const streakBonus = this.hitsThisLevel === 0 ? this.perfectStreak * 800 : 0
    const base = this.lvl.clearBonus
    this.sectorBonus = Math.round(
      (base + lifeBonus + comboBonus + cleanBonus + streakBonus) * this.diff.scoreMul,
    )
    this.score += this.sectorBonus
    if (this.hitsThisLevel === 0) {
      this.perfectStreak += 1
      this.heroMeter = Math.min(HERO_MAX, this.heroMeter + 25 * this.diff.heroGain)
    } else {
      this.perfectStreak = 0
    }
    if (this.hitsThisLevel === 0 && this.maxCombo >= 12) this.rank = 'S'
    else if (this.hitsThisLevel <= 1 && this.combo >= 8) this.rank = 'A'
    else if (this.hitsThisLevel <= 3) this.rank = 'B'
    else this.rank = 'C'
    for (const p of this.pilots) {
      if (!p.alive) continue
      p.power = Math.min(MAX_POWER, p.power + 1)
      p.shield = Math.max(p.shield, 3)
      p.expression = 'amazed'
    }
    if (this.rank === 'S' || this.rank === 'A') {
      this.lives = Math.min(MAX_LIVES, this.lives + 1)
    }
    if (this.perfectStreak > 0 && this.perfectStreak % 3 === 0) {
      this.bombs = Math.min(MAX_BOMBS, this.bombs + 1)
      this.showToast(`PERFECT x${this.perfectStreak} · BOMB +1`)
    }
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
        const pierceLeft = (b.life ?? 1) - 1
        if (pierceLeft <= 0) this.pbul.splice(i, 1)
        else b.life = pierceLeft
        continue
      }
      let done = false
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j]!
        if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
          this.damageEnemy(j, b.dmg)
          const pierceLeft = (b.life ?? 1) - 1
          if (pierceLeft <= 0) done = true
          else b.life = pierceLeft
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
    const mag = this.diff.magnet
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const u = this.powerups[i]!
      u.t += dt
      const pull = this.nearestPilot(u.x, u.y)
      if (pull && mag > 0 && dist2(u.x, u.y, pull.x, pull.y) < mag * mag) {
        const ang = Math.atan2(pull.y - u.y, pull.x - u.x)
        u.x += Math.cos(ang) * 5.5 * f
        u.y += Math.sin(ang) * 5.5 * f
      } else {
        u.x += u.vx * f
        u.y += Math.sin(u.t * 3) * 0.6 * f
      }
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
    if (kind === 'W') p.power = Math.min(MAX_POWER, p.power + 1)
    else if (kind === 'H') {
      p.homing = true
      p.homingTimer = 0.2
    } else if (kind === 'R') p.rapid = Math.max(p.rapid, 10)
    else if (kind === 'S') p.shield = Math.max(p.shield, 7.5)
    else if (kind === 'B') this.bombs = Math.min(MAX_BOMBS, this.bombs + 1)
    else if (kind === 'L') {
      this.lives = Math.min(MAX_LIVES, this.lives + 1)
      this.score += 400
    } else if (kind === 'P') p.pierce = Math.max(p.pierce, 12)
    else if (kind === 'M') {
      p.mega = Math.max(p.mega, 9)
      p.power = Math.min(MAX_POWER, p.power + 1)
    } else if (kind === 'C') {
      this.score += 1000 + this.levelIndex * 250
      this.combo += 3
      this.maxCombo = Math.max(this.maxCombo, this.combo)
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
      this.score += Math.round(e.score * this.comboMul() * this.diff.scoreMul)
      this.combo += 1
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      this.comboDecay = 1.6
      this.killed += 1
      this.heroMeter = Math.min(HERO_MAX, this.heroMeter + 2.2 * this.diff.heroGain)
      this.burst(e.x, e.y, e.color, 12)
      this.onHit()
      if (e.dropsPower) this.dropPower(e.x, e.y)
      if (this.killed > 0 && this.killed % 8 === 0) this.dropPower(e.x, e.y - 20)
      this.enemies.splice(i, 1)
    }
  }

  private dropPower(x: number, y: number) {
    const late = this.levelIndex >= 5
    const keys = late
      ? ['W', 'W', 'H', 'R', 'R', 'S', 'B', 'L', 'P', 'M', 'C']
      : ['W', 'W', 'W', 'H', 'R', 'S', 'B', 'L', 'P', 'C']
    this.powerups.push({
      x,
      y,
      kind: keys[(Math.random() * keys.length) | 0]!,
      vx: -1.5,
      t: 0,
    })
  }

  private loseLife(p: JetPilot) {
    if (this.heroActive > 0) {
      this.ebul = []
      p.iframe = 1
      return
    }
    this.ebul = []
    this.combo = 0
    this.hitsThisLevel += 1
    this.heroMeter = Math.max(0, this.heroMeter - 15)
    this.onHurt()
    this.shake = 0.5
    if (p.power > 1) p.power -= 1
    p.mega = 0
    p.iframe = 2 * this.diff.iframeMul
    p.expression = 'sad'
    this.lives -= 1
    if (this.lives <= 0 && this.diff.secondWind && !this.secondWindUsed) {
      this.secondWindUsed = true
      this.lives = 1
      p.shield = 4
      p.iframe = 3
      this.showToast('SECOND WIND!')
      this.emit()
      return
    }
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
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        speed: 0.55 + Math.random() * 2.8,
        size: 1 + Math.random() * 2.4,
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
      difficulty: this.diff.id,
      difficultyLabel: this.diff.label,
      score: this.score,
      lives: this.lives,
      maxLives: MAX_LIVES,
      bombs: this.bombs,
      maxBombs: MAX_BOMBS,
      killed: this.killed,
      quota: this.quota,
      combo: this.combo,
      maxCombo: this.maxCombo,
      power: p1?.power ?? 1,
      power2: p2?.power ?? 0,
      homing: Boolean(p1?.homing),
      shield: p1?.shield ?? 0,
      rapid: p1?.rapid ?? 0,
      pierce: p1?.pierce ?? 0,
      mega: p1?.mega ?? 0,
      heroMeter: this.heroMeter,
      heroReady: this.heroMeter >= HERO_MAX,
      perfectStreak: this.perfectStreak,
      rank: this.rank,
      sectorBonus: this.sectorBonus,
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

function makePilot(
  id: PlayerId,
  x: number,
  y: number,
  color: string,
  accent: string,
  speed = 5.4,
): JetPilot {
  const expression: Expression = 'happy'
  return {
    id,
    x,
    y,
    w: 48,
    h: 30,
    speed,
    power: 1,
    homing: false,
    homingTimer: 0,
    rapid: 0,
    shield: 0,
    pierce: 0,
    mega: 0,
    fireTimer: 0,
    fireRate: 0.17,
    iframe: 1.5,
    alive: true,
    expression,
    color,
    accent,
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
