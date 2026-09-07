import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useWorld } from '../world/WorldStore'
import { playerState } from '../player/state'

export function Vehicles(): JSX.Element {
  const version = useWorld()
  const list = useMemo(() => Array.from(world.vehicles.values()), [version])
  const refs = useRef(new Map<string, THREE.Group>())

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    for (const v of world.vehicles.values()) {
      const g = refs.current.get(v.id)
      if (!g) continue
      v.position[0] += v.direction * v.speed * dt
      if (v.position[0] > 40) v.direction = -1
      if (v.position[0] < -40) v.direction = 1
      const wob = Math.sin(Date.now() / 120) * 0.02
      g.position.set(v.position[0], v.position[1] + wob, v.position[2])
      g.rotation.y = v.direction === 1 ? Math.PI / 2 : -Math.PI / 2

      // knockback the player when it gets close
      const p = playerState.pos
      if (
        Math.abs(p.x - v.position[0]) < 1.7 &&
        Math.abs(p.z - v.position[2]) < 2.2 &&
        Math.abs(p.y - v.position[1]) < 1.8
      ) {
        playerState.vel.x += v.direction * v.speed * 2.2 * dt
        if (!world.feed.some((f) => f.text.startsWith('🚗') && Date.now() - f.time < 3000)) {
          world.addFeed('🚗 watch out!', 'world')
        }
      }
    }
  })

  return (
    <group>
      {list.map((v) => (
        <group
          key={v.id}
          ref={(g) => {
            if (g) refs.current.set(v.id, g)
            else refs.current.delete(v.id)
          }}
        >
          <group>
            {v.kind === 'truck' ? (
              <>
                <mesh position={[0, 0.55, 0]} castShadow>
                  <boxGeometry args={[2.8, 1.0, 1.3]} />
                  <meshStandardMaterial color={v.color} roughness={0.6} metalness={0.2} />
                </mesh>
                <mesh position={[1.35, 0.9, 0]} castShadow>
                  <boxGeometry args={[1.0, 0.75, 1.25]} />
                  <meshStandardMaterial color="#20283d" roughness={0.3} metalness={0.4} />
                </mesh>
              </>
            ) : (
              <>
                <mesh position={[0, 0.32, 0]} castShadow>
                  <boxGeometry args={[2.2, 0.5, 1.15]} />
                  <meshStandardMaterial color={v.color} roughness={0.55} metalness={0.25} />
                </mesh>
                <mesh position={[-0.1, 0.68, 0]} castShadow>
                  <boxGeometry args={[1.1, 0.4, 1.0]} />
                  <meshStandardMaterial color="#20283d" roughness={0.3} metalness={0.4} />
                </mesh>
              </>
            )}
            {[
              [-0.8, 0.28, 0.62],
              [-0.8, 0.28, -0.62],
              [0.8, 0.28, 0.62],
              [0.8, 0.28, -0.62],
            ].map(([wx, wy, wz], i) => (
              <mesh key={i} position={[wx, wy, wz]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.28, 0.28, 0.22, 12]} />
                <meshStandardMaterial color="#151a26" roughness={0.9} />
              </mesh>
            ))}
            <mesh position={[1.0, 0.32, 0.6]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color="#ffd54a" emissive="#ffd54a" emissiveIntensity={0.9} />
            </mesh>
            <mesh position={[1.0, 0.32, -0.6]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color="#ffd54a" emissive="#ffd54a" emissiveIntensity={0.9} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}