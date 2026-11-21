import { useState } from 'react'
import { FACE_PATHS } from '../game/constants'
import { SCORE_OPTIONS } from '../tennis/constants'
import type { TennisSettings } from '../tennis/types'

interface TennisSetupProps {
  initial: TennisSettings
  onStart: (settings: TennisSettings) => void
  onOnline?: (settings: TennisSettings) => void
  onBack: () => void
}

export function TennisSetup({ initial, onStart, onOnline, onBack }: TennisSetupProps) {
  const [player1Name, setPlayer1Name] = useState(initial.player1Name)
  const [player2Name, setPlayer2Name] = useState(initial.player2Name)
  const [winningScore, setWinningScore] = useState(initial.winningScore)
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Night court</p>
        <h1>Volley Arcade</h1>
        <p className="subtitle">Rally the ball. Clear the net. First to the target wins.</p>
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
                <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Move
              </li>
              <li>
                <kbd>Space</kbd> Swing
              </li>
            </ul>
          </div>
          <div className="controls-card controls-p2">
            <h3>Player 2 — Blue</h3>
            <ul>
              <li>
                <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> Move
              </li>
              <li>
                <kbd>Enter</kbd> Swing
              </li>
            </ul>
          </div>
        </div>

        <button type="submit" className="btn primary mega">
          Local Rally
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
