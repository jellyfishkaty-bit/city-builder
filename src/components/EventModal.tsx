import { useGameStore } from '../game/store';

export default function EventModal() {
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const resolveChoice = useGameStore((s) => s.resolveChoice);

  if (!pendingChoice) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-[#7a5a34] bg-[#5c4530] p-4 shadow-xl">
        <h2 className="mb-2 font-pixel text-[19px] text-[#f5cf5c]">{pendingChoice.title}</h2>
        <p className="mb-4 font-pixel text-[14px] leading-relaxed text-[#f7f0dd]">{pendingChoice.message}</p>
        <div className="flex flex-col gap-2">
          {pendingChoice.choices?.map((choice, i) => (
            <button
              key={choice.label}
              onClick={() => resolveChoice(i)}
              className="pixel-btn w-full py-2 text-left"
            >
              <span className="font-pixel text-[14px]">{choice.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
