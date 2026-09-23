import { X } from 'lucide-react';
import TopBar from './components/TopBar';
import GameCanvas from './components/GameCanvas';
import BuildMenu from './components/BuildMenu';
import EventModal from './components/EventModal';
import Toast from './components/Toast';
import GoalPanel from './components/GoalPanel';
import { useGameStore } from './game/store';
import { BUILDINGS } from './game/buildings';

function SelectionBar() {
  const selected = useGameStore((s) => s.selectedBuilding);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  if (!selected) return null;
  const def = BUILDINGS[selected];
  return (
    <div className="flex items-center justify-between gap-2 border-t-2 border-[#4a3221] bg-[#4a3221] px-3 py-1.5">
      <p className="font-pixel text-[13px] leading-snug text-[#e9d5a0]">
        <span className="text-[#f5cf5c]">{def.name}:</span> {def.description}
      </p>
      <button onClick={() => selectBuilding(null)} className="pixel-btn h-7 w-7 shrink-0" aria-label="Отменить выбор">
        <X size={14} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#2c6f96]">
      <TopBar />
      <div className="relative min-h-0 flex-1">
        <GameCanvas />
        <Toast />
        <GoalPanel />
        <EventModal />
      </div>
      <SelectionBar />
      <BuildMenu />
    </div>
  );
}
