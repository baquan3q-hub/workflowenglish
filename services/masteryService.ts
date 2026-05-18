/**
 * Mastery Service — word-level SRS state management.
 *
 * This module exposes:
 *   - Pure helpers (`normalizeWord`, `determineMasteryTransition`) that
 *     contain no I/O and are easy to property-test.
 *   - Async Supabase CRUD functions for the `word_mastery` table created
 *     by `docs/migrations/001_personalized_learning.sql`.
 *
 * State machine (per design.md):
 *
 *   NEW       --any review-->                 LEARNING
 *   LEARNING  --rep>=3 & rating>=2-->         REVIEWING
 *   REVIEWING --interval>21d & rating>=2-->   MASTERED
 *   {REVIEWING, MASTERED} --rating=0-->       LAPSED
 *   LAPSED    --rating>=2-->                  LEARNING
 */

import { supabase } from './supabaseClient';
import {
  MasteryLevel,
  type ConfidenceRating,
  type IncorrectContext,
  type WordMasteryRecord,
} from '../types';

// --- Constants -------------------------------------------------------------

/** Interval (in days) above which a Reviewing word becomes Mastered. */
export const MASTERED_INTERVAL_THRESHOLD_DAYS = 21;

/** Repetition count required to graduate from Learning to Reviewing. */
export const REVIEWING_REPETITION_THRESHOLD = 3;

/** Rating threshold (>=) considered a "successful" review. */
export const SUCCESSFUL_RATING_THRESHOLD: ConfidenceRating = 2;

// --- Pure helpers ----------------------------------------------------------

/**
 * Normalize a word for stable storage / lookup.
 *
 * - Lowercase.
 * - Trim leading/trailing whitespace.
 * - Collapse internal whitespace runs to a single space.
 *
 * Idempotent: `normalizeWord(normalizeWord(s)) === normalizeWord(s)`.
 */
export function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Compute the next mastery level given the current state and the rating
 * just applied. Pure function — no I/O.
 *
 * @param currentLevel  the level prior to applying `rating`
 * @param rating        confidence rating the user just gave
 * @param repCount      repetition count AFTER applying SM-2 (i.e. the new value)
 * @param intervalDays  interval in days AFTER applying SM-2 (the new value)
 */
export function determineMasteryTransition(
  currentLevel: MasteryLevel,
  rating: ConfidenceRating,
  repCount: number,
  intervalDays: number,
): MasteryLevel {
  // "Again" demotes a word that had previously been internalized.
  if (rating === 0) {
    if (
      currentLevel === MasteryLevel.REVIEWING ||
      currentLevel === MasteryLevel.MASTERED
    ) {
      return MasteryLevel.LAPSED;
    }
    // For NEW / LEARNING / LAPSED, a failed review keeps them in LEARNING
    // (NEW transitions into the learning loop on its first review).
    return MasteryLevel.LEARNING;
  }

  const successful = rating >= SUCCESSFUL_RATING_THRESHOLD;

  switch (currentLevel) {
    case MasteryLevel.NEW:
      // First review of any kind moves NEW into the learning loop.
      return MasteryLevel.LEARNING;

    case MasteryLevel.LEARNING:
      if (successful && repCount >= REVIEWING_REPETITION_THRESHOLD) {
        return MasteryLevel.REVIEWING;
      }
      return MasteryLevel.LEARNING;

    case MasteryLevel.REVIEWING:
      if (successful && intervalDays > MASTERED_INTERVAL_THRESHOLD_DAYS) {
        return MasteryLevel.MASTERED;
      }
      return MasteryLevel.REVIEWING;

    case MasteryLevel.MASTERED:
      // Successful reviews keep the word mastered.
      return MasteryLevel.MASTERED;

    case MasteryLevel.LAPSED:
      if (successful) {
        return MasteryLevel.LEARNING;
      }
      return MasteryLevel.LAPSED;

    default:
      return currentLevel;
  }
}

// --- Supabase CRUD ---------------------------------------------------------

const TABLE = 'word_mastery';

/**
 * Fetch the mastery record for a single (user, word). Returns `null` when
 * no row exists (Supabase code `PGRST116`).
 */
export async function getWordMastery(
  userId: string,
  word: string,
): Promise<WordMasteryRecord | null> {
  const normalized = normalizeWord(word);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('word', normalized)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  return data as WordMasteryRecord;
}

/**
 * Insert or update a word mastery row. The `word` field is normalized
 * before being written so that callers don't need to remember to do it.
 *
 * Conflict target is `(user_id, word)`, matching the unique constraint
 * defined in the migration.
 */
export async function upsertWordMastery(
  record: Partial<WordMasteryRecord> & { user_id: string; word: string },
): Promise<WordMasteryRecord> {
  const payload = {
    ...record,
    word: normalizeWord(record.word),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id,word' })
    .select()
    .single();

  if (error) throw error;
  return data as WordMasteryRecord;
}

/**
 * Words whose `next_review_date` has arrived or passed, ordered by the
 * oldest due first (so the most-overdue words surface first in a session).
 */
export async function getDueWords(
  userId: string,
): Promise<WordMasteryRecord[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .lte('next_review_date', nowIso)
    .order('next_review_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as WordMasteryRecord[];
}

/**
 * Count of words currently due for review. Used for the dashboard badge —
 * cheaper than fetching the full rows.
 */
export async function getDueWordCount(userId: string): Promise<number> {
  const nowIso = new Date().toISOString();
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_date', nowIso);

  if (error) throw error;
  return count ?? 0;
}

export interface WordMasteryStats {
  total: number;
  mastered: number;
  learning: number;
  reviewing: number;
  lapsed: number;
  new: number;
}

/**
 * Per-mastery-level word counts for a user. Implemented client-side over a
 * single small projection to keep the query simple and avoid relying on
 * RPC functions.
 */
export async function getWordMasteryStats(
  userId: string,
): Promise<WordMasteryStats> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('mastery_level')
    .eq('user_id', userId);

  if (error) throw error;

  const stats: WordMasteryStats = {
    total: 0,
    mastered: 0,
    learning: 0,
    reviewing: 0,
    lapsed: 0,
    new: 0,
  };

  for (const row of data ?? []) {
    stats.total += 1;
    switch ((row as { mastery_level: number }).mastery_level) {
      case MasteryLevel.NEW:
        stats.new += 1;
        break;
      case MasteryLevel.LEARNING:
        stats.learning += 1;
        break;
      case MasteryLevel.REVIEWING:
        stats.reviewing += 1;
        break;
      case MasteryLevel.MASTERED:
        stats.mastered += 1;
        break;
      case MasteryLevel.LAPSED:
        stats.lapsed += 1;
        break;
    }
  }

  return stats;
}

/**
 * Append an incorrect-quiz context to a word's `incorrect_contexts` JSONB
 * array and bump its `incorrect_count`. Creates the row with sensible
 * defaults if none exists yet (e.g. user encountered the word in a quiz
 * without having reviewed it as a flashcard first).
 *
 * Note: there is a small read-modify-write race here. Quiz answers happen
 * one at a time per user, so in practice this is fine; if we ever need
 * stronger guarantees we can move the append into a Postgres function.
 */
export async function recordQuizIncorrect(
  userId: string,
  word: string,
  context: IncorrectContext,
): Promise<void> {
  const normalized = normalizeWord(word);
  const existing = await getWordMastery(userId, normalized);

  const nextContexts: IncorrectContext[] = [
    ...(existing?.incorrect_contexts ?? []),
    context,
  ];

  const payload: Partial<WordMasteryRecord> & {
    user_id: string;
    word: string;
  } = {
    user_id: userId,
    word: normalized,
    incorrect_count: (existing?.incorrect_count ?? 0) + 1,
    incorrect_contexts: nextContexts,
  };

  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id,word' });

  if (error) throw error;
}

/**
 * Ensure a `word_mastery` row exists for each of `words` belonging to
 * `userId`. Existing rows are left untouched (no overwrite of SRS state)
 * thanks to `ignoreDuplicates: true`.
 *
 * Words are normalized and de-duplicated before insertion. Empty strings
 * and whitespace-only inputs are skipped.
 */
export async function bulkEnsureWords(
  userId: string,
  words: string[],
): Promise<void> {
  const unique = Array.from(
    new Set(
      words
        .map(normalizeWord)
        .filter((w) => w.length > 0),
    ),
  );

  if (unique.length === 0) return;

  const rows = unique.map((word) => ({
    user_id: userId,
    word,
  }));

  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: 'user_id,word', ignoreDuplicates: true });

  if (error) throw error;
}
