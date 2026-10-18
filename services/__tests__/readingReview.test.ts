import { describe, expect, it } from 'vitest';
import type { IeltsAttempt } from '../../types';
import { getReadingTest, READING_TESTS } from '../../data/ielts/reading';
import { findLesson } from '../../data/ielts/library';
import { passageQuestions, scorePassages, type ReadingQuestionResult } from '../readingLogic';
import {
  accuracyBy,
  findPhrase,
  markSegments,
  READING_ERROR_KINDS,
  readingErrorKind,
  reviewMarks,
  summarizeReadingErrors,
  tfngVerdict,
} from '../readingReview';

const PASSAGE = {
  paragraphs: [
    { label: 'A', text: 'Bees were kept in clay hives. The honey was sold cheaply.' },
    { label: 'B', text: 'Later, beekeepers used “wooden boxes”, which were   easy to move.' },
  ],
};

describe('findPhrase', () => {
  it('ignores case, extra spaces and quote styles', () => {
    const a = PASSAGE.paragraphs[0].text;
    const c = findPhrase(a, 'CLAY hives')!;
    expect(a.slice(c[0], c[1])).toBe('clay hives');
    const b = PASSAGE.paragraphs[1].text;
    const r = findPhrase(b, 'which were easy to move')!;
    expect(b.slice(r[0], r[1])).toBe('which were   easy to move');
    expect(findPhrase(b, '"wooden boxes"')).not.toBeNull();
  });

  it('treats regex characters literally and rejects empty phrases', () => {
    expect(findPhrase('cost (in 2020) rose', '(in 2020)')).toEqual([5, 14]);
    expect(findPhrase('abc', 'a.c')).toBeNull();
    expect(findPhrase('abc', '  ')).toBeNull();
  });
});

describe('reviewMarks and markSegments', () => {
  it('puts the evidence in its paragraph and finds the distractor elsewhere', () => {
    const marks = reviewMarks(PASSAGE, { paragraph: 'B', evidence: 'wooden boxes', distractor: 'sold cheaply' });
    expect(marks.B).toHaveLength(1);
    expect(PASSAGE.paragraphs[1].text.slice(marks.B[0].start, marks.B[0].end)).toBe('wooden boxes');
    expect(marks.B[0].kind).toBe('evidence');
    expect(marks.A?.[0].kind).toBe('distractor');
  });

  it('prefers the question paragraph when a phrase repeats', () => {
    const p = { paragraphs: [{ label: 'A', text: 'honey' }, { label: 'B', text: 'honey' }] };
    expect(Object.keys(reviewMarks(p, { paragraph: 'B', evidence: 'honey' }))).toEqual(['B']);
  });

  it('cuts a paragraph into runs and lets the evidence win an overlap', () => {
    const segs = markSegments('one two three four', [
      { start: 4, end: 13, kind: 'distractor' },
      { start: 4, end: 7, kind: 'evidence' },
    ]);
    expect(segs.map((s) => [s.text, s.kind])).toEqual([
      ['one ', null],
      ['two', 'evidence'],
      [' three', 'distractor'],
      [' four', null],
    ]);
    expect(markSegments('abc', []).map((s) => s.text)).toEqual(['abc']);
  });

  it('finds every evidence and distractor of the bundled tests', () => {
    for (const test of READING_TESTS)
      for (const p of test.passages)
        for (const q of passageQuestions(p)) {
          const marks = Object.values(reviewMarks(p, q)).flat();
          expect(marks.some((m) => m.kind === 'evidence'), `${p.id} Q${q.number} evidence`).toBe(true);
          if (q.distractor) expect(marks.some((m) => m.kind === 'distractor'), `${p.id} Q${q.number} distractor`).toBe(true);
        }
  });
});

describe('tfngVerdict', () => {
  it('says what the answer claims about the passage', () => {
    expect(tfngVerdict('TRUE')).toBe('match');
    expect(tfngVerdict('yes')).toBe('match');
    expect(tfngVerdict('F')).toBe('contradict');
    expect(tfngVerdict('NO')).toBe('contradict');
    expect(tfngVerdict('not given')).toBe('absent');
    expect(tfngVerdict('B')).toBeNull();
  });
});

const res = (status: ReadingQuestionResult['status'], groupType: ReadingQuestionResult['groupType'], skill = 'detail') =>
  ({ status, groupType, question: { skill } }) as ReadingQuestionResult;

describe('accuracyBy', () => {
  it('counts per key, weakest first then larger groups', () => {
    const rows = accuracyBy(
      [res('correct', 'tfng'), res('wrong', 'tfng'), res('correct', 'mcq'), res('wrong', 'headings'), res('blank', 'headings'), res('correct', 'completion')],
      (r) => r.groupType,
    );
    expect(rows).toEqual([
      { key: 'headings', correct: 0, total: 2 },
      { key: 'tfng', correct: 1, total: 2 },
      { key: 'mcq', correct: 1, total: 1 },
      { key: 'completion', correct: 1, total: 1 },
    ]);
    expect(accuracyBy([], (r) => r.groupType)).toEqual([]);
  });
});

describe('readingErrorKind', () => {
  it('keeps the four kinds the error log teaches', () => {
    expect(readingErrorKind(res('ng_confusion', 'tfng'))).toBe('ng_confusion');
    expect(readingErrorKind(res('spelling', 'completion'))).toBe('spelling');
    expect(readingErrorKind(res('plural', 'completion'))).toBe('spelling');
    expect(readingErrorKind(res('over_limit', 'short_answer'))).toBe('over_limit');
    expect(readingErrorKind(res('wrong', 'headings'))).toBe('heading');
    expect(readingErrorKind(res('wrong', 'mcq'))).toBeNull();
    expect(readingErrorKind(res('blank', 'headings'))).toBeNull();
    expect(readingErrorKind(res('correct', 'tfng'))).toBeNull();
  });

  it('links every kind to a lesson that exists', () => {
    for (const info of Object.values(READING_ERROR_KINDS)) expect(findLesson(info.lessonId)?.skill).toBe('reading');
  });
});

describe('summarizeReadingErrors', () => {
  const test = READING_TESTS[0];
  const passage = test.passages[0];
  const questions = passageQuestions(passage);
  const tfng = passage.groups.find((g) => g.type === 'tfng')!;
  const ngQ = tfng.questions.find((q) => q.answers[0] === 'NOT GIVEN');
  const textGroup = passage.groups.find((g) => g.type === 'completion' && !g.wordBox?.length);

  /** All right, except the NOT GIVEN statement answered FALSE and one blank misspelt. */
  const answers = (withSpelling: boolean): Record<number, string> => {
    const a: Record<number, string> = {};
    for (const q of questions) a[q.number] = q.answers[0];
    if (ngQ) a[ngQ.number] = 'FALSE';
    if (withSpelling && textGroup) {
      const q = textGroup.questions[0];
      a[q.number] = q.answers[0].slice(0, -1) + (q.answers[0].endsWith('x') ? 'y' : 'x');
    }
    return a;
  };

  const attempt = (id: string, createdAt: string, a: Record<number, string>, extra: Partial<IeltsAttempt> = {}): IeltsAttempt =>
    ({
      id,
      skill: 'reading',
      createdAt,
      details: { testId: test.id, passageIds: [passage.id], mode: 'practice', answers: a, score: 0, total: 0, seconds: {} },
      ...extra,
    }) as unknown as IeltsAttempt;

  it('grades saved answers again and groups the mistakes', () => {
    expect(ngQ && textGroup, 'test 1 passage 1 has a NOT GIVEN statement and word completion').toBeTruthy();
    expect(scorePassages([passage], answers(false)).results.filter((r) => r.status !== 'correct')).toHaveLength(1);

    const log = summarizeReadingErrors(
      [
        attempt('old', '2026-10-01T00:00:00Z', answers(false)),
        attempt('new', '2026-10-02T00:00:00Z', answers(true)),
        attempt('writing', '2026-10-03T00:00:00Z', answers(true), { skill: 'writing' }),
        attempt('gone', '2026-10-03T00:00:00Z', answers(true), { details: { testId: 'missing', passageIds: [], answers: {} } } as Partial<IeltsAttempt>),
      ],
      getReadingTest,
    );
    expect(log.attempts).toBe(2);
    expect(log.total).toBe(3);
    expect(log.kinds.map((k) => [k.kind, k.total])).toEqual([
      ['ng_confusion', 2],
      ['spelling', 1],
    ]);
    const ng = log.kinds[0];
    expect(ng.perAttempt).toBe(1);
    expect(ng.trend).toBeNull();
    expect(ng.examples[0]).toMatchObject({ number: ngQ!.number, given: 'FALSE', expected: 'NOT GIVEN', attemptIndex: 0, testTitle: test.title });
    expect(ng.examples[0].context).toBeTruthy();
    // The same question missed in both attempts is shown once.
    expect(ng.examples.map((e) => e.number)).toEqual([...new Set(ng.examples.map((e) => e.number))]);
    expect(ng.examples).toHaveLength(1);
  });

  it('is empty without Reading attempts', () => {
    expect(summarizeReadingErrors([], getReadingTest)).toEqual({ attempts: 0, total: 0, kinds: [] });
  });
});
