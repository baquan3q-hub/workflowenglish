/**
 * "Mục tiêu hôm nay" (pure): the automatic goals worked out from the app's data,
 * the learner's own goals, and how far along the day is.
 */

/** Tones a learner can give their own goal (the migration 016 check list). */
export const GOAL_TONES = ['sky', 'mint', 'lavender', 'peach', 'butter', 'blush'] as const;
export type GoalTone = (typeof GOAL_TONES)[number];
export const GOAL_TITLE_MAX = 60;

/** A goal the learner wrote for today; they tick it themself. */
export interface CustomGoal {
  id: string;
  title: string;
  tone: GoalTone;
  done: boolean;
  position: number;
}

export type GoalKind = 'continue' | 'review' | 'sentences' | 'ielts' | 'custom';

export interface TodayGoal {
  /** `auto:<kind>` for automatic goals, the row id for the learner's own. */
  id: string;
  kind: GoalKind;
  title: string;
  tone: GoalTone | 'periwinkle';
  done: boolean;
  /** Shown as "16/73" with a thin bar; absent while the numbers load. */
  progress?: { value: number; max: number };
}

export interface AutoGoalInput {
  activeLesson: { topic: string } | null;
  /** Words due now; null while loading. */
  dueCount: number | null;
  /** `user_goals.words_reviewed_today` (0 until goals load). */
  reviewedToday: number;
  dailyWordGoal: number;
  /** Sentences answered "Cần sửa" and not fixed since. */
  wrongSentences: number;
  /** IELTS attempts made today; null while loading. */
  ieltsToday: number | null;
}

/**
 * Review goal: the total is what is still due plus what was reviewed today, so it
 * does not shrink while the learner works through it. With nothing due it counts
 * toward the daily word goal, and any review today means the queue is cleared.
 */
function reviewGoal(input: AutoGoalInput): TodayGoal {
  const reviewed = Math.max(0, input.reviewedToday);
  if (input.dueCount === null) {
    return { id: 'auto:review', kind: 'review', title: 'Ôn từ vựng', tone: 'butter', done: false };
  }
  const due = Math.max(0, input.dueCount);
  const max = due > 0 ? due + reviewed : Math.max(1, input.dailyWordGoal, reviewed);
  const done = (due === 0 && reviewed > 0) || reviewed >= max;
  return {
    id: 'auto:review',
    kind: 'review',
    title: `Ôn ${max} từ vựng`,
    tone: 'butter',
    done,
    progress: { value: Math.min(reviewed, max), max },
  };
}

/** Lesson in progress → review → sentences to fix → IELTS. */
export function autoGoals(input: AutoGoalInput): TodayGoal[] {
  const goals: TodayGoal[] = [];
  if (input.activeLesson) {
    goals.push({ id: 'auto:continue', kind: 'continue', title: `Học tiếp bài ${input.activeLesson.topic}`, tone: 'periwinkle', done: false });
  }
  goals.push(reviewGoal(input));
  if (input.wrongSentences > 0) {
    goals.push({ id: 'auto:sentences', kind: 'sentences', title: `Viết lại ${input.wrongSentences} câu cần sửa`, tone: 'blush', done: false });
  }
  const ielts = input.ieltsToday;
  goals.push({
    id: 'auto:ielts',
    kind: 'ielts',
    title: 'Luyện IELTS',
    tone: 'sky',
    done: (ielts ?? 0) >= 1,
    progress: ielts === null ? undefined : { value: Math.min(1, ielts), max: 1 },
  });
  return goals;
}

/** Automatic goals first, then the learner's own in the order they added them. */
export function todayGoals(input: AutoGoalInput, custom: CustomGoal[]): TodayGoal[] {
  const own = [...custom]
    .sort((a, b) => a.position - b.position)
    .map<TodayGoal>((g) => ({ id: g.id, kind: 'custom', title: g.title, tone: g.tone, done: g.done, progress: { value: g.done ? 1 : 0, max: 1 } }));
  return [...autoGoals(input), ...own];
}

export interface GoalSummary {
  done: number;
  total: number;
  allDone: boolean;
  /** The first goal not done yet, for the mascot's nudge. */
  next: TodayGoal | null;
}

export function goalSummary(goals: TodayGoal[]): GoalSummary {
  const done = goals.filter((g) => g.done).length;
  return { done, total: goals.length, allDone: goals.length > 0 && done === goals.length, next: goals.find((g) => !g.done) ?? null };
}

/** One line, no control characters, at most 60 characters; '' when nothing is left. */
export function cleanGoalTitle(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GOAL_TITLE_MAX)
    .trim();
}

export const isGoalTone = (v: unknown): v is GoalTone => typeof v === 'string' && (GOAL_TONES as readonly string[]).includes(v);

/** After the last of today's goals. */
export const nextPosition = (goals: CustomGoal[]) => goals.reduce((m, g) => Math.max(m, g.position + 1), 0);

/** YYYY-MM-DD in the learner's own time: "today" is the day they see. */
export const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Attempts whose timestamp falls on `now`'s local day. */
export function countToday(createdAt: Array<string | undefined>, now: Date): number {
  const today = localDay(now);
  return createdAt.filter((iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && localDay(d) === today;
  }).length;
}

/** A stored row, checked; null when it is not a usable goal. */
export function sanitizeGoal(row: unknown): CustomGoal | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const title = typeof r.title === 'string' ? cleanGoalTitle(r.title) : '';
  if (typeof r.id !== 'string' || !r.id || !title) return null;
  return {
    id: r.id,
    title,
    tone: isGoalTone(r.tone) ? r.tone : 'lavender',
    done: r.done === true,
    position: typeof r.position === 'number' && Number.isFinite(r.position) ? r.position : 0,
  };
}
