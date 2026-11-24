import React from 'react';
import { ChevronDown, Flag } from 'lucide-react';
import { stageLessons, stages } from '../../data/grammar/meta';
import type { StageId } from '../../data/grammar/types';
import { atLeast, isDone, type Snapshot } from '../../services/grammar/progress';
import { secondaryBtn } from '../ui/styles';
import { StatusDot, StatusPill, stageTone } from './shared';

/** Lesson status for display; "known" while placement is the only evidence. */
export const statusOf = (snap: Snapshot, id: string) => {
  const s = snap.stats.get(id)!;
  const onlyPlacement = s.graded.every((a) => a.mode === 'diagnostic') && !s.studied;
  return snap.known.has(id) && onlyPlacement && !atLeast(s.status, 'understood') ? 'known' : s.status;
};

interface Props {
  snap: Snapshot;
  /** Stage to open: where the learner is now. */
  openStage: StageId;
  busy: boolean;
  onOpenLesson: (id: string) => void;
  onCheckpoint: (stage: StageId) => void;
}

export default function GrammarPath({ snap, openStage, busy, onOpenLesson, onCheckpoint }: Props) {
  return (
    <ol className="flex flex-col gap-3" aria-label="Lộ trình 7 chặng">
      {stages.map((stage) => {
        const list = stageLessons(stage.id);
        const done = list.filter((l) => isDone(snap, l.id)).length;
        const tone = stageTone(stage.id);
        return (
          <li key={stage.id}>
            <details open={stage.id === openStage || undefined} className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex min-h-touch cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ' + tone.soft + ' ' + tone.fg}>{stage.id}</span>
                <span className="flex-1">
                  <span className={'block text-xs font-bold uppercase tracking-wide ' + tone.fg}>
                    Chặng {stage.id} · {stage.cefr}
                  </span>
                  <span className="block text-base font-bold text-slate-900 dark:text-white">{stage.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className={'block h-full rounded-full ' + tone.accent} style={{ width: (100 * done) / list.length + '%' }} />
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {done}/{list.length}
                    </span>
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-800">
                <p className="py-3 text-sm text-slate-600 dark:text-slate-300">{stage.outcome}</p>
                <ul className="relative flex flex-col">
                  {list.map((l, i) => {
                    const status = statusOf(snap, l.id);
                    return (
                      <li key={l.id} className="relative">
                        {i < list.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-8 h-[calc(100%-1rem)] w-0.5 bg-slate-200 dark:bg-slate-700" />}
                        <button type="button" onClick={() => onOpenLesson(l.id)} className="press flex min-h-touch w-full items-center gap-3 rounded-xl py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <StatusDot status={status} />
                          <span className="flex-1">
                            <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">{l.title}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{l.en}</span>
                          </span>
                          <StatusPill status={status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className={secondaryBtn + ' mt-3 w-full'} disabled={busy} onClick={() => onCheckpoint(stage.id)}>
                  <Flag className="h-4 w-4" aria-hidden="true" /> Kiểm tra cuối chặng ({list.length + 1} câu)
                </button>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
