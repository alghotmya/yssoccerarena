import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { InputManager } from '../game/input'
import { FACE_PATHS } from '../game/constants'
import { MAX_HEALTH } from '../fight/constants'
import { FightEngine } from '../fight/engine'
import { FightRenderer } from '../fight/renderer'
import type { FightSettings, FightSnapshot } from '../fight/types'

interface FightCanvasProps {
  settings: FightSettings
  onNewGame: () => void
  onChangeGame: () => void
}

const emptySnapshot: FightSnapshot = {
  phase: 'countdown',
  countdown: 3,
  health1: MAX_HEALTH,
  health2: MAX_HEALTH,
  rounds1: 0,
  rounds2: 0,
  expression1: 'happy',
  expression2: 'happy',
  winner: null,
  lastHit: null,
}

export function FightCanvas({ settings, onNewGame, onChangeGame }: FightCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<FightEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<FightSnapshot>(emptySnapshot)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()
    const input = new InputManager()
    const renderer = new FightRenderer(canvas)
    let disposed = false
    let drawRaf = 0

    const engine = new FightEngine(settings, input, {
      onSnapshot: (next) => setSnapshot({ ...next }),
      onAttack: (kind) => audio.play(kind === 'punch' ? 'punch' : 'kick'),
      onJump: () => audio.play('jump'),
      onHit: () => audio.play('hit'),
      onKo: () => audio.play('ko'),
      onWin: () => audio.play('win'),
      onTick: (value) => {
        if (value > 0) audio.play('countdown')
        else audio.play('fight')
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

  return (
    <div className="game-shell">
      <div className="fight-hud">
        <HealthSide
          name={settings.player1Name}
          health={snapshot.health1}
          rounds={snapshot.rounds1}
          target={settings.roundsToWin}
          side="p1"
          face={FACE_PATHS[1][snapshot.expression1]}
        />
        <div className="fight-mid">VS</div>
        <HealthSide
          name={settings.player2Name}
          health={snapshot.health2}
          rounds={snapshot.rounds2}
          target={settings.roundsToWin}
          side="p2"
          face={FACE_PATHS[2][snapshot.expression2]}
        />
      </div>

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
                {snapshot.rounds1} — {snapshot.rounds2}
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
                  New Fight
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
        <p className="hint-bar">Red: A D, W jump, Space punch, S kick &nbsp;|&nbsp; Blue: Arrows, Enter punch, Down kick</p>
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

function HealthSide({
  name,
  health,
  rounds,
  target,
  side,
  face,
}: {
  name: string
  health: number
  rounds: number
  target: number
  side: 'p1' | 'p2'
  face: string
}) {
  return (
    <div className={`health-side ${side}`}>
      <img src={face} alt="" />
      <div className="health-copy">
        <div className="health-name">{name}</div>
        <div className="health-track">
          <div className="health-fill" style={{ width: `${health}%` }} />
        </div>
        <div className="round-pips">
          {Array.from({ length: target }, (_, i) => (
            <span key={i} className={i < rounds ? 'pip won' : 'pip'} />
          ))}
        </div>
      </div>
    </div>
  )
}
