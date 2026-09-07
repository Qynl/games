// Procedural WebAudio sound effects + music. Everything is synthesized — no audio files.
import { rand } from './util'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private musicTimer: number | null = null
  private nextNoteTime = 0
  private step = 0
  private battleMusic = false

  sfxVolume = 0.9
  musicVolume = 0.45
  muted = false

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(this.ctx.destination)
    this.sfxBus = this.ctx.createGain()
    this.sfxBus.gain.value = this.sfxVolume
    this.sfxBus.connect(this.master)
    this.musicBus = this.ctx.createGain()
    this.musicBus.gain.value = this.musicVolume
    this.musicBus.connect(this.master)
    // white noise buffer
    const len = this.ctx.sampleRate * 1
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v
    if (this.sfxBus) this.sfxBus.gain.value = v
  }
  setMusicVolume(v: number) {
    this.musicVolume = v
    if (this.musicBus) this.musicBus.gain.value = v
  }
  setMuted(m: boolean) {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : 1
  }

  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType
      vol?: number
      slide?: number
      delay?: number
      attack?: number
      bus?: GainNode | null
    } = {}
  ) {
    if (!this.ctx || !this.sfxBus) return
    const t0 = this.ctx.currentTime + (opts.delay ?? 0)
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = opts.type ?? 'square'
    osc.frequency.setValueAtTime(freq, t0)
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur)
    const vol = opts.vol ?? 0.2
    const atk = opts.attack ?? 0.004
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(opts.bus ?? this.sfxBus)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  private noise(
    dur: number,
    opts: { vol?: number; freq?: number; q?: number; delay?: number; type?: BiquadFilterType } = {}
  ) {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf) return
    const t0 = this.ctx.currentTime + (opts.delay ?? 0)
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const filt = this.ctx.createBiquadFilter()
    filt.type = opts.type ?? 'bandpass'
    filt.frequency.value = opts.freq ?? 2000
    filt.Q.value = opts.q ?? 0.8
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(opts.vol ?? 0.3, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxBus)
    src.start(t0)
    src.stop(t0 + dur + 0.05)
  }

  // ---------- SFX ----------
  uiClick() {
    this.tone(660, 0.06, { vol: 0.15, type: 'square' })
    this.tone(880, 0.05, { vol: 0.1, type: 'square', delay: 0.03 })
  }
  shoot(kind: string) {
    switch (kind) {
      case 'spread':
        this.noise(0.14, { vol: 0.4, freq: 900, q: 0.5 })
        this.tone(160, 0.12, { vol: 0.3, slide: 60, type: 'sawtooth' })
        break
      case 'burst':
      case 'smg':
        this.noise(0.06, { vol: 0.22, freq: 2600, q: 1.2 })
        this.tone(520, 0.05, { vol: 0.14, slide: 900, type: 'square' })
        break
      case 'rocket':
        this.noise(0.5, { vol: 0.35, freq: 500, q: 0.4, type: 'lowpass' })
        this.tone(120, 0.4, { vol: 0.3, slide: 45, type: 'sawtooth' })
        break
      case 'lob':
        this.tone(420, 0.3, { vol: 0.12, slide: 700, type: 'sine' })
        break
      case 'wave':
        this.tone(300, 0.25, { vol: 0.16, slide: 220, type: 'triangle' })
        break
      case 'swipe':
      case 'slash':
        this.noise(0.12, { vol: 0.3, freq: 1400, q: 0.6 })
        break
      default:
        this.noise(0.08, { vol: 0.2, freq: 1800 })
    }
  }
  hit() {
    this.tone(220, 0.06, { vol: 0.14, type: 'square', slide: 150 })
  }
  hitPlayer() {
    this.tone(180, 0.09, { vol: 0.2, type: 'sawtooth', slide: 90 })
  }
  kill() {
    this.noise(0.25, { vol: 0.35, freq: 800, q: 0.5, type: 'lowpass' })
    this.tone(330, 0.22, { vol: 0.22, slide: 60, type: 'square' })
    this.tone(494, 0.18, { vol: 0.18, delay: 0.06, type: 'square' })
  }
  explosion() {
    this.noise(0.5, { vol: 0.5, freq: 300, q: 0.3, type: 'lowpass' })
    this.tone(90, 0.4, { vol: 0.35, slide: 30, type: 'sawtooth' })
  }
  gem() {
    const notes = [880, 1108, 1318]
    notes.forEach((n, i) => this.tone(n, 0.12, { vol: 0.12, type: 'triangle', delay: i * 0.05 }))
  }
  cube() {
    this.tone(523, 0.1, { vol: 0.14, type: 'square' })
    this.tone(659, 0.1, { vol: 0.14, type: 'square', delay: 0.06 })
    this.tone(784, 0.16, { vol: 0.14, type: 'square', delay: 0.12 })
  }
  boxBreak() {
    this.noise(0.2, { vol: 0.4, freq: 1200, q: 0.4 })
    this.tone(200, 0.12, { vol: 0.2, slide: 90, type: 'sawtooth' })
  }
  superReady() {
    this.tone(587, 0.12, { vol: 0.16, type: 'triangle' })
    this.tone(880, 0.12, { vol: 0.16, type: 'triangle', delay: 0.08 })
    this.tone(1174, 0.2, { vol: 0.16, type: 'triangle', delay: 0.16 })
  }
  superUse() {
    this.noise(0.3, { vol: 0.35, freq: 600, q: 0.5, type: 'lowpass' })
    this.tone(200, 0.3, { vol: 0.3, slide: 700, type: 'sawtooth' })
  }
  heal() {
    this.tone(523, 0.25, { vol: 0.14, type: 'sine', slide: 784 })
    this.tone(784, 0.3, { vol: 0.1, type: 'sine', delay: 0.1, slide: 1046 })
  }
  dash() {
    this.noise(0.18, { vol: 0.25, freq: 2000, q: 0.8, type: 'highpass' })
  }
  spawn() {
    this.tone(392, 0.15, { vol: 0.12, type: 'triangle' })
    this.tone(587, 0.18, { vol: 0.1, type: 'triangle', delay: 0.08 })
  }
  countTick() {
    this.tone(440, 0.1, { vol: 0.18, type: 'square' })
  }
  go() {
    this.tone(587, 0.12, { vol: 0.2, type: 'square' })
    this.tone(784, 0.22, { vol: 0.2, type: 'square', delay: 0.08 })
  }
  gas() {
    this.tone(140, 0.6, { vol: 0.12, type: 'sawtooth', slide: 90 })
  }
  win() {
    const seq = [523, 659, 784, 1046]
    seq.forEach((n, i) => this.tone(n, 0.22, { vol: 0.2, type: 'square', delay: i * 0.12 }))
  }
  lose() {
    const seq = [392, 330, 262, 196]
    seq.forEach((n, i) => this.tone(n, 0.26, { vol: 0.18, type: 'triangle', delay: i * 0.14 }))
  }

  // ---------- Music ----------
  startMusic(battle: boolean) {
    this.battleMusic = battle
    this.init()
    if (!this.ctx || this.musicTimer !== null) return
    this.nextNoteTime = this.ctx.currentTime + 0.1
    this.step = 0
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 60)
  }
  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }
  private scheduleMusic() {
    if (!this.ctx || !this.musicBus) return
    const spb = this.battleMusic ? 0.16 : 0.32 // seconds per 16th
    while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
      this.playStep(this.step, this.nextNoteTime, spb)
      this.nextNoteTime += spb
      this.step = (this.step + 1) % 32
    }
  }
  private playStep(step: number, t: number, spb: number) {
    if (!this.ctx || !this.musicBus) return
    const note = (freq: number, dur: number, type: OscillatorType, vol: number) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(vol, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(g)
      g.connect(this.musicBus!)
      osc.start(t)
      osc.stop(t + dur + 0.02)
    }
    const noiseHit = (dur: number, freq: number, vol: number) => {
      if (!this.noiseBuf) return
      const src = this.ctx!.createBufferSource()
      src.buffer = this.noiseBuf
      const filt = this.ctx!.createBiquadFilter()
      filt.type = 'highpass'
      filt.frequency.value = freq
      const g = this.ctx!.createGain()
      g.gain.setValueAtTime(vol, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      src.connect(filt)
      filt.connect(g)
      g.connect(this.musicBus!)
      src.start(t)
      src.stop(t + dur + 0.02)
    }
    const s16 = step % 16

    if (this.battleMusic) {
      // driving battle groove
      if (s16 % 4 === 0) note(70, 0.14, 'sine', 0.5) // kick
      if (s16 % 4 === 2) noiseHit(0.05, 6000, 0.12) // hat
      const bass = [55, 55, 65.4, 49][Math.floor(s16 / 4) % 4]
      if (s16 % 2 === 0) note(bass, 0.3, 'sawtooth', 0.1)
      if (s16 % 8 === 0) note(220, 0.2, 'square', 0.05)
      if (s16 % 8 === 4) note(261.6, 0.2, 'square', 0.05)
      if (step % 32 === 24) note(164.8, 0.4, 'triangle', 0.08)
    } else {
      // chill menu arp
      const arp = [261.6, 329.6, 392, 523.2, 392, 329.6]
      const chord = [
        [130.8, 196, 261.6],
        [110, 164.8, 220],
        [98, 146.8, 196],
        [130.8, 196, 261.6],
      ][Math.floor(s16 / 4) % 4]
      if (s16 % 2 === 0) note(arp[(s16 / 2) % arp.length | 0], 0.5, 'triangle', 0.09)
      if (s16 % 8 === 0) chord.forEach((f) => note(f, 2.2, 'sine', 0.06))
      if (s16 % 16 === 8) note(261.6, 0.3, 'square', 0.04)
    }
  }
}

export const audio = new AudioEngine()

export function unlockAudio() {
  audio.init()
}

export function ensureRandomSeed() {
  void rand(1)
}
