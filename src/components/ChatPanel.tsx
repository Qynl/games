import { useEffect, useRef, useState } from 'react'
import { world, useWorld } from '../world/WorldStore'
import { ai } from '../ai/AIController'

export function ChatPanel(): JSX.Element {
  useWorld()
  const [text, setText] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [world.chat.length])

  const send = (): void => {
    if (!text.trim()) return
    void ai.handlePlayerMessage(text)
    setText('')
  }

  return (
    <div className="panel chat-panel" data-ui>
      <div className="panel-title" style={{ padding: '12px 14px 0' }}>
        Chat with CREATOR
      </div>
      <div className="chat-log" ref={logRef}>
        {world.chat.slice(-40).map((m) => (
          <div key={m.id} className={`chat-msg ${m.from}`}>
            <span className="who">{m.from === 'ai' ? 'CREATOR' : m.from === 'player' ? 'you' : 'system'}</span>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          placeholder="Say something… (Enter to send)"
        />
        <button className="btn btn-primary" onClick={send}>
          Send
        </button>
      </div>
    </div>
  )
}