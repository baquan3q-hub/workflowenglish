/**
 * Shared visual vocabulary for SRS states and review ratings.
 *
 * Every screen that shows a mastery level or a rating takes its label and
 * colours from here, so "Ôn tập" is the same blue everywhere. The colour
 * classes resolve to the CSS-variable tokens declared in index.html
 * (`srs-*`, `rate-*`), which already have light and dark values, so no
 * `dark:` variants are needed.
 *
 * Class strings are written out in full (never built by concatenation) so the
 * Tailwind CDN compiler can see them.
 */

import { MasteryLevel, type ConfidenceRating } from '../../types';

export interface ToneClasses {
  /** Vietnamese label shown to the learner. */
  label: string;
  /** Solid fill for dots, bars and progress segments. */
  dot: string;
  /** Tinted pill/chip: background + text + border. */
  soft: string;
  /** Text colour alone (AA contrast on the page surface). */
  text: string;
  /** Border colour alone. */
  border: string;
}

export const SRS_LEVEL_META: Record<MasteryLevel, ToneClasses> = {
  [MasteryLevel.NEW]: {
    label: 'Mới',
    dot: 'bg-srs-new',
    soft: 'bg-srs-new/10 text-srs-new-fg border-srs-new/30',
    text: 'text-srs-new-fg',
    border: 'border-srs-new',
  },
  [MasteryLevel.LEARNING]: {
    label: 'Đang học',
    dot: 'bg-srs-learning',
    soft: 'bg-srs-learning/15 text-srs-learning-fg border-srs-learning/30',
    text: 'text-srs-learning-fg',
    border: 'border-srs-learning',
  },
  [MasteryLevel.REVIEWING]: {
    label: 'Ôn tập',
    dot: 'bg-srs-reviewing',
    soft: 'bg-srs-reviewing/10 text-srs-reviewing-fg border-srs-reviewing/30',
    text: 'text-srs-reviewing-fg',
    border: 'border-srs-reviewing',
  },
  [MasteryLevel.MASTERED]: {
    label: 'Thành thạo',
    dot: 'bg-srs-mastered',
    soft: 'bg-srs-mastered/10 text-srs-mastered-fg border-srs-mastered/30',
    text: 'text-srs-mastered-fg',
    border: 'border-srs-mastered',
  },
  [MasteryLevel.LAPSED]: {
    label: 'Đã quên',
    dot: 'bg-srs-lapsed',
    soft: 'bg-srs-lapsed/10 text-srs-lapsed-fg border-srs-lapsed/30',
    text: 'text-srs-lapsed-fg',
    border: 'border-srs-lapsed',
  },
};

/** "Tạm ẩn" is a flag (`is_suspended`), not a mastery level, but it is shown like one. */
export const SUSPENDED_META: ToneClasses = {
  label: 'Tạm ẩn',
  dot: 'bg-srs-suspended',
  soft: 'bg-srs-suspended/10 text-srs-suspended-fg border-srs-suspended/40 border-dashed',
  text: 'text-srs-suspended-fg',
  border: 'border-srs-suspended border-dashed',
};

/** Display order: the learner's path from first sight to mastery, then lapses. */
export const SRS_LEVEL_ORDER: readonly MasteryLevel[] = [
  MasteryLevel.NEW,
  MasteryLevel.LEARNING,
  MasteryLevel.REVIEWING,
  MasteryLevel.MASTERED,
  MasteryLevel.LAPSED,
];

/** Look up a level's tone; unknown values (bad data) fall back to "Mới". */
export function getLevelMeta(
  level: MasteryLevel | number | null | undefined,
  suspended = false,
): ToneClasses {
  if (suspended) return SUSPENDED_META;
  return SRS_LEVEL_META[level as MasteryLevel] ?? SRS_LEVEL_META[MasteryLevel.NEW];
}

export interface RatingMeta {
  rating: ConfidenceRating;
  label: string;
  /** Keyboard shortcut shown on desktop. */
  key: string;
  /** Solid button: background, hover and white text (AA). */
  solid: string;
  /** Tinted variant for history rows and chips. */
  soft: string;
  /** Ring used to mark the suggested rating. */
  ring: string;
}

export const RATING_META: readonly RatingMeta[] = [
  {
    rating: 0,
    label: 'Lại',
    key: '1',
    solid: 'bg-rate-again-solid hover:bg-rate-again-solid/90 text-white',
    soft: 'bg-rate-again/10 text-rate-again-fg border-rate-again/30',
    ring: 'ring-rate-again',
  },
  {
    rating: 1,
    label: 'Khó',
    key: '2',
    solid: 'bg-rate-hard-solid hover:bg-rate-hard-solid/90 text-white',
    soft: 'bg-rate-hard/10 text-rate-hard-fg border-rate-hard/30',
    ring: 'ring-rate-hard',
  },
  {
    rating: 2,
    label: 'Tốt',
    key: '3',
    solid: 'bg-rate-good-solid hover:bg-rate-good-solid/90 text-white',
    soft: 'bg-rate-good/10 text-rate-good-fg border-rate-good/30',
    ring: 'ring-rate-good',
  },
  {
    rating: 3,
    label: 'Dễ',
    key: '4',
    solid: 'bg-rate-easy-solid hover:bg-rate-easy-solid/90 text-white',
    soft: 'bg-rate-easy/10 text-rate-easy-fg border-rate-easy/30',
    ring: 'ring-rate-easy',
  },
];

export function getRatingMeta(rating: ConfidenceRating): RatingMeta {
  return RATING_META[rating] ?? RATING_META[0];
}
