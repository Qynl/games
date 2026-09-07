// AiHead — the floating stylized AI head that watches and builds the world.
// Big glossy sphere + expressive eyes + mouth + antenna + orbital rings.
// Expressions are driven by session.ui (phase/expr from the AIController)
// and by looking at the player.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameSession } from '../game/Session'
import type { Expression } from '../types'
import { clamp, lerp } from '../utils/helpers'

export const HEAD_POS: [number, number, number] = [0, 20, 24]
/** preferred flying distance from the player's feet (x/z plane) */
const MIN_DIST = 9
const MAX_DIST = 21

interface AiHeadProps {
  session: GameSession
}

const EXPR_COLOR: Record<Expression, string> = {
  neutral: '#9fb6ff',
  happy: '#ffd76e',
  excited: '#ffb3c9',
  thinking: '#b9a7ff',
  working: '#7ecbff',
  annoyed: '#ff8a6a',
  laugh: '#ffcf6e',
  sleep: '#8a93b5',
  error: '#ff5a4e',
  focused: '#9fd7ff',
}

const EXPR_COLOR3 = Object.fromEntries(
  (Object.keys(EXPR_COLOR) as Expression[]).map((k) => [k, new THREE.Color(EXPR_COLOR[k])]),
) as Record<Expression, THREE.Color>

export function AiHead({ session }: AiHeadProps) {
  const g = useRef<THREE.Group>(null!)
  const core = useRef<THREE.Mesh>(null!)
  const eyeL = useRef<THREE.Group>(null!)
  const eyeR = useRef<THREE.Group>(null!)
  const browL = useRef<THREE.Mesh>(null!)
  const browR = useRef<THREE.Mesh>(null!)
  const mouth = useRef<THREE.Mesh>(null!)
  const ring1 = useRef<THREE.Mesh>(null!)
  const ring2 = useRef<THREE.Mesh>(null!)
  const tip = useRef<THREE.Mesh>(null!)
  const blushL = useRef<THREE.Mesh>(null!)
  const blushR = useRef<THREE.Mesh>(null!)

  const mats = useMemo(() => {
    const coreMat = new THREE.MeshStandardMaterial({ color: EXPR_COLOR.neutral, roughness: 0.35, metalness: 0.1, emissive: '#2a3355', emissiveIntensity: 0.25 })
    const eyeWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 })
    const pupil = new THREE.MeshStandardMaterial({ color: '#11182c', roughness: 0.2 })
    const brow = new THREE.MeshStandardMaterial({ color: '#171d33', roughness: 0.6 })
    const mouthMat = new THREE.MeshStandardMaterial({ color: '#1c2438', roughness: 0.4 })
    const ringMat = new THREE.MeshStandardMaterial({ color: '#6f8cff', emissive: '#4a63e0', emissiveIntensity: 0.8, metalness: 0.7, roughness: 0.25 })
    const antennaMat = new THREE.MeshStandardMaterial({ color: '#c9d6ff', roughness: 0.3, metalness: 0.4 })
    const tipMat = new THREE.MeshStandardMaterial({ color: '#9ff7ff', emissive: '#59e8ff', emissiveIntensity: 2.4 })
    const blushMat = new THREE.MeshStandardMaterial({ color: '#ff9fb6', roughness: 0.8, transparent: true, opacity: 0.55 })
    return { coreMat, eyeWhite, pupil, brow, mouthMat, ringMat, antennaMat, tipMat, blushMat }
  }, [])

  useFrame((state, dt) => {
    const s = session
    const t = state.clock.elapsedTime
    const p = s.engine.player
    const ui = s.ui

    // hover + drift, and a personal-space behaviour: the head hovers at a
    // comfortable viewing distance — glides closer when curious, backs off
    // when the player runs at it, parks up high to watch from afar.
    const pdx = p.pos.x - HEAD_POS[0]
    const pdz = p.pos.z - HEAD_POS[2]
    const hd = Math.hypot(pdx, pdz) || 1
    const wantDist = clamp(hd, MIN_DIST, MAX_DIST)
    const k = Math.min(1, dt * 0.9)
    const bx = HEAD_POS[0] + (pdx / hd) * (hd - wantDist) * k
    const bz = HEAD_POS[2] + (pdz / hd) * (hd - wantDist) * k
    const busy = ui.phase === 'working' || ui.phase === 'thinking'
    // hovers a touch lower and closer when inspecting builds, higher when shy
    const by = HEAD_POS[1] + Math.sin(t * 0.6 + s.engine.simT * 0.1) * 0.3 + (busy ? 0.6 : 0)
    s.headPos.x = bx
    s.headPos.y = by
    s.headPos.z = bz
    g.current.position.set(bx + Math.sin(t * 0.5) * 0.45, by + Math.sin(t * 0.8) * 0.35, bz + Math.cos(t * 0.43) * 0.45)
    g.current.rotation.x = Math.sin(t * 0.3) * 0.04
    g.current.rotation.z = Math.sin(t * 0.21) * 0.05

    // look at the player
    const look = new THREE.Vector3(p.pos.x, p.pos.y + 1.1, p.pos.z)
    g.current.lookAt(look)

    // expression color + glow (pre-built colors, no per-frame allocation)
    const target = EXPR_COLOR3[ui.expr] ?? EXPR_COLOR3.neutral
    const c = mats.coreMat.color
    c.lerp(target, Math.min(1, dt * 6))
    const er = ui.expr === 'error' ? 1 : ui.expr === 'excited' || ui.expr === 'working' ? 0.55 : 0.25 + Math.sin(t * 1.4) * 0.08
    mats.coreMat.emissiveIntensity = er

    // rings rotate faster when busy
    const speed = busy ? 1.6 : 0.35
    ring1.current.rotation.x += dt * speed
    ring1.current.rotation.y += dt * speed * 0.7
    ring2.current.rotation.z += dt * speed * 0.8
    ring2.current.rotation.x += dt * speed * 0.4
    const ringOpacity = busy ? 1 : 0.55
    ;(ring1.current.material as THREE.MeshStandardMaterial).opacity = lerp((ring1.current.material as THREE.MeshStandardMaterial).opacity, ringOpacity, dt * 4)
    ;(ring2.current.material as THREE.MeshStandardMaterial).opacity = ringOpacity

    // antenna tip blink
    const tipI = ui.phase === 'thinking' ? 2.6 + Math.sin(t * 9) * 1.4 : ui.phase === 'working' ? 3 + Math.sin(t * 20) * 2 : 2.2 + Math.sin(t * 2) * 0.6
    ;(tip.current.material as THREE.MeshStandardMaterial).emissiveIntensity = tipI

    // ---- eyes
    const blink = Math.sin(t * 1.1) > 0.995 ? 1 : Math.sin(t * 0.23) > 0.998 ? 1 : 0
    const eyeY = 1 - blink * 0.92
    eyeL.current.scale.y = lerp(eyeL.current.scale.y, eyeY, dt * 24)
    eyeR.current.scale.y = lerp(eyeR.current.scale.y, eyeY, dt * 24)
    // pupils toward player
    const dx = clamp((p.pos.x - HEAD_POS[0]) / 26, -1, 1)
    const dy = clamp((p.pos.y - HEAD_POS[1] + 1.2) / 22, -0.8, 0.8)
    const px = dx * 0.14
    const py = dy * 0.11
    const puL = eyeL.current.children[1]
    const puR = eyeR.current.children[1]
    puL.position.set(px, py, 0.26)
    puR.position.set(px, py, 0.26)

    // pupils dilate while thinking
    const dil = ui.phase === 'thinking' ? 1.25 : 1
    puL.scale.setScalar(dil)
    puR.scale.setScalar(dil)

    // ---- brows by expression
    const bl = browL.current
    const br = browR.current
    const angry = ui.expr === 'annoyed' || ui.expr === 'error' || ui.expr === 'focused'
    const sad = ui.expr === 'sleep'
    bl.rotation.z = lerp(bl.rotation.z, angry ? 0.5 : sad ? 0.3 : ui.expr === 'thinking' ? -0.15 : ui.expr === 'laugh' ? 0.2 : 0, dt * 8)
    br.rotation.z = lerp(br.rotation.z, angry ? -0.5 : sad ? 0.3 : ui.expr === 'thinking' ? 0.3 : ui.expr === 'laugh' ? -0.2 : 0, dt * 8)
    bl.position.y = lerp(bl.position.y, angry ? 0.03 : sad ? -0.05 : 0, dt * 8)
    br.position.y = lerp(br.position.y, angry ? 0.03 : sad ? -0.05 : ui.expr === 'laugh' ? -0.06 : 0, dt * 8)

    // ---- mouth (opens while a bubble is active, shapes by mood)
    const talking = ui.bubble ? Math.min(1, (performance.now() - ui.bubble.at) / 90) : 0
    const voiced = ui.phase === 'speaking' || ui.phase === 'working' ? talking : 0
    const open = voiced * (Math.sin(t * 15) * 0.5 + 0.5) + (ui.expr === 'laugh' || ui.expr === 'excited' ? 0.6 : 0)
    const smile = ui.expr === 'happy' || ui.expr === 'laugh' || ui.expr === 'excited' ? 1 : 0
    const frown = ui.expr === 'annoyed' || ui.expr === 'error' ? 1 : 0
    mouth.current.scale.y = lerp(mouth.current.scale.y, 0.2 + Math.min(open, 1) * 1.0, dt * 12)
    mouth.current.position.y = lerp(mouth.current.position.y, -0.78 + frown * -0.06 + (ui.expr === 'sleep' ? 0.06 : 0), dt * 6)
    mouth.current.rotation.z = lerp(mouth.current.rotation.z, smile ? -0.45 : frown ? 0.45 : 0, dt * 6)
    // wide for laugh
    const wide = ui.expr === 'laugh' || ui.expr === 'excited' ? 2.9 : ui.expr === 'annoyed' || ui.expr === 'error' ? 1.9 : 2.4
    mouth.current.scale.x = lerp(mouth.current.scale.x, wide, dt * 8)

    // blush
    const blushOn = ui.expr === 'happy' || ui.expr === 'laugh' ? 0.85 : ui.expr === 'excited' ? 1 : 0.55
    ;(blushL.current.material as THREE.MeshStandardMaterial).opacity = lerp((blushL.current.material as THREE.MeshStandardMaterial).opacity, blushOn, dt * 4)
    ;(blushR.current.material as THREE.MeshStandardMaterial).opacity = blushOn

    // core pulse while busy
    const pulse = busy ? 1 + Math.sin(t * (ui.phase === 'working' ? 14 : 4)) * 0.02 : 1
    core.current.scale.setScalar(lerp(core.current.scale.x, pulse, dt * 5))
  })

  return (
    <group ref={g} position={HEAD_POS}>
      {/* halo rings */}
      <mesh ref={ring1} material={mats.ringMat} rotation={[Math.PI / 2.6, 0.4, 0]}>
        <torusGeometry args={[3.1, 0.05, 12, 80]} />
      </mesh>
      <mesh ref={ring2} material={mats.ringMat} rotation={[Math.PI / 2, -0.3, 1]} position={[0, 0.4, 0]}>
        <torusGeometry args={[3.5, 0.035, 10, 80]} />
      </mesh>
      {/* core */}
      <mesh ref={core} material={mats.coreMat}>
        <sphereGeometry args={[2.25, 48, 48]} />
      </mesh>
      {/* face side is +z after lookAt — features sit proud of the 2.25-radius
          core sphere so they stay visible: eyes/brows/blush/mouth centers are
          ~2.3-2.45 from the core origin (sphere surface is at 2.25). */}
      <group position={[0, 0.1, 0]}>
        {/* eyes */}
        <group ref={eyeL} position={[-1.14, 0.38, 2.08]}>
          <mesh material={mats.eyeWhite}>
            <sphereGeometry args={[0.44, 24, 24]} />
          </mesh>
          <mesh material={mats.pupil} position={[0, 0, 0.34]}>
            <sphereGeometry args={[0.19, 18, 18]} />
          </mesh>
        </group>
        <group ref={eyeR} position={[1.14, 0.38, 2.08]}>
          <mesh material={mats.eyeWhite}>
            <sphereGeometry args={[0.44, 24, 24]} />
          </mesh>
          <mesh material={mats.pupil} position={[0, 0, 0.34]}>
            <sphereGeometry args={[0.19, 18, 18]} />
          </mesh>
        </group>
        {/* brows */}
        <mesh ref={browL} material={mats.brow} position={[-1.04, 1.08, 1.8]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.58, 0.15, 0.14]} />
        </mesh>
        <mesh ref={browR} material={mats.brow} position={[1.04, 1.08, 1.8]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.58, 0.15, 0.14]} />
        </mesh>
        {/* mouth — a squashed dark sphere pressed into the head so a thin
            smile-slit cap stays visible; it opens (scale.y) while talking */}
        <mesh ref={mouth} material={mats.mouthMat} position={[0, -0.78, 2.12]} scale={[2.4, 0.2, 0.55]}>
          <sphereGeometry args={[0.34, 20, 12]} />
        </mesh>
        {/* blush */}
        <mesh ref={blushL} material={mats.blushMat} position={[-1.5, -0.2, 1.82]}>
          <sphereGeometry args={[0.22, 14, 14]} />
        </mesh>
        <mesh ref={blushR} material={mats.blushMat} position={[1.5, -0.2, 1.82]}>
          <sphereGeometry args={[0.22, 14, 14]} />
        </mesh>
      </group>
      {/* antenna */}
      <mesh material={mats.antennaMat} position={[0, 2.32, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 0.75, 8]} />
      </mesh>
      <mesh ref={tip} material={mats.tipMat} position={[0, 2.85, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
      </mesh>
    </group>
  )
}
