import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';
import { BUILDINGS, BUILDING_ORDER } from '../game/buildings';
import { getBuildPreviewSprite, getIconSprite } from '../game/sprites';
import type { BuildingId, Resources } from '../game/types';
import { ChevronRight } from 'lucide-react';

function Sprite({ id, size = 34 }: { id: BuildingId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(getBuildPreviewSprite(id), 0, 0, size, size);
  }, [id, size]);
  return <canvas ref={ref} width={size} height={size} style={{ imageRendering: 'pixelated' }} />;
}

const costIcon: Record<string, 'materials' | 'gold' | 'food'> = { materials: 'materials', gold: 'gold', food: 'food' };

function CostTag({ cost }: { cost: Partial<Resources> }) {
  return (
    <div className="flex items-center gap-1.5">
      {(Object.keys(cost) as (keyof Resources)[]).map((k) => {
        const icon = costIcon[k];
        if (!icon) return null;
        return (
          <span key={k} className="flex items-center gap-0.5 text-[13px] font-pixel text-[#e9d5a0]">
            <CostIcon icon={icon} />
            {cost[k]}
          </span>
        );
      })}
    </div>
  );
}

function CostIcon({ icon }: { icon: 'materials' | 'gold' | 'food' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(getIconSprite(icon), 0, 0, 12, 12);
  }, [icon]);
  return <canvas ref={ref} width={12} height={12} style={{ imageRendering: 'pixelated' }} />;
}

function canAfford(cost: Partial<Resources>, resources: Resources) {
  return (Object.keys(cost) as (keyof Resources)[]).every((k) => resources[k] >= (cost[k] ?? 0));
}

export default function BuildMenu() {
  const resources = useGameStore((s) => s.resources);
  const selected = useGameStore((s) => s.selectedBuilding);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const nextDay = useGameStore((s) => s.nextDay);
  const pendingChoice = useGameStore((s) => s.pendingChoice);

  return (
    <div className="flex items-stretch gap-2 border-t-4 border-[#4a3221] bg-[#5c4530] p-2">
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
        {BUILDING_ORDER.map((id) => {
          const def = BUILDINGS[id];
          const affordable = canAfford(def.cost, resources);
          const isSelected = selected === id;
          return (
            <button
              key={id}
              onClick={() => selectBuilding(isSelected ? null : id)}
              className={`flex min-w-[80px] shrink-0 flex-col items-center gap-1 rounded-xl border-2 px-2 py-1.5 transition-colors ${
                isSelected
                  ? 'border-[#f5cf5c] bg-[#7a5a34]'
                  : affordable
                    ? 'border-[#7a5a34] bg-[#4a3221] active:bg-[#7a5a34]'
                    : 'border-[#3a2c1e] bg-[#3a2c1e] opacity-60'
              }`}
              title={def.description}
            >
              <Sprite id={id} />
              <span className="whitespace-nowrap font-pixel text-[15px] text-[#f7f0dd]">{def.name}</span>
              <CostTag cost={def.cost} />
            </button>
          );
        })}
      </div>
      <button
        onClick={nextDay}
        disabled={!!pendingChoice}
        className="pixel-btn flex shrink-0 flex-col items-center justify-center gap-0.5 px-4 disabled:opacity-40"
      >
        <span className="font-pixel text-[15px]">Дальше</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
