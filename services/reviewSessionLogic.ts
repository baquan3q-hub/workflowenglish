/**
 * Pure helpers for the SRS review session screen: how each card is
 * answered, the start-screen time estimate and the end-of-session summary.
 */

import { MasteryLevel, type ConfidenceRating, type WordMasteryRecord } from '../types';
import type { ReviewMode } from './preferencesService';
import { SUCCESSFUL_RATING_THRESHOLD } from './masteryService';

export type CardMode = 'flip' | 'typing' | 'multiple_choice';

/** Average time per card, used for the "~N phút" estimate. */
export const SECONDS_PER_CARD = 8;

/**
 * How a card is answered. Typing/Multiple choice needs the stored Vietnamese meaning,
 * so a word without one is always flipped. `auto` types only words the learner
 * has already met several times (active recall once recognition is easy).
 */
export function resolveCardMode(
  record: Pick<WordMasteryRecord, 'meaning_vi' | 'mastery_level'>,
  mode: ReviewMode,
): CardMode {
  if (!record.meaning_vi) return 'flip';
  if (mode === 'multiple_choice') return 'multiple_choice';
  if (mode === 'typing') return 'typing';
  if (mode === 'flip' || mode === 'handwriting') return 'flip';
  return record.mastery_level === MasteryLevel.REVIEWING ||
    record.mastery_level === MasteryLevel.MASTERED ||
    record.mastery_level === MasteryLevel.LAPSED
    ? 'typing'
    : 'flip';
}

/** Whole minutes for `cards` cards, at least 1. */
export function estimateMinutes(cards: number): number {
  if (cards <= 0) return 0;
  return Math.max(1, Math.round((cards * SECONDS_PER_CARD) / 60));
}

export interface SessionSummary {
  /** Distinct words rated at least once. */
  reviewed: number;
  /** Words whose first rating was Tốt or Dễ. */
  remembered: number;
  /** Words whose first rating was Lại, in the order they were met. */
  forgotten: string[];
  /** Words scheduled again before the end of tomorrow. */
  dueByTomorrow: number;
}

/**
 * Summarise a session. `queue[i]` is the card answered with `ratings[i]`,
 * already replaced by its saved record (so its `next_review_date` is the new
 * one). Only the first `ratings.length` cards count.
 */
export function summarizeSession(
  queue: ReadonlyArray<Pick<WordMasteryRecord, 'word' | 'next_review_date'>>,
  ratings: ReadonlyArray<ConfidenceRating>,
  now: Date = new Date(),
): SessionSummary {
  const first = new Map<string, ConfidenceRating>();
  const latestDue = new Map<string, string>();
  const n = Math.min(queue.length, ratings.length);
  for (let i = 0; i < n; i++) {
    const { word, next_review_date } = queue[i];
    if (!first.has(word)) first.set(word, ratings[i]);
    latestDue.set(word, next_review_date);
  }

  const endOfTomorrow = new Date(now);
  endOfTomorrow.setHours(0, 0, 0, 0);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

  let remembered = 0;
  const forgotten: string[] = [];
  first.forEach((rating, word) => {
    if (rating >= SUCCESSFUL_RATING_THRESHOLD) remembered++;
    if (rating === 0) forgotten.push(word);
  });

  let dueByTomorrow = 0;
  latestDue.forEach((iso) => {
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && t < endOfTomorrow.getTime()) dueByTomorrow++;
  });

  return { reviewed: first.size, remembered, forgotten, dueByTomorrow };
}
