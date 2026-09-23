import type { Tile, TerrainKind } from './types';

export const MAP_WIDTH = 14;
export const MAP_HEIGHT = 20;

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMap(seed = Date.now()): Tile[][] {
  const rand = seededRandom(seed);
  const tiles: Tile[][] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      let terrain: TerrainKind = 'grass';

      // sea hugs the bottom-right corner for a "village by the coast" feel
      const coastDist = (MAP_WIDTH - 1 - x) * 0.4 + (MAP_HEIGHT - 1 - y) * 0.6;
      if (coastDist < 3 + rand() * 1.5) {
        terrain = 'water';
      } else if (coastDist < 5.5 + rand() * 1.5) {
        terrain = 'sand';
      } else {
        // scatter forest and rock patches across the buildable land
        const n = rand();
        if (n < 0.16) terrain = 'forest';
        else if (n < 0.21) terrain = 'rock';
        else terrain = 'grass';
      }

      row.push({ x, y, terrain, buildingId: null, variant: Math.floor(rand() * 1000) });
    }
    tiles.push(row);
  }

  return tiles;
}
