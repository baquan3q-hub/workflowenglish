import React, { useEffect, useRef, useState } from 'react';
import { Clock, Mic, NotebookPen } from 'lucide-react';
import { cueBullets, cueTitle } from '../../../services/speakingPracticeLogic';
import { label, muted, panel, primaryBtn } from './styles';

const PREP_SECONDS = 60;

/** The minute of preparation before a Part 2 talk, with one note box per bullet. */
export default function CuePrep({
  prompt,
  notes,
  setNotes,
  onDone,
  doneLabel = 'Bắt đầu nói ngay',
}: {
  prompt: string;
  notes: string[];
  setNotes: (n: string[]) => void;
  onDone: () => void;
  /** Label of the button that ends preparation early. */
  doneLabel?: string;
}) {
  const [left, setLeft] = useState(PREP_SECONDS);
  const bullets = cueBullets(prompt);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left === 0) done.current();
  }, [left]);

  return (
    <div className="space-y-4">
      <div className={`${panel} space-y-3 p-4 sm:p-5`}>
        <p className={label}>Cue card</p>
        <p className="text-heading text-slate-900 dark:text-white">{cueTitle(prompt)}</p>
        {bullets.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>

      <div className={`${panel} space-y-3 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-heading text-slate-900 dark:text-white">
            <NotebookPen className="h-4 w-4 text-slate-500" /> Ghi chú 1 phút
          </h2>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-tone-butter-fg" aria-live="off">
            <Clock className="h-4 w-4" /> {left} giây
          </span>
        </div>
        <p className={muted}>Mỗi ô một gạch đầu dòng, chỉ ghi 3–5 từ khoá. Không viết câu hoàn chỉnh.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(bullets.length ? bullets : ['Ý chính', 'Chi tiết', 'Ví dụ', 'Cảm xúc']).map((b, i) => (
            <label key={b} className="block space-y-1">
              <span className="text-caption font-semibold text-slate-600 dark:text-slate-300">
                {i + 1}. {b}
              </span>
              <textarea
                value={notes[i] ?? ''}
                onChange={(e) => {
                  const next = [...notes];
                  next[i] = e.target.value;
                  setNotes(next);
                }}
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={onDone} className={primaryBtn}>
          <Mic className="h-4 w-4" /> {doneLabel}
        </button>
      </div>
    </div>
  );
}
