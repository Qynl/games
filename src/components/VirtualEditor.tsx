import { useMemo, useState } from 'react'
import { world, useWorld } from '../world/WorldStore'
import { TOOL_DEFS } from '../world/WorldAPI'
import { fmtTime } from '../utils/math'

type Tab = 'project' | 'tools' | 'console'

export function VirtualEditor(): JSX.Element {
  useWorld()
  const [tab, setTab] = useState<Tab>('project')
  const [selected, setSelected] = useState<string | null>(null)

  const tree = useMemo(() => {
    const dirs = new Map<string, { path: string; name: string }[]>()
    for (const path of world.files.keys()) {
      const parts = path.split('/')
      const dir = parts.length > 1 ? parts[0] : '(root)'
      const name = parts[parts.length - 1]
      const list = dirs.get(dir) ?? []
      list.push({ path, name })
      dirs.set(dir, list)
    }
    const out: { dir: string; files: { path: string; name: string }[] }[] = []
    for (const [dir, files] of dirs) out.push({ dir, files: files.sort((a, b) => a.name.localeCompare(b.name)) })
    return out.sort((a, b) => a.dir.localeCompare(b.dir))
  }, [world.version])

  const selectedContent = selected ? (world.files.get(selected) ?? null) : null

  return (
    <div className="panel editor-panel" data-ui>
      <h3 className="panel-title" style={{ padding: '14px 14px 0' }}>
        Virtual Editor — CREATOR project
      </h3>
      <div className="editor-tabs">
        <button className={`tab ${tab === 'project' ? 'active' : ''}`} onClick={() => setTab('project')}>
          Project
        </button>
        <button className={`tab ${tab === 'tools' ? 'active' : ''}`} onClick={() => setTab('tools')}>
          Tools
        </button>
        <button className={`tab ${tab === 'console' ? 'active' : ''}`} onClick={() => setTab('console')}>
          Console
        </button>
      </div>

      <div className="editor-body">
        {tab === 'project' && (
          <>
            {selectedContent !== null && (
              <div className="code-view" style={{ marginBottom: 10 }}>
                {selected}
                {'\n\n'}
                {selectedContent}
              </div>
            )}
            <div className="tree">
              {tree.map((d) => (
                <div key={d.dir}>
                  <div className="dir">📁 {d.dir}/</div>
                  <ul>
                    {d.files.map((f) => (
                      <li key={f.path}>
                        <div
                          className={`file ${selected === f.path ? 'active' : ''}`}
                          onClick={() => setSelected(f.path)}
                        >
                          {f.name}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'tools' && (
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 0, lineHeight: 1.5 }}>
              The AI can only affect the world through these sandboxed tools. It generates JSON scripts
              that execute inside the game engine — no arbitrary code, no access to your computer.
            </p>
            {TOOL_DEFS.map((t) => (
              <div key={t.name} className="tool-card">
                <div className="tname">{t.name}()</div>
                <div className="tdesc">{t.description}</div>
                {t.args.length > 0 && (
                  <div className="targs">
                    {t.args.map((a) => `${a.name}: ${a.type}${a.required ? '*' : ''}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'console' && (
          <div>
            {world.feed
              .slice()
              .reverse()
              .map((f) => (
                <div key={f.id} className="console-item">
                  <span className="t">[{fmtTime(f.time)}]</span>
                  {f.text}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}