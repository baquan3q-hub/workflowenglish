/**
 * Review Service — the single place where a rating is applied to a word.
 *
 * Every rating path (lesson flashcards, SRS review session, quiz,
 * fill-in-the-blank and, later, handwriting / sentence practice) goes
 * through `applyRating`, which:
 *   1. computes the next SRS state (pure: `computeRatingUpdate`, built on
 *      `reviewLogic.computeReviewUpdate` — SM-2, same-session guard,
 *      interval fuzz),
 *   2. upserts the `word_mastery` row,
 *   3. appends a `review_logs` row (best-effort, see `logReviewEvent`),
 *   4. optionally credits the user's daily goal.
 *
 * It replaces `vocabReviewService.recordReview`, which did steps 1–2 only.
 */

import { supabase, withTimeout } from './supabaseClient';
import {
  getWordMastery,
  normalizeWord,
  upsertWordMastery,
  SUCCESSFUL_RATING_THRESHOLD,
} from './masteryService';
import { computeReviewUpdate, type ReviewableState } from './reviewLogic';
import { recordWordReview } from './goalService';
import {
  MasteryLevel,
  type ConfidenceRating,
  type ReviewLogEntry,
  type ReviewSource,
  type UserGoals,
  type WordMasteryRecord,
} from '../types';

const LOG_TABLE = 'review_logs';

/** Thinking times above this are treated as "user walked away" and not stored. */
export const MAX_TRACKED_DURATION_MS = 10 * 60 * 1000;

/**
 * The fields a rating reads from an existing word_mastery row. Includes
 * `last_reviewed_at` / `next_review_date` for reviewLogic's same-session guard.
 */
export type RatingBaseline = ReviewableState;

export interface RatingUpdate {
  /** Columns to write to `word_mastery` (SRS state only, never metadata). */
  patch: Pick<
    WordMasteryRecord,
    | 'mastery_level'
    | 'easiness_factor'
    | 'interval_days'
    | 'repetition_count'
    | 'next_review_date'
    | 'last_reviewed_at'
    | 'correct_count'
    | 'incorrect_count'
  >;
  levelBefore: MasteryLevel;
  levelAfter: MasteryLevel;
  intervalBefore: number;
  intervalAfter: number;
  /** False when the same-session guard kept the previous schedule. */
  scheduleChanged: boolean;
}

export interface ComputeRatingOptions {
  /**
   * When false, correct/incorrect counters are left as-is (the caller
   * already counted the answer). Default true.
   */
  countAnswer?: boolean;
  /** Random source for interval fuzz, in [0, 1). Default Math.random. */
  rand?: () => number;
}

// --- Pure helpers ----------------------------------------------------------

/**
 * Compute the new SRS state for `rating`. Pure: no I/O, `now` and `rand`
 * injectable. Scheduling (SM-2, mastery transition, same-session guard,
 * interval fuzz) is `reviewLogic.computeReviewUpdate`; this adds the
 * before/after summary that review_logs records.
 */
export function computeRatingUpdate(
  baseline: RatingBaseline | null | undefined,
  rating: ConfidenceRating,
  now: Date = new Date(),
  options: ComputeRatingOptions = {},
): RatingUpdate {
  const { countAnswer = true, rand = Math.random } = options;
  const { scheduleChanged, ...next } = computeReviewUpdate(baseline, rating, now, rand);
  const patch = countAnswer
    ? next
    : {
        ...next,
        correct_count: baseline?.correct_count ?? 0,
        incorrect_count: baseline?.incorrect_count ?? 0,
      };

  return {
    patch,
    levelBefore: baseline?.mastery_level ?? MasteryLevel.NEW,
    levelAfter: patch.mastery_level,
    intervalBefore: baseline?.interval_days ?? 0,
    intervalAfter: patch.interval_days,
    scheduleChanged,
  };
}

/** Clamp a measured thinking time; `null` when missing or implausible. */
export function sanitizeDuration(ms: number | null | undefined): number | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0 || ms > MAX_TRACKED_DURATION_MS) {
    return null;
  }
  return Math.round(ms);
}

// --- review_logs -----------------------------------------------------------

// Set once the table turns out to be missing (migration 005 not applied) so
// we stop sending inserts that can only fail.
let reviewLogsUnavailable = false;

/** Test hook: re-enable logging after a simulated missing table. */
export function resetReviewLogAvailability(): void {
  reviewLogsUnavailable = false;
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  // 42P01: Postgres undefined_table. PGRST205: PostgREST "table not in schema cache".
  return error.code === '42P01' || error.code === 'PGRST205';
}

/**
 * Append one event to `review_logs`. Best-effort: never throws, returns
 * whether the row was written.
 */
export async function logReviewEvent(
  entry: Omit<ReviewLogEntry, 'id' | 'reviewed_at'> & { reviewed_at?: string },
): Promise<boolean> {
  if (reviewLogsUnavailable) return false;
  try {
    const { error } = await withTimeout(Promise.resolve(supabase
      .from(LOG_TABLE)
      .insert({ ...entry, word: normalizeWord(entry.word) })));
    if (error) {
      if (isMissingTableError(error)) {
        reviewLogsUnavailable = true;
        console.warn('[ReviewLogs] review_logs table missing — apply docs/migrations/005_review_logs.sql');
      } else {
        console.warn('[ReviewLogs] insert failed:', error);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[ReviewLogs] insert failed:', err);
    return false;
  }
}

// --- applyRating -----------------------------------------------------------

export interface GoalCredit {
  goalsUpdated: UserGoals;
  /** True only on the review that made the count reach the daily goal. */
  justReached: boolean;
}

export interface ApplyRatingResult {
  record: WordMasteryRecord;
  update: RatingUpdate;
  /**
   * Daily-goal credit, resolved in the background so the UI can advance
   * immediately. `null` when not credited (unsuccessful rating, disabled,
   * or the goal update failed).
   */
  goal: Promise<GoalCredit | null>;
}

export interface ApplyRatingInput {
  userId: string;
  word: string;
  /**
   * Current row (null for a word without SRS state yet). Omit to have it
   * fetched; pass it when the caller already holds the row.
   */
  current?: (RatingBaseline & { id?: string }) | null;
  rating: ConfidenceRating;
  source: ReviewSource;
  durationMs?: number | null;
  /** Credit successful ratings to the daily goal (default true). */
  creditGoal?: boolean;
  /** See `computeRatingUpdate` (default true). */
  countAnswer?: boolean;
  /** Pass it when the rating may be undone: `undoRating` finds the log row by it. */
  now?: Date;
}

/**
 * Apply a rating to a word: update SRS state, log the event, credit the
 * daily goal. Throws only if reading or upserting `word_mastery` fails;
 * logging and goal tracking failures are swallowed.
 */
export async function applyRating(input: ApplyRatingInput): Promise<ApplyRatingResult> {
  const now = input.now ?? new Date();
  const current = input.current !== undefined
    ? input.current
    : await getWordMastery(input.userId, input.word);
  const update = computeRatingUpdate(current, input.rating, now, {
    countAnswer: input.countAnswer ?? true,
  });

  const record = await upsertWordMastery({
    user_id: input.userId,
    word: input.word,
    ...update.patch,
  });

  void logReviewEvent({
    user_id: input.userId,
    word_mastery_id: record.id ?? null,
    word: input.word,
    source: input.source,
    rating: input.rating,
    level_before: update.levelBefore,
    level_after: update.levelAfter,
    interval_before: update.intervalBefore,
    interval_after: update.intervalAfter,
    duration_ms: sanitizeDuration(input.durationMs),
    reviewed_at: now.toISOString(),
  });

  const shouldCredit =
    (input.creditGoal ?? true) && input.rating >= SUCCESSFUL_RATING_THRESHOLD;
  const goal: Promise<GoalCredit | null> = shouldCredit
    ? recordWordReview(input.userId, now)
        .then(({ goalsUpdated, goalReached }) => ({
          goalsUpdated,
          justReached:
            goalReached &&
            goalsUpdated.words_reviewed_today === goalsUpdated.daily_word_goal,
        }))
        .catch((err) => {
          console.warn('[Review] daily goal update failed:', err);
          return null;
        })
    : Promise.resolve(null);

  return { record, update, goal };
}

// --- undoRating ------------------------------------------------------------

/** SRS columns restored by an undo (the same set a rating writes). */
export const SRS_STATE_FIELDS = [
  'mastery_level',
  'easiness_factor',
  'interval_days',
  'repetition_count',
  'next_review_date',
  'last_reviewed_at',
  'correct_count',
  'incorrect_count',
] as const;

/** Pick the SRS state from a row, for an undo snapshot. Pure. */
export function srsSnapshot(record: RatingBaseline): RatingUpdate['patch'] {
  const out = {} as Record<string, unknown>;
  for (const field of SRS_STATE_FIELDS) out[field] = (record as Record<string, unknown>)[field] ?? null;
  return out as RatingUpdate['patch'];
}

export interface UndoRatingInput {
  userId: string;
  word: string;
  /** The row as it was before the rating (the value passed as `current`). */
  snapshot: RatingBaseline;
  /** `now` of the rating being undone; identifies its review_logs row. */
  reviewedAt: Date;
}

/**
 * Revert a rating applied with `applyRating`: write the previous SRS state
 * back and delete the log row it added. The daily-goal counter is not
 * decremented (it only ever counts up for the day).
 */
export async function undoRating(input: UndoRatingInput): Promise<WordMasteryRecord> {
  const record = await upsertWordMastery({
    user_id: input.userId,
    word: input.word,
    ...srsSnapshot(input.snapshot),
  });
  if (!reviewLogsUnavailable) {
    try {
      const { error } = await withTimeout(Promise.resolve(supabase
        .from(LOG_TABLE)
        .delete()
        .eq('user_id', input.userId)
        .eq('word', normalizeWord(input.word))
        .eq('reviewed_at', input.reviewedAt.toISOString())));
      if (error) console.warn('[ReviewLogs] undo delete failed:', error);
    } catch (err) {
      console.warn('[ReviewLogs] undo delete failed:', err);
    }
  }
  return record;
}
