import { useEffect, useRef, useState } from 'react'
import { getMultiplayerClient } from '../net/client'
import { isOnlineConfigured } from '../net/config'
import type { GameKind, Seat, ServerMessage } from '../net/protocol'
import type { OnlineSession } from '../types'

interface OnlineLobbyProps {
  game: GameKind
  gameTitle: string
  defaultName: string
  settings: Record<string, unknown>
  onBack: () => void
  onReady: (session: OnlineSession, settings: Record<string, unknown>) => void
}

export function OnlineLobby({
  game,
  gameTitle,
  defaultName,
  settings,
  onBack,
  onReady,
}: OnlineLobbyProps) {
  const configured = isOnlineConfigured()
  const [playerName, setPlayerName] = useState(defaultName)
  const [roomCode, setRoomCode] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [seat, setSeat] = useState<Seat | null>(null)
  const [status, setStatus] = useState('Connect to play online')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [guestHere, setGuestHere] = useState(false)
  const [hostName, setHostName] = useState('')
  const [guestName, setGuestName] = useState('')

  const seatRef = useRef<Seat | null>(null)
  const codeRef = useRef<string | null>(null)
  const onReadyRef = useRef(onReady)
  const busyTimer = useRef<number | null>(null)
  onReadyRef.current = onReady

  const clearBusyTimer = () => {
    if (busyTimer.current != null) {
      window.clearTimeout(busyTimer.current)
      busyTimer.current = null
    }
  }

  const armBusyTimeout = (label: string) => {
    clearBusyTimer()
    busyTimer.current = window.setTimeout(() => {
      setBusy(false)
      setError(`${label} timed out — check your connection and try again`)
      setStatus('Something went wrong')
    }, 10000)
  }

  useEffect(() => {
    const client = getMultiplayerClient()
    const unsub = client.onMessage((msg: ServerMessage) => {
      if (msg.type === 'error') {
        clearBusyTimer()
        setError(msg.message)
        setBusy(false)
        setStatus('Something went wrong')
      }
      if (msg.type === 'roomCreated') {
        clearBusyTimer()
        seatRef.current = msg.seat
        codeRef.current = msg.roomCode
        setCreatedCode(msg.roomCode)
        setSeat(msg.seat)
        setHostName(msg.playerName)
        setBusy(false)
        setStatus('Waiting for opponent…')
        setError(null)
      }
      if (msg.type === 'roomJoined') {
        clearBusyTimer()
        seatRef.current = msg.seat
        codeRef.current = msg.roomCode
        setCreatedCode(msg.roomCode)
        setSeat(msg.seat)
        setHostName(msg.hostName)
        setGuestName(msg.playerName)
        setBusy(false)
        setStatus('Connected — waiting for host to start')
        setError(null)
      }
      if (msg.type === 'peerJoined') {
        setGuestHere(true)
        setGuestName(msg.guestName)
        setStatus(`${msg.guestName} joined`)
      }
      if (msg.type === 'peerLeft') {
        setGuestHere(false)
        setGuestName('')
        setStatus('Opponent left — waiting for a new guest…')
      }
      if (msg.type === 'matchStart') {
        const localSeat = seatRef.current
        const code = codeRef.current
        if (!localSeat || !code) return
        onReadyRef.current({ seat: localSeat, roomCode: code }, msg.settings)
      }
    })
    return () => {
      clearBusyTimer()
      unsub()
    }
  }, [])

  const createRoom = async () => {
    if (!configured) return
    setBusy(true)
    setError(null)
    setStatus('Creating room…')
    armBusyTimeout('Create room')
    try {
      const client = getMultiplayerClient()
      client.disconnect()
      await client.connect()
      const name = playerName.trim() || defaultName
      client.send({
        type: 'createRoom',
        game,
        settings: { ...settings, player1Name: name },
        playerName: name,
      })
    } catch (err) {
      clearBusyTimer()
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Connect failed')
    }
  }

  const joinRoom = async () => {
    if (!configured) return
    const code = roomCode.trim().toUpperCase()
    if (code.length < 4) {
      setError('Enter a valid room code')
      return
    }
    setBusy(true)
    setError(null)
    setStatus('Joining room…')
    armBusyTimeout('Join room')
    try {
      const client = getMultiplayerClient()
      client.disconnect()
      await client.connect()
      const name = playerName.trim() || 'Player 2'
      client.send({
        type: 'joinRoom',
        roomCode: code,
        playerName: name,
      })
    } catch (err) {
      clearBusyTimer()
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Connect failed')
    }
  }

  return (
    <div className="start-screen">
      <div className="start-glow" />
      <header className="start-hero">
        <p className="eyebrow">Online · Canada Central</p>
        <h1>{gameTitle}</h1>
        <p className="subtitle">Create a room or join with a code. Host runs the match.</p>
      </header>

      {!configured && (
        <p className="online-banner warn">
          Online play needs <code>VITE_WS_URL</code> (deploy the CDK stack, then set the Amplify env var).
        </p>
      )}

      <div className="setup-form online-form">
        <label>
          Your name
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={16}
            disabled={Boolean(createdCode)}
          />
        </label>

        {!createdCode && (
          <>
            <button
              type="button"
              className="btn primary mega"
              disabled={!configured || busy}
              onClick={() => void createRoom()}
            >
              Create room
            </button>
            <div className="online-divider">or join</div>
            <div className="form-row">
              <label>
                Room code
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="ABC123"
                  disabled={busy}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn wide"
              disabled={!configured || busy || roomCode.trim().length < 4}
              onClick={() => void joinRoom()}
            >
              Join room
            </button>
          </>
        )}

        {createdCode && (
          <div className="room-panel">
            <p className="room-code-label">Room code</p>
            <p className="room-code">{createdCode}</p>
            <p className="online-status">
              {hostName || 'Host'} vs {guestName || '…'}
            </p>
            <p className="online-status">{status}</p>
            {seat === 1 && (
              <button
                type="button"
                className="btn primary mega"
                disabled={!guestHere}
                onClick={() => {
                  try {
                    getMultiplayerClient().send({ type: 'startMatch' })
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Not connected')
                  }
                }}
              >
                {guestHere ? 'Start match' : 'Waiting for guest…'}
              </button>
            )}
            {seat === 2 && <p className="online-status">You are Player 2 — waiting for host</p>}
          </div>
        )}

        {error && <p className="online-error">{error}</p>}

        <button
          type="button"
          className="btn ghost wide"
          onClick={() => {
            clearBusyTimer()
            getMultiplayerClient().disconnect()
            onBack()
          }}
        >
          Back
        </button>

        <p className="online-hint">
          Online: each player uses <strong>Arrow keys</strong> · <strong>Space</strong> action · local P2 uses
          WASD when couch co-op
          {game === 'fight' ? ' · hold ↑ jump · Left Shift kick' : ''}
        </p>
      </div>
    </div>
  )
}
