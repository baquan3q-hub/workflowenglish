/**
 * SRS Service — SM-2 spaced repetition algorithm.
 *
 * All functions in this module are pure: they have no side effects, do not
 * read from any global state, and accept the current date as an optional
 * parameter so that callers (and tests) can inject deterministic clocks.
 *
 * Reference: SuperMemo SM-2 algorithm, adapted to a 4-button rating scheme
 * (Again / Hard / Good / Easy) as described in the personalized-learning
 * design document.
 */

import type { ConfidenceRating } from '../types';

// --- Constants -------------------------------------------------------------

/** Minimum allowed easiness factor in SM-2. */
export const MIN_EASINESS_FACTOR = 1.3;

/** Default easiness factor for a brand-new card. */
export const DEFAULT_EASINESS_FACTOR = 2.5;

/** Number of milliseconds in one day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Types -----------------------------------------------------------------

/**
 * Minimal SRS state required to compute the next review.
 *
 * This is intentionally decoupled from `WordMasteryRecord` so that the
 * algorithm can be reused in any context (tests, previews, etc.) without
 * dragging database concerns along.
 */
export interface SRSCard {
  /** Easiness factor (EF). Must be >= {@link MIN_EASINESS_FACTOR}. */
  easinessFactor: number;
  /** Current interval in days until the next review. */
  intervalDays: number;
  /** Number of consecutive successful reviews so far. */
  repetitionCount: number;
}

/**
 * Result of applying a confidence rating to an {@link SRSCard}.
 */
export interface SRSResult {
  easinessFactor: number;
  intervalDays: number;
  repetitionCount: number;
  /** When the card should be reviewed next. */
  nextReviewDate: Date;
}

// --- Core algorithm --------------------------------------------------------

/**
 * Apply a confidence rating to a card and produce the updated SRS state.
 *
 * Pure function — does not mutate `card` and does not touch any global
 * state. Pass `now` to control the reference date used for
 * `nextReviewDate`; defaults to `new Date()`.
 *
 * Rating semantics:
 *   - 0 (Again): EF -= 0.2 (clamped to {@link MIN_EASINESS_FACTOR}),
 *     interval = 1, repetition = 0
 *   - 1 (Hard):  EF -= 0.15 (clamped), interval *= 1.2 (min 1)
 *   - 2 (Good):  interval = rep==0 ? 1 : rep==1 ? 6 : interval*EF,
 *                repetition += 1
 *   - 3 (Easy):  EF += 0.15, interval = rep==0 ? 4 : interval*EF*1.3,
 *                repetition += 1
 */
export function calculateSRS(
  card: SRSCard,
  rating: ConfidenceRating,
  now: Date = new Date(),
): SRSResult {
  let { easinessFactor, intervalDays, repetitionCount } = card;

  switch (rating) {
    case 0: // Again
      easinessFactor = Math.max(MIN_EASINESS_FACTOR, easinessFactor - 0.2);
      intervalDays = 1;
      repetitionCount = 0;
      break;

    case 1: // Hard
      easinessFactor = Math.max(MIN_EASINESS_FACTOR, easinessFactor - 0.15);
      intervalDays = Math.max(1, intervalDays * 1.2);
      break;

    case 2: // Good
      if (repetitionCount === 0) {
        intervalDays = 1;
      } else if (repetitionCount === 1) {
        intervalDays = 6;
      } else {
        intervalDays = intervalDays * easinessFactor;
      }
      repetitionCount += 1;
      break;

    case 3: // Easy
      easinessFactor += 0.15;
      if (repetitionCount === 0) {
        intervalDays = 4;
      } else {
        intervalDays = intervalDays * easinessFactor * 1.3;
      }
      repetitionCount += 1;
      break;
  }

  return {
    easinessFactor,
    intervalDays,
    repetitionCount,
    nextReviewDate: getNextReviewDate(intervalDays, now),
  };
}

/**
 * Compute the next review date by adding `intervalDays` (rounded up to whole
 * days) to `now`. Pure: does not mutate `now`.
 */
export function getNextReviewDate(
  intervalDays: number,
  now: Date = new Date(),
): Date {
  const days = Math.max(0, Math.ceil(intervalDays));
  return new Date(now.getTime() + days * MS_PER_DAY);
}

// --- Display helpers -------------------------------------------------------

/**
 * Format an interval in days as a human-readable Vietnamese string.
 *
 * Rules:
 *   - days < 1            → "< 1 ngày"
 *   - days < 7            → "{n} ngày"   (n = Math.round(days))
 *   - days < 30           → "{n} tuần"   (n = Math.round(days / 7))
 *   - days < 365          → "{n} tháng"  (n = Math.round(days / 30))
 *   - otherwise           → "{n} năm"    (n = Math.round(days / 365))
 */
export function formatIntervalDisplay(days: number): string {
  if (!Number.isFinite(days) || days < 1) {
    return '< 1 ngày';
  }
  if (days < 7) {
    return `${Math.round(days)} ngày`;
  }
  if (days < 30) {
    return `${Math.round(days / 7)} tuần`;
  }
  if (days < 365) {
    return `${Math.round(days / 30)} tháng`;
  }
  return `${Math.round(days / 365)} năm`;
}
