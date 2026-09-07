import { GameState } from './state'
import { Vec, v } from './util'

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

export class InputManager {
  state: InputState
  private canvas: HTMLCanvasElement
  private keys = new Set<string>()
  private joy: { id: number; ox: number; oy: number } | null = null
  private aimJoy: { id: number; ox: number; oy: number } | null = null
  private fireTouches = new Set<number>()
  private mouseDown = false
  private disposed = false

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
    if (['e', 'f'].includes(k)) {
      this.onSuperPressed()
    }
    if (k === 'q') this.onGadgetPressed()
    if (k === 'c') this.onEmotePressed()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  private onBlur = () => {
    this.keys.clear()
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

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    for (const t of Array.from(e.changedTouches)) {
      const x = t.clientX - rect.left
      const y = t.clientY - rect.top
      const isAim = x > rect.width * 0.55
      if (isAim) {
        if (!this.aimJoy) {
          this.aimJoy = { id: t.identifier, ox: x, oy: y }
          this.state.aimScreen = v(x, y)
        }
        this.fireTouches.add(t.identifier)
        this.state.firing = true
      } else if (!this.joy) {
        this.joy = { id: t.identifier, ox: x, oy: y }
      }
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    for (const t of Array.from(e.changedTouches)) {
      const x = t.clientX - rect.left
      const y = t.clientY - rect.top
      if (this.joy && t.identifier === this.joy.id) {
        this.joy = { id: t.identifier, ox: x, oy: y }
      }
      if (this.aimJoy && t.identifier === this.aimJoy.id) {
        this.aimJoy = { id: t.identifier, ox: x, oy: y }
        this.state.aimScreen = v(x, y)
      }
    }
  }

  private onTouchEnd = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (this.joy && t.identifier === this.joy.id) this.joy = null
      if (this.aimJoy && t.identifier === this.aimJoy.id) this.aimJoy = null
      this.fireTouches.delete(t.identifier)
    }
    this.state.firing = this.fireTouches.size > 0
    if (!this.aimJoy) this.state.firing = false
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
    if (this.joy) {
      const rect = this.canvas.getBoundingClientRect()
      const dx = (this.joy.ox - (this.joyBaseX ?? this.joy.ox)) / 40
      const dy = (this.joy.oy - (this.joyBaseY ?? this.joy.oy)) / 40
      const l = Math.hypot(dx, dy)
      if (l > 0.15) {
        mx = dx / Math.max(1, l)
        my = dy / Math.max(1, l)
      }
    }
    const ml = Math.hypot(mx, my)
    if (ml > 1) {
      mx /= ml
      my /= ml
    }
    st.move = v(mx, my)
    st.mode = this.joy || this.aimJoy ? 'touch' : 'keyboard'

    // ---- aim ----
    if (this.aimJoy) {
      const rect = this.canvas.getBoundingClientRect()
      const dx = this.aimJoy.ox - (this.aimBaseX ?? this.aimJoy.ox)
      const dy = this.aimJoy.oy - (this.aimBaseY ?? this.aimJoy.oy)
      if (Math.hypot(dx, dy) > 8) {
        st.aim = v(dx, dy)
      }
    } else {
      // keyboard aim = aimScreen (mouse position) converted to world in GameScreen
      st.aim = v(st.aimScreen.x, st.aimScreen.y)
    }

    g.setMove(st.move.x, st.move.y)
    g.setFiring(st.firing || this.mouseDown)
  }

  // joy base for visuals
  joyBaseX: number | null = null
  joyBaseY: number | null = null
  aimBaseX: number | null = null
  aimBaseY: number | null = null
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
