import { GameState } from './state'
import { Vec, v, clamp } from './util'

export type InputMode = 'keyboard' | 'touch'

export interface InputState {
  move: Vec
  aim: Vec
  aimScreen: Vec // screen-space aim for keyboard/mouse reticle
  firing: boolean
  mode: InputMode
}

export function createInputState(): InputState {
  return {
    move: v(),
    aim: v(1, 0),
    aimScreen: v(1, 0),
    firing: false,
    mode: 'keyboard',
  }
}

const STICK_RADIUS = 40

export class InputManager {
  state: InputState
  private canvas: HTMLCanvasElement
  private keys = new Set<string>()
  private mouseDown = false

  // ---- virtual sticks (React zones call these) ----
  private vJoy: Vec | null = null
  private vAim: Vec | null = null
  private vAimStart = 0
  private vAimHoldFiring = false
  private fireBtnHeld = false
  private joyActive = false
  private aimActive = false
  private lastStickAim: Vec | null = null
  private stickReleasedAt = 0

  // ---- canvas touch (tap/drag on the field) ----
  private canvasAimId: number | null = null
  private canvasAimStart: Vec | null = null
  private canvasAimMoved = false
  private canvasAimT0 = 0

  private disposed = false

  // fired when the aim stick / canvas tap releases: a single attack
  onAimRelease: (dir: Vec | null) => void = () => {}

  constructor(canvas: HTMLCanvasElement, state: InputState) {
    this.canvas = canvas
    this.state = state
    this.bind()
  }

  private bind() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('contextmenu', this.onContext)
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false })
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false })
  }

  dispose() {
    this.disposed = true
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('contextmenu', this.onContext)
    this.canvas.removeEventListener('touchstart', this.onTouchStart)
    this.canvas.removeEventListener('touchmove', this.onTouchMove)
    this.canvas.removeEventListener('touchend', this.onTouchEnd)
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
    this.keys.add(k)
    if (['e', 'f'].includes(k)) this.onSuperPressed()
    if (k === 'q') this.onGadgetPressed()
    if (k === 'c') this.onEmotePressed()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  private onBlur = () => {
    this.keys.clear()
    this.mouseDown = false
    this.vJoy = null
    this.vAim = null
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDown = true
    } else if (e.button === 2) {
      this.onSuperPressed()
    }
  }
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false
  }
  private onContext = (e: Event) => e.preventDefault()

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.state.aimScreen = v(e.clientX - rect.left, e.clientY - rect.top)
  }

  // ---- canvas touch: tap right half = auto-aim shot, drag = aimed shot ----
  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    for (const t of Array.from(e.changedTouches)) {
      const x = t.clientX - rect.left
      const y = t.clientY - rect.top
      if (x > rect.width * 0.5 && this.canvasAimId === null) {
        this.canvasAimId = t.identifier
        this.canvasAimStart = v(x, y)
        this.canvasAimMoved = false
        this.canvasAimT0 = performance.now()
      }
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    for (const t of Array.from(e.changedTouches)) {
      if (this.canvasAimId === t.identifier && this.canvasAimStart) {
        const x = t.clientX - rect.left
        const y = t.clientY - rect.top
        this.state.aimScreen = v(x, y)
        if (Math.hypot(x - this.canvasAimStart.x, y - this.canvasAimStart.y) > 12) {
          this.canvasAimMoved = true
        }
      }
    }
  }

  private onTouchEnd = (e: TouchEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    for (const t of Array.from(e.changedTouches)) {
      if (this.canvasAimId === t.identifier) {
        const quick = performance.now() - this.canvasAimT0 < 600
        if (quick) {
          if (this.canvasAimMoved && this.canvasAimStart) {
            const x = t.clientX - rect.left
            const y = t.clientY - rect.top
            this.onAimRelease(v(x - this.canvasAimStart.x, y - this.canvasAimStart.y))
          } else {
            this.onAimRelease(null)
          }
        }
        this.canvasAimId = null
        this.canvasAimStart = null
      }
    }
  }

  // ---- virtual stick API (zone coordinates are relative to zone center) ----
  joyDown(x: number, y: number) {
    this.joyActive = true
    this.vJoy = v(clamp(x, -STICK_RADIUS * 1.5, STICK_RADIUS * 1.5), clamp(y, -STICK_RADIUS * 1.5, STICK_RADIUS * 1.5))
  }
  joyMove(x: number, y: number) {
    if (!this.joyActive) return
    this.vJoy = v(clamp(x, -STICK_RADIUS * 1.5, STICK_RADIUS * 1.5), clamp(y, -STICK_RADIUS * 1.5, STICK_RADIUS * 1.5))
  }
  joyUp() {
    this.joyActive = false
    this.vJoy = null
  }
  aimDown(x: number, y: number) {
    this.aimActive = true
    this.vAim = v(x, y)
    this.vAimStart = performance.now()
    this.vAimHoldFiring = false
  }
  aimMove(x: number, y: number) {
    if (!this.aimActive) return
    this.vAim = v(x, y)
  }
  aimUp() {
    if (this.aimActive) {
      const held = performance.now() - this.vAimStart
      if (held < 420 && !this.vAimHoldFiring) {
        // quick release = one shot (Brawl Stars style)
        const dir =
          this.vAim && Math.hypot(this.vAim.x, this.vAim.y) > 8
            ? v(this.vAim.x, this.vAim.y)
            : null
        this.onAimRelease(dir)
      }
    }
    if (this.vAim) this.lastStickAim = v(this.vAim.x, this.vAim.y)
    this.stickReleasedAt = performance.now()
    this.aimActive = false
    this.vAim = null
  }
  setFireButton(held: boolean) {
    this.fireBtnHeld = held
  }
  isAimStickActive() {
    if (this.vAim) return true
    // keep the last aim direction briefly after release so the reticle doesn't snap away
    return this.stickReleasedAt > 0 && performance.now() - this.stickReleasedAt < 650
  }

  // -------- hook callbacks (set by GameScreen) --------
  onSuperPressed: () => void = () => {}
  onGadgetPressed: () => void = () => {}
  onEmotePressed: () => void = () => {}

  update(g: GameState) {
    const st = this.state
    // ---- movement ----
    let mx = 0
    let my = 0
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1
    if (this.vJoy) {
      const jx = this.vJoy.x / STICK_RADIUS
      const jy = this.vJoy.y / STICK_RADIUS
      const jl = Math.hypot(jx, jy)
      if (jl > 0.12) {
        mx = jx / Math.max(1, jl)
        my = jy / Math.max(1, jl)
      }
    }
    const ml = Math.hypot(mx, my)
    if (ml > 1) {
      mx /= ml
      my /= ml
    }
    st.move = v(mx, my)
    st.mode = this.vJoy || this.vAim || this.fireBtnHeld ? 'touch' : 'keyboard'

    // ---- aim ----
    if (this.vAim) {
      st.aim = v(this.vAim.x, this.vAim.y)
    } else if (this.lastStickAim && this.stickReleasedAt > 0 && performance.now() - this.stickReleasedAt < 650) {
      st.aim = this.lastStickAim
    } else {
      st.aim = v(st.aimScreen.x, st.aimScreen.y)
    }

    // ---- firing: hold mouse / hold fire button / hold aim stick long enough ----
    if (this.vAim && performance.now() - this.vAimStart > 420) this.vAimHoldFiring = true
    const firing = this.mouseDown || this.fireBtnHeld || (this.vAim ? this.vAimHoldFiring : false)

    g.setMove(st.move.x, st.move.y)
    g.setFiring(firing)
  }
}

export function screenToWorld(
  g: GameState,
  renderer: { scale: number; viewX: number; viewY: number; cw: number; ch: number },
  sx: number,
  sy: number
): Vec {
  // world = (screen - center)/scale + player
  const target = g.player ?? g.brawlers[0]
  const wx = target.pos.x + (sx - renderer.cw / 2) / renderer.scale
  const wy = target.pos.y + (sy - renderer.ch / 2) / renderer.scale
  return v(wx, wy)
}
