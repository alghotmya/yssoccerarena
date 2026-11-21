import { useState } from 'react'
import { FightCanvas } from './components/FightCanvas'
import { FightSetup } from './components/FightSetup'
import { GameCanvas } from './components/GameCanvas'
import { GameSelect } from './components/GameSelect'
import { OnlineLobby } from './components/OnlineLobby'
import { StartScreen } from './components/StartScreen'
import { SpearCanvas } from './components/SpearCanvas'
import { SpearSetup } from './components/SpearSetup'
import { BombsCanvas } from './components/BombsCanvas'
import { BombsSetup } from './components/BombsSetup'
import { TanksCanvas } from './components/TanksCanvas'
import { TanksSetup } from './components/TanksSetup'
import { TennisCanvas } from './components/TennisCanvas'
import { TennisSetup } from './components/TennisSetup'
import { VersusScreen } from './components/VersusScreen'
import type { BombsSettings } from './bombs/types'
import type { FightSettings } from './fight/types'
import type { GameKind } from './net/protocol'
import type { SpearSettings } from './spear/types'
import type { TanksSettings } from './tanks/types'
import type { TennisSettings } from './tennis/types'
import type { MatchSettings, OnlineSession } from './types'

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

const defaultTanks: TanksSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  winningScore: 5,
  soundEnabled: true,
}

const defaultBombs: BombsSettings = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  winningScore: 5,
  soundEnabled: true,
}

type Screen =
  | 'pick'
  | 'soccer-setup'
  | 'soccer-online'
  | 'soccer-vs'
  | 'soccer-match'
  | 'fight-setup'
  | 'fight-online'
  | 'fight-vs'
  | 'fight-match'
  | 'tennis-setup'
  | 'tennis-online'
  | 'tennis-vs'
  | 'tennis-match'
  | 'spear-setup'
  | 'spear-online'
  | 'spear-vs'
  | 'spear-match'
  | 'tanks-setup'
  | 'tanks-online'
  | 'tanks-vs'
  | 'tanks-match'
  | 'bombs-setup'
  | 'bombs-online'
  | 'bombs-vs'
  | 'bombs-match'

export default function App() {
  const [screen, setScreen] = useState<Screen>('pick')
  const [soccer, setSoccer] = useState<MatchSettings>(defaultSoccer)
  const [fight, setFight] = useState<FightSettings>(defaultFight)
  const [tennis, setTennis] = useState<TennisSettings>(defaultTennis)
  const [spear, setSpear] = useState<SpearSettings>(defaultSpear)
  const [tanks, setTanks] = useState<TanksSettings>(defaultTanks)
  const [bombs, setBombs] = useState<BombsSettings>(defaultBombs)
  const [matchKey, setMatchKey] = useState(0)
  const [online, setOnline] = useState<OnlineSession | null>(null)

  const clearOnline = () => setOnline(null)

  const beginLocal = (next: Screen) => {
    clearOnline()
    setScreen(next)
  }

  const beginOnlineMatch = (
    game: GameKind,
    session: OnlineSession,
    settings: Record<string, unknown>,
  ) => {
    setOnline(session)
    setMatchKey((k) => k + 1)
    if (game === 'soccer') {
      setSoccer({ ...defaultSoccer, ...(settings as Partial<MatchSettings>) })
      setScreen('soccer-match')
    } else if (game === 'fight') {
      setFight({ ...defaultFight, ...(settings as Partial<FightSettings>) })
      setScreen('fight-match')
    } else if (game === 'tennis') {
      setTennis({ ...defaultTennis, ...(settings as Partial<TennisSettings>) })
      setScreen('tennis-match')
    } else if (game === 'tanks') {
      setTanks({ ...defaultTanks, ...(settings as Partial<TanksSettings>) })
      setScreen('tanks-match')
    } else if (game === 'bombs') {
      setBombs({ ...defaultBombs, ...(settings as Partial<BombsSettings>) })
      setScreen('bombs-match')
    } else {
      setSpear({ ...defaultSpear, ...(settings as Partial<SpearSettings>) })
      setScreen('spear-match')
    }
  }

  return (
    <div className="app">
      {screen === 'pick' && (
        <GameSelect
          onSoccer={() => beginLocal('soccer-setup')}
          onFight={() => beginLocal('fight-setup')}
          onTennis={() => beginLocal('tennis-setup')}
          onSpear={() => beginLocal('spear-setup')}
          onTanks={() => beginLocal('tanks-setup')}
          onBombs={() => beginLocal('bombs-setup')}
        />
      )}
      {screen === 'soccer-setup' && (
        <StartScreen
          initial={soccer}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setSoccer(next)
            clearOnline()
            setScreen('soccer-vs')
          }}
          onOnline={(next) => {
            setSoccer(next)
            setScreen('soccer-online')
          }}
        />
      )}
      {screen === 'soccer-online' && (
        <OnlineLobby
          game="soccer"
          gameTitle="Face-Off Soccer"
          defaultName={soccer.player1Name}
          settings={soccer as unknown as Record<string, unknown>}
          onBack={() => setScreen('soccer-setup')}
          onReady={(session, settings) => beginOnlineMatch('soccer', session, settings)}
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
          online={online}
          onNewGame={() => {
            clearOnline()
            setScreen('soccer-setup')
          }}
          onChangePlayers={() => {
            clearOnline()
            setScreen('soccer-setup')
          }}
          onChangeGame={() => {
            clearOnline()
            setScreen('pick')
          }}
        />
      )}
      {screen === 'fight-setup' && (
        <FightSetup
          initial={fight}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setFight(next)
            clearOnline()
            setScreen('fight-vs')
          }}
          onOnline={(next) => {
            setFight(next)
            setScreen('fight-online')
          }}
        />
      )}
      {screen === 'fight-online' && (
        <OnlineLobby
          game="fight"
          gameTitle="Stickman Fight"
          defaultName={fight.player1Name}
          settings={fight as unknown as Record<string, unknown>}
          onBack={() => setScreen('fight-setup')}
          onReady={(session, settings) => beginOnlineMatch('fight', session, settings)}
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
          online={online}
          onNewGame={() => {
            clearOnline()
            setScreen('fight-setup')
          }}
          onChangeGame={() => {
            clearOnline()
            setScreen('pick')
          }}
        />
      )}
      {screen === 'tennis-setup' && (
        <TennisSetup
          initial={tennis}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setTennis(next)
            clearOnline()
            setScreen('tennis-vs')
          }}
          onOnline={(next) => {
            setTennis(next)
            setScreen('tennis-online')
          }}
        />
      )}
      {screen === 'tennis-online' && (
        <OnlineLobby
          game="tennis"
          gameTitle="Volley Arcade"
          defaultName={tennis.player1Name}
          settings={tennis as unknown as Record<string, unknown>}
          onBack={() => setScreen('tennis-setup')}
          onReady={(session, settings) => beginOnlineMatch('tennis', session, settings)}
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
          online={online}
          onNewGame={() => {
            clearOnline()
            setScreen('tennis-setup')
          }}
          onChangeGame={() => {
            clearOnline()
            setScreen('pick')
          }}
        />
      )}
      {screen === 'spear-setup' && (
        <SpearSetup
          initial={spear}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setSpear(next)
            clearOnline()
            setScreen('spear-vs')
          }}
          onOnline={(next) => {
            setSpear(next)
            setScreen('spear-online')
          }}
        />
      )}
      {screen === 'spear-online' && (
        <OnlineLobby
          game="spear"
          gameTitle="Spear Arcade"
          defaultName={spear.player1Name}
          settings={spear as unknown as Record<string, unknown>}
          onBack={() => setScreen('spear-setup')}
          onReady={(session, settings) => beginOnlineMatch('spear', session, settings)}
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
          online={online}
          onNewGame={() => {
            clearOnline()
            setScreen('spear-setup')
          }}
          onChangeGame={() => {
            clearOnline()
            setScreen('pick')
          }}
        />
      )}
      {screen === 'tanks-setup' && (
        <TanksSetup
          initial={tanks}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setTanks(next)
            clearOnline()
            setScreen('tanks-vs')
          }}
          onOnline={(next) => {
            setTanks(next)
            setScreen('tanks-online')
          }}
        />
      )}
      {screen === 'tanks-online' && (
        <OnlineLobby
          game="tanks"
          gameTitle="Face-Off Tanks"
          defaultName={tanks.player1Name}
          settings={tanks as unknown as Record<string, unknown>}
          onBack={() => setScreen('tanks-setup')}
          onReady={(session, settings) => beginOnlineMatch('tanks', session, settings)}
        />
      )}
      {screen === 'tanks-vs' && (
        <VersusScreen
          title="Face-Off Tanks"
          player1Name={tanks.player1Name}
          player2Name={tanks.player2Name}
          soundEnabled={tanks.soundEnabled}
          onBack={() => setScreen('tanks-setup')}
          onStart={() => {
            setMatchKey((k) => k + 1)
            setScreen('tanks-match')
          }}
        />
      )}
      {screen === 'tanks-match' && (
        <TanksCanvas
          key={matchKey}
          settings={tanks}
          online={online}
          onNewGame={() => {
            clearOnline()
            setScreen('tanks-setup')
          }}
          onChangeGame={() => {
            clearOnline()
            setScreen('pick')
          }}
        />
      )}
      {screen === 'bombs-setup' && (
        <BombsSetup
          initial={bombs}
          onBack={() => setScreen('pick')}
          onStart={(next) => {
            setBombs(next)
            clearOnline()
            setScreen('bombs-vs')
          }}
          onOnline={(next) => {
            setBombs(next)
            setScreen('bombs-online')
          }}
        />
      )}
      {screen === 'bombs-online' && (
        <OnlineLobby
          game="bombs"
          gameTitle="Face-Off Bombs"
          defaultName={bombs.player1Name}
          settings={bombs as unknown as Record<string, unknown>}
          onBack={() => setScreen('bombs-setup')}
          onReady={(session, settings) => beginOnlineMatch('bombs', session, settings)}
        />
      )}
      {screen === 'bombs-vs' && (
        <VersusScreen
          title="Face-Off Bombs"
          player1Name={bombs.player1Name}
          player2Name={bombs.player2Name}
          soundEnabled={bombs.soundEnabled}
          onBack={() => setScreen('bombs-setup')}
          onStart={() => {
            setMatchKey((k) => k + 1)
            setScreen('bombs-match')
          }}
        />
      )}
      {screen === 'bombs-match' && (
        <BombsCanvas
          key={matchKey}
          settings={bombs}
          online={online}
          onNewGame={() => {
            clearOnline()
            setScreen('bombs-setup')
          }}
          onChangeGame={() => {
            clearOnline()
            setScreen('pick')
          }}
        />
      )}
    </div>
  )
}
