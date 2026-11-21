import { useState } from 'react'
import { FACE_PATHS } from '../game/constants'
import { ROUND_OPTIONS } from '../rumble/constants'
import type { RumbleSettings } from '../rumble/types'

interface RumbleSetupProps {
  initial: RumbleSettings
  onStart: (settings: RumbleSettings) => void
  onOnline?: (settings: RumbleSettings) => void
  onBack: () => void
}

export function RumbleSetup({ initial, onStart, onOnline, onBack }: RumbleSetupProps) {
  const [player1Name, setPlayer1Name] = useState(initial.player1Name)
  const [player2Name, setPlayer2Name] = useState(initial.player2Name)
  const [roundsToWin, setRoundsToWin] = useState(initial.roundsToWin)
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Neon brawler</p>
        <h1>Face-Off Rumble</h1>
        <p className="subtitle">
          Street-fighter energy — punch, kick, blast, and block. First to the rounds wins.
        </p>
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
                <kbd>A</kbd> <kbd>D</kbd> Move · <kbd>W</kbd> Jump · hold back to block
              </li>
              <li>
                <kbd>Space</kbd> Punch · <kbd>S</kbd> Kick · <kbd>F</kbd> Special
              </li>
            </ul>
          </div>
          <div className="controls-card controls-p2">
            <h3>Player 2 — Blue</h3>
            <ul>
              <li>
                <kbd>←</kbd> <kbd>→</kbd> Move · <kbd>↑</kbd> Jump · hold back to block
              </li>
              <li>
                <kbd>Enter</kbd> Punch · <kbd>↓</kbd> Kick · <kbd>L</kbd> Special
              </li>
            </ul>
          </div>
        </div>

        <button type="submit" className="btn primary mega">
          Local Rumble
        </button>
        {onOnline && (
          <button
            type="button"
            className="btn wide"
            onClick={() =>
              onOnline({
                player1Name: player1Name.trim() || 'Player 1',
                player2Name: player2Name.trim() || 'Player 2',
                roundsToWin,
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
