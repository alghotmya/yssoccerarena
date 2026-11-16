const BLOCKED_CODES = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
])

export class InputManager {
  private pressed = new Set<string>()
  private justPressed = new Set<string>()
  private enabled = false

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    this.onBlur = this.onBlur.bind(this)
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
    let x = 0
    let y = 0
    if (this.isDown('KeyA')) x -= 1
    if (this.isDown('KeyD')) x += 1
    if (this.isDown('KeyW')) y -= 1
    if (this.isDown('KeyS')) y += 1
    return normalize(x, y)
  }

  getPlayer2Move(): { x: number; y: number } {
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
