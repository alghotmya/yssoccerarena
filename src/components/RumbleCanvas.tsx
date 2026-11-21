import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { FACE_PATHS } from '../game/constants'
import { InputManager } from '../game/input'
import { attachMatchNet, requestOnlineRematch } from '../net/matchNet'
import { MAX_HEALTH, METER_MAX } from '../rumble/constants'
import { RumbleEngine } from '../rumble/engine'
import { RumbleRenderer } from '../rumble/renderer'
import type { RumbleSettings, RumbleSnapshot } from '../rumble/types'
import type { OnlineSession } from '../types'

interface RumbleCanvasProps {
  settings: RumbleSettings
  online?: OnlineSession | null
  onNewGame: () => void
  onChangeGame: () => void
}

const emptySnapshot: RumbleSnapshot = {
  phase: 'countdown',
  countdown: 3,
  health1: MAX_HEALTH,
  health2: MAX_HEALTH,
  meter1: 40,
  meter2: 40,
  rounds1: 0,
  rounds2: 0,
  timer: 99,
  expression1: 'angry',
  expression2: 'angry',
  winner: null,
  lastHit: null,
  combo: 0,
}

export function RumbleCanvas({ settings, online = null, onNewGame, onChangeGame }: RumbleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<RumbleEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<RumbleSnapshot>(emptySnapshot)
  const [peerLeft, setPeerLeft] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()
    const input = new InputManager()
    const renderer = new RumbleRenderer(canvas)
    let disposed = false
    let drawRaf = 0
    let detachNet: (() => void) | undefined

    const engine = new RumbleEngine(settings, input, {
      onSnapshot: (next) => setSnapshot({ ...next }),
      onAttack: (kind) => audio.play(kind === 'kick' ? 'kick' : 'hit'),
      onJump: () => audio.play('coin'),
      onHit: () => audio.play('hit'),
      onBlock: () => audio.play('wall'),
      onKo: () => audio.play('goal'),
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

  return (
    <div className="game-shell">
      <div className="rumble-hud">
        <FighterHud
          side="p1"
          name={settings.player1Name}
          health={snapshot.health1}
          meter={snapshot.meter1}
          rounds={snapshot.rounds1}
          roundsToWin={settings.roundsToWin}
          face={FACE_PATHS[1][snapshot.expression1]}
        />
        <div className="rumble-timer">
          <strong>{snapshot.timer}</strong>
          <span>
            {snapshot.rounds1} – {snapshot.rounds2}
          </span>
        </div>
        <FighterHud
          side="p2"
          name={settings.player2Name}
          health={snapshot.health2}
          meter={snapshot.meter2}
          rounds={snapshot.rounds2}
          roundsToWin={settings.roundsToWin}
          face={FACE_PATHS[2][snapshot.expression2]}
        />
      </div>

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
                Rounds {snapshot.rounds1} — {snapshot.rounds2}
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
                  New Rumble
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
            ? `Online · Player ${online.seat} · Arrows move · Space punch · ↓ kick · F special · hold back block`
            : 'Red: WASD · Space punch · S kick · F special  |  Blue: Arrows · Enter punch · ↓ kick · L special  |  Hold back to block'}
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

function FighterHud({
  side,
  name,
  health,
  meter,
  rounds,
  roundsToWin,
  face,
}: {
  side: 'p1' | 'p2'
  name: string
  health: number
  meter: number
  rounds: number
  roundsToWin: number
  face: string
}) {
  const hp = Math.max(0, Math.min(100, (health / MAX_HEALTH) * 100))
  const mp = Math.max(0, Math.min(100, (meter / METER_MAX) * 100))
  return (
    <div className={`rumble-fighter-hud ${side}`}>
      <img src={face} alt="" />
      <div className="rumble-bars">
        <strong>{name}</strong>
        <div className="rumble-hp-track">
          <div className="rumble-hp-fill" style={{ width: `${hp}%` }} />
        </div>
        <div className="rumble-meter-track">
          <div className="rumble-meter-fill" style={{ width: `${mp}%` }} />
        </div>
        <div className="rumble-pips">
          {Array.from({ length: roundsToWin }, (_, i) => (
            <span key={i} className={i < rounds ? 'on' : ''} />
          ))}
        </div>
      </div>
    </div>
  )
}
