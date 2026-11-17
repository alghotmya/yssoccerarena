import { useState } from 'react'
import { FightCanvas } from './components/FightCanvas'
import { FightSetup } from './components/FightSetup'
import { GameCanvas } from './components/GameCanvas'
import { GameSelect } from './components/GameSelect'
import { StartScreen } from './components/StartScreen'
import { SpearCanvas } from './components/SpearCanvas'
import { SpearSetup } from './components/SpearSetup'
import { TennisCanvas } from './components/TennisCanvas'
import { TennisSetup } from './components/TennisSetup'
import { VersusScreen } from './components/VersusScreen'
import type { FightSettings } from './fight/types'
import type { SpearSettings } from './spear/types'
import type { TennisSettings } from './tennis/types'
import type { MatchSettings } from './types'

const defaultSoccer: MatchSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  winningScore: 5,
  soundEnabled: true,
}

const defaultFight: FightSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  roundsToWin: 3,
  soundEnabled: true,
}

const defaultSpear: SpearSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  winningScore: 15,
  soundEnabled: true,
}

const defaultTennis: TennisSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  winningScore: 7,
  soundEnabled: true,
}

type Screen =
  | 'pick'
  | 'soccer-setup'
  | 'soccer-vs'
  | 'soccer-match'
  | 'fight-setup'
  | 'fight-vs'
  | 'fight-match'
  | 'tennis-setup'
  | 'tennis-vs'
  | 'tennis-match'
  | 'spear-setup'
  | 'spear-vs'
  | 'spear-match'

export default function App() {
  const [screen, setScreen] = useState<Screen>('pick')
  const [soccer, setSoccer] = useState<MatchSettings>(defaultSoccer)
  const [fight, setFight] = useState<FightSettings>(defaultFight)
  const [tennis, setTennis] = useState<TennisSettings>(defaultTennis)
  const [spear, setSpear] = useState<SpearSettings>(defaultSpear)
  const [matchKey, setMatchKey] = useState(0)

  return (
    <div className="app">
      {screen === 'pick' && (
        <GameSelect
          onSoccer={() => setScreen('soccer-setup')}
          onFight={() => setScreen('fight-setup')}
          onTennis={() => setScreen('tennis-setup')}
          onSpear={() => setScreen('spear-setup')}
        />
      )}
      {screen === 'soccer-setup' && (
        <StartScreen
          initial={soccer}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setSoccer(next)
            setScreen('soccer-vs')
          }}
        />
      )}
      {screen === 'soccer-vs' && (
        <VersusScreen
          title="Face-Off Soccer"
          player1Name={soccer.player1Name}
          player2Name={soccer.player2Name}
          soundEnabled={soccer.soundEnabled}
          onBack={() => setScreen('soccer-setup')}
          onStart={() => {
            setMatchKey((k) => k + 1)
            setScreen('soccer-match')
          }}
        />
      )}
      {screen === 'soccer-match' && (
        <GameCanvas
          key={matchKey}
          settings={soccer}
          onNewGame={() => setScreen('soccer-setup')}
          onChangePlayers={() => setScreen('soccer-setup')}
          onChangeGame={() => setScreen('pick')}
        />
      )}
      {screen === 'fight-setup' && (
        <FightSetup
          initial={fight}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setFight(next)
            setScreen('fight-vs')
          }}
        />
      )}
      {screen === 'fight-vs' && (
        <VersusScreen
          title="Stickman Fight"
          player1Name={fight.player1Name}
          player2Name={fight.player2Name}
          soundEnabled={fight.soundEnabled}
          onBack={() => setScreen('fight-setup')}
          onStart={() => {
            setMatchKey((k) => k + 1)
            setScreen('fight-match')
          }}
        />
      )}
      {screen === 'fight-match' && (
        <FightCanvas
          key={matchKey}
          settings={fight}
          onNewGame={() => setScreen('fight-setup')}
          onChangeGame={() => setScreen('pick')}
        />
      )}
      {screen === 'tennis-setup' && (
        <TennisSetup
          initial={tennis}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setTennis(next)
            setScreen('tennis-vs')
          }}
        />
      )}
      {screen === 'tennis-vs' && (
        <VersusScreen
          title="Volley Arcade"
          player1Name={tennis.player1Name}
          player2Name={tennis.player2Name}
          soundEnabled={tennis.soundEnabled}
          onBack={() => setScreen('tennis-setup')}
          onStart={() => {
            setMatchKey((k) => k + 1)
            setScreen('tennis-match')
          }}
        />
      )}
      {screen === 'tennis-match' && (
        <TennisCanvas
          key={matchKey}
          settings={tennis}
          onNewGame={() => setScreen('tennis-setup')}
          onChangeGame={() => setScreen('pick')}
        />
      )}
      {screen === 'spear-setup' && (
        <SpearSetup
          initial={spear}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setSpear(next)
            setScreen('spear-vs')
          }}
        />
      )}
      {screen === 'spear-vs' && (
        <VersusScreen
          title="Spear Arcade"
          player1Name={spear.player1Name}
          player2Name={spear.player2Name}
          soundEnabled={spear.soundEnabled}
          onBack={() => setScreen('spear-setup')}
          onStart={() => {
            setMatchKey((k) => k + 1)
            setScreen('spear-match')
          }}
        />
      )}
      {screen === 'spear-match' && (
        <SpearCanvas
          key={matchKey}
          settings={spear}
          onNewGame={() => setScreen('spear-setup')}
          onChangeGame={() => setScreen('pick')}
        />
      )}
    </div>
  )
}
