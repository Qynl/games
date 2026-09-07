import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useWorld } from '../world/WorldStore'

function ParticleField({ kind }: { kind: 'rain' | 'snow' }): JSX.Element {
  const count = kind === 'rain' ? 700 : 400
  const group = useRef<THREE.Group>(null)
  const geo = useRef<THREE.BufferGeometry>(null)
  const camera = useThree((s) => s.camera)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80
      arr[i * 3 + 1] = Math.random() * 22
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    return arr
  }, [count])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const fall = kind === 'rain' ? 18 : 2.6
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= fall * dt
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 22
      if (kind === 'snow') positions[i * 3] += Math.sin(Date.now() / 500 + i) * dt
    }
    const attr = geo.current?.attributes.position
    if (attr) attr.needsUpdate = true
    if (group.current) {
      group.current.position.x = camera.position.x
      group.current.position.z = camera.position.z
    }
  })

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geo}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={kind === 'rain' ? '#9db8d8' : '#ffffff'}
          size={kind === 'rain' ? 0.06 : 0.14}
          sizeAttenuation
          transparent
          opacity={kind === 'rain' ? 0.65 : 0.9}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

export function WeatherFX(): JSX.Element | null {
  useWorld()
  if (world.weather === 'rain') return <ParticleField kind="rain" />
  if (world.weather === 'snow') return <ParticleField kind="snow" />
  return null
}