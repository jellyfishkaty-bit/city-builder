// Shared cozy pixel-art palette. Every sprite legend maps its own single-char
// codes onto these colors so the whole game reads as one consistent set.
export const PALETTE = {
  // greens / grass
  grass1: '#7ec850',
  grass2: '#5fa83c',
  grass3: '#4a8a2e',
  // forest
  leaf1: '#3f8a3f',
  leaf2: '#2c6b2c',
  leaf3: '#1f4f1f',
  trunk: '#6b4423',
  trunkDark: '#4a2e17',
  // water / coast
  water1: '#5bb8e0',
  water2: '#3f93c2',
  water3: '#2c6f96',
  foam: '#d8f4ff',
  // sand
  sand1: '#e9d5a0',
  sand2: '#d4b876',
  sand3: '#b89a5c',
  // rock
  rock1: '#aeaeae',
  rock2: '#8b8b8b',
  rock3: '#666666',
  // wood / buildings
  wood1: '#c98a4b',
  wood2: '#a86a34',
  wood3: '#7a4a22',
  woodDark: '#4f2f15',
  // roofs
  roofRed1: '#e0623f',
  roofRed2: '#b8452a',
  roofRed3: '#8a2f1c',
  roofBlue1: '#5a8fc7',
  roofBlue2: '#3d6fa8',
  roofBlue3: '#2a4f7a',
  roofPurple1: '#9d7bc7',
  roofPurple2: '#7857a3',
  // stone
  stone1: '#c9c2b4',
  stone2: '#a39b8a',
  stone3: '#766f61',
  // accents
  gold1: '#f5cf5c',
  gold2: '#d9a836',
  gold3: '#a97e22',
  window: '#fff3c4',
  windowDark: '#e0b84a',
  doorBrown: '#3d2814',
  white: '#f7f3e8',
  black: '#20180f',
  path: '#c9ad7c',
  pathDark: '#a68a5c',
} as const;

export type PaletteKey = keyof typeof PALETTE;
