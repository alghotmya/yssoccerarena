import { useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { StartScreen } from './components/StartScreen'
import type { MatchSettings } from './types'

const defaultSettings: MatchSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  winningScore: 5,
  soundEnabled: true,
}

type Screen = 'setup' | 'match'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [settings, setSettings] = useState<MatchSettings>(defaultSettings)
  const [matchKey, setMatchKey] = useState(0)

  return (
    <div className="app">
      {screen === 'setup' ? (
        <StartScreen
          initial={settings}
          onStart={(next) => {
            setSettings(next)
            setMatchKey((k) => k + 1)
            setScreen('match')
          }}
        />
      ) : (
        <GameCanvas
          key={matchKey}
          settings={settings}
          onNewGame={() => setScreen('setup')}
          onChangePlayers={() => setScreen('setup')}
        />
      )}
    </div>
  )
}
