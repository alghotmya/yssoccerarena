/** Difficulty presets for Face-Off Jets campaign. */
export type JetsDifficulty = 'baby' | 'easy' | 'normal' | 'hard' | 'superhero'

export interface DiffPreset {
  id: JetsDifficulty
  label: string
  blurb: string
  /** Starting lives */
  lives: number
  bombs: number
  startPower: number
  startHoming: boolean
  startShield: number
  /** Enemy HP / speed / fire rate multipliers */
  enemyHp: number
  enemySpeed: number
  enemyFire: number
  bossHp: number
  /** Spawn interval multiplier (<1 = faster spawns) */
  spawnMul: number
  formationMul: number
  dropMul: number
  /** Quota multiplier — fewer kills needed on easier */
  quotaMul: number
  scoreMul: number
  playerSpeed: number
  fireRateMul: number
  iframeMul: number
  /** Pull radius for power-ups */
  magnet: number
  /** Enemy bullet speed multiplier */
  eBulletMul: number
  /** Fill hero meter faster */
  heroGain: number
  /** Auto clear some bullets near player on baby/easy */
  bulletAssist: boolean
  /** Second chance once per sector when lives hit 0 */
  secondWind: boolean
}

export const DIFFICULTIES: JetsDifficulty[] = ['baby', 'easy', 'normal', 'hard', 'superhero']

export const DIFF: Record<JetsDifficulty, DiffPreset> = {
  baby: {
    id: 'baby',
    label: 'Baby',
    blurb: 'Extra lives, magnet loot, soft enemies',
    lives: 6,
    bombs: 5,
    startPower: 3,
    startHoming: true,
    startShield: 4,
    enemyHp: 0.55,
    enemySpeed: 0.7,
    enemyFire: 1.6,
    bossHp: 0.5,
    spawnMul: 1.35,
    formationMul: 0.55,
    dropMul: 1.8,
    quotaMul: 0.65,
    scoreMul: 0.6,
    playerSpeed: 1.2,
    fireRateMul: 0.75,
    iframeMul: 1.6,
    magnet: 140,
    eBulletMul: 0.55,
    heroGain: 1.6,
    bulletAssist: true,
    secondWind: true,
  },
  easy: {
    id: 'easy',
    label: 'Easy',
    blurb: 'Forgiving pace, generous drops',
    lives: 5,
    bombs: 4,
    startPower: 2,
    startHoming: false,
    startShield: 2,
    enemyHp: 0.75,
    enemySpeed: 0.85,
    enemyFire: 1.25,
    bossHp: 0.7,
    spawnMul: 1.15,
    formationMul: 0.75,
    dropMul: 1.4,
    quotaMul: 0.8,
    scoreMul: 0.8,
    playerSpeed: 1.1,
    fireRateMul: 0.88,
    iframeMul: 1.3,
    magnet: 90,
    eBulletMul: 0.75,
    heroGain: 1.25,
    bulletAssist: true,
    secondWind: true,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    blurb: 'Balanced campaign challenge',
    lives: 3,
    bombs: 3,
    startPower: 1,
    startHoming: false,
    startShield: 0,
    enemyHp: 1,
    enemySpeed: 1,
    enemyFire: 1,
    bossHp: 1,
    spawnMul: 1,
    formationMul: 1,
    dropMul: 1,
    quotaMul: 1,
    scoreMul: 1,
    playerSpeed: 1,
    fireRateMul: 1,
    iframeMul: 1,
    magnet: 36,
    eBulletMul: 1,
    heroGain: 1,
    bulletAssist: false,
    secondWind: false,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    blurb: 'Faster swarms, meaner bosses',
    lives: 3,
    bombs: 2,
    startPower: 1,
    startHoming: false,
    startShield: 0,
    enemyHp: 1.35,
    enemySpeed: 1.2,
    enemyFire: 0.75,
    bossHp: 1.4,
    spawnMul: 0.82,
    formationMul: 1.25,
    dropMul: 0.8,
    quotaMul: 1.15,
    scoreMul: 1.5,
    playerSpeed: 1.05,
    fireRateMul: 1,
    iframeMul: 0.85,
    magnet: 20,
    eBulletMul: 1.15,
    heroGain: 0.85,
    bulletAssist: false,
    secondWind: false,
  },
  superhero: {
    id: 'superhero',
    label: 'Super Hero',
    blurb: 'Elite sortie — max glory score',
    lives: 2,
    bombs: 1,
    startPower: 1,
    startHoming: false,
    startShield: 0,
    enemyHp: 1.7,
    enemySpeed: 1.4,
    enemyFire: 0.55,
    bossHp: 1.85,
    spawnMul: 0.68,
    formationMul: 1.45,
    dropMul: 0.65,
    quotaMul: 1.3,
    scoreMul: 2.25,
    playerSpeed: 1.12,
    fireRateMul: 0.95,
    iframeMul: 0.7,
    magnet: 0,
    eBulletMul: 1.35,
    heroGain: 0.7,
    bulletAssist: false,
    secondWind: false,
  },
}
