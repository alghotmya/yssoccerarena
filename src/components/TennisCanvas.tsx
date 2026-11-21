import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { FACE_PATHS } from '../game/constants'
import { InputManager } from '../game/input'
import { Scoreboard } from './Scoreboard'
import { TennisEngine } from '../tennis/engine'
import { TennisRenderer } from '../tennis/renderer'
import type { TennisSettings, TennisSnapshot } from '../tennis/types'
import { attachMatchNet, requestOnlineRematch } from '../net/matchNet'
import type { OnlineSession } from '../types'

interface TennisCanvasProps {
  settings: TennisSettings
  online?: OnlineSession | null
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

export function TennisCanvas({ settings, online = null, onNewGame, onChangeGame }: TennisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<TennisEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<TennisSnapshot>(emptySnapshot)
  const [peerLeft, setPeerLeft] = useState(false)

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
    let detachNet: (() => void) | undefined

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
      if (online) {
        detachNet = attachMatchNet({
          seat: online.seat,
          input,
          engine: engine as never,
          onPeerLeft: () => setPeerLeft(true),
          onRematch: () => setSnapshot(engine.getSnapshot()),
        })
      }
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
      detachNet?.()
      cancelAnimationFrame(drawRaf)
      engine.stop()
      engineRef.current = null
    }
  }, [settings, online])

  const restart = () => {
    audioRef.current.resume()
    if (online?.seat === 1) {
      requestOnlineRematch()
      engineRef.current?.rematch()
    } else if (!online) {
      engineRef.current?.rematch()
    }
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
        {peerLeft && <div className="peer-left-banner">Opponent disconnected</div>}
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
          {online
            ? `Online · Player ${online.seat} · ${serverName} serves · Arrows + Space`
            : `${serverName} serves  |  Red (P1): Arrows + Space  |  Blue (P2): WASD + Enter`}
        </p>
        <div className="toolbar-actions">
          {snapshot.phase !== 'gameover' && (!online || online.seat === 1) && (
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
