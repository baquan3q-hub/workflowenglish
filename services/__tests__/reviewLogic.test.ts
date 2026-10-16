import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  computeReviewUpdate,
  findWordForm,
  fuzzDays,
  gradeTypedAnswer,
  shuffle,
  wordFormsOf,
  buildWordFormIndex,
  SAME_SESSION_WINDOW_MS,
  type ReviewableState,
} from '../reviewLogic';
import { MasteryLevel } from '../../types';

const NOW = new Date('2026-10-16T08:00:00.000Z');
const noFuzz = () => 0.5;

describe('computeReviewUpdate', () => {
  it('schedules a brand-new word one day out on Good', () => {
    const u = computeReviewUpdate(null, 2, NOW, noFuzz);
    expect(u.mastery_level).toBe(MasteryLevel.LEARNING);
    expect(u.repetition_count).toBe(1);
    expect(new Date(u.next_review_date).getTime() - NOW.getTime()).toBe(24 * 3600 * 1000);
    expect(u.scheduleChanged).toBe(true);
    expect(u.correct_count).toBe(1);
  });

  it('does not advance the schedule twice in the same session', () => {
    const first = computeReviewUpdate(null, 2, NOW, noFuzz);
    const later = new Date(NOW.getTime() + 20 * 60 * 1000);
    const second = computeReviewUpdate(first, 3, later, noFuzz);
    expect(second.scheduleChanged).toBe(false);
    expect(second.repetition_count).toBe(first.repetition_count);
    expect(second.next_review_date).toBe(first.next_review_date);
    expect(second.correct_count).toBe(2);
  });

  it('always applies "Again", even in the same session', () => {
    const first = computeReviewUpdate(null, 3, NOW, noFuzz);
    const later = new Date(NOW.getTime() + 60 * 1000);
    const again = computeReviewUpdate(first, 0, later, noFuzz);
    expect(again.scheduleChanged).toBe(true);
    expect(again.repetition_count).toBe(0);
    expect(again.incorrect_count).toBe(1);
  });

  it('applies normally once the session window has passed', () => {
    const first = computeReviewUpdate(null, 2, NOW, noFuzz);
    const nextDay = new Date(NOW.getTime() + SAME_SESSION_WINDOW_MS + 1);
    const second = computeReviewUpdate(first, 2, nextDay, noFuzz);
    expect(second.scheduleChanged).toBe(true);
    expect(second.repetition_count).toBe(2);
  });

  it('lapses a mastered word on Again', () => {
    const mastered: ReviewableState = {
      mastery_level: MasteryLevel.MASTERED,
      easiness_factor: 2.5,
      interval_days: 40,
      repetition_count: 6,
      correct_count: 6,
      incorrect_count: 0,
      last_reviewed_at: '2026-09-01T00:00:00.000Z',
      next_review_date: '2026-10-10T00:00:00.000Z',
    };
    expect(computeReviewUpdate(mastered, 0, NOW, noFuzz).mastery_level).toBe(MasteryLevel.LAPSED);
  });

  it('keeps the next review at least one day out whatever the fuzz', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 1, 2, 3) as fc.Arbitrary<0 | 1 | 2 | 3>,
        fc.double({ min: 0, max: 0.999999, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        (rating, r, interval) => {
          const u = computeReviewUpdate(
            { mastery_level: MasteryLevel.REVIEWING, easiness_factor: 2.5, interval_days: interval, repetition_count: 3, correct_count: 0, incorrect_count: 0 },
            rating,
            NOW,
            () => r,
          );
          return new Date(u.next_review_date).getTime() - NOW.getTime() >= 24 * 3600 * 1000;
        },
      ),
    );
  });
});

describe('fuzzDays', () => {
  it('never fuzzes short intervals', () => {
    expect(fuzzDays(1, () => 0)).toBe(0);
    expect(fuzzDays(2.9, () => 0.99)).toBe(0);
  });
  it('stays within ±10% (min ±1 day)', () => {
    fc.assert(
      fc.property(fc.double({ min: 3, max: 1000, noNaN: true }), fc.double({ min: 0, max: 0.999999, noNaN: true }), (d, r) => {
        const shift = fuzzDays(d, () => r);
        return Math.abs(shift) <= Math.max(1, Math.round(d * 0.1));
      }),
    );
  });
});

describe('gradeTypedAnswer', () => {
  it('accepts exact answers regardless of case and punctuation', () => {
    expect(gradeTypedAnswer('  Decided. ', 'decided').grade).toBe('correct');
  });
  it('flags small typos as close', () => {
    expect(gradeTypedAnswer('recieve', 'receive')).toEqual({ grade: 'close', reason: 'typo' });
  });
  it('flags the base form as close when an inflection was expected', () => {
    expect(gradeTypedAnswer('decide', 'decided', ['decide'])).toEqual({ grade: 'close', reason: 'form' });
  });
  it('rejects unrelated words and empty input', () => {
    expect(gradeTypedAnswer('apple', 'decided').grade).toBe('wrong');
    expect(gradeTypedAnswer('   ', 'cat').grade).toBe('wrong');
  });
  it('does not allow typos on very short words', () => {
    expect(gradeTypedAnswer('cut', 'cat').grade).toBe('wrong');
  });
});

describe('word forms', () => {
  it('generates regular and irregular inflections', () => {
    expect(wordFormsOf('decide')).toEqual(expect.arrayContaining(['decide', 'decides', 'decided', 'deciding']));
    expect(wordFormsOf('study')).toEqual(expect.arrayContaining(['studies', 'studied', 'studying']));
    expect(wordFormsOf('stop')).toEqual(expect.arrayContaining(['stopped', 'stopping']));
    expect(wordFormsOf('take off')).toEqual(expect.arrayContaining(['took off', 'taken off', 'taking off']));
  });

  it('finds inflected forms inside a sentence', () => {
    expect(findWordForm('She finally decided to leave.', 'decide')).toEqual({ index: 12, form: 'decided' });
    expect(findWordForm('The plane took off late.', 'take off')?.form).toBe('took off');
    expect(findWordForm('Analyses were run.', 'analysis')?.form).toBe('Analyses');
  });

  it('does not match inside other words', () => {
    expect(findWordForm('The category was large.', 'cat')).toBeNull();
  });

  it('indexes forms back to their base word', () => {
    const idx = buildWordFormIndex(['decide', 'run']);
    expect(idx.get('decided')).toBe('decide');
    expect(idx.get('ran')).toBe('run');
  });
});

describe('shuffle', () => {
  it('is a permutation', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        const out = shuffle(xs);
        return out.length === xs.length && [...out].sort().join() === [...xs].sort().join();
      }),
    );
  });
});
