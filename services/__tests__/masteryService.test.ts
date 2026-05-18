/**
 * Property-based tests for the mastery service — word normalization and
 * mastery-level transitions.
 *
 * These tests verify the universal correctness properties documented in
 * `.kiro/specs/personalized-learning/design.md` (Properties 3 and 4) and
 * task 1.6 of the implementation plan.
 *
 * Framework: Vitest + fast-check.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  normalizeWord,
  determineMasteryTransition,
} from '../masteryService';
import { MasteryLevel, type ConfidenceRating } from '../../types';

// --- Arbitraries -----------------------------------------------------------

/**
 * Arbitrary mastery level — uniformly samples one of the 5 enum values.
 * Using `constantFrom` over the numeric enum members gives clean shrinking.
 */
const masteryLevelArb: fc.Arbitrary<MasteryLevel> = fc.constantFrom(
  MasteryLevel.NEW,
  MasteryLevel.LEARNING,
  MasteryLevel.REVIEWING,
  MasteryLevel.MASTERED,
  MasteryLevel.LAPSED,
);

/** Confidence rating: 0 (Again), 1 (Hard), 2 (Good), 3 (Easy). */
const ratingArb: fc.Arbitrary<ConfidenceRating> = fc.constantFrom<ConfidenceRating>(
  0,
  1,
  2,
  3,
);

/** Repetition count post-SM-2, in [0, 50]. */
const repCountArb = fc.integer({ min: 0, max: 50 });

/** Interval days post-SM-2, in [0, 365]. */
const intervalDaysArb = fc.double({
  min: 0,
  max: 365,
  noNaN: true,
  noDefaultInfinity: true,
});

/**
 * Allowed mastery-level transition edges (as documented in the task and
 * the state machine in design.md).
 *
 * Every level may also legally stay where it is when the rules say so;
 * the self-loops are encoded explicitly below where needed.
 */
const ALLOWED_TRANSITIONS: Record<MasteryLevel, ReadonlySet<MasteryLevel>> = {
  [MasteryLevel.NEW]: new Set([MasteryLevel.LEARNING]),
  [MasteryLevel.LEARNING]: new Set([MasteryLevel.LEARNING, MasteryLevel.REVIEWING]),
  [MasteryLevel.REVIEWING]: new Set([
    MasteryLevel.REVIEWING,
    MasteryLevel.MASTERED,
    MasteryLevel.LAPSED,
  ]),
  [MasteryLevel.MASTERED]: new Set([MasteryLevel.MASTERED, MasteryLevel.LAPSED]),
  [MasteryLevel.LAPSED]: new Set([MasteryLevel.LAPSED, MasteryLevel.LEARNING]),
};

// --- Tests -----------------------------------------------------------------

describe('masteryService — property-based tests', () => {
  // -----------------------------------------------------------------
  // Property 1: Normalization idempotence.
  // Validates: Requirement 1.6
  // -----------------------------------------------------------------
  it('Property 1: normalizeWord is idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeWord(s);
        const twice = normalizeWord(once);
        expect(twice).toBe(once);
      }),
    );
  });

  // -----------------------------------------------------------------
  // Property 2: Normalization produces lowercase output.
  // Validates: Requirement 1.6
  // -----------------------------------------------------------------
  it('Property 2: normalizeWord output equals its own lowercase', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const normalized = normalizeWord(s);
        expect(normalized).toBe(normalized.toLowerCase());
      }),
    );
  });

  // -----------------------------------------------------------------
  // Property 3: Valid transitions only — every transition produced by
  // determineMasteryTransition is on the allowed-edges list.
  // Validates: Requirements 1.2, 1.3
  // -----------------------------------------------------------------
  it('Property 3: determineMasteryTransition only produces valid edges', () => {
    fc.assert(
      fc.property(
        masteryLevelArb,
        ratingArb,
        repCountArb,
        intervalDaysArb,
        (currentLevel, rating, repCount, intervalDays) => {
          const next = determineMasteryTransition(
            currentLevel,
            rating,
            repCount,
            intervalDays,
          );
          const allowed = ALLOWED_TRANSITIONS[currentLevel];
          expect(allowed.has(next)).toBe(true);
        },
      ),
    );
  });

  // -----------------------------------------------------------------
  // Property 4: Lapsed only from Reviewing/Mastered with rating 0.
  //
  // We restrict this property to "fresh" transitions (currentLevel !=
  // LAPSED) — staying at LAPSED is a no-op self-loop, not a *transition*
  // into the Lapsed state.
  //
  // Validates: Requirement 1.3
  // -----------------------------------------------------------------
  it('Property 4: a fresh transition into LAPSED only occurs from REVIEWING/MASTERED with rating 0', () => {
    fc.assert(
      fc.property(
        masteryLevelArb.filter((lvl) => lvl !== MasteryLevel.LAPSED),
        ratingArb,
        repCountArb,
        intervalDaysArb,
        (currentLevel, rating, repCount, intervalDays) => {
          const next = determineMasteryTransition(
            currentLevel,
            rating,
            repCount,
            intervalDays,
          );

          if (next === MasteryLevel.LAPSED) {
            expect(rating).toBe(0);
            expect(
              currentLevel === MasteryLevel.REVIEWING ||
                currentLevel === MasteryLevel.MASTERED,
            ).toBe(true);
          }
        },
      ),
    );
  });
});
