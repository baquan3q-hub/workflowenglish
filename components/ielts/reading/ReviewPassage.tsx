/**
 * A passage for review: the evidence of the chosen question marked mint and
 * its distractor blush. Scrolls itself to the paragraph that holds the answer
 * whenever the question changes. `only` shows just those paragraphs, for the
 * excerpt inside a result card on small screens.
 */
import React, { useEffect, useRef } from 'react';
import type { ReadingPassage } from '../../../data/ielts/reading/types';
import { markSegments, type ReviewMark } from '../../../services/readingReview';

interface Props {
  passage: ReadingPassage;
  marks: Record<string, ReviewMark[]>;
  /** Paragraph to bring into view. */
  focus?: string;
  /** Changes whenever a new question is chosen, so the same paragraph scrolls again. */
  focusKey?: string | number;
  only?: string[];
  className?: string;
}

const MARK_CLASS = {
  evidence: 'rounded-sm bg-tone-mint-soft px-0.5 font-medium text-slate-900 ring-1 ring-tone-mint-border dark:text-white',
  distractor: 'rounded-sm bg-tone-blush-soft px-0.5 text-inherit underline decoration-tone-blush-fg decoration-wavy underline-offset-4',
} as const;

export function MarkLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-slate-600 dark:text-slate-400">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm bg-tone-mint-soft ring-1 ring-tone-mint-border" aria-hidden /> Bằng chứng
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm bg-tone-blush-soft" aria-hidden /> Bẫy
      </span>
    </p>
  );
}

export default function ReviewPassage({ passage, marks, focus, focusKey, only, className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const para = focus ? root?.querySelector<HTMLElement>(`[data-review-para="${focus}"]`) : null;
    // Scroll the panel itself; the page stays where the learner is reading.
    if (root && para && root.scrollHeight > root.clientHeight) {
      root.scrollTo({ top: Math.max(0, para.offsetTop - 12), behavior: 'smooth' });
    }
  }, [focus, focusKey, passage.id]);

  const paragraphs = only ? passage.paragraphs.filter((p) => only.includes(p.label)) : passage.paragraphs;
  return (
    <div ref={rootRef} className={`relative space-y-3 ${className}`}>
      {paragraphs.map((p) => {
        const mine = marks[p.label] ?? [];
        return (
          <section
            key={p.label}
            data-review-para={p.label}
            className={`flex gap-3 rounded-xl p-2 transition-colors ${p.label === focus ? 'bg-tone-mint/60' : ''}`}
          >
            <span
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-tone-mint-soft text-sm font-bold text-tone-mint-fg"
              aria-label={`Đoạn ${p.label}`}
            >
              {p.label}
            </span>
            <p className="flex-1 text-[15px] leading-7 text-slate-800 dark:text-slate-200">
              {markSegments(p.text, mine).map((s) =>
                s.kind ? (
                  <mark key={s.start} className={MARK_CLASS[s.kind]}>
                    <span className="sr-only">{s.kind === 'evidence' ? 'Bằng chứng: ' : 'Bẫy: '}</span>
                    {s.text}
                  </mark>
                ) : (
                  <React.Fragment key={s.start}>{s.text}</React.Fragment>
                ),
              )}
            </p>
          </section>
        );
      })}
    </div>
  );
}
