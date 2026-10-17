import { describe, it, expect } from 'vitest';
import {
  groupErrors,
  localGrade,
  matchReference,
  missingTargetWords,
  normalizeSentence,
  pendingWrongSentences,
  sentenceStepResult,
  splitBold,
  withIds,
} from '../sentenceLogic';
import type { SentenceGrade, SentenceItem } from '../../types';

const item: SentenceItem = {
  id: 's1',
  promptVi: 'Tôi đã quyết định nghỉ việc.',
  targetWords: ['decide'],
  references: ['I have decided to quit my job.', 'I decided to quit my job.'],
};

const grade = (verdict: SentenceGrade['verdict'], categories: SentenceGrade['errors'][number]['category'][] = []): SentenceGrade => ({
  verdict,
  score: null,
  corrected: '',
  usedTargetWords: true,
  errors: categories.map((category) => ({ original: '', corrected: 'x', category, explanationVi: '' })),
  explanationVi: '',
  natural: '',
  gradedBy: 'test',
  latencyMs: 0,
});

describe('normalizeSentence', () => {
  it('ignores case, punctuation, curly quotes and spacing', () => {
    expect(normalizeSentence('  Hello,   WORLD!! ')).toBe('hello world');
    expect(normalizeSentence('It’s “fine”.')).toBe('it is fine');
  });

  it('expands contractions', () => {
    expect(normalizeSentence("I'm sure they won't go, can't they?")).toBe('i am sure they will not go cannot they');
    expect(normalizeSentence("We've done it; she'll see. Don't!")).toBe('we have done it she will see do not');
  });
});

describe('matchReference', () => {
  it('matches any reference after normalising', () => {
    expect(matchReference('i decided to quit my job', item.references)).toBe(true);
    expect(matchReference("I've decided to quit my job!", item.references)).toBe(true);
    expect(matchReference('I decide to quit my job.', item.references)).toBe(false);
    expect(matchReference('   ', item.references)).toBe(false);
  });
});

describe('localGrade', () => {
  it('grades a reference match as correct without the AI', () => {
    expect(localGrade(item, 'I decided to quit my job')).toMatchObject({ verdict: 'correct', gradedBy: 'local' });
    expect(localGrade(item, 'I chose to quit my job.')).toBeNull();
  });

  it('finds inflected target words', () => {
    expect(missingTargetWords('She decided early', ['decide'])).toEqual([]);
    expect(missingTargetWords('She chose early', ['decide'])).toEqual(['decide']);
  });
});

describe('splitBold', () => {
  it('splits the bold markup of a correction', () => {
    expect(splitBold('I **went** home **yesterday**.')).toEqual([
      { text: 'I ', bold: false },
      { text: 'went', bold: true },
      { text: ' home ', bold: false },
      { text: 'yesterday', bold: true },
      { text: '.', bold: false },
    ]);
    expect(splitBold('no change')).toEqual([{ text: 'no change', bold: false }]);
  });
});

describe('summaries', () => {
  it('groups errors by category, most frequent first', () => {
    const groups = groupErrors([grade('incorrect', ['article', 'tense']), grade('acceptable', ['article'])]);
    expect(groups).toEqual([
      { category: 'article', label: 'Mạo từ', count: 2 },
      { category: 'tense', label: 'Thì', count: 1 },
    ]);
  });

  it('counts only graded sentences and lists target words of wrong ones', () => {
    const items = withIds(
      [
        { promptVi: 'a', targetWords: ['decide'], references: ['x'] },
        { promptVi: 'b', targetWords: ['arrive'], references: ['y'] },
        { promptVi: 'c', targetWords: ['leave'], references: ['z'] },
        { promptVi: '', targetWords: ['skip'], references: ['w'] },
      ],
      'L',
    );
    expect(items.map((i) => i.id)).toEqual(['L-1', 'L-2', 'L-3']);
    const result = sentenceStepResult(items, { 'L-1': grade('correct'), 'L-2': grade('incorrect') });
    expect(result).toEqual({ score: 1, total: 2, wrong: ['arrive'] });
  });

  it('keeps sentences whose latest attempt is wrong', () => {
    const rows = [
      { prompt_vi: 'A', target_words: ['a'], reference_answers: ['ra'], verdict: 'incorrect' as const, created_at: '2026-10-01' },
      { prompt_vi: 'A', target_words: ['a'], reference_answers: ['ra'], verdict: 'correct' as const, created_at: '2026-10-02' },
      { prompt_vi: 'B', target_words: ['b'], reference_answers: null, verdict: 'incorrect' as const, created_at: '2026-10-03' },
      { prompt_vi: 'C', target_words: ['c'], reference_answers: ['rc'], verdict: 'acceptable' as const, created_at: '2026-10-04' },
    ];
    expect(pendingWrongSentences(rows)).toEqual([{ id: 'drill-1', promptVi: 'B', targetWords: ['b'], references: [] }]);
  });
});
