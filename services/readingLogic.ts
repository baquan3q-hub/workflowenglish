/**
 * IELTS Reading (Academic) grading, done on the device (no AI): grading each
 * question type, raw score to band, and checks on test data. Written answers
 * are checked by ieltsAnswerLogic, the same way as Listening.
 */
import type {
  ReadingAnswers,
  ReadingGroup,
  ReadingPassage,
  ReadingQuestion,
  ReadingTest,
} from '../data/ielts/reading/types';
import { ANSWER_STATUS_LABELS, classifyTextAnswer, letter, multiChoiceMarks, type AnswerStatus } from './ieltsAnswerLogic';
import { PASSAGE_QUESTIONS, passageProblems, passageWordCount, TFNG_VALUES } from '../supabase/functions/ai-proxy/ops/readingRules.ts';

export { errorBreakdown, unansweredCount } from './ieltsAnswerLogic';
export { passageWordCount, TFNG_VALUES };

/** Listening's answer types, plus mixing up NOT GIVEN with TRUE/FALSE (or YES/NO). */
export type ReadingAnswerStatus = AnswerStatus | 'ng_confusion';

export const READING_STATUS_LABELS: Record<ReadingAnswerStatus, string> = {
  ...ANSWER_STATUS_LABELS,
  ng_confusion: 'Nhầm NOT GIVEN',
};

export interface ReadingQuestionResult {
  number: number;
  part: number;
  passageId: string;
  groupId: string;
  groupType: ReadingGroup['type'];
  given: string;
  status: ReadingAnswerStatus;
  /** The first accepted answer; letters or a heading key for choice questions. */
  expected: string;
  question: ReadingQuestion;
}

/** Heading keys are lower-case Roman numerals. */
const headingKey = (s: string | undefined) => (s ?? '').trim().toLowerCase();

const TFNG_SHORT: Record<string, string> = { T: 'TRUE', F: 'FALSE', Y: 'YES', N: 'NO', NG: 'NOT GIVEN', NOTGIVEN: 'NOT GIVEN' };

/** "t", "ng", "Not given" → TRUE, NOT GIVEN, NOT GIVEN. */
export function normalizeTfng(raw: string | undefined): string {
  const s = letter(raw).replace(/\s+/g, ' ');
  return TFNG_SHORT[s.replace(/ /g, '')] ?? s;
}

/** Wrong in the way learners most often are: NOT GIVEN taken for a contradiction, or the reverse. */
export function tfngStatus(given: string, expected: string): ReadingAnswerStatus {
  if (!given) return 'blank';
  if (given === expected) return 'correct';
  return (given === 'NOT GIVEN') !== (expected === 'NOT GIVEN') ? 'ng_confusion' : 'wrong';
}

export function gradeReadingGroup(
  group: ReadingGroup,
  answers: ReadingAnswers,
  passage: Pick<ReadingPassage, 'id' | 'part'>,
): ReadingQuestionResult[] {
  const base = (q: ReadingQuestion) => ({ number: q.number, part: passage.part, passageId: passage.id, groupId: group.id, groupType: group.type, question: q });
  const byChoice = (normalize: (s: string | undefined) => string) =>
    group.questions.map((q) => {
      const given = normalize(answers[q.number]);
      const accepted = q.answers.map(normalize);
      return { ...base(q), given, status: (!given ? 'blank' : accepted.includes(given) ? 'correct' : 'wrong') as ReadingAnswerStatus, expected: q.answers[0] };
    });

  switch (group.type) {
    case 'completion':
      if (group.wordBox?.length) return byChoice(letter);
    // falls through: words copied from the passage
    case 'short_answer':
    case 'diagram':
      return group.questions.map((q) => ({
        ...base(q),
        given: answers[q.number] ?? '',
        status: classifyTextAnswer(answers[q.number] ?? '', q.answers, group.wordLimit, group.numberAllowed),
        expected: q.answers[0],
      }));

    case 'mcq':
    case 'matching':
      return byChoice(letter);

    case 'headings':
      return byChoice(headingKey);

    case 'tfng':
      return group.questions.map((q) => {
        const given = normalizeTfng(answers[q.number]);
        const expected = normalizeTfng(q.answers[0]);
        return { ...base(q), given, status: tfngStatus(given, expected), expected };
      });

    case 'mcq_multi': {
      const first = group.questions[0];
      const marks = multiChoiceMarks(answers[first.number], first.answers, group.questions.length);
      return group.questions.map((q, i) => ({ ...base(q), ...marks[i] }));
    }
  }
}

export function gradePassage(passage: ReadingPassage, answers: ReadingAnswers): ReadingQuestionResult[] {
  return passage.groups.flatMap((g) => gradeReadingGroup(g, answers, passage));
}

/** Academic Reading; General Training has its own, stricter table. */
const READING_BAND_TABLE: ReadonlyArray<[number, number]> = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [2, 2],
  [1, 1],
];

/** Raw Academic Reading score out of 40 to band. */
export function rawToBandReading(raw: number): number {
  for (const [min, band] of READING_BAND_TABLE) if (raw >= min) return band;
  return 0;
}

export interface ReadingScore {
  score: number;
  total: number;
  band: number;
  /** True when the test had other than 40 questions: band scaled from the percentage. */
  estimated: boolean;
  byPassage: { part: number; passageId: string; score: number; total: number }[];
  results: ReadingQuestionResult[];
}

export function scorePassages(passages: readonly ReadingPassage[], answers: ReadingAnswers): ReadingScore {
  const byPassage = passages.map((p) => {
    const results = gradePassage(p, answers);
    return { part: p.part, passageId: p.id, results, score: results.filter((r) => r.status === 'correct').length, total: results.length };
  });
  const score = byPassage.reduce((n, p) => n + p.score, 0);
  const total = byPassage.reduce((n, p) => n + p.total, 0);
  const estimated = total !== 40;
  return {
    score,
    total,
    band: rawToBandReading(estimated && total > 0 ? Math.round((score / total) * 40) : score),
    estimated,
    byPassage: byPassage.map(({ results: _r, ...p }) => p),
    results: byPassage.flatMap((p) => p.results),
  };
}

export function passageQuestions(passage: ReadingPassage): ReadingQuestion[] {
  return passage.groups.flatMap((g) => g.questions);
}

// --- Data checks ---------------------------------------------------------------

export { PASSAGE_QUESTIONS };

/** Problems in one passage; empty when it is usable. Same rules as the AI ops. */
export function validatePassage(passage: ReadingPassage): string[] {
  const problems = passageProblems(passage);
  const n = passageQuestions(passage).length;
  if (n < PASSAGE_QUESTIONS.min || n > PASSAGE_QUESTIONS.max) {
    problems.push(`${passage.id}: has ${n} questions (${PASSAGE_QUESTIONS.min}–${PASSAGE_QUESTIONS.max})`);
  }
  return problems;
}

export function validateReadingTest(test: ReadingTest): string[] {
  const problems = test.passages.flatMap(validatePassage);
  if (!test.passages.length) problems.push(`${test.id}: no passages`);
  if (test.kind === 'full') {
    const numbers = test.passages.flatMap((p) => passageQuestions(p).map((q) => q.number));
    if (numbers.length !== 40 || numbers.some((n, i) => n !== i + 1)) problems.push(`${test.id}: questions must run 1–40`);
    if (test.passages.map((p) => p.part).join() !== '1,2,3') problems.push(`${test.id}: passages must be parts 1–3 in order`);
  }
  return problems;
}

// --- Sessions ------------------------------------------------------------------

/** Exam: one 60-minute clock, checked at the end. Practice: a clock per passage and a check per group. */
export type ReadingMode = 'exam' | 'practice';

/** What a Reading attempt keeps in `details`: enough to grade it again and show time per passage. */
export interface ReadingAttemptDetails {
  testId: string;
  passageIds: string[];
  mode: ReadingMode;
  answers: Record<number, string>;
  score: number;
  total: number;
  /** Seconds spent on each passage, by passage id. */
  seconds: Record<string, number>;
}

export function isReadingDetails(d: unknown): d is ReadingAttemptDetails {
  const o = d as Partial<ReadingAttemptDetails> | null | undefined;
  return !!o && typeof o.testId === 'string' && Array.isArray(o.passageIds) && !!o.answers && typeof o.answers === 'object';
}

/** The passages picked from a test, or all of them when none are. */
export function sessionPassages(test: ReadingTest, passageIds: readonly string[]): ReadingPassage[] {
  const picked = test.passages.filter((p) => passageIds.includes(p.id));
  return picked.length ? picked : test.passages;
}

/** Labels for saving an attempt: the full test, or one passage of it. */
export function readingAttemptLabels(test: ReadingTest, passages: readonly ReadingPassage[]) {
  const whole = passages.length === test.passages.length;
  return {
    title: test.title,
    topic: whole || test.kind === 'practice' ? '' : passages.map((p) => p.title).join(', '),
    taskOrPart: whole && test.kind === 'full' ? 'full_test' : `passage_${passages[0].part}`,
  };
}

/** Seconds a passage is meant to take, from its suggested minutes. */
export const passageBudget = (passage: Pick<ReadingPassage, 'suggestedMinutes'>) => passage.suggestedMinutes * 60;

/** Seconds spent past the suggested time; 0 when on time. */
export function overTime(seconds: number, passage: Pick<ReadingPassage, 'suggestedMinutes'>): number {
  return Math.max(0, Math.round(seconds - passageBudget(passage)));
}

/**
 * Question numbers that hold an answer. A choose-two group stores its letters
 * on the first question, so each chosen letter counts for one question.
 */
export function answeredNumbers(passages: readonly ReadingPassage[], answers: ReadingAnswers): Set<number> {
  const out = new Set<number>();
  for (const g of passages.flatMap((p) => p.groups)) {
    if (g.type === 'mcq_multi') {
      const chosen = (answers[g.questions[0].number] ?? '').split(',').filter(Boolean).length;
      g.questions.slice(0, chosen).forEach((q) => out.add(q.number));
    } else for (const q of g.questions) if ((answers[q.number] ?? '').trim()) out.add(q.number);
  }
  return out;
}

// --- Review text -------------------------------------------------------------

/** The line a blank sits in (other blanks as "…"), the paragraph for headings, or the question text. */
export function readingQuestionContext(group: ReadingGroup, q: ReadingQuestion): string {
  if (group.type === 'mcq_multi') return group.prompt;
  if (group.type === 'headings') return `Đoạn ${q.paragraph}`;
  if (group.type !== 'completion' && group.type !== 'diagram') return q.prompt ?? '';
  const tag = `{{${q.number}}}`;
  const lines =
    group.type === 'diagram'
      ? group.diagram.shapes.map((s) => (s.text ?? '').replace(/\n/g, ' '))
      : [...(group.lines ?? []), ...(group.table?.rows.map((r) => r.join(' · ')) ?? [])];
  const line = lines.find((l) => l.includes(tag)) ?? '';
  return line.replace(tag, '_____').replace(/\{\{\d+\}\}/g, '…');
}

/** "B. owned by one family." for a letter, "iv. Heading" for a heading, "Đoạn C"; the text otherwise. */
export function readingAnswerLabel(group: ReadingGroup, q: ReadingQuestion, value: string): string {
  if (!value) return '';
  if (group.type === 'matching' && group.target === 'paragraph') return `Đoạn ${letter(value)}`;
  const options =
    group.type === 'mcq'
      ? q.options
      : group.type === 'matching' || group.type === 'mcq_multi'
        ? group.options
        : group.type === 'headings'
          ? group.headings
          : group.type === 'completion'
            ? group.wordBox
            : undefined;
  if (!options?.length) return value;
  return value
    .split(',')
    .map((k) => {
      const key = k.trim();
      const option = options.find((o) => o.key.toLowerCase() === key.toLowerCase());
      return option ? `${option.key}. ${option.text}` : key;
    })
    .join('; ');
}

// --- Highlights ----------------------------------------------------------------

/** Character ranges [start, end) the learner marked in one paragraph, sorted and apart. */
export type HighlightRange = readonly [number, number];

/** Adds a range, merging it with any it touches or overlaps. */
export function addRange(ranges: readonly HighlightRange[], range: HighlightRange): HighlightRange[] {
  let [start, end] = range[0] <= range[1] ? range : [range[1], range[0]];
  if (start === end) return [...ranges];
  const out: HighlightRange[] = [];
  for (const r of ranges) {
    if (r[1] < start || r[0] > end) out.push(r);
    else {
      start = Math.min(start, r[0]);
      end = Math.max(end, r[1]);
    }
  }
  out.push([start, end]);
  return out.sort((a, b) => a[0] - b[0]);
}

/** Removes the range that holds `offset`. */
export function removeRangeAt(ranges: readonly HighlightRange[], offset: number): HighlightRange[] {
  return ranges.filter((r) => offset < r[0] || offset >= r[1]);
}

/** The paragraph text cut into marked and plain pieces, each with its start offset. */
export function highlightSegments(text: string, ranges: readonly HighlightRange[]): { text: string; start: number; marked: boolean }[] {
  const out: { text: string; start: number; marked: boolean }[] = [];
  let at = 0;
  for (const [s, e] of ranges) {
    const start = Math.max(at, Math.min(s, text.length));
    const end = Math.min(e, text.length);
    if (end <= start) continue;
    if (start > at) out.push({ text: text.slice(at, start), start: at, marked: false });
    out.push({ text: text.slice(start, end), start, marked: true });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), start: at, marked: false });
  return out;
}
