import { useEffect, useState } from 'react'
import { Scene } from './game/Scene'
import { HUD } from './components/HUD'
import { ChatPanel } from './components/ChatPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { VirtualEditor } from './components/VirtualEditor'
import { StartOverlay } from './components/StartOverlay'
import { ai } from './ai/AIController'
import { getControls, useControls } from './player/controls'

export default function App(): JSX.Element {
  const [chatOpen, setChatOpen] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useControls()

  useEffect(() => {
    void ai.init()
    return () => ai.dispose()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'KeyC') setChatOpen((o) => !o)
      if (e.code === 'KeyE') setEditorOpen((o) => !o)
      if (e.code === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const apply = (): void => {
      document.body.classList.toggle('pointer-locked', getControls().locked)
    }
    apply()
    const id = window.setInterval(apply, 400)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="app">
      <Scene />
      <HUD
        chatOpen={chatOpen}
        editorOpen={editorOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        onToggleEditor={() => setEditorOpen((o) => !o)}
        onToggleSettings={() => setSettingsOpen((o) => !o)}
      />
      {chatOpen && <ChatPanel />}
      {editorOpen && <VirtualEditor />}
      {settingsOpen && <SettingsPanel />}
      <StartOverlay />
    </div>
  )
}