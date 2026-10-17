import { describe, it, expect } from 'vitest';
import { countInputWords, lessonMinutes, pickPrimaryAction, reviewMinutes } from '../dashboardLogic';

describe('pickPrimaryAction', () => {
  const base = { activeLesson: null, dueCount: 0, wrongSentences: 0 };

  it('continues an open lesson before anything else', () => {
    const a = pickPrimaryAction({ ...base, activeLesson: { topic: 'Du lịch' }, dueCount: 12, wrongSentences: 3 });
    expect(a.kind).toBe('continue');
    expect(a.title).toBe('Tiếp tục bài Du lịch');
  });

  it('then due words, with a time estimate', () => {
    const a = pickPrimaryAction({ ...base, dueCount: 12, wrongSentences: 3 });
    expect(a).toMatchObject({ kind: 'review', count: 12, title: 'Ôn 12 từ (~4 phút)' });
  });

  it('then wrong sentences, then a new lesson', () => {
    expect(pickPrimaryAction({ ...base, wrongSentences: 3 })).toMatchObject({ kind: 'sentences', title: 'Luyện 3 câu sai' });
    expect(pickPrimaryAction(base).kind).toBe('new');
    expect(pickPrimaryAction({ ...base, dueCount: null }).kind).toBe('new');
  });
});

describe('estimates', () => {
  it('rounds review time to at least a minute', () => {
    expect(reviewMinutes(1)).toBe(1);
    expect(reviewMinutes(12)).toBe(4);
    expect(reviewMinutes(45)).toBe(15);
  });

  it('estimates a lesson from its word count', () => {
    expect(lessonMinutes(0)).toBe(0);
    expect(lessonMinutes(2)).toBe(5);
    expect(lessonMinutes(10)).toBe(15);
  });

  it('counts distinct input words', () => {
    expect(countInputWords('Apple, banana\napple;  cherry ,, ')).toBe(3);
    expect(countInputWords('   ')).toBe(0);
  });
});
