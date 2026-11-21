import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { FACE_PATHS } from '../game/constants'
import { InputManager } from '../game/input'
import { attachMatchNet, requestOnlineRematch } from '../net/matchNet'
import { LEVELS } from '../jets/levels'
import { JetsEngine } from '../jets/engine'
import { JetsRenderer } from '../jets/renderer'
import type { JetsSettings, JetsSnapshot } from '../jets/types'
import type { OnlineSession } from '../types'

interface JetsCanvasProps {
  settings: JetsSettings
  online?: OnlineSession | null
  onNewGame: () => void
  onChangeGame: () => void
}

const emptySnapshot: JetsSnapshot = {
  phase: 'intro',
  levelIndex: 0,
  levelName: LEVELS[0]!.name,
  levelTag: LEVELS[0]!.tag,
  score: 0,
  lives: 3,
  bombs: 3,
  killed: 0,
  quota: LEVELS[0]!.quota,
  combo: 0,
  power: 1,
  homing: false,
  shield: 0,
  rapid: 0,
  bossHp: 0,
  bossMax: 0,
  bossName: null,
  toast: '',
  expression1: 'happy',
  expression2: 'happy',
  won: false,
}

export function JetsCanvas({ settings, online = null, onNewGame, onChangeGame }: JetsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<JetsEngine | null>(null)
  const audioRef = useRef(new AudioManager())
  const [snapshot, setSnapshot] = useState<JetsSnapshot>(emptySnapshot)
  const [peerLeft, setPeerLeft] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const audio = audioRef.current
    audio.setEnabled(settings.soundEnabled)
    audio.resume()
    const input = new InputManager()
    const renderer = new JetsRenderer(canvas)
    let disposed = false
    let drawRaf = 0
    let detachNet: (() => void) | undefined

    const engine = new JetsEngine(settings, input, {
      onSnapshot: (next) => setSnapshot({ ...next }),
      onShoot: () => audio.play('kick'),
      onHit: () => audio.play('hit'),
      onBoom: () => audio.play('goal'),
      onPower: () => audio.play('coin'),
      onHurt: () => audio.play('wall'),
      onWin: () => audio.play('win'),
      onLose: () => audio.play('hit'),
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

  const ended = snapshot.phase === 'gameover' || snapshot.phase === 'victory'

  return (
    <div className="game-shell jets-shell">
      <div className="jets-hud">
        <div className="jets-pilot">
          <img src={FACE_PATHS[1][snapshot.expression1]} alt="" />
          <div>
            <strong>{settings.player1Name}</strong>
            <span>
              W{snapshot.power}
              {snapshot.homing ? ' · H' : ''}
              {snapshot.rapid > 0 ? ' · R' : ''}
              {snapshot.shield > 0 ? ' · S' : ''}
            </span>
          </div>
        </div>
        <div className="jets-meta">
          <p className="jets-level">
            Sector {snapshot.levelIndex + 1}/{LEVELS.length} · {snapshot.levelName}
          </p>
          <p>
            Score {snapshot.score.toLocaleString()} · Lives {snapshot.lives} · Bombs {snapshot.bombs} ·{' '}
            {snapshot.killed}/{snapshot.quota}
            {snapshot.combo > 1 ? ` · x${(1 + Math.min(snapshot.combo, 20) * 0.1).toFixed(1)}` : ''}
          </p>
          {snapshot.toast && <p className="jets-toast">{snapshot.toast}</p>}
        </div>
        {settings.coop ? (
          <div className="jets-pilot p2">
            <div>
              <strong>{settings.player2Name}</strong>
              <span>Wingman</span>
            </div>
            <img src={FACE_PATHS[2][snapshot.expression2]} alt="" />
          </div>
        ) : (
          <div className="jets-pilot ghost">
            <span>Solo sortie</span>
          </div>
        )}
      </div>

      <div className="canvas-wrap jets-wide">
        <canvas ref={canvasRef} className="game-canvas" />
        {peerLeft && <div className="peer-left-banner">Wingman disconnected</div>}
        {ended && (
          <div className="overlay gameover">
            <div className="gameover-card">
              <div className="trophy" aria-hidden>
                {snapshot.won ? '🏆' : '💥'}
              </div>
              <h2>{snapshot.won ? 'Galaxy Secured!' : 'Mission Failed'}</h2>
              <p className="final-score">{snapshot.score.toLocaleString()} pts</p>
              <p>
                {snapshot.won
                  ? `All ${LEVELS.length} sectors cleared`
                  : `Reached sector ${snapshot.levelIndex + 1}`}
              </p>
              <div className="gameover-actions">
                <button type="button" className="btn primary" onClick={restart}>
                  Fly Again
                </button>
                <button type="button" className="btn" onClick={onNewGame}>
                  Hangar
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
            ? `Online co-op · Player ${online.seat} · Arrows fly · Shift bomb`
            : 'WASD / Arrows fly · auto-fire · B or Shift bomb · grab glowing power-ups'}
        </p>
        <div className="toolbar-actions">
          {!ended && (!online || online.seat === 1) && (
            <button type="button" className="btn" onClick={restart}>
              Restart Campaign
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
