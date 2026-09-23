import { PALETTE } from './palette';
import type { BuildingId, TerrainKind } from './types';

// All sprites are authored on a fixed 16x16 logical grid, rasterized once
// onto a 32x32 canvas (2 device px per logical pixel) and cached. The map
// renderer then blits these cached canvases with image smoothing disabled,
// so buildings, terrain and icons all share one consistent pixel density
// no matter how far the player zooms in.
export const GRID = 16;
export const RASTER = 32;
const U = RASTER / GRID;

type Ctx = CanvasRenderingContext2D;

function mkCanvas(): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = RASTER;
  canvas.height = RASTER;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function px(ctx: Ctx, gx: number, gy: number, gw: number, gh: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(gx * U, gy * U, gw * U, gh * U);
}

// deterministic pseudo-random so terrain speckle patterns don't shimmer
function prng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function speckle(ctx: Ctx, seed: number, count: number, colors: string[], sizeRange: [number, number] = [1, 1]) {
  const rand = prng(seed);
  for (let i = 0; i < count; i++) {
    const gx = Math.floor(rand() * GRID);
    const gy = Math.floor(rand() * GRID);
    const size = sizeRange[0] + Math.floor(rand() * (sizeRange[1] - sizeRange[0] + 1));
    const color = colors[Math.floor(rand() * colors.length)];
    px(ctx, gx, gy, size, size, color);
  }
}

// ---------- terrain tiles ----------

function drawGrass(ctx: Ctx, seed: number) {
  px(ctx, 0, 0, 16, 16, PALETTE.grass1);
  speckle(ctx, seed, 10, [PALETTE.grass2], [1, 2]);
  speckle(ctx, seed + 1, 4, [PALETTE.grass3], [1, 1]);
}

function drawSand(ctx: Ctx, seed: number) {
  px(ctx, 0, 0, 16, 16, PALETTE.sand1);
  speckle(ctx, seed, 10, [PALETTE.sand2], [1, 2]);
  speckle(ctx, seed + 1, 5, [PALETTE.sand3], [1, 1]);
}

function drawRock(ctx: Ctx, seed: number) {
  px(ctx, 0, 0, 16, 16, PALETTE.grass1);
  speckle(ctx, seed + 9, 4, [PALETTE.grass2], [1, 1]);
  px(ctx, 3, 5, 10, 8, PALETTE.rock2);
  px(ctx, 4, 4, 8, 2, PALETTE.rock1);
  px(ctx, 3, 12, 10, 2, PALETTE.rock3);
  px(ctx, 5, 6, 3, 2, PALETTE.rock1);
  px(ctx, 9, 8, 3, 3, PALETTE.rock3);
}

function drawWater(ctx: Ctx, seed: number) {
  px(ctx, 0, 0, 16, 16, PALETTE.water2);
  speckle(ctx, seed, 8, [PALETTE.water3], [1, 2]);
  speckle(ctx, seed + 2, 6, [PALETTE.foam], [1, 1]);
}

function drawForest(ctx: Ctx, seed: number) {
  drawGrass(ctx, seed);
  const rand = prng(seed + 5);
  const spots: [number, number][] = [[3, 3], [10, 4], [6, 9], [12, 11], [2, 11]];
  for (const [gx, gy] of spots) {
    if (rand() > 0.15) drawTreeAt(ctx, gx, gy, rand() > 0.5);
  }
}

function drawTreeAt(ctx: Ctx, gx: number, gy: number, big: boolean) {
  const s = big ? 1 : 0.8;
  px(ctx, gx + 1.5 * s, gy + 4 * s, 1, 2, PALETTE.trunk);
  px(ctx, gx, gy, 4 * s, 3 * s, PALETTE.leaf2);
  px(ctx, gx + 0.5 * s, gy - 1 * s, 3 * s, 2 * s, PALETTE.leaf1);
  px(ctx, gx, gy + 2 * s, 1 * s, 1 * s, PALETTE.leaf3);
}

const TERRAIN_DRAW: Record<TerrainKind, (ctx: Ctx, seed: number) => void> = {
  grass: drawGrass,
  sand: drawSand,
  rock: drawRock,
  water: drawWater,
  forest: drawForest,
};

// ---------- buildings ----------

function drawBase(ctx: Ctx, seed: number) {
  drawGrass(ctx, seed);
}

function roofTriangle(ctx: Ctx, top: number, left: number, width: number, rows: number, colorA: string, colorB: string) {
  for (let r = 0; r < rows; r++) {
    const inset = r;
    const w = width - inset * 2;
    px(ctx, left + inset, top + r, w, 1, r % 2 === 0 ? colorA : colorB);
  }
}

function drawHouse(ctx: Ctx, seed: number, variant: number) {
  drawBase(ctx, seed);
  const roofColors = variant % 2 === 0
    ? [PALETTE.roofRed1, PALETTE.roofRed2, PALETTE.roofRed3]
    : [PALETTE.roofBlue1, PALETTE.roofBlue2, PALETTE.roofBlue3];
  // wall
  px(ctx, 3, 8, 10, 6, PALETTE.wood1);
  px(ctx, 3, 12, 10, 2, PALETTE.wood2);
  // roof
  roofTriangle(ctx, 2, 2, 12, 6, roofColors[0], roofColors[1]);
  px(ctx, 1, 7, 14, 1, roofColors[2]);
  // door
  px(ctx, 7, 10, 2, 4, PALETTE.doorBrown);
  px(ctx, 8, 12, 1, 1, PALETTE.gold1);
  // windows
  px(ctx, 4, 9, 2, 2, PALETTE.window);
  px(ctx, 4, 9, 2, 1, PALETTE.windowDark);
  px(ctx, 10, 9, 2, 2, PALETTE.window);
  px(ctx, 10, 9, 2, 1, PALETTE.windowDark);
  // chimney
  px(ctx, 11, 3, 2, 3, PALETTE.stone2);
}

function drawFarm(ctx: Ctx, seed: number, variant: number) {
  drawBase(ctx, seed);
  // plowed field patches
  px(ctx, 1, 3, 6, 5, PALETTE.wood2);
  for (let i = 0; i < 5; i++) px(ctx, 1, 3 + i, 6, 0.5, PALETTE.wood3);
  const cropColor = variant % 2 === 0 ? PALETTE.gold1 : PALETTE.leaf1;
  for (let i = 0; i < 3; i++) {
    px(ctx, 1.5, 3.5 + i * 1.5, 5, 0.5, cropColor);
  }
  // small barn
  px(ctx, 9, 7, 6, 6, PALETTE.roofRed1);
  px(ctx, 9, 11, 6, 2, PALETTE.wood2);
  roofTriangle(ctx, 5, 8, 8, 3, PALETTE.roofRed2, PALETTE.roofRed3);
  px(ctx, 11, 9, 2, 4, PALETTE.doorBrown);
  // fence
  px(ctx, 0, 9, 1, 6, PALETTE.wood3);
  px(ctx, 7, 9, 1, 6, PALETTE.wood3);
  px(ctx, 0, 10, 8, 1, PALETTE.wood3);
}

function drawSawmill(ctx: Ctx, seed: number) {
  drawBase(ctx, seed);
  drawTreeAt(ctx, 1, 1, true);
  drawTreeAt(ctx, 12, 2, false);
  // log pile
  px(ctx, 2, 11, 8, 1, PALETTE.wood3);
  px(ctx, 2, 10, 8, 1, PALETTE.wood1);
  px(ctx, 2, 9, 8, 1, PALETTE.wood3);
  px(ctx, 2, 9, 1, 3, PALETTE.woodDark);
  px(ctx, 9, 9, 1, 3, PALETTE.woodDark);
  // mill shed
  px(ctx, 9, 5, 7, 8, PALETTE.wood2);
  roofTriangle(ctx, 2, 8, 9, 4, PALETTE.roofRed2, PALETTE.roofRed3);
  px(ctx, 12, 8, 2, 5, PALETTE.doorBrown);
  // saw blade accent
  px(ctx, 10, 7, 2, 2, PALETTE.rock1);
}

function drawQuarry(ctx: Ctx, seed: number) {
  drawBase(ctx, seed);
  px(ctx, 1, 6, 14, 9, PALETTE.rock2);
  px(ctx, 1, 6, 14, 2, PALETTE.rock1);
  px(ctx, 1, 13, 14, 2, PALETTE.rock3);
  px(ctx, 3, 8, 3, 3, PALETTE.rock3);
  px(ctx, 8, 9, 4, 3, PALETTE.rock1);
  px(ctx, 4, 2, 2, 4, PALETTE.wood3);
  px(ctx, 3, 1, 4, 1.5, PALETTE.rock2);
  px(ctx, 10, 3, 1, 3, PALETTE.wood3);
  px(ctx, 9, 2, 3, 1, PALETTE.wood2);
}

function drawMarket(ctx: Ctx, seed: number) {
  drawBase(ctx, seed);
  px(ctx, 1, 12, 14, 2, PALETTE.path);
  // stall posts
  px(ctx, 2, 5, 1, 8, PALETTE.wood3);
  px(ctx, 13, 5, 1, 8, PALETTE.wood3);
  // striped awning
  for (let i = 0; i < 6; i++) {
    px(ctx, 2 + i * 2, 3, 2, 3, i % 2 === 0 ? PALETTE.roofRed1 : PALETTE.white);
  }
  px(ctx, 1, 2, 14, 1, PALETTE.roofRed3);
  // counter
  px(ctx, 2, 9, 12, 4, PALETTE.wood2);
  px(ctx, 2, 9, 12, 1, PALETTE.wood1);
  // goods
  px(ctx, 4, 7, 2, 2, PALETTE.gold1);
  px(ctx, 7, 7, 2, 2, PALETTE.roofRed1);
  px(ctx, 10, 7, 2, 2, PALETTE.leaf1);
}

function drawWell(ctx: Ctx, seed: number) {
  drawBase(ctx, seed);
  px(ctx, 5, 9, 6, 5, PALETTE.stone2);
  px(ctx, 5, 9, 6, 1, PALETTE.stone1);
  px(ctx, 5, 13, 6, 1, PALETTE.stone3);
  px(ctx, 6.5, 10, 3, 3, PALETTE.water2);
  px(ctx, 4, 3, 1, 7, PALETTE.wood3);
  px(ctx, 11, 3, 1, 7, PALETTE.wood3);
  px(ctx, 4, 2, 8, 1, PALETTE.wood2);
  px(ctx, 7, 3, 2, 3, PALETTE.rock2);
}

function drawTavern(ctx: Ctx, seed: number) {
  drawBase(ctx, seed);
  px(ctx, 2, 7, 12, 7, PALETTE.wood2);
  px(ctx, 2, 12, 12, 2, PALETTE.wood3);
  roofTriangle(ctx, 2, 1, 14, 5, PALETTE.roofPurple1, PALETTE.roofPurple2);
  px(ctx, 6, 10, 3, 4, PALETTE.doorBrown);
  px(ctx, 3, 8, 2, 2, PALETTE.window);
  px(ctx, 11, 8, 2, 2, PALETTE.window);
  // hanging sign
  px(ctx, 10, 6, 1, 2, PALETTE.woodDark);
  px(ctx, 9, 8, 3, 2, PALETTE.gold1);
}

function drawLighthouse(ctx: Ctx, seed: number) {
  drawBase(ctx, seed);
  px(ctx, 1, 10, 5, 4, PALETTE.sand2);
  speckle(ctx, seed + 3, 4, [PALETTE.sand3], [1, 1]);
  px(ctx, 6, 12, 10, 3, PALETTE.water2);
  px(ctx, 6, 3, 3, 11, PALETTE.stone1);
  px(ctx, 6, 3, 3, 2, PALETTE.roofRed1);
  px(ctx, 6, 7, 3, 1, PALETTE.roofRed2);
  px(ctx, 6, 10, 3, 1, PALETTE.roofRed2);
  px(ctx, 6.5, 1, 2, 2, PALETTE.gold1);
  px(ctx, 5.5, 0, 4, 1, PALETTE.roofRed3);
}

const BUILDING_DRAW: Record<BuildingId, (ctx: Ctx, seed: number, variant: number) => void> = {
  house: drawHouse,
  farm: drawFarm,
  sawmill: (ctx, seed) => drawSawmill(ctx, seed),
  quarry: (ctx, seed) => drawQuarry(ctx, seed),
  market: (ctx, seed) => drawMarket(ctx, seed),
  well: (ctx, seed) => drawWell(ctx, seed),
  tavern: (ctx, seed) => drawTavern(ctx, seed),
  lighthouse: (ctx, seed) => drawLighthouse(ctx, seed),
};

// ---------- resource / UI icons (drawn at same raster, kept simple) ----------

function drawIconFood(ctx: Ctx) {
  px(ctx, 4, 3, 8, 8, PALETTE.gold1);
  px(ctx, 4, 3, 8, 2, PALETTE.roofRed1);
  px(ctx, 3, 10, 10, 2, PALETTE.wood3);
  px(ctx, 7, 1, 2, 3, PALETTE.leaf1);
}

function drawIconMaterials(ctx: Ctx) {
  px(ctx, 3, 6, 6, 4, PALETTE.wood2);
  px(ctx, 3, 6, 6, 1, PALETTE.wood1);
  px(ctx, 7, 3, 6, 4, PALETTE.wood3);
  px(ctx, 7, 3, 6, 1, PALETTE.wood2);
}

function drawIconGold(ctx: Ctx) {
  px(ctx, 4, 4, 8, 8, PALETTE.gold2);
  px(ctx, 5, 5, 6, 6, PALETTE.gold1);
  px(ctx, 7, 7, 2, 2, PALETTE.gold3);
}

function drawIconPopulation(ctx: Ctx) {
  px(ctx, 5, 2, 3, 3, PALETTE.sand2);
  px(ctx, 4, 6, 5, 6, PALETTE.roofBlue2);
  px(ctx, 9, 2, 3, 3, PALETTE.sand1);
  px(ctx, 8, 6, 5, 6, PALETTE.roofRed1);
}

function drawIconHappy(ctx: Ctx) {
  px(ctx, 3, 3, 10, 10, PALETTE.gold1);
  px(ctx, 5, 6, 2, 2, PALETTE.black);
  px(ctx, 9, 6, 2, 2, PALETTE.black);
  px(ctx, 5, 10, 6, 1, PALETTE.black);
}

const ICON_DRAW: Record<string, (ctx: Ctx) => void> = {
  food: drawIconFood,
  materials: drawIconMaterials,
  gold: drawIconGold,
  population: drawIconPopulation,
  happy: drawIconHappy,
};

// ---------- public cache API ----------

const terrainCache = new Map<string, HTMLCanvasElement>();
const buildingCache = new Map<string, HTMLCanvasElement>();
const iconCache = new Map<string, HTMLCanvasElement>();

export function getTerrainSprite(terrain: TerrainKind, seed: number): HTMLCanvasElement {
  const key = `${terrain}:${seed % 7}`;
  let c = terrainCache.get(key);
  if (!c) {
    const { canvas, ctx } = mkCanvas();
    TERRAIN_DRAW[terrain](ctx, seed);
    terrainCache.set(key, canvas);
    c = canvas;
  }
  return c;
}

export function getBuildingSprite(id: BuildingId, seed: number, variant: number): HTMLCanvasElement {
  const key = `${id}:${seed % 5}:${variant % 2}`;
  let c = buildingCache.get(key);
  if (!c) {
    const { canvas, ctx } = mkCanvas();
    BUILDING_DRAW[id](ctx, seed, variant);
    buildingCache.set(key, canvas);
    c = canvas;
  }
  return c;
}

export function getIconSprite(name: keyof typeof ICON_DRAW): HTMLCanvasElement {
  let c = iconCache.get(name);
  if (!c) {
    const { canvas, ctx } = mkCanvas();
    ICON_DRAW[name](ctx);
    iconCache.set(name, canvas);
    c = canvas;
  }
  return c;
}

export function getBuildPreviewSprite(id: BuildingId): HTMLCanvasElement {
  return getBuildingSprite(id, 1, 0);
}
