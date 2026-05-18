/**
 * Goal Service — daily word goals, streak tracking, and per-day counters.
 *
 * The module is split into two halves:
 *
 *   1. Pure helpers (`isSameDay`, `differenceInCalendarDays`,
 *      `checkAndResetStreak`, `updateStreak`). These contain no I/O and
 *      accept the current date as an explicit parameter so callers (and
 *      tests) can inject deterministic clocks. They are the property-test
 *      surface for streak logic.
 *
 *   2. Async Supabase CRUD (`getOrCreateUserGoals`, `updateDailyGoal`,
 *      `recordWordReview`) which compose the pure helpers with the
 *      `user_goals` table created by
 *      `docs/migrations/001_personalized_learning.sql`.
 *
 * Date handling:
 *   - `last_active_date` and `last_review_reset_date` are stored as
 *     `YYYY-MM-DD` (PostgreSQL DATE). All "is this a new day?" comparisons
 *     are made at UTC midnight to match what Postgres stores.
 */

import { supabase } from './supabaseClient';
import type { UserGoals } from '../types';

// --- Constants -------------------------------------------------------------

const TABLE = 'user_goals';

/** Default goal values applied when creating a fresh row for a user. */
export const DEFAULT_DAILY_WORD_GOAL = 10;
export const DEFAULT_PREFERRED_LEVEL = 'B1';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Pure date utilities ---------------------------------------------------

/**
 * Format a `Date` (or `YYYY-MM-DD` string) as `YYYY-MM-DD` using UTC.
 * Returns `null` for `null`/`undefined` so it round-trips with the DB.
 */
function toDateString(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    // Accept either 'YYYY-MM-DD' (already a DATE) or a full ISO timestamp.
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  return value.toISOString().slice(0, 10);
}

/**
 * Convert a stored DATE string (`YYYY-MM-DD`) to a `Date` anchored at
 * UTC midnight. Returns `null` for `null` input.
 */
function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  // `new Date('YYYY-MM-DD')` is parsed as UTC midnight per the ECMAScript
  // spec, which is exactly what we want.
  const trimmed = value.length > 10 ? value.slice(0, 10) : value;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * True when both dates fall on the same calendar day in UTC.
 *
 * Comparing UTC Y/M/D parts (rather than `toDateString()` or local time)
 * avoids time-zone surprises and matches the semantics of PostgreSQL's
 * DATE type, which is what we persist.
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Number of calendar days between two dates, measured at UTC midnight.
 *
 * Returns a signed integer: positive when `later` is after `earlier`,
 * negative when before, zero when on the same UTC day.
 *
 * Examples (UTC):
 *   diff(2024-01-02, 2024-01-01) === 1
 *   diff(2024-01-01, 2024-01-01) === 0
 *   diff(2024-01-01, 2024-01-02) === -1
 */
export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const a = Date.UTC(
    later.getUTCFullYear(),
    later.getUTCMonth(),
    later.getUTCDate(),
  );
  const b = Date.UTC(
    earlier.getUTCFullYear(),
    earlier.getUTCMonth(),
    earlier.getUTCDate(),
  );
  return Math.round((a - b) / MS_PER_DAY);
}

// --- Pure streak helpers ---------------------------------------------------

/**
 * Apply day-rollover logic without recording any new activity.
 *
 * - If `last_active_date` is more than 1 calendar day before `today`, the
 *   user missed a full day → reset `current_streak` to 0.
 * - If we have moved to a new calendar day relative to
 *   `last_review_reset_date`, reset `words_reviewed_today` to 0 and stamp
 *   `last_review_reset_date` to today.
 *
 * Pure: returns a new object, does not mutate `goals`.
 */
export function checkAndResetStreak(
  goals: UserGoals,
  today: Date,
): UserGoals {
  let next: UserGoals = { ...goals };

  // Streak: missed a full day → reset.
  const lastActive = parseDateOnly(next.last_active_date);
  if (lastActive) {
    const daysSinceActive = differenceInCalendarDays(today, lastActive);
    if (daysSinceActive > 1) {
      next = { ...next, current_streak: 0 };
    }
  }

  // Daily counter: roll over on a new UTC day.
  const lastReset = parseDateOnly(next.last_review_reset_date);
  const todayStr = toDateString(today)!;
  if (!lastReset || !isSameDay(lastReset, today)) {
    next = {
      ...next,
      words_reviewed_today: 0,
      last_review_reset_date: todayStr,
    };
  }

  return next;
}

/**
 * Increment the streak when the user has just reached today's goal.
 *
 * Caller is responsible for verifying the goal was reached. This function
 * only enforces the "don't double-count the same day" rule:
 *
 *   - If `last_active_date` is already today → return goals unchanged.
 *   - Otherwise → `current_streak += 1`, stamp `last_active_date = today`,
 *     and bump `longest_streak` if the new streak exceeds it.
 *
 * Pure: returns a new object, does not mutate `goals`.
 */
export function updateStreak(goals: UserGoals, today: Date): UserGoals {
  const lastActive = parseDateOnly(goals.last_active_date);
  if (lastActive && isSameDay(lastActive, today)) {
    // Already counted today — keep the goals as-is.
    return { ...goals };
  }

  const nextStreak = goals.current_streak + 1;
  const nextLongest = Math.max(goals.longest_streak, nextStreak);

  return {
    ...goals,
    current_streak: nextStreak,
    longest_streak: nextLongest,
    last_active_date: toDateString(today)!,
  };
}

// --- Supabase CRUD ---------------------------------------------------------

/**
 * Fetch the user's goals row, creating one with defaults on first access.
 *
 * Defaults match the migration: daily_word_goal=10, current_streak=0,
 * longest_streak=0, preferred_level='B1'. All date fields start as `null`.
 */
export async function getOrCreateUserGoals(
  userId: string,
): Promise<UserGoals> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  if (data) {
    return data as UserGoals;
  }

  // No row yet — create one with defaults.
  const { data: created, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      daily_word_goal: DEFAULT_DAILY_WORD_GOAL,
      current_streak: 0,
      longest_streak: 0,
      words_reviewed_today: 0,
      preferred_level: DEFAULT_PREFERRED_LEVEL,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return created as UserGoals;
}

/**
 * Update the user's daily word goal. Ensures the row exists first so
 * brand-new users can change their goal before having any activity.
 */
export async function updateDailyGoal(
  userId: string,
  goal: number,
): Promise<UserGoals> {
  // Ensure the row exists (idempotent for existing users).
  await getOrCreateUserGoals(userId);

  const { data, error } = await supabase
    .from(TABLE)
    .update({ daily_word_goal: goal })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserGoals;
}

/**
 * Record a single word review against the user's daily goal.
 *
 * Flow:
 *   1. Load (or create) the goals row.
 *   2. Apply `checkAndResetStreak` so a missed day resets the streak and
 *      a new day resets `words_reviewed_today` before we increment.
 *   3. Increment `words_reviewed_today` by 1.
 *   4. If the daily goal is reached, apply `updateStreak` (which handles
 *      the "already counted today" case internally).
 *   5. Persist the changed columns and return the new state along with
 *      whether the goal was reached on this call.
 *
 * Returns `{ goalsUpdated, goalReached }` where `goalReached` is `true`
 * when the post-increment count is >= the daily goal.
 */
export async function recordWordReview(
  userId: string,
  today: Date = new Date(),
): Promise<{ goalsUpdated: UserGoals; goalReached: boolean }> {
  const current = await getOrCreateUserGoals(userId);

  // Roll over day-based counters first.
  let next = checkAndResetStreak(current, today);

  // Count this review.
  next = {
    ...next,
    words_reviewed_today: next.words_reviewed_today + 1,
  };

  const goalReached = next.words_reviewed_today >= next.daily_word_goal;
  if (goalReached) {
    next = updateStreak(next, today);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      current_streak: next.current_streak,
      longest_streak: next.longest_streak,
      last_active_date: next.last_active_date,
      words_reviewed_today: next.words_reviewed_today,
      last_review_reset_date: next.last_review_reset_date,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return {
    goalsUpdated: data as UserGoals,
    goalReached,
  };
}
