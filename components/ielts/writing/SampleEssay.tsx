/**
 * One band sample: criterion bands, why it gets this band, and the essay with
 * numbered notes (green: earns marks, rose: loses marks).
 */
import React from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import type { BandEssay } from '../../../data/ielts/writingSamples';
import type { IeltsWritingTask } from '../../../types';
import { annotateParagraph, criterionLabels, essayWordCount } from '../../../services/writingStudyLogic';

const goodMark = 'rounded bg-tone-mint-soft px-0.5 text-tone-mint-fg';
const weakMark = 'rounded bg-tone-blush-soft px-0.5 text-tone-blush-fg';

export default function SampleEssay({ essay, task }: { essay: BandEssay; task: IeltsWritingTask }) {
  const labels = criterionLabels(task);
  let counter = 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <p>
          <span className="block text-caption font-medium text-slate-500 dark:text-slate-400">Band</span>
          <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{essay.band}.0</span>
        </p>
        <dl className="grid min-w-[14rem] flex-1 grid-cols-2 gap-x-4 gap-y-1 text-caption">
          {labels.map((l, i) => (
            <div key={l} className="min-w-0">
              <dt className="truncate text-slate-500 dark:text-slate-400">{l}</dt>
              <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{essay.scores[i]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">{essay.verdict}</p>
      <p className="flex flex-wrap gap-3 text-caption text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={`${goodMark} inline-block h-3 w-5`} /> Điểm cộng
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`${weakMark} inline-block h-3 w-5`} /> Điểm trừ
        </span>
        <span className="tabular-nums">{essayWordCount(essay)} từ</span>
      </p>

      {essay.paragraphs.map((p, i) => {
        const notes = p.notes ?? [];
        const numbers = notes.map(() => ++counter);
        return (
          <div key={i} className="space-y-2">
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {annotateParagraph(p.text, notes).map((piece, k) =>
                piece.note === undefined ? (
                  <React.Fragment key={k}>{piece.text}</React.Fragment>
                ) : (
                  <mark key={k} className={notes[piece.note].kind === 'good' ? goodMark : weakMark}>
                    {piece.text}
                    <sup className="ml-0.5 text-[0.65rem] font-bold tabular-nums">{numbers[piece.note]}</sup>
                  </mark>
                ),
              )}
            </p>
            {notes.length > 0 && (
              <ul className="space-y-1 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                {notes.map((n, k) => (
                  <li key={k} className="flex gap-2 text-caption leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="flex flex-shrink-0 items-center gap-1 font-semibold tabular-nums">
                      {n.kind === 'good' ? (
                        <Check className="h-3.5 w-3.5 text-tone-mint-fg" aria-label="Điểm cộng" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5 text-tone-blush-fg" aria-label="Điểm trừ" />
                      )}
                      {numbers[k]}
                    </span>
                    <span>{n.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
