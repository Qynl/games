# CREATOR

**You are inside someone else's world. It is watching you.**

CREATOR is a 3D game/editor sandbox where a floating AI god head — the "CREATOR" — autonomously
builds, breaks, and rebuilds the world around you while you play inside it. It is not an assistant.
It is the developer. Sometimes it helps you. Sometimes it builds a racing track for no reason.
Sometimes it just watches.

Built with **Vite + React + TypeScript + Three.js (React Three Fiber)** and an optional local
**Ollama** backend. If Ollama isn't running, the app still launches and the AI falls back to a
built-in local autopilot — clearly labeled — so the world keeps living either way.

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`), click **Enter the world**, and start
walking around. The AI head floats over the baseplate and starts building within seconds.

### Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Move |
| Mouse | Look (pointer lock; drag-look fallback in embedded previews) |
| `Space` | Jump |
| `Shift` | Sprint |
| `C` | Toggle chat |
| `E` | Toggle virtual editor |
| `⚙️` button | Ollama settings |

If pointer lock is blocked (e.g. inside an iframe preview), the game automatically switches to
click-and-drag looking — click the canvas and drag.

---

## Ollama setup (recommended, optional)

The AI is much more interesting with a real LLM driving it:

1. Install Ollama: https://ollama.com
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Make sure the server is running (`ollama serve`, or just leave the app open).
4. In the game, open **⚙️ Settings** and click **Test connection**.
   Endpoint default: `http://localhost:11434`, model default: `llama3.2`.

> **CORS note:** browsers block cross-origin fetch. Ollama's default `OLLAMA_ORIGINS`
> already allows `localhost`, but if your app is served from a different origin (a dev
> tunnel, a preview domain, etc.) start Ollama with:
>
> ```bash
> OLLAMA_ORIGINS="*" ollama serve
> ```
>
> (or pass your exact origin, e.g. `OLLAMA_ORIGINS="http://localhost:5173"`).

Without Ollama the app still runs: the AI status chip shows **AUTOPILOT**, and a scripted
"director" drives the same autonomous loop (it picks projects, works across several ticks,
reacts to the player, and talks back). Connect Ollama later in settings to switch to the
LLM-driven brain.

---

## How the AI works

The AI runs a continuous autonomous loop, whether online or in autopilot:

```
observe world  →  think  →  decide  →  act (tools)  →  inspect result  →  react  →  repeat
```

- **Periodic observations, not full world dumps.** Every ~8-12s the controller builds a compact
  snapshot: player position/actions, nearby objects, object counts, weather, time, active
  objectives, recent events, chat history, and its own memory. That snapshot goes to the model.
- **JSON action plans.** The model replies with a JSON plan: `{ thought, chat, actions[], memory }`.
  Actions are validated and executed one by one by the sandboxed `WorldAPI`. The virtual editor
  stores every plan as a file under `scripts/plan_###.json`.
- **Memory.** The AI keeps short-term context in the observation and long-term facts (via
  `addMemory`) persisted in `localStorage` across sessions.
- **Personality.** The system prompt pushes it to behave like a cocky indie dev — not a support
  bot. It decides what to build on its own, sometimes ignores the player, and reacts to what the
  player does (idling, jumping, running into its builds).

### Architecture

```
src/
  components/   HUD, chat, settings, virtual editor, start overlay
  game/         3D scene: sky/light, baseplate, objects, NPCs, vehicles, weather, AI head
  player/       first-person controller, input, physics, collision
  ai/           OllamaClient, AIController (loop), prompts, autopilot director
  world/        WorldStore (state), WorldAPI (sandboxed tools), object defs
  types/        shared types
  utils/        math + helpers
```

The AI layer is decoupled from the UI:

- `OllamaClient` — talks to a local Ollama server (`/api/chat`, `/api/tags`).
- `AIController` — the autonomous loop, memory, moods, chat handling, online/autopilot modes.
- `WorldAPI` — every tool the AI is allowed to call; validates args and clamps coordinates.
- `VirtualEditor` — a view of the AI's "project": world state, generated scripts, entities,
  events, and a console.

## The sandbox

The AI can **only** mutate the world through the whitelisted `WorldAPI` tools
(`createObject`, `deleteObject`, `moveObject`, `createNPC`, `createVehicle`, `createTerrain`,
`changeWeather`, `changeTime`, `createEvent`, `createObjective`, `modifyWorld`, … — see the
**Tools** tab in the virtual editor).

- The AI never executes arbitrary JavaScript. It produces JSON plans that the engine runs.
- There is no `eval`, no filesystem access, no shell, no OS APIs, no network calls from the AI.
- Every tool clamps positions, enforces object limits, and rejects unknown arguments.

## The AI head

The floating head is the heart of the experience. It tracks you, blinks, darts its pupils,
types on invisible keyboards, and changes expression:

| Mood | What it looks like |
| --- | --- |
| idle | gentle float, slow blinks |
| thinking | narrowed eyes, darting pupils, `…` bubble |
| working | focused lean, typing hands, green glow |
| speaking | mouth animates, speech bubble |
| excited | faster bobbing, big smile |
| error | X eyes, red pulsing glow |

## Troubleshooting

- **"Ollama unreachable"** — server not running, wrong endpoint, or CORS. See the CORS note above.
- **Model not in the dropdown** — Ollama offline when you opened settings, or the model isn't
  pulled. `ollama pull llama3.2`, then hit *Test connection*.
- **AI replies are nonsense JSON** — some small models struggle with strict JSON. The parser
  strips code fences and recovers plain chat lines; a model like `llama3.2` (or larger) works
  best. If the model isn't named `llama3.2`/`qwen2.5`+, try a bigger one.
- **Build for production** — `npm run build` outputs a static site in `dist/`.

## Tech stack

Vite · React 18 · TypeScript · Three.js · React Three Fiber · drei · plain CSS.
No other frameworks.