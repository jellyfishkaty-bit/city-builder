import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store';
import { MAP_HEIGHT, MAP_WIDTH } from '../game/mapgen';
import { getBuildingSprite, getTerrainSprite, RASTER } from '../game/sprites';
import { BUILDINGS } from '../game/buildings';

const TILE = RASTER; // 1 world pixel per raster pixel at zoom = 1
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.6;

interface Camera {
  x: number; // world px offset of top-left corner
  y: number;
  zoom: number;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tiles = useGameStore((s) => s.tiles);
  const selectedBuilding = useGameStore((s) => s.selectedBuilding);
  const resources = useGameStore((s) => s.resources);
  const buildAt = useGameStore((s) => s.buildAt);

  const worldW = MAP_WIDTH * TILE;
  const worldH = MAP_HEIGHT * TILE;

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 300, h: 300 });

  const clampCamera = useCallback((cam: Camera, viewW: number, viewH: number): Camera => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom));
    const maxX = Math.max(0, worldW - viewW / zoom);
    const maxY = Math.max(0, worldH - viewH / zoom);
    return {
      zoom,
      x: Math.min(Math.max(cam.x, -viewW / zoom * 0.15), maxX + viewW / zoom * 0.15),
      y: Math.min(Math.max(cam.y, -viewH / zoom * 0.15), maxY + viewH / zoom * 0.15),
    };
  }, [worldW, worldH]);

  // fit + center on first mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const userAdjustedCamera = useRef(false);

  useEffect(() => {
    if (size.w === 0 || size.h === 0 || userAdjustedCamera.current) return;
    // "cover" fit: fill the viewport completely, cropping the longer map
    // axis rather than leaving empty space (the map isn't square). Keeps
    // re-fitting on every layout change (fonts loading, resize) until the
    // player actually touches the map, then leaves their view alone.
    const coverZoom = Math.max(size.w / worldW, size.h / worldH) || 1;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, coverZoom));
    // center horizontally, but start a little toward the coast (south)
    // so the player's starter hamlet near the middle is in view.
    const x = (worldW - size.w / zoom) / 2;
    const y = Math.min(worldH - size.h / zoom, Math.max(0, worldH * 0.22 - size.h / zoom / 2));
    setCamera(clampCamera({ x, y, zoom }, size.w, size.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  // drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2c6f96';
    ctx.fillRect(0, 0, size.w, size.h);

    const { x: camX, y: camY, zoom } = camera;
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
    const endCol = Math.min(MAP_WIDTH - 1, Math.ceil((camX + size.w / zoom) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow = Math.min(MAP_HEIGHT - 1, Math.ceil((camY + size.h / zoom) / TILE) + 1);

    const buildDef = selectedBuilding ? BUILDINGS[selectedBuilding] : null;

    for (let ty = startRow; ty <= endRow; ty++) {
      for (let tx = startCol; tx <= endCol; tx++) {
        const tile = tiles[ty]?.[tx];
        if (!tile) continue;
        const px = tx * TILE;
        const py = ty * TILE;
        const terrainSprite = getTerrainSprite(tile.terrain, tx * 31 + ty * 17 + tile.variant);
        ctx.drawImage(terrainSprite, px, py, TILE, TILE);
        if (tile.buildingId) {
          const sprite = getBuildingSprite(tile.buildingId, tx * 13 + ty * 7, tile.variant);
          ctx.drawImage(sprite, px, py, TILE, TILE);
        }

        const isHover = hover && hover.x === tx && hover.y === ty;
        if (isHover && buildDef) {
          const canPlace = !tile.buildingId && buildDef.buildableOn.includes(tile.terrain);
          ctx.fillStyle = canPlace ? 'rgba(120, 220, 140, 0.38)' : 'rgba(220, 90, 90, 0.4)';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = canPlace ? '#5fd07a' : '#e06a6a';
          ctx.lineWidth = 2 / zoom;
          ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        } else if (isHover) {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 2 / zoom;
          ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        }
      }
    }
    ctx.restore();
  }, [camera, tiles, selectedBuilding, hover, size]);

  // pointer interaction: drag to pan, tap to build, wheel + pinch to zoom
  const drag = useRef<{ startX: number; startY: number; camX: number; camY: number; moved: boolean; pointerId: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());

  const screenToTile = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cam = cameraRef.current;
    const wx = sx / cam.zoom + cam.x;
    const wy = sy / cam.zoom + cam.y;
    return { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
      moved: false,
      pointerId: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const t = screenToTile(e.clientX, e.clientY);
    if (t && t.x >= 0 && t.x < MAP_WIDTH && t.y >= 0 && t.y < MAP_HEIGHT) {
      setHover((prev) => (prev && prev.x === t.x && prev.y === t.y ? prev : t));
    } else {
      setHover(null);
    }

    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > 5) d.moved = true;
    if (d.moved) {
      userAdjustedCamera.current = true;
      const zoom = cameraRef.current.zoom;
      const nextCam = clampCamera({ x: d.camX - dx / zoom, y: d.camY - dy / zoom, zoom }, size.w, size.h);
      setCamera(nextCam);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      const t = screenToTile(e.clientX, e.clientY);
      if (t && t.x >= 0 && t.x < MAP_WIDTH && t.y >= 0 && t.y < MAP_HEIGHT) {
        buildAt(t.x, t.y);
      }
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    userAdjustedCamera.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cam = cameraRef.current;
    const worldX = sx / cam.zoom + cam.x;
    const worldY = sy / cam.zoom + cam.y;
    const delta = -e.deltaY * 0.0015;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * (1 + delta)));
    const newCam = { x: worldX - sx / newZoom, y: worldY - sy / newZoom, zoom: newZoom };
    setCamera(clampCamera(newCam, size.w, size.h));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      activeTouches.current.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (activeTouches.current.size === 2) {
      const pts = Array.from(activeTouches.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinch.current = { dist, zoom: cameraRef.current.zoom };
      drag.current = null;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (activeTouches.current.has(t.identifier)) {
        activeTouches.current.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
    if (activeTouches.current.size === 2 && pinch.current) {
      e.preventDefault();
      userAdjustedCamera.current = true;
      const pts = Array.from(activeTouches.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / (pinch.current.dist || 1);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      const cam = cameraRef.current;
      const worldX = midX / cam.zoom + cam.x;
      const worldY = midY / cam.zoom + cam.y;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.current.zoom * ratio));
      const newCam = { x: worldX - midX / newZoom, y: worldY - midY / newZoom, zoom: newZoom };
      setCamera(clampCamera(newCam, size.w, size.h));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      activeTouches.current.delete(t.identifier);
    }
    if (activeTouches.current.size < 2) pinch.current = null;
  };

  const zoomBy = (factor: number) => {
    userAdjustedCamera.current = true;
    const cam = cameraRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const worldX = cx / cam.zoom + cam.x;
    const worldY = cy / cam.zoom + cam.y;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
    const newCam = { x: worldX - cx / newZoom, y: worldY - cy / newZoom, zoom: newZoom };
    setCamera(clampCamera(newCam, size.w, size.h));
  };

  void resources;

  return (
    <div ref={containerRef} className="relative h-full w-full touch-none select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: 'pixelated' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button
          onClick={() => zoomBy(1.25)}
          className="pixel-btn h-10 w-10 text-lg leading-none"
          aria-label="Приблизить"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(0.8)}
          className="pixel-btn h-10 w-10 text-lg leading-none"
          aria-label="Отдалить"
        >
          −
        </button>
      </div>
    </div>
  );
}
