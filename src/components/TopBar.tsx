import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';
import { getIconSprite } from '../game/sprites';

function Icon({ name, size = 20 }: { name: 'food' | 'materials' | 'gold' | 'population' | 'happy'; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(getIconSprite(name), 0, 0, size, size);
  }, [name, size]);
  return <canvas ref={ref} width={size} height={size} style={{ imageRendering: 'pixelated' }} />;
}

function Stat({ name, value, tone }: { name: 'food' | 'materials' | 'gold' | 'population'; value: number; tone?: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[#3a2c1e]/70 px-2 py-1">
      <Icon name={name} size={18} />
      <span className={`font-pixel text-[15px] ${tone ?? 'text-[#f7f0dd]'}`}>{Math.floor(value)}</span>
    </div>
  );
}

export default function TopBar() {
  const resources = useGameStore((s) => s.resources);
  const housingCapacity = useGameStore((s) => s.housingCapacity);
  const day = useGameStore((s) => s.day);
  const happiness = useGameStore((s) => s.happiness);

  return (
    <div className="flex items-center justify-between gap-2 border-b-4 border-[#4a3221] bg-[#5c4530] px-2 py-2 shadow-md">
      <div className="flex flex-wrap items-center gap-1.5">
        <Stat name="materials" value={resources.materials} />
        <Stat name="food" value={resources.food} />
        <Stat name="gold" value={resources.gold} />
        <div className="flex items-center gap-1 rounded-lg bg-[#3a2c1e]/70 px-2 py-1">
          <Icon name="population" size={18} />
          <span className="font-pixel text-[15px] text-[#f7f0dd]">
            {resources.population}/{housingCapacity}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-[#3a2c1e]/70 px-2 py-1" title="Настроение жителей">
          <Icon name="happy" size={16} />
          <span className="font-pixel text-[14px] text-[#f7f0dd]">{happiness}%</span>
        </div>
      </div>
      <div className="shrink-0 rounded-lg bg-[#3a2c1e]/70 px-2 py-1 text-right">
        <span className="font-pixel text-[14px] text-[#e9d5a0]">Неделя {day}</span>
      </div>
    </div>
  );
}
