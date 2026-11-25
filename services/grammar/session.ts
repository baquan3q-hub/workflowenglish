import { lessons, stageLessons } from '../../data/grammar/meta';
import type { Item, Lesson, StageId } from '../../data/grammar/types';
import { isOpen } from './grade';
import { chronological, type Attempt, type LessonStats, type Mode } from './progress';

export interface Task {
  lesson: string;
  itemId: string;
}
export interface Session {
  version: 2;
  id: string;
  mode: Mode;
  /** Lesson the session is about; for checkpoints, the stage's first lesson. */
  lesson: string;
  stage?: StageId;
  tasks: Task[];
  index: number;
  answer: string;
  hinted: boolean;
  spoken: boolean;
  /** Attempt shown as feedback for the current task. */
  lastId?: string;
  delayedReview?: boolean;
  /** An easier item was inserted after two misses: show the worked example. */
  scaffold?: boolean;
  /** Saved chunk indices for `order` items so pausing/reloading keeps progress. */
  orderPicked?: number[];
  /** AI-generated drills created for this session only. */
  extraItems?: Record<string, Item>;
}

/** Two lessons per stage that represent it well in the placement test. */
export const PLACEMENT: Record<StageId, [string, string]> = {
  0: ['be', 'articles'],
  1: ['do-question', 'present-contrast'],
  2: ['past-simple', 'future'],
  3: ['perfect-contrast', 'past-perfect'],
  4: ['passive', 'relative'],
  5: ['advanced-conditions', 'relative-plus'],
  6: ['inversion', 'participle'],
};

export const MIN_SESSION_QUESTIONS = 2;
export const MAX_SESSION_QUESTIONS = 10;
export const DEFAULT_QUESTION_COUNT = 6;

export const clampQuestionCount = (n?: number, fallback = DEFAULT_QUESTION_COUNT) =>
  Math.min(MAX_SESSION_QUESTIONS, Math.max(1, Math.round(typeof n === 'number' && Number.isFinite(n) ? n : fallback)));

const uses = (attempts: Attempt[], itemId: string) => attempts.filter((a) => a.itemId === itemId).length;
const leastUsed = (items: Item[], attempts: Attempt[]) =>
  items
    .map((item, order) => ({ item, order, n: uses(attempts, item.id) }))
    .sort((a, b) => a.n - b.n || a.order - b.order)
    .map((x) => x.item);

function base(mode: Mode, lesson: string, tasks: Task[], extra: Partial<Session> = {}): Session {
  return {
    version: 2,
    id: crypto.randomUUID(),
    mode,
    lesson,
    tasks,
    index: 0,
    answer: '',
    hinted: false,
    spoken: false,
    ...extra,
  };
}
const task = (lesson: string) => (item: Item): Task => ({ lesson, itemId: item.id });

/** Recognition → controlled practice → translate → write → speak. Shorter when time is short, or capped to learner choice (max 10). */
export function learnSession(lesson: Lesson, attempts: Attempt[], minutes: number, stats?: LessonStats, limit?: number) {
  const practice = lesson.items.filter((i) => !i.review);
  const pick = (level: number) => leastUsed(practice.filter((i) => i.level === level), attempts);
  if (limit != null) {
    const cap = clampQuestionCount(limit);
    const n1 = Math.max(1, Math.round(cap * (stats?.strong || stats?.status === 'understood' ? 0.2 : 0.3)));
    const nOpen = cap >= 6 ? Math.min(3, Math.max(2, Math.round(cap * 0.28))) : cap >= 4 ? 1 : 0;
    const n2 = Math.max(1, cap - n1 - nOpen);
    const chosen = [
      ...pick(1).slice(0, n1),
      ...pick(2).slice(0, n2),
      ...[3, 4, 5].flatMap((lv) => pick(lv).slice(0, 1)).slice(0, nOpen),
    ];
    const seen = new Set(chosen.map((i) => i.id));
    if (chosen.length < cap) {
      const rest = leastUsed(practice.filter((i) => !seen.has(i.id)), attempts);
      chosen.push(...rest.slice(0, cap - chosen.length));
    }
    const ordered = chosen.slice(0, cap).sort((a, b) => a.level - b.level);
    return base('learn', lesson.id, ordered.map(task(lesson.id)));
  }
  const short = minutes <= 10;
  const long = minutes > 20;
  const n1 = stats?.strong || stats?.status === 'understood' ? 1 : short ? 2 : long ? 4 : 3;
  const n2 = short ? 3 : long ? 5 : 4;
  const open = [3, 4, 5].filter((lv) => !short || lv < 5).flatMap((lv) => pick(lv).slice(0, 1));
  const items = [...pick(1).slice(0, n1), ...pick(2).slice(0, n2), ...open];
  return base('learn', lesson.id, items.map(task(lesson.id)));
}

/** Held-back review items, earlier misses, saved AI items, then one open answer in a new context. */
export function reviewSession(
  lesson: Lesson,
  attempts: Attempt[],
  stats: LessonStats,
  now = Date.now(),
  limit?: number,
  extraBank: Item[] = []
) {
  const cap = limit != null ? clampQuestionCount(limit) : 5;
  const review = leastUsed(lesson.items.filter((i) => i.review), attempts);
  const byExtra = new Map(extraBank.map((i) => [i.id, i]));
  const missed = stats.openErrors
    .map((a) => lesson.items.find((i) => i.id === a.itemId && !isOpen(i)) ?? byExtra.get(a.itemId))
    .filter((i): i is Item => !!i);
  const aiFresh = leastUsed(extraBank, attempts);
  const open = leastUsed(lesson.items.filter((i) => i.kind === 'write' || i.kind === 'translate'), attempts);
  const items = unique([...review.slice(0, 2), ...missed.slice(0, 2), ...aiFresh.slice(0, 3), ...open.slice(0, 2)]);
  if (items.length < cap) {
    const seen = new Set(items.map((i) => i.id));
    items.push(...leastUsed(lesson.items.filter((i) => !seen.has(i.id)), attempts).slice(0, cap - items.length));
  }
  const picked = items.slice(0, cap);
  const extraItems = Object.fromEntries(picked.filter((i) => byExtra.has(i.id)).map((i) => [i.id, i]));
  return base('review', lesson.id, picked.map(task(lesson.id)), {
    delayedReview: stats.due <= now,
    ...(Object.keys(extraItems).length ? { extraItems } : {}),
  });
}

/** The items answered wrongly (including saved AI items), then fresh items at the same level. */
export function errorSession(
  lessonsById: Map<string, Lesson>,
  errors: Attempt[],
  attempts: Attempt[],
  focus?: string,
  limit?: number,
  extraBank?: Map<string, Item>
) {
  const cap = limit != null ? clampQuestionCount(limit) : 6;
  const list = [...errors].sort(chronological).reverse();
  const tasks: Task[] = [];
  const extraItems: Record<string, Item> = {};
  for (const a of list) {
    const staticItem = lessonsById.get(a.lesson)?.items.find((i) => i.id === a.itemId);
    const savedAi = extraBank?.get(a.itemId);
    const item = staticItem ?? savedAi;
    if (item && !tasks.some((t) => t.itemId === item.id)) {
      tasks.push({ lesson: a.lesson, itemId: item.id });
      if (savedAi && !staticItem) extraItems[item.id] = savedAi;
    }
    if (tasks.length >= cap) break;
  }
  const target = focus ?? list[0]?.lesson;
  const lesson = target ? lessonsById.get(target) : undefined;
  if (lesson && tasks.length < cap) {
    const extra = leastUsed(
      lesson.items.filter((i) => i.level === 2 && !tasks.some((t) => t.itemId === i.id)),
      attempts
    ).slice(0, cap - tasks.length);
    tasks.push(...extra.map(task(lesson.id)));
  }
  return base('errors', target ?? lessons[0].id, tasks, Object.keys(extraItems).length ? { extraItems } : {});
}

/** One placement item from every lesson in the stage, then a short written task. */
export function checkpointSession(stage: StageId, lessonsById: Map<string, Lesson>) {
  const inStage = stageLessons(stage).map((m) => lessonsById.get(m.id)).filter((l): l is Lesson => !!l);
  const tasks = inStage.flatMap((l) => l.items.filter((i) => i.diag).slice(0, 1).map(task(l.id)));
  const last = inStage.at(-1);
  const write = last?.items.find((i) => i.kind === 'write');
  if (last && write) tasks.push(task(last.id)(write));
  return base('checkpoint', inStage[0]?.id ?? lessons[0].id, tasks, { stage });
}

/** Two items per stage, easiest stage first. The session stops at the first stage with a miss. */
export function placementSession(lessonsById: Map<string, Lesson>) {
  const tasks = (Object.keys(PLACEMENT) as unknown as StageId[]).flatMap((stage) =>
    PLACEMENT[stage].map((id) => {
      const lesson = lessonsById.get(id)!;
      const item = lesson.items.find((i) => i.diag) ?? lesson.items[0];
      return { lesson: id, itemId: item.id };
    })
  );
  return base('diagnostic', tasks[0].lesson, tasks);
}

/** Session built from AI-generated personalized drills for a lesson (capped at max 10). */
export function aiDrillSession(lesson: Lesson, items: Item[], mode: Mode = 'learn', limit?: number): Session {
  const picked = limit != null ? items.slice(0, clampQuestionCount(limit, items.length)) : items.slice(0, MAX_SESSION_QUESTIONS);
  const extraItems = Object.fromEntries(picked.map((item) => [item.id, item]));
  return base(mode, lesson.id, picked.map(task(lesson.id)), { extraItems });
}

function unique(items: Item[]) {
  return items.filter((item, i) => items.findIndex((x) => x.id === item.id) === i);
}

const stageOfTask = (t: Task) => lessons.find((l) => l.id === t.lesson)!.stage;

/**
 * Moves to the next task and adapts:
 * - placement: stop after a stage with a miss;
 * - learn: after two misses, insert an easier item and show the example again;
 *   after three independent correct answers, skip the remaining recognition items.
 * Returns null when the session is over.
 */
export function advance(s: Session, attempts: Attempt[], lessonsById: Map<string, Lesson>, extraBank?: Map<string, Item>): Session | null {
  const mine = attempts.filter((a) => a.session === s.id && a.result !== 'finished').sort(chronological);
  const tasks = [...s.tasks];
  let index = s.index + 1;
  if (s.mode === 'diagnostic') {
    const current = tasks[s.index];
    const next = tasks[index];
    if (next && stageOfTask(next) !== stageOfTask(current)) {
      const stage = stageOfTask(current);
      const missed = mine.some((a) => a.result !== 'correct' && stageOfTask(a as Task) === stage);
      if (missed) return null;
    }
  }
  if (s.mode === 'learn' && tasks[index]) {
    const lesson = lessonsById.get(s.lesson);
    const level = (t: Task) => s.extraItems?.[t.itemId]?.level ?? extraBank?.get(t.itemId)?.level ?? lesson?.items.find((i) => i.id === t.itemId)?.level ?? 0;
    const lastTwo = mine.slice(-2);
    const lastThree = mine.slice(-3);
    if (lesson && lastTwo.length === 2 && lastTwo.every((a) => a.result === 'incorrect') && level(tasks[index]) === 2) {
      const easier = leastUsed(
        lesson.items.filter((i) => i.level === 1 && !i.review && !tasks.some((t) => t.itemId === i.id)),
        attempts
      )[0];
      if (easier) {
        tasks.splice(index, 0, task(lesson.id)(easier));
        return { ...s, tasks, index, answer: '', hinted: false, spoken: false, lastId: undefined, scaffold: true, orderPicked: undefined };
      }
    }
    if (lastThree.length === 3 && lastThree.every((a) => a.result === 'correct' && !a.assisted)) {
      while (tasks[index] && level(tasks[index]) === 1) tasks.splice(index, 1);
    }
  }
  if (index >= tasks.length) return null;
  return { ...s, tasks, index, answer: '', hinted: false, spoken: false, lastId: undefined, scaffold: false, orderPicked: undefined };
}
