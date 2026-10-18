/**
 * "Luyện theo dạng": practise one question type across every bundled test.
 *
 * A drill is a one-passage test holding only the groups of that type, so the
 * normal practice and result screens run it unchanged. Its id encodes the
 * source (`drill:<kind>:<testId>:<passageId>`) and is resolved back on load.
 * Groups the learner got wrong last time come first, then untried ones.
 *
 * Drill results stay on this device and are not saved as attempts, so they
 * do not pull band statistics around; saved full and passage attempts count
 * towards the order too.
 */
import type { IeltsAttempt } from '../types';
import type { ReadingAnswers, ReadingPassage, ReadingTest } from '../data/ielts/reading/types';
import type { ReadingKind } from '../data/ielts/readingLessons';
import { readingGroupKind } from '../components/ielts/questions/questionLogic';
import { gradeReadingGroup, isReadingDetails, passageQuestions, sessionPassages } from './readingLogic';

/** Chip order in the hub: the types learners lose most marks on come first. */
export const DRILL_KINDS: readonly ReadingKind[] = [
  'tfng',
  'ynng',
  'headings',
  'matching_paragraph',
  'matching_feature',
  'matching_ending',
  'mcq',
  'mcq_multi',
  'completion',
  'summary_box',
  'flowchart',
  'diagram',
  'short_answer',
];

const PREFIX = 'drill:';

export interface DrillSource {
  kind: ReadingKind;
  testId: string;
  passageId: string;
}

export const drillTestId = ({ kind, testId, passageId }: DrillSource) => `${PREFIX}${kind}:${testId}:${passageId}`;

export const isDrillTestId = (id: string) => id.startsWith(PREFIX);

export function parseDrillTestId(id: string): DrillSource | null {
  if (!isDrillTestId(id)) return null;
  const parts = id.slice(PREFIX.length).split(':');
  if (parts.length < 3) return null;
  const kind = parts[0] as ReadingKind;
  if (!DRILL_KINDS.includes(kind)) return null;
  return { kind, testId: parts.slice(1, -1).join(':'), passageId: parts[parts.length - 1] };
}

const groupsOfKind = (passage: ReadingPassage, kind: ReadingKind) => passage.groups.filter((g) => readingGroupKind(g) === kind);

/**
 * The drill test for one passage: its groups of `kind` only, with the
 * suggested time cut to their share of the passage's questions.
 */
export function buildDrill(test: ReadingTest, passage: ReadingPassage, kind: ReadingKind): ReadingTest | null {
  const groups = groupsOfKind(passage, kind);
  if (!groups.length) return null;
  const share = groups.reduce((n, g) => n + g.questions.length, 0) / Math.max(1, passageQuestions(passage).length);
  return {
    id: drillTestId({ kind, testId: test.id, passageId: passage.id }),
    title: test.passages.length > 1 ? `${test.title} · Passage ${passage.part}` : test.title,
    kind: 'practice',
    descriptionVi: test.descriptionVi,
    passages: [{ ...passage, groups, suggestedMinutes: Math.max(3, Math.round(passage.suggestedMinutes * share)) }],
  };
}

/** A bundled test by id, or the drill built from one. */
export function resolveReadingTest(id: string, getTest: (id: string) => ReadingTest | undefined): ReadingTest | undefined {
  const src = parseDrillTestId(id);
  if (!src) return isDrillTestId(id) ? undefined : getTest(id);
  const test = getTest(src.testId);
  const passage = test?.passages.find((p) => p.id === src.passageId);
  return (test && passage && buildDrill(test, passage, src.kind)) || undefined;
}

// --- What the learner did before ------------------------------------------

/** One group's outcome in an attempt or a drill. */
export interface GroupRecord {
  testId: string;
  passageId: string;
  groupId: string;
  correct: number;
  total: number;
  at: string;
}

/** Group outcomes of answered passages; `testId` is the bundled test, also for drills. */
export function groupRecords(testId: string, passages: readonly ReadingPassage[], answers: ReadingAnswers, at: string): GroupRecord[] {
  return passages.flatMap((p) =>
    p.groups.map((g) => {
      const results = gradeReadingGroup(g, answers, p);
      return { testId, passageId: p.id, groupId: g.id, correct: results.filter((r) => r.status === 'correct').length, total: results.length, at };
    }),
  );
}

/** Group outcomes of saved Reading attempts, graded again from their answers. */
export function attemptRecords(attempts: readonly IeltsAttempt[], getTest: (id: string) => ReadingTest | undefined): GroupRecord[] {
  return attempts.flatMap((a) => {
    const d = a.details;
    if (a.skill !== 'reading' || !isReadingDetails(d)) return [];
    const src = parseDrillTestId(d.testId);
    const test = resolveReadingTest(d.testId, getTest);
    if (!test) return [];
    return groupRecords(src?.testId ?? test.id, sessionPassages(test, d.passageIds), d.answers, a.createdAt);
  });
}

// --- Choosing what to practise --------------------------------------------

export type DrillStatus = 'wrong' | 'new' | 'done';

export interface DrillCandidate extends DrillSource {
  id: string;
  title: string;
  passageTitle: string;
  part: number;
  questions: number;
  status: DrillStatus;
  /** From the latest outcome of each group, when there is one. */
  correct: number;
  total: number;
  at?: string;
}

const STATUS_RANK: Record<DrillStatus, number> = { wrong: 0, new: 1, done: 2 };

/**
 * Every passage that has groups of `kind`, wrong-last-time first (lowest
 * score, then most recent), then never tried, then all correct (oldest first,
 * so they come round again).
 */
export function drillCandidates(kind: ReadingKind, tests: readonly ReadingTest[], records: readonly GroupRecord[]): DrillCandidate[] {
  const latest = new Map<string, GroupRecord>();
  for (const r of records) {
    const key = `${r.testId}|${r.passageId}|${r.groupId}`;
    const prev = latest.get(key);
    if (!prev || r.at > prev.at) latest.set(key, r);
  }

  const out: DrillCandidate[] = [];
  for (const test of tests)
    for (const passage of test.passages) {
      const groups = groupsOfKind(passage, kind);
      if (!groups.length) continue;
      const seen = groups.map((g) => latest.get(`${test.id}|${passage.id}|${g.id}`)).filter((r): r is GroupRecord => !!r);
      const correct = seen.reduce((n, r) => n + r.correct, 0);
      const total = seen.reduce((n, r) => n + r.total, 0);
      const status: DrillStatus = correct < total ? 'wrong' : seen.length < groups.length ? 'new' : 'done';
      out.push({
        kind,
        testId: test.id,
        passageId: passage.id,
        id: drillTestId({ kind, testId: test.id, passageId: passage.id }),
        title: test.title,
        passageTitle: passage.title,
        part: passage.part,
        questions: groups.reduce((n, g) => n + g.questions.length, 0),
        status,
        correct,
        total,
        at: seen.reduce<string | undefined>((m, r) => (!m || r.at > m ? r.at : m), undefined),
      });
    }

  const order = new Map(out.map((c, i) => [c.id, i]));
  return out.sort((a, b) => {
    if (a.status !== b.status) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (a.status === 'wrong') return a.correct / a.total - b.correct / b.total || (b.at ?? '').localeCompare(a.at ?? '');
    if (a.status === 'done') return (a.at ?? '').localeCompare(b.at ?? '');
    return order.get(a.id)! - order.get(b.id)!;
  });
}

/** Questions of each kind across the tests; kinds with none are left out. */
export function drillKindCounts(tests: readonly ReadingTest[]): Map<ReadingKind, number> {
  const counts = new Map<ReadingKind, number>();
  for (const t of tests)
    for (const p of t.passages)
      for (const g of p.groups) {
        const k = readingGroupKind(g) as ReadingKind;
        counts.set(k, (counts.get(k) ?? 0) + g.questions.length);
      }
  return new Map(DRILL_KINDS.filter((k) => counts.has(k)).map((k) => [k, counts.get(k)!]));
}

// --- Drill log on this device ---------------------------------------------

const LOG_LIMIT = 300;
const logKey = (userId: string) => `ielts-reading-drill-log:${userId || 'guest'}`;

export function loadDrillLog(userId: string): GroupRecord[] {
  try {
    const raw = localStorage.getItem(logKey(userId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((r): r is GroupRecord => !!r && typeof r.groupId === 'string' && typeof r.at === 'string') : [];
  } catch {
    return [];
  }
}

export function appendDrillLog(userId: string, records: readonly GroupRecord[]): void {
  try {
    localStorage.setItem(logKey(userId), JSON.stringify([...loadDrillLog(userId), ...records].slice(-LOG_LIMIT)));
  } catch {
    /* private mode: the order just ignores this drill */
  }
}
