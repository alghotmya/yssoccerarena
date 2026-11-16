import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { GameEngine } from '../game/gameEngine'
import { InputManager } from '../game/input'
import { Renderer } from '../game/renderer'
import type { GameSnapshot, MatchSettings, PlayerId } from '../types'
import { GoalCelebration } from './GoalCelebration'
import { GameOverScreen } from './GameOverScreen'
import { Scoreboard } from './Scoreboard'

interface GameCanvasProps {
  settings: MatchSettings
  onNewGame: () => void
  onChangePlayers: () => void
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

export function GameCanvas({ settings, onNewGame, onChangePlayers }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<GameSnapshot>(emptySnapshot)
  const [scorePulse, setScorePulse] = useState(false)

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

  const handleRematch = () => {
    audioRef.current.resume()
    engineRef.current?.rematch()
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
        <p className="hint-bar">Blue: WASD + Space &nbsp;|&nbsp; Red: Arrows + Enter</p>
        {snapshot.phase !== 'gameover' && (
          <button type="button" className="btn" onClick={handleRematch}>
            Restart Match
          </button>
        )}
      </div>
    </div>
  )
}
