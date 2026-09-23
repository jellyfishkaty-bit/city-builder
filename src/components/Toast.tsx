import { useEffect } from 'react';
import { useGameStore } from '../game/store';

const toneStyles: Record<string, string> = {
  good: 'border-[#6fb04f] bg-[#33421f]',
  bad: 'border-[#c1472b] bg-[#4a241a]',
  neutral: 'border-[#7a5a34] bg-[#3a2c1e]',
  choice: 'border-[#f5cf5c] bg-[#3a2c1e]',
};

export default function Toast() {
  const toast = useGameStore((s) => s.toastLog);
  const dismiss = useGameStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, 4200);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[92%] max-w-sm -translate-x-1/2">
      <div
        className={`pointer-events-auto rounded-xl border-2 px-3 py-2 shadow-lg ${toneStyles[toast.tone] ?? toneStyles.neutral}`}
        onClick={dismiss}
      >
        <p className="font-pixel text-[14px] text-[#f5cf5c]">{toast.title}</p>
        <p className="mt-1 font-pixel text-[19px] leading-relaxed text-[#f7f0dd]">{toast.message}</p>
      </div>
    </div>
  );
}
