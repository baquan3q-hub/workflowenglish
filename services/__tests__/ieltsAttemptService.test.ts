import { describe, it, expect, vi } from 'vitest';

// The service imports the Supabase client, which needs env vars at load time.
vi.mock('../supabaseClient', () => ({ supabase: {}, withTimeout: (p: unknown) => p }));

import {
  countWords,
  criterionScoresToMap,
  normalizeBand,
  resolveAttemptQuestion,
} from '../ieltsAttemptService';
import { writingTask2Questions } from '../../data/ieltsWritingQuestions';
import type { IeltsAiFeedback, IeltsAttempt } from '../../types';

describe('ieltsAttemptService helpers', () => {
  it('counts words ignoring extra whitespace', () => {
    expect(countWords('  Hello   world\nagain ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });

  it('normalizes bands to 0.5 steps within 0–9', () => {
    expect(normalizeBand(6.3)).toBe(6.5);
    expect(normalizeBand('5.0')).toBe(5);
    expect(normalizeBand(12)).toBe(9);
    expect(normalizeBand(-1)).toBe(0);
    expect(normalizeBand('abc')).toBeUndefined();
    expect(normalizeBand(null)).toBeUndefined();
  });

  it('maps criterion scores by English name', () => {
    const feedback = {
      criterionScores: [
        { name: 'Lexical Resource', nameVi: '', score: 6, comment: '' },
        { name: 'Pronunciation', nameVi: '', score: 5.5, comment: '' },
      ],
    } as IeltsAiFeedback;
    expect(criterionScoresToMap(feedback)).toEqual({ 'Lexical Resource': 6, Pronunciation: 5.5 });
  });

  it('resolves the bank question by prompt, or builds a fallback', () => {
    const bankQuestion = writingTask2Questions[0];
    const base: IeltsAttempt = {
      id: 'a1',
      userId: 'u1',
      skill: 'writing',
      taskOrPart: bankQuestion.taskOrPart,
      questionType: bankQuestion.questionType,
      topic: bankQuestion.topic,
      questionPrompt: bankQuestion.prompt,
      answerText: '',
    };
    expect(resolveAttemptQuestion(base)).toBe(bankQuestion);

    const fallback = resolveAttemptQuestion({ ...base, questionPrompt: 'Removed question' });
    expect(fallback.prompt).toBe('Removed question');
    expect(fallback.skill).toBe('writing');
    expect(fallback.targetBand).toBeTruthy();
  });
});
