# ⚔️ Brawl Arena — Web Brawler

A complete top-down twin-stick brawler for the browser, built with **Vite + React + TypeScript + Canvas 2D**.
Original characters, art, and audio — all assets are generated or synthesized, no external files.

## 🎮 Play

```bash
npm install
npm run dev
```

Open the preview, hit **PLAY**, pick a mode and brawl!

## 🕹️ Controls

| Action | Keyboard / Mouse | Touch |
|---|---|---|
| Move | WASD / arrows | Left-side joystick |
| Aim | Mouse | Right-side joystick |
| Fire | Left click / hold | Hold aim joystick |
| Super | Right-click or E | Super button |
| Gadget | Q | Gadget button |
| Emote | C | — |
| Pause | ESC | ⏸ button |

## 🎯 Game modes

- **Gem Grab (3v3)** — fight for crystals erupting from the central mine. Collect 10 as a team and survive the 15s countdown!
- **Bounty (3v3)** — every takedown earns stars. The more stars your target carries, the more you claim. First team to 10 wins!
- **Showdown (Solo, 10 players)** — smash boxes for power cubes, outfight 9 bots, and outrun the closing gas. Last brawler standing wins!

## 🧑‍🎤 Roster (8 original brawlers)

Rusty (shotgun badger) · Nova (rocket launcher) · Rex (burst sniper) · Moose (melee tank)
Tumble (lobber alchemist) · Pip (healing frog) · Blitz (dashing ninja) · Twitch (turret engineer)

Each has a unique attack, super, and 3-use gadget.

## 🛠️ Tech

- **Game loop**: fixed-step 60fps simulation, canvas renderer with camera, screen shake, particles
- **AI**: goal-based bots — lane rally, gem countdown logic, target prioritization, pathfinding (A*), projectile dodging, showdown behavior tree
- **Audio**: 100% procedural WebAudio SFX + chiptune battle/menu music (no audio files)
- **Progress**: local save — trophies per brawler, ranks, unlocks, boxes, daily gift, win streaks

> Fan-made project with original characters and art. Not affiliated with any commercial game.
