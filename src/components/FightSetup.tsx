import { useState } from 'react'
import { FACE_PATHS } from '../game/constants'
import { ROUND_OPTIONS } from '../fight/constants'
import type { FightSettings } from '../fight/types'

interface FightSetupProps {
  initial: FightSettings
  onStart: (settings: FightSettings) => void
  onBack: () => void
}

export function FightSetup({ initial, onStart, onBack }: FightSetupProps) {
  const [player1Name, setPlayer1Name] = useState(initial.player1Name)
  const [player2Name, setPlayer2Name] = useState(initial.player2Name)
  const [roundsToWin, setRoundsToWin] = useState(initial.roundsToWin)
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Side-view brawler</p>
        <h1>Stickman Fight</h1>
        <p className="subtitle">Two stickmen. One ring. Last one standing.</p>
      </header>

      <div className="start-portraits">
        <div className="portrait-card red large">
          <img src={FACE_PATHS[1].angry} alt="Player 1" />
          <span>{player1Name || 'Player 1'}</span>
        </div>
        <div className="vs-badge">VS</div>
        <div className="portrait-card blue large">
          <img src={FACE_PATHS[2].angry} alt="Player 2" />
          <span>{player2Name || 'Player 2'}</span>
        </div>
      </div>

      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault()
          onStart({
            player1Name: player1Name.trim() || 'Player 1',
            player2Name: player2Name.trim() || 'Player 2',
            roundsToWin,
            soundEnabled,
          })
        }}
      >
        <div className="form-row">
          <label>
            Player 1 name
            <input value={player1Name} maxLength={16} onChange={(e) => setPlayer1Name(e.target.value)} />
          </label>
          <label>
            Player 2 name
            <input value={player2Name} maxLength={16} onChange={(e) => setPlayer2Name(e.target.value)} />
          </label>
        </div>

        <fieldset className="score-picker">
          <legend>Rounds to win</legend>
          <div className="score-options">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={roundsToWin === n ? 'chip active' : 'chip'}
                onClick={() => setRoundsToWin(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="sound-toggle">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          Sound effects {soundEnabled ? 'On' : 'Off'}
        </label>

        <div className="controls-guide">
          <div className="controls-card controls-p1">
            <h3>Player 1 — Red</h3>
            <ul>
              <li>
                <kbd>A</kbd> <kbd>D</kbd> Move
              </li>
              <li>
                <kbd>W</kbd> Jump
              </li>
              <li>
                <kbd>Space</kbd> Punch &nbsp; <kbd>S</kbd> Kick
              </li>
            </ul>
          </div>
          <div className="controls-card controls-p2">
            <h3>Player 2 — Blue</h3>
            <ul>
              <li>
                <kbd>←</kbd> <kbd>→</kbd> Move
              </li>
              <li>
                <kbd>↑</kbd> Jump
              </li>
              <li>
                <kbd>Enter</kbd> Punch &nbsp; <kbd>↓</kbd> Kick
              </li>
            </ul>
          </div>
        </div>

        <button type="submit" className="btn primary mega">
          Start Fight
        </button>
        <button type="button" className="btn ghost wide" onClick={onBack}>
          All Games
        </button>
      </form>
    </div>
  )
}
