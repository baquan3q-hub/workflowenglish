import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { MODE_INFO, PHASE_LABEL, progressPercent, type ChatMode, type ChatPhase } from '../../services/chatLogic';

interface Props {
  phase: ChatPhase;
  mode: ChatMode;
  startedAt: number;
  chars: number;
  usesData: boolean;
  /** Cards being written (quiz questions, sentences, words): so far / expected. */
  building?: { done: number; total: number; unit: string };
}

const STEPS: { phase: ChatPhase; label: string }[] = [
  { phase: 'context', label: 'Dữ liệu' },
  { phase: 'thinking', label: 'Phân tích' },
  { phase: 'writing', label: 'Trả lời' },
];
const ORDER: ChatPhase[] = ['context', 'sending', 'thinking', 'writing'];

/** Progress card above a reply that is still coming: steps, a bar and a timer. */
export function ChatProgress({ phase, mode, startedAt, chars, usesData, building }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - startedAt;
  const pct = progressPercent(phase, mode, elapsed, chars, building);
  const at = ORDER.indexOf(phase);
  const steps = usesData ? STEPS : STEPS.slice(1);
  const label = building && phase === 'writing' ? `Đang tạo ${building.unit} ${Math.min(building.done + 1, building.total)}/${building.total}` : PHASE_LABEL[phase];

  return (
    <div className="w-full max-w-[320px] rounded-xl border border-tone-lavender-border bg-tone-lavender/60 px-3 py-2.5" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-semibold text-tone-lavender-fg">{label}…</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">{(elapsed / 1000).toFixed(1)}s</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
        <div className="chat-progress-fill h-full rounded-full bg-tone-lavender-accent transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px]">
        {steps.map((s) => {
          const idx = ORDER.indexOf(s.phase);
          const done = at > idx || (s.phase === 'thinking' && phase === 'writing');
          const active = !done && (at === idx || (s.phase === 'thinking' && phase === 'sending'));
          return (
            <span key={s.phase} className={`inline-flex items-center gap-1 ${done ? 'text-tone-mint-fg' : active ? 'font-semibold text-tone-lavender-fg' : 'text-slate-400 dark:text-slate-500'}`}>
              {done ? <Check className="h-3 w-3" aria-hidden /> : <span className={`h-1.5 w-1.5 rounded-full ${active ? 'anim-record-pulse bg-tone-lavender-accent' : 'bg-slate-300 dark:bg-slate-600'}`} />}
              {s.label}
            </span>
          );
        })}
        <span className="ml-auto text-slate-400 dark:text-slate-500" title={MODE_INFO[mode].hint}>{MODE_INFO[mode].label}</span>
      </div>
    </div>
  );
}

export default ChatProgress;
