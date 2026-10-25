import { describe, expect, it } from 'vitest';
import type { IeltsAttempt } from '../../types';
import {
  clearWritingDraft,
  countWords,
  listWritingDrafts,
  MAX_RESUME_DRAFTS,
  progressByPrompt,
  readWritingDraft,
  saveWritingDraft,
  summarizeWriting,
  writingLimits,
} from '../writingPracticeLogic';

/** A Storage that lives in memory. */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('limits and word count', () => {
  it('uses the exam limits per task', () => {
    expect(writingLimits({ taskOrPart: 'task_1' })).toEqual({ minWords: 150, minutes: 20 });
    expect(writingLimits({ taskOrPart: 'task_2' })).toEqual({ minWords: 250, minutes: 40 });
    expect(writingLimits({ taskOrPart: 'part_1' })).toEqual({ minWords: 250, minutes: 40 });
  });

  it('counts words across spaces and line breaks', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
    expect(countWords(' one  two\nthree\t four ')).toBe(4);
  });
});

describe('drafts', () => {
  it('saves, reads back and clears a draft', () => {
    const s = memoryStorage();
    const now = () => new Date('2026-10-25T08:00:00Z');
    expect(saveWritingDraft('u1', 'q1', words(30), 95.7, s, now)).toBe(true);
    expect(readWritingDraft('u1', 'q1', s)).toEqual({ questionId: 'q1', text: words(30), elapsedSeconds: 95, savedAt: '2026-10-25T08:00:00.000Z' });
    expect(readWritingDraft('u2', 'q1', s)).toBeNull();
    clearWritingDraft('u1', 'q1', s);
    expect(readWritingDraft('u1', 'q1', s)).toBeNull();
  });

  it('drops a draft that is nearly empty instead of keeping it', () => {
    const s = memoryStorage();
    saveWritingDraft('u1', 'q1', words(30), 10, s);
    expect(saveWritingDraft('u1', 'q1', 'two words', 12, s)).toBe(false);
    expect(readWritingDraft('u1', 'q1', s)).toBeNull();
  });

  it('ignores broken stored values and storage that throws', () => {
    const s = memoryStorage();
    s.setItem('ielts-writing-draft:u1:q1', '{nope');
    s.setItem('ielts-writing-draft:u1:q2', JSON.stringify({ text: '  ' }));
    expect(readWritingDraft('u1', 'q1', s)).toBeNull();
    expect(readWritingDraft('u1', 'q2', s)).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readWritingDraft('u1', 'q1', broken)).toBeNull();
    expect(saveWritingDraft('u1', 'q1', words(30), 0, broken)).toBe(false);
    expect(() => clearWritingDraft('u1', 'q1', broken)).not.toThrow();
  });

  it('lists only this learner\'s drafts, newest first, a few at most', () => {
    const s = memoryStorage();
    ['q1', 'q2', 'q3', 'q4'].forEach((q, i) => saveWritingDraft('u1', q, words(20), 0, s, () => new Date(`2026-10-2${i + 1}T08:00:00Z`)));
    saveWritingDraft('u2', 'q9', words(20), 0, s);
    s.setItem('other-key', 'x');
    const list = listWritingDrafts('u1', s);
    expect(list.map((d) => d.questionId)).toEqual(['q4', 'q3', 'q2']);
    expect(list).toHaveLength(MAX_RESUME_DRAFTS);
    expect(listWritingDrafts('nobody', s)).toEqual([]);
  });
});

describe('progress per prompt', () => {
  const attempt = (prompt: string, band: number | undefined, skill: IeltsAttempt['skill'] = 'writing'): IeltsAttempt => ({
    userId: 'u1',
    skill,
    taskOrPart: 'task_2',
    questionType: 'opinion',
    topic: 't',
    questionPrompt: prompt,
    answerText: 'a',
    estimatedBand: band,
  });

  it('counts attempts and keeps the best band of each prompt', () => {
    const map = progressByPrompt([attempt('A', 5.5), attempt('A', 6.5), attempt('A', undefined), attempt('B', 7), attempt('A', 9, 'speaking')]);
    expect(map.get('A')).toEqual({ attempts: 3, bestBand: 6.5 });
    expect(map.get('B')).toEqual({ attempts: 1, bestBand: 7 });
    expect(map.size).toBe(2);
  });

  it('summarizes prompts, attempts, best and average band', () => {
    expect(summarizeWriting([attempt('A', 5.5), attempt('A', 6.5), attempt('B', 7), attempt('B', undefined)])).toEqual({
      prompts: 2,
      attempts: 4,
      bestBand: 7,
      averageBand: 6.3,
    });
    expect(summarizeWriting([])).toEqual({ prompts: 0, attempts: 0, bestBand: null, averageBand: null });
  });
});

import { examOutcome, examSecondsLeft, readWritingMode, saveWritingMode } from '../writingPracticeLogic';

describe('exam mode', () => {
  it('counts the seconds left and stops at zero', () => {
    const start = 1_000_000;
    expect(examSecondsLeft(start, start, 20)).toBe(1200);
    expect(examSecondsLeft(start, start + 60_500, 20)).toBe(1140);
    expect(examSecondsLeft(start, start + 20 * 60_000, 20)).toBe(0);
    expect(examSecondsLeft(start, start + 99 * 60_000, 20)).toBe(0);
  });

  it('sends what is written when time is up, and has nothing to grade otherwise', () => {
    expect(examOutcome(0)).toBe('empty');
    expect(examOutcome(1)).toBe('submit');
    expect(examOutcome(300)).toBe('submit');
  });

  it('remembers the chosen mode', () => {
    const map = new Map<string, string>();
    const s = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    expect(readWritingMode(s)).toBe('practice');
    saveWritingMode('exam', s);
    expect(readWritingMode(s)).toBe('exam');
    saveWritingMode('practice', s);
    expect(readWritingMode(s)).toBe('practice');
    expect(readWritingMode({ getItem: () => { throw new Error('blocked'); } })).toBe('practice');
  });
});
