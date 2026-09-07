// ────────────────────────────────────────────────────────────────────────────
//  Maps are pure brush data (oriented boxes). The same list feeds the
//  collision world and the renderer, so what you see is exactly what you hit.
// ────────────────────────────────────────────────────────────────────────────

export const PAL = {
  floor: 0x28323e,
  floorAlt: 0x2f3b48,
  wall: 0x3a4757,
  wallDark: 0x2b3543,
  plat: 0x465667,
  platHigh: 0x4f6274,
  ramp: 0x2c6b74,
  rampWarm: 0x7a5330,
  trim: 0xff8a3d,
  neon: 0x6ee7ff,
  violet: 0x9d7bff,
  stair: 0x3f4c5c,
  cover: 0x53616f,
}

// box: centre + half extents (+ optional rotation)
const B = (cx, cy, cz, hx, hy, hz, rot = [0, 0, 0], color = PAL.wall, tag = '') =>
  ({ center: [cx, cy, cz], half: [hx, hy, hz], rot, color, tag })

// floor slab from (x0,z0) to (x1,z1) whose top surface sits at y
const slab = (x0, z0, x1, z1, y = 0, color = PAL.floor, tag = 'floor') =>
  B((x0 + x1) / 2, y - 1, (z0 + z1) / 2, (x1 - x0) / 2, 1, (z1 - z0) / 2, [0, 0, 0], color, tag)

// wall from (x0,z0) to (x1,z1), height h, base at y
const wall = (x0, z0, x1, z1, h, y = 0, t = 0.6, color = PAL.wall) => {
  const dx = x1 - x0, dz = z1 - z0
  const len = Math.hypot(dx, dz) || 1
  return B((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2,
    Math.abs(dx) > Math.abs(dz) ? len / 2 : t, h / 2,
    Math.abs(dx) > Math.abs(dz) ? t : len / 2, [0, 0, 0], color, 'wall')
}

// ramp between two 3D points, `w` wide
const ramp = (x0, y0, z0, x1, y1, z1, w = 6, color = PAL.ramp, t = 0.4) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0
  const L = Math.hypot(dx, dz)
  const slant = Math.hypot(L, dy)
  return B((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2,
    w / 2, t, slant / 2,
    [-Math.atan2(dy, L), Math.atan2(dx, dz), 0], color, 'ramp')
}

// staircase: n steps of rise/run starting at (x,z) heading (dx,dz)
const stairs = (x, y, z, dx, dz, n, rise = 0.25, run = 0.5, w = 4, color = PAL.stair) => {
  const out = []
  const l = Math.hypot(dx, dz)
  const ux = dx / l, uz = dz / l
  for (let i = 0; i < n; i++) {
    const cx = x + ux * (i + 0.5) * run
    const cz = z + uz * (i + 0.5) * run
    const h = (i + 1) * rise
    out.push(B(cx, y + h / 2, cz,
      Math.abs(ux) > 0.5 ? run / 2 : w / 2, h / 2,
      Math.abs(uz) > 0.5 ? run / 2 : w / 2, [0, 0, 0], color, 'stair'))
  }
  return out
}

// ── 1. QYN YARD ────────────────────────────────────────────────────────────
// The movement playground: flat ground, ramps, stairs, small + long platforms,
// gaps, downhill, uphill, walls, corners.
function qynYard () {
  const b = []
  // ── ground with deliberate gaps: outer ring + separated centre island ──
  b.push(slab(-60, -60, 60, -12, 0, PAL.floor))         // north strip
  b.push(slab(-60, -12, -30, 60, 0, PAL.floorAlt))      // west strip
  b.push(slab(30, -12, 60, 60, 0, PAL.floorAlt))        // east strip
  b.push(slab(-24, -6, 24, 18, 0, PAL.floor))           // centre island
  b.push(slab(-24, 24, 24, 60, 0, PAL.floor))           // south strip
  b.push(slab(-30, 54, 30, 60, 0, PAL.floorAlt))
  b.push(slab(-30, 24, -24, 54, 0, PAL.floor))
  b.push(slab(24, 24, 30, 54, 0, PAL.floor))

  // ── perimeter ──
  const H = 16
  b.push(wall(-60, -60, 60, -60, H, 0, 1.5, PAL.wallDark))
  b.push(wall(-60, 60, 60, 60, H, 0, 1.5, PAL.wallDark))
  b.push(wall(-60, -60, -60, 60, H, 0, 1.5, PAL.wallDark))
  b.push(wall(60, -60, 60, 60, H, 0, 1.5, PAL.wallDark))

  // ── long uphill ramp onto the west high platform ──
  b.push(B(-46, 4.4, -40, 9, 0.4, 9, [0, 0, 0], PAL.plat))       // high pad (top 8.8)
  b.push(ramp(-33, 0, -40, -40, 8.8, -40, 9, PAL.ramp))          // uphill (west → high pad)
  b.push(wall(-55, -49, -37, -49, 3, 8.8, 0.5, PAL.wall))
  b.push(wall(-55, -31, -37, -31, 3, 8.8, 0.5, PAL.wall))

  // ── the big downhill: sprint + slide all the way to the floor ──
  b.push(ramp(-40, 8.8, -31, -20, 0, -31, 10, PAL.rampWarm))
  b.push(wall(-45, -36, -45, -26, 2, 0, 0.5, PAL.trim))
  b.push(wall(-15, -36, -15, -26, 2, 0, 0.5, PAL.trim))

  // ── downhill slide chute on the east side (steeper, with a wall to carve) ──
  b.push(B(46, 6.4, 20, 8, 0.4, 10, [0, 0, 0], PAL.plat))
  b.push(ramp(38, 12, 20, 22, 0, 20, 8, PAL.rampWarm))
  b.push(wall(46, 10, 46, 30, 3, 12, 0.5, PAL.wall))
  b.push(...stairs(50, 0, 34, 0, -1, 20, 0.3, 0.5, 4))   // climb back up

  // ── stairs to the centre island's raised deck ──
  b.push(...stairs(10, 0, 12, -1, 0, 12, 0.3, 0.55, 5))
  b.push(B(-2, 1.8, 12, 8, 0.2, 2.5, [0, 0, 0], PAL.platHigh))   // deck top 4.0

  // ── strafe platform chain (must slide-jump the gaps) ──
  const chain = [[-14, -22, 1.2], [-6, -26, 2.6], [2, -30, 4.0], [10, -26, 5.4], [18, -22, 6.8]]
  for (const [x, z, y] of chain) b.push(B(x, y / 2, z, 2.2, y / 2, 2.2, [0, 0, 0], PAL.plat))
  b.push(B(24, 4.4, -18, 3, 0.3, 6, [0, 0, 0], PAL.platHigh))    // landing (top 9.4)

  // ── long platform + corner walls (strafe-jump practice) ──
  b.push(B(0, 3.0, 40, 16, 0.3, 3, [0, 0, 0], PAL.plat))
  b.push(ramp(-16, 0, 36, -16, 6, 36, 4, PAL.ramp))
  b.push(ramp(16, 0, 36, 16, 6, 36, 4, PAL.ramp))
  b.push(wall(-14, 43, 14, 43, 2.4, 0, 0.5, PAL.cover))
  b.push(wall(14, 37, 14, 49, 2.4, 0, 0.5, PAL.cover))
  b.push(wall(-14, 37, -14, 49, 2.4, 0, 0.5, PAL.cover))

  // ── cover blocks + corners on the north strip ──
  b.push(B(-18, 1.1, -34, 3, 1.1, 1.2, [0, 0, 0], PAL.cover))
  b.push(B(18, 1.1, -34, 3, 1.1, 1.2, [0, 0, 0], PAL.cover))
  b.push(B(0, 1.6, -46, 5, 1.6, 1.2, [0, 0, 0], PAL.cover))
  b.push(wall(-30, -46, -30, -34, 3, 0, 0.6, PAL.wall))
  b.push(wall(-30, -46, -18, -46, 3, 0, 0.6, PAL.wall))
  b.push(wall(30, -46, 30, -34, 3, 0, 0.6, PAL.wall))
  b.push(wall(30, -46, 18, -46, 3, 0, 0.6, PAL.wall))

  // ── small steps / ledges (step-up practice) ──
  for (let i = 0; i < 5; i++) b.push(B(-10 + i * 1.2, 0.15 + i * 0.15, 8, 0.6, 0.15 + i * 0.15, 3, [0, 0, 0], PAL.stair))

  // ── two jump pads of geometry: quarter pipes ──
  b.push(ramp(-50, 0, 0, -44, 3.2, 0, 6, PAL.ramp))
  b.push(ramp(-44, 3.2, 0, -38, 0, 0, 6, PAL.ramp))
  b.push(ramp(50, 0, -6, 44, 3.2, -6, 6, PAL.ramp))
  b.push(ramp(44, 3.2, -6, 38, 0, -6, 6, PAL.ramp))

  // ── bridges over the gaps (thin, risky) ──
  b.push(B(0, -0.15, -9, 4, 0.15, 3.2, [0, 0, 0], PAL.platHigh))
  b.push(B(0, -0.15, 21, 4, 0.15, 3.2, [0, 0, 0], PAL.platHigh))
  b.push(B(-27, -0.15, 6, 3.2, 0.15, 4, [0, 0, 0], PAL.platHigh))
  b.push(B(27, -0.15, 6, 3.2, 0.15, 4, [0, 0, 0], PAL.platHigh))

  return b
}

// ── 2. VERTEX — tight symmetric duel arena ─────────────────────────────────
function vertex () {
  const b = []
  b.push(slab(-34, -34, 34, 34, 0, PAL.floor))
  const H = 14
  b.push(wall(-34, -34, 34, -34, H), wall(-34, 34, 34, 34, H), wall(-34, -34, -34, 34, H), wall(34, -34, 34, 34, H))

  // central tower
  b.push(B(0, 2.6, 0, 5, 2.6, 5, [0, 0, 0], PAL.plat))
  b.push(B(0, 5.4, 0, 3.4, 0.3, 3.4, [0, 0, 0], PAL.platHigh))
  b.push(ramp(-9, 0, 0, -5, 5.2, 0, 5, PAL.ramp))
  b.push(ramp(9, 0, 0, 5, 5.2, 0, 5, PAL.ramp))
  b.push(ramp(0, 0, -9, 0, 5.2, -5, 5, PAL.ramp))
  b.push(ramp(0, 0, 9, 0, 5.2, 5, 5, PAL.ramp))

  // side lanes with long platforms
  b.push(B(-22, 1.6, 0, 3, 1.6, 12, [0, 0, 0], PAL.plat))
  b.push(B(22, 1.6, 0, 3, 1.6, 12, [0, 0, 0], PAL.plat))
  b.push(ramp(-22, 0, 14, -22, 3.2, 20, 4, PAL.ramp))
  b.push(ramp(22, 0, -14, 22, 3.2, -20, 4, PAL.ramp))

  // cover
  for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14], [-14, 0], [14, 0]]) {
    b.push(B(x, 1.1, z, 1.8, 1.1, 1.8, [0, 0, 0], PAL.cover))
  }
  b.push(wall(-30, -20, -30, -8, 3), wall(30, 8, 30, 20, 3))
  b.push(wall(-20, -30, -8, -30, 3), wall(8, 30, 20, 30, 3))
  b.push(...stairs(-30, 0, 26, 1, 0, 10, 0.3, 0.5, 4))
  b.push(...stairs(30, 0, -26, -1, 0, 10, 0.3, 0.5, 4))
  return b
}

// ── 3. CONDUIT — three lane 3v3 arena ──────────────────────────────────────
function conduit () {
  const b = []
  b.push(slab(-46, -46, 46, 46, 0, PAL.floor))
  const H = 15
  b.push(wall(-46, -46, 46, -46, H), wall(-46, 46, 46, 46, H), wall(-46, -46, -46, 46, H), wall(46, -46, 46, 46, H))

  // mid structure with a high deck and two ramps
  b.push(B(0, 2.2, 0, 9, 2.2, 7, [0, 0, 0], PAL.plat))
  b.push(B(0, 4.7, 0, 7, 0.3, 5, [0, 0, 0], PAL.platHigh))
  b.push(ramp(-14, 0, 0, -9, 4.4, 0, 6, PAL.ramp))
  b.push(ramp(14, 0, 0, 9, 4.4, 0, 6, PAL.ramp))
  b.push(B(0, 5.0, -7.5, 7, 0.3, 2, [0, 0, 0], PAL.platHigh))

  // lanes
  b.push(B(0, 1.5, -26, 22, 1.5, 3, [0, 0, 0], PAL.plat))
  b.push(B(0, 1.5, 26, 22, 1.5, 3, [0, 0, 0], PAL.plat))
  b.push(ramp(-24, 0, -26, -24, 3, -32, 4, PAL.ramp))
  b.push(ramp(24, 0, 26, 24, 3, 32, 4, PAL.ramp))

  // side towers
  for (const sx of [-1, 1]) {
    b.push(B(sx * 34, 3.0, sx * 20, 6, 3.0, 6, [0, 0, 0], PAL.plat))
    b.push(B(sx * 34, 6.3, sx * 20, 5, 0.3, 5, [0, 0, 0], PAL.platHigh))
    b.push(ramp(sx * 34, 0, sx * 32, sx * 34, 6, sx * 26, 5, PAL.ramp))
    b.push(wall(sx * 28, sx * 14, sx * 40, sx * 14, 3))
    b.push(wall(sx * 28, sx * 14, sx * 28, sx * 26, 3))
  }
  // cover sprinkles
  for (const [x, z] of [[-12, -14], [12, -14], [-12, 14], [12, 14], [-22, 0], [22, 0], [0, -30], [0, 30]]) {
    b.push(B(x, 1.2, z, 2, 1.2, 2, [0, 0, 0], PAL.cover))
  }
  b.push(...stairs(-40, 0, -8, 0, 1, 12, 0.3, 0.5, 4))
  b.push(...stairs(40, 0, 8, 0, -1, 12, 0.3, 0.5, 4))
  return b
}

// ── 4. DESCENT — the downhill map ──────────────────────────────────────────
function descent () {
  const b = []
  b.push(slab(-50, -50, 50, 50, 0, PAL.floor))
  const H = 18
  b.push(wall(-50, -50, 50, -50, H), wall(-50, 50, 50, 50, H), wall(-50, -50, -50, 50, H), wall(50, -50, 50, 50, H))

  // the hill: terrace stack climbing to a 22m summit on -X
  b.push(B(-38, 11, 0, 12, 11, 14, [0, 0, 0], PAL.plat))
  b.push(B(-24, 6.5, 0, 8, 6.5, 14, [0, 0, 0], PAL.plat))
  b.push(B(-12, 3.2, 0, 7, 3.2, 14, [0, 0, 0], PAL.plat))

  // long sweeping downhill runs (slide forever)
  b.push(ramp(-26, 22, -12, -2, 0, -12, 9, PAL.rampWarm))
  b.push(ramp(-26, 22, 12, -2, 0, 12, 9, PAL.rampWarm))
  b.push(B(-38, 11.4, 0, 12, 0.4, 14, [0, 0, 0], PAL.platHigh))   // summit deck (top 22.8)
  b.push(wall(-50, -14, -26, -14, 4, 22.8, 0.5, PAL.wall))
  b.push(wall(-50, 14, -26, 14, 4, 22.8, 0.5, PAL.wall))

  // terraces with gaps to slide-jump across
  b.push(B(14, 4.4, 0, 9, 0.4, 14, [0, 0, 0], PAL.plat))
  b.push(B(28, 2.2, 0, 8, 0.4, 14, [0, 0, 0], PAL.plat))
  b.push(B(40, 0.9, 0, 7, 0.4, 14, [0, 0, 0], PAL.plat))
  b.push(ramp(4, 0, -20, 10, 4.4, -20, 5, PAL.ramp))
  b.push(ramp(4, 0, 20, 10, 4.4, 20, 5, PAL.ramp))

  // side staircases back up
  b.push(...stairs(20, 0, -24, 0, -1, 14, 0.3, 0.5, 4))
  b.push(...stairs(20, 4.4, -30, -1, 0, 16, 0.3, 0.5, 4))
  b.push(...stairs(-30, 0, 30, 0, 1, 16, 0.3, 0.5, 5))

  // big bowl on +X for carving
  b.push(ramp(6, 0, 34, 20, 5.2, 34, 8, PAL.ramp))
  b.push(ramp(20, 5.2, 34, 34, 0, 34, 8, PAL.ramp))
  b.push(wall(10, 40, 30, 40, 3), wall(10, 28, 10, 40, 3))
  return b
}

// ── 5. RANGE — shooting range + speed track ────────────────────────────────
function range () {
  const b = []
  b.push(slab(-40, -40, 40, 40, 0, PAL.floor))
  const H = 12
  b.push(wall(-40, -40, 40, -40, H), wall(-40, 40, 40, 40, H), wall(-40, -40, -40, 40, H), wall(40, -40, 40, 40, H))

  // firing line + distance lanes
  b.push(B(0, 0.2, 30, 30, 0.2, 3, [0, 0, 0], PAL.plat))
  for (const d of [10, 20, 30, 40, 55]) {
    b.push(B(-14, 0.15, 30 - d, 0.12, 0.15, 6, [0, 0, 0], PAL.trim))   // lane markers
    b.push(B(14, 0.15, 30 - d, 0.12, 0.15, 6, [0, 0, 0], PAL.trim))
  }
  // backstop behind every lane (never blocks a firing lane) + off-lane cover
  b.push(B(0, 4, -27, 36, 4, 0.6, [0, 0, 0], PAL.wall))
  b.push(B(0, 5, -26.2, 30, 5, 0.08, [0, 0, 0], PAL.trim))
  for (const [x, z] of [[-24, 22], [24, 22], [-24, 4], [24, 4], [-24, -12], [24, -12]]) {
    b.push(B(x, 1.1, z, 2.6, 1.1, 2.6, [0, 0, 0], PAL.cover))
  }

  // speed track on the west: long runway + ramps for testing chains
  b.push(B(-26, 0.05, 0, 11, 0.05, 36, [0, 0, 0], PAL.floorAlt))
  b.push(ramp(-26, 0, 34, -26, 5.4, 22, 6, PAL.ramp))
  b.push(B(-26, 2.9, 18, 6, 0.3, 6, [0, 0, 0], PAL.platHigh))
  b.push(ramp(-26, 6, 12, -26, 0, -2, 6, PAL.rampWarm))
  b.push(...stairs(-26, 0, -14, 0, 1, 12, 0.3, 0.5, 5))
  b.push(B(-26, 1.9, -20, 6, 0.2, 4, [0, 0, 0], PAL.platHigh))
  b.push(wall(-37, -36, -37, 36, 1.2, 0, 0.4, PAL.trim))
  b.push(wall(-15, -36, -15, 36, 1.2, 0, 0.4, PAL.trim))

  // movement toys on the east
  b.push(B(26, 2.2, 0, 8, 0.3, 8, [0, 0, 0], PAL.plat))
  b.push(ramp(18, 0, 0, 20, 4.4, 0, 5, PAL.ramp))
  b.push(ramp(34, 0, 0, 32, 4.4, 0, 5, PAL.ramp))
  for (let i = 0; i < 5; i++) b.push(B(20 + i * 3, 0.8 + i * 0.8, 14 - i * 2, 1.4, 0.8 + i * 0.8, 1.4, [0, 0, 0], PAL.plat))
  return b
}

export const MAPS = [
  {
    id: 'yard', name: 'QYN YARD', sub: 'MOVEMENT PLAYGROUND',
    desc: 'Flat ground, ramps, stairs, gaps, long platforms, walls, corners. Built for chains.',
    sky: [0x0b1016, 0x1a2a38], fog: 0x16222e, fogNear: 60, fogFar: 190,
    brushes: qynYard(),
    spawns: {
      a: [[0, 0.2, -44, 0], [-24, 0.2, -26, 0.4], [24, 0.2, -26, -0.4], [-10, 0.2, -50, 0.2]],
      b: [[0, 0.2, 30, Math.PI], [-18, 0.2, 48, Math.PI + 0.4], [18, 0.2, 48, Math.PI - 0.4], [0, 0.2, 52, Math.PI]],
    },
    bots: true, killY: -25, modes: ['1v1', '2v2', '3v3', 'bots'],
  },
  {
    id: 'vertex', name: 'VERTEX', sub: 'DUEL ARENA',
    desc: 'Tight and symmetrical. Centre tower, four ramps, instant fights.',
    sky: [0x0d1018, 0x241d33], fog: 0x1b1c2c, fogNear: 45, fogFar: 150,
    brushes: vertex(),
    spawns: {
      a: [[0, 0.2, -26, 0], [-16, 0.2, -22, 0.3], [16, 0.2, -22, -0.3], [0, 0.2, -18, 0]],
      b: [[0, 0.2, 26, Math.PI], [16, 0.2, 22, Math.PI - 0.3], [-16, 0.2, 22, Math.PI + 0.3], [0, 0.2, 18, Math.PI]],
    },
    bots: true, killY: -25, modes: ['1v1', '2v2', 'bots'],
  },
  {
    id: 'conduit', name: 'CONDUIT', sub: 'THREE LANES',
    desc: 'Mid deck, side towers, long lanes. Space to rotate and flank.',
    sky: [0x0a1418, 0x123040], fog: 0x12222c, fogNear: 55, fogFar: 175,
    brushes: conduit(),
    spawns: {
      a: [[0, 0.2, -36, 0], [-20, 0.2, -32, 0.3], [20, 0.2, -32, -0.3], [-8, 0.2, -38, 0], [8, 0.2, -38, 0]],
      b: [[0, 0.2, 36, Math.PI], [20, 0.2, 32, Math.PI - 0.3], [-20, 0.2, 32, Math.PI + 0.3], [-8, 0.2, 38, Math.PI], [8, 0.2, 38, Math.PI]],
    },
    bots: true, killY: -25, modes: ['2v2', '3v3', 'bots'],
  },
  {
    id: 'descent', name: 'DESCENT', sub: 'THE HILL',
    desc: 'Summit to bowl. Sprint down, slide the whole way, learn to carry speed.',
    sky: [0x140f0c, 0x3a2418], fog: 0x241a14, fogNear: 60, fogFar: 210,
    brushes: descent(),
    spawns: {
      a: [[-38, 23, 0, Math.PI / 2], [-38, 23, -8, Math.PI / 2], [-38, 23, 8, Math.PI / 2]],
      b: [[36, 1.5, 0, -Math.PI / 2], [36, 1.5, -8, -Math.PI / 2], [36, 1.5, 8, -Math.PI / 2], [24, 3, 0, -Math.PI / 2]],
    },
    bots: true, killY: -25, modes: ['1v1', '2v2', '3v3', 'bots'],
  },
  {
    id: 'range', name: 'QYN RANGE', sub: 'TRAINING',
    desc: 'Every loadout, every distance, plus a speed track to test your chains.',
    sky: [0x0c1014, 0x1b2733], fog: 0x141d26, fogNear: 50, fogFar: 170,
    brushes: range(),
    spawns: { a: [[0, 0.6, 30, 0], [-8, 0.6, 30, 0], [8, 0.6, 30, 0]], b: [[0, 0.6, -22, Math.PI]] },
    bots: false, killY: -25, modes: ['range'],
  },
]

export const MAP_BY_ID = Object.fromEntries(MAPS.map((m) => [m.id, m]))

export const MODES = [
  { id: '1v1', name: '1 v 1', teamA: 1, teamB: 1, bots: 0, desc: 'Pure duel. No excuses.' },
  { id: '2v2', name: '2 v 2', teamA: 2, teamB: 2, bots: 0, desc: 'Two on two. Cover your mate.' },
  { id: '3v3', name: '3 v 3', teamA: 3, teamB: 3, bots: 0, desc: 'Full squad skirmish.' },
  { id: 'solo_bots', name: '1 v BOTS', teamA: 1, teamB: 1, bots: 1, desc: 'You against one bot. Warm up.' },
  { id: 'duo_bots', name: '1 + BOT v 2 BOTS', teamA: 2, teamB: 2, bots: 3, desc: 'You and a bot versus two.' },
  { id: 'trio_bots', name: '1 + 2 BOTS v 3 BOTS', teamA: 3, teamB: 3, bots: 5, desc: 'Full lobby, five bots.' },
  { id: 'range', name: 'SHOOTING RANGE', teamA: 1, teamB: 0, bots: 0, desc: 'Try every loadout. No pressure.' },
]
