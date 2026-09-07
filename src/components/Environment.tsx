// Environment — sky dome color/fog, sun/moon, stars, rain, grid ground
// and any point lights the AI adds (setLight). Driven by api.timeOfDay.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameSession } from '../game/Session'

const NIGHT = new THREE.Color('#0b1026')
const DUSK = new THREE.Color('#ff8f5e')
const DAY = new THREE.Color('#86c3f5')
const FOG_NIGHT = new THREE.Color('#0d1226')
const FOG_DUSK = new THREE.Color('#c96a4e')
const FOG_DAY = new THREE.Color('#c4dcee')

const lerpC = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t)

function palette(timeOfDay: number) {
  const ang = ((timeOfDay - 6) / 24) * Math.PI * 2
  const elev = Math.sin(ang)
  const dayK = THREE.MathUtils.clamp(elev * 1.6, 0, 1)
  const nightK = THREE.MathUtils.clamp(-elev * 1.4, 0, 1)
  const dusk = Math.max(0, 1 - Math.abs(elev) / 0.16)
  const tw = Math.pow(1 - dayK, 3) * (1 - nightK * 0.4)
  let sky = lerpC(NIGHT, DAY, dayK)
  if (dusk > 0) sky = lerpC(sky, DUSK, Math.min(1, dusk * 0.9))
  let fog = lerpC(FOG_NIGHT, FOG_DAY, dayK)
  if (dusk > 0) fog = lerpC(fog, FOG_DUSK, dusk * 0.8)
  return { elev, dayK, nightK, dusk, tw, sky, fog }
}

interface EnvironmentProps {
  session: GameSession
}

export function Environment({ session }: EnvironmentProps) {
  const scene = useThree((s) => s.scene)
  const sunLight = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const sunBall = useRef<THREE.Mesh>(null!)
  const moonBall = useRef<THREE.Mesh>(null!)
  const stars = useRef<THREE.Points>(null!)
  const rain = useRef<THREE.Points>(null!)
  const cloud = useRef<THREE.Group>(null!)
  const grid = useRef<THREE.GridHelper>(null!)

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const b = Math.acos(Math.random() * 0.98)
      const r = 380
      pos[i * 3] = Math.cos(a) * Math.sin(b) * r
      pos[i * 3 + 1] = Math.cos(b) * r + 12
      pos[i * 3 + 2] = Math.sin(a) * Math.sin(b) * r
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const starMat = useMemo(() => new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false, depthWrite: false }), [])
  const rainGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = 550
    const pos = new Float32Array(n * 3)
    const rand = () => Math.random() - 0.5
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand() * 120
      pos[i * 3 + 1] = rand() * 50 + 10
      pos[i * 3 + 2] = rand() * 120
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const rainMat = useMemo(() => new THREE.PointsMaterial({ color: '#a8c4e8', size: 0.14, transparent: true, opacity: 0.75, depthWrite: false }), [])

  const fog = useMemo(() => new THREE.Fog(FOG_DAY.clone(), 140, 400), [])
  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])

  // point lights registry (the AI can add them via setLight)
  const pointLights = useRef(new Map<string, THREE.PointLight>())
  useEffect(() => {
    const lights = session.engine.api.lights.filter((l) => l.type !== 'sun')
    const wanted = new Set(lights.map((l) => l.id))
    for (const [id, l] of pointLights.current) {
      if (!wanted.has(id)) {
        scene.remove(l)
        pointLights.current.delete(id)
      }
    }
    for (const info of lights) {
      let l = pointLights.current.get(info.id)
      if (!l) {
        l = new THREE.PointLight(info.color, info.intensity, 0, 1.4)
        scene.add(l)
        pointLights.current.set(info.id, l)
      }
    }
  }, [session, session.worldRev, scene])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  const group = useMemo(() => new THREE.Object3D(), [])

  useFrame((state, dt) => {
    const api = session.engine.api
    const t = state.clock.elapsedTime
    const pal = palette(api.timeOfDay)
    const camPos = state.camera.position

    scene.background = pal.sky
    ;(fog.color as THREE.Color).copy(pal.fog)
    const rainOn = api.weather.rain
    const fogNear = 60 + Math.max(0, Math.min(api.sky.fogNear ?? 120, 240)) * 0.4 + (rainOn ? 30 : 0)
    const fogFar = (api.sky.fogFar ?? 400) - (rainOn ? 160 : 0)
    fog.near = fogNear
    fog.far = Math.max(fogFar, fogNear + 30)

    // sun/moon direction
    const az = ((api.timeOfDay - 6) / 24) * Math.PI * 2
    const dirX = Math.cos(az)
    const dirY = Math.sin(az)
    const dirZ = 0.35
    const sunDir = tmp.set(dirX, dirY, dirZ).normalize()
    const player = session.engine.player.pos
    sunLight.current.position.set(player.x + sunDir.x * 140, Math.max(player.y + sunDir.y * 140, 30), player.z + sunDir.z * 140)
    sunLight.current.target.position.set(player.x, player.y, player.z)
    const sunI = 0.25 + pal.dayK * 1.35
    sunLight.current.intensity = sunI
    ;(sunLight.current.color as THREE.Color).set(pal.dusk > 0.2 ? '#ffd9b0' : '#fff2dd')
    if (hemi.current) {
      ;(hemi.current.color as THREE.Color).copy(pal.sky)
      hemi.current.intensity = 0.32 + pal.dayK * 0.35 + (api.weather.rain ? 0.12 : 0)
    }
    // sun/moon sprites
    if (sunBall.current) {
      sunBall.current.position.copy(sunLight.current.position).multiplyScalar(0.72).add(new THREE.Vector3(player.x, player.y, player.z))
      sunBall.current.lookAt(player.x, player.y, player.z)
      ;(sunBall.current.material as THREE.MeshBasicMaterial).opacity = pal.dayK * 0.95
      sunBall.current.visible = pal.dayK > 0.03
    }
    if (moonBall.current) {
      const mPos = sunDir.clone().multiplyScalar(-1)
      moonBall.current.position.set(player.x + mPos.x * 300, player.y + Math.max(mPos.y, 0.2) * 300, player.z + mPos.z * 300)
      ;(moonBall.current.material as THREE.MeshBasicMaterial).opacity = pal.nightK * 0.9
      moonBall.current.visible = pal.nightK > 0.04
    }
    // stars follow camera & fade
    if (stars.current) {
      stars.current.position.copy(camPos)
      ;(stars.current.material as THREE.PointsMaterial).opacity = pal.nightK * (1 - (api.weather.rain ? 1 : 0) * 0.5)
      stars.current.visible = pal.nightK > 0.02
      stars.current.rotation.y = t * 0.004
    }
    // rain
    if (rain.current) {
      rain.current.visible = rainOn
      if (rainOn) {
        const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute
        const arr = posAttr.array as Float32Array
        const fall = (14 + api.weather.intensity * 22) * dt
        const drift = 3 * dt
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] += (Math.sin(t * 0.7 + i) * 0.6 + drift * (Math.random() - 0.4)) * (dt * 60)
          arr[i + 1] -= fall
          arr[i + 2] += drift * 0.4
          if (arr[i + 1] < camPos.y - 8 || arr[i] < camPos.x - 70 || arr[i] > camPos.x + 70) {
            arr[i] = camPos.x + (Math.random() - 0.5) * 130
            arr[i + 1] = camPos.y + 22 + Math.random() * 40
            arr[i + 2] = camPos.z + (Math.random() - 0.5) * 130
          }
        }
        posAttr.needsUpdate = true
      }
    }
    // grid is for the flat baseplate — hide it once hills appear
    if (grid.current) {
      const t = api.terrain
      grid.current.visible = !t || (t.amplitude ?? 0) < 0.08
    }
    // clouds drift
    if (cloud.current) {
      cloud.current.children.forEach((c, i) => {
        c.position.x += dt * (0.6 + (i % 3) * 0.3)
        if (c.position.x > 260) c.position.x = -260
        ;(c.children[0] as THREE.Mesh).rotation.y += dt * 0.02
      })
    }
    // user point lights update
    for (const info of api.lights) {
      const l = pointLights.current.get(info.id)
      if (!l || info.type === 'sun') continue
      l.position.set(info.pos[0], info.pos[1], info.pos[2])
      l.color.set(info.color)
      l.intensity = info.intensity * 0.55
      if (info.type === 'spot') {
        void 0
      }
    }
    void group
  })

  return (
    <>
      <directionalLight ref={sunLight} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} shadow-camera-near={10} shadow-camera-far={420} shadow-bias={-0.0004} />
      <hemisphereLight ref={hemi} args={['#cfe4ff', '#9aa78f', 0.6]} />
      <ambientLight intensity={0.12} />
      <mesh ref={sunBall}>
        <sphereGeometry args={[26, 20, 20]} />
        <meshBasicMaterial color="#fff3cf" transparent opacity={0} fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={moonBall}>
        <sphereGeometry args={[16, 18, 18]} />
        <meshBasicMaterial color="#e8eeff" transparent opacity={0} fog={false} toneMapped={false} />
      </mesh>
      <points ref={stars} geometry={starGeo} material={starMat} visible={false} />
      <points ref={rain} geometry={rainGeo} material={rainMat} visible={false} />
      <group ref={cloud}>
        {Array.from({ length: 9 }).map((_, i) => (
          <group key={i} position={[(i * 67) % 500 - 250, 90 + (i % 4) * 14, ((i * 37) % 420) - 210]}>
            <mesh>
              <sphereGeometry args={[14 + (i % 3) * 6, 12, 9]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={1} depthWrite={false} />
            </mesh>
            <mesh position={[10, -3, 0]}>
              <sphereGeometry args={[8, 10, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={1} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* baseplate grid accents (hidden when terrain is hilly) */}
      <gridHelper ref={grid} args={[110, 44, '#9db8d8', '#a8c0da']} position={[0, 0.02, 0]} />
    </>
  )
}
