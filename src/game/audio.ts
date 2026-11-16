type SfxKind = 'kick' | 'wall' | 'player' | 'goal' | 'countdown' | 'win' | 'whistle'

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
      case 'kick':
        this.blip(180, 0.08, 'square', 0.12)
        this.noiseBurst(0.05, 0.08)
        break
      case 'wall':
        this.blip(90, 0.06, 'triangle', 0.1)
        break
      case 'player':
        this.blip(140, 0.05, 'sine', 0.08)
        break
      case 'goal':
        this.arpeggio([392, 523, 659, 784], 0.12, 0.18)
        break
      case 'countdown':
        this.blip(440, 0.1, 'sine', 0.12)
        break
      case 'win':
        this.arpeggio([523, 659, 784, 1046], 0.14, 0.22)
        break
      case 'whistle':
        this.blip(880, 0.18, 'sawtooth', 0.08)
        break
    }
  }

  private getCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  private blip(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
  ) {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = gainValue
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  private arpeggio(notes: number[], step: number, gainValue: number) {
    notes.forEach((freq, i) => {
      setTimeout(() => this.blip(freq, step * 1.2, 'triangle', gainValue), i * step * 1000)
    })
  }

  private noiseBurst(duration: number, gainValue: number) {
    const ctx = this.getCtx()
    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    gain.gain.value = gainValue
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  }
}
