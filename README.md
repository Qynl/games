# CREATOR

**You are trapped in the tiny 3D world of an autonomous AI game developer.**

A floating AI head (the "developer") lives in a sandbox world beside you. It ignores
you, gets distracted, changes its mind mid-project, mutters about its builds — and on
its own schedule it designs and builds playable mini-games right in front of you:
obstacle parkour, mazes, racing tracks, bowling alleys, shooting galleries, farms,
haunted graveyards, rainy nights, and stranger ideas.

Everything it builds is real: platforms you can jump on, lava you should not touch,
coins you can grab, cars you can drive, targets you can shoot, NPCs you can talk to.

Built only with **Vite + React + TypeScript + Three.js (React Three Fiber)** — no UI
kits, no physics engines, no state libraries.

---

## Quick start

Requires **Node.js 18+** (20/22 recommended) and **npm**.

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). Click **"click to enter the
world"**, then click the canvas to capture the mouse (**Esc** releases it).

No Ollama? The app still runs: the status dot stays red, the head idles, and the
**quick-build** buttons in the editor panel (`B`) fill the world with playable scenes.
To watch the AI think and build on its own, connect a model (below).

### Connect Ollama

1. Install [Ollama](https://ollama.com) and pull a model, e.g.:

   ```bash
   ollama serve
   ollama pull qwen2.5:7b     # or llama3.2, qwen2.5:3b, mistral, llama3.1 ...
   ```

2. In CREATOR open **AI settings** — reachable from the start screen ("configure AI")
   or the pause screen ("AI settings"). Set:

   - **Endpoint** — default `http://localhost:11434`. If Ollama runs on another
     machine, put its LAN address here (`http://192.168.1.20:11434`) and start Ollama
     with `OLLAMA_HOST=0.0.0.0`. The dev server also proxies `/ollama` → Ollama when a
     direct connection is blocked (CORS/network), so same-origin always works in dev.
   - **Model** — pick from the dropdown (fetched live) or type a name such as
     `qwen2.5:7b`.

3. Click **connect**. The dot turns green; the head announces itself and starts its
   first project within seconds. Watch the world change.

> Bigger models plan better. `qwen2.5:3b` works but is noticeably dumber.
> The model runs **locally**; the first reply can take a few seconds.

---

## Controls

| Key / input    | Action                                   |
| -------------- | ---------------------------------------- |
| Mouse          | Look (click canvas to lock pointer)      |
| `W A S D`      | Walk (Shift = run)                       |
| `Space`        | Jump                                     |
| `Ctrl` / `C`   | Crouch                                   |
| `E`            | Interact — talk to NPCs, enter cars, bowl, shoot, open doors |
| Mouse left     | Shoot (at shooting galleries)            |
| `T`            | Chat with the AI (Enter sends, Esc closes) |
| `B`            | Virtual editor panel (project / scripts / logs + quick-builds) |
| `N`            | Snap the camera to look at the AI head   |
| `Esc`          | Release mouse / pause                    |

Dying or falling off the world respawns you at the last checkpoint (green poles the
AI places) — or the spawn pad if none.

---

## What you're looking at

- **The head** — an AI game developer floating over the sandbox. It keeps a respectful
  viewing distance: glides closer when curious about what you're doing, backs off when
  you run at it, rises to watch from above. Its eyes track you, it blinks and squints,
  glows and pulses while thinking/working, spins its halo rings when busy, and its face
  shifts mood (happy, excited, annoyed, smug, panicked…). Speech bubbles carry its
  running commentary — sometimes for you, often for itself.
- **The world** — a baseplate with a day/night cycle (the AI can change time, weather,
  sky, terrain and lights), soft shadows and a collision world. The AI clears and
  rebuilds scenes as it changes projects; your checkpoints/spawn survive.
- **The project** — the AI works through a virtual editor project with
  `world.json`, `scripts/`, `events.log`, `project.json` files (see `B`). Its
  generated scripts execute **only** inside the game's script sandbox against the
  `w.*` world API.

---

## How the AI works

### Autonomous loop (not chat-driven)

On a fixed cadence (default every ~2.6 s, adjustable in settings — never per frame):

1. **Observe** — a compact snapshot: your position/velocity/actions, nearby objects &
   NPCs, scene/world status, recent events, its rolling speech log, and short- +
   long-term memory. No giant dumps, no full state per call.
2. **Decide** — it plans the next action through Ollama, or picks an offline reply when
   the server is gone.
3. **Act** — via tool calls that map onto the WorldAPI (see below), or speech bubbles.
4. **Read results** — next observation includes what the tool returned, so it notices
   failures ("check names/args") and self-corrects.
5. **React** — the world state, your behavior, and interrupts (chat, deaths, wins)
   re-shape its agenda: it reacts, fixes, celebrates, gets bored, starts over.

It has its own agenda. Chat is an interrupt it chooses how to handle — not a request
queue. The chat panel offers one-tap ideas, shows a typing indicator while the model
thinks, and short spoken lines pop above the head while longer narration lands in the
log.

World details that make it feel lived-in:

- NPCs with `chat` lines **speak unprompted** when you linger near them (~once every
  15 s, random) — no E press required.
- `follower` NPCs (pets, companions) trail you around the map and stop beside you.
- Winning a course pops a **confetti burst** of dynamic physics bits over your head.
- Sprinting widens the FOV subtly; falling adds a touch; the camera eases back.
- Taking damage tints the screen red; winning flashes gold.
- Scenes that start far from spawn **auto-move you to the start line**, facing the
  finish — no blind 40 m walks. Every built-in scene fits inside the world edge.
- **Red light, green light** is a real game now: the lamps cycle green (run!) and
  red (freeze!) on their own schedule, the warden sends you back when you're caught,
  and a finish tile at the far line wins the round.
- The first time you enter the world, control tips pop up one at a time; the chat
  panel has one-tap idea chips and a typing indicator while the model thinks.

### The tool surface

The AI plans against a documented tool list (persona + tools live in
`src/ai/prompts.ts`): `say/chat`, `createGame` (built-in scene recipes such as maze,
parkour, coin run, racing track, bowling alley, shooting gallery, red light green
light, farm, graveyard, house, night camp…), plus object verbs (`createObject`,
`moveObject`, `rotateObject`, `scaleObject`, `deleteObject`, `paintObject`,
`cloneObject`, `material`, `physicsBody`…), zones/checkpoints/collectibles helpers,
NPCs & vehicles, terrain/weather/time/sky/light, objectives, scripts and
queries (`listObjects`, `findObjectsNear`, `status`, `getObject`, `recall`,
`remember`). Everything funnels through `WorldAPI`.

### Sandbox safety

AI-generated scripts (and any script you paste in the editor) run through
`src/ai/sandbox.ts`:

- **Static scan** — refuses `window`, `document`, `fetch`, `localStorage`,
  `XMLHttpRequest`, `WebSocket`, `Worker`, `eval`, `Function`, `process`, `require`,
  `import(`, timers, encoders and more, with a clear "blocked API" error.
- **Scoped execution** — the code runs in a `new Function` whose only scope is the
  sandboxed world API (`w.*`), pure JS globals and a stub console.
- **No host** — it is a browser app: there is no filesystem, shell, or network surface
  behind it. The WorldAPI itself clamps positions/scales, caps object counts, and only
  mutates in-memory world data.
- **Feedback** — errors (syntax, runtime, blocked API) surface in the editor panel and
  feed the AI's next observation so it can fix its own code.

### Memory

`src/ai/Memory.ts` keeps both short-term observations (events, player messages) and
consolidated long-term facts ("player keeps dying", "I built a maze earlier", lessons
after failed API calls). The AI can query it with `recall` and write with `remember`.

### Speech & sound

No audio assets. Chatter blips, UI pops, hazard stingers and the like are synthesized
with WebAudio (`src/ai/aifx.ts`); mute via Settings.

---

## Project layout

```
src/
  main.tsx                     React entry
  App.tsx                      session lifecycle, pointer lock, hotkeys, panels
  styles.css                   all UI styling (dark editor look)

  game/
    GameEngine.ts              simulation core: player physics, collision,
                               hazards, checkpoints, win/lose, vehicles,
                               shooting, bowling, NPCs, events, camera, scenes
    Session.ts                 UI facade wiring engine + AI + editor + Ollama
    PlayerController.ts        first-person body (WASD, jump, crouch, falls)
    RecipeEngine.ts            scene recipes used by createGame / quick-builds

  ai/
    AIController.ts            the autonomous loop (observe→decide→act→react)
    OllamaClient.ts            Ollama HTTP client (+ dev proxy fallback)
    ContextBuilder.ts          compact observation text for the model
    Memory.ts                  short-term + persistent memory
    prompts.ts                 persona, ACTOR_TOOLS, system prompts
    sandbox.ts                 sandboxed script execution
    aifx.ts                    WebAudio sounds

  editor/
    VirtualEditor.ts           virtual project files + script host (runs w.*)

  world/
    WorldAPI.ts                the only world-mutating surface (validated)

  components/
    GameScene.tsx              R3F canvas + camera rig
    AiHead.tsx                 the developer head (eyes, mood, halo, bubble)
    WorldObjects.tsx           imperative Three.js meshes for the world state
    Environment.tsx            sky/sun/moon/stars/rain/clouds/lights
    Overlays.tsx               HUD: status, speech bubbles, toasts, hint bar
    Panels.tsx                 Chat / Virtual editor / AI settings / pause

  types/index.ts               shared types
  utils/helpers.ts, settings.ts
```

### Architecture notes

- World state is plain TypeScript objects; React renders the DOM shell, an imperative
  Three.js layer mirrors the state into the scene. No physics engine: collisions are
  resolved by controllers over box colliders.
- The AI cannot see the DOM or React; it talks to `AIController` through `WorldAPI`,
  and the UI only ever displays session state. Everything is decoupled.

---

## Dev commands

```bash
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build (dist/)
npm run preview     # serve the production build on :4173
```

Vite config notes: dev/preview bind `0.0.0.0`, and `/ollama` proxies to
`http://localhost:11434` (used automatically when direct Ollama calls fail in dev).

### Known limits

- Local models are slow and occasionally sloppy — the AI usually notices and fixes;
  give it a few turns. Huge plans take several cycles by design.
- Script sandbox forbids timers (`setTimeout`…), so scripts are simple per-tick
  programs — intentional, keeps the world deterministic.
- The Editor panel shows the in-memory project: readable and editable, but it never
  touches your real filesystem (that is the point).
- First connect may take a moment while the model list is fetched; the app runs fully
  offline otherwise.

---

*Made with React, TypeScript, Three.js and React Three Fiber — plus one very busy AI head.*
