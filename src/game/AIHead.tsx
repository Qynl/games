import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { world, useWorld } from '../world/WorldStore'
import { playerState } from '../player/state'
import { clamp, damp, rand } from '../utils/math'

export const AI_ANCHOR: [number, number, number] = [16, 6.5, -16]

export function AIHead(): JSX.Element {
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const leftEye = useRef<THREE.Mesh>(null)
  const rightEye = useRef<THREE.Mesh>(null)
  const pupils = useRef<THREE.Group>(null)
  const xeyes = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const leftHand = useRef<THREE.Mesh>(null)
  const rightHand = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const skin = useRef<THREE.MeshStandardMaterial>(null)
  const antenna = useRef<THREE.MeshStandardMaterial>(null)
  useWorld()

  const blinkTimer = useRef(rand(1.5, 4))
  const blinkPhase = useRef(0)
  const dartTimer = useRef(rand(0.3, 0.9))

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    const mood = world.aiStatus.mood
    const g = outer.current
    if (!g) return

    // floating bob
    const excited = mood === 'excited' || mood === 'speaking'
    const bobSpeed = excited ? 2.6 : 1.2
    g.position.set(AI_ANCHOR[0], AI_ANCHOR[1] + Math.sin(t * bobSpeed) * 0.35, AI_ANCHOR[2])

    // face the player
    const p = playerState.pos
    const dx = p.x - g.position.x
    const dz = p.z - g.position.z
    const dy = p.y + 1.5 - g.position.y
    if (inner.current) {
      inner.current.rotation.y = damp(inner.current.rotation.y, Math.atan2(dx, dz), 3, dt)
      const targetPitch = Math.atan2(dy, Math.hypot(dx, dz))
      inner.current.rotation.x = damp(inner.current.rotation.x, targetPitch, 2.5, dt)
      inner.current.rotation.z = damp(inner.current.rotation.z, mood === 'working' ? Math.sin(t * 3) * 0.05 : 0, 2, dt)
    }

    // blink
    blinkTimer.current -= dt
    if (blinkTimer.current <= 0) {
      blinkPhase.current = 0.12
      blinkTimer.current = rand(1.8, 4.5)
    }
    const eyeOpen = blinkPhase.current > 0 ? Math.abs(Math.sin((0.12 - blinkPhase.current) * 40)) : 1
    if (blinkPhase.current > 0) blinkPhase.current -= dt
    let eyeScaleY = eyeOpen
    if (mood === 'thinking') eyeScaleY *= 0.7
    if (mood === 'error') eyeScaleY *= 0.4
    leftEye.current?.scale.set(1, Math.max(0.05, eyeScaleY), 1)
    rightEye.current?.scale.set(1, Math.max(0.05, eyeScaleY), 1)

    // pupils track the player, dart when thinking
    if (pupils.current) {
      if (mood === 'thinking') {
        dartTimer.current -= dt
        if (dartTimer.current <= 0) {
          dartTimer.current = rand(0.25, 0.7)
          pupils.current.position.set(rand(-0.1, 0.1), rand(-0.08, 0.08), 0)
        }
      } else if (mood === 'error') {
        pupils.current.position.set(0, 0, 0)
      } else {
        pupils.current.position.set(
          clamp(dx * 0.004, -0.09, 0.09),
          clamp(dy * 0.006, -0.07, 0.07),
          0
        )
      }
    }
    const hasX = mood === 'error'
    if (pupils.current) pupils.current.visible = !hasX
    if (xeyes.current) xeyes.current.visible = hasX

    // mouth
    if (mouth.current) {
      if (mood === 'speaking') {
        mouth.current.scale.y = 0.55 + Math.sin(t * 14) * 0.45
        mouth.current.scale.x = 1
      } else if (mood === 'excited') {
        mouth.current.scale.set(1.2, 1.15, 1)
      } else if (mood === 'working') {
        mouth.current.scale.set(1.05, 1.0, 1)
      } else if (mood === 'error') {
        mouth.current.scale.set(0.8, 0.85, 1)
      } else {
        mouth.current.scale.set(1, 1, 1)
      }
    }

    // typing hands
    const typing = mood === 'working' || mood === 'speaking'
    if (leftHand.current) {
      leftHand.current.position.y = -0.85 + (typing ? Math.sin(t * 22) * 0.09 : 0)
      leftHand.current.rotation.z = typing ? Math.sin(t * 17) * 0.3 : 0.15
    }
    if (rightHand.current) {
      rightHand.current.position.y = -0.85 + (typing ? Math.sin(t * 22 + 2) * 0.09 : 0)
      rightHand.current.rotation.z = typing ? Math.sin(t * 17 + 2) * -0.3 : -0.15
    }

    // halo ring
    if (ring.current) ring.current.rotation.z += dt * 0.7

    // emissive state
    if (skin.current) {
      if (mood === 'error') {
        skin.current.emissive.set('#ff3b3b')
        skin.current.emissiveIntensity = 0.6 + Math.sin(t * 8) * 0.3
      } else if (mood === 'working') {
        skin.current.emissive.set('#3ecf8e')
        skin.current.emissiveIntensity = 0.28
      } else if (mood === 'speaking' || mood === 'excited') {
        skin.current.emissive.set('#5ec8ff')
        skin.current.emissiveIntensity = 0.3
      } else {
        skin.current.emissive.set('#1a2b4a')
        skin.current.emissiveIntensity = 0.15
      }
    }
    if (antenna.current) {
      antenna.current.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.35
    }
  })

  const bubble =
    world.aiStatus.speaking ??
    (world.aiStatus.mood === 'thinking'
      ? '…'
      : world.aiStatus.mood === 'error'
        ? '!!!'
        : null)

  return (
    <group ref={outer} position={AI_ANCHOR}>
      <group ref={inner}>
        {/* main head */}
        <mesh castShadow>
          <sphereGeometry args={[1.05, 32, 24]} />
          <meshStandardMaterial
            ref={skin}
            color="#9fd8ff"
            roughness={0.35}
            metalness={0.15}
            emissive="#1a2b4a"
            emissiveIntensity={0.15}
          />
        </mesh>
        {/* eyes */}
        <mesh ref={leftEye} position={[-0.34, 0.12, 0.92]}>
          <sphereGeometry args={[0.26, 20, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh ref={rightEye} position={[0.34, 0.12, 0.92]}>
          <sphereGeometry args={[0.26, 20, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* pupils */}
        <group ref={pupils} position={[0, 0, 1.12]}>
          <mesh position={[-0.28, 0, 0]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color="#0d1220" roughness={0.3} />
          </mesh>
          <mesh position={[0.28, 0, 0]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color="#0d1220" roughness={0.3} />
          </mesh>
        </group>
        {/* X eyes (error state) */}
        <group ref={xeyes} position={[0, 0, 1.12]} visible={false}>
          {[-0.28, 0.28].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh rotation-z={Math.PI / 4}>
                <boxGeometry args={[0.22, 0.035, 0.035]} />
                <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={1} />
              </mesh>
              <mesh rotation-z={-Math.PI / 4}>
                <boxGeometry args={[0.22, 0.035, 0.035]} />
                <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={1} />
              </mesh>
            </group>
          ))}
        </group>
        {/* mouth */}
        <mesh ref={mouth} position={[0, -0.38, 1.0]}>
          <torusGeometry args={[0.27, 0.05, 10, 24]} />
          <meshStandardMaterial color="#0d1220" roughness={0.4} />
        </mesh>
        {/* hands */}
        <mesh ref={leftHand} position={[-1.35, -0.85, 0.15]} rotation-z={0.15}>
          <boxGeometry args={[0.3, 0.5, 0.24]} />
          <meshStandardMaterial color="#8fd8f2" roughness={0.4} />
        </mesh>
        <mesh ref={rightHand} position={[1.35, -0.85, 0.15]} rotation-z={-0.15}>
          <boxGeometry args={[0.3, 0.5, 0.24]} />
          <meshStandardMaterial color="#8fd8f2" roughness={0.4} />
        </mesh>
        {/* halo ring */}
        <mesh ref={ring} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.55, 0.035, 8, 48]} />
          <meshStandardMaterial color="#3ecf8e" emissive="#3ecf8e" emissiveIntensity={0.8} />
        </mesh>
        {/* antenna */}
        <mesh position={[0, 1.28, 0]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial ref={antenna} color="#5ec8ff" emissive="#5ec8ff" emissiveIntensity={0.6} />
        </mesh>
        {/* nameplate */}
        <Html position={[0, 2.25, 0]} center zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.3em',
              color: '#a8f5b5',
              textShadow: '0 0 12px rgba(124,227,139,0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            CREATOR
          </div>
        </Html>
      </group>
      {/* speech bubble */}
      {bubble && (
        <Html position={[0, 3.6, 0]} center zIndexRange={[20, 5]} style={{ pointerEvents: 'none' }}>
          <div className="ai-bubble">{bubble}</div>
        </Html>
      )}
    </group>
  )
}