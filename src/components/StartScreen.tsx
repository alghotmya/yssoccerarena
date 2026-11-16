import { useState } from 'react'
import { FACE_PATHS, WIN_SCORE_OPTIONS } from '../game/constants'
import type { MatchSettings } from '../types'
import { ControlsGuide } from './ControlsGuide'

interface StartScreenProps {
  initial: MatchSettings
  onStart: (settings: MatchSettings) => void
}

export function StartScreen({ initial, onStart }: StartScreenProps) {
  const [player1Name, setPlayer1Name] = useState(initial.player1Name)
  const [player2Name, setPlayer2Name] = useState(initial.player2Name)
  const [winningScore, setWinningScore] = useState(initial.winningScore)
  const [customScore, setCustomScore] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)
  const [useCustom, setUseCustom] = useState(
    !WIN_SCORE_OPTIONS.includes(initial.winningScore as (typeof WIN_SCORE_OPTIONS)[number]),
  )

  const resolvedScore = useCustom
    ? Math.max(1, Number.parseInt(customScore || '1', 10) || 1)
    : winningScore

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Local 2-player arcade</p>
        <h1>Face-Off Soccer</h1>
        <p className="subtitle">Two Players. One Ball. One Champion.</p>
      </header>

      <div className="start-portraits">
        <div className="portrait-card blue large">
          <img src={FACE_PATHS[1].happy} alt="Player 1" />
          <span>{player1Name || 'Player 1'}</span>
        </div>
        <div className="vs-badge">VS</div>
        <div className="portrait-card red large">
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
            winningScore: resolvedScore,
            soundEnabled,
          })
        }}
      >
        <div className="form-row">
          <label>
            Player 1 name
            <input
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              maxLength={16}
              placeholder="Player 1"
            />
          </label>
          <label>
            Player 2 name
            <input
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              maxLength={16}
              placeholder="Player 2"
            />
          </label>
        </div>

        <fieldset className="score-picker">
          <legend>Winning score</legend>
          <div className="score-options">
            {WIN_SCORE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={!useCustom && winningScore === n ? 'chip active' : 'chip'}
                onClick={() => {
                  setUseCustom(false)
                  setWinningScore(n)
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className={useCustom ? 'chip active' : 'chip'}
              onClick={() => setUseCustom(true)}
            >
              Custom
            </button>
          </div>
          {useCustom && (
            <input
              type="number"
              min={1}
              max={99}
              value={customScore}
              onChange={(e) => setCustomScore(e.target.value)}
              placeholder="Enter score"
              className="custom-score"
            />
          )}
        </fieldset>

        <label className="sound-toggle">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          Sound effects {soundEnabled ? 'On' : 'Off'}
        </label>

        <ControlsGuide />

        <button type="submit" className="btn primary mega">
          Start Match
        </button>
      </form>
    </div>
  )
}
