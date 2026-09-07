// Tiny synthesized SFX kit — no assets, instant load, arcade punch.
export class AudioKit {
  constructor () {
    this.ctx = null
    this.master = null
    this.volume = 0.7
    this.enabled = true
    this.noise = null
  }
  init () {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.volume
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 8
    this.master.connect(comp).connect(this.ctx.destination)
    const len = this.ctx.sampleRate * 1.0
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.noise = buf
  }
  resume () { this.init(); if (this.ctx?.state === 'suspended') this.ctx.resume() }
  setVolume (v) { this.volume = v; if (this.master) this.master.gain.value = v }

  _noiseBurst (dur, freq, q, gain, type = 'bandpass') {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.playbackRate.value = 1 + Math.random() * 0.2
    const filt = this.ctx.createBiquadFilter()
    filt.type = type
    filt.frequency.value = freq
    filt.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    src.connect(filt).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.02)
  }
  _tone (freq, dur, gain, type = 'sine', slide = 0) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  shot (p = {}) {
    if (!this.enabled) return
    const { pitch = 1, len = 0.16, gain = 0.5, body = 180 } = p
    this._noiseBurst(len, 1400 * pitch, 0.8, gain)
    this._noiseBurst(len * 1.7, 320 * pitch, 0.5, gain * 0.5, 'lowpass')
    this._tone(body * pitch, len * 0.8, gain * 0.5, 'square', -body * 0.6 * pitch)
  }
  melee () { this.enabled && this._noiseBurst(0.16, 900, 1.2, 0.28, 'bandpass') }
  hit () { this.enabled && this._tone(1250, 0.07, 0.22, 'square', 250) }
  headshot () { this.enabled && (this._tone(1500, 0.07, 0.25, 'square', 500), this._tone(2200, 0.06, 0.16, 'sine')) }
  kill () {
    if (!this.enabled) return
    this._tone(660, 0.1, 0.22, 'triangle')
    setTimeout(() => this._tone(990, 0.16, 0.22, 'triangle'), 70)
  }
  reload () {
    if (!this.enabled) return
    this._tone(320, 0.05, 0.16, 'square', -120)
    setTimeout(() => this._tone(240, 0.07, 0.16, 'square', -80), 160)
  }
  explode () {
    if (!this.enabled) return
    this._noiseBurst(0.75, 180, 0.4, 0.75, 'lowpass')
    this._tone(70, 0.55, 0.5, 'sine', -40)
  }
  jump () { this.enabled && this._tone(420, 0.07, 0.09, 'sine', 180) }
  land (i = 1) { this.enabled && this._noiseBurst(0.12, 260, 0.6, 0.1 + 0.18 * i, 'lowpass') }
  slide () { this.enabled && this._noiseBurst(0.42, 620, 0.9, 0.16) }
  step (s = 1) { this.enabled && this._noiseBurst(0.06, 300 + Math.random() * 120, 1.4, 0.05 * s, 'lowpass') }
  ui (up = true) { this.enabled && this._tone(up ? 720 : 420, 0.05, 0.1, 'triangle', up ? 180 : -120) }
  beep () { this.enabled && this._tone(880, 0.08, 0.12, 'square') }
  hurt () { this.enabled && this._noiseBurst(0.2, 500, 0.7, 0.3, 'bandpass') }
  roundWin () { this.enabled && [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 0.16, 'triangle'), i * 90)) }
  roundLose () { this.enabled && [392, 330, 262].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 0.14, 'sawtooth'), i * 110)) }
}
