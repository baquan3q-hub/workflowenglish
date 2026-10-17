import { describe, it, expect } from 'vitest';
import { dayGroupLabel, entryTime, groupByDay, matchesHistory, toHistoryEntry, trackedIds, type HistoryRow } from '../historyLogic';

const NOW = new Date(2026, 9, 17, 15, 0);

const row = (over: Partial<HistoryRow> = {}): HistoryRow => ({
  id: 'r1',
  topic: 'Travel & Tourism',
  level: 'B1',
  words: 'arrive, Luggage',
  quiz_score: null,
  quiz_total: null,
  completed_at: new Date(2026, 9, 17, 9, 5).toISOString(),
  cards: null,
  progress: null,
  ...over,
});

describe('toHistoryEntry', () => {
  it('takes words and meanings from the lesson cards', () => {
    const e = toHistoryEntry(
      row({
        cards: [
          { word: 'arrive', meaningVietnamese: 'đến nơi', partOfSpeech: 'verb', ipa: '/əˈraɪv/' },
          { word: '  ', meaningVietnamese: 'bỏ' },
        ],
        progress: { quiz: { score: 4, total: 5, wrong: [] }, sentences: { score: 3, total: 6, wrong: [] }, completedAt: 'x' },
      }),
    );
    expect(e.words).toEqual([{ word: 'arrive', meaning: 'đến nơi', partOfSpeech: 'verb', ipa: '/əˈraɪv/' }]);
    expect(e.finished).toBe(true);
    expect(e.scores.map((s) => `${s.label} ${s.result.score}/${s.result.total}`)).toEqual(['Trắc nghiệm 4/5', 'Luyện câu 3/6']);
  });

  it('falls back to the saved word list and library meanings for old rows', () => {
    const e = toHistoryEntry(row({ quiz_score: 2, quiz_total: 4 }), new Map([['luggage', 'hành lý']]));
    expect(e.words.map((w) => [w.word, w.meaning])).toEqual([
      ['arrive', null],
      ['luggage', 'hành lý'],
    ]);
    expect(e.finished).toBe(false);
    expect(e.scores).toEqual([{ label: 'Trắc nghiệm', result: { score: 2, total: 4, wrong: [] } }]);
  });
});

describe('grouping and time', () => {
  it('labels today, yesterday, the last week, then months', () => {
    expect(dayGroupLabel(new Date(2026, 9, 17, 1).toISOString(), NOW)).toBe('Hôm nay');
    expect(dayGroupLabel(new Date(2026, 9, 16, 23).toISOString(), NOW)).toBe('Hôm qua');
    expect(dayGroupLabel(new Date(2026, 9, 12).toISOString(), NOW)).toBe('7 ngày qua');
    expect(dayGroupLabel(new Date(2026, 8, 30).toISOString(), NOW)).toBe('Tháng 9/2026');
  });

  it('keeps order and merges consecutive entries with the same label', () => {
    const at = (d: number) => ({ completedAt: new Date(2026, 9, d, 8).toISOString(), d });
    const groups = groupByDay([at(17), at(17), at(16), at(1)], NOW);
    expect(groups.map((g) => [g.label, g.entries.length])).toEqual([
      ['Hôm nay', 2],
      ['Hôm qua', 1],
      ['Tháng 10/2026', 1],
    ]);
  });

  it('shows only the time for recent lessons', () => {
    expect(entryTime(new Date(2026, 9, 17, 9, 5).toISOString(), NOW)).toBe('09:05');
    expect(entryTime(new Date(2026, 9, 3, 20, 30).toISOString(), NOW)).toBe('3/10 · 20:30');
  });
});

describe('search and review ids', () => {
  const e = toHistoryEntry(row({ cards: [{ word: 'Luggage', meaningVietnamese: 'hành lý' }] }));

  it('matches topic, word or meaning without accents', () => {
    expect(matchesHistory(e, 'travel')).toBe(true);
    expect(matchesHistory(e, 'LUGG')).toBe(true);
    expect(matchesHistory(e, 'hanh ly')).toBe(true);
    expect(matchesHistory(e, 'b1')).toBe(true);
    expect(matchesHistory(e, 'visa')).toBe(false);
    expect(matchesHistory(e, '  ')).toBe(true);
  });

  it('maps words to tracked word_mastery ids', () => {
    expect(trackedIds(e, new Map([['luggage', 'm1']]))).toEqual(['m1']);
    expect(trackedIds(e, new Map())).toEqual([]);
  });
});
