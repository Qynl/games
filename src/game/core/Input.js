// Keyboard + pointer-lock mouse. Edge flags are consumed once per frame so a
// tap is never missed between physics steps.
export class Input {
  constructor () {
    this.keys = {}
    this.pressed = {}
    this.released = {}
    this.mouse = { dx: 0, dy: 0 }
    this.mouseButtons = [false, false, false]
    this.mousePressed = [false, false, false]
    this.wheel = 0
    this.locked = false
    this.enabled = true
    this.sensitivity = 1
    this.invertY = false
    this._onLock = null
  }

  attach (el) {
    this.el = el
    const kd = (e) => {
      if (e.code === 'Tab') e.preventDefault()
      if (!this.keys[e.code]) this.pressed[e.code] = true
      this.keys[e.code] = true
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    }
    const ku = (e) => { this.keys[e.code] = false; this.released[e.code] = true }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', () => { this.keys = {} })
    const mm = (e) => {
      if (!this.locked) return
      this.mouse.dx += e.movementX || 0
      this.mouse.dy += e.movementY || 0
    }
    document.addEventListener('mousemove', mm)
    el.addEventListener('mousedown', (e) => {
      if (!this.locked) return
      if (!this.mouseButtons[e.button]) this.mousePressed[e.button] = true
      this.mouseButtons[e.button] = true
    })
    window.addEventListener('mouseup', (e) => { this.mouseButtons[e.button] = false })
    el.addEventListener('contextmenu', (e) => e.preventDefault())
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el
      if (this._onLock) this._onLock(this.locked)
    })
    window.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY) }, { passive: true })
  }

  requestLock () { if (this.el && !this.locked) this.el.requestPointerLock?.() }
  exitLock () { if (this.locked) document.exitPointerLock?.() }
  onLockChange (fn) { this._onLock = fn }

  down (code) { return !!this.keys[code] }
  hit (code) { return !!this.pressed[code] }

  // Build the movement input for one frame.
  moveFrame () {
    const k = this.keys
    const forward = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0)
    const right = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0)
    return {
      forward, right,
      jump: !!k.Space,
      crouch: !!k.ControlLeft || !!k.KeyC || !!k.ShiftRight,
      sprint: !!k.ShiftLeft,
      jumpPressed: !!this.pressed.Space,
      crouchPressed: !!this.pressed.ControlLeft || !!this.pressed.KeyC || !!this.pressed.ShiftRight,
      mouseDx: this.mouse.dx,
    }
  }

  // Call once per rendered frame, after the game has read everything.
  endFrame () {
    this.pressed = {}
    this.released = {}
    this.mouse.dx = 0
    this.mouse.dy = 0
    this.mousePressed = [false, false, false]
    this.wheel = 0
  }
}
