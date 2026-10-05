'use client';
import { useRef, useState, type ReactNode } from 'react';

type Tip = { value: string; label: string; x: number; y: number };

/**
 * En tooltip för alla server-ritade diagram på sidan. Märken med `data-tip` (värdet) och
 * `data-tip-label` (vad det är) visar den vid hover och fokus. Tooltipen är bara en genväg:
 * samma värden finns i tabellerna under varje diagram.
 */
export function ChartTips({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const show = (target: EventTarget | null) => {
    const root = ref.current;
    const el = target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;
    if (!root || !el || !root.contains(el)) return setTip(null);
    const box = el.getBoundingClientRect();
    const frame = root.getBoundingClientRect();
    // Hålls inom sidan i sidled, så att en tooltip vid kanten inte hamnar utanför skärmen.
    const x = Math.min(Math.max(box.left + box.width / 2 - frame.left, 90), frame.width - 90);
    setTip({ value: el.dataset.tip ?? '', label: el.dataset.tipLabel ?? '', x, y: box.top - frame.top });
  };

  return (
    <div ref={ref} className='vz-tips' onPointerOver={(e) => show(e.target)} onPointerLeave={() => setTip(null)} onFocus={(e) => show(e.target)} onBlur={() => setTip(null)}>
      {children}
      {tip && (
        <div className='vz-tip' role='tooltip' style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.value}</strong>
          {tip.label && <span>{tip.label}</span>}
        </div>
      )}
    </div>
  );
}
