import React from 'react';
import { Check, X } from 'lucide-react';
import type { AppPhase } from '../types';
import type { LessonStep } from '../services/lessonSummaryLogic';

interface LessonStepperProps {
  steps: ReadonlyArray<LessonStep>;
  onSelect: (phase: AppPhase) => void;
  onExit: () => void;
}

/**
 * Slim bar under the header while a lesson is open. Desktop shows every
 * step by name; phones show "Bước 2/4 · Truyện" over one tappable segment
 * per step. Done steps keep their check when the learner goes back.
 */
export const LessonStepper: React.FC<LessonStepperProps> = ({ steps, onSelect, onExit }) => {
  const currentIdx = steps.findIndex((s) => s.status === 'current');
  const current = steps[currentIdx];

  return (
    <div className="sticky top-14 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:top-16">
      <nav aria-label="Các bước bài học" className="mx-auto flex max-w-6xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex min-h-touch min-w-touch flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Thoát bài học"
          title="Thoát bài học"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Phones */}
        <div className="min-w-0 flex-1 py-1.5 md:hidden">
          <p className="truncate text-caption text-slate-500 dark:text-slate-400">
            {current ? (
              <>
                Bước {currentIdx + 1}/{steps.length} ·{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{current.label}</span>
              </>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-white">Tổng kết bài học</span>
            )}
          </p>
          <ol className="flex gap-1">
            {steps.map((step, i) => (
              <li key={step.phase} className="flex-1">
                <button
                  type="button"
                  onClick={() => onSelect(step.phase)}
                  aria-current={step.status === 'current' ? 'step' : undefined}
                  aria-label={`Bước ${i + 1}: ${step.label}${step.status === 'done' ? ', đã xong' : ''}`}
                  className="flex h-6 w-full items-center"
                >
                  <span
                    className={`h-1 w-full rounded-full ${
                      step.status === 'current'
                        ? 'bg-slate-900 dark:bg-white'
                        : step.status === 'done'
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Tablet and up */}
        <ol className="hidden flex-1 items-center md:flex">
          {steps.map((step, i) => (
            <li key={step.phase} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onSelect(step.phase)}
                aria-current={step.status === 'current' ? 'step' : undefined}
                className={`inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  step.status === 'current'
                    ? 'font-semibold text-slate-900 dark:text-white'
                    : step.status === 'done'
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-caption font-semibold tabular-nums ${
                    step.status === 'current'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : step.status === 'done'
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  {step.status === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {step.label}
                {step.status === 'done' && <span className="sr-only">, đã xong</span>}
              </button>
              {i < steps.length - 1 && (
                <span
                  className={`mx-2 h-px flex-1 ${step.status === 'done' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};
