// Render every screen with react-dom/server — catches UI crashes without a browser.
import { build } from 'esbuild'
import fsSync from 'node:fs'
import { renderToString } from 'react-dom/server'
import React from 'react'

const OUT = new URL('./.uitest/bundle.mjs', import.meta.url).pathname
await build({
  entryPoints: [new URL('./.uitest/entry.jsx', import.meta.url).pathname],
  bundle: true, format: 'esm', outfile: OUT, platform: 'node',
  external: ['react', 'react-dom', 'react-dom/server', 'three'],
  loader: { '.js': 'jsx' },
  logLevel: 'warning',
})
const UI = await import(OUT)

import { WEAPONS, SLOTS, DEFAULT_LOADOUT } from '../src/game/data/weapons.js'
import { SKINS } from '../src/game/data/skins.js'
import { MODES, MAPS } from '../src/game/data/maps.js'
import { DEFAULT_PROFILE } from '../src/game/core/Persistence.js'

const noop = () => {}
const BOARD_BASE = {
  hp: 150, maxHp: 150, alive: true, respawn: 0, speed: 12.4, vel: [3, 0, 11], momentum: 1.42, topSpeed: 14.1,
  grounded: true, sliding: true, sprinting: true, crouching: false, slope: 1,
  chains: { done: {}, count: 2 }, chainFlash: 1, slot: 'primary', weapon: 'VEX-9', weaponId: 'vex9',
  ammo: 24, reserve: 150, reloading: false, ads: 0, reloadProgress: 0, spread: 1.2,
  utility: { n: 'FRAG', name: 'FRAG', uses: 2, id: 'frag' }, hitmarker: 0.2, headshot: false,
  damageFlash: 0.3, flashTime: 0, haste: false, slow: false, stats: { kills: 3, deaths: 1, damage: 640 },
  round: { phase: 'live', timer: 62, round: 6, scoreA: 3, scoreB: 2, roundTime: 12 },
  killfeed: [{ id: 'a', killer: 'YOU', victim: 'BOT-1', head: true, mine: true, weapon: 'VEX-9' }],
  hitDirs: [{ id: 'h1', ang: 1.2, t: 0.8 }], banners: [{ id: 'b1', text: 'DOUBLE KILL', kind: 'good', t: 1.2 }],
  spectating: 'VEXA-3', spawnGuard: 0.6, streak: 2, matchPoint: true, ping: 34, fps: 144,
  mode: '1v1', mapName: 'QYN YARD', enemies: 2, allies: 1, lastWin: true,
}

const screens = [
  ['App', UI.App, {}],
  ['Title', UI.Title, { onNav: noop, profile: DEFAULT_PROFILE }],
  ['Lobby', UI.Lobby, { profile: DEFAULT_PROFILE, onQueue: noop, onOnline: noop, onBack: noop }],
  ['Netplay', UI.Netplay, { profile: DEFAULT_PROFILE, onConnected: noop, onBack: noop }],
  ['Armory', UI.Armory, { profile: DEFAULT_PROFILE, save: noop, onBack: noop }],
  ['Skins', UI.Skins, { profile: DEFAULT_PROFILE, save: noop, onBack: noop }],
  ['Settings', UI.Settings, { profile: DEFAULT_PROFILE, save: noop, onBack: noop }],
  ['Result', UI.Result, {
    data: { won: true, winner: 'a', scoreA: 5, scoreB: 3, mine: true,
      stats: { kills: 12, deaths: 6, damage: 1840, headshots: 3, chains: 7 },
      qyns: 620, xp: 500, level: 4, levelUp: true, unlocks: ['nova'] },
    profile: DEFAULT_PROFILE, onAgain: noop, onLobby: noop,
  }],
  ['HUD-board', UI.HUD, {
    showMv: true, mapName: 'QYN YARD', mode: '1v1',
    hud: { ...BOARD_BASE, scoreboard: true, board: [1, 2, 3, 4].map((i) => ({ name: 'BOT-' + i, team: i % 2 ? 'b' : 'a', you: i === 1, kills: i, deaths: 5 - i, damage: i * 210, assists: i % 3, weapon: 'VEX-9', alive: i % 2 === 0, ping: 20 + i * 9 })) },
    paused: false, onResume: noop, onQuit: noop, profile: DEFAULT_PROFILE,
  }],
  ['HUD', UI.HUD, { showMv: true, mapName: 'QYN YARD', mode: '1v1',
    hud: {
      hp: 150, alive: true, respawn: 0, speed: 12.4, vel: [3, 0, 11], momentum: 1.42,
      grounded: true, sliding: true, sprinting: true, chains: ['SPRINT→SLIDE', 'SLIDE→JUMP'], chainFlash: 1,
      slot: 'primary', ammo: 24, mag: 30, reserve: 150, reloading: false, weaponName: 'VEX-9',
      utility: { name: 'FRAG', count: 2, cooldown: 0 },
      scoreA: 3, scoreB: 2, round: 6, phase: 'live', timer: 62,
      killfeed: [{ id: 'a', killer: 'YOU', victim: 'BOT-1', head: true, mine: true }],
      hitDirs: [{ id: 'h1', ang: 1.2, t: 0.8 }, { id: 'h2', ang: -2.4, t: 0.4 }],
      banners: [{ id: 'b1', text: 'DOUBLE KILL', kind: 'good', t: 1.2 }],
      spectating: 'VEXA-3', spawnGuard: 0.6, streak: 2, matchPoint: true,
      banner: 'ROUND 6', lastWin: true, hitmarker: 0.2, hitHead: false, damageFlash: 0.3,
      lowAmmo: false, fps: 144, spread: 1.2,
    },
    paused: false, onResume: noop, onQuit: noop, profile: DEFAULT_PROFILE,
  }],
  ['HUD-paused', UI.HUD, {
    hud: { hp: 0, alive: false, respawn: 2, speed: 0, vel: [0, 0, 0], momentum: 1, grounded: true, sliding: false, sprinting: false, chains: [], chainFlash: 0, slot: 'melee', ammo: 0, mag: 0, reserve: 0, reloading: false, weaponName: 'KNIFE', utility: null, scoreA: 0, scoreB: 0, round: 1, phase: 'countdown', timer: 2.4, killfeed: [], banner: 'GET READY', lastWin: false, hitmarker: 0, hitHead: false, damageFlash: 0, lowAmmo: true, fps: 60, spread: 0 },
    paused: true, onResume: noop, onQuit: noop, profile: DEFAULT_PROFILE,
  }],
  ['Loadout', UI.Loadout, { profile: DEFAULT_PROFILE, save: noop, onStart: noop, onBack: noop, mapId: 'yard', mode: MODES[0] }],
]

// ── economy data: every item must carry a real price ───────────────────────
let fails = 0
const check = (n, ok, info = '') => { console.log(`${ok ? ' PASS' : '*FAIL'}  ${n}  ${info}`); if (!ok) fails++ }
const badPrice = [...WEAPONS, ...SKINS].filter((it) => typeof it.qyn !== 'number' || !isFinite(it.qyn))
check('every weapon and skin has a numeric price', badPrice.length === 0, badPrice.map((i) => i.id).join(', ') || `${WEAPONS.length + SKINS.length} items priced`)
const src = (f) => fsSync.readFileSync(new URL('../src/ui/' + f, import.meta.url).pathname, 'utf8')
const typo = ['Armory.jsx', 'Loadout.jsx', 'Skins.jsx'].filter((f) => /\b[ws]\.qyns\b/.test(src(f)))
check('no shop screen reads a price field that does not exist', typo.length === 0,
  typo.join(', ') || 'prices come from item.qyn')

for (const [name, C, props] of screens) {
  try {
    const html = renderToString(React.createElement(C, props))
    const ok = html && html.length > 40
    console.log(`${ok ? ' PASS' : '*FAIL'}  ${name} renders (${html.length} bytes)`)
    if (!ok) fails++
  } catch (e) {
    console.log(`*FAIL  ${name} → ${e.message.split('\n')[0]}`)
    fails++
  }
}
console.log(`\n${WEAPONS.length} weapons / ${SLOTS.length} slots / ${SKINS.length} skins / ${MODES.length} modes / ${MAPS.length} maps`)
console.log(`${fails === 0 ? 'ALL UI TESTS PASSED' : fails + ' FAILURES'}`)
try { fsSync.unlinkSync(OUT) } catch {}
process.exit(fails ? 1 : 0)
