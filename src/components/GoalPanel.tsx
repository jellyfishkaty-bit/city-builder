import { useState } from 'react';
import { Trophy, X, RotateCcw } from 'lucide-react';
import { useGameStore, GOAL_POPULATION, countBuildingTypes } from '../game/store';
import { BUILDING_ORDER, BUILDINGS } from '../game/buildings';

export default function GoalPanel() {
  const [open, setOpen] = useState(false);
  const resources = useGameStore((s) => s.resources);
  const tiles = useGameStore((s) => s.tiles);
  const log = useGameStore((s) => s.log);
  const goalReached = useGameStore((s) => s.goalReached);
  const resetGame = useGameStore((s) => s.resetGame);

  const built = countBuildingTypes(tiles);
  const popPct = Math.min(100, Math.round((resources.population / GOAL_POPULATION) * 100));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pixel-btn absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center"
        aria-label="Цели и журнал"
      >
        <Trophy size={18} />
      </button>

      {open && (
        <div className="absolute inset-0 z-30 flex justify-end bg-black/40">
          <div className="flex h-full w-[88%] max-w-xs flex-col gap-3 overflow-y-auto border-l-4 border-[#4a3221] bg-[#5c4530] p-3">
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-[17px] text-[#f5cf5c]">Поселение</h2>
              <button onClick={() => setOpen(false)} className="pixel-btn h-8 w-8" aria-label="Закрыть">
                <X size={14} />
              </button>
            </div>

            {goalReached && (
              <div className="rounded-lg border-2 border-[#f5cf5c] bg-[#3a2c1e] p-2 font-pixel text-[19px] leading-relaxed text-[#f5cf5c]">
                Цель достигнута! Городок состоялся — можно продолжать развивать его сколько угодно.
              </div>
            )}

            <div>
              <p className="mb-1 font-pixel text-[19px] text-[#e9d5a0]">
                Население: {resources.population} / {GOAL_POPULATION}
              </p>
              <div className="h-3 w-full overflow-hidden rounded-full border-2 border-[#3a2c1e] bg-[#2c2013]">
                <div className="h-full bg-[#6fb04f]" style={{ width: `${popPct}%` }} />
              </div>
            </div>

            <div>
              <p className="mb-1 font-pixel text-[19px] text-[#e9d5a0]">
                Построено видов зданий: {built.size} / {BUILDING_ORDER.length}
              </p>
              <div className="flex flex-wrap gap-1">
                {BUILDING_ORDER.map((id) => (
                  <span
                    key={id}
                    className={`rounded px-1.5 py-0.5 font-pixel text-[17px] ${
                      built.has(id) ? 'bg-[#6fb04f] text-[#20180f]' : 'bg-[#3a2c1e] text-[#8a7a63]'
                    }`}
                  >
                    {BUILDINGS[id].name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <p className="mb-1 font-pixel text-[19px] text-[#e9d5a0]">Журнал событий</p>
              <div className="flex flex-col gap-1.5">
                {log.map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-[#3a2c1e]/60 p-1.5">
                    <p className="font-pixel text-[17px] text-[#f5cf5c]">
                      Нед.{entry.day} · {entry.title}
                    </p>
                    <p className="mt-0.5 font-pixel text-[17px] leading-relaxed text-[#c9bda3]">{entry.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Начать новую партию? Текущий прогресс будет потерян.')) {
                  resetGame();
                  setOpen(false);
                }
              }}
              className="pixel-btn flex items-center justify-center gap-2 py-2"
            >
              <RotateCcw size={14} />
              <span className="font-pixel text-[19px]">Новая партия</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
