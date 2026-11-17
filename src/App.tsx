import { useState } from 'react'
import { FightCanvas } from './components/FightCanvas'
import { FightSetup } from './components/FightSetup'
import { GameCanvas } from './components/GameCanvas'
import { GameSelect } from './components/GameSelect'
import { StartScreen } from './components/StartScreen'
import type { FightSettings } from './fight/types'
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

type Screen = 'pick' | 'soccer-setup' | 'soccer-match' | 'fight-setup' | 'fight-match'

export default function App() {
  const [screen, setScreen] = useState<Screen>('pick')
  const [soccer, setSoccer] = useState<MatchSettings>(defaultSoccer)
  const [fight, setFight] = useState<FightSettings>(defaultFight)
  const [matchKey, setMatchKey] = useState(0)

  return (
    <div className="app">
      {screen === 'pick' && (
        <GameSelect
          onSoccer={() => setScreen('soccer-setup')}
          onFight={() => setScreen('fight-setup')}
        />
      )}
      {screen === 'soccer-setup' && (
        <StartScreen
          initial={soccer}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setSoccer(next)
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
    </div>
  )
}
