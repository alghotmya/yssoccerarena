import { useEffect, useRef, useState } from 'react'
import { AudioManager } from '../game/audio'
import { SHOWCASE, SLIDE_MS } from '../showcase'
import { RotatingArt } from './RotatingArt'

const START_SECONDS = 5

interface VersusScreenProps {
  title: string
  player1Name: string
  player2Name: string
  soundEnabled: boolean
  onStart: () => void
  onBack: () => void
}

export function VersusScreen({
  title,
  player1Name,
  player2Name,
  soundEnabled,
  onStart,
  onBack,
}: VersusScreenProps) {
  const [seconds, setSeconds] = useState(START_SECONDS)
  const started = useRef(false)
  const audio = useRef(new AudioManager())

  useEffect(() => {
    audio.current.setEnabled(soundEnabled)
    audio.current.resume()
    audio.current.play('fight')
  }, [soundEnabled])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }
        audio.current.play('countdown')
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (seconds === 0) begin()
  }, [seconds])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        begin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function begin() {
    if (started.current) return
    started.current = true
    audio.current.play('whistle')
    onStart()
  }

  return (
    <div className="versus-screen">
      <p className="eyebrow">{title}</p>
      <RotatingArt
        images={SHOWCASE}
        intervalMs={SLIDE_MS}
        className="versus-art"
        alt={`${player1Name} versus ${player2Name}`}
      />
      <div className="versus-names">
        <span>{player1Name}</span>
        <span className="versus-vs">VS</span>
        <span>{player2Name}</span>
      </div>
      <div className="versus-actions">
        <div className="versus-clock" aria-live="polite">
          <span>{seconds}</span>
          <small>{seconds === 0 ? 'Go!' : 'Starts in'}</small>
        </div>
        <button type="button" className="btn primary mega versus-start" onClick={begin}>
          Start Game
        </button>
        <button type="button" className="btn ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
