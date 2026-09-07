// Settings persistence + defaults.

import type { Settings } from '../types'

const KEY = 'creator.settings.v1'

export const DEFAULT_SETTINGS: Settings = {
  ollamaUrl: 'http://localhost:11434',
  model: '',
  autoModel: true,
  autonomous: true,
  interval: 2.6,
  speech: true,
  music: false,
  sensitivity: 1,
  teleport: true,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage unavailable — fine
  }
}
