import { useState } from 'react'
import { FACE_PATHS } from '../game/constants'
import { LEVELS } from '../jets/levels'
import type { JetsSettings } from '../jets/types'

interface JetsSetupProps {
  initial: JetsSettings
  onStart: (settings: JetsSettings) => void
  onOnline?: (settings: JetsSettings) => void
  onBack: () => void
}

export function JetsSetup({ initial, onStart, onOnline, onBack }: JetsSetupProps) {
  const [player1Name, setPlayer1Name] = useState(initial.player1Name)
  const [player2Name, setPlayer2Name] = useState(initial.player2Name)
  const [coop, setCoop] = useState(initial.coop)
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)

  const payload = (): JetsSettings => ({
    player1Name: player1Name.trim() || 'Player 1',
    player2Name: player2Name.trim() || 'Player 2',
    coop,
    soundEnabled,
  })

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Air campaign</p>
        <h1>Face-Off Jets</h1>
        <p className="subtitle">
          {LEVELS.length} sectors · bosses · weapon upgrades · smart bombs. Blast through the sky.
        </p>
      </header>

      <div className="start-portraits">
        <div className="portrait-card red large">
          <img src={FACE_PATHS[1].amazed} alt="Player 1" />
          <span>{player1Name || 'Player 1'}</span>
        </div>
        <div className="vs-badge">{coop ? 'CO-OP' : 'SOLO'}</div>
        <div className="portrait-card blue large">
          <img src={FACE_PATHS[2].amazed} alt="Player 2" />
          <span>{coop ? player2Name || 'Player 2' : 'Wingman off'}</span>
        </div>
      </div>

      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault()
          onStart(payload())
        }}
      >
        <div className="form-row">
          <label>
            Pilot 1 name
            <input value={player1Name} maxLength={16} onChange={(e) => setPlayer1Name(e.target.value)} />
          </label>
          <label>
            Pilot 2 name
            <input
              value={player2Name}
              maxLength={16}
              onChange={(e) => setPlayer2Name(e.target.value)}
              disabled={!coop}
            />
          </label>
        </div>

        <label className="sound-toggle">
          <input type="checkbox" checked={coop} onChange={(e) => setCoop(e.target.checked)} />
          Co-op wingman (2 jets on one keyboard)
        </label>

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
            <h3>Local Pilot 1 — Red</h3>
            <ul>
              <li>
                <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Fly · auto-fire
              </li>
              <li>
                <kbd>B</kbd> / <kbd>Shift</kbd> Smart bomb
              </li>
            </ul>
          </div>
          <div className="controls-card controls-p2">
            <h3>Local Pilot 2 / Online</h3>
            <ul>
              <li>
                <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> Fly · auto-fire
              </li>
              <li>
                Online: <strong>both</strong> use arrows · <kbd>Shift</kbd> bomb
              </li>
            </ul>
          </div>
        </div>

        <p className="online-hint">
          Power-ups: <strong>W</strong> spread · <strong>H</strong> missiles · <strong>R</strong> rapid ·{' '}
          <strong>S</strong> shield · <strong>B</strong> bomb · <strong>L</strong> life ·{' '}
          <strong>P</strong> pierce · <strong>M</strong> mega · <strong>C</strong> score
        </p>

        <button type="submit" className="btn primary mega">
          Launch Campaign
        </button>
        {onOnline && (
          <button type="button" className="btn wide" onClick={() => onOnline({ ...payload(), coop: true })}>
            Play Online Co-op
          </button>
        )}
        <button type="button" className="btn ghost wide" onClick={onBack}>
          All Games
        </button>
      </form>
    </div>
  )
}
