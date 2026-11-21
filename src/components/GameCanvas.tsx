import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { GameEngine } from '../game/gameEngine'
import { InputManager } from '../game/input'
import { Renderer } from '../game/renderer'
import { attachMatchNet, requestOnlineRematch } from '../net/matchNet'
import type { GameSnapshot, MatchSettings, OnlineSession, PlayerId } from '../types'
import { GoalCelebration } from './GoalCelebration'
import { GameOverScreen } from './GameOverScreen'
import { Scoreboard } from './Scoreboard'

interface GameCanvasProps {
  settings: MatchSettings
  online?: OnlineSession | null
  onNewGame: () => void
  onChangePlayers: () => void
  onChangeGame?: () => void
}

const emptySnapshot: GameSnapshot = {
  phase: 'countdown',
  countdown: 3,
  score1: 0,
  score2: 0,
  lastScorer: null,
  spectacular: false,
  goalCelebrationTimer: 0,
  expression1: 'happy',
  expression2: 'happy',
  winner: null,
  nearMissFlash: 0,
}

export function GameCanvas({
  settings,
  online = null,
  onNewGame,
  onChangePlayers,
  onChangeGame,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<GameSnapshot>(emptySnapshot)
  const [scorePulse, setScorePulse] = useState(false)
  const [peerLeft, setPeerLeft] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()

    const input = new InputManager()
    const renderer = new Renderer(canvas)
    let disposed = false
    let drawRaf = 0
    let detachNet: (() => void) | undefined

    const engine = new GameEngine(settings, input, {
      onGoal: () => {
        audio.play('goal')
        setScorePulse(true)
        window.setTimeout(() => setScorePulse(false), 600)
      },
      onNearMiss: () => {
        audio.play('whistle')
      },
      onSave: () => {
        audio.play('player')
      },
      onWallHit: () => audio.play('wall'),
      onPlayerHit: () => audio.play('player'),
      onKick: () => audio.play('kick'),
      onCountdownTick: (value) => {
        if (value > 0) audio.play('countdown')
        else audio.play('whistle')
      },
      onMatchEnd: () => audio.play('win'),
      onSnapshot: (next) => setSnapshot({ ...next }),
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

  const handleRematch = () => {
    audioRef.current.resume()
    if (online?.seat === 1) {
      requestOnlineRematch()
      engineRef.current?.rematch()
    } else if (!online) {
      engineRef.current?.rematch()
    }
    setSnapshot(engineRef.current?.getSnapshot() ?? emptySnapshot)
  }

  return (
    <div className="game-shell">
      <Scoreboard
        name1={settings.player1Name}
        name2={settings.player2Name}
        score1={snapshot.score1}
        score2={snapshot.score2}
        pulse={scorePulse}
        winningScore={settings.winningScore}
      />

      <div className="canvas-wrap">
        <canvas ref={canvasRef} className="game-canvas" />
        {peerLeft && (
          <div className="peer-left-banner">Opponent disconnected</div>
        )}
        {snapshot.phase === 'goal' && (
          <GoalCelebration
            scorer={snapshot.lastScorer}
            name1={settings.player1Name}
            name2={settings.player2Name}
            score1={snapshot.score1}
            score2={snapshot.score2}
            expression1={snapshot.expression1}
            expression2={snapshot.expression2}
            spectacular={snapshot.spectacular}
          />
        )}
        {snapshot.phase === 'gameover' && snapshot.winner && (
          <GameOverScreen
            winner={snapshot.winner as PlayerId}
            name1={settings.player1Name}
            name2={settings.player2Name}
            score1={snapshot.score1}
            score2={snapshot.score2}
            onRematch={handleRematch}
            onNewGame={onNewGame}
            onChangePlayers={onChangePlayers}
          />
        )}
      </div>

      <div className="match-toolbar">
        <p className="hint-bar">
          {online
            ? `Online · You are Player ${online.seat} · Room ${online.roomCode} · WASD + Space`
            : 'Red: WASD + Space  |  Blue: Arrows + Enter'}
        </p>
        <div className="toolbar-actions">
          {snapshot.phase !== 'gameover' && (!online || online.seat === 1) && (
            <button type="button" className="btn" onClick={handleRematch}>
              Restart Match
            </button>
          )}
          {onChangeGame && (
            <button type="button" className="btn ghost" onClick={onChangeGame}>
              All Games
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
