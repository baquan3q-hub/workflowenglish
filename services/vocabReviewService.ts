/**
 * Vocab Review Service — the single write path for "the learner just
 * answered something about this word".
 *
 * Every exercise (flashcards, SRS review, quiz, fill-in-the-blank) funnels
 * its result through `recordReview`, so scheduling rules — the
 * same-session guard and interval fuzz in `reviewLogic` — apply
 * consistently no matter where the answer came from.
 */

import type { ConfidenceRating, WordMasteryRecord } from '../types';
import { computeReviewUpdate } from './reviewLogic';
import { getWordMastery, normalizeWord, upsertWordMastery } from './masteryService';

/**
 * Apply `rating` to the learner's record for `word` and persist it.
 *
 * Pass `existing` when the caller already holds the row (saves a round
 * trip); otherwise it is fetched. Missing rows are created.
 */
export async function recordReview(
  userId: string,
  word: string,
  rating: ConfidenceRating,
  existing?: WordMasteryRecord | null,
): Promise<WordMasteryRecord> {
  const current = existing === undefined ? await getWordMastery(userId, word) : existing;
  const { scheduleChanged: _ignored, ...update } = computeReviewUpdate(current, rating);
  return upsertWordMastery({
    user_id: userId,
    word: normalizeWord(word),
    ...update,
  });
}
