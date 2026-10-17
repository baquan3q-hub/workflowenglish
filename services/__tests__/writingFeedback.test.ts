import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: Array<[string, unknown[]]> = [];
let result: { data: unknown; error: unknown } = { data: [], error: null };
const chain: Record<string, (...args: unknown[]) => unknown> = {};
for (const name of ['from', 'select', 'eq', 'lt', 'order']) {
  chain[name] = (...args: unknown[]) => {
    calls.push([name, args]);
    return chain;
  };
}
chain.limit = (...args: unknown[]) => {
  calls.push(['limit', args]);
  return Promise.resolve(result);
};
vi.mock('../supabaseClient', () => ({ supabase: { from: (...a: unknown[]) => chain.from(...a) }, withTimeout: (p: unknown) => p }));

import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { BadRequest } from '../../supabase/functions/ai-proxy/lib.ts';
import {
  splitEssayParagraphs as opSplit,
  TASK1_CHECKS,
  WRITING_ERROR_CATEGORIES,
} from '../../supabase/functions/ai-proxy/ops/ielts.ts';
import { ERROR_CATEGORIES, errorCategory } from '../../data/ielts/errorCategories';
import { findLesson, WRITING_ERRORS_LESSON_ID } from '../../data/ielts/library';
import {
  compareBands,
  diffStats,
  diffWords,
  formatDelta,
  groupCorrections,
  paragraphNotes,
  splitEssayParagraphs,
  task1Checks,
  TASK1_CHECK_LABELS,
} from '../writingFeedbackLogic';
import { getPreviousWritingAttempt } from '../ieltsAttemptService';
import type { IeltsAiFeedback } from '../../types';

const promptOf = (req: { contents: { parts: unknown[] }[] }) => (req.contents[0].parts[0] as { text: string }).text;
type Schema = { properties: Record<string, { items?: { properties: Record<string, { enum?: string[] }> } }> };
const schemaOf = (req: { generationConfig: Record<string, unknown> }) => req.generationConfig.responseSchema as Schema;

const essay = 'First paragraph here.\n\n  Second   paragraph.  \nThird one.\n\n';

describe('gradeIeltsWriting op', () => {
  const op = OPS.gradeIeltsWriting;

  it('numbers the paragraphs in the prompt and asks for labelled corrections', () => {
    const req = op.build({ question: 'Q', answer: essay, taskType: 'task_2' });
    const text = promptOf(req);
    expect(text).toContain('[P1] First paragraph here.');
    expect(text).toContain('[P2] Second   paragraph.');
    expect(text).toContain('[P3] Third one.');
    expect(text).not.toContain('[P4]');
    const schema = schemaOf(req);
    expect(schema.properties.sentenceCorrections.items!.properties.category.enum).toEqual(WRITING_ERROR_CATEGORIES);
    expect(schema.properties.paragraphFeedback).toBeTruthy();
    expect(schema.properties.task1Checklist).toBeUndefined();
    expect(text).not.toContain('task1Checklist');
  });

  it('adds the Task 1 checklist only for Task 1', () => {
    const req = op.build({ question: 'Q', answer: essay, taskType: 'task_1' });
    expect(schemaOf(req).properties.task1Checklist.items!.properties.id.enum).toEqual(TASK1_CHECKS);
    expect(promptOf(req)).toContain('task1Checklist');
    expect(promptOf(req)).toMatch(/9\. nextActions/);
  });

  it('splits paragraphs the same way on both sides', () => {
    for (const text of [essay, 'One line only', '\n\nA\r\nB\n \nC']) {
      expect(splitEssayParagraphs(text)).toEqual(opSplit(text));
    }
    expect(splitEssayParagraphs(essay)).toEqual(['First paragraph here.', 'Second   paragraph.', 'Third one.']);
  });
});

describe('ieltsIdeas op', () => {
  const op = OPS.ieltsIdeas;

  it('builds a planning prompt that forbids writing the essay', () => {
    const req = op.build({ question: 'Should cars be banned?', essayType: 'opinion' });
    expect(promptOf(req)).toContain('Should cars be banned?');
    expect(promptOf(req)).toMatch(/Never write the essay/);
    expect(Object.keys(schemaOf(req).properties)).toEqual(['sides', 'vocabulary', 'outline']);
    expect(op.hourlyLimit).toBe(20);
  });

  it('rejects a missing question and empty output', () => {
    expect(() => op.build({})).toThrow(BadRequest);
    expect(() => op.finalize!({ sides: [], outline: [] })).toThrow();
    const ok = { sides: [{ label: 'A', ideas: [] }], vocabulary: [], outline: [] };
    expect(op.finalize!(ok)).toBe(ok);
  });
});

describe('error categories', () => {
  it('match the ids the grading op asks for, with a label and example each', () => {
    expect(ERROR_CATEGORIES.map((c) => c.id)).toEqual(WRITING_ERROR_CATEGORIES);
    for (const c of ERROR_CATEGORIES) {
      expect(c.label && c.hintVi && c.example.wrong && c.example.right).toBeTruthy();
      expect(c.example.wrong).not.toBe(c.example.right);
    }
    expect(errorCategory('tense')?.label).toBe('Thì động từ');
    expect(errorCategory('nope')).toBeUndefined();
    expect(errorCategory(undefined)).toBeUndefined();
  });

  it('have a Library lesson with one section per label', () => {
    const lesson = findLesson(WRITING_ERRORS_LESSON_ID)!;
    expect(lesson.skill).toBe('writing');
    for (const c of ERROR_CATEGORIES) expect(lesson.sections.some((s) => s.heading === c.label)).toBe(true);
  });

  it('cover the Task 1 checks', () => {
    expect(Object.keys(TASK1_CHECK_LABELS)).toEqual(TASK1_CHECKS);
  });
});

const fb = (over: Partial<IeltsAiFeedback> = {}): IeltsAiFeedback => ({
  estimatedBand: 6,
  criterionScores: [
    { name: 'Task Response', nameVi: '', score: 6, comment: '' },
    { name: 'Coherence and Cohesion', nameVi: '', score: 6, comment: '' },
    { name: 'Lexical Resource', nameVi: '', score: 5.5, comment: '' },
    { name: 'Grammatical Range and Accuracy', nameVi: '', score: 6, comment: '' },
  ],
  strengths: [],
  weaknesses: [],
  sentenceCorrections: [],
  improvedVersion: '',
  nextActions: [],
  ...over,
});

describe('writing feedback logic', () => {
  it('keeps paragraph notes that point at a real paragraph, first one wins', () => {
    const note = (index: number, role: string) => ({ index, role, comment: '', suggestion: '' });
    const notes = paragraphNotes({ paragraphFeedback: [note(1, 'a'), note(1, 'dup'), note(3, 'c'), note(0, 'x'), note(9, 'y')] }, 3);
    expect([...notes.keys()].sort()).toEqual([0, 2]);
    expect(notes.get(0)!.role).toBe('a');
    expect(paragraphNotes({}, 3).size).toBe(0);
  });

  it('groups corrections by label, biggest first, unknown labels last as "Khác"', () => {
    const c = (category?: string) => ({ original: 'o', corrected: 'c', explanation: 'e', category });
    const groups = groupCorrections([c('tense'), c('article'), c(), c('article'), c('made_up')]);
    expect(groups.map((g) => [g.label, g.corrections.length])).toEqual([
      ['Mạo từ', 2],
      ['Thì động từ', 1],
      ['Khác', 2],
    ]);
    expect(groupCorrections([])).toEqual([]);
  });

  it('orders the Task 1 checks and drops unknown or repeated ones', () => {
    const checks = task1Checks({
      task1Checklist: [
        { id: 'no_opinion', passed: true, note: '' },
        { id: 'overview', passed: false, note: 'missing' },
        { id: 'overview', passed: true, note: 'dup' },
        { id: 'other' as 'overview', passed: true, note: '' },
      ],
    });
    expect(checks.map((c) => [c.id, c.passed])).toEqual([
      ['overview', false],
      ['no_opinion', true],
    ]);
    expect(checks[0].label).toBe(TASK1_CHECK_LABELS.overview);
    expect(task1Checks({})).toEqual([]);
  });

  it('compares bands by criterion name', () => {
    const before = fb({ estimatedBand: 5.5, criterionScores: fb().criterionScores.slice(1) });
    const after = fb({ estimatedBand: 6 });
    const cmp = compareBands(before, after);
    expect(cmp.overall).toBe(0.5);
    expect(cmp.criteria).toEqual([undefined, 0, 0, 0]);
    expect(formatDelta(0.5)).toBe('+0.5');
    expect(formatDelta(-1)).toBe('−1');
    expect(formatDelta(0)).toBe('0');
  });

  it('diffs words and keeps paragraph breaks', () => {
    const diff = diffWords('Cars is bad.\nThe end.', 'Cars are harmful.\nThe end.');
    expect(diff).toEqual([
      { text: 'Cars', kind: 'same' },
      { text: 'is bad.', kind: 'removed' },
      { text: 'are harmful.', kind: 'added' },
      { text: '\n', kind: 'same' },
      { text: 'The end.', kind: 'same' },
    ]);
    expect(diffStats(diff)).toEqual({ added: 2, removed: 2 });
    expect(diffWords('Same text', 'Same text')).toEqual([{ text: 'Same text', kind: 'same' }]);
    expect(diffStats(diffWords('', 'New words'))).toEqual({ added: 2, removed: 0 });
  });
});

describe('getPreviousWritingAttempt', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('asks for the latest Writing attempt on the prompt, before a time when given', async () => {
    result = {
      data: [{ id: 'a1', user_id: 'u1', skill: 'writing', task_or_part: 'task_2', question_prompt: 'P', answer_text: 'old', ai_feedback: fb(), created_at: 't' }],
      error: null,
    };
    const attempt = await getPreviousWritingAttempt('u1', 'P', '2026-10-01T00:00:00Z');
    expect(attempt?.answerText).toBe('old');
    expect(calls).toContainEqual(['eq', ['question_prompt', 'P']]);
    expect(calls).toContainEqual(['eq', ['skill', 'writing']]);
    expect(calls).toContainEqual(['lt', ['created_at', '2026-10-01T00:00:00Z']]);
    expect(calls).toContainEqual(['limit', [1]]);
  });

  it('returns null when there is none or the query fails', async () => {
    result = { data: [], error: null };
    expect(await getPreviousWritingAttempt('u1', 'P')).toBeNull();
    expect(calls.some(([name]) => name === 'lt')).toBe(false);
    result = { data: null, error: new Error('offline') };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getPreviousWritingAttempt('u1', 'P')).toBeNull();
  });
});
