// GameScene — the R3F canvas: session loop, camera rig, environment,
// world entities, terrain and the AI head.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GameSession } from '../game/Session'
import { Environment } from './Environment'
import { WorldLayer } from './WorldObjects'
import { AiHead } from './AiHead'

function Terrain({ session }: { session: GameSession }) {
  const scene = useThree((s) => s.scene)
  const meshRef = useRef<THREE.Mesh>(null!)
  const geomRef = useRef<THREE.PlaneGeometry | null>(null)
  const keyRef = useRef('')
  useEffect(() => {
    const t = session.engine.api.terrain
    if (!t) {
      if (geomRef.current) {
        scene.remove(meshRef.current)
        geomRef.current.dispose()
        geomRef.current = null
      }
      return
    }
    const size = t.size ?? 160
    const amp = t.amplitude ?? 3.2
    const seed = t.seed ?? 0
    const key = `${seed}x${size}x${amp}`
    if (key === keyRef.current) return
    keyRef.current = key
    const seg = 96
    const g = new THREE.PlaneGeometry(size, size, seg, seg)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const base = new THREE.Color(t.color ?? '#5f8f4e')
    const light = new THREE.Color(t.color ?? '#5f8f4e').multiplyScalar(1.25)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = session.engine.groundHeightAt(x, z)
      pos.setY(i, y)
      const mix = THREE.MathUtils.clamp(y / Math.max(amp * 0.55, 1), 0, 1)
      const c = new THREE.Color().copy(base).lerp(light, mix)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    if (geomRef.current) {
      scene.remove(meshRef.current)
      geomRef.current.dispose()
    }
    geomRef.current = g
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
    meshRef.current = new THREE.Mesh(g, mat)
    meshRef.current.receiveShadow = true
    meshRef.current.position.set(0, 0, 0)
    scene.add(meshRef.current)
    return () => {
      // cleanup handled next effect run
    }
  }, [session, session.worldRev, scene])
  return null
}

function CameraRig({ session }: { session: GameSession }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const raf = useRef(0)
  useEffect(() => {
    session.camera = camera
    return () => {
      session.camera = null
      cancelAnimationFrame(raf.current)
    }
  }, [camera, session])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    session.update(dt)
    const cam = session.engine.camera
    const p = cam.eye
    camera.position.set(p.x, p.y, p.z)
    camera.lookAt(cam.target.x, cam.target.y, cam.target.z)
    const pcam = camera as THREE.PerspectiveCamera
    const targetFov = cam.fov ?? 74
    if (Math.abs(pcam.fov - targetFov) > 0.1) {
      pcam.fov += (targetFov - pcam.fov) * Math.min(1, dt * 5)
      pcam.updateProjectionMatrix()
    }
    const sh = cam.shake
    if (sh > 0.001) {
      const s = sh * 0.16
      camera.position.x += (Math.random() - 0.5) * s
      camera.position.y += (Math.random() - 0.5) * s
      camera.rotation.z += (Math.random() - 0.5) * s * 0.12
    }
    void gl
    void state
  })
  return null
}

export function GameCanvas({ session }: { session: GameSession }) {
  return (
    <div className="scene-holder">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 74, near: 0.08, far: 1600, position: [0, 4, 6] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <CameraRig session={session} />
        <Environment session={session} />
        <Terrain session={session} />
        <WorldLayer session={session} />
        <AiHead session={session} />
      </Canvas>
    </div>
  )
}
