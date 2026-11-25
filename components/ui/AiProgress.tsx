import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

export type AiProgressTone = 'lavender' | 'sky' | 'aqua' | 'mint' | 'periwinkle';

export interface AiProgressProps {
  /** Primary status message describing the running AI task. */
  label: string;
  /** Optional stage chips displayed below the progress bar and highlighted as time progresses. */
  stages?: readonly string[];
  /** Explicit 0-based active stage index; when omitted, advances smoothly using `estimatedMs`. */
  activeStage?: number;
  /** Expected runtime in ms used to pace the smooth progress fill (default 14000). */
  estimatedMs?: number;
  /** Optional helpful sub-text under the title row. */
  detail?: string;
  /** Called when the learner clicks "Hủy". When omitted, no cancel button is shown. */
  onCancel?: () => void;
  /** Label for the cancel button (default "Hủy"). */
  cancelLabel?: string;
  /** Tone palette matching the surrounding card/view. */
  tone?: AiProgressTone;
  /** Tighter spacing for inline strips and cards. */
  compact?: boolean;
  /** Additional wrapper classes. */
  className?: string;
}

interface TonePalette {
  box: string;
  barTrack: string;
  barFill: string;
  dot: string;
  activeStep: string;
  doneStep: string;
  idleStep: string;
  timer: string;
  cancelBtn: string;
}

const TONES: Record<AiProgressTone, TonePalette> = {
  lavender: {
    box: 'border-tone-lavender-border/80 bg-tone-lavender/75 text-tone-lavender-fg',
    barTrack: 'bg-tone-lavender-border/45',
    barFill: 'bg-tone-lavender-accent',
    dot: 'bg-tone-lavender-fg',
    activeStep: 'border-tone-lavender-border bg-tone-lavender-soft text-tone-lavender-fg',
    doneStep: 'border-tone-mint-border/70 bg-tone-mint-soft/75 text-tone-mint-fg',
    idleStep: 'border-transparent bg-white/55 text-slate-600 dark:bg-slate-900/45 dark:text-slate-300',
    timer: 'text-tone-lavender-fg/80',
    cancelBtn: 'border-tone-lavender-border bg-white/85 text-tone-lavender-fg hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900',
  },
  sky: {
    box: 'border-tone-sky-border/80 bg-tone-sky/75 text-tone-sky-fg',
    barTrack: 'bg-tone-sky-border/45',
    barFill: 'bg-tone-sky-accent',
    dot: 'bg-tone-sky-fg',
    activeStep: 'border-tone-sky-border bg-tone-sky-soft text-tone-sky-fg',
    doneStep: 'border-tone-mint-border/70 bg-tone-mint-soft/75 text-tone-mint-fg',
    idleStep: 'border-transparent bg-white/55 text-slate-600 dark:bg-slate-900/45 dark:text-slate-300',
    timer: 'text-tone-sky-fg/80',
    cancelBtn: 'border-tone-sky-border bg-white/85 text-tone-sky-fg hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900',
  },
  aqua: {
    box: 'border-tone-aqua-border/80 bg-tone-aqua/75 text-tone-aqua-fg',
    barTrack: 'bg-tone-aqua-border/45',
    barFill: 'bg-tone-aqua-accent',
    dot: 'bg-tone-aqua-fg',
    activeStep: 'border-tone-aqua-border bg-tone-aqua-soft text-tone-aqua-fg',
    doneStep: 'border-tone-mint-border/70 bg-tone-mint-soft/75 text-tone-mint-fg',
    idleStep: 'border-transparent bg-white/55 text-slate-600 dark:bg-slate-900/45 dark:text-slate-300',
    timer: 'text-tone-aqua-fg/80',
    cancelBtn: 'border-tone-aqua-border bg-white/85 text-tone-aqua-fg hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900',
  },
  mint: {
    box: 'border-tone-mint-border/80 bg-tone-mint/75 text-tone-mint-fg',
    barTrack: 'bg-tone-mint-border/45',
    barFill: 'bg-tone-mint-accent',
    dot: 'bg-tone-mint-fg',
    activeStep: 'border-tone-mint-border bg-tone-mint-soft text-tone-mint-fg',
    doneStep: 'border-tone-mint-border/70 bg-white/80 text-tone-mint-fg dark:bg-slate-900/60',
    idleStep: 'border-transparent bg-white/55 text-slate-600 dark:bg-slate-900/45 dark:text-slate-300',
    timer: 'text-tone-mint-fg/80',
    cancelBtn: 'border-tone-mint-border bg-white/85 text-tone-mint-fg hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900',
  },
  periwinkle: {
    box: 'border-tone-periwinkle-border/80 bg-tone-periwinkle/75 text-tone-periwinkle-fg',
    barTrack: 'bg-tone-periwinkle-border/45',
    barFill: 'bg-tone-periwinkle-accent',
    dot: 'bg-tone-periwinkle-fg',
    activeStep: 'border-tone-periwinkle-border bg-tone-periwinkle-soft text-tone-periwinkle-fg',
    doneStep: 'border-tone-mint-border/70 bg-tone-mint-soft/75 text-tone-mint-fg',
    idleStep: 'border-transparent bg-white/55 text-slate-600 dark:bg-slate-900/45 dark:text-slate-300',
    timer: 'text-tone-periwinkle-fg/80',
    cancelBtn: 'border-tone-periwinkle-border bg-white/85 text-tone-periwinkle-fg hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900',
  },
};

function formatElapsed(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function AiProgress({
  label,
  stages,
  activeStage,
  estimatedMs = 14_000,
  detail,
  onCancel,
  cancelLabel = 'Hủy',
  tone = 'lavender',
  compact = false,
  className = '',
}: AiProgressProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    setElapsedMs(0);
    const id = setInterval(() => setElapsedMs(Date.now() - start), 200);
    return () => clearInterval(id);
  }, [label]);

  const palette = TONES[tone];
  const safeEst = Math.max(2500, estimatedMs);
  const ratio = 1 - Math.exp(-elapsedMs / (safeEst * 0.55));
  const pct = Math.min(94, Math.max(8, Math.round(ratio * 94)));
  const stageCount = stages?.length ?? 0;
  const currentStage =
    stageCount === 0
      ? -1
      : typeof activeStage === 'number'
        ? Math.max(0, Math.min(stageCount - 1, activeStage))
        : Math.min(stageCount - 1, Math.floor((elapsedMs / safeEst) * stageCount));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`border ${compact ? 'space-y-2 rounded-xl px-3.5 py-2.5' : 'space-y-2.5 rounded-2xl p-4'} ${palette.box} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <span className={`${compact ? 'text-xs sm:text-sm' : 'text-sm'} font-semibold leading-snug`}>{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-mono text-xs tabular-nums ${palette.timer}`}>{formatElapsed(elapsedMs)}</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label={`${cancelLabel}: ${label}`}
              className={`press inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border font-semibold transition-colors ${
                compact ? 'min-h-[36px] px-2.5 text-xs' : 'min-h-touch px-3 text-xs sm:text-sm'
              } ${palette.cancelBtn}`}
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{cancelLabel}</span>
            </button>
          )}
        </div>
      </div>

      {detail && <p className="text-xs leading-relaxed opacity-85">{detail}</p>}

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={`h-1.5 w-full overflow-hidden rounded-full ${palette.barTrack}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${palette.barFill}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {stages && stages.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-0.5" aria-label="Tiến trình xử lý">
          {stages.map((stage, i) => {
            const done = i < currentStage;
            const active = i === currentStage;
            return (
              <li
                key={stage}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  done ? palette.doneStep : active ? palette.activeStep : palette.idleStep
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                ) : active ? (
                  <span className={`anim-record-pulse h-1.5 w-1.5 shrink-0 rounded-full ${palette.dot}`} aria-hidden="true" />
                ) : null}
                <span>{stage}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
