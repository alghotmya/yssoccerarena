import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { FACE_PATHS } from '../game/constants'
import { InputManager } from '../game/input'
import { attachMatchNet, requestOnlineRematch } from '../net/matchNet'
import { BOT_COUNT } from '../snake/constants'
import { SnakeEngine } from '../snake/engine'
import { SnakeRenderer } from '../snake/renderer'
import type { LeaderRow, SnakeSettings, SnakeSnapshot } from '../snake/types'
import type { OnlineSession } from '../types'

interface SnakeCanvasProps {
  settings: SnakeSettings
  online?: OnlineSession | null
  onNewGame: () => void
  onChangeGame: () => void
}

const emptySnapshot: SnakeSnapshot = {
  phase: 'countdown',
  countdown: 3,
  score1: 0,
  score2: 0,
  length1: 12,
  length2: 12,
  expression1: 'happy',
  expression2: 'happy',
  winner: null,
  leaderboard: [],
  aliveBots: BOT_COUNT,
  totalBots: BOT_COUNT,
}

export function SnakeCanvas({ settings, online = null, onNewGame, onChangeGame }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SnakeEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<SnakeSnapshot>(emptySnapshot)
  const [peerLeft, setPeerLeft] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()
    const input = new InputManager()
    const renderer = new SnakeRenderer(canvas)
    renderer.focusSeat = online?.seat ?? 1
    renderer.splitScreen = !online
    let disposed = false
    let drawRaf = 0
    let detachNet: (() => void) | undefined

    const engine = new SnakeEngine(settings, input, {
      onSnapshot: (next) => setSnapshot({ ...next, leaderboard: next.leaderboard.map((r) => ({ ...r })) }),
      onEat: () => audio.play('coin'),
      onHit: () => audio.play('hit'),
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
  const board = snapshot.leaderboard

  return (
    <div className="game-shell snake-shell">
      <div className="snake-topbar">
        <div className="snake-kill-card p1">
          <img src={FACE_PATHS[1][snapshot.expression1]} alt="" />
          <div>
            <strong>{settings.player1Name}</strong>
            <span>
              {snapshot.score1} kills · {snapshot.length1} long
            </span>
          </div>
        </div>
        <div className="snake-match-meta">
          <p className="snake-meta-title">Face-Off Snake</p>
          <p>
            First to {settings.winningScore} kills · {snapshot.aliveBots}/{snapshot.totalBots} bots
            live
          </p>
        </div>
        <div className="snake-kill-card p2">
          <div>
            <strong>{settings.player2Name}</strong>
            <span>
              {snapshot.score2} kills · {snapshot.length2} long
            </span>
          </div>
          <img src={FACE_PATHS[2][snapshot.expression2]} alt="" />
        </div>
      </div>

      <div className="canvas-wrap snake-wide">
        <canvas ref={canvasRef} className="game-canvas snake-canvas" />
        {peerLeft && <div className="peer-left-banner">Opponent disconnected</div>}
        {snapshot.phase === 'gameover' && snapshot.winner && (
          <div className="overlay gameover">
            <div className="gameover-card">
              <div className="trophy" aria-hidden>
                🏆
              </div>
              <h2>{winnerName} Wins!</h2>
              <p className="final-score">
                {snapshot.score1} — {snapshot.score2} kills
              </p>
              <LeaderList rows={board} />
              <div className="gameover-actions">
                <button type="button" className="btn primary" onClick={restart}>
                  Rematch
                </button>
                <button type="button" className="btn" onClick={onNewGame}>
                  New Arena
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
            ? `Online · Player ${online.seat} · Arrows steer · Space boost · Bots fill the room`
            : 'P1 Arrows+Space · P2 local WASD+Enter · Crash bodies / eat pellets · Bots join automatically'}
        </p>
        <div className="toolbar-actions">
          {snapshot.phase !== 'gameover' && (!online || online.seat === 1) && (
            <button type="button" className="btn" onClick={restart}>
              Restart Arena
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

function LeaderList({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) return null
  return (
    <ol className="snake-final-board">
      {rows.slice(0, 5).map((row, i) => (
        <li key={row.uid}>
          <span style={{ color: row.color }}>
            {i + 1}. {row.kind === 'bot' ? '🤖 ' : ''}
            {row.name}
          </span>
          <span>{row.length}</span>
        </li>
      ))}
    </ol>
  )
}
