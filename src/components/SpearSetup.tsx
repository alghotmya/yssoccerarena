import { useState } from 'react'
import { FACE_PATHS } from '../game/constants'
import { SCORE_OPTIONS } from '../spear/constants'
import type { SpearSettings } from '../spear/types'

interface SpearSetupProps {
  initial: SpearSettings
  onStart: (settings: SpearSettings) => void
  onOnline?: (settings: SpearSettings) => void
  onBack: () => void
}

export function SpearSetup({ initial, onStart, onOnline, onBack }: SpearSetupProps) {
  const [player1Name, setPlayer1Name] = useState(initial.player1Name)
  const [player2Name, setPlayer2Name] = useState(initial.player2Name)
  const [winningScore, setWinningScore] = useState(initial.winningScore)
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Take turns</p>
        <h1>Spear Arcade</h1>
        <p className="subtitle">Aim the marker. Throw on your turn. Body scores the most.</p>
      </header>

      <div className="start-portraits">
        <div className="portrait-card red large">
          <img src={FACE_PATHS[1].happy} alt="Player 1" />
          <span>{player1Name || 'Player 1'}</span>
        </div>
        <div className="vs-badge">VS</div>
        <div className="portrait-card blue large">
          <img src={FACE_PATHS[2].happy} alt="Player 2" />
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
            winningScore,
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
          <legend>First to</legend>
          <div className="score-options">
            {SCORE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={winningScore === n ? 'chip active' : 'chip'}
                onClick={() => setWinningScore(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="subtitle">Body 5 · Arm 3 · Leg 2 · A miss scores nothing.</p>

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
            <h3>Player 1 — Red (default)</h3>
            <ul>
              <li>
                <kbd>Space</kbd> Throw · online uses arrows seat + Space
              </li>
            </ul>
          </div>
          <div className="controls-card controls-p2">
            <h3>Player 2 — Blue (local join)</h3>
            <ul>
              <li>
                <kbd>Enter</kbd> Throw
              </li>
            </ul>
          </div>
        </div>

        <button type="submit" className="btn primary mega">
          Local Throws
        </button>
        {onOnline && (
          <button
            type="button"
            className="btn wide"
            onClick={() =>
              onOnline({
                player1Name: player1Name.trim() || 'Player 1',
                player2Name: player2Name.trim() || 'Player 2',
                winningScore,
                soundEnabled,
              })
            }
          >
            Play Online
          </button>
        )}
        <button type="button" className="btn ghost wide" onClick={onBack}>
          All Games
        </button>
      </form>
    </div>
  )
}
