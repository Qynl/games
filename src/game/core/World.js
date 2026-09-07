import * as THREE from 'three'
import { PhysicsWorld, Brush } from './Physics.js'
import { PAL } from '../data/maps.js'

// Builds the render scene + collision world from the same brush list, so what
// you see is exactly what you hit. All static geometry is one InstancedMesh.
export class World {
  constructor (map) {
    this.map = map
    this.scene = new THREE.Scene()
    this.physics = new PhysicsWorld(8)
    this.group = new THREE.Group()
    this.scene.add(this.group)
    this.buildSky(map)
    this.buildLights()
    this.buildBrushes(map)
    this.physics.build()
  }

  buildSky (map) {
    const [top, bottom] = map.sky
    this.scene.background = new THREE.Color(bottom)
    this.scene.fog = new THREE.Fog(map.fog, map.fogNear, map.fogFar)
    const geo = new THREE.SphereGeometry(400, 16, 12)
    const matSky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
        void main(){ float h = clamp(vP.y / 400.0 * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }`,
    })
    const sky = new THREE.Mesh(geo, matSky)
    sky.frustumCulled = false
    this.scene.add(sky)
  }

  buildLights () {
    const hemi = new THREE.HemisphereLight(0x9fd8ff, 0x2a2f38, 1.15)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xfff2e0, 1.55)
    sun.position.set(60, 90, 40)
    this.scene.add(sun)
    const rim = new THREE.DirectionalLight(0x6ee7ff, 0.5)
    rim.position.set(-50, 40, -60)
    this.scene.add(rim)
    this.sun = sun
  }

  buildBrushes (map) {
    const n = map.brushes.length
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshLambertMaterial({ flatShading: true })
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const pos = new THREE.Vector3()
    const scl = new THREE.Vector3()
    const col = new THREE.Color()
    map.brushes.forEach((b, i) => {
      const br = this.physics.add(new Brush(b))
      e.set(b.rot[0], b.rot[1], b.rot[2], 'YXZ')
      q.setFromEuler(e)
      pos.set(b.center[0], b.center[1], b.center[2])
      scl.set(b.half[0] * 2, b.half[1] * 2, b.half[2] * 2)
      m4.compose(pos, q, scl)
      mesh.setMatrixAt(i, m4)
      // subtle per-brush tint variation keeps big flat areas from going dead
      const tint = 0.92 + ((i * 2654435761) % 1000) / 1000 * 0.16
      col.setHex(b.color ?? PAL.wall).multiplyScalar(tint)
      mesh.setColorAt(i, col)
      this.brushRefs = this.brushRefs || []
      this.brushRefs.push(br)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.castShadow = false
    mesh.receiveShadow = false
    this.mesh = mesh
    this.group.add(mesh)

    // edge outlines — the "stylised" pass that makes the lowpoly read cleanly
    const edges = new THREE.Group()
    const em = new THREE.LineBasicMaterial({ color: 0x0d1117, transparent: true, opacity: 0.32 })
    let added = 0
    for (const b of map.brushes) {
      if (added > 260) break
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(b.half[0] * 2, b.half[1] * 2, b.half[2] * 2))
      const l = new THREE.LineSegments(g, em)
      l.position.set(b.center[0], b.center[1], b.center[2])
      l.rotation.set(b.rot[0], b.rot[1], b.rot[2])
      l.rotation.order = 'YXZ'
      edges.add(l)
      added++
    }
    this.edges = edges
    this.group.add(edges)
  }

  dispose () {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
        else o.material.dispose()
      }
    })
  }
}
