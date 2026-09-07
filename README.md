# QYNGUN

A fast, momentum-first first-person shooter that runs in the browser. React + Vite + three.js.

Speed is never given to you — you earn it. Walk speed is deliberately ordinary; everything
fast comes from **chaining** sprint → slide → jump → air-strafe → land → sprint, and the
faster you are moving, the harder you hit.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # headless movement / map / engine / UI / balance suites
npm run build
```

---

## Movement

The simulation runs on a **fixed 1/120 s step** in its own accumulator loop, completely
separate from React. React only receives a 30 Hz HUD snapshot, so rendering never
influences physics. Bots drive the *same* `MovementController` as the player, through
synthetic input.

| Mechanic | Behaviour |
| --- | --- |
| Sprint | Noticeably faster than walking, with responsive accel — never snaps to top speed. Subtle FOV push. |
| Slide | `SPRINT + CROUCH`. Preserves horizontal momentum, drops the collision capsule, lowers the camera smoothly, steers by *rotating* the velocity vector (never adding to it), bleeds off with friction, works downhill, ends naturally when you run out of speed, and can be jumped out of at full pace. |
| Slide-jump | Keeps your momentum. Velocity is never reset on jump. |
| Air strafe | Strong air acceleration that rewards A/D + mouse timing, not free flight. |
| Slopes | Downhill gains and preserves speed, uphill bleeds it, ramps and stairs never produce invisible walls. |
| Coyote time + jump buffer | Both present, both invisible. Land slightly before pressing jump and you still get the jump. |
| Landing | Impact dip on the camera, small FOV punch, momentum preserved into the next slide. |
| Camera | Sprint FOV, slide lowering, landing dip, subtle strafe tilt, restrained shake. |

Collision is a capsule against oriented boxes, sub-stepped and resolved against the deepest
contact, with a step-up that never launches you and a step-down that never drops you.

### The nine chains

The movement HUD tracks all nine live. They are covered by `scripts/movement-test.mjs` (30/30):

1. SPRINT → SLIDE
2. SPRINT → SLIDE → JUMP
3. SPRINT → JUMP → AIR STRAFE
4. SPRINT → SLIDE → JUMP → AIR STRAFE → LAND → SLIDE
5. DOWNHILL SPRINT → SLIDE
6. HIGH-SPEED SLIDE → JUMP
7. STRAFE → JUMP → AIR STRAFE → LAND
8. JUMP BUFFER → LAND → JUMP
9. COYOTE TIME → JUMP

### Speed is damage

```
momentumScale(speed)  →  guns  1.00 → 1.55×   (5 → 17 m/s)
                         melee 1.00 → 2.00×
```

The HUD shows your live multiplier. A full-speed melee hit one-shots a 150 HP fighter.

---

## Controls

| | |
| --- | --- |
| `W A S D` | move |
| `SHIFT` | sprint |
| `CTRL` / `C` | slide (while sprinting) / crouch |
| `SPACE` | jump (buffered, coyote-timed) |
| `LMB` / `RMB` | fire / aim |
| `R` | reload |
| `1` `2` `3` / `Q` / wheel | primary, secondary, melee / last weapon / cycle |
| `F` `G` | utility |
| `V` / `TAB` | scoreboard (hold) |
| `B` | change loadout (shooting range only) |
| `ESC` | release the mouse → pause |

---

## Content

- **6 maps** — `QYN YARD` (movement playground: flats, ramps, stairs, gaps, long platforms, corners),
  `VERTEX` (duel), `CONDUIT` (three lanes), `DESCENT` (the hill), `FRACTURE` (upper deck over a bowl,
  drop-downs and a long downhill), `RANGE` (firing line 15/30/50 m + speed track).
- **7 modes** — 1v1, 2v2, 3v3, 1 v Bots, 1+Bot v 2 Bots, 1+2 Bots v 3 Bots, Shooting Range.
- **40 weapons** — 10 primary, 10 secondary, 10 melee, 10 utility. Hit-scan, pellets, beams,
  charged lances, projectiles, placeables (barrier / mine / decoy), a grapnel, stim, EMP.
- **12 skins**, bought with Qyns.
- **Loadout** chosen slot by slot at match start (primary → secondary → melee → utility).
- **Round loop** — 150 HP, first to 5, 90 s rounds, instant reset, Qyns + XP + levels on match end.
- **Bots** at four difficulties (`easy`, `normal`, `hard`, `qyn`). They slide-hop, use their utility,
  swap weapons when dry, and read as real lobby players: names, pings, loadouts.
- **Team play** — nameplates with health over team-mates, kill cam (you watch whoever got you),
  spectate a team-mate while dead, assists, a `V`/`TAB` scoreboard with K/D/A/damage/ping/weapon.
- **Combat feedback** — damage-direction arcs, hit markers, floating damage, first blood / double /
  triple / rampage callouts, match point, a 0.9 s spawn shield so nobody is spawn-killed.

Everything is procedural: geometry, characters, viewmodels, audio (WebAudio synth) and VFX.
No external assets, no downloads.

---

## Tests

No browser needed — the whole engine is testable headlessly (the renderer is injectable).

| Script | What it proves |
| --- | --- |
| `scripts/movement-test.mjs` | 30 checks: the nine chains, no snapping, no stickiness, slope behaviour, step-up, stairs. |
| `scripts/maps-test.mjs` | Every spawn point is solid, 24 randomised 10-second runs per map never fall through the floor or wedge, brush counts sane. |
| `scripts/game-test.mjs` | Real matches on every mode: bots fight, damage registers, rounds progress, a full match reaches first-to-5, all 40 weapons fire. |
| `scripts/flow-test.mjs` | Drives the real React UI in jsdom: title → lobby → all four loadout slots → START MATCH → HUD. Catches dead buttons and stuck loading screens. |
| `scripts/ui-test.mjs` | Every screen renders with `react-dom/server`. |
| `scripts/balance-test.mjs` | TTK table + momentum damage curve; warns when a weapon is off the curve. |

### Notes
- The renderer is injectable (`window.__qyngunRendererFactory`) so the whole simulation can be
  driven headlessly — that is how the engine, flow and UI suites run without a GPU.
- If pointer lock is unavailable (embedded iframe, permission denied) the game falls back to
  free-cursor mouse look instead of stranding you on a frozen screen.
