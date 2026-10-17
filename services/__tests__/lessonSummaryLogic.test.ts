import { describe, it, expect } from 'vitest';
import { lessonStepStates, nextReviewLabel, summarizeLesson, type SummaryRecord } from '../lessonSummaryLogic';
import { AppPhase, MasteryLevel } from '../../types';

const NOW = new Date('2026-10-17T10:00:00');
const at = (s: string) => new Date(s).toISOString();
const r = (word: string, o: Partial<SummaryRecord> = {}): SummaryRecord => ({
  id: word,
  word,
  mastery_level: MasteryLevel.LEARNING,
  next_review_date: at('2026-10-18T09:00:00'),
  incorrect_count: 0,
  meaning_vi: `nghĩa ${word}`,
  ...o,
});

describe('lessonStepStates', () => {
  const status = (...args: Parameters<typeof lessonStepStates>) => lessonStepStates(...args).map((s) => s.status);

  it('marks the open step current and later steps todo at the start', () => {
    expect(status(AppPhase.FLASHCARDS, false, undefined)).toEqual(['current', 'todo', 'todo', 'todo', 'todo']);
  });

  it('derives done steps from data, including Truyện once the quiz has a score', () => {
    expect(status(AppPhase.FILL_BLANK, true, { quiz: { score: 4, total: 5, wrong: [] } })).toEqual([
      'done',
      'done',
      'done',
      'current',
      'todo',
    ]);
  });

  it('keeps scores when going back to an earlier step', () => {
    const progress = { quiz: { score: 4, total: 5, wrong: [] }, fillBlank: { score: 5, total: 5, wrong: [] } };
    expect(status(AppPhase.STORY, true, progress)).toEqual(['done', 'current', 'done', 'done', 'todo']);
  });

  it('shows every step done on the summary', () => {
    expect(status(AppPhase.LESSON_SUMMARY, false, undefined)).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('marks every earlier step done once Luyện câu has a result', () => {
    const progress = { sentences: { score: 4, total: 6, wrong: ['decide'] } };
    expect(status(AppPhase.QUIZ, false, progress)).toEqual(['done', 'done', 'current', 'done', 'done']);
  });
});

describe('summarizeLesson', () => {
  const words = ['Resilient', 'allocate', 'skill', 'travel'];

  it('counts remembered words and lists what to review, ignoring words outside the lesson', () => {
    const s = summarizeLesson(
      words,
      [r('resilient'), r('allocate', { mastery_level: MasteryLevel.LAPSED }), r('skill'), r('travel'), r('other')],
      { quiz: { score: 3, total: 4, wrong: ['skill', 'other'] }, fillBlank: { score: 4, total: 4, wrong: [] } },
      NOW,
    );
    expect(s.total).toBe(4);
    expect(s.needReview).toEqual(['allocate', 'skill']);
    expect(s.remembered).toBe(2);
    expect(s.quiz?.score).toBe(3);
  });

  it('ranks the top 3 mistakes by misses in this lesson, then lifetime errors', () => {
    const s = summarizeLesson(
      words,
      [r('resilient', { incorrect_count: 1 }), r('allocate', { incorrect_count: 6 }), r('skill'), r('travel')],
      { quiz: { score: 0, total: 4, wrong: ['skill', 'resilient', 'allocate', 'travel'] }, fillBlank: { score: 3, total: 4, wrong: ['Skill'] } },
      NOW,
    );
    expect(s.mistakes.map((m) => [m.word, m.misses])).toEqual([
      ['skill', 2],
      ['allocate', 1],
      ['resilient', 1],
    ]);
    expect(s.mistakes[0].meaning).toBe('nghĩa skill');
  });

  it('counts sentence misses with the other steps', () => {
    const s = summarizeLesson(
      words,
      [r('resilient'), r('allocate'), r('skill'), r('travel')],
      { quiz: { score: 3, total: 4, wrong: ['travel'] }, sentences: { score: 1, total: 2, wrong: ['travel', 'allocate'] } },
      NOW,
    );
    expect(s.sentences).toEqual({ score: 1, total: 2, wrong: ['travel', 'allocate'] });
    expect(s.needReview).toEqual(['allocate', 'travel']);
    expect(s.mistakes[0]).toMatchObject({ word: 'travel', misses: 2 });
  });

  it('finds the earliest review day, skipping new and suspended words', () => {
    const s = summarizeLesson(
      words,
      [
        r('resilient', { next_review_date: at('2026-10-18T08:00:00') }),
        r('allocate', { next_review_date: at('2026-10-18T20:00:00') }),
        r('skill', { mastery_level: MasteryLevel.NEW, next_review_date: at('2026-10-17T09:00:00') }),
        r('travel', { is_suspended: true, next_review_date: at('2026-10-17T09:00:00') }),
      ],
      undefined,
      NOW,
    );
    expect(s.nextReview).toEqual({ days: 1, count: 2 });
    expect(nextReviewLabel(s.nextReview!)).toBe('Ngày mai ôn 2 từ');
    expect(nextReviewLabel({ days: 0, count: 3 })).toBe('Hôm nay ôn 3 từ');
    expect(summarizeLesson(words, [], undefined, NOW).nextReview).toBeNull();
  });
});
