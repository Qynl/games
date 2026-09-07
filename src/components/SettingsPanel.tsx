import { useEffect, useState } from 'react'
import { world, useWorld } from '../world/WorldStore'
import { ai } from '../ai/AIController'

const FALLBACK_MODELS = ['llama3.2', 'qwen2.5', 'mistral', 'gemma2', 'llama3.1']

export function SettingsPanel(): JSX.Element {
  useWorld()
  const [endpoint, setEndpoint] = useState(ai.client.endpoint)
  const [model, setModel] = useState(ai.client.model)
  const [models, setModels] = useState<string[]>([])
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [autopilot, setAutopilot] = useState(ai.mode === 'autopilot')

  useEffect(() => {
    let alive = true
    void (async () => {
      setTesting(true)
      setTestResult(null)
      const list = await ai.client.listModels()
      if (!alive) return
      setModels(list)
      const ok = await ai.client.ping()
      if (!alive) return
      setTestResult(ok ? `✓ connected — ${list.length} model(s) available` : '✗ unreachable (is Ollama running?)')
      setTesting(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const modelOptions = models.length > 0 ? models : FALLBACK_MODELS

  return (
    <div className="panel settings-panel" data-ui>
      <h3 className="panel-title">AI · Ollama</h3>

      <div className="row">
        <label>Endpoint</label>
        <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:11434" spellCheck={false} />
      </div>

      <div className="row">
        <label>Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {models.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            No models detected — showing common defaults. Run <code>ollama pull llama3.2</code> locally.
          </span>
        )}
      </div>

      <div className="row">
        <button
          className="btn"
          onClick={() => {
            setTesting(true)
            setTestResult(null)
            void (async () => {
              const list = await ai.client.listModels()
              setModels(list)
              const ok = await ai.client.ping()
              setTestResult(ok ? `✓ connected — ${list.length} model(s)` : '✗ unreachable')
              setTesting(false)
            })()
          }}
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        {testResult && <div className="status-line">{testResult}</div>}
      </div>

      <div className="row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
          <input
            type="checkbox"
            checked={autopilot}
            onChange={(e) => {
              const on = e.target.checked
              setAutopilot(on)
              ai.setAutopilot(on)
            }}
            style={{ width: 'auto' }}
          />
          Local autopilot (no LLM needed)
        </label>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          The AI keeps building and reacting with a built-in scripted director when Ollama is unavailable.
        </span>
      </div>

      <div className="row">
        <button
          className="btn btn-primary"
          disabled={saving}
          onClick={() => {
            setSaving(true)
            void (async () => {
              const ok = await ai.reconfigure(endpoint, model)
              setTestResult(ok ? `✓ saved & connected to ${model}` : `✗ saved, but Ollama unreachable at ${endpoint}`)
              setSaving(false)
            })()
          }}
        >
          {saving ? 'Saving…' : 'Save & reconnect'}
        </button>
      </div>

      <div className="status-line">
        <span className={`dot ${ai.mode === 'online' ? 'online' : ai.mode === 'autopilot' ? 'autopilot' : 'offline'}`} />
        Current mode: {world.aiStatus.mode}
      </div>
    </div>
  )
}