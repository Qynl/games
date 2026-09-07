// WorldObjects — imperative renderer for world objects, NPCs and vehicles.
// React only creates geometry when the world revision changes; every frame
// we mutate the cached three.js transforms straight from the engine state.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameSession } from '../game/Session'
import type { NpcConfig, VehicleConfig, WorldObjectState } from '../types'
import { lerp } from '../utils/helpers'

interface Entry {
  root: THREE.Group
  mats: THREE.MeshStandardMaterial[]
  kind: string
  shape: string
  baseY: number
  spin: boolean
  bob: boolean
  flicker: boolean
}

type MatOpts = {
  emissive?: string
  ei?: number
  opacity?: number
  rough?: number
  metal?: number
}

function hex(c?: string, fallback = '#888888'): string {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback
}

function mat(color: string, opts: { emissive?: string; ei?: number; opacity?: number; rough?: number; metal?: number } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: hex(color),
    roughness: opts.rough ?? 0.85,
    metalness: opts.metal ?? 0.05,
    emissive: hex(opts.emissive ?? '#000000'),
    emissiveIntensity: opts.ei ?? 0,
  })
  if (opts.opacity !== undefined && opts.opacity < 1) {
    m.transparent = true
    m.opacity = opts.opacity
  }
  return m
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  cast = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.set(...pos)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function dims(o: WorldObjectState): { sx: number; sy: number; sz: number } {
  const s = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]
  return { sx: s[0], sy: s[1], sz: s[2] }
}

function entryFor(o: WorldObjectState): Entry {
  return {
    root: new THREE.Group(), mats: [], kind: o.kind ?? '', shape: o.shape,
    baseY: o.pos[1],
    spin: o.shape === 'gem' || o.kind === 'gem' || o.kind === 'ember' || o.kind === 'arrow',
    bob: o.shape === 'gem' || o.kind === 'gem' || o.kind === 'ember' || o.kind === 'lamp' || o.kind === 'boots',
    flicker: o.kind === 'lava' || o.kind === 'ember' || o.kind === 'fire',
  }
}

function buildObject(o: WorldObjectState): Entry | null {
  const e = entryFor(o)
  const root = e.root
  const mats = e.mats
  const { sx, sy, sz } = dims(o)
  const col = o.color ?? '#7fa1c4'
  const em = o.emissive && o.emissiveIntensity ? o.emissive : '#000000'
  const ei = o.emissiveIntensity ?? 0
  const kind = o.kind ?? ''

  const M = (color: string, extra: MatOpts = {}) => {
    const m = mat(color, { ...extra, emissive: extra.emissive ?? em, ei: extra.ei ?? (extra.emissive ? ei : 0), opacity: o.opacity !== undefined ? o.opacity : extra.opacity })
    mats.push(m)
    return m
  }

  if (kind === 'cp' || kind === 'pole' || kind === 'post') {
    const h = Math.max(sy, 0.3)
    const body = M(col, { rough: 0.6, emissive: em, ei })
    addMesh(root, new THREE.CylinderGeometry(sx * 0.32, sx * 0.4, h, 10), body, [0, h / 2, 0])
    const cap = M('#ffffff', { emissive: em !== '#000000' ? em : col, ei: Math.max(ei, 1.1) })
    addMesh(root, new THREE.SphereGeometry(Math.max(sx * 0.46, 0.2), 12, 10), cap, [0, h + sx * 0.5, 0])
    return e
  }
  if (kind === 'tree') {
    const trunk = M('#7a5230', { rough: 1 })
    const th = Math.max(sy * 0.36, 0.5)
    addMesh(root, new THREE.CylinderGeometry(0.18, 0.26, th, 7), trunk, [0, th / 2, 0])
    const leaf = M(col, { rough: 1 })
    const r = Math.max(sx, 0.7)
    for (let i = 0; i < 3; i++) {
      addMesh(root, new THREE.ConeGeometry(r * (0.85 - i * 0.18), r * (1.7 - i * 0.3), 9), leaf, [0, th + r * (0.4 + i * 0.62), 0])
    }
    return e
  }
  if (kind === 'bush') {
    const m = M(col, { rough: 1 })
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      addMesh(root, new THREE.SphereGeometry(sx * 0.34, 10, 9), m, [Math.cos(a) * sx * 0.32, sx * 0.3 + (i % 2) * 0.12, Math.sin(a) * sx * 0.32])
    }
    return e
  }
  if (kind === 'rock') {
    const m = M(col, { rough: 1 })
    addMesh(root, new THREE.DodecahedronGeometry(Math.max(sx * 0.6, 0.3), 0), m, [0, sy * 0.4, 0])
    return e
  }
  if (kind === 'flower' || kind === 'grass') {
    const stem = M('#4c9e4c', { rough: 1 })
    addMesh(root, new THREE.CylinderGeometry(0.045, 0.05, sy, 5), stem, [0, sy / 2, 0])
    if (kind === 'flower') {
      const head = M(col, { rough: 0.9 })
      addMesh(root, new THREE.SphereGeometry(sx * 0.45, 8, 7), head, [0, sy + sx * 0.3, 0])
    }
    return e
  }
  if (kind === 'grave') {
    const m = M(col, { rough: 0.7 })
    addMesh(root, new THREE.BoxGeometry(sx, sy, sz), m)
    const top = M('#c9d2e0', { rough: 0.7 })
    const dome = new THREE.SphereGeometry(Math.max(sx * 0.5, 0.2), 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    addMesh(root, dome, top, [0, sy / 2 - 0.08, 0])
    return e
  }
  if (kind === 'chest') {
    const wood = M(col, { rough: 0.7 })
    addMesh(root, new THREE.BoxGeometry(sx, sy, sz), wood)
    const lid = M(col, { rough: 0.7 })
    addMesh(root, new THREE.BoxGeometry(sx * 1.06, Math.max(sy * 0.3, 0.2), sz * 1.06), lid, [0, sy / 2 + Math.max(sy * 0.14, 0.1), 0])
    const gold = M('#ffd23f', { emissive: '#ffd23f', ei: 1.4 })
    addMesh(root, new THREE.BoxGeometry(Math.min(sx * 0.2, 0.4), Math.max(sy * 0.3, 0.2), 0.2), gold, [0, sy * 0.05, sz * 0.55])
    return e
  }
  if (kind === 'pin') {
    const m = M(col, { rough: 0.35 })
    addMesh(root, new THREE.SphereGeometry(0.26, 12, 10), m, [0, 0.62, 0])
    addMesh(root, new THREE.CylinderGeometry(0.3, 0.42, 0.9, 12), m, [0, 0.18, 0])
    addMesh(root, new THREE.CylinderGeometry(0.46, 0.5, 0.18, 12), m, [0, -0.06, 0])
    const stripe = M('#d23b57', { rough: 0.35 })
    addMesh(root, new THREE.CylinderGeometry(0.305, 0.305, 0.08, 12), stripe, [0, 0.5, 0])
    return e
  }
  if (kind === 'sign') {
    const m = M(col, { rough: 0.6 })
    addMesh(root, new THREE.BoxGeometry(sx, sy * 0.74, sz), m, [0, sy * 0.13, 0])
    const post = M('#4a4a52', { rough: 0.8 })
    addMesh(root, new THREE.CylinderGeometry(0.09, 0.13, sy * 0.3, 8), post, [0, -sy * 0.34, 0])
    return e
  }
  if (kind === 'lava') {
    const m = M(col, { emissive: '#ff5a1e', ei: 1.1, rough: 1 })
    addMesh(root, new THREE.BoxGeometry(sx, sy, sz), m)
    const glow = M('#ff7a2a', { emissive: '#ff7a2a', ei: 2.2, opacity: 0.35 })
    const g = addMesh(root, new THREE.BoxGeometry(sx * 0.8, Math.max(sy * 2, 0.2), sz * 0.8), glow)
    g.renderOrder = 2
    return e
  }
  if (kind === 'tile' || kind === 'road' || kind === 'baseplate' || kind === 'spawnpad') {
    const m = M(col, { rough: kind === 'road' ? 0.95 : 0.9 })
    addMesh(root, new THREE.BoxGeometry(sx, sy, sz), m)
    if (kind === 'spawnpad') {
      const ring = M('#59b7ff', { emissive: '#59b7ff', ei: 1, opacity: 0.6 })
      const tor = new THREE.TorusGeometry(Math.max(sx * 0.62, 1.4), 0.07, 8, 30)
      tor.rotateX(Math.PI / 2)
      addMesh(root, tor, ring)
    }
    return e
  }
  if (o.shape === 'gem' || kind === 'gem') {
    const m = M(col, { emissive: em !== '#000000' ? em : col, ei: ei || 1.6, rough: 0.12, metal: 0.5 })
    addMesh(root, new THREE.OctahedronGeometry(0.55, 0), m)
    return e
  }
  if (o.shape === 'torus') {
    const m = M(col, { emissive: em !== '#000000' ? em : col, ei: ei || 1.2, rough: 0.3, metal: 0.5 })
    const tor = addMesh(root, new THREE.TorusGeometry(1, 0.14, 10, 40), m)
    const s = Math.max(sx, sz)
    tor.scale.set(s, s, s)
    e.spin = false
    return e
  }
  if (o.shape === 'cone') {
    const m = M(col, { rough: 0.85 })
    const r = Math.max(0.15, (sx + sz) / 4)
    const cone = addMesh(root, new THREE.ConeGeometry(r, sy, 18), m)
    cone.scale.z = sz / sx
    return e
  }
  if (o.shape === 'sphere') {
    const m = M(col, { rough: o.vehicle ? 0.4 : 0.5, metal: o.vehicle ? 0.4 : 0.05 })
    addMesh(root, new THREE.SphereGeometry(Math.max(sx, sz) / 2, 22, 16), m)
    if (o.vehicle?.kind === 'hover') {
      const ring = M('#9fd7ff', { emissive: '#9fd7ff', ei: 0.9, opacity: 0.65 })
      addMesh(root, new THREE.TorusGeometry(Math.max(sx, sz) * 0.66, 0.05, 8, 28), ring, [0, -Math.max(sx, sz) / 2 - 0.1, 0])
    }
    return e
  }
  if (o.shape === 'cylinder' || o.shape === 'dumbbell' || o.shape === 'capsule') {
    const m = M(col, { rough: 0.7 })
    addMesh(root, new THREE.CylinderGeometry(Math.max(sx / 2, 0.06), Math.max(sx / 2, 0.06), sy, 14), m)
    return e
  }
  // box fallback
  const m = M(col)
  addMesh(root, new THREE.BoxGeometry(sx, sy, sz), m)
  return e
}

function buildNpc(o: WorldObjectState): Entry | null {
  const cfg = o.npc
  if (!cfg) return null
  const e = entryFor(o)
  const root = e.root
  const mats = e.mats
  const col = o.color ?? cfg.color ?? '#ffb1c8'
  const sc = cfg.scale ?? 1

  const M = (color: string, extra: MatOpts = {}) => {
    const m = mat(color, extra)
    mats.push(m)
    return m
  }

  if (cfg.kind === 'cow') {
    const body = M(col, { rough: 0.9 })
    addMesh(root, new THREE.BoxGeometry(1.2 * sc, 0.8 * sc, 0.62 * sc), body, [0, 0.74 * sc, 0])
    const head = M(col, { rough: 0.9 })
    addMesh(root, new THREE.BoxGeometry(0.52 * sc, 0.46 * sc, 0.5 * sc), head, [0.72 * sc, 1.0 * sc, 0])
    const patch = M(col === '#f4efe6' ? '#3b342c' : '#f4efe6', { rough: 0.9 })
    addMesh(root, new THREE.BoxGeometry(0.3 * sc, 0.3 * sc, 0.32 * sc), patch, [-0.16 * sc, 0.84 * sc, 0.32 * sc])
    const legs = M('#d8cfc0', { rough: 0.9 })
    for (const lx of [-0.45, 0.45]) {
      for (const lz of [-0.2, 0.2]) {
        addMesh(root, new THREE.CylinderGeometry(0.09 * sc, 0.11 * sc, 0.44 * sc, 7), legs, [lx * sc, 0.22 * sc, lz * sc])
      }
    }
    const snout = M('#e8c4b0', { rough: 0.9 })
    addMesh(root, new THREE.BoxGeometry(0.18 * sc, 0.13 * sc, 0.13 * sc), snout, [1.0 * sc, 0.94 * sc, 0])
    const horn = M('#e8dcc0', { rough: 0.8 })
    addMesh(root, new THREE.ConeGeometry(0.06 * sc, 0.17 * sc, 6), horn, [0.52 * sc, 1.26 * sc, 0.17 * sc])
    addMesh(root, new THREE.ConeGeometry(0.06 * sc, 0.17 * sc, 6), horn, [0.52 * sc, 1.26 * sc, -0.17 * sc])
    return e
  }

  if (cfg.kind === 'firefly') {
    // a tiny glowing dot with soft translucent wings
    const body = M(col, { rough: 0.35, metal: 0.2, emissive: col, ei: 1.8 })
    addMesh(root, new THREE.SphereGeometry(0.2 * sc, 10, 8), body, [0, 0, 0])
    const core = M('#fff6d8', { emissive: '#fff6d8', ei: 2.4 })
    addMesh(root, new THREE.SphereGeometry(0.09 * sc, 8, 6), core, [0, 0.02 * sc, 0])
    const wing = M('#ffffff', { opacity: 0.28, rough: 0.9 })
    addMesh(root, new THREE.SphereGeometry(0.16 * sc, 8, 6), wing, [0.2 * sc, 0.02 * sc, 0])
    addMesh(root, new THREE.SphereGeometry(0.16 * sc, 8, 6), wing, [-0.2 * sc, 0.02 * sc, 0])
    return e
  }

  if (cfg.kind === 'mole') {
    // chubby mole peeking out of its burrow; the engine raises/lowers the
    // body and hides it while burrowed (blue-ring eyes show it's targetable)
    const fur = M(col, { rough: 0.95 })
    const body = new THREE.SphereGeometry(0.5 * sc, 18, 14)
    body.scale(1, 0.8, 1)
    addMesh(root, body, fur, [0, 0.18 * sc, 0])
    const belly = M('#caa97e', { rough: 0.9 })
    const bel = new THREE.SphereGeometry(0.3 * sc, 12, 10)
    bel.scale(1, 0.7, 0.62)
    addMesh(root, bel, belly, [0, 0.1 * sc, 0.18 * sc])
    const snoot = M('#e8b8a0', { rough: 0.8 })
    const sn = new THREE.SphereGeometry(0.15 * sc, 10, 8)
    sn.scale(1, 0.72, 1.5)
    addMesh(root, sn, snoot, [0, 0.16 * sc, 0.4 * sc])
    const eye = M('#1b1226', { rough: 0.25 })
    addMesh(root, new THREE.SphereGeometry(0.075 * sc, 8, 8), eye, [-0.17 * sc, 0.4 * sc, 0.36 * sc])
    addMesh(root, new THREE.SphereGeometry(0.075 * sc, 8, 8), eye, [0.17 * sc, 0.4 * sc, 0.36 * sc])
    const ring = M('#6fe0ff', { emissive: '#6fe0ff', ei: 2.2 })
    addMesh(root, new THREE.SphereGeometry(0.035 * sc, 6, 6), ring, [-0.17 * sc, 0.42 * sc, 0.43 * sc])
    addMesh(root, new THREE.SphereGeometry(0.035 * sc, 6, 6), ring, [0.17 * sc, 0.42 * sc, 0.43 * sc])
    const paw = M('#6b4226', { rough: 0.9 })
    const pawGeo = new THREE.SphereGeometry(0.11 * sc, 8, 6)
    pawGeo.scale(0.9, 0.5, 1.1)
    addMesh(root, pawGeo, paw, [-0.22 * sc, -0.05 * sc, 0.24 * sc])
    addMesh(root, pawGeo, paw, [0.22 * sc, -0.05 * sc, 0.24 * sc])
    return e
  }

  const isKid = cfg.kind === 'kid'
  const isGhost = cfg.kind === 'ghost'
  const isGuard = cfg.kind === 'guard'
  const h = (isKid ? 0.72 : 1) * sc
  const body = M(col, { rough: 0.8, opacity: isGhost ? 0.55 : undefined })
  addMesh(root, new THREE.CapsuleGeometry(0.32 * h, 0.7 * h, 6, 14), body, [0, 0.82 * h, 0])
  const headR = (isKid ? 0.33 : 0.4) * h
  if (isGuard) {
    const visor = M('#141a2c', { rough: 0.2, metal: 0.5 })
    addMesh(root, new THREE.BoxGeometry(0.52 * h, 0.09 * h, 0.1 * h), visor, [0, 1.52 * h, headR * 0.92])
    const helmet = M('#2a3248', { rough: 0.6 })
    addMesh(root, new THREE.SphereGeometry(headR * 1.06, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), helmet, [0, 1.62 * h, 0])
  } else {
    const face = M('#ffe0d0', { rough: 0.8, opacity: isGhost ? 0.7 : undefined })
    addMesh(root, new THREE.SphereGeometry(headR, 18, 16), face, [0, (isKid ? 1.5 : 1.68) * h, 0])
    const eye = M('#141a2c', { rough: 0.2 })
    addMesh(root, new THREE.SphereGeometry(headR * 0.15, 8, 8), eye, [-headR * 0.4, (isKid ? 1.53 : 1.72) * h, headR * 0.86])
    addMesh(root, new THREE.SphereGeometry(headR * 0.15, 8, 8), eye, [headR * 0.4, (isKid ? 1.53 : 1.72) * h, headR * 0.86])
    if (isKid) {
      const cap = M('#ff8a3f', { rough: 0.8 })
      addMesh(root, new THREE.SphereGeometry(headR * 1.06, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), cap, [0, 1.82 * h, 0])
    }
  }
  if (isGhost) {
    const trail = M(col, { rough: 0.8, opacity: 0.22 })
    addMesh(root, new THREE.ConeGeometry(0.52 * h, 0.7 * h, 10), trail, [0, 0.32 * h, 0])
  } else {
    const legs = M('#3a4a6e', { rough: 0.8 })
    for (const lx of [-0.16, 0.16]) {
      addMesh(root, new THREE.CylinderGeometry(0.09 * h, 0.11 * h, 0.46 * h, 7), legs, [lx * h, 0.22 * h, 0])
    }
  }
  return e
}

function buildVehicle(o: WorldObjectState): Entry | null {
  const cfg = o.vehicle
  if (!cfg) return null
  const e = entryFor(o)
  const root = e.root
  const mats = e.mats
  const col = o.color ?? cfg.color ?? '#ff5b4d'
  const M = (color: string, extra: MatOpts = {}) => {
    const m = mat(color, extra)
    mats.push(m)
    return m
  }
  if (cfg.kind === 'hover') {
    const body = M(col, { rough: 0.35, metal: 0.45 })
    addMesh(root, new THREE.SphereGeometry(0.95, 22, 16), body)
    const glass = M('#bfe8ff', { emissive: '#bfe8ff', ei: 0.3, rough: 0.12, metal: 0.2, opacity: 0.85 })
    addMesh(root, new THREE.SphereGeometry(0.6, 16, 12), glass, [0, 0.14, 0])
    return e
  }
  const body = M(col, { rough: 0.4, metal: 0.5 })
  addMesh(root, new THREE.BoxGeometry(2.1, 0.62, 1.05), body, [0, 0.55, 0])
  const cabin = M('#cfe6ff', { rough: 0.2, metal: 0.15, opacity: 0.92 })
  addMesh(root, new THREE.BoxGeometry(1.0, 0.5, 0.9), cabin, [-0.2, 1.06, 0])
  const wheels = M('#1c2430', { rough: 0.9 })
  for (const wx of [-0.65, 0.65]) {
    for (const wz of [-0.56, 0.56]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 12), wheels)
      w.rotation.x = Math.PI / 2
      w.position.set(wx, 0.3, wz)
      w.castShadow = true
      w.receiveShadow = true
      root.add(w)
    }
  }
  if (cfg.kind === 'golf') {
    const stripe = M('#ffffff', { rough: 0.4 })
    addMesh(root, new THREE.BoxGeometry(0.24, 0.64, 1.06), stripe, [0.85, 0.55, 0])
  }
  return e
}

function disposeEntry(e: Entry | undefined) {
  if (!e) return
  e.root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      const m = obj.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
      else m?.dispose()
    }
  })
}

/**
 * WorldLayer mounts inside <Canvas>: syncs three.js groups with the engine
 * state on every world revision and animates them each frame.
 */
export function WorldLayer({ session }: { session: GameSession }) {
  const scene = useThree((s) => s.scene)
  const objects = useRef(new Map<string, Entry>())
  const npcs = useRef(new Map<string, Entry>())
  const vehicles = useRef(new Map<string, Entry>())
  const blobRef = useRef<THREE.Mesh>(null!)
  const blobMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#0a0f18', transparent: true, opacity: 0.22, depthWrite: false, depthTest: true })
    return m
  }, [])
  const disposed = useRef(false)

  useEffect(() => {
    disposed.current = false
    const api = session.engine.api
    // ---- sync objects
    const nextObjs = new Set(api.objects.map((o) => o.id))
    for (const [id, e] of objects.current) {
      if (!nextObjs.has(id) || disposed.current) {
        scene.remove(e.root)
        disposeEntry(e)
        objects.current.delete(id)
      }
    }
    for (const o of api.objects) {
      if (disposed.current) break
      if (o.visible === false && o.category !== 'prop' && o.category !== 'zone') continue
      let e = objects.current.get(o.id)
      if (!e) {
        const built = buildObject(o)
        if (!built) continue
        e = built
        objects.current.set(o.id, e)
        scene.add(e.root)
      }
    }
    // ---- npcs
    const nextN = new Set(api.npcs.map((n) => n.id))
    for (const [id, e] of npcs.current) {
      if (!nextN.has(id) || disposed.current) {
        scene.remove(e.root)
        disposeEntry(e)
        npcs.current.delete(id)
      }
    }
    for (const n of api.npcs) {
      if (disposed.current) break
      if (!npcs.current.has(n.id)) {
        const built = buildNpc(n)
        if (!built) continue
        npcs.current.set(n.id, built)
        scene.add(built.root)
      }
    }
    // ---- vehicles
    const nextV = new Set(api.vehicles.map((v) => v.id))
    for (const [id, e] of vehicles.current) {
      if (!nextV.has(id) || disposed.current) {
        scene.remove(e.root)
        disposeEntry(e)
        vehicles.current.delete(id)
      }
    }
    for (const v of api.vehicles) {
      if (disposed.current) break
      if (!vehicles.current.has(v.id)) {
        const built = buildVehicle(v)
        if (!built) continue
        vehicles.current.set(v.id, built)
        scene.add(built.root)
      }
    }
  }, [session, session.worldRev, scene])

  useEffect(() => {
    return () => {
      disposed.current = true
      for (const m of [objects.current, npcs.current, vehicles.current]) {
        for (const e of m.values()) {
          scene.remove(e.root)
          disposeEntry(e)
        }
        m.clear()
      }
      blobMat.dispose()
    }
  }, [scene, blobMat])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const api = session.engine.api
    const p = session.engine.player

    for (const [id, e] of objects.current) {
      const o = api.objects.find((x) => x.id === id)
      if (!o) continue
      const s = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]
      e.root.visible = o.visible !== false
      if (e.bob) {
        e.root.position.set(o.pos[0], o.pos[1] + Math.sin(t * 2.1 + o.pos[0] * 1.7) * 0.1, o.pos[2])
      } else {
        e.root.position.set(o.pos[0], o.pos[1], o.pos[2])
      }
      if (e.spin) {
        e.root.rotation.set(o.rot[0] ?? 0, (o.rot[1] ?? 0) + t * 1.4, o.rot[2] ?? 0)
      } else {
        e.root.rotation.set(o.rot[0] ?? 0, o.rot[1] ?? 0, o.rot[2] ?? 0)
        if (e.kind === 'tile') e.root.rotation.set(0, 0, 0)
      }
      e.root.scale.set(s[0], s[1], s[2])
      if (e.kind === 'gem' || e.shape === 'gem') {
        e.root.scale.multiplyScalar(1 + Math.sin(t * 3.2 + o.pos[0] * 7) * 0.09)
      }
      if (o.visible === false) continue
      for (const m of e.mats) {
        if (o.color && m.color.getStyle() !== o.color) m.color.set(o.color)
        if (e.flicker) {
          m.emissiveIntensity = o.kind === 'lava' ? 1.4 + Math.sin(t * 7 + o.pos[0] * 9) * 1 : 1 + Math.sin(t * 11) * 0.8
        } else if (o.emissive && o.emissive !== '#000000' && o.emissiveIntensity) {
          m.emissive.set(o.emissive)
          m.emissiveIntensity = o.emissiveIntensity
        } else if (m.emissiveIntensity > 0 && !m.userData.keep) {
          // emissive-only props keep their glow; others dim
        }
      }
    }

    for (const [id, e] of npcs.current) {
      const n = api.npcs.find((x) => x.id === id)
      if (!n) continue
      const kind = n.npc?.kind
      const bob = kind === 'ghost' ? Math.sin(t * 1.8 + n.pos[0]) * 0.2 : kind === 'firefly' ? Math.sin(t * 3.3 + n.pos[0] * 2.2) * 0.3 : kind === 'mole' ? 0 : Math.sin(t * 2.6 + n.pos[0] * 2) * 0.05
      e.root.position.set(n.pos[0], n.pos[1] + bob, n.pos[2])
      e.root.rotation.set(0, n.rot?.[1] ?? 0, 0)
      const pulse = kind === 'firefly' ? 1 + Math.sin(t * 5 + n.pos[2] * 3) * 0.12 : 1
      e.root.scale.setScalar((n.npc?.scale ?? 1) * pulse)
    }
    for (const [id, e] of vehicles.current) {
      const v = api.vehicles.find((x) => x.id === id)
      if (!v) continue
      e.root.position.set(v.pos[0], v.pos[1], v.pos[2])
      e.root.rotation.set(0, v.rot?.[1] ?? 0, 0)
    }

    // player blob shadow: a soft dark ellipse under the feet sells the body
    if (blobRef.current) {
      const ground = session.engine.groundHeightAt(p.pos.x, p.pos.z)
      const onBox = p.grounded && p.pos.y > ground + 0.3
      const by = onBox ? p.pos.y + 0.03 : ground + 0.03
      blobRef.current.position.set(p.pos.x, by, p.pos.z)
      const airborne = !p.grounded
      const moving = p.grounded && p.moving
      const targetOp = airborne ? 0.1 : moving ? 0.3 : 0.22
      blobMat.opacity = lerp(blobMat.opacity, targetOp, dt * 8)
      const sc = airborne ? 0.75 : p.crouching ? 0.8 : 1
      blobRef.current.scale.setScalar(lerp(blobRef.current.scale.x, sc, dt * 8))
      blobRef.current.visible = true
    }
    void t
  })

  return (
    <mesh ref={blobRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={blobMat} visible={false} renderOrder={1}>
      <circleGeometry args={[0.85, 24]} />
    </mesh>
  )
}
