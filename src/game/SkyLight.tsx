import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Stars } from '@react-three/drei'
import { world, useWorld } from '../world/WorldStore'
import { lerp } from '../utils/math'

const DAY = new THREE.Color('#7fb6e8')
const MORNING = new THREE.Color('#ffc28a')
const NIGHT = new THREE.Color('#0b1026')

function skyForTime(t: number, out: THREE.Color): void {
  if (t < 5.5 || t >= 20) {
    out.copy(NIGHT)
    return
  }
  if (t < 8) {
    out.copy(NIGHT).lerp(MORNING, (t - 5.5) / 2.5)
    return
  }
  if (t < 17) {
    out.copy(MORNING).lerp(DAY, (t - 8) / 9)
    return
  }
  out.copy(DAY).lerp(NIGHT, Math.min(1, (t - 17) / 3))
}

export function SkyLight(): JSX.Element {
  const { scene } = useThree()
  const sun = useRef<THREE.DirectionalLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  useWorld()

  const sky = useMemo(() => new THREE.Color(), [])
  const fogC = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const t = world.timeOfDay
    skyForTime(t, sky)
    scene.background = sky

    const isNight = t < 6.2 || t > 19.5
    if (world.weather === 'fog') {
      fogC.set('#b8bdc9')
      if (!scene.fog) scene.fog = new THREE.Fog(fogC, 40, 130)
      else (scene.fog as THREE.Fog).color.copy(fogC)
    } else if (scene.fog) {
      scene.fog = null
    }

    const elev = Math.sin(((t - 6) / 12) * Math.PI)
    const ang = ((t - 6) / 24) * Math.PI * 2
    const dayFactor = Math.max(0, elev)
    sun.current?.position.set(Math.cos(ang) * 70, Math.max(elev, 0.08) * 60, Math.sin(ang) * 70)
    if (sun.current) sun.current.intensity = lerp(0.3, 1.7, dayFactor)
    if (ambient.current) ambient.current.intensity = lerp(0.16, 0.55, dayFactor)
    if (hemi.current) hemi.current.intensity = lerp(0.08, 0.5, dayFactor)
  })

  const isNight = world.timeOfDay < 6.2 || world.timeOfDay > 19.5

  return (
    <>
      <ambientLight ref={ambient} intensity={0.5} />
      <hemisphereLight ref={hemi} args={['#cfe8ff', '#5b6a4a', 0.4]} />
      <directionalLight
        ref={sun}
        position={[30, 50, 30]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />
      {isNight && <Stars radius={160} depth={50} count={1400} factor={3.5} saturation={0} fade speed={0.6} />}
    </>
  )
}