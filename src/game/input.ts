import type { NetInputFrame, Seat } from '../net/protocol'

const BLOCKED_CODES = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
])

type LocalMode = 'both' | Seat

export class InputManager {
  private pressed = new Set<string>()
  private justPressed = new Set<string>()
  private enabled = false
  /** `both` = local couch co-op. Seat number = online local player uses P1 keys. */
  localMode: LocalMode = 'both'
  private remote: NetInputFrame = { move: { x: 0, y: 0 }, jump: false, a: false, b: false }
  private remoteActionA = false
  private remoteActionB = false

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    this.onBlur = this.onBlur.bind(this)
  }

  setLocalMode(mode: LocalMode) {
    this.localMode = mode
  }

  applyRemoteInput(frame: NetInputFrame) {
    this.remote = {
      move: { x: frame.move?.x ?? 0, y: frame.move?.y ?? 0 },
      jump: Boolean(frame.jump),
      a: Boolean(frame.a),
      b: Boolean(frame.b),
    }
    if (frame.a) this.remoteActionA = true
    if (frame.b) this.remoteActionB = true
  }

  clearRemoteInput() {
    this.remote = { move: { x: 0, y: 0 }, jump: false, a: false, b: false }
    this.remoteActionA = false
    this.remoteActionB = false
  }

  /** Snapshot of local controls to send over the network (always P1 bindings). */
  sampleLocalNetInput(): NetInputFrame {
    return {
      move: this.keyboardP1Move(),
      jump: this.isDown('KeyW'),
      a: this.justPressed.has('Space'),
      b: this.justPressed.has('KeyS'),
    }
  }

  start() {
    if (this.enabled) return
    this.enabled = true
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  stop() {
    this.enabled = false
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.pressed.clear()
    this.justPressed.clear()
    this.clearRemoteInput()
  }

  isDown(code: string) {
    return this.pressed.has(code)
  }

  consumeJustPressed(code: string) {
    if (!this.justPressed.has(code)) return false
    this.justPressed.delete(code)
    return true
  }

  endFrame() {
    this.justPressed.clear()
  }

  getPlayer1Move(): { x: number; y: number } {
    return this.getSeatMove(1)
  }

  getPlayer2Move(): { x: number; y: number } {
    return this.getSeatMove(2)
  }

  seatJumpHeld(seat: Seat) {
    if (this.localMode === 'both') {
      return seat === 1 ? this.isDown('KeyW') : this.isDown('ArrowUp')
    }
    if (seat === this.localMode) return this.isDown('KeyW')
    return Boolean(this.remote.jump)
  }

  seatActionA(seat: Seat) {
    if (this.localMode === 'both') {
      return seat === 1
        ? this.consumeJustPressed('Space')
        : this.consumeJustPressed('Enter')
    }
    if (seat === this.localMode) return this.consumeJustPressed('Space')
    if (!this.remoteActionA) return false
    this.remoteActionA = false
    return true
  }

  seatActionB(seat: Seat) {
    if (this.localMode === 'both') {
      return seat === 1
        ? this.consumeJustPressed('KeyS')
        : this.consumeJustPressed('ArrowDown')
    }
    if (seat === this.localMode) return this.consumeJustPressed('KeyS')
    if (!this.remoteActionB) return false
    this.remoteActionB = false
    return true
  }

  private getSeatMove(seat: Seat) {
    if (this.localMode === 'both') {
      return seat === 1 ? this.keyboardP1Move() : this.keyboardP2Move()
    }
    if (seat === this.localMode) return this.keyboardP1Move()
    return { ...this.remote.move }
  }

  private keyboardP1Move(): { x: number; y: number } {
    let x = 0
    let y = 0
    if (this.isDown('KeyA')) x -= 1
    if (this.isDown('KeyD')) x += 1
    if (this.isDown('KeyW')) y -= 1
    if (this.isDown('KeyS')) y += 1
    return normalize(x, y)
  }

  private keyboardP2Move(): { x: number; y: number } {
    let x = 0
    let y = 0
    if (this.isDown('ArrowLeft')) x -= 1
    if (this.isDown('ArrowRight')) x += 1
    if (this.isDown('ArrowUp')) y -= 1
    if (this.isDown('ArrowDown')) y += 1
    return normalize(x, y)
  }

  private onKeyDown(e: KeyboardEvent) {
    if (BLOCKED_CODES.has(e.code)) e.preventDefault()
    if (e.repeat) return
    if (!this.pressed.has(e.code)) this.justPressed.add(e.code)
    this.pressed.add(e.code)
  }

  private onKeyUp(e: KeyboardEvent) {
    if (BLOCKED_CODES.has(e.code)) e.preventDefault()
    this.pressed.delete(e.code)
  }

  private onBlur() {
    this.pressed.clear()
    this.justPressed.clear()
  }
}

function normalize(x: number, y: number) {
  const len = Math.hypot(x, y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: x / len, y: y / len }
}
