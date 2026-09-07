import { useSyncExternalStore } from 'react'
import type {
  AIStatus, ChatMessage, LogEntry, NPC, Objective, Vehicle, Weather, WorldEvent, WorldObject,
} from '../types'
import { uid } from '../utils/math'

export interface WorldParams {
  gravity: number
  jump: number
  walkSpeed: number
  sprintSpeed: number
}

class WorldStore {
  version = 0
  params: WorldParams = { gravity: 21, jump: 8.2, walkSpeed: 4.6, sprintSpeed: 7.6 }
  objects = new Map<string, WorldObject>()
  npcs = new Map<string, NPC>()
  vehicles = new Map<string, Vehicle>()
  events = new Map<string, WorldEvent>()
  objectives: Objective[] = []
  weather: Weather = 'clear'
  timeOfDay = 14
  score = 0
  chat: ChatMessage[] = []
  feed: LogEntry[] = []
  files = new Map<string, string>()
  memory: string[] = []
  aiStatus: AIStatus = {
    mode: 'offline',
    model: '',
    task: 'booting',
    mood: 'idle',
    speaking: null,
    loopCount: 0,
    lastAction: '',
  }
  private listeners = new Set<() => void>()

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getVersion = (): number => this.version

  private bump(): void {
    this.version += 1
    this.listeners.forEach((l) => l())
  }

  addObject(partial: Omit<WorldObject, 'id' | 'createdAt'>): WorldObject {
    const obj: WorldObject = { ...partial, id: uid('obj'), createdAt: Date.now() }
    this.objects.set(obj.id, obj)
    this.bump()
    return obj
  }

  removeObject(id: string): boolean {
    const ok = this.objects.delete(id)
    if (ok) this.bump()
    return ok
  }

  addNPC(partial: Omit<NPC, 'id' | 'createdAt'>): NPC {
    const npc: NPC = { ...partial, id: uid('npc'), createdAt: Date.now() }
    this.npcs.set(npc.id, npc)
    this.bump()
    return npc
  }

  removeNPC(id: string): boolean {
    const ok = this.npcs.delete(id)
    if (ok) this.bump()
    return ok
  }

  addVehicle(partial: Omit<Vehicle, 'id'>): Vehicle {
    const v: Vehicle = { ...partial, id: uid('veh') }
    this.vehicles.set(v.id, v)
    this.bump()
    return v
  }

  addEvent(partial: Omit<WorldEvent, 'id' | 'done'>): WorldEvent {
    const ev: WorldEvent = { ...partial, id: uid('evt'), done: false }
    this.events.set(ev.id, ev)
    this.bump()
    return ev
  }

  addObjective(partial: Omit<Objective, 'id' | 'status'>): Objective {
    const o: Objective = { ...partial, id: uid('objg'), status: 'active' }
    this.objectives.push(o)
    this.bump()
    return o
  }

  completeObjective(id?: string): boolean {
    const o = id
      ? this.objectives.find((x) => x.id === id)
      : this.objectives.find((x) => x.status === 'active')
    if (!o) return false
    o.status = 'complete'
    this.bump()
    return true
  }

  setWeather(w: Weather): void {
    this.weather = w
    this.bump()
  }

  setTime(t: number): void {
    this.timeOfDay = Math.max(0, Math.min(24, t))
    this.bump()
  }

  addChat(from: ChatMessage['from'], text: string): void {
    this.chat.push({ id: uid('msg'), from, text, at: Date.now() })
    if (this.chat.length > 80) this.chat = this.chat.slice(-80)
    this.bump()
  }

  addFeed(text: string, source: LogEntry['source'] = 'world'): void {
    this.feed.push({ id: uid('feed'), time: Date.now(), source, text })
    if (this.feed.length > 50) this.feed = this.feed.slice(-50)
    this.bump()
  }

  collectCoin(id: string): boolean {
    if (!this.objects.has(id)) return false
    this.objects.delete(id)
    this.score += 1
    this.bump()
    return true
  }

  addMemory(fact: string): void {
    if (!fact || this.memory.includes(fact)) return
    this.memory.push(fact)
    if (this.memory.length > 30) this.memory = this.memory.slice(-30)
    try {
      localStorage.setItem('creator.ai.memory', JSON.stringify(this.memory))
    } catch {
      // storage unavailable — memory stays in-session only
    }
    this.bump()
  }

  setAI(patch: Partial<AIStatus>): void {
    Object.assign(this.aiStatus, patch)
    this.bump()
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content)
    this.bump()
  }

  resetWorld(): void {
    this.objects.clear()
    this.npcs.clear()
    this.vehicles.clear()
    this.events.clear()
    this.objectives = []
    this.weather = 'clear'
    this.timeOfDay = 14
    this.score = 0
    this.bump()
  }

  tryLoadMemory(): void {
    try {
      const raw = localStorage.getItem('creator.ai.memory')
      if (raw) this.memory = JSON.parse(raw)
    } catch {
      // ignore
    }
  }
}

export const world = new WorldStore()

export function useWorld(): number {
  return useSyncExternalStore(world.subscribe, world.getVersion)
}