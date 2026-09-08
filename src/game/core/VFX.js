import * as THREE from 'three'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _v = new THREE.Vector3()
const _s = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

// ────────────────────────────────────────────────────────────────────────────
//  Pooled, low-poly effects: sparks, tracers, beams, booms, smoke, flashes.
// ────────────────────────────────────────────────────────────────────────────
export class VFX {
  constructor (scene) {
    this.scene = scene
    this.time = 0

    // ── particles (instanced cubes) ────────────────────────────────────────
    this.pCount = 900
    const pg = new THREE.BoxGeometry(1, 1, 1)
    const pm = new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: false })
    this.particles = new THREE.InstancedMesh(pg, pm, this.pCount)
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.particles.frustumCulled = false
    this.particles.count = this.pCount
    scene.add(this.particles)
    this.pData = new Array(this.pCount).fill(null).map(() => ({
      life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      size: 0.1, grav: 18, drag: 0.6, spin: 0, rot: 0,
    }))
    this.pHead = 0
    this._color = new THREE.Color()

    // ── tracers ────────────────────────────────────────────────────────────
    this.tracers = []
    for (let i = 0; i < 56; i++) {
      const g = new THREE.BoxGeometry(1, 1, 1)
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, toneMapped: false })
      const mesh = new THREE.Mesh(g, m)
      mesh.visible = false
      mesh.frustumCulled = false
      scene.add(mesh)
      this.tracers.push({ mesh, life: 0, max: 0.08 })
    }
    this.tHead = 0

    // ── beams ──────────────────────────────────────────────────────────────
    this.beams = []
    for (let i = 0; i < 12; i++) {
      const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, toneMapped: false })
      const mesh = new THREE.Mesh(g, m)
      mesh.visible = false
      scene.add(mesh)
      this.beams.push({ mesh, life: 0, max: 0.12 })
    }
    this.bHead = 0

    // ── smoke puffs ────────────────────────────────────────────────────────
    this.smoke = []
    const sg = new THREE.IcosahedronGeometry(1, 0)
    for (let i = 0; i < 90; i++) {
      const m = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.5, flatShading: true })
      const mesh = new THREE.Mesh(sg, m)
      mesh.visible = false
      scene.add(mesh)
      this.smoke.push({ mesh, life: 0, max: 1, size: 1, vel: new THREE.Vector3() })
    }
    this.sHead = 0

    // ── booms ──────────────────────────────────────────────────────────────
    this.booms = []
    for (let i = 0; i < 10; i++) {
      const g = new THREE.IcosahedronGeometry(1, 1)
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, toneMapped: false })
      const mesh = new THREE.Mesh(g, m)
      mesh.visible = false
      scene.add(mesh)
      this.booms.push({ mesh, life: 0, max: 0.45, size: 1 })
    }
    this.boomHead = 0

    // ── muzzle flashes ─────────────────────────────────────────────────────
    this.flashes = []
    for (let i = 0; i < 8; i++) {
      const g = new THREE.ConeGeometry(1, 1, 5)
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, toneMapped: false })
      const mesh = new THREE.Mesh(g, m)
      mesh.visible = false
      scene.add(mesh)
      const light = new THREE.PointLight(0xffcc88, 0, 8)
      light.visible = false
      scene.add(light)
      this.flashes.push({ mesh, light, life: 0, max: 0.06 })
    }
    this.fHead = 0
  }

  particle (pos, vel, color, size, life, grav = 18, drag = 0.6) {
    const p = this.pData[this.pHead]
    this.pHead = (this.pHead + 1) % this.pCount
    p.life = p.max = life
    p.pos.copy(pos)
    p.vel.copy(vel)
    p.size = size
    p.grav = grav
    p.drag = drag
    p.rot = Math.random() * 6.28
    p.spin = (Math.random() - 0.5) * 14
    this._pColor = color
    this.particles.setColorAt(this.pHead === 0 ? this.pCount - 1 : this.pHead - 1, this._color.set(color))
    if (this.particles.instanceColor) this.particles.instanceColor.needsUpdate = true
  }

  burst (pos, count, color, speed, size, life, grav = 18) {
    for (let i = 0; i < count; i++) {
      const dir = _v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
      this.particle(pos, dir.multiplyScalar(speed * (0.4 + Math.random())), color,
        size * (0.5 + Math.random()), life * (0.6 + Math.random() * 0.7), grav)
    }
  }

  impact (point, normal, color = 0xffd9a0, count = 7) {
    for (let i = 0; i < count; i++) {
      const dir = _v.copy(normal).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.9)).normalize()
      this.particle(point, dir.multiplyScalar(3 + Math.random() * 5), color, 0.035 + Math.random() * 0.05, 0.28 + Math.random() * 0.3, 16, 1.6)
    }
  }

  bloodPuff (point, dir) {
    for (let i = 0; i < 6; i++) {
      const d = _v.copy(dir).multiplyScalar(-1).add(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5)).normalize()
      this.particle(point, d.multiplyScalar(2 + Math.random() * 4), 0xff4d6d, 0.05, 0.35, 14, 1.2)
    }
  }

  tracer (from, to, color = 0xfff0b0, width = 0.022, life = 0.07) {
    const t = this.tracers[this.tHead]
    this.tHead = (this.tHead + 1) % this.tracers.length
    const d = _v.copy(to).sub(from)
    const len = d.length()
    if (len < 0.01) return
    t.mesh.position.copy(from).addScaledVector(d, 0.5)
    t.mesh.quaternion.setFromUnitVectors(UP, d.clone().normalize())
    t.mesh.scale.set(width, len, width)
    t.mesh.material.color.setHex(color)
    t.mesh.material.opacity = 1
    t.mesh.visible = true
    t.life = t.max = life
  }

  beam (from, to, color = 0xb388ff, width = 0.05, life = 0.1) {
    const b = this.beams[this.bHead]
    this.bHead = (this.bHead + 1) % this.beams.length
    const d = _v.copy(to).sub(from)
    const len = d.length()
    if (len < 0.01) return
    b.mesh.position.copy(from).addScaledVector(d, 0.5)
    b.mesh.quaternion.setFromUnitVectors(UP, d.clone().normalize())
    b.mesh.scale.set(width, len, width)
    b.mesh.material.color.setHex(color)
    b.mesh.material.opacity = 0.9
    b.mesh.visible = true
    b.life = b.max = life
  }

  explosion (pos, radius = 5, color = 0xffa14a) {
    const b = this.booms[this.boomHead]
    this.boomHead = (this.boomHead + 1) % this.booms.length
    b.mesh.position.copy(pos)
    b.mesh.material.color.setHex(color)
    b.mesh.visible = true
    b.life = b.max = 0.45
    b.size = radius
    this.burst(pos, 26, color, radius * 3.2, 0.14, 0.6, 12)
    this.burst(pos, 10, 0x3a3a3a, radius * 1.4, 0.3, 1.1, 2)
    for (let i = 0; i < 6; i++) this.smokePuff(pos, radius * 0.4, 0x555f6b, 1.6 + Math.random())
  }

  smokePuff (pos, size, color = 0xbfc7d1, dur = 3) {
    const s = this.smoke[this.sHead]
    this.sHead = (this.sHead + 1) % this.smoke.length
    s.mesh.position.copy(pos)
    s.mesh.material.color.setHex(color)
    s.mesh.visible = true
    s.life = s.max = dur
    s.size = size
    s.vel.set((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6)
    return s
  }

  muzzle (pos, dir, scale = 1, color = 0xffd9a0) {
    const f = this.flashes[this.fHead]
    this.fHead = (this.fHead + 1) % this.flashes.length
    f.mesh.position.copy(pos)
    f.mesh.quaternion.setFromUnitVectors(UP, dir.clone().normalize())
    const s = 0.16 * scale
    f.mesh.scale.set(s, s * 2.1, s)
    f.mesh.material.color.setHex(color)
    f.mesh.material.opacity = 1
    f.mesh.visible = true
    f.light.position.copy(pos)
    f.light.intensity = 6 * scale
    f.light.visible = true
    f.life = f.max = 0.055
  }

  update (dt) {
    this.time += dt
    // particles
    const data = this.pData
    for (let i = 0; i < this.pCount; i++) {
      const p = data[i]
      if (p.life <= 0) continue
      p.life -= dt
      if (p.life <= 0) {
        _s.set(0, 0, 0)
        _m.compose(p.pos, _q.identity(), _s)
        this.particles.setMatrixAt(i, _m)
        continue
      }
      p.vel.y -= p.grav * dt
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt))
      p.pos.addScaledVector(p.vel, dt)
      p.rot += p.spin * dt
      const k = p.life / p.max
      const sz = p.size * (0.35 + 0.65 * k)
      _q.setFromAxisAngle(UP, p.rot)
      _s.set(sz, sz, sz)
      _m.compose(p.pos, _q, _s)
      this.particles.setMatrixAt(i, _m)
    }
    this.particles.instanceMatrix.needsUpdate = true
    // tracers
    for (const t of this.tracers) {
      if (t.life <= 0) continue
      t.life -= dt
      if (t.life <= 0) { t.mesh.visible = false; continue }
      t.mesh.material.opacity = t.life / t.max
    }
    for (const b of this.beams) {
      if (b.life <= 0) continue
      b.life -= dt
      if (b.life <= 0) { b.mesh.visible = false; continue }
      b.mesh.material.opacity = 0.9 * (b.life / b.max)
      b.mesh.scale.x = b.mesh.scale.z = b.mesh.scale.x * (0.6 + 0.4 * (b.life / b.max))
    }
    for (const b of this.booms) {
      if (b.life <= 0) continue
      b.life -= dt
      if (b.life <= 0) { b.mesh.visible = false; continue }
      const k = 1 - b.life / b.max
      const s = b.size * (0.25 + k * 0.85)
      b.mesh.scale.set(s, s, s)
      b.mesh.material.opacity = 0.85 * (1 - k) ** 1.5
      b.mesh.rotation.y += dt * 3
      b.mesh.rotation.x += dt * 2
    }
    for (const s of this.smoke) {
      if (s.life <= 0) continue
      s.life -= dt
      if (s.life <= 0) { s.mesh.visible = false; continue }
      const k = 1 - s.life / s.max
      s.mesh.position.addScaledVector(s.vel, dt)
      s.vel.multiplyScalar(1 - dt * 0.8)
      const sz = s.size * (0.5 + k * 1.6)
      s.mesh.scale.set(sz, sz, sz)
      s.mesh.material.opacity = 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k * 0.3)
      s.mesh.rotation.y += dt * 0.6
    }
    for (const f of this.flashes) {
      if (f.life <= 0) continue
      f.life -= dt
      if (f.life <= 0) {
        f.mesh.visible = false
        f.light.visible = false
        f.light.intensity = 0
        continue
      }
      const k = f.life / f.max
      f.mesh.material.opacity = k
      f.light.intensity = 6 * k
    }
  }

  clear () {
    for (const p of this.pData) p.life = 0
    for (const t of this.tracers) { t.life = 0; t.mesh.visible = false }
    for (const b of this.beams) { b.life = 0; b.mesh.visible = false }
    for (const b of this.booms) { b.life = 0; b.mesh.visible = false }
    for (const s of this.smoke) { s.life = 0; s.mesh.visible = false }
    for (const f of this.flashes) { f.life = 0; f.mesh.visible = false; f.light.visible = false }
    this.update(0.016)
  }
}
