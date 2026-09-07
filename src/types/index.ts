// Shared type definitions for CREATOR.

export type Category =
  | 'block'
  | 'decoration'
  | 'prop'
  | 'npc'
  | 'vehicle'
  | 'terrain'
  | 'fx'
  | 'light'
  | 'zone'

export type LightType = 'sun' | 'point' | 'spot'

export type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule' | 'dome' | 'tree' | 'gem' | 'dumbbell'

export type PhysicsBody = 'static' | 'dynamic' | 'kinematic'

/** Mirror of the material fields the engine understands. */
export interface MatRef {
  color?: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  transparent?: boolean
  opacity?: number
}

export interface WorldObjectState {
  id: string
  kind: string
  category: Category
  name: string
  shape: Shape
  pos: [number, number, number]
  rot: [number, number, number]
  scale: [number, number, number] | number
  color?: string
  emissive?: string
  emissiveIntensity?: number
  body: PhysicsBody
  /** for zone/collision primitives — invisible */
  visible?: boolean
  solid?: boolean
  opacity?: number
  roughness?: number
  metalness?: number
  /** npc / vehicle configs */
  npc?: NpcConfig
  vehicle?: VehicleConfig
  /** interaction hook name (registered by scripts) */
  interact?: string
  /** arbitrary gameplay tags, e.g. "collectible","checkpoint","breakable","pain" */
  tags?: string[]
  spawnIndex?: number
}

export type NpcKind = 'walker' | 'guard' | 'kid' | 'follower' | 'cow' | 'ghost'

export interface NpcConfig {
  kind: NpcKind
  color: string
  /** patrol along these points */
  waypoints?: [number, number, number][]
  /** follow the player once they get close */
  follower?: boolean
  /** hostile to the player once in range */
  hostile?: boolean
  /** hostile contact knocks the player back / costs a life */
  damage?: number
  speed?: number
  scale?: number
  /** talk bubble lines when the player interacts or gets close */
  chat?: string[]
  wander?: boolean
}

export type VehicleKind = 'car' | 'hover' | 'golf'

export interface VehicleConfig {
  kind: VehicleKind
  color: string
  cruise?: boolean
  speed?: number
  cruiseRadius?: number
  spawnOnPlatform?: boolean
  waypoints?: [number, number, number][]
}

export interface TerrainConfig {
  size?: number
  seed?: number
  amplitude?: number
  color?: string
}

export interface SkyConfig {
  /** hex */
  color: string
  fogColor: string
  fogNear: number
  fogFar: number
}

export interface WeatherConfig {
  rain: boolean
  intensity?: number
}

export interface LightState {
  id: string
  type: LightType
  pos: [number, number, number]
  color: string
  intensity: number
  target?: [number, number, number]
}

export interface PlayerState {
  pos: [number, number, number]
  vel: [number, number, number]
  grounded: boolean
  yaw: number
  pitch: number
  hp: number
  lives: number
  alive: boolean
  onGroundId?: string | null
}

export type ActionType = 'move' | 'jump' | 'crouch' | 'interact' | 'place' | 'run' | 'look'

export interface PlayerAction {
  type: ActionType
  at: number
}

export interface NpcState {
  id: string
  kind: string
  name: string
  pos: [number, number, number]
  animating: boolean
  message?: string
  hasMessage: boolean
}

export interface VehicleState {
  id: string
  kind: string
  name: string
  pos: [number, number, number]
  moving: boolean
}

export type Phase = 'boot' | 'thinking' | 'working' | 'speaking' | 'idle' | 'error' | 'offline'

export type Expression =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'excited'
  | 'working'
  | 'annoyed'
  | 'laugh'
  | 'sleep'
  | 'error'
  | 'focused'

export interface EmoteConfig {
  text: string
  /** seconds to keep the bubble */
  duration?: number
  /** 0..1 emphasis of the "talk" mouth animation */
  energy?: number
}

export interface SpeechEntry {
  id: number
  speaker: 'ai' | 'player' | 'system' | 'npc'
  text: string
  at: number
}

export interface ObjectiveState {
  id: string
  text: string
  done: boolean
}

export interface ScoreEntry {
  label: string
  value: number
}

export type ObjectFilter =
  | 'all'
  | 'near'
  | 'newest'
  | 'obstacles'
  | 'decorations'
  | 'collectibles'
  | 'npc'
  | 'vehicles'
  | 'terrain'

export type QueryType =
  | 'position'
  | 'physics'
  | 'state'
  | 'player'
  | 'time'
  | 'weather'
  | 'count'
  | 'npc'
  | 'message'

export type ToolCategory = 'world' | 'code' | 'editor' | 'test' | 'chat'

export interface ToolDef {
  name: string
  desc: string
  category: ToolCategory
  usage: string
}

export interface HistoryEntry {
  at: number
  from: 'ai' | 'player' | 'world' | 'system'
  text: string
  task?: string
  /** id of currently running subgoal */
  goalId?: string
}

export interface PendingGoal {
  id: string
  label: string
  detail?: string
  queuedAt: number
}

export interface CurrentTask {
  id: string
  goal: string
  plan: string[]
  stepIndex: number
  startedAt: number
  deadline: number
}

export interface LogLine {
  at: number
  text: string
  level: 'info' | 'ok' | 'warn' | 'error' | 'ai'
}

export type UiPanel = 'none' | 'editor' | 'chat'

export interface Settings {
  ollamaUrl: string
  model: string
  autoModel: boolean
  /** when enabled, the AI keeps a tight automatic loop without needing chat turns */
  autonomous: boolean
  interval: number
  speech: boolean
  music: boolean
  sensitivity: number
  teleport: boolean
}

export interface WorldSummary {
  objects: number
  npcs: number
  vehicles: number
  objectives: number
  playerAlive: boolean
  phase: string
  weather: string
  sky: string
  projectName: string
  modifiedAgo: string | null
  lastTask: string | null
  recent: string[]
}

/** Abridged event description shown in the info HUD. */
export interface AiContextDto {
  tick: number
  phase: string
  summary: string | null
  sinceActivity: number
}

/** Bundle the UI renders from inside the 3D scene. */
export interface SceneWorldView {
  objects: WorldObjectState[]
  npcs: NpcState[]
  vehicles: VehicleState[]
  player: PlayerState | null
  particles: { pos: [number, number, number]; color: string; label?: string }[]
}

export type MsgHandler = (text: string) => void
