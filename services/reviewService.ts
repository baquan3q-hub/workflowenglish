/**
 * Review Service — the single place where a rating is applied to a word.
 *
 * Every rating path (lesson flashcards, SRS review session, quiz lapses and,
 * later, spelling / handwriting / sentence practice) goes through
 * `applyRating`, which:
 *   1. computes the next SM-2 state and mastery level (pure:
 *      `computeRatingUpdate`),
 *   2. upserts the `word_mastery` row,
 *   3. appends a `review_logs` row (best-effort, see `logReviewEvent`),
 *   4. optionally credits the user's daily goal.
 *
 * Before this module the SM-2 → transition → upsert sequence was copied in
 * Flashcards.tsx and ReviewSession.tsx, and QuizMode had a partial third
 * copy that forgot to move `next_review_date`.
 */

import { supabase, withTimeout } from './supabaseClient';
import { calculateSRS, DEFAULT_EASINESS_FACTOR } from './srsService';
import {
  determineMasteryTransition,
  normalizeWord,
  upsertWordMastery,
  SUCCESSFUL_RATING_THRESHOLD,
} from './masteryService';
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

/** The SRS fields a rating reads from an existing word_mastery row. */
export type RatingBaseline = Pick<
  WordMasteryRecord,
  | 'mastery_level'
  | 'easiness_factor'
  | 'interval_days'
  | 'repetition_count'
  | 'correct_count'
  | 'incorrect_count'
>;

/** SRS state of a word that has never been reviewed. */
export const NEW_WORD_BASELINE: RatingBaseline = {
  mastery_level: MasteryLevel.NEW,
  easiness_factor: DEFAULT_EASINESS_FACTOR,
  interval_days: 0,
  repetition_count: 0,
  correct_count: 0,
  incorrect_count: 0,
};

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
}

// --- Pure helpers ----------------------------------------------------------

/**
 * Compute the new SRS state for `rating`. Pure: no I/O, `now` injectable.
 *
 * @param countAnswer  when false, correct/incorrect counters are left as-is
 *                     (used when the caller already counted the answer, e.g.
 *                     `recordQuizIncorrect`).
 */
export function computeRatingUpdate(
  baseline: RatingBaseline | null | undefined,
  rating: ConfidenceRating,
  now: Date = new Date(),
  countAnswer: boolean = true,
): RatingUpdate {
  const base = baseline ?? NEW_WORD_BASELINE;
  const srs = calculateSRS(
    {
      easinessFactor: base.easiness_factor ?? DEFAULT_EASINESS_FACTOR,
      intervalDays: base.interval_days ?? 0,
      repetitionCount: base.repetition_count ?? 0,
    },
    rating,
    now,
  );
  const levelBefore = base.mastery_level ?? MasteryLevel.NEW;
  const levelAfter = determineMasteryTransition(
    levelBefore,
    rating,
    srs.repetitionCount,
    srs.intervalDays,
  );
  const successful = rating >= SUCCESSFUL_RATING_THRESHOLD;
  const correct = base.correct_count ?? 0;
  const incorrect = base.incorrect_count ?? 0;

  return {
    patch: {
      mastery_level: levelAfter,
      easiness_factor: srs.easinessFactor,
      interval_days: srs.intervalDays,
      repetition_count: srs.repetitionCount,
      next_review_date: srs.nextReviewDate.toISOString(),
      last_reviewed_at: now.toISOString(),
      correct_count: countAnswer && successful ? correct + 1 : correct,
      incorrect_count: countAnswer && !successful ? incorrect + 1 : incorrect,
    },
    levelBefore,
    levelAfter,
    intervalBefore: base.interval_days ?? 0,
    intervalAfter: srs.intervalDays,
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
  /** Current row, or null/undefined for a word without SRS state yet. */
  current: (RatingBaseline & { id?: string }) | null | undefined;
  rating: ConfidenceRating;
  source: ReviewSource;
  durationMs?: number | null;
  /** Credit successful ratings to the daily goal (default true). */
  creditGoal?: boolean;
  /** See `computeRatingUpdate` (default true). */
  countAnswer?: boolean;
  now?: Date;
}

/**
 * Apply a rating to a word: update SRS state, log the event, credit the
 * daily goal. Throws only if the `word_mastery` upsert fails; logging and
 * goal tracking failures are swallowed.
 */
export async function applyRating(input: ApplyRatingInput): Promise<ApplyRatingResult> {
  const now = input.now ?? new Date();
  const update = computeRatingUpdate(
    input.current,
    input.rating,
    now,
    input.countAnswer ?? true,
  );

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
