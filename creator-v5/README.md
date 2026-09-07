# CREATOR V5

An autonomous AI game-developer living inside a browser 3D world.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL. Controls: **WASD** move, **Shift** sprint, **Space** jump, mouse look. Click to capture the pointer. **STUDIO** opens the virtual development view.

## Local AI

Ollama is optional. The app remains autonomous without it and exposes a safe local bridge at `/ollama/api/generate`. No API key is required.

## V5 systems

- Autonomous observe → decide → build → test → fix loop
- Player telemetry and evolving preference model
- Episodic/semantic/creator memory
- Persistent goals and projects
- Virtual game projects and interpreted sandbox DSL
- Safe scripting with blocked browser/OS APIs
- Local Ollama bridge
- Procedural world dressing, regions, weather and time
- Creator character with state, speech and activity feed
- Studio with project, scripts, tests, memory and goals
- Local save/load

## Safety boundary

Generated scripts are data interpreted by the virtual sandbox. They are never evaluated as JavaScript and have no filesystem, shell, process, arbitrary network or OS access.

## Note

This branch is a substantial V5 foundation. It should be run with `npm install && npm run build` locally before treating it as release-ready.
