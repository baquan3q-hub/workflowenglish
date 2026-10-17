/**
 * Tests for the review service — the single path that applies a rating to
 * a word (SM-2 update, mastery transition, review log, daily goal).
 *
 * Framework: Vitest + fast-check.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

const insertMock = vi.fn();
const upsertWordMasteryMock = vi.fn();
const recordWordReviewMock = vi.fn();

vi.mock('../supabaseClient', () => ({
  supabase: { from: () => ({ insert: insertMock }) },
  withTimeout: (p: Promise<unknown>) => p,
}));

vi.mock('../masteryService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../masteryService')>();
  return { ...actual, upsertWordMastery: (...args: unknown[]) => upsertWordMasteryMock(...args) };
});

vi.mock('../goalService', () => ({
  recordWordReview: (...args: unknown[]) => recordWordReviewMock(...args),
}));

import {
  applyRating,
  computeRatingUpdate,
  logReviewEvent,
  resetReviewLogAvailability,
  sanitizeDuration,
  MAX_TRACKED_DURATION_MS,
  NEW_WORD_BASELINE,
  type RatingBaseline,
} from '../reviewService';
import { calculateSRS } from '../srsService';
import { determineMasteryTransition, isWordDue } from '../masteryService';
import { MasteryLevel, type ConfidenceRating } from '../../types';

// --- Arbitraries -----------------------------------------------------------

const ratingArb: fc.Arbitrary<ConfidenceRating> = fc.constantFrom(0, 1, 2, 3);

const baselineArb: fc.Arbitrary<RatingBaseline> = fc.record({
  mastery_level: fc.constantFrom(
    MasteryLevel.NEW,
    MasteryLevel.LEARNING,
    MasteryLevel.REVIEWING,
    MasteryLevel.MASTERED,
    MasteryLevel.LAPSED,
  ),
  easiness_factor: fc.double({ min: 1.3, max: 3, noNaN: true }),
  interval_days: fc.integer({ min: 0, max: 365 }),
  repetition_count: fc.integer({ min: 0, max: 30 }),
  correct_count: fc.integer({ min: 0, max: 100 }),
  incorrect_count: fc.integer({ min: 0, max: 100 }),
});

const NOW = new Date('2026-10-17T08:00:00.000Z');

// --- computeRatingUpdate ---------------------------------------------------

describe('computeRatingUpdate', () => {
  it('treats a missing row as a brand-new word', () => {
    expect(computeRatingUpdate(null, 2, NOW)).toEqual(
      computeRatingUpdate(NEW_WORD_BASELINE, 2, NOW),
    );
  });

  it('moves a NEW word to LEARNING on any rating', () => {
    for (const rating of [0, 1, 2, 3] as ConfidenceRating[]) {
      const update = computeRatingUpdate(null, rating, NOW);
      expect(update.levelBefore).toBe(MasteryLevel.NEW);
      expect(update.levelAfter).toBe(MasteryLevel.LEARNING);
    }
  });

  it('matches calculateSRS and determineMasteryTransition', () => {
    fc.assert(
      fc.property(baselineArb, ratingArb, (base, rating) => {
        const update = computeRatingUpdate(base, rating, NOW);
        const srs = calculateSRS(
          {
            easinessFactor: base.easiness_factor,
            intervalDays: base.interval_days,
            repetitionCount: base.repetition_count,
          },
          rating,
          NOW,
        );
        expect(update.patch.easiness_factor).toBe(srs.easinessFactor);
        expect(update.patch.interval_days).toBe(srs.intervalDays);
        expect(update.patch.repetition_count).toBe(srs.repetitionCount);
        expect(update.patch.next_review_date).toBe(srs.nextReviewDate.toISOString());
        expect(update.patch.last_reviewed_at).toBe(NOW.toISOString());
        expect(update.levelAfter).toBe(
          determineMasteryTransition(base.mastery_level, rating, srs.repetitionCount, srs.intervalDays),
        );
        expect(update.patch.mastery_level).toBe(update.levelAfter);
        expect(update.levelBefore).toBe(base.mastery_level);
        expect(update.intervalBefore).toBe(base.interval_days);
        expect(update.intervalAfter).toBe(srs.intervalDays);
      }),
    );
  });

  it('counts exactly one answer, correct iff rating >= 2', () => {
    fc.assert(
      fc.property(baselineArb, ratingArb, (base, rating) => {
        const { patch } = computeRatingUpdate(base, rating, NOW);
        const correctDelta = patch.correct_count - base.correct_count;
        const incorrectDelta = patch.incorrect_count - base.incorrect_count;
        expect(correctDelta + incorrectDelta).toBe(1);
        expect(correctDelta).toBe(rating >= 2 ? 1 : 0);
      }),
    );
  });

  it('leaves counters untouched when countAnswer is false', () => {
    fc.assert(
      fc.property(baselineArb, ratingArb, (base, rating) => {
        const { patch } = computeRatingUpdate(base, rating, NOW, false);
        expect(patch.correct_count).toBe(base.correct_count);
        expect(patch.incorrect_count).toBe(base.incorrect_count);
      }),
    );
  });

  it('schedules every rated word in the future, so it leaves the due queue', () => {
    // Reachable states only: every rating leaves interval_days >= 1, so
    // interval 0 implies the word has never been rated (rep 0).
    const reachableArb = baselineArb.filter(
      (b) => b.interval_days >= 1 || b.repetition_count === 0,
    );
    fc.assert(
      fc.property(reachableArb, ratingArb, (base, rating) => {
        const { patch } = computeRatingUpdate(base, rating, NOW);
        expect(new Date(patch.next_review_date).getTime()).toBeGreaterThan(NOW.getTime());
        expect(isWordDue(patch, NOW)).toBe(false);
      }),
    );
  });
});

// --- isWordDue -------------------------------------------------------------

describe('isWordDue', () => {
  const past = '2026-10-16T00:00:00.000Z';
  const future = '2026-10-18T00:00:00.000Z';

  it('never treats NEW words as due', () => {
    expect(isWordDue({ mastery_level: MasteryLevel.NEW, next_review_date: past }, NOW)).toBe(false);
  });

  it('is due when next_review_date has passed', () => {
    expect(isWordDue({ mastery_level: MasteryLevel.LEARNING, next_review_date: past }, NOW)).toBe(true);
    expect(isWordDue({ mastery_level: MasteryLevel.LAPSED, next_review_date: NOW.toISOString() }, NOW)).toBe(true);
    expect(isWordDue({ mastery_level: MasteryLevel.REVIEWING, next_review_date: future }, NOW)).toBe(false);
  });
});

// --- sanitizeDuration ------------------------------------------------------

describe('sanitizeDuration', () => {
  it('drops missing, negative, non-finite and walk-away durations', () => {
    expect(sanitizeDuration(undefined)).toBeNull();
    expect(sanitizeDuration(null)).toBeNull();
    expect(sanitizeDuration(-1)).toBeNull();
    expect(sanitizeDuration(Number.NaN)).toBeNull();
    expect(sanitizeDuration(MAX_TRACKED_DURATION_MS + 1)).toBeNull();
  });

  it('rounds plausible durations', () => {
    expect(sanitizeDuration(0)).toBe(0);
    expect(sanitizeDuration(1234.6)).toBe(1235);
    expect(sanitizeDuration(MAX_TRACKED_DURATION_MS)).toBe(MAX_TRACKED_DURATION_MS);
  });
});

// --- logReviewEvent --------------------------------------------------------

const LOG_ENTRY = {
  user_id: 'u1',
  word_mastery_id: null,
  word: '  Apple ',
  source: 'review' as const,
  rating: 2 as ConfidenceRating,
  level_before: null,
  level_after: null,
  interval_before: null,
  interval_after: null,
  duration_ms: null,
};

describe('logReviewEvent', () => {
  beforeEach(() => {
    insertMock.mockReset();
    resetReviewLogAvailability();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('inserts with a normalized word', async () => {
    insertMock.mockResolvedValue({ error: null });
    await expect(logReviewEvent(LOG_ENTRY)).resolves.toBe(true);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ word: 'apple' }));
  });

  it('stops trying once the table is missing (migration 005 not applied)', async () => {
    insertMock.mockResolvedValue({ error: { code: '42P01', message: 'relation does not exist' } });
    await expect(logReviewEvent(LOG_ENTRY)).resolves.toBe(false);
    await expect(logReviewEvent(LOG_ENTRY)).resolves.toBe(false);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('keeps trying after other errors and never throws', async () => {
    insertMock.mockResolvedValueOnce({ error: { code: '23514', message: 'check violation' } });
    insertMock.mockRejectedValueOnce(new Error('network'));
    await expect(logReviewEvent(LOG_ENTRY)).resolves.toBe(false);
    await expect(logReviewEvent(LOG_ENTRY)).resolves.toBe(false);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});

// --- applyRating -----------------------------------------------------------

describe('applyRating', () => {
  const goals = { words_reviewed_today: 10, daily_word_goal: 10, current_streak: 3 };

  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    upsertWordMasteryMock.mockReset().mockImplementation(async (row) => ({ id: 'wm1', ...row }));
    recordWordReviewMock.mockReset().mockResolvedValue({ goalsUpdated: goals, goalReached: true });
    resetReviewLogAvailability();
  });

  it('upserts the computed patch, logs the event and credits the goal', async () => {
    const result = await applyRating({
      userId: 'u1', word: 'apple', current: null, rating: 2, source: 'lesson_flashcard', durationMs: 4200, now: NOW,
    });
    const expected = computeRatingUpdate(null, 2, NOW);
    expect(upsertWordMasteryMock).toHaveBeenCalledWith({ user_id: 'u1', word: 'apple', ...expected.patch });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      word_mastery_id: 'wm1', source: 'lesson_flashcard', rating: 2, duration_ms: 4200,
      level_before: MasteryLevel.NEW, level_after: MasteryLevel.LEARNING,
    }));
    await expect(result.goal).resolves.toEqual({ goalsUpdated: goals, justReached: true });
  });

  it('only reports justReached on the review that hit the goal', async () => {
    recordWordReviewMock.mockResolvedValue({
      goalsUpdated: { ...goals, words_reviewed_today: 11 }, goalReached: true,
    });
    const result = await applyRating({ userId: 'u1', word: 'apple', current: null, rating: 3, source: 'review' });
    await expect(result.goal).resolves.toMatchObject({ justReached: false });
  });

  it('does not credit unsuccessful ratings or when disabled', async () => {
    const failed = await applyRating({ userId: 'u1', word: 'a', current: null, rating: 1, source: 'review' });
    const disabled = await applyRating({ userId: 'u1', word: 'a', current: null, rating: 3, source: 'quiz', creditGoal: false });
    await expect(failed.goal).resolves.toBeNull();
    await expect(disabled.goal).resolves.toBeNull();
    expect(recordWordReviewMock).not.toHaveBeenCalled();
  });

  it('swallows goal failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    recordWordReviewMock.mockRejectedValue(new Error('boom'));
    const result = await applyRating({ userId: 'u1', word: 'a', current: null, rating: 2, source: 'review' });
    await expect(result.goal).resolves.toBeNull();
  });

  it('propagates upsert failures', async () => {
    upsertWordMasteryMock.mockRejectedValue(new Error('db down'));
    await expect(
      applyRating({ userId: 'u1', word: 'a', current: null, rating: 2, source: 'review' }),
    ).rejects.toThrow('db down');
    expect(insertMock).not.toHaveBeenCalled();
  });
});
