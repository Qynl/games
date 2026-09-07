import { enableDragMode, getControls, requestPointerLock, useControls } from '../player/controls'
import { world, useWorld } from '../world/WorldStore'

export function StartOverlay(): JSX.Element | null {
  useControls()
  useWorld()
  const c = getControls()

  if (c.locked) return null
  if (c.dragMode) {
    return (
      <div className="hint-badge">
        click &amp; drag to look · <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> move · <kbd>Space</kbd> jump · <kbd>C</kbd> chat · <kbd>E</kbd> editor
      </div>
    )
  }

  return (
    <div className="overlay" data-ui onClick={() => requestPointerLock()}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <h1>CREATOR</h1>
        <p className="tagline">
          You are inside someone else&apos;s world.
          <br />
          It is watching you.
        </p>
        <div className="keys">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> move
          </span>
          <span>
            <kbd>Mouse</kbd> look
          </span>
          <span>
            <kbd>Space</kbd> jump
          </span>
          <span>
            <kbd>Shift</kbd> sprint
          </span>
          <span>
            <kbd>C</kbd> chat
          </span>
          <span>
            <kbd>E</kbd> editor
          </span>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 15, padding: '10px 28px' }} onClick={() => requestPointerLock()}>
          Enter the world
        </button>
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => enableDragMode()}>
            Just look around (drag)
          </button>
        </div>
      </div>
    </div>
  )
}