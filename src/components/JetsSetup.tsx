import { useState } from 'react'
import { FACE_PATHS } from '../game/constants'
import { DIFF, DIFFICULTIES, type JetsDifficulty } from '../jets/difficulty'
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
  const [difficulty, setDifficulty] = useState<JetsDifficulty>(initial.difficulty ?? 'normal')
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)
  const preset = DIFF[difficulty]

  const payload = (): JetsSettings => ({
    player1Name: player1Name.trim() || 'Player 1',
    player2Name: player2Name.trim() || 'Player 2',
    coop,
    difficulty,
    soundEnabled,
  })

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Air campaign</p>
        <h1>Face-Off Jets</h1>
        <p className="subtitle">
          {LEVELS.length} sectors · difficulty modes · hero burst · bosses & upgrades
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

        <fieldset className="jets-diff-field">
          <legend>Difficulty</legend>
          <div className="jets-diff-row" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((id) => (
              <button
                key={id}
                type="button"
                className={`jets-diff-btn ${difficulty === id ? 'active' : ''} diff-${id}`}
                onClick={() => setDifficulty(id)}
              >
                {DIFF[id].label}
              </button>
            ))}
          </div>
          <p className="jets-diff-blurb">
            {preset.blurb} · {preset.lives} lives · {preset.bombs} bombs · score ×{preset.scoreMul}
          </p>
        </fieldset>

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
            <h3>Pilot 1 — Red (default)</h3>
            <ul>
              <li>
                <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> Fly · auto-fire
              </li>
              <li>
                <kbd>B</kbd> / <kbd>Shift</kbd> Smart bomb · <kbd>Space</kbd> Hero burst
              </li>
            </ul>
          </div>
          <div className="controls-card controls-p2">
            <h3>Pilot 2 — Blue (local join)</h3>
            <ul>
              <li>
                <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Fly · auto-fire
              </li>
              <li>
                <kbd>Enter</kbd> Hero burst · online: arrows + Shift bomb
              </li>
            </ul>
          </div>
        </div>

        <p className="online-hint">
          Fill the gold <strong>Hero meter</strong> with combos, then press Space for a screen-clear
          burst. Perfect sectors build streak bombs.
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
