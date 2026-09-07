import { useSyncExternalStore } from 'react'

export interface ControlState {
  locked: boolean
  dragMode: boolean
  dragging: boolean
}

const state: ControlState = { locked: false, dragMode: false, dragging: false }

const listeners = new Set<() => void>()
let version = 0

function set(patch: Partial<ControlState>): void {
  Object.assign(state, patch)
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useControls(): number {
  return useSyncExternalStore(subscribe, () => version)
}

export function getControls(): ControlState {
  return state
}

export function requestPointerLock(): void {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  try {
    canvas.requestPointerLock()
  } catch {
    set({ dragMode: true })
    return
  }
  window.setTimeout(() => {
    if (document.pointerLockElement !== canvas) {
      set({ dragMode: true })
    }
  }, 150)
}

export function enableDragMode(): void {
  set({ dragMode: true, locked: false })
}

export function setDragging(d: boolean): void {
  set({ dragging: d })
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerlockchange', () => {
    set({ locked: document.pointerLockElement !== null })
  })
  document.addEventListener('pointerlockerror', () => {
    set({ dragMode: true, locked: false })
  })
}