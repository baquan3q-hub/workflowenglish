import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildLessonLists,
  filterWords,
  foldText,
  listProgress,
  relativeDue,
  searchWords,
  sortWords,
  splitLessonWords,
  statusCounts,
  type LibraryWord,
} from '../vocabLibraryLogic';
import { manualStatusPatch, manualStatusSnapshot, type ManualStatus } from '../srsStatusLogic';
import { MasteryLevel } from '../../types';

const NOW = new Date('2026-10-17T10:00:00');
const iso = (s: string) => new Date(s).toISOString();

const w = (word: string, o: Partial<LibraryWord> = {}): LibraryWord => ({
  id: word,
  word,
  mastery_level: MasteryLevel.REVIEWING,
  easiness_factor: 2.5,
  interval_days: 5,
  repetition_count: 3,
  next_review_date: iso('2026-10-20T09:00:00'),
  last_reviewed_at: null,
  correct_count: 3,
  incorrect_count: 1,
  created_at: iso('2026-10-01T09:00:00'),
  meaning_vi: null,
  is_suspended: false,
  ...o,
});

describe('manualStatusPatch', () => {
  const state = fc.record({
    mastery_level: fc.constantFrom(...Object.values(MasteryLevel).filter((v): v is MasteryLevel => typeof v === 'number')),
    easiness_factor: fc.double({ min: 1.3, max: 3, noNaN: true }),
    interval_days: fc.integer({ min: 0, max: 400 }),
    repetition_count: fc.integer({ min: 0, max: 30 }),
    next_review_date: fc.constant(iso('2026-10-10T09:00:00')),
    is_suspended: fc.boolean(),
  });
  const target = fc.constantFrom<ManualStatus>('new', 'learning', 'reviewing', 'mastered', 'suspended', 'unsuspended');

  it('lands on the target level with a consistent schedule and never touches other columns', () => {
    fc.assert(
      fc.property(state, target, (s, t) => {
        const patch = manualStatusPatch(s, t, NOW);
        const next = { ...s, ...patch };
        expect(Object.keys(patch).every((k) => k in manualStatusSnapshot(s))).toBe(true);
        if (t === 'suspended') expect(patch).toEqual({ is_suspended: true });
        if (t === 'unsuspended') expect(patch).toEqual({ is_suspended: false });
        if (t === 'new') {
          expect(next).toMatchObject({ mastery_level: MasteryLevel.NEW, repetition_count: 0, interval_days: 0, easiness_factor: 2.5 });
        }
        if (t === 'learning') expect(next).toMatchObject({ mastery_level: MasteryLevel.LEARNING, repetition_count: 0, interval_days: 1 });
        if (t === 'reviewing' || t === 'mastered') {
          const min = t === 'reviewing' ? { rep: 3, days: 3 } : { rep: 4, days: 22 };
          expect(next.repetition_count).toBeGreaterThanOrEqual(min.rep);
          expect(next.interval_days).toBeGreaterThanOrEqual(min.days);
          expect(next.easiness_factor).toBe(s.easiness_factor);
          expect(new Date(next.next_review_date).getTime()).toBe(NOW.getTime() + next.interval_days * 86_400_000);
        }
        if (t !== 'suspended') expect(next.is_suspended).toBe(false);
      }),
    );
  });
});

describe('filter / search / sort', () => {
  const words = [
    w('resilient', { meaning_vi: 'kiên cường', next_review_date: iso('2026-10-16T09:00:00') }),
    w('allocate', { meaning_vi: 'phân bổ', mastery_level: MasteryLevel.LAPSED, incorrect_count: 5 }),
    w('skill', { meaning_vi: 'kỹ năng', mastery_level: MasteryLevel.NEW, created_at: iso('2026-10-15T09:00:00') }),
    w('hidden', { is_suspended: true, next_review_date: iso('2026-10-01T09:00:00') }),
  ];

  it('counts each chip, keeping suspended words out of everything but Tạm ẩn and Tất cả', () => {
    expect(statusCounts(words, NOW)).toMatchObject({ all: 4, due: 1, reviewing: 1, lapsed: 1, new: 1, suspended: 1 });
  });

  it('searches word and meaning without accents', () => {
    expect(foldText('Kỹ Năng đường')).toBe('ky nang duong');
    expect(searchWords(words, 'ky nang').map((x) => x.word)).toEqual(['skill']);
    expect(searchWords(words, 'ALLO').map((x) => x.word)).toEqual(['allocate']);
    expect(searchWords(words, '  ')).toHaveLength(4);
  });

  it('sorts by due date with unscheduled words last, and by difficulty / date / A–Z', () => {
    expect(sortWords(words, 'due').map((x) => x.word)).toEqual(['resilient', 'allocate', 'hidden', 'skill']);
    expect(sortWords(words, 'difficulty')[0].word).toBe('allocate');
    expect(sortWords(words, 'added')[0].word).toBe('skill');
    expect(sortWords(words, 'az').map((x) => x.word)).toEqual(['allocate', 'hidden', 'resilient', 'skill']);
  });

  it('scopes to a list and combines every filter', () => {
    const only = new Set(['resilient', 'skill']);
    expect(filterWords(words, { status: 'all', search: '', sort: 'az', only }, NOW).map((x) => x.word)).toEqual(['resilient', 'skill']);
    expect(filterWords(words, { status: 'due', search: 'kien', sort: 'az', only: null }, NOW).map((x) => x.word)).toEqual(['resilient']);
  });

  it('sorting keeps every word exactly once', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1, maxLength: 6 }), { maxLength: 30 }), fc.constantFrom('due', 'added', 'difficulty', 'az' as const), (names, key) => {
        const list = names.map((n, i) => w(n + i, { incorrect_count: i % 3 }));
        expect(sortWords(list, key).map((x) => x.id).sort()).toEqual(list.map((x) => x.id).sort());
      }),
    );
  });
});

describe('relativeDue', () => {
  it('labels due words, near days and far dates', () => {
    expect(relativeDue(w('a', { next_review_date: iso('2026-10-17T09:00:00') }), NOW)).toBe('Đến hạn');
    expect(relativeDue(w('a', { next_review_date: iso('2026-10-17T20:00:00') }), NOW)).toBe('Hôm nay');
    expect(relativeDue(w('a', { next_review_date: iso('2026-10-18T08:00:00') }), NOW)).toBe('Mai');
    expect(relativeDue(w('a', { next_review_date: iso('2026-10-20T08:00:00') }), NOW)).toBe('3 ngày');
    expect(relativeDue(w('a', { next_review_date: iso('2027-01-17T08:00:00') }), NOW)).toBe('3 tháng');
    expect(relativeDue(w('a', { mastery_level: MasteryLevel.NEW }), NOW)).toBeNull();
    expect(relativeDue(w('a', { is_suspended: true }), NOW)).toBeNull();
  });
});

describe('lesson lists', () => {
  it('splits, normalizes and dedupes lesson words', () => {
    expect(splitLessonWords(' Resilient, allocate\nresilient ;  take off ')).toEqual(['resilient', 'allocate', 'take off']);
  });

  it('groups by topic, keeps tracked words only and orders newest first', () => {
    const lists = buildLessonLists(
      [
        { id: '1', topic: 'Du lịch', words: 'passport, luggage, ghost', completed_at: iso('2026-10-12T09:00:00') },
        { id: '2', topic: 'Công việc', words: 'deadline', completed_at: iso('2026-10-08T09:00:00') },
        { id: '3', topic: 'du lịch', words: 'luggage, visa', completed_at: iso('2026-10-14T09:00:00') },
        { id: '4', topic: 'Trống', words: 'nothing', completed_at: iso('2026-10-15T09:00:00') },
      ],
      new Set(['passport', 'luggage', 'visa', 'deadline']),
    );
    expect(lists.map((l) => [l.topic, l.lessonCount, l.words])).toEqual([
      ['du lịch', 2, ['passport', 'luggage', 'visa']],
      ['Công việc', 1, ['deadline']],
    ]);
    const byWord = new Map([['passport', w('passport')], ['luggage', w('luggage', { mastery_level: MasteryLevel.LEARNING })]]);
    expect(listProgress(lists[0].words, byWord)).toEqual({ done: 1, total: 3 });
  });
});
