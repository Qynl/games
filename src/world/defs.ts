import type { Shape } from '../types'

export const OBJ_BOUNDS = { x: 46, yMax: 26, z: 46 }

export const SHAPE_INFO: Record<Shape, { size: [number, number, number]; label: string }> = {
  cube: { size: [1.4, 1.4, 1.4], label: 'Block' },
  sphere: { size: [1.3, 1.3, 1.3], label: 'Sphere' },
  cylinder: { size: [1, 1.8, 1], label: 'Column' },
  cone: { size: [1.3, 1.8, 1.3], label: 'Cone' },
  coin: { size: [0.6, 0.18, 0.6], label: 'Coin' },
  ramp: { size: [3.2, 1, 3.2], label: 'Ramp' },
  wall: { size: [5, 3, 0.4], label: 'Wall' },
  tree: { size: [2.4, 4.4, 2.4], label: 'Tree' },
  house: { size: [4.6, 3.6, 4.2], label: 'House' },
  tower: { size: [2.2, 7.5, 2.2], label: 'Tower' },
  arch: { size: [4, 3.8, 1.8], label: 'Arch' },
  road: { size: [9, 0.16, 44], label: 'Road' },
}

export const PALETTE = [
  '#5b8c5a',
  '#4a7c3f',
  '#c96f4a',
  '#d9b45b',
  '#8b7cf0',
  '#4aa3c2',
  '#e06c75',
  '#b0b3bf',
  '#f2e8cf',
  '#6d597a',
]

export const COIN_COLOR = '#ffd54a'