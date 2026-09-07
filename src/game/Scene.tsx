import { Canvas } from '@react-three/fiber'
import { SkyLight } from './SkyLight'
import { Baseplate } from './Baseplate'
import { WorldObjects } from './WorldObjects'
import { NPCs } from './NPCs'
import { Vehicles } from './Vehicles'
import { WeatherFX } from './WeatherFX'
import { AIHead } from './AIHead'
import { Player } from '../player/Player'

export function Scene(): JSX.Element {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 70, near: 0.1, far: 500, position: [0, 1.8, 8] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <SkyLight />
      <Baseplate />
      <WorldObjects />
      <NPCs />
      <Vehicles />
      <WeatherFX />
      <AIHead />
      <Player />
    </Canvas>
  )
}