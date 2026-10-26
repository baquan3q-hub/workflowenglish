/**
 * The learner's own goals for today in `daily_goals` (migration 016). Until the
 * migration is run they live in this browser's localStorage, per account and day;
 * those `local-` goals stay local even after it is run.
 */
import { isMissingTable } from './listeningLibraryLogic';
import { cleanGoalTitle, nextPosition, sanitizeGoal, type CustomGoal, type GoalTone } from './dailyGoalsLogic';
import { supabase } from './supabaseClient';

const TABLE = 'daily_goals';
const COLUMNS = 'id, title, tone, done, position';

/** False once the table turned out to be missing: goals are kept in this browser. */
let available = true;
export const dailyGoalsAvailable = () => available;

const storeKey = (userId: string, day: string) => `vm.dailyGoals.${userId}.${day}`;
const isLocal = (id: string) => id.startsWith('local-');

function readLocal(userId: string, day: string): CustomGoal[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(userId, day)) || '[]');
    return Array.isArray(raw) ? raw.map(sanitizeGoal).filter((g): g is CustomGoal => !!g) : [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, day: string, goals: CustomGoal[]) {
  try {
    localStorage.setItem(storeKey(userId, day), JSON.stringify(goals));
  } catch {
    // Storage full or blocked: the goal still shows until the page reloads.
  }
}

const rows = (data: unknown) => (Array.isArray(data) ? data.map(sanitizeGoal).filter((g): g is CustomGoal => !!g) : []);

/** True when the error means migration 016 has not been run; then switches to local storage. */
function noteMissing(message: string): boolean {
  if (!isMissingTable(message)) return false;
  available = false;
  return true;
}

/** Today's own goals, ordered; stored ones and any kept in this browser. */
export async function listGoals(userId: string, day: string): Promise<CustomGoal[]> {
  if (!userId) return [];
  const local = readLocal(userId, day);
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('user_id', userId).eq('day', day).order('position');
  if (error) {
    if (!noteMissing(error.message)) console.warn('[Goals] could not load:', error.message);
    return local;
  }
  available = true;
  return [...rows(data), ...local].sort((a, b) => a.position - b.position);
}

export async function addGoal(userId: string, day: string, input: { title: string; tone: GoalTone }, existing: CustomGoal[]): Promise<CustomGoal> {
  const title = cleanGoalTitle(input.title);
  if (!title) throw new Error('Hãy nhập tên mục tiêu.');
  const position = nextPosition(existing);
  if (available) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, day, title, tone: input.tone, position })
      .select(COLUMNS)
      .single();
    if (!error) {
      const goal = sanitizeGoal(data);
      if (goal) return goal;
    } else if (!noteMissing(error.message)) {
      throw new Error(`Chưa lưu được mục tiêu: ${error.message}`);
    }
  }
  const goal: CustomGoal = { id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, tone: input.tone, done: false, position };
  writeLocal(userId, day, [...readLocal(userId, day), goal]);
  return goal;
}

export async function setGoalDone(userId: string, day: string, id: string, done: boolean): Promise<void> {
  if (isLocal(id)) {
    writeLocal(userId, day, readLocal(userId, day).map((g) => (g.id === id ? { ...g, done } : g)));
    return;
  }
  const { error } = await supabase.from(TABLE).update({ done }).eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Chưa lưu được: ${error.message}`);
}

export async function removeGoal(userId: string, day: string, id: string): Promise<void> {
  if (isLocal(id)) {
    writeLocal(userId, day, readLocal(userId, day).filter((g) => g.id !== id));
    return;
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Chưa xoá được: ${error.message}`);
}
