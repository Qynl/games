import React, { useState, useEffect, useRef } from 'react'
import { Net, NET_OK } from '../game/net/Net.js'
import { MAPS } from '../game/data/maps.js'

// Manual-signalling WebRTC: no server, you just swap two codes with a friend.
//   HOST  → CREATE ROOM  → send CODE A
//   GUEST → paste CODE A → send CODE B back
//   HOST  → paste CODE B → connected

export default function Netplay ({ profile, onConnected, onBack }) {
  const [role, setRole] = useState(null)          // null | host | guest
  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('')
  const [bad, setBad] = useState(false)
  const [mapId, setMapId] = useState('vertex')
  const [name, setName] = useState(profile.name || '')
  const netRef = useRef(null)
  // Once the lobby owns the connection this screen must NOT close it on unmount
  // — unmounting is exactly what happens when we hand it over.
  const handedOff = useRef(false)

  useEffect(() => () => {
    if (!handedOff.current) netRef.current?.close()
    netRef.current = null
  }, [])

  const say = (m, isBad) => { setStatus(m); setBad(!!isBad) }

  const makeNet = () => {
    if (!NET_OK) { say('WebRTC is not available in this browser. Try Chrome, Edge, Firefox or Safari.', true); return null }
    const n = new Net()
    n.onState = (s, err) => {
      if (s === 'open') {
        setStep(3)
        if (n.role === 'host') {
          say('CONNECTED — entering the lobby…')
          setTimeout(() => {
            handedOff.current = true; netRef.current = null
            onConnected(n, { role: 'host', mapId, name: name.trim() || 'HOST' })
          }, 400)
        } else {
          // the host owns the map choice: wait for it to arrive before loading
          say('CONNECTED — waiting for the host to pick the arena…')
          const iv = setInterval(() => {
            for (const m of n.receive()) {
              if (m[0] === 'y') {
                clearInterval.done = true
                clearInterval(iv)
                const mid = MAPS.some((mm) => mm.id === m[1]) ? m[1] : mapId
                setMapId(mid)
                say('Arena locked in: ' + (MAPS.find((mm) => mm.id === mid)?.name || mid))
                setTimeout(() => {
                  handedOff.current = true; netRef.current = null
                  onConnected(n, { role: 'guest', mapId: mid, name: name.trim() || 'GUEST' })
                }, 400)
              }
            }
          }, 120)
          // if the host never says which arena, load ours rather than hang
          setTimeout(() => {
            if (!clearInterval.done) {
              clearInterval(iv); clearInterval.done = true
              say('No arena word from the host — loading yours.', true)
              setTimeout(() => {
                handedOff.current = true; netRef.current = null
                onConnected(n, { role: 'guest', mapId, name: name.trim() || 'GUEST' })
              }, 500)
            }
          }, 15000)
        }
      } else if (s === 'error') say(err || 'Connection failed.', true)
      else if (s === 'closed') say('Connection closed.')
    }
    netRef.current = n
    return n
  }

  const create = async () => {
    const n = makeNet()
    if (!n) return
    say('Building your invite code…')
    try {
      const c = await n.host()
      setCode(c)
      setStep(1)
      say('Send this code to your friend, then paste theirs below.')
    } catch (e) { say(e.message || 'Could not create the room.', true) }
  }

  const join = async () => {
    if (!input.trim()) return say('Paste the host code first.', true)
    const n = makeNet()
    if (!n) return
    say('Reading the invite…')
    try {
      const c = await n.join(input.trim())
      setCode(c)
      setStep(2)
      say('Send this code back to the host. Waiting for them to accept…')
    } catch (e) { say(e.message || 'That code did not parse.', true) }
  }

  const accept = async () => {
    if (!input.trim() || !netRef.current) return say('Paste their answer code first.', true)
    say('Connecting…')
    try {
      await netRef.current.accept(input.trim())
    } catch (e) { say(e.message || 'That answer code did not parse.', true) }
  }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); say('Copied to clipboard.') } catch (e) { say('Select the text and copy it manually.') }
  }

  const box = (value, readOnly) => (
    <textarea className="codebox" readOnly={readOnly} value={value}
      onChange={(e) => setInput(e.target.value)} placeholder={readOnly ? '' : 'paste the code here…'}
      spellCheck={false} />
  )

  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>ONLINE DUEL</small></div>
        <div className="wallet"><button className="btn sm ghost" onClick={onBack}>◀ LOBBY</button></div>
      </div>
      <div className="content" style={{ maxWidth: 820 }}>
        <div className="h">PEER TO PEER — NO SERVER, NO ACCOUNT</div>
        <div className="hint" style={{ marginBottom: 18 }}>
          QynGun links you straight to the other player. One of you hosts, you swap two codes
          (Discord, chat, anything) and the duel runs browser to browser. Both players keep their
          own movement, and whoever shoots decides the hit — there is no server to argue with.
        </div>

        <div className="row" style={{ marginBottom: 16 }}>
          <input className="sel" style={{ maxWidth: 220 }} value={name} placeholder="YOUR NAME"
            onChange={(e) => setName(e.target.value.slice(0, 14))} />
          {role !== 'guest' && (
            <select className="sel" style={{ maxWidth: 240 }} value={mapId} onChange={(e) => setMapId(e.target.value)}>
              {MAPS.filter((m) => m.modes.includes('1v1')).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          {role === 'guest' && <div className="hint">The host picks the arena — you will drop in automatically.</div>}
        </div>

        {!role && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
            <div className="card" onClick={() => { setRole('host'); setStep(0); setInput('') }}>
              <div className="nm">HOST A DUEL</div>
              <div className="ds">You create the room, pick the map, and hand your friend one code. You own the round clock.</div>
              <div className="mt"><span>1 v 1</span><span style={{ color: 'var(--cy)' }}>CREATE ▶</span></div>
            </div>
            <div className="card" onClick={() => { setRole('guest'); setStep(0); setInput('') }}>
              <div className="nm">JOIN A DUEL</div>
              <div className="ds">Paste the code your friend sent you, then send the answer code back.</div>
              <div className="mt"><span>1 v 1</span><span style={{ color: 'var(--cy)' }}>JOIN ▶</span></div>
            </div>
          </div>
        )}

        {role === 'host' && (
          <div className="panel" style={{ padding: 18 }}>
            <div className="h" style={{ marginTop: 0 }}>HOST</div>
            {step === 0 && <button className="btn pri" onClick={create}>CREATE ROOM ▶</button>}
            {step >= 1 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>1 — SEND THIS CODE TO YOUR FRIEND</div>
                {box(code, true)}
                <button className="btn sm" style={{ marginBottom: 14 }} onClick={() => copy(code)}>COPY CODE</button>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>2 — PASTE THEIR ANSWER CODE</div>
                {box(input, false)}
                <button className="btn pri" onClick={accept}>CONNECT ▶</button>
              </>
            )}
          </div>
        )}

        {role === 'guest' && (
          <div className="panel" style={{ padding: 18 }}>
            <div className="h" style={{ marginTop: 0 }}>JOIN</div>
            {step === 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>PASTE THE HOST CODE</div>
                {box(input, false)}
                <button className="btn pri" onClick={join}>JOIN ▶</button>
              </>
            )}
            {step >= 2 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>SEND THIS CODE BACK TO THE HOST</div>
                {box(code, true)}
                <button className="btn sm" onClick={() => copy(code)}>COPY CODE</button>
                <div className="hint" style={{ marginTop: 10 }}>Waiting for the host to accept… you will drop into the lobby automatically.</div>
              </>
            )}
          </div>
        )}

        {status && <div className={`toast ${bad ? 'bad' : ''}`} style={{ position: 'static', marginTop: 16 }}>{status}</div>}

        {role && step < 3 && (
          <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={() => { setRole(null); setStep(0); setStatus(''); netRef.current?.close(); netRef.current = null }}>
            ◀ START OVER
          </button>
        )}
      </div>
    </div>
  )
}
