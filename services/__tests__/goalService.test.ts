/**
 * Property-based tests for the goal service streak logic.
 *
 * Validates the universal correctness properties for streak/daily-goal
 * tracking documented in task 2.2 of the implementation plan and
 * Requirements 6.4 and 6.7.
 *
 * Framework: Vitest + fast-check.
 *
 * Only the pure helpers (`checkAndResetStreak`, `updateStreak`) are
 * exercised here — Supabase I/O is intentionally out of scope.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  checkAndResetStreak,
  updateStreak,
  differenceInCalendarDays,
  isSameDay,
} from '../goalService';
import type { UserGoals } from '../../types';

// --- Arbitraries -----------------------------------------------------------

/**
 * Build a UTC-midnight `Date` from year/month/day integers. Using explicit
 * Y/M/D triples (rather than `fc.date()`) keeps the input space tight and
 * deterministic, and matches how the service treats dates (UTC midnight,
 * matching PostgreSQL `DATE` semantics).
 */
const dateArb: fc.Arbitrary<Date> = fc
  .record({
    year: fc.integer({ min: 2000, max: 2099 }),
    month: fc.integer({ min: 0, max: 11 }), // 0-indexed for Date.UTC
    day: fc.integer({ min: 1, max: 28 }), // 28 keeps every month valid
  })
  .map(({ year, month, day }) => new Date(Date.UTC(year, month, day)));

/** A nullable date string in `YYYY-MM-DD` form, mirroring the DB column. */
const nullableDateStringArb: fc.Arbitrary<string | null> = fc.option(
  dateArb.map((d) => d.toISOString().slice(0, 10)),
  { nil: null },
);

/**
 * A `UserGoals` row with realistic field ranges. The streak invariant
 * (`longest_streak >= current_streak`) is enforced at the arbitrary level
 * by deriving `longest_streak` from `current_streak + extra`.
 */
const goalsArb: fc.Arbitrary<UserGoals> = fc
  .record({
    current_streak: fc.integer({ min: 0, max: 365 }),
    extra: fc.integer({ min: 0, max: 365 }),
    daily_word_goal: fc.integer({ min: 1, max: 100 }),
    words_reviewed_today: fc.integer({ min: 0, max: 200 }),
    last_active_date: nullableDateStringArb,
    last_review_reset_date: nullableDateStringArb,
    preferred_level: fc.constantFrom('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
  })
  .map(
    ({
      current_streak,
      extra,
      daily_word_goal,
      words_reviewed_today,
      last_active_date,
      last_review_reset_date,
      preferred_level,
    }): UserGoals => ({
      id: 'test-id',
      user_id: 'test-user',
      current_streak,
      longest_streak: current_streak + extra,
      daily_word_goal,
      words_reviewed_today,
      last_active_date,
      last_review_reset_date,
      preferred_level,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }),
  );

// --- Helpers ---------------------------------------------------------------

const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

// --- Tests -----------------------------------------------------------------

describe('goalService — property-based tests for streak logic', () => {
  // -----------------------------------------------------------------
  // Property 1: longest_streak >= current_streak always.
  // Validates: Requirement 6.7
  //
  // For any starting goals satisfying the invariant and any sequence of
  // `updateStreak` calls (each on a distinct day), the post-state must
  // continue to satisfy `longest_streak >= current_streak`.
  // -----------------------------------------------------------------
  it('Property 1: longest_streak >= current_streak after any sequence of updateStreak calls', () => {
    fc.assert(
      fc.property(
        goalsArb,
        fc.array(dateArb, { minLength: 1, maxLength: 20 }),
        (initialGoals, dates) => {
          // Sanity: arbitrary already enforces this on the seed.
          expect(initialGoals.longest_streak).toBeGreaterThanOrEqual(
            initialGoals.current_streak,
          );

          let goals = initialGoals;
          for (const today of dates) {
            goals = updateStreak(goals, today);
            expect(goals.longest_streak).toBeGreaterThanOrEqual(
              goals.current_streak,
            );
          }
        },
      ),
    );
  });

  // -----------------------------------------------------------------
  // Property 2: streak resets to 0 when daysDiff > 1.
  // Validates: Requirement 6.4
  //
  // For any goals with a non-null `last_active_date` and any `today`
  // such that `differenceInCalendarDays(today, lastActive) > 1`,
  // `checkAndResetStreak` must zero out `current_streak`.
  // -----------------------------------------------------------------
  it('Property 2: checkAndResetStreak resets current_streak to 0 when daysDiff > 1', () => {
    fc.assert(
      fc.property(
        goalsArb,
        dateArb,
        fc.integer({ min: 2, max: 1000 }),
        (seedGoals, lastActive, gapDays) => {
          // Force a non-null last_active_date.
          const goals: UserGoals = {
            ...seedGoals,
            last_active_date: toDateString(lastActive),
          };
          // Build `today` strictly more than 1 day after lastActive.
          const today = new Date(
            lastActive.getTime() + gapDays * 24 * 60 * 60 * 1000,
          );

          // Precondition: the gap is what we think it is.
          expect(differenceInCalendarDays(today, lastActive)).toBe(gapDays);
          expect(gapDays).toBeGreaterThan(1);

          const result = checkAndResetStreak(goals, today);
          expect(result.current_streak).toBe(0);
        },
      ),
    );
  });

  // -----------------------------------------------------------------
  // Property 3: streak increments by exactly 1 when goal is reached on a new day.
  // Validates: Requirement 6.7
  //
  // When `last_active_date !== today` (distinct calendar day, or null),
  // `updateStreak` must increase `current_streak` by exactly 1.
  // -----------------------------------------------------------------
  it('Property 3: updateStreak increments current_streak by exactly 1 on a new day', () => {
    fc.assert(
      fc.property(goalsArb, dateArb, dateArb, (seedGoals, lastActive, today) => {
        // Constrain to the "new day" branch: last_active_date is either
        // null or strictly a different calendar day from today.
        fc.pre(!isSameDay(lastActive, today));

        const goals: UserGoals = {
          ...seedGoals,
          last_active_date: toDateString(lastActive),
        };

        const before = goals.current_streak;
        const result = updateStreak(goals, today);
        expect(result.current_streak).toBe(before + 1);
        // And the new active date is today.
        expect(result.last_active_date).toBe(toDateString(today));
      }),
    );
  });

  // -----------------------------------------------------------------
  // Property 3b: same property when last_active_date is null (first activity).
  // -----------------------------------------------------------------
  it('Property 3b: updateStreak increments by exactly 1 when last_active_date is null', () => {
    fc.assert(
      fc.property(goalsArb, dateArb, (seedGoals, today) => {
        const goals: UserGoals = { ...seedGoals, last_active_date: null };
        const before = goals.current_streak;
        const result = updateStreak(goals, today);
        expect(result.current_streak).toBe(before + 1);
        expect(result.last_active_date).toBe(toDateString(today));
      }),
    );
  });

  // -----------------------------------------------------------------
  // Property 4: words_reviewed_today resets to 0 on a new day.
  // Validates: Requirement 6.4 (daily counter rollover)
  //
  // When `last_review_reset_date !== today` (distinct calendar day, or
  // null), `checkAndResetStreak` must zero out `words_reviewed_today`
  // and stamp `last_review_reset_date` with today.
  // -----------------------------------------------------------------
  it('Property 4: checkAndResetStreak resets words_reviewed_today to 0 on a new day', () => {
    fc.assert(
      fc.property(
        goalsArb,
        dateArb,
        dateArb,
        (seedGoals, lastReset, today) => {
          fc.pre(!isSameDay(lastReset, today));

          const goals: UserGoals = {
            ...seedGoals,
            last_review_reset_date: toDateString(lastReset),
          };

          const result = checkAndResetStreak(goals, today);
          expect(result.words_reviewed_today).toBe(0);
          expect(result.last_review_reset_date).toBe(toDateString(today));
        },
      ),
    );
  });

  // -----------------------------------------------------------------
  // Property 4b: same property when last_review_reset_date is null.
  // -----------------------------------------------------------------
  it('Property 4b: checkAndResetStreak resets words_reviewed_today to 0 when last_review_reset_date is null', () => {
    fc.assert(
      fc.property(goalsArb, dateArb, (seedGoals, today) => {
        const goals: UserGoals = {
          ...seedGoals,
          last_review_reset_date: null,
        };
        const result = checkAndResetStreak(goals, today);
        expect(result.words_reviewed_today).toBe(0);
        expect(result.last_review_reset_date).toBe(toDateString(today));
      }),
    );
  });
});
