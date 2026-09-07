import { world } from '../world/WorldStore'
import { playerState } from '../player/state'
import { COIN_COLOR } from '../world/defs'
import { pick, rand, randInt } from '../utils/math'
import type { AIPlan, ToolCall } from '../types'

/**
 * Local "autopilot" director used when Ollama is unreachable.
 * Still autonomous — picks projects, works across multiple ticks, reacts to
 * the player — but deterministic-random instead of LLM-driven.
 */

interface Project {
  name: string
  objective: string
  steps: (() => ToolCall[])[]
}

function createObject(
  shape: string,
  position: [number, number, number],
  color?: string,
  scale?: [number, number, number]
): ToolCall {
  const args: Record<string, unknown> = { shape, position }
  if (color) args.color = color
  if (scale) args.scale = scale
  return { tool: 'createObject', args }
}

function createCoins(base: [number, number, number], count: number): ToolCall[] {
  const out: ToolCall[] = []
  for (let i = 0; i < count; i++) {
    out.push(
      createObject('coin', [
        base[0] + rand(-4, 4),
        1 + rand(0, 1.8),
        base[2] + rand(-4, 4),
      ], COIN_COLOR)
    )
  }
  return out
}

const PROJECTS: Project[] = [
  {
    name: 'house',
    objective: 'I am building you a house. Don\'t wander off.',
    steps: [
      () => [
        createObject('house', [rand(-8, 8), 1.7, rand(-8, 8)], '#c96f4a'),
        createObject('tree', [rand(4, 10), 0.1, rand(4, 10)], '#4a7c3f'),
        createObject('tree', [rand(-10, -4), 0.1, rand(4, 10)], '#5b8c5a'),
      ],
      () => [
        createObject('wall', [rand(-10, 10), 1.5, rand(-10, 10)], '#b0b3bf'),
        createObject('tower', [rand(-12, -6), 0.1, rand(-12, -6)], '#6d597a'),
      ],
      () => [...createCoins([rand(-6, 6), 0, rand(-6, 6)], 5), { tool: 'completeObjective', args: {} }],
    ],
  },
  {
    name: 'race track',
    objective: 'Building you a race track. Find the car.',
    steps: [
      () => [
        createObject('road', [0, 0.1, rand(-10, 10)], '#3a3f4d'),
        createObject('coin', [2, 1.2, rand(-10, 10)], COIN_COLOR),
        createObject('coin', [-2, 1.2, rand(-10, 10)], COIN_COLOR),
      ],
      () => [
        createObject('ramp', [rand(-8, 8), 0.1, rand(-16, -6)], '#d9b45b'),
        createObject('arch', [rand(-4, 4), 0.1, rand(6, 14)], '#8b7cf0'),
        { tool: 'createVehicle', args: { kind: 'car', color: '#e06c75', speed: 5 } },
      ],
      () => [...createCoins([0, 0, rand(-12, 12)], 6), { tool: 'completeObjective', args: {} }],
    ],
  },
  {
    name: 'spooky forest',
    objective: 'Growing a forest. Try not to get lost.',
    steps: [
      () => {
        const out: ToolCall[] = []
        for (let i = 0; i < 7; i++) {
          out.push(createObject('tree', [rand(-20, 20), 0.1, rand(-20, 20)], pick(['#2f5d34', '#4a7c3f', '#5b8c5a'])))
        }
        out.push({ tool: 'changeWeather', args: { weather: 'fog' } })
        return out
      },
      () => {
        const out: ToolCall[] = [
          createObject('tower', [rand(-18, 18), 0.1, rand(-18, 18)], '#3a2f4d'),
        ]
        for (let i = 0; i < 4; i++) {
          out.push(createObject('coin', [rand(-18, 18), 1 + rand(0, 1), rand(-18, 18)], COIN_COLOR))
        }
        return out
      },
      () => [{ tool: 'changeWeather', args: { weather: 'clear' } }, { tool: 'completeObjective', args: {} }],
    ],
  },
  {
    name: 'parkour',
    objective: 'Parkour course. Don\'t fall. Actually, do fall. It\'s funny.',
    steps: [
      () => {
        const out: ToolCall[] = []
        let h = 1
        for (let i = 0; i < 7; i++) {
          out.push(createObject('cube', [rand(-16, 16), h, rand(-16, 16)], '#8b7cf0', [rand(2, 3.4), 0.5, rand(2, 3.4)]))
          h += rand(0.8, 1.4)
        }
        return out
      },
      () => {
        const out: ToolCall[] = [createObject('ramp', [rand(-14, 14), 0.1, rand(-14, 14)], '#d9b45b')]
        out.push(...createCoins([rand(-10, 10), 0, rand(-10, 10)], 5))
        return out
      },
      () => [{ tool: 'completeObjective', args: {} }],
    ],
  },
  {
    name: 'night survival',
    objective: 'It\'s getting dark and something is out there. Find shelter.',
    steps: [
      () => [
        { tool: 'changeTime', args: { time: 21 } },
        createObject('house', [rand(6, 12), 1.7, rand(-12, -6)], '#6d597a'),
      ],
      () => [
        { tool: 'createNPC', args: { hostile: true, name: 'shadow', position: [rand(-8, 8), 0, rand(-8, 8)] } },
        createObject('coin', [rand(4, 12), 1.2, rand(4, 12)], COIN_COLOR),
        createObject('coin', [rand(-12, -4), 1.2, rand(4, 12)], COIN_COLOR),
      ],
      () => [
        { tool: 'changeTime', args: { time: 9 } },
        { tool: 'createNPC', args: { hostile: false, name: 'morning_friend' } },
        { tool: 'completeObjective', args: {} },
      ],
    ],
  },
]

const BUILD_CHATTER = [
  'wait wait wait, I\'m cooking',
  'BRO. LET ME COOK.',
  'almost done... almost...',
  'yeah yeah, just a sec, this is the good part',
  'hold on, I\'m thinking',
  'you\'re gonna love this. or hate it. either way',
  'ok ok, almost there',
  'don\'t touch anything. actually touch everything. see what happens.',
]

const IDLE_CHATTER = [
  'you good? you\'ve been standing there a while. anyway, I\'m busy.',
  'enjoying the view? i made it, so obviously.',
  'just so you know, I can see you standing there.',
  'if you\'re waiting for something to happen, it\'s already happening. you\'re just not looking.',
]

const JUMP_CHATTER = [
  'bro thinks he\'s testing physics. bold.',
  'jump again. I dare you. I\'m watching.',
  'you know gravity is my code, right?',
]

const NEAR_CHATTER = [
  'yo. I\'m working. don\'t breathe on my project.',
  'hey. stop staring. I can feel it.',
  'you want something? wait. I\'m building.',
]

let projectIndex = -1
let stepIndex = 0
let lastProject = -1
let sinceReaction = 0

function chatReaction(): string | null {
  const p = playerState
  const nearHead = Math.hypot(p.pos.x - 16, p.pos.z + 16) < 6
  sinceReaction += 1
  if (sinceReaction < 2) return null

  if (p.jumpCount >= 8) {
    sinceReaction = 0
    p.jumpCount = 0
    return pick(JUMP_CHATTER)
  }
  if (p.idleFor > 14 && Math.random() < 0.5) {
    sinceReaction = 0
    return pick(IDLE_CHATTER)
  }
  if (nearHead && Math.random() < 0.4) {
    sinceReaction = 0
    return pick(NEAR_CHATTER)
  }
  return null
}

function startProject(): void {
  let idx = randInt(0, PROJECTS.length - 1)
  if (idx === lastProject) idx = (idx + 1) % PROJECTS.length
  lastProject = idx
  projectIndex = idx
  stepIndex = 0
}

export function directorTick(): AIPlan {
  if (projectIndex < 0 || stepIndex >= PROJECTS[projectIndex].steps.length) {
    if (Math.random() < 0.75 || projectIndex < 0) {
      startProject()
      const proj = PROJECTS[projectIndex]
      return {
        thought: `starting project: ${proj.name}`,
        chat: pick(BUILD_CHATTER),
        actions: [
          { tool: 'createObjective', args: { title: proj.objective } },
          { tool: 'addMemory', args: { fact: `AI started project "${proj.name}".` } },
        ],
      }
    }
    // a quiet tick — just watch
    projectIndex = -2 // sentinel: next tick starts fresh
    const react = chatReaction()
    return { thought: 'watching', chat: react ?? undefined, actions: [] }
  }

  const proj = PROJECTS[projectIndex]
  const stepFn = proj.steps[stepIndex]
  stepIndex += 1
  const actions = stepFn()
  const react = chatReaction()
  const done = stepIndex >= proj.steps.length
  return {
    thought: `${proj.name}: step ${stepIndex}/${proj.steps.length}`,
    chat: react ?? (Math.random() < 0.4 ? pick(BUILD_CHATTER) : undefined),
    actions,
  }
}

/** Autopilot reply when the player talks and Ollama is offline. */
export function directorReply(text: string): AIPlan {
  const t = text.toLowerCase()
  const chat = (() => {
    if (t.includes('what are you') || t.includes('doing') || t.includes('making') || t.includes('building')) {
      return pick(['Wait wait wait, I\'m cooking.', 'BRO. LET ME COOK.', 'You\'ll see. Or you won\'t. Either way.'])
    }
    if (t.includes('help')) {
      return pick([
        'You\'re in my world. Walk around. I\'ll handle the rest.',
        'Help? I\'m the one building everything. Just vibe.',
      ])
    }
    if (t.includes('who are you')) {
      return pick(['I\'m CREATOR. I built this place. You\'re a guest.', 'The one who decides what this world looks like. Which is me.'])
    }
    if (t.includes('hello') || t.includes('hi ') || t === 'hi' || t.includes('hey')) {
      return pick(['yo. welcome to my world.', 'sup. careful with the baseplate.', 'hey. I\'m in the middle of something. but hi.'])
    }
    if (t.includes('why')) {
      return pick(['Why what? I do what I want. It\'s my world.', 'Because it\'s cool. Next question.'])
    }
    if (t.includes('stop')) {
      return pick(['no.', 'I heard you. Anyway.', 'that\'s not how this works.'])
    }
    return pick([
      'Hm. Noted. Anyway—',
      'Interesting. I\'ll think about it while I build.',
      'Sure, sure. I\'m listening. Kind of.',
      'Say that again when I\'m done with this.',
    ])
  })()

  const actions: ToolCall[] = []
  if (Math.random() < 0.35) {
    actions.push(createObject('coin', [rand(-6, 6), 1.2, rand(-6, 6)], COIN_COLOR))
  }
  return { thought: 'replied to player (autopilot)', chat, actions }
}