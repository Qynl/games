// Tiny procedural audio engine — all sounds are synthesized in-browser
// with WebAudio. No audio assets required. Good enough to make the world
// feel alive without any downloads.

export interface SoundBank {
  pop: () => void
  build: () => void
  step: () => void
  jump: () => void
  thud: () => void
  collect: () => void
  hurt: () => void
  ui: () => void
  fanfare: () => void
  whoosh: () => void
  power: () => void
  rain: () => void
}

interface Opts {
  volume: number
  muted: boolean
  onRainState?: (raining: boolean) => void
}

class Aifx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private rainGain: GainNode | null = null
  private rainTimer: ReturnType<typeof setInterval> | null = null
  private opts: Opts = { volume: 0.5, muted: false }

  configure(o: Partial<Opts>) {
    this.opts = { ...this.opts, ...o }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.opts.muted ? 0 : this.opts.volume, this.ctx.currentTime, 0.03)
    }
  }

  /** must be called from a user gesture at least once */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.opts.muted ? 0 : this.opts.volume
      const comp = this.ctx.createDynamicsCompressor()
      this.master.connect(comp)
      comp.connect(this.ctx.destination)
      this.rainGain = this.ctx.createGain()
      this.rainGain.gain.value = 0
      this.rainGain.connect(this.master)
      // rain loop (brown-ish noise through a lowpass)
      const len = this.ctx.sampleRate * 2
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const lp = this.ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      src.connect(lp)
      lp.connect(this.rainGain)
      src.start()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setRain(on: boolean, intensity = 0.5) {
    if (!this.ctx || !this.rainGain) return
    const target = on ? 0.05 + intensity * 0.09 : 0
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, on ? 0.8 : 0.3)
    if (on && !this.rainTimer) {
      const hiss = () => {
        // random droplets on top of the noise bed
        this.tick(Math.random() * 0.012 + 0.004, 3500 + Math.random() * 3000, 'sine', 0.6)
      }
      this.rainTimer = setInterval(hiss, 110)
    } else if (!on && this.rainTimer) {
      clearInterval(this.rainTimer)
      this.rainTimer = null
    }
    this.opts.onRainState?.(on)
  }

  private tick(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  private noise(dur: number, vol: number, filterFreq = 800, q = 0.8, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = filterFreq
    f.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t)
  }

  private sweep(from: number, to: number, dur: number, vol: number, type: OscillatorType = 'sine') {
    this.tick(from, dur, type, vol, to)
  }

  ui() { this.tick(520, 0.07, 'triangle', 0.12) }
  pop() { this.tick(300 + Math.random() * 120, 0.08, 'triangle', 0.18, 160) }
  step() { this.noise(0.05, 0.05, 300) }
  jump() { this.sweep(260, 500, 0.16, 0.12, 'triangle') }
  thud() { this.noise(0.12, 0.16, 160, 0.6, 'lowpass'); this.tick(70, 0.12, 'sine', 0.14, 40) }
  collect() {
    this.tick(660, 0.08, 'sine', 0.14)
    setTimeout(() => this.tick(990, 0.14, 'sine', 0.14), 60)
  }
  hurt() { this.sweep(220, 90, 0.3, 0.2, 'sawtooth'); this.noise(0.2, 0.1, 400, 0.5, 'highpass') }
  build() {
    this.tick(140, 0.12, 'sine', 0.2, 90)
    this.noise(0.1, 0.12, 500, 1, 'bandpass')
    setTimeout(() => this.pop(), 120)
  }
  whoosh() { this.noise(0.25, 0.07, 1400, 0.6, 'bandpass') }
  fanfare() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => setTimeout(() => this.tick(n, 0.24, 'triangle', 0.13), i * 120))
  }
  power() {
    this.sweep(100, 800, 0.5, 0.14, 'sine')
    setTimeout(() => this.sweep(800, 1500, 0.25, 0.08, 'sine'), 350)
  }
}

export const aifx = new Aifx()
