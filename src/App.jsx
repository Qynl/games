import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Game } from './game/core/Game.js'
import { loadProfile, saveProfile, rewardMatch } from './game/core/Persistence.js'
import { MODES } from './game/data/maps.js'
import Title from './ui/Title.jsx'
import Lobby from './ui/Lobby.jsx'
import Loadout from './ui/Loadout.jsx'
import Armory from './ui/Armory.jsx'
import Skins from './ui/Skins.jsx'
import Settings from './ui/Settings.jsx'
import Result from './ui/Result.jsx'
import HUD from './ui/HUD.jsx'

export default function App () {
  const [profile, setProfile] = useState(() => loadProfile())
  const [screen, setScreen] = useState('title')
  const [queue, setQueue] = useState(null)      // { modeId, mapId, bots }
  const [matchCfg, setMatchCfg] = useState(null) // active match config
  const [hud, setHud] = useState(null)
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState(null)
  const [toastMsg, setToast] = useState(null)
  const [rangePicker, setRangePicker] = useState(false)
  const [damageNums, setDamageNums] = useState([])
  const canvasRef = useRef(null)
  const gameRef = useRef(null)

  const save = useCallback((p) => {
    setProfile(p)
    saveProfile(p)
  }, [])

  const toast = useCallback((msg, bad) => {
    setToast({ msg, bad })
    setTimeout(() => setToast(null), 2000)
  }, [])

  // ── create / destroy the game ────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing' || !canvasRef.current || !matchCfg) return
    const g = new Game(canvasRef.current, {
      settings: profile.settings,
      onHud: setHud,
      onEvent: (type, data) => {
        if (type === 'matchend') finishMatch(g, data)
        else if (type === 'damage') {
          const id = Math.random().toString(36).slice(2)
          setDamageNums((d) => [...d.slice(-6), { id, ...data }])
          setTimeout(() => setDamageNums((d) => d.filter((x) => x.id !== id)), 900)
        } else if (type === 'roundend') {
          g.lastRoundWin = data.winner === 'a' ? 'ROUND WON' : data.winner === 'b' ? 'ROUND LOST' : 'DRAW'
        }
      },
    })
    g.load({
      mapId: matchCfg.mapId,
      modeId: matchCfg.modeId,
      loadout: matchCfg.loadout || profile.loadout,
      skin: profile.skin,
      botLevel: matchCfg.bots || profile.settings.botLevel,
    })
    g.audio.resume()
    g.start()
    g.setPaused(true)
    gameRef.current = g
    window.__qyn = g   // debug hook
    g.input.onLockChange((locked) => {
      setPaused(!locked)
      g.setPaused(!locked)
    })
    return () => {
      g.dispose()
      gameRef.current = null
      setHud(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, matchCfg])

  // keep live settings in sync
  useEffect(() => {
    const g = gameRef.current
    if (!g) return
    g.settings = profile.settings
    g.input.sensitivity = profile.settings.sensitivity
    g.rig.baseFov = profile.settings.fov
    g.audio.setVolume(profile.settings.volume)
    g.audio.enabled = profile.settings.sound !== false
  }, [profile.settings])

  const finishMatch = (g, data) => {
    const p = structuredClone(profile)
    const st = data.stats || {}
    const reward = rewardMatch(p, {
      won: data.winner === 'a',
      scoreA: data.scoreA, scoreB: data.scoreB,
      kills: st.kills || 0, deaths: st.deaths || 0,
      damage: st.damage || 0, headshots: st.headshots || 0,
      topSpeed: st.topSpeed || 0,
      chains: Object.keys(st.chains || {}).length,
    })
    // remember completed chains for the profile
    const chains = g.player?.mv?.tracker?.done || {}
    p.stats.chains = { ...(p.stats.chains || {}), ...chains }
    save(p)
    setResult({ ...data, ...reward })
    g.setPaused(true)
    g.input.exitLock()
    setScreen('result')
  }

  const startMatch = (loadout) => {
    setMatchCfg({ ...queue, loadout, key: Math.random() })
    setScreen('playing')
  }

  const quitMatch = () => {
    setMatchCfg(null)
    setScreen('lobby')
  }

  const applyRangeLoadout = (l) => {
    const g = gameRef.current
    const p = { ...profile, loadout: l }
    save(p)
    if (g) g.applyLoadout(l)
    setRangePicker(false)
    g?.input.requestLock()
  }

  // range: B reopens the loadout picker
  useEffect(() => {
    const onKey = (e) => {
      if (screen !== 'playing' || !gameRef.current) return
      if (e.code === 'KeyB' && gameRef.current.mode?.id === 'range') {
        setRangePicker((v) => !v)
        if (!rangePicker) gameRef.current.input.exitLock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, rangePicker])

  const isRange = matchCfg?.modeId === 'range'

  return (
    <div className="app">
      {screen === 'title' && (
        <Title profile={profile}
          onPlay={() => setScreen('lobby')}
          onArmory={() => setScreen('armory')}
          onSkins={() => setScreen('skins')}
          onSettings={() => setScreen('settings')} />
      )}

      {screen === 'lobby' && (
        <Lobby profile={profile}
          onQueue={(q) => { setQueue(q); setScreen('loadout') }}
          onBack={() => setScreen('title')} />
      )}

      {screen === 'loadout' && queue && (
        <Loadout profile={profile} save={save} mapId={queue.mapId}
          mode={MODES.find((m) => m.id === queue.modeId)}
          onStart={startMatch} onBack={() => setScreen('lobby')} />
      )}

      {screen === 'armory' && (
        <Armory profile={profile} save={save} toast={toast} onBack={() => setScreen('title')} />
      )}
      {screen === 'skins' && (
        <Skins profile={profile} save={save} toast={toast} onBack={() => setScreen('title')} />
      )}
      {screen === 'settings' && (
        <Settings profile={profile} save={save} onBack={() => setScreen('title')} />
      )}

      {screen === 'result' && result && (
        <Result data={result} profile={profile}
          onAgain={() => { setResult(null); setScreen('loadout') }}
          onLobby={() => { setResult(null); setScreen('lobby') }} />
      )}

      {screen === 'playing' && (
        <div className="gwrap">
          <canvas ref={canvasRef} onClick={() => gameRef.current?.input.requestLock()} />
          {hud && (
            <HUD hud={hud} paused={paused}
              showMv={profile.settings.showMovement}
              mapName={hud.mapName} mode={matchCfg?.modeId}
              onResume={() => gameRef.current?.input.requestLock()}
              onQuit={quitMatch} />
          )}
          {/* floating damage numbers */}
          <div style={{ position: 'absolute', left: '50%', top: '58%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            {damageNums.map((d) => (
              <div key={d.id} style={{
                fontFamily: 'var(--mono)', fontSize: d.head ? 22 : 16, fontWeight: 800,
                color: d.head ? 'var(--gd)' : '#fff', textShadow: '0 2px 6px #000',
                animation: 'fadeUp .9s ease-out forwards',
              }}>{Math.round(d.amount)}{d.head ? ' ⌖' : ''}</div>
            ))}
          </div>
          {isRange && !rangePicker && (
            <div className="panel" style={{ position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', fontSize: 11, letterSpacing: '.12em', pointerEvents: 'none' }}>
              RANGE — <b style={{ color: 'var(--cy)' }}>[B]</b> CHANGE LOADOUT · EVERY WEAPON UNLOCKED · DUMMIES RESPAWN
            </div>
          )}
          {!hud && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--dim)', letterSpacing: '.3em', fontSize: 12 }}>
              LOADING ARENA…
            </div>
          )}
        </div>
      )}

      {rangePicker && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <Loadout profile={{ ...profile, unlocked: ['vex9','krill','halberd','tremor','longspur','blackwing','shatter','wraith','prismc','quasar','q1','vesper','moskito','hornet','cutlass','needle','judge','flare','prismp','twinfang','knife','fists','bat','machete','tonfa','katana','axe','spear','sledge','qynblade','frag','flash','smoke','emp','stim','dash','grapnel','barrier','mine','decoy'] }}
            save={save} mapId="range"
            mode={MODES.find((m) => m.id === 'range')}
            onStart={applyRangeLoadout} onBack={() => { setRangePicker(false); gameRef.current?.input.requestLock() }} />
        </div>
      )}

      {toastMsg && <div className={`toast ${toastMsg.bad ? 'bad' : ''}`}>{toastMsg.msg}</div>}
    </div>
  )
}
