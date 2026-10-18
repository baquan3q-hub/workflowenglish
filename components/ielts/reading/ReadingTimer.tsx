/**
 * The Reading clock. It owns the ticking so the screen above it does not
 * re-render every second: seconds go into `secondsRef` (per passage), and
 * time is measured from the wall clock, so a throttled background tab still
 * counts correctly.
 *
 * Exam: counts down from the whole session's time and calls onExpire at 0.
 * Practice: counts up for the open passage against its suggested minutes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { toneClasses } from '../../ui/palette';
import { clock } from './readingStatus';

interface Props {
  exam: boolean;
  /** Exam: seconds allowed for the session. */
  limitSeconds: number;
  /** Practice: seconds suggested for the open passage. */
  budgetSeconds: number;
  passageId: string;
  secondsRef: React.MutableRefObject<Record<string, number>>;
  onExpire: () => void;
  /** Called every few seconds so the draft keeps the time. */
  onPersist: () => void;
}

const sum = (r: Record<string, number>) => Object.values(r).reduce((n, s) => n + s, 0);

export default function ReadingTimer({ exam, limitSeconds, budgetSeconds, passageId, secondsRef, onExpire, onPersist }: Props) {
  const [, setTick] = useState(0);
  const expired = useRef(false);
  const callbacks = useRef({ onExpire, onPersist });
  callbacks.current = { onExpire, onPersist };

  useEffect(() => {
    let last = Date.now();
    let ticks = 0;
    const id = window.setInterval(() => {
      const now = Date.now();
      const r = secondsRef.current;
      r[passageId] = (r[passageId] ?? 0) + (now - last) / 1000;
      last = now;
      setTick((t) => t + 1);
      if (++ticks % 5 === 0) callbacks.current.onPersist();
      if (exam && !expired.current && sum(r) >= limitSeconds) {
        expired.current = true;
        callbacks.current.onExpire();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [exam, limitSeconds, passageId, secondsRef]);

  const spent = exam ? sum(secondsRef.current) : (secondsRef.current[passageId] ?? 0);
  const left = limitSeconds - spent;
  const tone = exam ? (left <= 60 ? 'blush' : left <= 5 * 60 ? 'butter' : 'sky') : spent > budgetSeconds ? 'butter' : 'sky';


  return (
    <span
      role="timer"
      aria-label={exam ? `Thời gian còn lại ${clock(left)}` : `Đã làm passage này ${clock(spent)}`}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold tabular-nums ${toneClasses(tone).tile}`}
    >
      <Timer className="h-4 w-4" aria-hidden />
      {exam ? (
        <>
          <span className="hidden sm:inline">Còn</span> {clock(left)}
        </>
      ) : (
        <>
          {clock(spent)}
          <span className="hidden font-medium opacity-80 sm:inline">/ {Math.round(budgetSeconds / 60)} phút</span>
        </>
      )}
    </span>
  );
}
