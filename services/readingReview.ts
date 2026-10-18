/**
 * Reading review and diagnosis (pure): where the evidence and the distractor
 * sit in the passage, accuracy by question type and by skill, the TRUE/FALSE
 * verdict in plain words, and the Reading mistakes kept in the error log.
 */
import type { IeltsAttempt } from '../types';
import type { ReadingGroup, ReadingPassage, ReadingQuestion, ReadingSkill, ReadingTest } from '../data/ielts/reading/types';
import { errorTrend, EXAMPLE_LIMIT, type ErrorTrend } from './ieltsErrorLogic';
import {
  isReadingDetails,
  normalizeTfng,
  readingAnswerLabel,
  readingQuestionContext,
  scorePassages,
  sessionPassages,
  type HighlightRange,
  type ReadingQuestionResult,
} from './readingLogic';

export const READING_SKILL_LABELS: Record<ReadingSkill, string> = {
  scan: 'Scan tìm chi tiết',
  skim: 'Skim đọc lướt',
  detail: 'Đọc hiểu chi tiết',
  inference: 'Suy luận',
  main_idea: 'Ý chính',
};

// ─── Evidence in the passage ────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Where a phrase sits in a text, ignoring case, spacing and the kind of quote marks. */
export function findPhrase(text: string, phrase: string): HighlightRange | null {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const pattern = words.map((w) => escapeRe(w).replace(/['‘’]/g, "['‘’]").replace(/["“”]/g, '["“”]')).join('\\s+');
  const m = new RegExp(pattern, 'i').exec(text);
  return m ? [m.index, m.index + m[0].length] : null;
}

export type MarkKind = 'evidence' | 'distractor';

export interface ReviewMark {
  start: number;
  end: number;
  kind: MarkKind;
}

/**
 * Marks for one question, by paragraph label. The evidence is looked for in
 * its own paragraph first, the distractor in that paragraph and then in the
 * others, since a trap often sits nearby.
 */
export function reviewMarks(passage: Pick<ReadingPassage, 'paragraphs'>, q: Pick<ReadingQuestion, 'paragraph' | 'evidence' | 'distractor'>) {
  const order = [...passage.paragraphs].sort((a, b) => Number(b.label === q.paragraph) - Number(a.label === q.paragraph));
  const out: Record<string, ReviewMark[]> = {};
  const place = (phrase: string | undefined, kind: MarkKind) => {
    if (!phrase?.trim()) return;
    for (const p of order) {
      const r = findPhrase(p.text, phrase);
      if (!r) continue;
      (out[p.label] ??= []).push({ start: r[0], end: r[1], kind });
      return;
    }
  };
  place(q.evidence, 'evidence');
  place(q.distractor, 'distractor');
  return out;
}

/** A paragraph cut into plain and marked runs; an overlapping later mark is trimmed, evidence wins. */
export function markSegments(text: string, marks: readonly ReviewMark[]): { text: string; start: number; kind: MarkKind | null }[] {
  const sorted = [...marks].sort((a, b) => a.start - b.start || (a.kind === 'evidence' ? -1 : 1));
  const out: { text: string; start: number; kind: MarkKind | null }[] = [];
  let at = 0;
  for (const m of sorted) {
    const start = Math.max(at, Math.min(m.start, text.length));
    const end = Math.min(m.end, text.length);
    if (end <= start) continue;
    if (start > at) out.push({ text: text.slice(at, start), start: at, kind: null });
    out.push({ text: text.slice(start, end), start, kind: m.kind });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), start: at, kind: null });
  return out;
}

// ─── TRUE / FALSE / NOT GIVEN in plain words ────────────────────────

export type TfngVerdict = 'match' | 'contradict' | 'absent';

export const TFNG_VERDICT_LABELS: Record<TfngVerdict, string> = {
  match: 'Khớp',
  contradict: 'Mâu thuẫn',
  absent: 'Không nhắc tới',
};

/** What an answer says about the passage: it agrees, it says the opposite, or it says nothing. */
export function tfngVerdict(answer: string): TfngVerdict | null {
  switch (normalizeTfng(answer)) {
    case 'TRUE':
    case 'YES':
      return 'match';
    case 'FALSE':
    case 'NO':
      return 'contradict';
    case 'NOT GIVEN':
      return 'absent';
    default:
      return null;
  }
}

// ─── Accuracy breakdown ─────────────────────────────────────────────

export interface AccuracyRow<K extends string> {
  key: K;
  correct: number;
  total: number;
}

/** Correct answers per key, weakest first (then the larger group, then first seen). */
export function accuracyBy<K extends string>(results: readonly ReadingQuestionResult[], keyOf: (r: ReadingQuestionResult) => K): AccuracyRow<K>[] {
  const rows = new Map<K, AccuracyRow<K>>();
  for (const r of results) {
    const key = keyOf(r);
    const row = rows.get(key) ?? { key, correct: 0, total: 0 };
    row.total += 1;
    if (r.status === 'correct') row.correct += 1;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((row, i) => ({ row, i }))
    .sort((a, b) => a.row.correct / a.row.total - b.row.correct / b.row.total || b.row.total - a.row.total || a.i - b.i)
    .map(({ row }) => row);
}

// ─── Reading mistakes for the error log ─────────────────────────────

export type ReadingErrorKind = 'ng_confusion' | 'heading' | 'spelling' | 'over_limit';

export interface ReadingErrorInfo {
  label: string;
  hintVi: string;
  lessonId: string;
}

export const READING_LESSON_IDS = { tfng: 'rd_tfng', headings: 'rd_headings', completion: 'rd_completion' } as const;

export const READING_ERROR_KINDS: Record<ReadingErrorKind, ReadingErrorInfo> = {
  ng_confusion: {
    label: 'Nhầm NOT GIVEN',
    hintVi: 'Lẫn "bài không nói tới" với "bài nói ngược lại". Tìm câu nói đúng về ý đó trước khi chọn FALSE/NO.',
    lessonId: READING_LESSON_IDS.tfng,
  },
  heading: {
    label: 'Sai heading',
    hintVi: 'Chọn heading vì trùng từ khoá thay vì ý chính của cả đoạn. Đọc câu chủ đề và câu cuối đoạn.',
    lessonId: READING_LESSON_IDS.headings,
  },
  spelling: {
    label: 'Chính tả, số nhiều',
    hintVi: 'Chép gần đúng từ trong bài. Bài thi tính sai cả lỗi một chữ cái hay thiếu -s.',
    lessonId: READING_LESSON_IDS.completion,
  },
  over_limit: {
    label: 'Vượt giới hạn từ',
    hintVi: 'Đáp án dài hơn số từ đề cho. Bỏ mạo từ và từ thừa, chỉ giữ cụm danh từ cần điền.',
    lessonId: READING_LESSON_IDS.completion,
  },
};

const KIND_ORDER: ReadingErrorKind[] = ['ng_confusion', 'heading', 'spelling', 'over_limit'];

/** The error-log kind of a graded answer, or null when it is right, blank or a plain miss. */
export function readingErrorKind(r: Pick<ReadingQuestionResult, 'status' | 'groupType'>): ReadingErrorKind | null {
  switch (r.status) {
    case 'ng_confusion':
      return 'ng_confusion';
    case 'spelling':
    case 'plural':
      return 'spelling';
    case 'over_limit':
      return 'over_limit';
    case 'wrong':
      return r.groupType === 'headings' ? 'heading' : null;
    default:
      return null;
  }
}

export interface ReadingLoggedError {
  kind: ReadingErrorKind;
  number: number;
  testId: string;
  testTitle: string;
  context: string;
  given: string;
  expected: string;
  createdAt?: string;
  /** Position of the attempt among the Reading ones, newest = 0. */
  attemptIndex: number;
}

export interface ReadingErrorSummary {
  kind: ReadingErrorKind;
  info: ReadingErrorInfo;
  total: number;
  perAttempt: number;
  trend: ErrorTrend | null;
  /** Newest first, one per question. */
  examples: ReadingLoggedError[];
}

export interface ReadingErrorLog {
  attempts: number;
  total: number;
  kinds: ReadingErrorSummary[];
}

/** Saved Reading attempts that can be graded again, newest first. */
function readingAttempts(attempts: ReadonlyArray<IeltsAttempt>, getTest: (id: string) => ReadingTest | undefined) {
  return attempts
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.skill === 'reading' && isReadingDetails(a.details) && getTest(a.details.testId))
    .sort((x, y) => (y.a.createdAt ?? '').localeCompare(x.a.createdAt ?? '') || x.i - y.i)
    .map(({ a }) => a);
}

/** Grades the saved answers again and groups the Reading mistakes, most frequent first. */
export function summarizeReadingErrors(attempts: ReadonlyArray<IeltsAttempt>, getTest: (id: string) => ReadingTest | undefined): ReadingErrorLog {
  const list = readingAttempts(attempts, getTest);
  const errors: ReadingLoggedError[] = list.flatMap((a, attemptIndex) => {
    if (!isReadingDetails(a.details)) return [];
    const test = getTest(a.details.testId)!;
    const passages = sessionPassages(test, a.details.passageIds);
    const groups = new Map<string, ReadingGroup>(passages.flatMap((p) => p.groups.map((g) => [g.id, g] as const)));
    return scorePassages(passages, a.details.answers).results.flatMap((r) => {
      const kind = readingErrorKind(r);
      const g = groups.get(r.groupId);
      if (!kind || !g) return [];
      return [
        {
          kind,
          number: r.number,
          testId: test.id,
          testTitle: test.title,
          context: readingQuestionContext(g, r.question),
          given: readingAnswerLabel(g, r.question, r.given),
          expected: readingAnswerLabel(g, r.question, r.expected),
          createdAt: a.createdAt,
          attemptIndex,
        },
      ];
    });
  });

  const kinds = KIND_ORDER.map((kind): ReadingErrorSummary | null => {
    const mine = errors.filter((e) => e.kind === kind);
    if (!mine.length) return null;
    return {
      kind,
      info: READING_ERROR_KINDS[kind],
      total: mine.length,
      perAttempt: Math.round((mine.length / list.length) * 10) / 10,
      trend: errorTrend(
        mine.map((e) => e.attemptIndex),
        list.length,
      ),
      examples: mine.filter((e, i) => mine.findIndex((x) => x.testId === e.testId && x.number === e.number) === i).slice(0, EXAMPLE_LIMIT),
    };
  })
    .filter((s): s is ReadingErrorSummary => s !== null)
    .sort((a, b) => b.total - a.total || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

  return { attempts: list.length, total: errors.length, kinds };
}
