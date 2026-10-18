/**
 * Practice mode: check one question group on the spot, with the answer, why,
 * and a link to the paragraph that holds it.
 */
import React from 'react';
import { CheckCheck, EyeOff } from 'lucide-react';
import type { ReadingAnswers, ReadingGroup, ReadingPassage } from '../../../data/ielts/reading/types';
import { gradeReadingGroup, READING_STATUS_LABELS, readingAnswerLabel } from '../../../services/readingLogic';
import { toneClasses } from '../../ui/palette';
import { ghostBtn, secondaryBtn } from '../../ui/styles';
import { READING_STATUS_TONE } from './readingStatus';

interface Props {
  group: ReadingGroup;
  passage: ReadingPassage;
  answers: ReadingAnswers;
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  onShowParagraph: (label: string) => void;
}

export default function GroupCheck({ group, passage, answers, checked, onCheckedChange, onShowParagraph }: Props) {
  if (!checked) {
    return (
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={() => onCheckedChange(true)} className={secondaryBtn}>
          <CheckCheck className="h-4 w-4 text-tone-mint-fg" aria-hidden /> Kiểm tra nhóm này
        </button>
      </div>
    );
  }
  const results = gradeReadingGroup(group, answers, passage);
  const right = results.filter((r) => r.status === 'correct').length;
  return (
    <div className="mt-3 rounded-2xl border border-tone-mint-border bg-tone-mint p-3" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Đúng {right}/{results.length}
        </p>
        <button type="button" onClick={() => onCheckedChange(false)} className={ghostBtn}>
          <EyeOff className="h-4 w-4" aria-hidden /> Ẩn
        </button>
      </div>
      <ul className="space-y-2">
        {results.map((r) => {
          const tone = toneClasses(READING_STATUS_TONE[r.status]);
          return (
            <li key={r.number} className="rounded-xl bg-white/70 p-2.5 text-sm dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-caption font-bold tabular-nums ${tone.tile}`}>{r.number}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-caption font-semibold ${tone.tile}`}>{READING_STATUS_LABELS[r.status]}</span>
                {r.status !== 'correct' && (
                  <span className="text-slate-700 dark:text-slate-300">
                    Đáp án: <strong className="text-slate-900 dark:text-white">{readingAnswerLabel(group, r.question, r.expected)}</strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onShowParagraph(r.question.paragraph)}
                  className="ml-auto inline-flex min-h-9 items-center rounded-lg px-2 text-caption font-semibold text-tone-mint-fg hover:bg-tone-mint-soft"
                >
                  Đoạn {r.question.paragraph}
                </button>
              </div>
              {r.status !== 'correct' && <p className="mt-1.5 text-caption leading-5 text-slate-600 dark:text-slate-400">{r.question.explanationVi}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
