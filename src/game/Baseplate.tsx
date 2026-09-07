export function Baseplate(): JSX.Element {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[120, 1, 120]} />
        <meshStandardMaterial color="#8fa86b" roughness={1} />
      </mesh>
      <gridHelper args={[100, 25, '#5f7045', '#7d9060']} position={[0, 0.02, 0]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 8]}>
        <circleGeometry args={[2.2, 32]} />
        <meshStandardMaterial color="#5ec8ff" transparent opacity={0.35} roughness={0.3} />
      </mesh>
    </>
  )
}