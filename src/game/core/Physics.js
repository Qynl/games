import * as THREE from 'three'

// ────────────────────────────────────────────────────────────────────────────
//  Collision world: the map is a set of oriented boxes ("brushes").
//  The player / bots are vertical capsules.
//
//  Everything is deliberately analytic (no physics engine): the movement code
//  needs full authority over velocity so momentum can be preserved exactly.
// ────────────────────────────────────────────────────────────────────────────

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Brush {
  constructor ({ center, half, rot = [0, 0, 0], color = 0x8892a4, tag = '', kind = 'solid', friction = 1 }) {
    this.center = new THREE.Vector3(center[0], center[1], center[2])
    this.half = new THREE.Vector3(half[0], half[1], half[2])
    this.rot = rot
    this.quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'))
    this.inv = this.quat.clone().invert()
    this.color = color
    this.tag = tag
    this.kind = kind
    this.friction = friction
    this.updateAABB()
  }
  updateAABB () {
    const m = new THREE.Matrix4().makeRotationFromQuaternion(this.quat)
    const e = m.elements
    const h = this.half
    const ex = Math.abs(e[0]) * h.x + Math.abs(e[4]) * h.y + Math.abs(e[8]) * h.z
    const ey = Math.abs(e[1]) * h.x + Math.abs(e[5]) * h.y + Math.abs(e[9]) * h.z
    const ez = Math.abs(e[2]) * h.x + Math.abs(e[6]) * h.y + Math.abs(e[10]) * h.z
    this.min = new THREE.Vector3(this.center.x - ex, this.center.y - ey, this.center.z - ez)
    this.max = new THREE.Vector3(this.center.x + ex, this.center.y + ey, this.center.z + ez)
  }
}

const _pa = new THREE.Vector3()
const _pb = new THREE.Vector3()
const _q = new THREE.Vector3()
const _delta = new THREE.Vector3()
const _tmp = new THREE.Vector3()

// Closest points between a segment (local space) and an axis aligned box
// centred on the origin. Iterative: converge t, then clamp.
function closestOnSegmentToBox (ax, ay, az, bx, by, bz, hx, hy, hz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az
  const abLen2 = abx * abx + aby * aby + abz * abz
  let best = Infinity
  let bt = 0
  const test = (t) => {
    const px = ax + abx * t, py = ay + aby * t, pz = az + abz * t
    const qx = clamp(px, -hx, hx), qy = clamp(py, -hy, hy), qz = clamp(pz, -hz, hz)
    const dx = px - qx, dy = py - qy, dz = pz - qz
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 < best) { best = d2; bt = t }
    return d2
  }
  test(0); test(1); test(0.5); test(0.25); test(0.75)
  if (abLen2 > 1e-9) {
    for (let i = 0; i < 5; i++) {
      const px = ax + abx * bt, py = ay + aby * bt, pz = az + abz * bt
      const qx = clamp(px, -hx, hx), qy = clamp(py, -hy, hy), qz = clamp(pz, -hz, hz)
      const t = clamp(((qx - ax) * abx + (qy - ay) * aby + (qz - az) * abz) / abLen2, 0, 1)
      const d2 = test(t)
      if (d2 < 1e-8) break
      if (Math.abs(t - bt) < 1e-4) break
      bt = t
    }
  }
  const px = ax + abx * bt, py = ay + aby * bt, pz = az + abz * bt
  _pa.set(px, py, pz)
  _q.set(clamp(px, -hx, hx), clamp(py, -hy, hy), clamp(pz, -hz, hz))
  return _pa.distanceToSquared(_q)
}

export class PhysicsWorld {
  constructor (cellSize = 8) {
    this.brushes = []
    this.cell = cellSize
    this.grid = new Map()
  }

  add (brush) {
    const b = brush instanceof Brush ? brush : new Brush(brush)
    this.brushes.push(b)
    return b
  }

  build () {
    this.grid.clear()
    const c = this.cell
    for (const b of this.brushes) {
      const x0 = Math.floor(b.min.x / c), x1 = Math.floor(b.max.x / c)
      const y0 = Math.floor(b.min.y / c), y1 = Math.floor(b.max.y / c)
      const z0 = Math.floor(b.min.z / c), z1 = Math.floor(b.max.z / c)
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            const k = x + ',' + y + ',' + z
            let arr = this.grid.get(k)
            if (!arr) { arr = []; this.grid.set(k, arr) }
            arr.push(b)
          }
        }
      }
    }
  }

  queryBox (min, max, out) {
    out.length = 0
    const c = this.cell
    const x0 = Math.floor(min.x / c), x1 = Math.floor(max.x / c)
    const y0 = Math.floor(min.y / c), y1 = Math.floor(max.y / c)
    const z0 = Math.floor(min.z / c), z1 = Math.floor(max.z / c)
    const seen = this._seen || (this._seen = new Set())
    seen.clear()
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const arr = this.grid.get(x + ',' + y + ',' + z)
          if (!arr) continue
          for (let i = 0; i < arr.length; i++) {
            const b = arr[i]
            if (seen.has(b)) continue
            seen.add(b)
            out.push(b)
          }
        }
      }
    }
    return out
  }

  // All contacts of a capsule (feet anchored at `pos`, total height `h`).
  capsuleContacts (pos, r, h, out) {
    out.length = 0
    const min = _tmp.set(pos.x - r, pos.y - r * 0.5, pos.z - r)
    const max = new THREE.Vector3(pos.x + r, pos.y + h + r * 0.5, pos.z + r)
    const list = this._q1 || (this._q1 = [])
    this.queryBox(min, max, list)
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      // capsule segment in world
      const wax = pos.x, way = pos.y + r, waz = pos.z
      const wbx = pos.x, wby = pos.y + h - r, wbz = pos.z
      // to brush local space
      _pa.set(wax, way, waz).sub(b.center).applyQuaternion(b.inv)
      _pb.set(wbx, wby, wbz).sub(b.center).applyQuaternion(b.inv)
      const d2 = closestOnSegmentToBox(_pa.x, _pa.y, _pa.z, _pb.x, _pb.y, _pb.z, b.half.x, b.half.y, b.half.z)
      const dist = Math.sqrt(d2)
      // world space contact point on capsule / box
      const pw = _pa.clone().applyQuaternion(b.quat).add(b.center)
      const qw = _q.clone().applyQuaternion(b.quat).add(b.center)
      if (dist > 1e-5) {
        _delta.copy(pw).sub(qw)
        const pen = r - dist
        if (pen > -1e-4) out.push({ n: _delta.divideScalar(dist).clone(), pen, brush: b, point: qw.clone() })
      } else {
        // deep: point inside the box → shortest escape, never downwards
        const lx = b.half.x - Math.abs(_pa.x)
        const lyUp = b.half.y - _pa.y          // escape through the top
        const lyDown = b.half.y + _pa.y + 1000 // ejecting someone through a floor is never right
        const ly = Math.min(lyUp, lyDown)
        const lz = b.half.z - Math.abs(_pa.z)
        let n
        if (lx <= ly && lx <= lz) n = new THREE.Vector3(Math.sign(_pa.x) || 1, 0, 0)
        else if (ly <= lz) n = new THREE.Vector3(0, 1, 0)
        else n = new THREE.Vector3(0, 0, Math.sign(_pa.z) || 1)
        n.applyQuaternion(b.quat)
        _delta.copy(pw).sub(qw)
        const dir = dist > 1e-6 ? _delta.normalize() : n.clone()
        out.push({ n: dir, pen: r + Math.min(lx, ly, lz), brush: b, point: qw.clone() })
      }
    }
    return out
  }

  penetrationOnly (pos, r, h) {
    const out = this._c1 || (this._c1 = [])
    this.capsuleContacts(pos, r, h, out)
    let worst = 0
    for (const c of out) if (c.pen > worst) worst = c.pen
    return worst
  }

  // Ray vs world. Returns {dist, point, normal, brush} or null.
  raycast (ro, rd, maxDist = 500) {
    const end = new THREE.Vector3(ro.x + rd.x * maxDist, ro.y + rd.y * maxDist, ro.z + rd.z * maxDist)
    const min = new THREE.Vector3(Math.min(ro.x, end.x), Math.min(ro.y, end.y), Math.min(ro.z, end.z))
    const max = new THREE.Vector3(Math.max(ro.x, end.x), Math.max(ro.y, end.y), Math.max(ro.z, end.z))
    const list = this._q2 || (this._q2 = [])
    this.queryBox(min, max, list)
    let best = maxDist
    let hit = null
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      const o = _pa.copy(ro).sub(b.center).applyQuaternion(b.inv)
      const d = _pb.copy(rd).applyQuaternion(b.inv)
      let tmin = 0
      let tmax = best
      let axis = 0
      let sign = 1
      let ok = true
      for (let a = 0; a < 3; a++) {
        const oo = a === 0 ? o.x : a === 1 ? o.y : o.z
        const dd = a === 0 ? d.x : a === 1 ? d.y : d.z
        const hh = a === 0 ? b.half.x : a === 1 ? b.half.y : b.half.z
        if (Math.abs(dd) < 1e-8) {
          if (oo < -hh || oo > hh) { ok = false; break }
        } else {
          const inv = 1 / dd
          let t1 = (-hh - oo) * inv
          let t2 = (hh - oo) * inv
          let s = -1
          if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1 }
          if (t1 > tmin) { tmin = t1; axis = a; sign = s }
          if (t2 < tmax) tmax = t2
          if (tmin > tmax) { ok = false; break }
        }
      }
      if (!ok || tmin <= 0.0001 || tmin >= best) continue
      best = tmin
      const ln = new THREE.Vector3()
      if (axis === 0) ln.x = sign
      else if (axis === 1) ln.y = sign
      else ln.z = sign
      hit = {
        dist: tmin,
        point: new THREE.Vector3(ro.x + rd.x * tmin, ro.y + rd.y * tmin, ro.z + rd.z * tmin),
        normal: ln.applyQuaternion(b.quat),
        brush: b,
      }
    }
    return hit
  }

  // Ray vs capsule (used for entity hit detection). a→b is the inner segment.
  static rayCapsule (ro, rd, a, b, r) {
    const ba = new THREE.Vector3().subVectors(b, a)
    const oa = new THREE.Vector3().subVectors(ro, a)
    const baba = ba.dot(ba)
    const bard = ba.dot(rd)
    const baoa = ba.dot(oa)
    const rdoa = rd.dot(oa)
    const oaoa = oa.dot(oa)
    let A = baba - bard * bard
    let B = baba * rdoa - baoa * bard
    let C = baba * oaoa - baoa * baoa - r * r * baba
    let h = B * B - A * C
    if (h >= 0 && Math.abs(A) > 1e-9) {
      const t = (-B - Math.sqrt(h)) / A
      const y = baoa + t * bard
      if (y > 0 && y < baba) return t > 0 ? t : 0
      const oc = y <= 0 ? oa : new THREE.Vector3().subVectors(ro, b)
      B = rd.dot(oc)
      C = oc.dot(oc) - r * r
      h = B * B - C
      if (h > 0) {
        const t2 = -B - Math.sqrt(h)
        return t2 > 0 ? t2 : 0
      }
      return null
    }
    return null
  }
}

export { clamp }

// Allocation-free deepest-contact query (used by step-up probes).
const _nOut = new THREE.Vector3()
PhysicsWorld.prototype.deepestContact = function (pos, r, h, outNormal) {
  const list = this._q3 || (this._q3 = [])
  const min = new THREE.Vector3(pos.x - r, pos.y - r * 0.5, pos.z - r)
  const max = new THREE.Vector3(pos.x + r, pos.y + h + r * 0.5, pos.z + r)
  this.queryBox(min, max, list)
  let bestPen = 0
  let bestN = null
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    const wax = pos.x, way = pos.y + r, waz = pos.z
    const wbx = pos.x, wby = pos.y + h - r, wbz = pos.z
    _pa.set(wax, way, waz).sub(b.center).applyQuaternion(b.inv)
    _pb.set(wbx, wby, wbz).sub(b.center).applyQuaternion(b.inv)
    const d2 = closestOnSegmentToBox(_pa.x, _pa.y, _pa.z, _pb.x, _pb.y, _pb.z, b.half.x, b.half.y, b.half.z)
    const dist = Math.sqrt(d2)
    if (dist > 1e-5) {
      const pen = r - dist
      if (pen <= 0) continue
      const pw = _pa.clone().applyQuaternion(b.quat).add(b.center)
      const qw = _q.clone().applyQuaternion(b.quat).add(b.center)
      if (pen > bestPen) {
        bestPen = pen
        bestN = _nOut.copy(pw).sub(qw).divideScalar(dist).clone()
      }
    } else {
      const lx = b.half.x - Math.abs(_pa.x)
      const lyUp = b.half.y - _pa.y
      const lyDown = b.half.y + _pa.y + 1000
      const ly = Math.min(lyUp, lyDown)
      const lz = b.half.z - Math.abs(_pa.z)
      const pen = r + Math.min(lx, ly, lz)
      if (pen > bestPen) {
        bestPen = pen
        const n = new THREE.Vector3()
        if (lx <= ly && lx <= lz) n.x = Math.sign(_pa.x) || 1
        else if (ly <= lz) n.y = 1
        else n.z = Math.sign(_pa.z) || 1
        bestN = n.applyQuaternion(b.quat)
      }
    }
  }
  if (outNormal && bestN) outNormal.copy(bestN)
  return bestPen
}

PhysicsWorld.prototype.overlaps = function (pos, r, h) {
  return this.deepestContact(pos, r, h, null) > 1e-3
}
