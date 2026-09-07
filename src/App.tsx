// App — wires the GameSession to the canvas + HUD + panels, manages
// pointer lock and global hotkeys (T chat, B editor, Esc pause...).

import { useEffect, useRef, useState } from 'react'
import { GameSession } from './game/Session'
import { GameCanvas } from './components/GameScene'
import { Overlays, useSessionTick } from './components/Overlays'
import { ChatPanel, EditorPanel, PauseScreen, SettingsPanel } from './components/Panels'
import { aifx } from './ai/aifx'

export default function App() {
  const sessionRef = useRef<GameSession | null>(null)
  if (!sessionRef.current) sessionRef.current = new GameSession()
  const session = sessionRef.current
  const wrapRef = useRef<HTMLDivElement>(null)
  const [everPlayed, setEverPlayed] = useState(false)
  useSessionTick(session)
  const ui = session.ui
  void ui

  // start connecting once mounted
  useEffect(() => {
    session.player.bind()
    session.start()
    aifx.unlock()
    const kd = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          ;(e.target as HTMLElement).blur()
          e.preventDefault()
        }
        return
      }
      const s = sessionRef.current as GameSession
      const freeMouse = () => {
        // panels need the cursor: release pointer lock (plc will set controls off)
        if (document.pointerLockElement) document.exitPointerLock()
      }
      if (e.code === 'KeyT') {
        if (s.ui.panel === 'chat') s.setPanel('none')
        else {
          s.setPanel('chat')
          s.setControls(false)
          freeMouse()
        }
      } else if (e.code === 'KeyB') {
        if (s.ui.panel === 'editor') s.setPanel('none')
        else {
          s.setPanel('editor')
          s.setControls(false)
          freeMouse()
        }
      } else if (e.code === 'Escape') {
        s.setPanel('none')
        s.setSettingsOpen(false)
        if (document.pointerLockElement) document.exitPointerLock()
        else s.setControls(false)
      } else if (e.code === 'KeyN') {
        s.lookAtHead()
      }
    }
    document.addEventListener('keydown', kd)
    const plc = () => {
      const locked = document.pointerLockElement === wrapRef.current?.querySelector('canvas')
      const s = sessionRef.current as GameSession
      s.setControls(locked)
      if (locked) setEverPlayed(true)
      else s.refreshTeleportList()
    }
    document.addEventListener('pointerlockchange', plc)
    const handleDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, input, select, textarea, a, .panel, .pause-wrap, .start-hint')) return
      const s = sessionRef.current as GameSession
      if (s.ui.showSettings || s.ui.panel !== 'none') return
      // lock whenever we are in play mode but the mouse is free (start screen,
      // after Esc-pause, after panels close while playing)
      if (document.pointerLockElement !== wrapRef.current?.querySelector('canvas')) {
        aifx.unlock()
        wrapRef.current?.querySelector('canvas')?.requestPointerLock()
      }
    }
    document.addEventListener('mousedown', handleDown)
    session.refreshTeleportList()
    return () => {
      session.dispose()
      document.removeEventListener('keydown', kd)
      document.removeEventListener('pointerlockchange', plc)
      document.removeEventListener('mousedown', handleDown)
      session.player.cleanupInput()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  return (
    <div className="app-root" ref={wrapRef}>
      <GameCanvas session={session} />
      <Overlays session={session} />
      {session.ui.panel === 'chat' && <ChatPanel session={session} />}
      {session.ui.panel === 'editor' && <EditorPanel session={session} />}
      {session.ui.showSettings && <SettingsPanel session={session} />}
      {!session.ui.controlsOn && session.ui.panel === 'none' && !session.ui.showSettings && everPlayed && <PauseScreen session={session} />}
    </div>
  )
}
