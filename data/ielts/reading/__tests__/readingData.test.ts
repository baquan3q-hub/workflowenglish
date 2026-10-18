import { describe, expect, it } from 'vitest';
import { readingGroupKind, type GroupKind } from '../../../../components/ielts/questions/questionLogic';
import { passageWordCount, validateReadingTest } from '../../../../services/readingLogic';
import { READING_EXAM_MINUTES, READING_FULL_TESTS, READING_TESTS } from '..';

const passages = READING_TESTS.flatMap((t) => t.passages);

describe('bundled Reading tests', () => {
  it.each(READING_TESTS.map((t) => [t.id, t] as const))('%s passes every data check', (_, test) => {
    expect(validateReadingTest(test)).toEqual([]);
  });

  it.each(passages.map((p) => [p.id, p] as const))('%s is 700–950 words long', (_, passage) => {
    const n = passageWordCount(passage);
    expect(n).toBeGreaterThanOrEqual(700);
    expect(n).toBeLessThanOrEqual(950);
  });

  it('has unique test, passage and group ids', () => {
    const ids = [...READING_TESTS.map((t) => t.id), ...passages.map((p) => p.id), ...passages.flatMap((p) => p.groups.map((g) => g.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every Academic question type', () => {
    const kinds = new Set(passages.flatMap((p) => p.groups.map(readingGroupKind)));
    const all: GroupKind[] = ['completion', 'summary_box', 'flowchart', 'short_answer', 'mcq', 'mcq_multi', 'tfng', 'ynng', 'headings', 'matching_paragraph', 'matching_feature', 'matching_ending', 'diagram'];
    for (const k of all) expect(kinds, k).toContain(k);
    expect(passages.some((p) => p.groups.some((g) => g.type === 'completion' && g.table))).toBe(true);
  });

  it('times a full test at the exam\u2019s 60 minutes', () => {
    for (const t of READING_FULL_TESTS) expect(t.passages.reduce((n, p) => n + p.suggestedMinutes, 0)).toBe(READING_EXAM_MINUTES);
  });
});
