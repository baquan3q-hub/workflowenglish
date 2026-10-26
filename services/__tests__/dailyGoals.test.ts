import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: null as { message: string } | null,
  inserted: [] as Record<string, unknown>[],
  updated: [] as unknown[],
  deleted: 0,
}));

vi.mock('../supabaseClient', () => {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    order: () => Promise.resolve({ data: db.rows, error: db.error }),
    insert: (row: Record<string, unknown>) => {
      db.inserted.push(row);
      return { select: () => ({ single: () => Promise.resolve({ data: db.error ? null : { id: 'g-new', done: false, ...row }, error: db.error }) }) };
    },
    update: (patch: unknown) => {
      db.updated.push(patch);
      return { eq: () => ({ eq: () => Promise.resolve({ error: db.error }) }) };
    },
    delete: () => {
      db.deleted++;
      return { eq: () => ({ eq: () => Promise.resolve({ error: db.error }) }) };
    },
  };
  return { supabase: { from: () => query } };
});

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

import {
  autoGoals,
  cleanGoalTitle,
  countToday,
  goalSummary,
  localDay,
  nextPosition,
  sanitizeGoal,
  todayGoals,
  type AutoGoalInput,
  type CustomGoal,
} from '../dailyGoalsLogic';
import { addGoal, dailyGoalsAvailable, listGoals, removeGoal, setGoalDone } from '../dailyGoalsService';

const base: AutoGoalInput = { activeLesson: null, dueCount: 57, reviewedToday: 16, dailyWordGoal: 5, wrongSentences: 0, ieltsToday: 0 };
const review = (input: Partial<AutoGoalInput>) => autoGoals({ ...base, ...input }).find((g) => g.kind === 'review')!;

describe('automatic goals', () => {
  it('counts due plus reviewed so the total holds while reviewing', () => {
    expect(review({})).toMatchObject({ title: 'Ôn 73 từ vựng', done: false, progress: { value: 16, max: 73 } });
    expect(review({ dueCount: 50, reviewedToday: 23 }).progress).toEqual({ value: 23, max: 73 });
  });

  it('is done once nothing is due and something was reviewed', () => {
    expect(review({ dueCount: 0, reviewedToday: 3 })).toMatchObject({ done: true, progress: { value: 3, max: 5 } });
    expect(review({ dueCount: 0, reviewedToday: 0 })).toMatchObject({ title: 'Ôn 5 từ vựng', done: false, progress: { value: 0, max: 5 } });
    expect(review({ dueCount: 0, reviewedToday: 12 })).toMatchObject({ title: 'Ôn 12 từ vựng', done: true });
  });

  it('has no numbers while the due count loads', () => {
    expect(review({ dueCount: null })).toMatchObject({ title: 'Ôn từ vựng', done: false });
    expect(review({ dueCount: null }).progress).toBeUndefined();
  });

  it('adds the lesson in progress and sentences to fix only when there are some', () => {
    expect(autoGoals(base).map((g) => g.kind)).toEqual(['review', 'ielts']);
    const all = autoGoals({ ...base, activeLesson: { topic: 'Du lịch' }, wrongSentences: 2 });
    expect(all.map((g) => g.kind)).toEqual(['continue', 'review', 'sentences', 'ielts']);
    expect(all[0].title).toBe('Học tiếp bài Du lịch');
    expect(all[2].title).toBe('Viết lại 2 câu cần sửa');
  });

  it('ticks IELTS after one attempt today', () => {
    const ielts = (n: number | null) => autoGoals({ ...base, ieltsToday: n }).find((g) => g.kind === 'ielts')!;
    expect(ielts(0)).toMatchObject({ done: false, progress: { value: 0, max: 1 } });
    expect(ielts(3)).toMatchObject({ done: true, progress: { value: 1, max: 1 } });
    expect(ielts(null).progress).toBeUndefined();
  });
});

describe('today list and summary', () => {
  const own: CustomGoal[] = [
    { id: 'b', title: 'Tập thể dục', tone: 'mint', done: true, position: 2 },
    { id: 'a', title: 'Đọc bài viết EdTech', tone: 'peach', done: false, position: 1 },
  ];

  it('puts automatic goals first, then own goals by position', () => {
    const list = todayGoals(base, own);
    expect(list.map((g) => g.id)).toEqual(['auto:review', 'auto:ielts', 'a', 'b']);
    expect(list[3]).toMatchObject({ kind: 'custom', done: true, progress: { value: 1, max: 1 } });
  });

  it('counts what is done and names the next goal', () => {
    const s = goalSummary(todayGoals(base, own));
    expect(s).toMatchObject({ done: 1, total: 4, allDone: false });
    expect(s.next?.id).toBe('auto:review');
    const finished = todayGoals({ ...base, dueCount: 0, ieltsToday: 1 }, own.map((g) => ({ ...g, done: true })));
    expect(goalSummary(finished)).toMatchObject({ done: 4, total: 4, allDone: true, next: null });
    expect(goalSummary([]).allDone).toBe(false);
  });

  it('cleans titles and checks stored rows', () => {
    expect(cleanGoalTitle('  Đọc \n\t bài\u0007  ')).toBe('Đọc bài');
    expect(cleanGoalTitle('x'.repeat(80))).toHaveLength(60);
    expect(sanitizeGoal({ id: 'x', title: ' Chạy ', tone: 'neon', done: 'yes', position: 'a' })).toEqual({ id: 'x', title: 'Chạy', tone: 'lavender', done: false, position: 0 });
    expect(sanitizeGoal({ id: 'x', title: '   ' })).toBeNull();
    expect(sanitizeGoal(null)).toBeNull();
    expect(nextPosition(own)).toBe(3);
    expect(nextPosition([])).toBe(0);
  });

  it('counts attempts on the local day', () => {
    const now = new Date(2026, 9, 26, 15);
    expect(localDay(now)).toBe('2026-10-26');
    const today = new Date(2026, 9, 26, 8).toISOString();
    const yesterday = new Date(2026, 9, 25, 23).toISOString();
    expect(countToday([today, yesterday, undefined, 'nope'], now)).toBe(1);
  });
});

describe('daily goals service', () => {
  beforeEach(() => {
    db.rows = [];
    db.error = null;
    db.inserted = [];
    db.updated = [];
    db.deleted = 0;
    store.clear();
  });

  it('reads and stores goals in daily_goals', async () => {
    db.rows = [{ id: 'g1', title: 'Chạy bộ', tone: 'mint', done: false, position: 0 }];
    expect(await listGoals('u1', '2026-10-26')).toEqual([{ id: 'g1', title: 'Chạy bộ', tone: 'mint', done: false, position: 0 }]);
    const goal = await addGoal('u1', '2026-10-26', { title: '  Đọc sách ', tone: 'peach' }, db.rows as CustomGoal[]);
    expect(db.inserted[0]).toEqual({ user_id: 'u1', day: '2026-10-26', title: 'Đọc sách', tone: 'peach', position: 1 });
    expect(goal).toMatchObject({ id: 'g-new', title: 'Đọc sách', position: 1 });
    await setGoalDone('u1', '2026-10-26', 'g1', true);
    expect(db.updated).toEqual([{ done: true }]);
    await removeGoal('u1', '2026-10-26', 'g1');
    expect(db.deleted).toBe(1);
  });

  it('refuses an empty title', async () => {
    await expect(addGoal('u1', '2026-10-26', { title: '   ', tone: 'sky' }, [])).rejects.toThrow(/tên mục tiêu/);
  });

  it('keeps goals in this browser before migration 016', async () => {
    db.error = { message: 'relation "public.daily_goals" does not exist' };
    expect(await listGoals('u1', '2026-10-26')).toEqual([]);
    expect(dailyGoalsAvailable()).toBe(false);
    const goal = await addGoal('u1', '2026-10-26', { title: 'Tập thể dục', tone: 'mint' }, []);
    expect(goal.id).toMatch(/^local-/);
    expect(db.inserted).toHaveLength(0);
    await setGoalDone('u1', '2026-10-26', goal.id, true);
    expect(await listGoals('u1', '2026-10-26')).toEqual([{ ...goal, done: true }]);
    expect(await listGoals('u2', '2026-10-26')).toEqual([]);
    expect(await listGoals('u1', '2026-10-27')).toEqual([]);
    await removeGoal('u1', '2026-10-26', goal.id);
    expect(await listGoals('u1', '2026-10-26')).toEqual([]);
  });

  it('says why a save failed for other errors', async () => {
    db.rows = [];
    await listGoals('u1', '2026-10-26'); // table is there again
    db.error = { message: 'network down' };
    await expect(addGoal('u1', '2026-10-26', { title: 'Đọc', tone: 'sky' }, [])).rejects.toThrow(/Chưa lưu được mục tiêu/);
    await expect(setGoalDone('u1', '2026-10-26', 'g1', true)).rejects.toThrow(/Chưa lưu được/);
  });
});
