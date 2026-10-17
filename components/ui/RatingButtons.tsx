import React from 'react';
import type { ConfidenceRating } from '../../types';
import { RATING_META } from './srsTheme';

interface RatingButtonsProps {
  onRate: (rating: ConfidenceRating) => void;
  disabled?: boolean;
  /** Ratings above this are locked (e.g. a wrong typed answer caps at "Lại"). Default 3. */
  maxRating?: ConfidenceRating;
  /** Highlighted as the suggested answer. */
  suggested?: ConfidenceRating | null;
  /** Second line under each label, e.g. the predicted interval ("3 ngày"). Indexed by rating. */
  hints?: ReadonlyArray<string | null | undefined>;
  /** Show the 1–4 keyboard shortcut on desktop. Default true. */
  showKeys?: boolean;
  className?: string;
}

/**
 * The four SRS rating buttons (Lại · Khó · Tốt · Dễ), shared by the lesson
 * flashcards and the review session. Quiet by default: a neutral surface
 * with the label in its rating colour; the suggested rating gets a tint and
 * a ring. Keyboard handling stays with the screen, which knows when a
 * rating is allowed.
 */
export const RatingButtons: React.FC<RatingButtonsProps> = ({
  onRate,
  disabled = false,
  maxRating = 3,
  suggested = null,
  hints,
  showKeys = true,
  className = '',
}) => (
  <div role="group" aria-label="Tự đánh giá mức độ nhớ" className={`grid grid-cols-4 gap-2 ${className}`}>
    {RATING_META.map((meta) => {
      const locked = meta.rating > maxRating;
      const isSuggested = suggested === meta.rating;
      const hint = hints?.[meta.rating];
      return (
        <button
          key={meta.rating}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRate(meta.rating);
          }}
          disabled={disabled || locked}
          aria-keyshortcuts={showKeys ? meta.key : undefined}
          aria-label={hint ? `${meta.label}, ${hint}` : meta.label}
          title={locked ? 'Không khả dụng với kết quả vừa rồi' : undefined}
          className={`group relative flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border bg-white px-2 py-2.5 transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:active:scale-100 dark:bg-slate-900 dark:disabled:hover:bg-slate-900 ${meta.quiet} ${
            isSuggested
              ? `border-transparent ring-2 ${meta.ring}`
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <span className="text-[15px] font-semibold">{meta.label}</span>
          {hints && (
            <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">{hint ?? '—'}</span>
          )}
          {showKeys && (
            <kbd className="absolute right-1.5 top-1 hidden font-sans text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:block">
              {meta.key}
            </kbd>
          )}
        </button>
      );
    })}
  </div>
);

export default RatingButtons;
