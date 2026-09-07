import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, useWorld } from '../world/WorldStore'
import type { WorldObject } from '../types'

function PrefabMesh({ o }: { o: WorldObject }): JSX.Element {
  const { shape, color } = o
  const mat = (
    <meshStandardMaterial
      color={color}
      roughness={0.82}
      metalness={shape === 'coin' ? 0.7 : 0.06}
      emissive={shape === 'coin' ? color : '#000000'}
      emissiveIntensity={shape === 'coin' ? 0.4 : 0}
    />
  )
  switch (shape) {
    case 'cube':
      return (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 1.4, 1.4]} />
          {mat}
        </mesh>
      )
    case 'sphere':
      return (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.8, 24, 18]} />
          {mat}
        </mesh>
      )
    case 'cylinder':
      return (
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.55, 1.8, 20]} />
          {mat}
        </mesh>
      )
    case 'cone':
      return (
        <mesh castShadow>
          <coneGeometry args={[0.75, 1.8, 20]} />
          {mat}
        </mesh>
      )
    case 'coin':
      return (
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.55, 0.55, 0.14, 24]} />
          {mat}
        </mesh>
      )
    case 'ramp':
      return (
        <mesh rotation-x={-Math.PI / 2} castShadow>
          <cylinderGeometry args={[1.7, 1.7, 0.8, 3]} />
          {mat}
        </mesh>
      )
    case 'wall':
      return (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5, 3, 0.4]} />
          {mat}
        </mesh>
      )
    case 'tree':
      return (
        <group>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.4, 1.8, 8]} />
            <meshStandardMaterial color="#7a5230" roughness={1} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <coneGeometry args={[1.5, 2.2, 9]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[1.1, 1.6, 9]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </group>
      )
    case 'house':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[3.4, 2.4, 3]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh position={[0, 3, 0]} rotation-y={Math.PI / 4} castShadow>
            <coneGeometry args={[2.7, 1.7, 4]} />
            <meshStandardMaterial color="#b3544a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, 1.52]}>
            <boxGeometry args={[0.8, 1.5, 0.08]} />
            <meshStandardMaterial color="#7a5230" roughness={0.9} />
          </mesh>
        </group>
      )
    case 'tower':
      return (
        <group>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[1, 1.2, 6.5, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 6.7, 0]} castShadow>
            <coneGeometry args={[1.35, 1.5, 10]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      )
    case 'arch':
      return (
        <group>
          <mesh position={[-1.4, 1.4, 0]} castShadow>
            <boxGeometry args={[0.6, 2.8, 0.6]} />
            {mat}
          </mesh>
          <mesh position={[1.4, 1.4, 0]} castShadow>
            <boxGeometry args={[0.6, 2.8, 0.6]} />
            {mat}
          </mesh>
          <mesh position={[0, 3.1, 0]} castShadow>
            <boxGeometry args={[3.6, 0.6, 0.6]} />
            {mat}
          </mesh>
        </group>
      )
    case 'road':
      return (
        <mesh receiveShadow>
          <boxGeometry args={[9, 0.16, 44]} />
          <meshStandardMaterial color="#3a3f4d" roughness={0.95} />
        </mesh>
      )
  }
}

export function WorldObjects(): JSX.Element {
  const version = useWorld()
  const items = useMemo(() => Array.from(world.objects.values()), [version])
  const refs = useRef(new Map<string, THREE.Group>())

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    for (const o of world.objects.values()) {
      const g = refs.current.get(o.id)
      if (!g) continue
      g.position.set(o.position[0], o.position[1], o.position[2])
      g.rotation.set(o.rotation[0], o.rotation[1], o.rotation[2])
      g.scale.set(o.scale[0], o.scale[1], o.scale[2])
      if (o.shape === 'coin') g.rotation.y += dt * 2.2
    }
  })

  return (
    <group>
      {items.map((o) => (
        <group
          key={o.id}
          ref={(g) => {
            if (g) refs.current.set(o.id, g)
            else refs.current.delete(o.id)
          }}
        >
          <PrefabMesh o={o} />
        </group>
      ))}
    </group>
  )
}