/**
 * Level definitions adapted from DanMat/Space-Jam (MIT), expanded for Face-Off Jets.
 * Extra sectors borrow theming variety from DanMat/BombJack-style stage pacing (MIT)
 * and original Face-Off campaign ideas — all procedural, no commercial assets.
 */
export type EnemyId = 'scout' | 'weaver' | 'diver' | 'kamikaze' | 'gunship' | 'turret'

export type LevelFx =
  | 'stars'
  | 'debris'
  | 'aurora'
  | 'grid'
  | 'rings'
  | 'rain'
  | 'plasma'
  | 'embers'
  | 'ice'
  | 'digital'
  | 'warp'
  | 'lightning'
  | 'biolume'
  | 'chrome'

export interface LevelTheme {
  a: string
  b: string
  nebula: string
  star: string
  fx: LevelFx
}

export interface LevelDef {
  name: string
  tag: string
  theme: LevelTheme
  scrollSpeed: number
  spawnEvery: number
  enemies: EnemyId[]
  formations: number
  dropRate: number
  quota: number
  scoreMul: number
  clearBonus: number
  boss: { name: string; hp: number; color: string }
}

function L(
  name: string,
  tag: string,
  theme: LevelTheme,
  opts: {
    scroll: number
    spawn: number
    enemies: EnemyId[]
    form: number
    drop: number
    quota: number
    mul: number
    bonus: number
    boss: string
    hp: number
    bossColor: string
  },
): LevelDef {
  return {
    name,
    tag,
    theme,
    scrollSpeed: opts.scroll,
    spawnEvery: opts.spawn,
    enemies: opts.enemies,
    formations: opts.form,
    dropRate: opts.drop,
    quota: opts.quota,
    scoreMul: opts.mul,
    clearBonus: opts.bonus,
    boss: { name: opts.boss, hp: opts.hp, color: opts.bossColor },
  }
}

export const LEVELS: LevelDef[] = [
  // —— Act I: Space-Jam style opener (sectors 1–10) ——
  L('Orbit Patrol', 'Clear the perimeter', { a: '#0b1030', b: '#1b2a6b', nebula: '#3a4fae', star: '#9fb8ff', fx: 'stars' }, {
    scroll: 2.2, spawn: 1.05, enemies: ['scout', 'scout', 'weaver'], form: 0.15, drop: 0.18, quota: 14, mul: 1, bonus: 1500, boss: 'Sentinel', hp: 55, bossColor: '#6b8cff',
  }),
  L('Asteroid Belt', 'Weave through the swarm', { a: '#1a1206', b: '#4a2f10', nebula: '#8a5a2a', star: '#ffd9a0', fx: 'debris' }, {
    scroll: 2.5, spawn: 0.95, enemies: ['scout', 'weaver', 'diver'], form: 0.22, drop: 0.2, quota: 16, mul: 1.1, bonus: 2000, boss: 'Rockbreaker', hp: 75, bossColor: '#ff9f43',
  }),
  L('Nebula Drift', 'Ghosts in the clouds', { a: '#25062e', b: '#5a1a6b', nebula: '#a03ac0', star: '#f0b0ff', fx: 'aurora' }, {
    scroll: 2.8, spawn: 0.9, enemies: ['weaver', 'diver', 'turret'], form: 0.28, drop: 0.22, quota: 18, mul: 1.2, bonus: 2500, boss: 'Phantom', hp: 95, bossColor: '#c400ff',
  }),
  L('Ion Storm', 'Static in the void', { a: '#001a1a', b: '#054a52', nebula: '#12a0b0', star: '#a0f0ff', fx: 'lightning' }, {
    scroll: 3.1, spawn: 0.85, enemies: ['scout', 'diver', 'turret', 'kamikaze'], form: 0.3, drop: 0.24, quota: 20, mul: 1.3, bonus: 3200, boss: 'Tempest', hp: 115, bossColor: '#12c0d0',
  }),
  L('Derelict Fleet', 'Salvage turns hostile', { a: '#101418', b: '#2a3540', nebula: '#5a6f80', star: '#cfe0ec', fx: 'debris' }, {
    scroll: 3.3, spawn: 0.8, enemies: ['weaver', 'turret', 'kamikaze', 'gunship'], form: 0.32, drop: 0.25, quota: 22, mul: 1.4, bonus: 4000, boss: 'Warden', hp: 145, bossColor: '#8aa0b4',
  }),
  L('Solar Flare', 'Into the heat', { a: '#2a0500', b: '#7a1e00', nebula: '#e0521a', star: '#ffd07a', fx: 'embers' }, {
    scroll: 3.6, spawn: 0.75, enemies: ['diver', 'turret', 'kamikaze', 'gunship'], form: 0.35, drop: 0.26, quota: 24, mul: 1.5, bonus: 5000, boss: 'Helios', hp: 175, bossColor: '#ff7043',
  }),
  L('Frozen Expanse', 'Cold precision', { a: '#04121e', b: '#0a3a5a', nebula: '#2a90c0', star: '#d0f0ff', fx: 'ice' }, {
    scroll: 3.8, spawn: 0.72, enemies: ['weaver', 'diver', 'gunship', 'kamikaze'], form: 0.38, drop: 0.28, quota: 26, mul: 1.65, bonus: 6200, boss: 'Glacier', hp: 205, bossColor: '#90e0ef',
  }),
  L('Void Gate', 'Something watches back', { a: '#0a0016', b: '#26064a', nebula: '#5a1ab0', star: '#c0a0ff', fx: 'warp' }, {
    scroll: 4.1, spawn: 0.68, enemies: ['diver', 'turret', 'gunship', 'kamikaze'], form: 0.4, drop: 0.3, quota: 28, mul: 1.8, bonus: 7500, boss: 'Gatekeeper', hp: 245, bossColor: '#7b2cff',
  }),
  L('Hyperlane', 'Full throttle', { a: '#160a2a', b: '#3a1a6b', nebula: '#7b3ac0', star: '#e0c0ff', fx: 'warp' }, {
    scroll: 4.5, spawn: 0.62, enemies: ['scout', 'diver', 'gunship', 'kamikaze', 'turret'], form: 0.44, drop: 0.32, quota: 30, mul: 2, bonus: 9000, boss: 'Overdrive', hp: 300, bossColor: '#c400ff',
  }),
  L('The Core', 'End of the first line', { a: '#0a0e14', b: '#132030', nebula: '#1aa07a', star: '#a0ffd0', fx: 'plasma' }, {
    scroll: 4.9, spawn: 0.55, enemies: ['weaver', 'diver', 'turret', 'gunship', 'kamikaze'], form: 0.48, drop: 0.35, quota: 34, mul: 2.25, bonus: 12000, boss: 'Motherbrain', hp: 420, bossColor: '#00ffa3',
  }),

  // —— Act II: 25 new sectors ——
  L('Mirror Reef', 'Lights under glass seas', { a: '#021a28', b: '#0a4a5c', nebula: '#1ec8b0', star: '#a8fff0', fx: 'biolume' }, {
    scroll: 3.4, spawn: 0.7, enemies: ['weaver', 'weaver', 'gunship', 'scout'], form: 0.36, drop: 0.28, quota: 28, mul: 2.1, bonus: 11000, boss: 'Reeflord', hp: 360, bossColor: '#2ee6c5',
  }),
  L('Chrome Spire', 'City of knives', { a: '#0c0e14', b: '#2a3148', nebula: '#8aa0c8', star: '#e8f0ff', fx: 'chrome' }, {
    scroll: 3.6, spawn: 0.66, enemies: ['turret', 'gunship', 'diver', 'scout'], form: 0.4, drop: 0.3, quota: 30, mul: 2.2, bonus: 12500, boss: 'Spiremind', hp: 390, bossColor: '#c0d4ff',
  }),
  L('Dust Canyon', 'Red rock gauntlet', { a: '#2a1208', b: '#6a3410', nebula: '#c07030', star: '#ffd8a0', fx: 'debris' }, {
    scroll: 3.8, spawn: 0.64, enemies: ['diver', 'kamikaze', 'scout', 'turret'], form: 0.42, drop: 0.3, quota: 32, mul: 2.3, bonus: 13500, boss: 'Sandwyrm', hp: 410, bossColor: '#e0893a',
  }),
  L('Thunder Ridge', 'Ride the bolts', { a: '#0a1020', b: '#1a2850', nebula: '#6a90ff', star: '#d0e0ff', fx: 'lightning' }, {
    scroll: 4.0, spawn: 0.6, enemies: ['kamikaze', 'gunship', 'weaver', 'turret'], form: 0.44, drop: 0.32, quota: 32, mul: 2.4, bonus: 14500, boss: 'Stormcrown', hp: 430, bossColor: '#7eb0ff',
  }),
  L('Coral Armada', 'Living hulls ahead', { a: '#081820', b: '#104038', nebula: '#30a878', star: '#b0ffe0', fx: 'biolume' }, {
    scroll: 3.7, spawn: 0.62, enemies: ['weaver', 'turret', 'gunship', 'diver'], form: 0.4, drop: 0.31, quota: 34, mul: 2.45, bonus: 15000, boss: 'Polyp King', hp: 450, bossColor: '#40d890',
  }),
  L('Black Market', 'Neon back-alley war', { a: '#120818', b: '#3a1040', nebula: '#ff2e97', star: '#ffb0e0', fx: 'digital' }, {
    scroll: 4.1, spawn: 0.58, enemies: ['scout', 'kamikaze', 'gunship', 'gunship'], form: 0.46, drop: 0.34, quota: 34, mul: 2.55, bonus: 16000, boss: 'Broker', hp: 470, bossColor: '#ff4db8',
  }),
  L('Quantum Foam', 'Reality gets noisy', { a: '#100828', b: '#2a1860', nebula: '#a060ff', star: '#e0c8ff', fx: 'plasma' }, {
    scroll: 4.2, spawn: 0.56, enemies: ['weaver', 'diver', 'kamikaze', 'turret'], form: 0.45, drop: 0.33, quota: 36, mul: 2.65, bonus: 17000, boss: 'Quanta', hp: 490, bossColor: '#b47aff',
  }),
  L('Magma Trench', 'Hulls will glow', { a: '#1a0600', b: '#5a1400', nebula: '#ff5020', star: '#ffc080', fx: 'embers' }, {
    scroll: 4.3, spawn: 0.54, enemies: ['diver', 'turret', 'gunship', 'kamikaze'], form: 0.48, drop: 0.34, quota: 36, mul: 2.75, bonus: 18000, boss: 'Cinderfist', hp: 520, bossColor: '#ff6a30',
  }),
  L('Crystal Vault', 'Shatter the choir', { a: '#081018', b: '#183848', nebula: '#60d0ff', star: '#d8f8ff', fx: 'ice' }, {
    scroll: 4.0, spawn: 0.55, enemies: ['turret', 'turret', 'weaver', 'gunship'], form: 0.42, drop: 0.35, quota: 36, mul: 2.8, bonus: 18500, boss: 'Prismarch', hp: 540, bossColor: '#80e8ff',
  }),
  L('Pirate Run', 'Flags and flak', { a: '#140a08', b: '#3a2010', nebula: '#c04030', star: '#ffc8a0', fx: 'debris' }, {
    scroll: 4.4, spawn: 0.52, enemies: ['scout', 'gunship', 'kamikaze', 'diver', 'turret'], form: 0.5, drop: 0.36, quota: 38, mul: 2.9, bonus: 19500, boss: 'Corsair', hp: 560, bossColor: '#e05040',
  }),
  L('Skyforge', 'Anvil of storms', { a: '#101018', b: '#303848', nebula: '#ffb040', star: '#ffe8b0', fx: 'embers' }, {
    scroll: 4.5, spawn: 0.5, enemies: ['gunship', 'turret', 'diver', 'kamikaze'], form: 0.5, drop: 0.36, quota: 38, mul: 3.0, bonus: 20500, boss: 'Anvil', hp: 580, bossColor: '#ffc050',
  }),
  L('Ghost Signal', 'Broadcast from nowhere', { a: '#060810', b: '#141828', nebula: '#40ffc0', star: '#a0ffe0', fx: 'digital' }, {
    scroll: 4.2, spawn: 0.5, enemies: ['weaver', 'kamikaze', 'weaver', 'gunship'], form: 0.48, drop: 0.37, quota: 40, mul: 3.1, bonus: 21500, boss: 'Echo', hp: 600, bossColor: '#50ffd0',
  }),
  L('Binary Rain', 'Code cuts steel', { a: '#020806', b: '#0a2818', nebula: '#20ff80', star: '#80ffb0', fx: 'rain' }, {
    scroll: 4.6, spawn: 0.48, enemies: ['scout', 'turret', 'kamikaze', 'gunship'], form: 0.52, drop: 0.38, quota: 40, mul: 3.2, bonus: 22500, boss: 'Kernel', hp: 630, bossColor: '#30ff90',
  }),
  L('Ringworld Edge', 'Horizon never ends', { a: '#081220', b: '#183050', nebula: '#5080c0', star: '#c0d8ff', fx: 'rings' }, {
    scroll: 4.4, spawn: 0.48, enemies: ['diver', 'gunship', 'turret', 'weaver', 'scout'], form: 0.5, drop: 0.38, quota: 42, mul: 3.3, bonus: 24000, boss: 'Ringlord', hp: 660, bossColor: '#7090d0',
  }),
  L('Comet Wake', 'Chase the ice fire', { a: '#060e18', b: '#102848', nebula: '#80c0ff', star: '#e0f0ff', fx: 'ice' }, {
    scroll: 4.8, spawn: 0.46, enemies: ['kamikaze', 'kamikaze', 'diver', 'gunship'], form: 0.55, drop: 0.39, quota: 42, mul: 3.4, bonus: 25000, boss: 'Halley', hp: 680, bossColor: '#90d0ff',
  }),
  L('Iron Choir', 'Factories scream', { a: '#121414', b: '#2a3030', nebula: '#808870', star: '#d0d8c8', fx: 'grid' }, {
    scroll: 4.3, spawn: 0.46, enemies: ['turret', 'gunship', 'turret', 'diver'], form: 0.52, drop: 0.38, quota: 44, mul: 3.5, bonus: 26000, boss: 'Cantor', hp: 710, bossColor: '#a0a890',
  }),
  L('Eclipse Corridor', 'Light dies here', { a: '#040408', b: '#100818', nebula: '#602080', star: '#c080ff', fx: 'aurora' }, {
    scroll: 4.7, spawn: 0.44, enemies: ['weaver', 'gunship', 'kamikaze', 'turret'], form: 0.54, drop: 0.4, quota: 44, mul: 3.6, bonus: 27500, boss: 'Umbra', hp: 740, bossColor: '#9030c0',
  }),
  L('Plasma Garden', 'Beauty that burns', { a: '#100420', b: '#301050', nebula: '#ff60d0', star: '#ffd0f0', fx: 'plasma' }, {
    scroll: 4.5, spawn: 0.44, enemies: ['weaver', 'diver', 'gunship', 'scout', 'turret'], form: 0.53, drop: 0.4, quota: 46, mul: 3.7, bonus: 28500, boss: 'Bloom', hp: 760, bossColor: '#ff70e0',
  }),
  L('Shattered Moon', 'Gravity got angry', { a: '#101018', b: '#282838', nebula: '#a0a0b8', star: '#f0f0ff', fx: 'debris' }, {
    scroll: 4.9, spawn: 0.42, enemies: ['diver', 'kamikaze', 'turret', 'gunship'], form: 0.56, drop: 0.41, quota: 46, mul: 3.85, bonus: 30000, boss: 'Selene', hp: 800, bossColor: '#c0c0d8',
  }),
  L('Dragon Nest', 'Wings in the dark', { a: '#180808', b: '#401010', nebula: '#e04020', star: '#ffb090', fx: 'embers' }, {
    scroll: 5.0, spawn: 0.42, enemies: ['kamikaze', 'diver', 'gunship', 'turret', 'weaver'], form: 0.58, drop: 0.42, quota: 48, mul: 4.0, bonus: 32000, boss: 'Wyrmqueen', hp: 840, bossColor: '#ff5030',
  }),
  L('Mirror Maze', 'You vs you', { a: '#0c1420', b: '#203048', nebula: '#60a0ff', star: '#d0e8ff', fx: 'chrome' }, {
    scroll: 4.6, spawn: 0.4, enemies: ['scout', 'weaver', 'scout', 'gunship', 'kamikaze'], form: 0.55, drop: 0.42, quota: 48, mul: 4.1, bonus: 33000, boss: 'Doppel', hp: 870, bossColor: '#80c0ff',
  }),
  L('Cascade Vault', 'Waterfall of fire', { a: '#061820', b: '#0a3848', nebula: '#30c0e0', star: '#b0f0ff', fx: 'rain' }, {
    scroll: 4.8, spawn: 0.4, enemies: ['gunship', 'turret', 'diver', 'weaver'], form: 0.57, drop: 0.43, quota: 50, mul: 4.2, bonus: 34500, boss: 'Torrent', hp: 900, bossColor: '#40d0f0',
  }),
  L('Warpgate Alpha', 'Hold the seam', { a: '#100830', b: '#281060', nebula: '#8050ff', star: '#d0b0ff', fx: 'warp' }, {
    scroll: 5.2, spawn: 0.38, enemies: ['kamikaze', 'gunship', 'turret', 'diver', 'weaver'], form: 0.6, drop: 0.44, quota: 50, mul: 4.4, bonus: 36000, boss: 'Aperture', hp: 950, bossColor: '#9060ff',
  }),
  L('Singularity Edge', 'Pull of the abyss', { a: '#020208', b: '#100820', nebula: '#4010a0', star: '#a080ff', fx: 'warp' }, {
    scroll: 5.4, spawn: 0.36, enemies: ['turret', 'gunship', 'kamikaze', 'diver', 'weaver'], form: 0.62, drop: 0.45, quota: 52, mul: 4.6, bonus: 38000, boss: 'Eventide', hp: 1000, bossColor: '#6020c0',
  }),
  L('Final Horizon', 'One last sortie', { a: '#040610', b: '#0c1830', nebula: '#ffd23f', star: '#fff0c0', fx: 'aurora' }, {
    scroll: 5.6, spawn: 0.34, enemies: ['scout', 'weaver', 'diver', 'kamikaze', 'gunship', 'turret'], form: 0.65, drop: 0.48, quota: 56, mul: 5.0, bonus: 50000, boss: 'Horizon', hp: 1200, bossColor: '#ffd23f',
  }),
]
