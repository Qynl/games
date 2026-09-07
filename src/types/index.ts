export type Vec3 = [number, number, number]

export type Shape =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'coin'
  | 'ramp'
  | 'wall'
  | 'tree'
  | 'house'
  | 'tower'
  | 'arch'
  | 'road'

export type Weather = 'clear' | 'rain' | 'snow' | 'fog'
export type Mood = 'idle' | 'thinking' | 'working' | 'speaking' | 'excited' | 'error'
export type AIMode = 'online' | 'autopilot' | 'offline'

export interface WorldObject {
  id: string
  name: string
  shape: Shape
  position: Vec3
  rotation: Vec3
  scale: Vec3
  color: string
  createdAt: number
}

export interface NPC {
  id: string
  name: string
  position: Vec3
  color: string
  mood: 'wander' | 'chase'
  speed: number
  hostile: boolean
  createdAt: number
}

export interface Vehicle {
  id: string
  name: string
  position: Vec3
  color: string
  direction: 1 | -1
  speed: number
  kind: 'car' | 'truck'
}

export interface WorldEvent {
  id: string
  name: string
  trigger: 'proximity' | 'collect'
  position: Vec3
  radius: number
  action: string
  done: boolean
}

export interface Objective {
  id: string
  title: string
  description?: string
  status: 'active' | 'complete'
}

export interface ChatMessage {
  id: string
  from: 'player' | 'ai' | 'system'
  text: string
  at: number
}

export interface LogEntry {
  id: string
  time: number
  source: 'ai' | 'world' | 'player' | 'system'
  text: string
}

export interface ToolCall {
  tool: string
  args: Record<string, unknown>
}

export interface AIPlan {
  thought?: string
  chat?: string
  actions: ToolCall[]
  memory?: string
}

export interface AIStatus {
  mode: AIMode
  model: string
  task: string
  mood: Mood
  speaking: string | null
  loopCount: number
  lastAction: string
}

export interface ToolArgDef {
  name: string
  type: 'string' | 'number' | 'boolean'
  description?: string
  required?: boolean
}

export interface ToolDef {
  name: string
  description: string
  args: ToolArgDef[]
}