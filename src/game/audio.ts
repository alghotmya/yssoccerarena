type SfxKind =
  | 'kick'
  | 'punch'
  | 'hit'
  | 'jump'
  | 'wall'
  | 'player'
  | 'goal'
  | 'countdown'
  | 'win'
  | 'whistle'
  | 'ko'
  | 'fight'
  | 'coin'

export class AudioManager {
  private ctx: AudioContext | null = null
  enabled = true

  setEnabled(value: boolean) {
    this.enabled = value
  }

  resume() {
    if (!this.enabled) return
    const ctx = this.getCtx()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  play(kind: SfxKind) {
    if (!this.enabled) return
    const ctx = this.getCtx()
    if (ctx.state === 'suspended') void ctx.resume()

    switch (kind) {
      case 'punch':
        this.thud(140, 70, 0.09, 0.2)
        this.noiseBurst(0.06, 0.16)
        break
      case 'kick':
        this.thud(110, 48, 0.14, 0.24)
        this.noiseBurst(0.1, 0.2)
        this.blip(220, 0.05, 'square', 0.06)
        break
      case 'hit':
        this.noiseBurst(0.08, 0.22)
        this.thud(240, 90, 0.1, 0.16)
        break
      case 'jump':
        this.sweep(280, 720, 0.12, 'square', 0.08)
        break
      case 'wall':
        this.noiseBurst(0.04, 0.1)
        this.blip(160, 0.05, 'triangle', 0.08)
        break
      case 'player':
        this.play('hit')
        break
      case 'goal':
        this.noiseBurst(0.25, 0.08)
        this.arpeggio([392, 523, 659, 784, 1046], 0.09, 0.16)
        break
      case 'countdown':
        this.blip(660, 0.08, 'square', 0.1)
        break
      case 'fight':
        this.arpeggio([523, 784, 1046], 0.07, 0.18)
        this.noiseBurst(0.12, 0.08)
        break
      case 'ko':
        this.thud(180, 40, 0.45, 0.28)
        this.noiseBurst(0.3, 0.18)
        this.blip(880, 0.12, 'square', 0.08)
        break
      case 'win':
        this.arpeggio([523, 659, 784, 1046, 1318], 0.11, 0.18)
        this.noiseBurst(0.35, 0.06)
        break
      case 'whistle':
        this.sweep(700, 980, 0.16, 'square', 0.07)
        break
      case 'coin':
        this.blip(988, 0.06, 'square', 0.1)
        setTimeout(() => this.blip(1318, 0.12, 'square', 0.1), 70)
        break
    }
  }

  private getCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  private blip(freq: number, duration: number, type: OscillatorType, gainValue: number) {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  private sweep(from: number, to: number, duration: number, type: OscillatorType, gainValue: number) {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration)
    gain.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  private thud(from: number, to: number, duration: number, gainValue: number) {
    this.sweep(from, Math.max(30, to), duration, 'sine', gainValue)
  }

  private arpeggio(notes: number[], step: number, gainValue: number) {
    notes.forEach((freq, i) => {
      setTimeout(() => this.blip(freq, step * 1.4, 'square', gainValue), i * step * 1000)
    })
  }

  private noiseBurst(duration: number, gainValue: number) {
    const ctx = this.getCtx()
    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const fade = 1 - i / bufferSize
      data[i] = (Math.random() * 2 - 1) * fade
    }
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    source.buffer = buffer
    gain.gain.value = gainValue
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  }
}
