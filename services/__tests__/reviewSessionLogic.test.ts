import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { estimateMinutes, resolveCardMode, summarizeSession } from '../reviewSessionLogic';
import { MasteryLevel, type ConfidenceRating } from '../../types';

const NOW = new Date('2026-10-17T10:00:00');
const at = (iso: string) => new Date(iso).toISOString();

describe('resolveCardMode', () => {
  it('always flips words without a Vietnamese meaning', () => {
    for (const mode of ['auto', 'flip', 'typing', 'handwriting'] as const) {
      expect(resolveCardMode({ meaning_vi: null, mastery_level: MasteryLevel.MASTERED }, mode)).toBe('flip');
    }
  });

  it('auto types only words met several times', () => {
    const r = (mastery_level: MasteryLevel) => resolveCardMode({ meaning_vi: 'nghĩa', mastery_level }, 'auto');
    expect(r(MasteryLevel.LEARNING)).toBe('flip');
    expect(r(MasteryLevel.REVIEWING)).toBe('typing');
    expect(r(MasteryLevel.MASTERED)).toBe('typing');
    expect(r(MasteryLevel.LAPSED)).toBe('typing');
  });

  it('honours an explicit mode', () => {
    expect(resolveCardMode({ meaning_vi: 'x', mastery_level: MasteryLevel.LEARNING }, 'typing')).toBe('typing');
    expect(resolveCardMode({ meaning_vi: 'x', mastery_level: MasteryLevel.MASTERED }, 'flip')).toBe('flip');
  });
});

describe('estimateMinutes', () => {
  it('is 0 for no cards and at least 1 otherwise', () => {
    expect(estimateMinutes(0)).toBe(0);
    expect(estimateMinutes(1)).toBe(1);
    expect(estimateMinutes(20)).toBe(3);
  });
});

describe('summarizeSession', () => {
  it('counts first ratings per word and words due by tomorrow', () => {
    const queue = [
      { word: 'a', next_review_date: at('2026-10-17T10:01:00') },
      { word: 'b', next_review_date: at('2026-10-21T10:00:00') },
      { word: 'c', next_review_date: at('2026-10-18T20:00:00') },
      { word: 'a', next_review_date: at('2026-10-20T10:00:00') },
    ];
    const ratings: ConfidenceRating[] = [0, 3, 1, 2];
    expect(summarizeSession(queue, ratings, NOW)).toEqual({
      reviewed: 3,
      remembered: 1,
      forgotten: ['a'],
      dueByTomorrow: 1, // 'c'; 'a' was rescheduled after relearning
    });
  });

  it('ignores cards that were not rated yet', () => {
    const queue = [
      { word: 'a', next_review_date: at('2026-10-30T00:00:00') },
      { word: 'b', next_review_date: at('2026-10-17T00:00:00') },
    ];
    expect(summarizeSession(queue, [2], NOW).reviewed).toBe(1);
  });

  it('remembered + forgotten never exceed reviewed', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ word: fc.constantFrom('a', 'b', 'c', 'd'), rating: fc.constantFrom<ConfidenceRating>(0, 1, 2, 3) })),
        (items) => {
          const queue = items.map((x) => ({ word: x.word, next_review_date: NOW.toISOString() }));
          const s = summarizeSession(queue, items.map((x) => x.rating), NOW);
          expect(s.remembered + s.forgotten.length).toBeLessThanOrEqual(s.reviewed);
          expect(s.dueByTomorrow).toBe(s.reviewed);
        },
      ),
    );
  });
});
