import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { FACE_PATHS } from '../game/constants'
import { InputManager } from '../game/input'
import { Scoreboard } from './Scoreboard'
import { SpearEngine } from '../spear/engine'
import { SpearRenderer } from '../spear/renderer'
import type { SpearSettings, SpearSnapshot } from '../spear/types'
import { attachMatchNet, requestOnlineRematch } from '../net/matchNet'
import type { OnlineSession } from '../types'

interface SpearCanvasProps {
  settings: SpearSettings
  online?: OnlineSession | null
  onNewGame: () => void
  onChangeGame: () => void
}

const emptySnapshot: SpearSnapshot = {
  phase: 'aim',
  turn: 1,
  score1: 0,
  score2: 0,
  expression1: 'happy',
  expression2: 'happy',
  zone: null,
  points: 0,
  winner: null,
}

export function SpearCanvas({ settings, online = null, onNewGame, onChangeGame }: SpearCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SpearEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<SpearSnapshot>(emptySnapshot)
  const [peerLeft, setPeerLeft] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()
    const input = new InputManager()
    const renderer = new SpearRenderer(canvas)
    let disposed = false
    let drawRaf = 0
    let detachNet: (() => void) | undefined

    const engine = new SpearEngine(settings, input, {
      onSnapshot: (next) => setSnapshot({ ...next }),
      onThrow: () => audio.play('kick'),
      onHit: (zone) => audio.play(zone === 'miss' ? 'wall' : zone === 'body' ? 'goal' : 'hit'),
      onWin: () => audio.play('win'),
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

  const turnName = snapshot.turn === 1 ? settings.player1Name : settings.player2Name
  const winnerName = snapshot.winner === 1 ? settings.player1Name : settings.player2Name
  const throwKey = online ? 'Space' : snapshot.turn === 1 ? 'Space' : 'Enter'

  return (
    <div className="game-shell">
      <Scoreboard
        name1={settings.player1Name}
        name2={settings.player2Name}
        score1={snapshot.score1}
        score2={snapshot.score2}
        pulse={snapshot.phase === 'result' && snapshot.points > 0}
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
                  New Throws
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
          {turnName}&apos;s turn · press {throwKey} &nbsp;|&nbsp; Body 5 · Arm 3 · Leg 2
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
