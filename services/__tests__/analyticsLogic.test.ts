import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  activeStreak,
  activityTimestamps,
  dailyCounts,
  dueForecast,
  dueNow,
  lapseRate,
  levelFunnel,
  localDateKey,
  mostForgotten,
  periodOverPeriod,
  retention,
  retentionStatus,
  RETENTION_MIN_SAMPLES,
  weeklyNewWords,
  type AnalyticsWord,
  type ReviewLogLite,
} from '../analyticsLogic';
import { MasteryLevel } from '../../types';

// Saturday 17 Oct 2026, local time.
const NOW = new Date('2026-10-17T10:00:00');
const local = (s: string) => new Date(s).toISOString();

const word = (overrides: Partial<AnalyticsWord> = {}): AnalyticsWord => ({
  word: 'w',
  mastery_level: MasteryLevel.REVIEWING,
  next_review_date: local('2026-10-17T09:00:00'),
  last_reviewed_at: null,
  created_at: local('2026-10-01T09:00:00'),
  correct_count: 0,
  incorrect_count: 0,
  ...overrides,
});

const log = (reviewed: string, rating: number | null, level_before: number | null = MasteryLevel.REVIEWING): ReviewLogLite => ({
  word: 'w',
  reviewed_at: local(reviewed),
  rating,
  level_before,
});

describe('dailyCounts', () => {
  it('returns exactly `days` local days, today last, ignoring older timestamps', () => {
    const days = dailyCounts(
      [local('2026-10-17T08:00:00'), local('2026-10-17T23:30:00'), local('2026-10-15T01:00:00'), local('2026-09-01T10:00:00'), null],
      7,
      NOW,
    );
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual({ date: '2026-10-17', count: 2 });
    expect(days[4]).toEqual({ date: '2026-10-15', count: 1 });
    expect(days[0].date).toBe('2026-10-11');
    expect(days.reduce((a, d) => a + d.count, 0)).toBe(3);
  });

  it('is dense and ordered for any window', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 120 }), (n) => {
        const days = dailyCounts([], n, NOW);
        expect(days).toHaveLength(n);
        expect(days[n - 1].date).toBe(localDateKey(NOW));
        for (let i = 1; i < n; i++) expect(days[i].date > days[i - 1].date).toBe(true);
      }),
    );
  });

  it('returns [] for a non-positive window', () => {
    expect(dailyCounts([local('2026-10-17T08:00:00')], 0, NOW)).toEqual([]);
  });
});

describe('activityTimestamps', () => {
  it('prefers review_logs and falls back to last_reviewed_at', () => {
    const words = [word({ last_reviewed_at: local('2026-10-16T10:00:00') }), word()];
    expect(activityTimestamps([log('2026-10-17T08:00:00', 3)], words)).toHaveLength(1);
    expect(activityTimestamps(null, words)).toEqual([local('2026-10-16T10:00:00')]);
  });
});

describe('periodOverPeriod / activeStreak', () => {
  const days = (counts: number[]) => counts.map((count, i) => ({ date: String(i), count }));

  it('compares the last period with the one before', () => {
    expect(periodOverPeriod(days([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]))).toEqual({ current: 14, previous: 7, delta: 7 });
    expect(periodOverPeriod(days([3, 4]), 7)).toEqual({ current: 7, previous: 0, delta: 7 });
  });

  it('counts the streak up to today, or yesterday while today is still empty', () => {
    expect(activeStreak(days([1, 0, 2, 3, 1]))).toBe(3);
    expect(activeStreak(days([1, 2, 3, 0]))).toBe(3);
    expect(activeStreak(days([1, 0, 0]))).toBe(0);
    expect(activeStreak([])).toBe(0);
  });
});

describe('retention', () => {
  const many = (n: number, rating: number) => Array.from({ length: n }, () => log('2026-10-16T10:00:00', rating));

  it('asks for more reviews below the minimum sample size', () => {
    const r = retention(many(5, 3), 30, NOW);
    expect(r).toEqual({ rate: null, samples: 5, needed: RETENTION_MIN_SAMPLES - 5 });
  });

  it('counts ratings ≥ Khó as remembered and skips first ratings, unrated rows and old rows', () => {
    const logs = [
      ...many(15, 3),
      ...many(5, 1),
      log('2026-10-16T10:00:00', 1, MasteryLevel.NEW),
      log('2026-10-16T10:00:00', null),
      log('2026-08-01T10:00:00', 1),
    ];
    const r = retention(logs, 30, NOW);
    expect(r.samples).toBe(20);
    expect(r.rate).toBeCloseTo(0.75);
    expect(r.needed).toBe(0);
  });

  it('is always within [0, 1]', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 3 }), { minLength: RETENTION_MIN_SAMPLES, maxLength: 80 }), (ratings) => {
        const r = retention(ratings.map((x) => log('2026-10-17T08:00:00', x)), 30, NOW);
        expect(r.rate).not.toBeNull();
        expect(r.rate!).toBeGreaterThanOrEqual(0);
        expect(r.rate!).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('classifies against the 85–90% band', () => {
    expect(retentionStatus(0.7)).toBe('low');
    expect(retentionStatus(0.87)).toBe('on-target');
    expect(retentionStatus(0.95)).toBe('high');
  });
});

describe('dueForecast / dueNow', () => {
  const words = [
    word({ next_review_date: local('2026-10-10T09:00:00') }), // overdue → today
    word({ next_review_date: local('2026-10-17T20:00:00') }), // later today
    word({ next_review_date: local('2026-10-19T09:00:00') }),
    word({ next_review_date: local('2026-12-01T09:00:00') }), // outside window
    word({ mastery_level: MasteryLevel.NEW }),
    word({ is_suspended: true }),
  ];

  it('buckets scheduled words by day, overdue into today', () => {
    const f = dueForecast(words, 7, NOW);
    expect(f.map((d) => d.count)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(f[0].date).toBe('2026-10-17');
  });

  it('counts only what is due right now', () => {
    expect(dueNow(words, NOW)).toBe(1);
  });
});

describe('levelFunnel', () => {
  it('has every level', () => {
    const f = levelFunnel([word(), word({ mastery_level: MasteryLevel.LAPSED })]);
    expect(f[MasteryLevel.REVIEWING]).toBe(1);
    expect(f[MasteryLevel.LAPSED]).toBe(1);
    expect(f[MasteryLevel.NEW]).toBe(0);
  });
});

describe('weeklyNewWords', () => {
  it('groups by Monday-based week, this week last', () => {
    const w = weeklyNewWords(
      [
        word({ created_at: local('2026-10-12T08:00:00') }), // Mon this week
        word({ created_at: local('2026-10-17T08:00:00') }), // Sat this week
        word({ created_at: local('2026-10-11T08:00:00') }), // Sun last week
        word({ created_at: local('2025-01-01T08:00:00') }),
      ],
      4,
      NOW,
    );
    expect(w.map((d) => d.date)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
    expect(w.map((d) => d.count)).toEqual([0, 0, 1, 2]);
  });
});

describe('mostForgotten / lapseRate', () => {
  it('orders by wrong answers, then lapse rate, and drops words never missed', () => {
    const list = mostForgotten(
      [
        word({ word: 'a', incorrect_count: 2, correct_count: 8 }),
        word({ word: 'b', incorrect_count: 2, correct_count: 0 }),
        word({ word: 'c', incorrect_count: 5, correct_count: 5 }),
        word({ word: 'd', incorrect_count: 0, correct_count: 3 }),
      ],
      5,
    );
    expect(list.map((w) => w.word)).toEqual(['c', 'b', 'a']);
    expect(lapseRate(word())).toBe(0);
    expect(lapseRate(word({ incorrect_count: 1, correct_count: 3 }))).toBe(0.25);
  });
});
