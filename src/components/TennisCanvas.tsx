import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { FACE_PATHS } from '../game/constants'
import { InputManager } from '../game/input'
import { Scoreboard } from './Scoreboard'
import { TennisEngine } from '../tennis/engine'
import { TennisRenderer } from '../tennis/renderer'
import type { TennisSettings, TennisSnapshot } from '../tennis/types'

interface TennisCanvasProps {
  settings: TennisSettings
  onNewGame: () => void
  onChangeGame: () => void
}

const emptySnapshot: TennisSnapshot = {
  phase: 'countdown',
  countdown: 3,
  score1: 0,
  score2: 0,
  expression1: 'happy',
  expression2: 'happy',
  server: 1,
  winner: null,
  pointFor: null,
}

export function TennisCanvas({ settings, onNewGame, onChangeGame }: TennisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<TennisEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<TennisSnapshot>(emptySnapshot)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()
    const input = new InputManager()
    const renderer = new TennisRenderer(canvas)
    let disposed = false
    let drawRaf = 0

    const engine = new TennisEngine(settings, input, {
      onSnapshot: (next) => setSnapshot({ ...next }),
      onHit: () => audio.play('kick'),
      onBounce: () => audio.play('wall'),
      onPoint: () => audio.play('goal'),
      onWin: () => audio.play('win'),
      onTick: (value) => {
        if (value > 0) audio.play('countdown')
        else audio.play('whistle')
      },
    })
    engineRef.current = engine

    void renderer.loadFaces().then(() => {
      if (disposed) return
      engine.start()
      const loop = () => {
        if (disposed) return
        renderer.draw(engine)
        drawRaf = requestAnimationFrame(loop)
      }
      drawRaf = requestAnimationFrame(loop)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(drawRaf)
      engine.stop()
      engineRef.current = null
    }
  }, [settings])

  const restart = () => {
    audioRef.current.resume()
    engineRef.current?.rematch()
    setSnapshot(engineRef.current?.getSnapshot() ?? emptySnapshot)
  }

  const winnerName = snapshot.winner === 1 ? settings.player1Name : settings.player2Name
  const serverName = snapshot.server === 1 ? settings.player1Name : settings.player2Name

  return (
    <div className="game-shell">
      <Scoreboard
        name1={settings.player1Name}
        name2={settings.player2Name}
        score1={snapshot.score1}
        score2={snapshot.score2}
        pulse={snapshot.phase === 'point'}
        winningScore={settings.winningScore}
      />

      <div className="canvas-wrap">
        <canvas ref={canvasRef} className="game-canvas" />
        {snapshot.phase === 'gameover' && snapshot.winner && (
          <div className="overlay gameover">
            <div className="gameover-card">
              <div className="trophy" aria-hidden>
                🏆
              </div>
              <h2>{winnerName} Wins!</h2>
              <p className="final-score">
                {snapshot.score1} — {snapshot.score2}
              </p>
              <div className="gameover-faces">
                <div className="portrait-card red">
                  <img src={FACE_PATHS[1][snapshot.winner === 1 ? 'happy' : 'sad']} alt="" />
                  <span>{settings.player1Name}</span>
                </div>
                <div className="portrait-card blue">
                  <img src={FACE_PATHS[2][snapshot.winner === 2 ? 'happy' : 'sad']} alt="" />
                  <span>{settings.player2Name}</span>
                </div>
              </div>
              <div className="gameover-actions">
                <button type="button" className="btn primary" onClick={restart}>
                  Rematch
                </button>
                <button type="button" className="btn" onClick={onNewGame}>
                  New Rally
                </button>
                <button type="button" className="btn ghost" onClick={onChangeGame}>
                  All Games
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="match-toolbar">
        <p className="hint-bar">
          {serverName} serves &nbsp;|&nbsp; Red: WASD + Space &nbsp;|&nbsp; Blue: Arrows + Enter
        </p>
        <div className="toolbar-actions">
          {snapshot.phase !== 'gameover' && (
            <button type="button" className="btn" onClick={restart}>
              Restart Match
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onChangeGame}>
            All Games
          </button>
        </div>
      </div>
    </div>
  )
}
