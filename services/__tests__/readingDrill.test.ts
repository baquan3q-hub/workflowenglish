import { describe, expect, it } from 'vitest';
import type { IeltsAttempt } from '../../types';
import { getReadingTest, READING_TESTS } from '../../data/ielts/reading';
import { findLesson, LIBRARY_LESSONS } from '../../data/ielts/library';
import { kindsForLesson, READING_KIND_LESSON, type ReadingKind } from '../../data/ielts/readingLessons';
import { AWL_LESSONS } from '../../data/ielts/awlLessons';
import { readingGroupKind } from '../../components/ielts/questions/questionLogic';
import { passageQuestions } from '../readingLogic';
import {
  attemptRecords,
  buildDrill,
  DRILL_KINDS,
  drillCandidates,
  drillKindCounts,
  drillTestId,
  groupRecords,
  parseDrillTestId,
  resolveReadingTest,
  type GroupRecord,
} from '../readingDrill';

const test1 = READING_TESTS[0];
const p1 = test1.passages[0];
const tfngGroup = p1.groups.find((g) => g.type === 'tfng')!;
const kind = readingGroupKind(tfngGroup) as ReadingKind;

describe('drill ids', () => {
  it('round-trips and rejects unknown kinds', () => {
    const src = { kind, testId: test1.id, passageId: p1.id };
    expect(parseDrillTestId(drillTestId(src))).toEqual(src);
    expect(parseDrillTestId('drill:map:a:b')).toBeNull();
    expect(parseDrillTestId(test1.id)).toBeNull();
  });
});

describe('buildDrill and resolveReadingTest', () => {
  it('keeps only the groups of one kind and scales the time', () => {
    const drill = buildDrill(test1, p1, kind)!;
    expect(drill.passages).toHaveLength(1);
    expect(drill.passages[0].groups.every((g) => readingGroupKind(g) === kind)).toBe(true);
    expect(drill.passages[0].suggestedMinutes).toBeLessThanOrEqual(p1.suggestedMinutes);
    expect(drill.passages[0].suggestedMinutes).toBeGreaterThanOrEqual(3);
    expect(drill.title).toContain('Passage 1');
    expect(resolveReadingTest(drill.id, getReadingTest)).toEqual(drill);
  });

  it('returns nothing for a kind the passage lacks or an unknown source', () => {
    const missing = DRILL_KINDS.find((k) => !p1.groups.some((g) => readingGroupKind(g) === k))!;
    expect(buildDrill(test1, p1, missing)).toBeNull();
    expect(resolveReadingTest(drillTestId({ kind: missing, testId: test1.id, passageId: p1.id }), getReadingTest)).toBeUndefined();
    expect(resolveReadingTest(drillTestId({ kind, testId: 'gone', passageId: p1.id }), getReadingTest)).toBeUndefined();
    expect(resolveReadingTest('drill:broken', getReadingTest)).toBeUndefined();
    expect(resolveReadingTest(test1.id, getReadingTest)).toBe(test1);
  });
});

describe('drill records', () => {
  const allRight = Object.fromEntries(passageQuestions(p1).map((q) => [q.number, q.answers[0]]));

  it('grades every group of the passages answered', () => {
    const recs = groupRecords(test1.id, [p1], allRight, '2026-10-01');
    expect(recs).toHaveLength(p1.groups.length);
    expect(recs.every((r) => r.correct === r.total)).toBe(true);
  });

  it('reads saved attempts, including drills, against the bundled test', () => {
    const drill = buildDrill(test1, p1, kind)!;
    const attempts = [
      { skill: 'reading', createdAt: '2026-10-01', details: { testId: test1.id, passageIds: [p1.id], mode: 'practice', answers: allRight } },
      { skill: 'reading', createdAt: '2026-10-02', details: { testId: drill.id, passageIds: [], mode: 'practice', answers: {} } },
      { skill: 'writing', createdAt: '2026-10-03', details: {} },
    ] as unknown as IeltsAttempt[];
    const recs = attemptRecords(attempts, getReadingTest);
    expect(recs.filter((r) => r.at === '2026-10-01')).toHaveLength(p1.groups.length);
    const fromDrill = recs.filter((r) => r.at === '2026-10-02');
    expect(fromDrill.map((r) => r.testId)).toEqual(drill.passages[0].groups.map(() => test1.id));
    expect(fromDrill.every((r) => r.correct === 0)).toBe(true);
  });
});

describe('drillCandidates', () => {
  const rec = (testId: string, passageId: string, groupId: string, correct: number, total: number, at: string): GroupRecord => ({
    testId,
    passageId,
    groupId,
    correct,
    total,
    at,
  });

  it('puts last-time mistakes first, then untried, then all correct', () => {
    const all = drillCandidates(kind, READING_TESTS, []);
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.every((c) => c.status === 'new')).toBe(true);

    const [a, b] = all;
    const groupOf = (c: (typeof all)[number]) =>
      getReadingTest(c.testId)!.passages.find((p) => p.id === c.passageId)!.groups.filter((g) => readingGroupKind(g) === kind);
    const doneRecs = groupOf(a).map((g) => rec(a.testId, a.passageId, g.id, g.questions.length, g.questions.length, '2026-10-01'));
    const wrongRecs = groupOf(b).map((g) => rec(b.testId, b.passageId, g.id, 0, g.questions.length, '2026-10-02'));
    const sorted = drillCandidates(kind, READING_TESTS, [...doneRecs, ...wrongRecs]);
    expect(sorted[0]).toMatchObject({ id: b.id, status: 'wrong', correct: 0 });
    expect(sorted[sorted.length - 1]).toMatchObject({ id: a.id, status: 'done' });
  });

  it('uses only the latest outcome of each group', () => {
    const [a] = drillCandidates(kind, READING_TESTS, []);
    const g = getReadingTest(a.testId)!.passages.find((p) => p.id === a.passageId)!.groups.filter((x) => readingGroupKind(x) === kind);
    const old = g.map((x) => rec(a.testId, a.passageId, x.id, 0, x.questions.length, '2026-09-01'));
    const fixed = g.map((x) => rec(a.testId, a.passageId, x.id, x.questions.length, x.questions.length, '2026-10-01'));
    expect(drillCandidates(kind, READING_TESTS, [...fixed, ...old]).find((c) => c.id === a.id)?.status).toBe('done');
  });
});

describe('drillKindCounts', () => {
  it('counts questions per kind in chip order', () => {
    const counts = drillKindCounts(READING_TESTS);
    expect([...counts.keys()]).toEqual(DRILL_KINDS.filter((k) => counts.has(k)));
    const total = READING_TESTS.flatMap((t) => t.passages).reduce((n, p) => n + passageQuestions(p).length, 0);
    expect([...counts.values()].reduce((n, c) => n + c, 0)).toBe(total);
  });
});

describe('Reading lessons', () => {
  it('has a strategy lesson for every kind, and every kind in the tests has one', () => {
    for (const k of DRILL_KINDS) expect(findLesson(READING_KIND_LESSON[k])?.skill, k).toBe('reading');
    for (const k of drillKindCounts(READING_TESTS).keys()) expect(kindsForLesson(READING_KIND_LESSON[k])).toContain(k);
    expect(new Set(Object.values(READING_KIND_LESSON)).size).toBe(12);
  });

  it('has worked examples with a valid answer and word lists with meanings', () => {
    const reading = LIBRARY_LESSONS.filter((l) => l.skill === 'reading');
    expect(reading.length).toBeGreaterThanOrEqual(12 + 5 + AWL_LESSONS.length);
    for (const l of reading)
      for (const s of l.sections) {
        for (const q of s.quiz ?? []) {
          expect(q.answer, `${l.id}: ${q.question}`).toBeGreaterThanOrEqual(0);
          expect(q.answer, `${l.id}: ${q.question}`).toBeLessThan(q.options.length);
          expect(new Set(q.options).size).toBe(q.options.length);
          expect(q.explanationVi.length).toBeGreaterThan(20);
        }
        for (const w of s.words ?? []) expect(w.meaningVi && w.example, `${l.id}: ${w.word}`).toBeTruthy();
      }
    const awlWords = AWL_LESSONS.flatMap((l) => l.sections.flatMap((s) => s.words ?? []).map((w) => w.word));
    expect(new Set(awlWords).size).toBe(awlWords.length);
    expect(AWL_LESSONS.every((l) => l.sections.some((s) => s.quiz?.length))).toBe(true);
  });
});
