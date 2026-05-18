/**
 * Property-based tests for the SRS service (SM-2 algorithm).
 *
 * These tests verify the universal correctness properties documented in
 * `.kiro/specs/personalized-learning/design.md` (Properties 1, 2, 5, 8)
 * and task 1.4 of the implementation plan.
 *
 * Framework: Vitest + fast-check.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  calculateSRS,
  MIN_EASINESS_FACTOR,
  type SRSCard,
} from '../srsService';
import type { ConfidenceRating } from '../../types';

// --- Arbitraries -----------------------------------------------------------

/** EF in [1.3, 5.0]. Matches valid SM-2 EF range. */
const easinessFactorArb = fc.double({
  min: 1.3,
  max: 5.0,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Interval in days, in [1, 365]. */
const intervalDaysArb = fc.double({
  min: 1,
  max: 365,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Repetition count in [0, 50]. */
const repetitionCountArb = fc.integer({ min: 0, max: 50 });

/** A confidence rating: 0 (Again), 1 (Hard), 2 (Good), 3 (Easy). */
const ratingArb = fc.integer({ min: 0, max: 3 }) as fc.Arbitrary<ConfidenceRating>;

/** A complete SRSCard. */
const cardArb: fc.Arbitrary<SRSCard> = fc.record({
  easinessFactor: easinessFactorArb,
  intervalDays: intervalDaysArb,
  repetitionCount: repetitionCountArb,
});

// --- Tests -----------------------------------------------------------------

describe('srsService — property-based tests', () => {
  // -----------------------------------------------------------------
  // Property 1: Interval monotonicity for Good/Easy with rep > 1.
  // Validates: Requirements 2.4, 2.5
  // -----------------------------------------------------------------
  it('Property 1: Good/Easy with repetitionCount > 1 strictly increases interval', () => {
    fc.assert(
      fc.property(
        cardArb,
        fc.constantFrom<ConfidenceRating>(2, 3),
        (cardSeed, rating) => {
          // Force repetitionCount > 1 so we exercise the multiplicative branch.
          const card: SRSCard = {
            ...cardSeed,
            repetitionCount: cardSeed.repetitionCount < 2 ? 2 : cardSeed.repetitionCount,
          };

          const result = calculateSRS(card, rating);
          // For Good: new = old * EF, EF >= 1.3 > 1 → strictly larger.
          // For Easy: new = old * EF * 1.3, EF >= 1.3 → strictly larger.
          expect(result.intervalDays).toBeGreaterThan(card.intervalDays);
        },
      ),
    );
  });

  // -----------------------------------------------------------------
  // Property 2: EF bounds — for any sequence of ratings, EF stays >= 1.3.
  // Validates: Requirements 2.2, 2.3, 2.5
  // -----------------------------------------------------------------
  it('Property 2: easinessFactor never drops below 1.3 across any rating sequence', () => {
    fc.assert(
      fc.property(
        cardArb,
        fc.array(ratingArb, { minLength: 1, maxLength: 50 }),
        (initialCard, ratings) => {
          let card: SRSCard = { ...initialCard };

          for (const rating of ratings) {
            const result = calculateSRS(card, rating);
            expect(result.easinessFactor).toBeGreaterThanOrEqual(MIN_EASINESS_FACTOR);

            // Carry state forward for the next iteration.
            card = {
              easinessFactor: result.easinessFactor,
              intervalDays: result.intervalDays,
              repetitionCount: result.repetitionCount,
            };
          }
        },
      ),
    );
  });

  // -----------------------------------------------------------------
  // Property 3: "Again" always resets — interval=1, repetitionCount=0.
  // Validates: Requirement 2.2
  // -----------------------------------------------------------------
  it('Property 3: rating 0 (Again) always resets interval to 1 and repetition to 0', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const result = calculateSRS(card, 0);
        expect(result.intervalDays).toBe(1);
        expect(result.repetitionCount).toBe(0);
      }),
    );
  });

  // -----------------------------------------------------------------
  // Property 4: "Easy" always increases EF.
  // Validates: Requirement 2.5
  // -----------------------------------------------------------------
  it('Property 4: rating 3 (Easy) always increases easinessFactor', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const result = calculateSRS(card, 3);
        // Easy adds 0.15 unconditionally (no clamp on the upper side).
        expect(result.easinessFactor).toBeGreaterThan(card.easinessFactor);
        expect(result.easinessFactor).toBeCloseTo(card.easinessFactor + 0.15, 10);
      }),
    );
  });

  // -----------------------------------------------------------------
  // Property 5: Resulting interval is always >= 1.
  // Validates: Requirements 2.2, 2.3, 2.4, 2.5
  // -----------------------------------------------------------------
  it('Property 5: any rating produces intervalDays >= 1', () => {
    fc.assert(
      fc.property(cardArb, ratingArb, (card, rating) => {
        const result = calculateSRS(card, rating);
        expect(result.intervalDays).toBeGreaterThanOrEqual(1);
      }),
    );
  });
});
