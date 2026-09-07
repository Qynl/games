import { ReactNode, useState, useEffect } from 'react'
import { SaveData, totalTrophies } from '../game/save'

export function UiButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'dark'
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      className={`ui-btn ui-btn-${variant} ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick?.()
      }}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function ResourceBar({ save }: { save: SaveData }) {
  return (
    <div className="resource-bar">
      <div className="res-chip res-trophies" title="Trophies">
        <span className="res-icon">🏆</span>
        <span>{totalTrophies(save)}</span>
      </div>
      <div className="res-chip res-keys" title="Keys">
        <span className="res-icon">🔑</span>
        <span>{save.keys}</span>
      </div>
      <div className="res-chip res-boxes" title="Brawl Boxes">
        <span className="res-icon">📦</span>
        <span>{save.boxes}</span>
      </div>
    </div>
  )
}

export function Bar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const frac = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
  return (
    <div className="bar" style={{ height }}>
      <div className="bar-fill" style={{ width: `${frac * 100}%`, background: color }} />
    </div>
  )
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

export function Portrait({ id, className = '' }: { id: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    import(`../assets/portraits/${id}.jpg`)
      .then((m) => alive && setUrl(m.default))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id])
  if (!url) return <div className={`portrait portrait-loading ${className}`} />
  return <img className={`portrait ${className}`} src={url} alt={id} draggable={false} />
}

export function useSaveState(initial: SaveData): [SaveData, (s: SaveData) => void] {
  const [save, setSave] = useState<SaveData>(initial)
  const setAndPersist = (s: SaveData) => {
    setSave(s)
    import('../game/save').then(({ persistSave }) => persistSave(s))
  }
  return [save, setAndPersist]
}
