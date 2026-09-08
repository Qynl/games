import React, { useState, useEffect, useRef } from 'react'
import { Net, NET_OK } from '../game/net/Net.js'
import { PeerNet, normalizeRoom, randomRoom } from '../game/net/PeerNet.js'
import { MAPS } from '../game/data/maps.js'

// Two ways in, both peer to peer once the duel starts.
//
//   EASY CONNECT (PeerJS) — pick a room name, share it, done. A public
//   broker introduces the two browsers; after that the traffic is direct.
//
//   ROOM CODE (the original) — no server of any kind. You swap two codes by
//   hand (Discord, chat, anything) and the link is yours alone.

export default function Netplay ({ profile, onConnected, onBack, loadPeer }) {
  const [transport, setTransport] = useState(null)   // null | peer | code
  const [role, setRole] = useState(null)             // null | host | guest
  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [room, setRoom] = useState(() => randomRoom())
  const [status, setStatus] = useState('')
  const [bad, setBad] = useState(false)
  const [mapId, setMapId] = useState('vertex')
  const [name, setName] = useState(profile.name || '')
  const netRef = useRef(null)
  // Once the lobby owns the connection this screen must NOT close it on unmount
  // — unmounting is exactly what happens when we hand it over.
  const handedOff = useRef(false)

  // an invite link lands you straight in the right room
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('room')
      if (q) { setRoom(normalizeRoom(q)); setInput(normalizeRoom(q)); setTransport('peer'); setRole('guest') }
    } catch (e) { /* no address bar to read */ }
  }, [])

  useEffect(() => () => {
    if (!handedOff.current) netRef.current?.close()
    netRef.current = null
  }, [])

  const say = (m, isBad) => { setStatus(m); setBad(!!isBad) }

  const inviteLink = () => {
    try {
      const u = new URL(window.location.href)
      u.search = ''
      u.hash = ''
      u.searchParams.set('room', room)
      return u.toString()
    } catch (e) { return room }
  }

  // ── the moment both channels are up, the lobby takes over ────────────────
  const handoff = (n, cfg) => {
    handedOff.current = true
    netRef.current = null
    onConnected(n, { ...cfg, transport })
  }

  const makeNet = () => {
    if (!NET_OK) { say('WebRTC is not available in this browser. Try Chrome, Edge, Firefox or Safari.', true); return null }
    const n = transport === 'peer' ? new PeerNet({ loadPeer, broker: profile.settings || {} }) : new Net()
    n.onState = (s, err) => {
      if (s === 'open') {
        setStep(3)
        if (n.role === 'host') {
          say('CONNECTED — entering the lobby…')
          setTimeout(() => handoff(n, { role: 'host', mapId, name: name.trim() || 'HOST' }), 400)
        } else {
          // the host owns the map choice: wait for it to arrive before loading
          say('CONNECTED — waiting for the host to pick the arena…')
          const ticket = { done: false }
          const iv = setInterval(() => {
            for (const m of n.receive()) {
              if (m[0] === 'y') {
                ticket.done = true
                clearInterval(iv)
                const mid = MAPS.some((mm) => mm.id === m[1]) ? m[1] : mapId
                setMapId(mid)
                say('Arena locked in: ' + (MAPS.find((mm) => mm.id === mid)?.name || mid))
                setTimeout(() => handoff(n, { role: 'guest', mapId: mid, name: name.trim() || 'GUEST' }), 400)
              }
            }
          }, 120)
          // if the host never says which arena, load ours rather than hang
          setTimeout(() => {
            if (!ticket.done) {
              ticket.done = true
              clearInterval(iv)
              say('No arena word from the host — loading yours.', true)
              setTimeout(() => handoff(n, { role: 'guest', mapId, name: name.trim() || 'GUEST' }), 500)
            }
          }, 15000)
        }
      } else if (s === 'error') say(err || 'Connection failed.', true)
      else if (s === 'closed') say('Connection closed.')
    }
    netRef.current = n
    return n
  }

  // ── EASY CONNECT ─────────────────────────────────────────────────────────
  const openRoom = async () => {
    const n = makeNet()
    if (!n) return
    say('Opening the room…')
    try {
      const r = await n.host(room)
      setRoom(r)
      setStep(1)
      say(`Room ${r} is open. Share the name — or the link — and wait for your friend.`)
    } catch (e) { say(e.message || 'Could not open the room.', true) }
  }

  const enterRoom = async () => {
    const n = makeNet()
    if (!n) return
    say('Looking for the room…')
    try {
      const r = await n.join(input)
      setRoom(r)
      setStep(2)
      say('Linked to the broker — punching through to your friend…')
    } catch (e) { say(e.message || 'Could not join that room.', true) }
  }

  // ── ROOM CODE ────────────────────────────────────────────────────────────
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

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); say(what + ' copied to clipboard.') }
    catch (e) { say('Select the text and copy it manually.') }
  }

  const box = (value, readOnly) => (
    <textarea className="codebox" readOnly={readOnly} value={value}
      onChange={(e) => setInput(e.target.value)} placeholder={readOnly ? '' : 'paste the code here…'}
      spellCheck={false} />
  )

  const reset = () => {
    setRole(null); setStep(0); setStatus('')
    netRef.current?.close(); netRef.current = null
  }

  const startOver = () => { setTransport(null); reset() }

  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo">QynGun<small>ONLINE DUEL</small></div>
        <div className="wallet"><button className="btn sm ghost" onClick={onBack}>◀ LOBBY</button></div>
      </div>
      <div className="content" style={{ maxWidth: 820 }}>
        <div className="h">PEER TO PEER — NO ACCOUNT, NO GAME SERVER</div>
        <div className="hint" style={{ marginBottom: 18 }}>
          QynGun links you straight to the other player. Both players keep their own movement, and
          whoever shoots decides the hit — there is no server to argue with. Pick how you want to
          find each other:
        </div>

        {/* ── transport picker ─────────────────────────────────────────── */}
        {!transport && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginBottom: 18 }}>
            <div className="card on" onClick={() => { setTransport('peer'); reset() }}>
              <div className="nm" style={{ color: 'var(--cy)' }}>EASY CONNECT</div>
              <div className="ds">
                Pick a room name, send it to your friend, done. A public broker introduces the two
                browsers; once you have met, the duel runs directly between you.
              </div>
              <div className="mt"><span>PEERJS</span><span style={{ color: 'var(--cy)' }}>CHOOSE ▶</span></div>
            </div>
            <div className="card" onClick={() => { setTransport('code'); reset() }}>
              <div className="nm">ROOM CODE</div>
              <div className="ds">
                Nothing but the two of you. You swap two long codes by hand (Discord, chat,
                anything) and no third party is involved at any point.
              </div>
              <div className="mt"><span>MANUAL</span><span style={{ color: 'var(--cy)' }}>CHOOSE ▶</span></div>
            </div>
          </div>
        )}

        {transport && (
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="chip">
              <b>{transport === 'peer' ? 'EASY CONNECT' : 'ROOM CODE'}</b>
            </div>
            <button className="btn sm ghost" onClick={startOver}>◀ SWITCH METHOD</button>
          </div>
        )}

        {transport && (
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
        )}

        {/* ── EASY CONNECT ─────────────────────────────────────────────── */}
        {transport === 'peer' && !role && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
            <div className="card" onClick={() => { setRole('host'); setStep(0); setInput('') }}>
              <div className="nm">OPEN A ROOM</div>
              <div className="ds">You claim the room name, pick the map, and own the round clock.</div>
              <div className="mt"><span>1 v 1</span><span style={{ color: 'var(--cy)' }}>HOST ▶</span></div>
            </div>
            <div className="card" onClick={() => { setRole('guest'); setStep(0) }}>
              <div className="nm">JOIN A ROOM</div>
              <div className="ds">Type the room name your friend sent you — or open their invite link.</div>
              <div className="mt"><span>1 v 1</span><span style={{ color: 'var(--cy)' }}>JOIN ▶</span></div>
            </div>
          </div>
        )}

        {transport === 'peer' && role === 'host' && (
          <div className="panel" style={{ padding: 18 }}>
            <div className="h" style={{ marginTop: 0 }}>HOST — ROOM NAME</div>
            <div className="row" style={{ marginBottom: 12 }}>
              <input className="sel" style={{ maxWidth: 220, letterSpacing: '.2em', fontSize: 18 }}
                value={room} disabled={step >= 1} placeholder="ROOM NAME"
                onChange={(e) => setRoom(normalizeRoom(e.target.value))} />
              {step === 0 && <button className="btn sm ghost" onClick={() => setRoom(randomRoom())}>⟳ NEW NAME</button>}
            </div>
            {step === 0 && <button className="btn pri" onClick={openRoom}>OPEN ROOM ▶</button>}
            {step >= 1 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>1 — SEND THIS NAME TO YOUR FRIEND</div>
                <div className="roombox">{room}</div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <button className="btn sm" onClick={() => copy(room, 'Room name')}>COPY NAME</button>
                  <button className="btn sm" onClick={() => copy(inviteLink(), 'Invite link')}>COPY INVITE LINK</button>
                </div>
                <div className="hint">Waiting for your friend to join — you will drop into the lobby automatically.</div>
              </>
            )}
          </div>
        )}

        {transport === 'peer' && role === 'guest' && (
          <div className="panel" style={{ padding: 18 }}>
            <div className="h" style={{ marginTop: 0 }}>JOIN — ROOM NAME</div>
            <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>TYPE THE ROOM NAME</div>
            <input className="sel" style={{ maxWidth: 220, letterSpacing: '.2em', fontSize: 18, marginBottom: 12 }}
              value={input} disabled={step >= 2} placeholder="ROOM NAME"
              onChange={(e) => setInput(normalizeRoom(e.target.value))} />
            {step === 0 && <button className="btn pri" onClick={enterRoom}>JOIN ▶</button>}
            {step >= 2 && <div className="hint">Linked to the broker — punching through to your friend…</div>}
          </div>
        )}

        {/* ── ROOM CODE (unchanged) ─────────────────────────────────────── */}
        {transport === 'code' && !role && (
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

        {transport === 'code' && role === 'host' && (
          <div className="panel" style={{ padding: 18 }}>
            <div className="h" style={{ marginTop: 0 }}>HOST</div>
            {step === 0 && <button className="btn pri" onClick={create}>CREATE ROOM ▶</button>}
            {step >= 1 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>1 — SEND THIS CODE TO YOUR FRIEND</div>
                {box(code, true)}
                <button className="btn sm" style={{ marginBottom: 14 }} onClick={() => copy(code, 'Invite code')}>COPY CODE</button>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--dim)' }}>2 — PASTE THEIR ANSWER CODE</div>
                {box(input, false)}
                <button className="btn pri" onClick={accept}>CONNECT ▶</button>
              </>
            )}
          </div>
        )}

        {transport === 'code' && role === 'guest' && (
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
                <button className="btn sm" onClick={() => copy(code, 'Answer code')}>COPY CODE</button>
                <div className="hint" style={{ marginTop: 10 }}>Waiting for the host to accept… you will drop into the lobby automatically.</div>
              </>
            )}
          </div>
        )}

        {status && <div className={`toast ${bad ? 'bad' : ''}`} style={{ position: 'static', marginTop: 16 }}>{status}</div>}

        {role && step < 3 && (
          <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={reset}>◀ START OVER</button>
        )}
      </div>
    </div>
  )
}
