// ContextBuilder — turns the live world/player/AI state into the COMPACT
// observation the AI model consumes. We never dump raw world state: the
// builder curates a small, relevant snapshot instead.

import type { HistoryEntry, PlayerState, SpeechEntry } from '../types'
import { fmtClock, fmtNum } from '../utils/helpers'
import type { Memory } from './Memory'
import type { CurrentTask, Phase } from '../types'

export interface BuildContextOpts {
  memory: Memory
  player: PlayerState | null
  objectsNear: { name: string; kind: string; d: number; at: number[] }[]
  npcsNear: { name: string; kind: string; d: number; animating: boolean }[]
  worldStatus: Record<string, unknown>
  recentHistory: HistoryEntry[]
  recentSpeech: SpeechEntry[]
  task: CurrentTask | null
  phase: Phase
  chatOpen: boolean
  nowSec: number
  tick: number
  model: string
  uptimeSec: number
  playerActivitySec: number
}

const SPEECH_LINES = 6
const HISTORY_LINES = 8

export function buildContext(o: BuildContextOpts): string {
  const L: string[] = []
  const p = o.player

  L.push(`[clock] world time ${fmtClock(o.nowSec)} | session uptime ${Math.round(o.uptimeSec)}s | observation tick ${o.tick}`)
  L.push(`[ai phase] ${o.phase} | model: ${o.model} | chat panel ${o.chatOpen ? 'open' : 'closed'}`)

  const task = o.task
  if (task) {
    const plan = task.plan.map((s, i) => `${i + 1}. ${s}${i === task.stepIndex ? ' (doing now)' : ''}`).join('\n   ')
    L.push(`[current task #${task.id}] "${task.goal}" step ${task.stepIndex + 1}/${task.plan.length}\n   ${plan}`)
  } else {
    L.push('[current task] none (you are between projects — pick a new one if you want)')
  }

  if (p) {
    const nearNames = o.objectsNear.length
      ? o.objectsNear.slice(0, 6).map((n) => `${n.name}(${n.kind},${fmtNum(n.d)}m)`).join(' ')
      : 'nothing significant nearby'
    const npcNames = o.npcsNear.length
      ? o.npcsNear.slice(0, 5).map((n) => `${n.name}(${n.kind},${fmtNum(n.d)}m)`).join(' ')
      : 'no NPCs nearby'
    L.push(`[player] at ${p.pos.map((n) => fmtNum(n)).join(',')} grounded=${p.grounded} hp=${p.hp} lives=${p.lives} alive=${p.alive}`)
    L.push(`[objects near player] ${nearNames}`)
    L.push(`[npcs near player] ${npcNames}`)
    if (o.playerActivitySec < 14) L.push(`[player is active right now: moved/jumped/interacted within the last ${Math.max(1, Math.round(o.playerActivitySec))}s]`)
    else L.push(`[player has been still for ${Math.round(o.playerActivitySec)}s]`)
  } else {
    L.push('[player] not spawned yet')
  }

  const w = o.worldStatus
  L.push(
    `[world status] project="${w.projectName ?? 'baseplate'}" objects=${w.objectCount ?? 0} npcs=${w.npcsTotal ?? 0} vehicles=${w.vehiclesTotal ?? 0} terrain=${w.terrain ?? 'none'} weather=${w.weather ?? 'clear'} time=${w.time ?? 'day'} sky=${w.sky ?? 'blue'}`
  )

  const mem = o.memory.recall()
  if (mem.length) {
    L.push('[memory] ' + mem.map((f) => `"${f.text}"`).join(' | '))
  }
  const last = o.memory.lastLines(4)
  if (last.length) {
    L.push('[recent observations] ' + last.map((s) => `"${s}"`).join(' | '))
  }

  const chat = o.recentSpeech.slice(-SPEECH_LINES)
  if (chat.length) {
    L.push(
      '[chat log] ' +
        chat
          .map((s) => (s.speaker === 'ai' ? `you said: "${s.text}"` : s.speaker === 'player' ? `player said: "${s.text}"` : `system: "${s.text}"`))
          .join(' | ')
    )
  }

  const hist = o.recentHistory.slice(-HISTORY_LINES)
  if (hist.length) {
    L.push(
      '[recent events] ' +
        hist.map((h) => (h.from === 'ai' ? `you built/planned: ${h.text}` : h.from === 'player' ? `player: ${h.text}` : h.from === 'world' ? `world: ${h.text}` : `system: ${h.text}`)).join(' | ')
    )
  }

  return L.join('\n')
}
