import { world } from './WorldStore'
import { COIN_COLOR, OBJ_BOUNDS, PALETTE, SHAPE_INFO } from './defs'
import { clamp, pick, rand, randInt, uid } from '../utils/math'
import type { AIPlan, Shape, ToolCall, ToolDef, Weather } from '../types'

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function bool(v: unknown): boolean {
  return v === true || v === 'true'
}

function vec3(v: unknown, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (Array.isArray(v) && v.length === 3) {
    return [num(v[0], fallback[0]), num(v[1], fallback[1]), num(v[2], fallback[2])]
  }
  return fallback
}

function hex(v: unknown): string {
  if (typeof v === 'string' && /^#?[0-9a-fA-F]{6}$/.test(v.replace(/^#/, ''))) {
    return v.startsWith('#') ? v : `#${v}`
  }
  return pick(PALETTE)
}

const MAX_OBJECTS = 220
const MAX_NPCS = 8
const MAX_VEHICLES = 6

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'createObject',
    description: 'Spawn a new object into the world.',
    args: [
      { name: 'shape', type: 'string', description: 'cube | sphere | cylinder | cone | coin | ramp | wall | tree | house | tower | arch | road', required: true },
      { name: 'position', type: 'string', description: '[x, y, z] — keep inside ±46, y ≥ 0.1' },
      { name: 'color', type: 'string', description: 'hex color like #4a7c3f' },
      { name: 'name', type: 'string', description: 'optional name for later reference' },
    ],
  },
  {
    name: 'deleteObject',
    description: 'Remove an object by id or name.',
    args: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
    ],
  },
  {
    name: 'moveObject',
    description: 'Move an object (by id or name) to a new absolute position.',
    args: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'position', type: 'string', description: '[x, y, z]', required: true },
    ],
  },
  {
    name: 'rotateObject',
    description: 'Rotate an object (by id or name).',
    args: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'rotation', type: 'string', description: '[rx, ry, rz] in radians', required: true },
    ],
  },
  {
    name: 'scaleObject',
    description: 'Rescale an object (by id or name).',
    args: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'scale', type: 'string', description: '[sx, sy, sz] between 0.2 and 8', required: true },
    ],
  },
  {
    name: 'createNPC',
    description: 'Spawn a wandering NPC. Set hostile to make it chase the player.',
    args: [
      { name: 'name', type: 'string' },
      { name: 'position', type: 'string', description: '[x, y, z]' },
      { name: 'color', type: 'string' },
      { name: 'hostile', type: 'boolean', description: 'chases the player' },
    ],
  },
  {
    name: 'createVehicle',
    description: 'Spawn a car or truck that drives around the world.',
    args: [
      { name: 'kind', type: 'string', description: 'car | truck' },
      { name: 'position', type: 'string' },
      { name: 'color', type: 'string' },
      { name: 'speed', type: 'number', description: 'units per second (1-8)' },
    ],
  },
  {
    name: 'createTerrain',
    description: 'Generate terrain: hills | platforms | stairs | canyon.',
    args: [{ name: 'type', type: 'string', description: 'hills | platforms | stairs | canyon', required: true }],
  },
  {
    name: 'changeWeather',
    description: 'Change the weather: clear | rain | snow | fog.',
    args: [{ name: 'weather', type: 'string', required: true }],
  },
  {
    name: 'changeTime',
    description: 'Set time of day (0-24, 12 = noon).',
    args: [{ name: 'time', type: 'number', required: true }],
  },
  {
    name: 'createEvent',
    description: 'Create a triggered event. trigger: proximity or collect. action: spawnCoins | spawnNpc | spawnVehicle | weather:<w> | time:<n> | complete:<objectiveId> | delete:<name> | chat:<text> | feed:<text>',
    args: [
      { name: 'name', type: 'string', required: true },
      { name: 'trigger', type: 'string', description: 'proximity | collect' },
      { name: 'position', type: 'string', description: '[x, y, z] for proximity' },
      { name: 'radius', type: 'number', description: 'trigger radius' },
      { name: 'action', type: 'string', required: true },
    ],
  },
  {
    name: 'createObjective',
    description: 'Give the player a goal.',
    args: [{ name: 'title', type: 'string', required: true }, { name: 'description', type: 'string' }],
  },
  {
    name: 'completeObjective',
    description: 'Mark an objective complete (by id, or the first active one).',
    args: [{ name: 'id', type: 'string' }],
  },
  {
    name: 'addMemory',
    description: 'Store a fact about the player or world in long-term memory.',
    args: [{ name: 'fact', type: 'string', required: true }],
  },
  {
    name: 'modifyWorld',
    description: 'Tune world physics for the player: gravity, jump, playerSpeed.',
    args: [
      { name: 'gravity', type: 'number', description: '8-40' },
      { name: 'jump', type: 'number', description: '4-16' },
      { name: 'playerSpeed', type: 'number', description: '2-12' },
    ],
  },
  {
    name: 'resetWorld',
    description: 'Wipe everything back to the empty baseplate.',
    args: [],
  },
]

class WorldAPI {
  private planSeq = 0

  execute(tool: string, rawArgs: Record<string, unknown> = {}): { ok: boolean; message: string } {
    const def = TOOL_DEFS.find((t) => t.name === tool)
    if (!def) return { ok: false, message: `unknown tool "${tool}"` }
    const fn = (this as unknown as Record<string, unknown>)[tool]
    if (typeof fn !== 'function') return { ok: false, message: `tool "${tool}" is not callable` }
    try {
      return (fn as (a: Record<string, unknown>) => { ok: boolean; message: string }).call(this, rawArgs ?? {})
    } catch (err) {
      return { ok: false, message: `tool "${tool}" threw: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  runPlan(plan: AIPlan): void {
    this.planSeq += 1
    for (const action of plan.actions ?? []) {
      const res = this.execute(action.tool, action.args ?? {})
      const tag = res.ok ? '✓' : '✗'
      world.addFeed(`${tag} ${action.tool} — ${res.message}`, res.ok ? 'world' : 'system')
      if (!res.ok) world.addFeed(`tool error on ${action.tool}: ${res.message}`, 'system')
    }
    this.syncFiles(plan)
  }

  private syncFiles(plan: AIPlan): void {
    world.writeFile(
      'world/state.json',
      JSON.stringify(
        {
          weather: world.weather,
          timeOfDay: world.timeOfDay,
          objects: world.objects.size,
          npcs: world.npcs.size,
          vehicles: world.vehicles.size,
          objectives: world.objectives.filter((o) => o.status === 'active').map((o) => o.title),
          score: world.score,
          gravity: world.params.gravity,
          jump: world.params.jump,
          playerSpeed: world.params.walkSpeed,
        },
        null,
        2
      )
    )
    world.writeFile(
      `scripts/plan_${String(this.planSeq).padStart(3, '0')}.json`,
      JSON.stringify(plan, null, 2)
    )
    world.writeFile(
      'objects/registry.json',
      JSON.stringify(
        Array.from(world.objects.values())
          .slice(-40)
          .map((o) => ({ name: o.name, shape: o.shape, position: o.position, color: o.color })),
        null,
        2
      )
    )
    world.writeFile(
      'entities/npcs.json',
      JSON.stringify(
        Array.from(world.npcs.values()).map((n) => ({
          name: n.name,
          mood: n.mood,
          hostile: n.hostile,
          position: n.position,
        })),
        null,
        2
      )
    )
    world.writeFile(
      'entities/vehicles.json',
      JSON.stringify(
        Array.from(world.vehicles.values()).map((v) => ({
          name: v.name,
          kind: v.kind,
          speed: v.speed,
          direction: v.direction,
          position: v.position,
        })),
        null,
        2
      )
    )
    world.writeFile(
      'events/registry.json',
      JSON.stringify(
        Array.from(world.events.values()).map((e) => ({
          name: e.name,
          trigger: e.trigger,
          action: e.action,
          done: e.done,
        })),
        null,
        2
      )
    )
  }

  // ---------------------------------------------------------------- tools

  private findObject(args: Record<string, unknown>): { id: string; name: string } | null {
    const id = str(args.id)
    if (id && world.objects.has(id)) {
      const o = world.objects.get(id)!
      return { id: o.id, name: o.name }
    }
    const name = str(args.name)
    if (name) {
      for (const o of world.objects.values()) if (o.name === name) return { id: o.id, name: o.name }
    }
    return null
  }

  createObject(args: Record<string, unknown>): { ok: boolean; message: string } {
    if (world.objects.size >= MAX_OBJECTS) {
      return { ok: false, message: `object limit reached (${MAX_OBJECTS})` }
    }
    const rawShape = str(args.shape, 'cube') as Shape
    const shape: Shape = SHAPE_INFO[rawShape] ? rawShape : 'cube'
    const pos = vec3(args.position)
    const position: [number, number, number] = [
      clamp(pos[0], -OBJ_BOUNDS.x, OBJ_BOUNDS.x),
      clamp(pos[1], 0.1, OBJ_BOUNDS.yMax),
      clamp(pos[2], -OBJ_BOUNDS.z, OBJ_BOUNDS.z),
    ]
    const color = hex(args.color)
    const name = str(args.name) || `${shape}_${world.objects.size + 1}`
    const scale = vec3(args.scale, [1, 1, 1]).map((s) => clamp(s, 0.2, 8)) as [number, number, number]
    world.addObject({
      name,
      shape,
      position,
      rotation: vec3(args.rotation),
      scale,
      color,
    })
    return { ok: true, message: `spawned ${shape} "${name}" at ${position.map((v) => Math.round(v)).join(', ')}` }
  }

  deleteObject(args: Record<string, unknown>): { ok: boolean; message: string } {
    const found = this.findObject(args)
    if (!found) return { ok: false, message: `no object matching ${str(args.id) || str(args.name)}` }
    world.removeObject(found.id)
    return { ok: true, message: `deleted "${found.name}"` }
  }

  moveObject(args: Record<string, unknown>): { ok: boolean; message: string } {
    const found = this.findObject(args)
    if (!found) return { ok: false, message: 'object not found' }
    const pos = vec3(args.position)
    const o = world.objects.get(found.id)!
    o.position = [
      clamp(pos[0], -OBJ_BOUNDS.x, OBJ_BOUNDS.x),
      clamp(pos[1], 0.1, OBJ_BOUNDS.yMax),
      clamp(pos[2], -OBJ_BOUNDS.z, OBJ_BOUNDS.z),
    ]
    return { ok: true, message: `moved "${found.name}"` }
  }

  rotateObject(args: Record<string, unknown>): { ok: boolean; message: string } {
    const found = this.findObject(args)
    if (!found) return { ok: false, message: 'object not found' }
    const o = world.objects.get(found.id)!
    o.rotation = vec3(args.rotation)
    return { ok: true, message: `rotated "${found.name}"` }
  }

  scaleObject(args: Record<string, unknown>): { ok: boolean; message: string } {
    const found = this.findObject(args)
    if (!found) return { ok: false, message: 'object not found' }
    const o = world.objects.get(found.id)!
    o.scale = vec3(args.scale, [1, 1, 1]).map((s) => clamp(s, 0.2, 8)) as [number, number, number]
    return { ok: true, message: `rescaled "${found.name}"` }
  }

  createNPC(args: Record<string, unknown>): { ok: boolean; message: string } {
    if (world.npcs.size >= MAX_NPCS) return { ok: false, message: 'NPC limit reached' }
    const pos = vec3(args.position, [rand(-10, 10), 0, rand(-10, 10)])
    const hostile = bool(args.hostile)
    const npc = world.addNPC({
      name: str(args.name, `npc_${world.npcs.size + 1}`),
      position: [clamp(pos[0], -40, 40), 0, clamp(pos[2], -40, 40)],
      color: hex(args.color),
      mood: hostile ? 'chase' : 'wander',
      speed: rand(1.4, 2.4),
      hostile,
    })
    return {
      ok: true,
      message: hostile
        ? `spawned hostile "${npc.name}" — good luck`
        : `spawned friendly "${npc.name}"`,
    }
  }

  createVehicle(args: Record<string, unknown>): { ok: boolean; message: string } {
    if (world.vehicles.size >= MAX_VEHICLES) return { ok: false, message: 'vehicle limit reached' }
    const pos = vec3(args.position, [rand(-30, 30), 0.4, rand(-12, 12)])
    const kind = str(args.kind) === 'truck' ? 'truck' : 'car'
    const v = world.addVehicle({
      name: str(args.name, `${kind}_${world.vehicles.size + 1}`),
      position: [clamp(pos[0], -38, 38), 0.4, clamp(pos[2], -38, 38)],
      color: hex(args.color),
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: clamp(num(args.speed, rand(3, 6)), 1, 8),
      kind,
    })
    return { ok: true, message: `spawned ${kind} "${v.name}"` }
  }

  createTerrain(args: Record<string, unknown>): { ok: boolean; message: string } {
    const type = str(args.type, 'hills')
    const cx = rand(-12, 12)
    const cz = rand(-12, 12)
    let made = 0
    if (type === 'hills') {
      for (let i = 0; i < 8; i++) {
        this.createObject({
          shape: 'sphere',
          position: [clamp(cx + rand(-18, 18), -42, 42), 0.8 + rand(-0.4, 0.9), clamp(cz + rand(-18, 18), -42, 42)],
          scale: [rand(3, 6), rand(1.6, 3.2), rand(3, 6)],
          color: pick(PALETTE),
        })
        made++
      }
    } else if (type === 'platforms') {
      for (let i = 0; i < 9; i++) {
        this.createObject({
          shape: 'cube',
          position: [clamp(cx + rand(-20, 20), -42, 42), 1.4 + rand(0, 4.5), clamp(cz + rand(-20, 20), -42, 42)],
          scale: [rand(2, 4), 0.5, rand(2, 4)],
          color: '#8b7cf0',
        })
        made++
      }
    } else if (type === 'stairs') {
      for (let i = 0; i < 6; i++) {
        this.createObject({
          shape: 'cube',
          position: [clamp(cx, -42, 42), 0.5 + i * 0.7, clamp(cz + i * 3, -42, 42)],
          scale: [3, 1, 3],
          color: '#d9b45b',
        })
        made++
      }
    } else if (type === 'canyon') {
      this.createObject({ shape: 'road', position: [clamp(cx, -42, 42), 0.1, clamp(cz, -42, 42)], color: '#3a3f4d' })
      this.createObject({ shape: 'wall', position: [clamp(cx - 5, -42, 42), 1.5, clamp(cz, -42, 42)], scale: [1.8, 1, 14], color: '#6d597a' })
      this.createObject({ shape: 'wall', position: [clamp(cx + 5, -42, 42), 1.5, clamp(cz, -42, 42)], scale: [1.8, 1, 14], color: '#6d597a' })
      made = 3
    }
    return { ok: true, message: `generated terrain "${type}" (${made} objects)` }
  }

  changeWeather(args: Record<string, unknown>): { ok: boolean; message: string } {
    const w = str(args.weather) as Weather
    if (w !== 'clear' && w !== 'rain' && w !== 'snow' && w !== 'fog') {
      return { ok: false, message: `unknown weather "${str(args.weather)}"` }
    }
    world.setWeather(w)
    return { ok: true, message: `weather set to ${w}` }
  }

  changeTime(args: Record<string, unknown>): { ok: boolean; message: string } {
    const t = clamp(num(args.time, 12), 0, 24)
    world.setTime(t)
    return { ok: true, message: `time set to ${t.toFixed(1)}h` }
  }

  createEvent(args: Record<string, unknown>): { ok: boolean; message: string } {
    const trigger = str(args.trigger) === 'collect' ? 'collect' : 'proximity'
    const ev = world.addEvent({
      name: str(args.name, 'event'),
      trigger,
      position: trigger === 'proximity' ? vec3(args.position, [0, 1, 0]) : [0, 1, 0],
      radius: clamp(num(args.radius, 3), 1, 20),
      action: str(args.action),
    })
    return { ok: true, message: `event "${ev.name}" armed (${trigger})` }
  }

  createObjective(args: Record<string, unknown>): { ok: boolean; message: string } {
    const o = world.addObjective({
      title: str(args.title, 'New objective'),
      description: typeof args.description === 'string' ? args.description : undefined,
    })
    world.addChat('system', `📌 New objective: ${o.title}`)
    return { ok: true, message: `objective "${o.title}" created` }
  }

  completeObjective(args: Record<string, unknown>): { ok: boolean; message: string } {
    const id = str(args.id) || undefined
    if (world.completeObjective(id)) {
      return { ok: true, message: id ? `objective "${id}" complete` : 'objective complete' }
    }
    return { ok: false, message: 'no active objective found' }
  }

  addMemory(args: Record<string, unknown>): { ok: boolean; message: string } {
    const fact = str(args.fact)
    if (!fact) return { ok: false, message: 'empty memory fact' }
    world.addMemory(fact)
    return { ok: true, message: 'remembered' }
  }

  modifyWorld(args: Record<string, unknown>): { ok: boolean; message: string } {
    if (args.gravity !== undefined) world.params.gravity = clamp(num(args.gravity), 8, 40)
    if (args.jump !== undefined) world.params.jump = clamp(num(args.jump), 4, 16)
    if (args.playerSpeed !== undefined) {
      world.params.walkSpeed = clamp(num(args.playerSpeed), 2, 12)
      world.params.sprintSpeed = world.params.walkSpeed * 1.6
    }
    return { ok: true, message: 'world physics tuned' }
  }

  resetWorld(args: Record<string, unknown>): { ok: boolean; message: string } {
    void args
    world.resetWorld()
    return { ok: true, message: 'world reset to baseplate' }
  }

  // ---------------------------------------------------------------- runtime triggers

  triggerEvent(id: string): void {
    const ev = world.events.get(id)
    if (!ev || ev.done) return
    ev.done = true
    const parts = str(ev.action).split(':')
    const cmd = parts.shift() ?? ''
    const rest = parts.join(':')
    switch (cmd) {
      case 'spawnCoins': {
        const base = ev.position
        for (let i = 0; i < 6; i++) {
          this.createObject({
            shape: 'coin',
            position: [base[0] + rand(-3, 3), 1 + rand(0, 1.6), base[2] + rand(-3, 3)],
            color: COIN_COLOR,
            name: 'coin',
          })
        }
        break
      }
      case 'spawnNpc':
        this.createNPC({ position: ev.position, hostile: false })
        break
      case 'spawnVehicle':
        this.createVehicle({ position: ev.position })
        break
      case 'weather':
        this.changeWeather({ weather: rest })
        break
      case 'time':
        this.changeTime({ time: Number(rest) || 12 })
        break
      case 'complete':
        this.completeObjective(rest ? { id: rest } : {})
        break
      case 'delete':
        this.deleteObject({ name: rest })
        break
      case 'chat':
        world.addChat('system', rest)
        break
      case 'feed':
        world.addFeed(rest, 'world')
        break
      default:
        world.addFeed(`event "${ev.name}" fired (action: ${str(ev.action)})`, 'world')
    }
    world.addFeed(`⚡ event "${ev.name}" triggered`, 'world')
  }

  onCoinCollected(): void {
    for (const ev of world.events.values()) {
      if (ev.trigger === 'collect' && !ev.done) {
        ev.done = true
        const parts = str(ev.action).split(':')
        const cmd = parts.shift() ?? ''
        if (cmd === 'complete') {
          world.completeObjective(parts.join(':') || undefined)
          world.addFeed(`⚡ event "${ev.name}" triggered`, 'world')
        }
      }
    }
  }
}

export const api = new WorldAPI()