import * as THREE from 'three'

// ────────────────────────────────────────────────────────────────────────────
//  Procedural low-poly viewmodels. Every gun is built from boxes + a few
//  faceted primitives so the whole armory shares one clean art direction.
// ────────────────────────────────────────────────────────────────────────────

const geoCache = new Map()
const boxGeo = (w, h, d) => {
  const k = `b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d))
  return geoCache.get(k)
}
const cylGeo = (r, h, seg = 8) => {
  const k = `c${r.toFixed(3)},${h.toFixed(3)},${seg}`
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(r, r, h, seg))
  return geoCache.get(k)
}
const icoGeo = (r) => {
  const k = `i${r.toFixed(3)}`
  if (!geoCache.has(k)) geoCache.set(k, new THREE.IcosahedronGeometry(r, 0))
  return geoCache.get(k)
}

export function mat (color, emissive = 0x000000, emissiveIntensity = 1) {
  return new THREE.MeshLambertMaterial({
    color, flatShading: true, emissive, emissiveIntensity,
  })
}

function part (parent, geo, material, x = 0, y = 0, z = 0, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  m.rotation.set(rot[0], rot[1], rot[2])
  parent.add(m)
  return m
}

/**
 * Builds a viewmodel group. Returns { group, muzzle, grip, ads, scale }
 *  - group points down -Z (forward) and is placed by the sway code
 *  - muzzle is an empty at the barrel tip
 */
export function buildViewModel (def, skin) {
  const m = def.model
  const g = new THREE.Group()
  const bodyCol = skin?.body ?? m.body
  const accentCol = skin?.accent ?? m.accent
  const glowCol = skin?.glow ?? (m.glow ? m.accent : 0x000000)

  const body = mat(bodyCol)
  const dark = mat(new THREE.Color(bodyCol).multiplyScalar(0.62).getHex())
  const metal = mat(new THREE.Color(bodyCol).multiplyScalar(1.35).getHex())
  const accent = mat(accentCol, m.glow ? accentCol : 0x000000, m.glow || skin?.reactive ? 0.5 : 0)
  const glow = new THREE.MeshBasicMaterial({ color: glowCol || accentCol })
  const blade = m.blade !== undefined ? mat(m.blade, m.blade, 0.25) : metal

  const muzzle = new THREE.Object3D()
  g.add(muzzle)
  let ads = 0.0

  const L = m.len ?? 0.55
  // 'energy' is a skin of many things — an energy MELEE weapon is still a blade
  let kind = m.kind
  if (kind === 'energy' && def.slot === 'melee') kind = 'blade'
  if (kind === 'energy' && def.slot === 'utility') kind = 'device'

  if (kind === 'rifle' || kind === 'smg' || kind === 'lmg' || kind === 'dmr' || kind === 'sniper' || kind === 'shotgun' || kind === 'energy') {
    const recH = kind === 'lmg' ? 0.11 : kind === 'smg' ? 0.085 : 0.095
    const recW = kind === 'lmg' ? 0.11 : 0.085
    const recL = L * 0.55
    // receiver
    part(g, boxGeo(recW, recH, recL), body, 0, 0, 0)
    // top rail
    part(g, boxGeo(recW * 0.62, 0.022, recL * 0.85), dark, 0, recH / 2 + 0.011, -0.01)
    // barrel + shroud
    const bl = m.barrel
    part(g, boxGeo(0.05, 0.05, bl), metal, 0, -0.005, -recL / 2 - bl / 2)
    if (kind === 'shotgun') part(g, boxGeo(0.075, 0.075, bl * 0.7), dark, 0, -0.012, -recL / 2 - bl * 0.34)
    if (kind === 'sniper' || kind === 'dmr') part(g, cylGeo(0.036, bl * 0.8, 8), dark, 0, -0.005, -recL / 2 - bl * 0.4, [Math.PI / 2, 0, 0])
    // handguard
    part(g, boxGeo(0.07, 0.055, L * 0.26), dark, 0, -0.012, -recL * 0.18)
    // grip
    const grip = part(g, boxGeo(0.055, 0.15, 0.07), dark, 0, -0.085, recL * 0.12, [0.28, 0, 0])
    // magazine / drum
    if (m.drum) part(g, cylGeo(0.075, 0.055, 8), metal, 0, -0.075, -0.02, [Math.PI / 2, 0, 0])
    else part(g, boxGeo(0.05, kind === 'smg' ? 0.17 : 0.13, 0.062), metal, 0, -0.085, -0.03, [0.12, 0, 0])
    // stock
    if (m.stock) {
      part(g, boxGeo(0.06, 0.075, L * 0.3), body, 0, -0.008, recL / 2 + L * 0.13)
      part(g, boxGeo(0.062, 0.1, 0.05), dark, 0, -0.01, recL / 2 + L * 0.29)
    } else {
      part(g, boxGeo(0.05, 0.07, 0.06), dark, 0, -0.01, recL / 2 + 0.02)
    }
    // trigger guard
    part(g, boxGeo(0.03, 0.045, 0.06), dark, 0, -0.055, recL * 0.02)
    // sights
    if (m.sight === 'scope') {
      part(g, cylGeo(0.032, 0.2, 8), dark, 0, recH / 2 + 0.045, -0.05, [Math.PI / 2, 0, 0])
      part(g, cylGeo(0.038, 0.03, 8), body, 0, recH / 2 + 0.045, -0.15, [Math.PI / 2, 0, 0])
      part(g, boxGeo(0.012, 0.03, 0.012), accent, 0, recH / 2 + 0.02, 0.06)
      ads = 0.02
    } else if (m.sight === 'holo') {
      part(g, boxGeo(0.055, 0.045, 0.05), dark, 0, recH / 2 + 0.03, -0.03)
      part(g, boxGeo(0.042, 0.03, 0.006), glow, 0, recH / 2 + 0.032, -0.056)
    } else if (m.sight === 'dot') {
      part(g, boxGeo(0.03, 0.03, 0.03), dark, 0, recH / 2 + 0.025, -0.03)
      part(g, boxGeo(0.012, 0.012, 0.004), glow, 0, recH / 2 + 0.026, -0.046)
    } else {
      part(g, boxGeo(0.014, 0.03, 0.014), metal, 0, recH / 2 + 0.025, -recL / 2 + 0.02)
    }
    // accent stripes
    part(g, boxGeo(recW * 1.04, 0.012, 0.05), accent, 0, 0.01, -recL * 0.3)
    if (kind === 'energy') {
      part(g, cylGeo(0.028, 0.09, 6), glow, 0, 0.005, -recL / 2 - bl * 0.55, [Math.PI / 2, 0, 0])
      part(g, boxGeo(0.02, 0.02, 0.18), glow, 0, recH / 2 + 0.03, 0.02)
    }
    muzzle.position.set(0, -0.005, -recL / 2 - bl - 0.02)
    if (m.akimbo) {
      const twin = g.clone(true)
      twin.position.set(0.16, -0.02, 0.02)
      g.add(twin)
      g.position.x = -0.08
    }
  } else if (kind === 'pistol' || kind === 'revolver') {
    part(g, boxGeo(0.05, 0.07, L), body, 0, 0, -L * 0.1)
    part(g, boxGeo(0.042, 0.05, m.barrel), metal, 0, 0.005, -L * 0.1 - L / 2 - m.barrel / 2)
    part(g, boxGeo(0.05, 0.13, 0.065), dark, 0, -0.085, 0.02, [0.25, 0, 0])
    if (kind === 'revolver') part(g, cylGeo(0.045, 0.075, 8), metal, 0, -0.005, -0.02, [Math.PI / 2, 0, 0])
    else part(g, boxGeo(0.04, 0.075, 0.05), metal, 0, -0.07, 0.015, [0.1, 0, 0])
    part(g, boxGeo(0.045, 0.014, 0.05), accent, 0, 0.04, -L * 0.1)
    part(g, boxGeo(0.01, 0.022, 0.01), metal, 0, 0.055, -L * 0.1 - L * 0.42)
    muzzle.position.set(0, 0.005, -L * 0.6 - m.barrel)
  } else if (kind === 'blade') {
    part(g, boxGeo(0.035, 0.035, 0.17), dark, 0, -0.02, 0.1, [0.2, 0, 0])
    part(g, boxGeo(0.07, 0.012, 0.02), accent, 0, -0.005, 0.02)
    const bladeLen = L * 0.8
    part(g, boxGeo(0.012, 0.075, bladeLen), blade, 0, 0.01, -bladeLen / 2 - 0.02)
    part(g, boxGeo(0.006, 0.02, bladeLen * 0.9), glow, 0, 0.01, -bladeLen / 2 - 0.03)
    muzzle.position.set(0, 0.01, -bladeLen - 0.05)
  } else if (kind === 'blunt') {
    part(g, boxGeo(0.032, 0.032, L * 0.45), dark, 0, -0.02, 0.16, [0.18, 0, 0])
    part(g, boxGeo(0.055, 0.055, L * 0.5), body, 0, 0.01, -L * 0.12)
    part(g, boxGeo(0.06, 0.02, 0.05), accent, 0, 0.01, -L * 0.36)
    muzzle.position.set(0, 0.01, -L * 0.5)
  } else if (kind === 'fist') {
    const fistMat = mat(m.body)
    const band = mat(m.accent)
    for (const s of [-1, 1]) {
      const f = new THREE.Group()
      f.position.set(s * 0.11, -0.02, -0.12)
      part(f, boxGeo(0.085, 0.085, 0.13), fistMat, 0, 0, 0)
      part(f, boxGeo(0.09, 0.03, 0.05), band, 0, 0.0, 0.04)
      part(f, boxGeo(0.07, 0.03, 0.03), fistMat, 0, 0.03, -0.07)
      g.add(f)
    }
    muzzle.position.set(0, 0, -0.2)
  } else if (kind === 'grenade') {
    part(g, icoGeo(0.055), body, 0, 0, 0)
    part(g, boxGeo(0.02, 0.04, 0.02), metal, 0, 0.06, 0)
    part(g, boxGeo(0.062, 0.012, 0.062), accent, 0, 0.03, 0)
    muzzle.position.set(0, 0.06, 0)
  } else { // device
    part(g, boxGeo(0.1, 0.07, 0.15), body, 0, 0, 0)
    part(g, boxGeo(0.07, 0.02, 0.09), glow, 0, 0.04, -0.02)
    part(g, boxGeo(0.03, 0.03, 0.03), accent, 0, -0.02, -0.08)
    muzzle.position.set(0, 0.01, -0.1)
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })
  return { group: g, muzzle, adsOffset: ads, materials: [body, dark, metal, accent, glow, blade] }
}

// Player / bot body: chunky low-poly, readable at distance.
export function buildCharacter (teamColor, isBot) {
  const g = new THREE.Group()
  const skin = mat(isBot ? 0x8d93a3 : 0xd7a373)
  const suit = mat(teamColor)
  const dark = mat(new THREE.Color(teamColor).multiplyScalar(0.55).getHex())
  const accent = mat(0x1a1d24)
  // torso
  part(g, boxGeo(0.52, 0.62, 0.3), suit, 0, 1.12, 0)
  part(g, boxGeo(0.56, 0.14, 0.34), dark, 0, 0.86, 0)
  // head
  part(g, boxGeo(0.26, 0.28, 0.26), skin, 0, 1.62, 0)
  part(g, boxGeo(0.28, 0.1, 0.28), accent, 0, 1.74, 0)
  // visor
  part(g, boxGeo(0.22, 0.07, 0.03), mat(0x6ee7ff, 0x6ee7ff, 0.6), 0, 1.63, -0.14)
  // arms
  part(g, boxGeo(0.14, 0.42, 0.14), suit, -0.33, 1.16, -0.06, [0.3, 0, 0])
  part(g, boxGeo(0.14, 0.42, 0.14), suit, 0.33, 1.16, -0.06, [0.3, 0, 0])
  // legs
  part(g, boxGeo(0.17, 0.5, 0.17), dark, -0.14, 0.28, 0)
  part(g, boxGeo(0.17, 0.5, 0.17), dark, 0.14, 0.28, 0)
  part(g, boxGeo(0.19, 0.08, 0.24), accent, -0.14, 0.04, -0.02)
  part(g, boxGeo(0.19, 0.08, 0.24), accent, 0.14, 0.04, -0.02)
  // team band
  part(g, boxGeo(0.53, 0.05, 0.31), accent, 0, 1.4, 0)
  g.traverse((o) => { if (o.isMesh) o.castShadow = true })
  return g
}
