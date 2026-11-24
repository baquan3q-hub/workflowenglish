import { lessons, lessonById, stageLessons, stages } from '../../data/grammar/meta';
import { LEGACY_LESSON } from '../../data/grammar/legacy';
import type { ItemKind, Level, StageId } from '../../data/grammar/types';
import type { GrammarGrade } from '../../supabase/functions/ai-proxy/ops/grammar';

export type Mode = 'learn' | 'review' | 'errors' | 'checkpoint' | 'diagnostic';
export type Result = 'correct' | 'incorrect' | 'pending' | 'finished';

/** One answer (or the end of a session), as stored from version 2 on. */
export interface Attempt {
  version: 2;
  id: string;
  session: string;
  at: string;
  mode: Mode;
  lesson: string;
  itemId: string;
  kind: ItemKind;
  level: Level;
  prompt?: string;
  expected?: string;
  answer: string;
  result: Result;
  assisted: boolean;
  typedFallback: boolean;
  delayedReview?: boolean;
  feedback?: GrammarGrade;
  /** Set on results read from the first version of the module. */
  legacy?: true;
}

/** Shape written by the first version (24 practice skills). */
export interface LegacyEvent {
  version: 1;
  id: string;
  session: string;
  at: string;
  mode: 'lesson' | 'placement' | 'checkpoint' | 'review';
  skill: string;
  item: number;
  kind: 'choice' | 'fill' | 'translate' | 'write' | 'speak';
  prompt?: string;
  expected?: string;
  answer: string;
  result: Result;
  assisted: boolean;
  typedFallback: boolean;
  delayedReview?: boolean;
  feedback?: GrammarGrade;
}

const RESULTS: Result[] = ['correct', 'incorrect', 'pending', 'finished'];
const LEVEL: Record<ItemKind, Level> = { choice: 1, spot: 1, fill: 2, fix: 2, order: 2, translate: 3, write: 4, speak: 5 };
const LEGACY_MODE: Record<LegacyEvent['mode'], Mode> = {
  lesson: 'learn',
  placement: 'diagnostic',
  checkpoint: 'checkpoint',
  review: 'review',
};

/** Accepts stored data of either version and returns the version-2 view, or null if unusable. */
export function toAttempt(raw: unknown): Attempt | null {
  type Shared = 'version' | 'kind' | 'mode';
  const e = raw as
    | (Partial<Omit<Attempt, Shared>> & Partial<Omit<LegacyEvent, Shared>> & { version?: number; kind?: string; mode?: string })
    | null;
  if (!e || typeof e !== 'object' || typeof e.id !== 'string' || typeof e.session !== 'string') return null;
  if (typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at))) return null;
  if (!RESULTS.includes(e.result as Result)) return null;
  if (e.version === 2) {
    if (typeof e.lesson !== 'string' || !lessonById.has(e.lesson) || typeof e.itemId !== 'string') return null;
    if (!(e.kind as ItemKind) || !(e.kind! in LEVEL)) return null;
    return e as unknown as Attempt;
  }
  if (e.version === 1 && typeof e.skill === 'string' && LEGACY_LESSON[e.skill]) {
    const kind = (e.kind && e.kind in LEVEL ? e.kind : 'fill') as ItemKind;
    return {
      version: 2,
      id: e.id,
      session: e.session,
      at: e.at,
      mode: LEGACY_MODE[e.mode as LegacyEvent['mode']] ?? 'learn',
      lesson: LEGACY_LESSON[e.skill],
      itemId: e.result === 'finished' ? '' : 'v1:' + e.skill + '#' + e.item,
      kind,
      level: LEVEL[kind],
      prompt: e.prompt,
      expected: e.expected,
      answer: e.answer ?? '',
      result: e.result as Result,
      assisted: !!e.assisted,
      typedFallback: !!e.typedFallback,
      delayedReview: e.delayedReview,
      feedback: e.feedback,
      legacy: true,
    };
  }
  return null;
}

export const isGraded = (a: Attempt) => a.result === 'correct' || a.result === 'incorrect';
export const chronological = (a: Attempt, b: Attempt) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id);
const DAY = 86400000;
export const REVIEW_DAYS = [1, 3, 7, 21];

export type Status = 'new' | 'learning' | 'understood' | 'applied' | 'solid';
export const STATUS_LABEL: Record<Status | 'known', string> = {
  new: 'Chưa học',
  learning: 'Đang học',
  understood: 'Đã hiểu',
  applied: 'Vận dụng được',
  solid: 'Vững',
  known: 'Đã biết qua chẩn đoán',
};
const RANK: Record<Status, number> = { new: 0, learning: 1, understood: 2, applied: 3, solid: 4 };
export const atLeast = (status: Status, min: Status) => RANK[status] >= RANK[min];

export interface LessonStats {
  status: Status;
  studied: boolean;
  graded: Attempt[];
  /** First attempt at each item in each session: retries in the same session are practice, not evidence. */
  fresh: Attempt[];
  recognition: number | null;
  due: number;
  weak: boolean;
  strong: boolean;
  /** Wrong answers not later answered correctly. */
  openErrors: Attempt[];
}

/** Lesson progress from attempts. `passedOldQuiz` carries the first version's library ticks. */
export function lessonStats(all: Attempt[], lesson: string, passedOldQuiz = false): LessonStats {
  const history = all.filter((a) => a.lesson === lesson).sort(chronological);
  const graded = history.filter(isGraded);
  const seen = new Set<string>();
  const fresh: Attempt[] = [];
  for (const a of graded) {
    const key = a.session + '/' + a.itemId;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(a);
  }
  const independent = (a: Attempt) => a.result === 'correct' && !a.assisted;
  const recent = fresh.filter((a) => a.level <= 2).slice(-6);
  const recognition = recent.length ? recent.filter(independent).length / recent.length : null;
  const studied = history.some((a) => a.result === 'finished' && a.mode === 'learn');
  const understood = passedOldQuiz || (recent.length >= 4 && (recognition ?? 0) >= 0.8);
  const lastError = graded.map((a) => a.result).lastIndexOf('incorrect');
  const appliedOk = fresh.some((a) => a.level >= 3 && independent(a));
  const goodReviews = new Set(
    graded
      .slice(lastError + 1)
      .filter((a) => a.mode === 'review' && a.delayedReview && independent(a))
      .map((a) => a.session)
  ).size;
  const last2 = graded.slice(-2);
  const last3 = graded.slice(-3);
  const weak = last2.length === 2 && last2.every((a) => a.result === 'incorrect');
  const strong = last3.length === 3 && last3.every(independent);
  let status: Status = 'new';
  if (graded.length || studied) status = 'learning';
  if (understood) status = 'understood';
  if (understood && appliedOk && !weak) status = 'applied';
  if (status === 'applied' && goodReviews > 0) status = 'solid';
  const last = graded.at(-1);
  const due =
    last && (studied || last.result === 'incorrect')
      ? Date.parse(last.at) + REVIEW_DAYS[Math.min(3, goodReviews)] * DAY
      : Infinity;
  const openErrors = graded.filter(
    (a) =>
      a.result === 'incorrect' &&
      !graded.some((b) => b.itemId === a.itemId && b.result === 'correct' && chronological(b, a) > 0)
  );
  return { status, studied, graded, fresh, recognition, due, weak, strong, openErrors };
}

export interface Placement {
  at: string;
  /** Stage where learning should start. */
  stage: StageId;
  /** Lessons the learner can skip: answered correctly, or in a stage passed in full. */
  known: string[];
  passedStages: StageId[];
}

/** Result of the latest finished placement test (either version). */
export function placementOf(all: Attempt[]): Placement | null {
  const done = all
    .filter((a) => a.mode === 'diagnostic' && a.result === 'finished')
    .sort(chronological)
    .at(-1);
  if (!done) return null;
  const tested = all.filter((a) => a.session === done.session && a.result !== 'finished');
  const stageOf = (a: Attempt) => lessonById.get(a.lesson)!.stage;
  const wrong = tested.filter((a) => a.result !== 'correct');
  const stage = (
    wrong.length
      ? Math.min(...wrong.map(stageOf))
      : Math.min(6, Math.max(-1, ...tested.map(stageOf)) + 1)
  ) as StageId;
  const passedStages = stages.map((s) => s.id).filter((id) => id < stage);
  const known = new Set([
    ...tested.filter((a) => a.result === 'correct').map((a) => a.lesson),
    ...passedStages.flatMap((id) => stageLessons(id).map((l) => l.id)),
  ]);
  return { at: done.at, stage, known: [...known], passedStages };
}

export interface Recommendation {
  lesson: string;
  mode: Mode;
  reason: string;
}

export interface Snapshot {
  stats: Map<string, LessonStats>;
  placement: Placement | null;
  known: Set<string>;
}

export function snapshot(all: Attempt[], oldQuiz: Set<string> = new Set()): Snapshot {
  const stats = new Map(lessons.map((l) => [l.id, lessonStats(all, l.id, oldQuiz.has(l.id))]));
  const placement = placementOf(all);
  return { stats, placement, known: new Set(placement?.known ?? []) };
}

/** Lesson is behind the learner: studied, understood, or skipped by placement. */
export const isDone = (snap: Snapshot, id: string) => {
  const s = snap.stats.get(id)!;
  return s.studied || atLeast(s.status, 'understood') || snap.known.has(id);
};

/** First roadmap lesson that is not done, from the placement start. */
export function nextInPath(snap: Snapshot) {
  const start = snap.placement ? lessons.findIndex((l) => l.stage === snap.placement!.stage) : 0;
  const ahead = lessons.slice(Math.max(0, start)).find((l) => !isDone(snap, l.id));
  return ahead ?? lessons.find((l) => !isDone(snap, l.id));
}

/** Due reviews first, then repeated errors, then the lesson in progress, then the next lesson. */
export function recommend(snap: Snapshot, current?: string, now = Date.now()): Recommendation {
  const due = lessons
    .map((l) => ({ id: l.id, due: snap.stats.get(l.id)!.due }))
    .filter((d) => d.due <= now)
    .sort((a, b) => a.due - b.due)[0];
  if (due) return { lesson: due.id, mode: 'review', reason: 'Đến hạn ôn: làm lại cấu trúc này trong ngữ cảnh mới để nhớ lâu.' };
  const weak = lessons.find((l) => snap.stats.get(l.id)!.weak);
  if (weak) return { lesson: weak.id, mode: 'errors', reason: 'Bạn vừa sai hai lần liên tiếp ở bài này. Sửa ngay khi còn nhớ.' };
  if (current && lessonById.has(current) && !isDone(snap, current))
    return { lesson: current, mode: 'learn', reason: 'Bạn đang học dở bài này.' };
  const next = nextInPath(snap);
  if (next)
    return {
      lesson: next.id,
      mode: 'learn',
      reason:
        snap.placement && next.stage === snap.placement.stage && !lessons.some((l) => snap.stats.get(l.id)!.studied)
          ? 'Bài đầu tiên theo kết quả chẩn đoán của bạn.'
          : 'Bài tiếp theo trong lộ trình.',
    };
  return { lesson: lessons.at(-1)!.id, mode: 'checkpoint', reason: 'Bạn đã đi hết lộ trình. Làm bài kiểm tra chặng để giữ kiến thức.' };
}

/** Headline numbers for the progress card. */
export function summary(all: Attempt[], snap: Snapshot) {
  const graded = all.filter(isGraded);
  const own = graded.filter((a) => !a.assisted);
  const delayed = own.filter((a) => a.mode === 'review' && a.delayedReview);
  const rate = (list: Attempt[]) =>
    list.length ? Math.round((100 * list.filter((a) => a.result === 'correct').length) / list.length) : null;
  const statuses = [...snap.stats.values()].map((s) => s.status);
  return {
    studied: [...snap.stats.values()].filter((s) => s.status !== 'new').length,
    applied: statuses.filter((s) => atLeast(s, 'applied')).length,
    solid: statuses.filter((s) => s === 'solid').length,
    independentRate: rate(own),
    delayedRate: rate(delayed),
    total: lessons.length,
  };
}
