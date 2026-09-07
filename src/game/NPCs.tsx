import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { world, useWorld } from '../world/WorldStore'
import { playerState } from '../player/state'
import { rand } from '../utils/math'

const targets = new Map<string, THREE.Vector3>()

export function NPCs(): JSX.Element {
  const version = useWorld()
  const list = useMemo(() => Array.from(world.npcs.values()), [version])
  const refs = useRef(new Map<string, THREE.Group>())

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = Date.now() / 1000
    for (const n of world.npcs.values()) {
      const g = refs.current.get(n.id)
      if (!g) continue
      let tx: number
      let tz: number
      if (n.hostile) {
        tx = playerState.pos.x
        tz = playerState.pos.z
      } else {
        let target = targets.get(n.id)
        if (!target) {
          target = new THREE.Vector3(n.position[0] + rand(-14, 14), 0, n.position[2] + rand(-14, 14))
          targets.set(n.id, target)
        }
        const dToT = Math.hypot(target.x - n.position[0], target.z - n.position[2])
        if (dToT < 1.5) {
          target.set(n.position[0] + rand(-14, 14), 0, n.position[2] + rand(-14, 14))
        }
        tx = target.x
        tz = target.z
      }
      const dx = tx - n.position[0]
      const dz = tz - n.position[2]
      const d = Math.hypot(dx, dz)
      const speed = n.speed * (n.hostile ? 1.5 : 1)
      if (d > 0.3) {
        const step = Math.min(d, speed * dt)
        n.position[0] += (dx / d) * step
        n.position[2] += (dz / d) * step
        g.rotation.y = Math.atan2(dx, dz)
      }
      const bob = Math.sin(t * 9) * 0.06 * (d > 0.3 ? 1 : 0)
      g.position.set(n.position[0], bob, n.position[2])
    }
  })

  return (
    <group>
      {list.map((n) => (
        <group
          key={n.id}
          ref={(g) => {
            if (g) refs.current.set(n.id, g)
            else refs.current.delete(n.id)
          }}
        >
          <mesh position={[0, 0.65, 0]} castShadow>
            <capsuleGeometry args={[0.35, 0.7, 6, 12]} />
            <meshStandardMaterial color={n.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshStandardMaterial color="#f0d9b5" roughness={0.7} />
          </mesh>
          <mesh position={[-0.12, 1.55, 0.26]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0.12, 1.55, 0.26]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {n.hostile && (
            <mesh position={[0, 1.5, 0]}>
              <torusGeometry args={[0.42, 0.05, 8, 20]} />
              <meshStandardMaterial color="#ff5252" emissive="#ff5252" emissiveIntensity={0.6} />
            </mesh>
          )}
          <Html
            position={[0, 2.1, 0]}
            center
            zIndexRange={[15, 5]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#fff',
                background: 'rgba(0,0,0,0.55)',
                padding: '2px 8px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                fontFamily: 'Rubik, sans-serif',
              }}
            >
              {n.hostile ? `⚠ ${n.name}` : n.name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}