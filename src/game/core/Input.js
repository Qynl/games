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
    this.fallback = false      // if pointer lock is unavailable, look with a free cursor
    this.enabled = true
    this.sensitivity = 1
    this.invertY = false
    this._onLock = null
    this._ls = []
  }

  attach (el) {
    this.detach()
    this.el = el
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts)
      this._ls.push([target, type, fn, opts])
    }
    const kd = (e) => {
      if (e.code === 'Tab') e.preventDefault()
      // no lock to escape from in fallback mode — pause instead
      if (e.code === 'Escape' && this.fallback) { this.fallback = false; this._onLock?.(false) }
      if (!this.keys[e.code]) this.pressed[e.code] = true
      this.keys[e.code] = true
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    }
    const ku = (e) => { this.keys[e.code] = false; this.released[e.code] = true }
    const blur = () => { this.keys = {} }
    const mm = (e) => {
      if (!this.engaged) return
      this.mouse.dx += e.movementX || 0
      this.mouse.dy += e.movementY || 0
    }
    const md = (e) => {
      if (!this.engaged) return
      if (!this.mouseButtons[e.button]) this.mousePressed[e.button] = true
      this.mouseButtons[e.button] = true
    }
    const mu = (e) => { this.mouseButtons[e.button] = false }
    const ctx = (e) => e.preventDefault()
    const plc = () => {
      const was = this.engaged
      if (document.pointerLockElement === el) { this.locked = true; this.fallback = false }
      else { this.locked = false; this._lastExit = performance.now() }   // ESC exits behind our back
      if (was !== this.engaged) this._onLock?.(this.engaged)
    }
    const wheel = (e) => { this.wheel += Math.sign(e.deltaY) }
    on(window, 'keydown', kd)
    on(window, 'keyup', ku)
    on(window, 'blur', blur)
    on(document, 'mousemove', mm)
    on(el, 'mousedown', md)
    on(window, 'mouseup', mu)
    on(el, 'contextmenu', ctx)
    on(document, 'pointerlockchange', plc)
    on(window, 'wheel', wheel, { passive: true })
  }

  // A disposed game must stop listening — otherwise a second match reads the
  // mouse through two inputs at once and the sensitivity doubles.
  detach () {
    for (const [t, type, fn, opts] of this._ls || []) t.removeEventListener(type, fn, opts)
    this._ls = []
    if (this._retryT) { clearTimeout(this._retryT); this._retryT = null }
    this.locked = false
    this.fallback = false
    this.el = null
  }

  get engaged () { return this.locked || this.fallback }

  // Chrome rate-limits re-locking for ~1.25 s after an exit, and rejects the
  // request outright outside a user gesture — so swallow failures and retry.
  // If no lock shows up at all (embedded iframe, permission denied) we fall
  // back to free-cursor mouse look so the game is always playable.
  requestLock (retry = true, fromUser = true) {
    if (!this.el || this.locked || !this.enabled) return
    const wait = 1350 - (performance.now() - (this._lastExit || 0))
    if (wait > 0) {
      if (retry && !this._retryT) {
        this._retryT = setTimeout(() => { this._retryT = null; this.requestLock(false) }, wait + 50)
      }
      return
    }
    clearTimeout(this._fbT)
    try {
      const p = this.el.requestPointerLock?.()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch (e) { /* blocked this time — the user just clicks again */ }
    // only fall back when a real click asked for the lock — never on a background attempt
    if (fromUser) {
      this._fbT = setTimeout(() => {
        if (!this.locked) { this.fallback = true; this._onLock?.(true) }
      }, 900)
    }
  }

  exitLock () {
    this._lastExit = performance.now()
    clearTimeout(this._fbT)
    this.fallback = false
    if (this.locked) document.exitPointerLock?.()
  }
  onLockChange (fn) { this._onLock = fn }

  clearFallback () { clearTimeout(this._fbT) }

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
