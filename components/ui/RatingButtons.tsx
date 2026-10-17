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
 * flashcards and the review session. Keyboard handling stays with the
 * screen, which knows when a rating is allowed.
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
  <div role="group" aria-label="Tự đánh giá mức độ nhớ" className={`grid grid-cols-4 gap-2 sm:gap-3 ${className}`}>
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
          className={`flex min-h-touch flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-3 font-semibold shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100 sm:py-4 ${meta.solid} ${isSuggested ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${meta.ring}` : ''}`}
        >
          <span className="text-base sm:text-lg">{meta.label}</span>
          {hints && (
            <span className="text-[11px] font-medium opacity-90 sm:text-xs">{hint ?? '—'}</span>
          )}
          {showKeys && (
            <kbd className="hidden rounded bg-white/20 px-1.5 text-[10px] font-semibold sm:block">{meta.key}</kbd>
          )}
        </button>
      );
    })}
  </div>
);

export default RatingButtons;
