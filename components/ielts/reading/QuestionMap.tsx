/**
 * Questions 1–40 at a glance: answered (mint), not yet (plain), flagged for
 * review (butter). Tap a number to jump to it; in flag mode, tap to flag.
 */
import React from 'react';
import { Flag } from 'lucide-react';
import type { ReadingPassage } from '../../../data/ielts/reading/types';
import { passageQuestions } from '../../../services/readingLogic';
import { panel } from '../../ui/styles';

interface Props {
  passages: readonly ReadingPassage[];
  answered: ReadonlySet<number>;
  flags: ReadonlySet<number>;
  flagMode: boolean;
  onFlagModeChange: (on: boolean) => void;
  onJump: (n: number) => void;
  onToggleFlag: (n: number) => void;
}

const cell = 'press relative inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border text-sm font-bold tabular-nums transition-colors';

export default function QuestionMap({ passages, answered, flags, flagMode, onFlagModeChange, onJump, onToggleFlag }: Props) {
  return (
    <div className={`${panel} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-tone-mint-soft ring-1 ring-tone-mint-border" aria-hidden /> Đã làm
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-white ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-600" aria-hidden /> Chưa làm
          </li>
          <li className="flex items-center gap-1.5">
            <Flag className="h-3 w-3 text-tone-butter-fg" aria-hidden /> Xem lại
          </li>
        </ul>
        <button
          type="button"
          aria-pressed={flagMode}
          onClick={() => onFlagModeChange(!flagMode)}
          className={`press inline-flex min-h-touch items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
            flagMode ? 'border-tone-butter-fg bg-tone-butter-soft text-tone-butter-fg' : 'border-slate-200 bg-white text-slate-700 hover:border-tone-butter-border hover:bg-tone-butter dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <Flag className="h-4 w-4" aria-hidden />
          {flagMode ? 'Đang đánh dấu' : 'Đánh dấu xem lại'}
        </button>
      </div>
      <div className="space-y-3">
        {passages.map((p) => (
          <section key={p.id} aria-label={`Passage ${p.part}`}>
            {passages.length > 1 && <p className="mb-1.5 text-caption font-semibold text-slate-600 dark:text-slate-400">Passage {p.part}</p>}
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
              {passageQuestions(p).map(({ number: n }) => {
                const done = answered.has(n);
                const flagged = flags.has(n);
                return (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => (flagMode ? onToggleFlag(n) : onJump(n))}
                      aria-label={`Câu ${n}${done ? ', đã làm' : ', chưa làm'}${flagged ? ', đánh dấu xem lại' : ''}`}
                      className={`${cell} w-full ${
                        flagged
                          ? 'border-tone-butter-fg bg-tone-butter-soft text-tone-butter-fg'
                          : done
                            ? 'border-tone-mint-border bg-tone-mint-soft text-tone-mint-fg hover:border-tone-mint-fg'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {n}
                      {flagged && <Flag className="absolute right-1 top-1 h-2.5 w-2.5" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
