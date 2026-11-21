import type { InputManager } from '../game/input'
import { getMultiplayerClient } from './client'
import type { NetInputFrame, Seat, ServerMessage } from './protocol'

const INPUT_HZ = 20
const STATE_HZ = 15

interface NetBridge {
  exportNetworkState: () => unknown
  applyNetworkState: (state: never) => void
  networkRole: 'local' | 'host' | 'guest'
  rematch: () => void
}

interface AttachMatchNetOptions {
  seat: Seat
  input: InputManager
  engine: NetBridge
  onPeerLeft?: () => void
  onRematch?: () => void
}

/** Host applies remote input + broadcasts state; guest sends input + applies state. */
export function attachMatchNet({
  seat,
  input,
  engine,
  onPeerLeft,
  onRematch,
}: AttachMatchNetOptions): () => void {
  const client = getMultiplayerClient()
  const role = seat === 1 ? 'host' : 'guest'
  engine.networkRole = role
  input.setLocalMode(seat)

  let seq = 0
  const onMessage = (msg: ServerMessage) => {
    if (msg.type === 'peerInput' && role === 'host') {
      input.applyRemoteInput(msg.input as NetInputFrame)
    }
    if (msg.type === 'peerState' && role === 'guest') {
      engine.applyNetworkState(msg.state as never)
    }
    if (msg.type === 'peerLeft') onPeerLeft?.()
    if (msg.type === 'rematch') {
      engine.rematch()
      onRematch?.()
    }
  }

  const unsub = client.onMessage(onMessage)

  let inputTimer = 0
  let stateTimer = 0
  let raf = 0
  let last = performance.now()

  const tick = (now: number) => {
    const dt = (now - last) / 1000
    last = now
    inputTimer += dt
    stateTimer += dt

    if (role === 'guest' && inputTimer >= 1 / INPUT_HZ) {
      inputTimer = 0
      client.send({ type: 'input', input: input.sampleLocalNetInput() })
      input.endFrame()
    }

    if (role === 'host' && stateTimer >= 1 / STATE_HZ) {
      stateTimer = 0
      seq += 1
      client.send({
        type: 'state',
        state: engine.exportNetworkState(),
        seq,
      })
    }

    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    unsub()
    cancelAnimationFrame(raf)
    input.setLocalMode('both')
    input.clearRemoteInput()
    engine.networkRole = 'local'
  }
}

export function requestOnlineRematch() {
  getMultiplayerClient().send({ type: 'rematch' })
}
