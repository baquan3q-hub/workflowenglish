/**
 * Local-first storage for the grammar module.
 *
 * Answers are append-only events under `workflow:grammar:v1:<user>:event:<id>` — the same keys the
 * first version used, so earlier results stay where they are. Version-1 events are read through
 * `toAttempt`; nothing is rewritten. Sync to `grammar_attempts` is unchanged: a pending AI grade is
 * revision 0, the final judgement revision 1.
 */
import { supabase } from '../supabaseClient';
import { LEGACY_LESSON } from '../../data/grammar/legacy';
import { lessonById } from '../../data/grammar/meta';
import type { Item } from '../../data/grammar/types';
import type { GrammarErrorTag } from '../../supabase/functions/ai-proxy/ops/grammar';
import { grammarStateKey } from './peek';
import { toAttempt, type Attempt } from './progress';
import type { Session } from './session';

const prefix = (user: string) => 'workflow:grammar:v1:' + user + ':';
const eventKey = (user: string, id: string) => prefix(user) + 'event:' + id;
const draftKey = (user: string) => prefix(user) + 'draft2';
const oldDraftKey = (user: string) => prefix(user) + 'draft';
const stateKey = grammarStateKey;
const libraryKey = (user: string) => 'workflow:grammar:library:v1:' + user;
const aiItemsKey = (user: string) => prefix(user) + 'ai-items';
const aiDirtyKey = (user: string) => prefix(user) + 'ai-dirty';
const MAX_LOCAL_AI_ITEMS = 300;

function read<T>(name: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(name) || 'null');
  } catch {
    return null;
  }
}
function write(name: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(name);
    else localStorage.setItem(name, JSON.stringify(value));
  } catch {
    /* Storage can be full or disabled; the session still works in memory. */
  }
}

const rawEvents = (user: string) =>
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix(user) + 'event:'))
    .map((k) => read<unknown>(k));

export function getAttempts(user: string): Attempt[] {
  return rawEvents(user)
    .map(toAttempt)
    .filter((a): a is Attempt => !!a);
}

export function record(user: string, a: Attempt) {
  write(eventKey(user, a.id), { ...a, version: 2, legacy: undefined });
}

/** Lessons ticked in the first version's topic library, mapped to current lessons. */
export function getOldLibrary(user: string): { completed: Set<string>; recent?: string } {
  const saved = read<{ completed?: unknown; recent?: unknown }>(libraryKey(user));
  const map = (id: unknown) => (typeof id === 'string' ? LEGACY_LESSON[id] : undefined);
  const completed = new Set(
    (Array.isArray(saved?.completed) ? saved!.completed : []).map(map).filter((id): id is string => !!id)
  );
  return { completed, recent: map(saved?.recent) };
}

export interface ModuleState {
  /** Lesson being read and the step reached. */
  current?: { lesson: string; step: number; title?: string };
  /** Chose "start from zero" instead of the placement test. */
  zeroStart?: boolean;
  /** Learner-chosen number of questions per practice session (2..10). */
  questionCount?: number;
}
export function getState(user: string): ModuleState {
  const s = read<ModuleState>(stateKey(user)) ?? {};
  if (s.current && !lessonById.has(s.current.lesson)) delete s.current;
  if (!s.current) {
    const recent = getOldLibrary(user).recent;
    if (recent) s.current = { lesson: recent, step: 0 };
  }
  if (typeof s.questionCount === 'number' && Number.isFinite(s.questionCount)) {
    s.questionCount = Math.min(10, Math.max(2, Math.round(s.questionCount)));
  } else delete s.questionCount;
  return s;
}
export function saveState(user: string, s: ModuleState) {
  // The title lets the dashboard show the lesson without loading the lesson list.
  if (s.current) s = { ...s, current: { ...s.current, title: lessonById.get(s.current.lesson)?.title } };
  write(stateKey(user), s);
}

export function getDraft(user: string): Session | null {
  const s = read<Session>(draftKey(user));
  if (!s || s.version !== 2 || !Array.isArray(s.tasks) || !s.tasks[s.index]) return null;
  if (!s.tasks.every((t) => t && lessonById.has(t.lesson) && typeof t.itemId === 'string')) return null;
  const done = getAttempts(user).some((a) => a.session === s.id && a.result === 'finished');
  return done ? null : s;
}
export function saveDraft(user: string, s: Session | null) {
  write(draftKey(user), s);
}

/**
 * The first version's unfinished session cannot be resumed (its items are gone), but every answer
 * in it was saved as an event. Remove it once and report whether there was one.
 */
export function dropOldDraft(user: string) {
  const had = localStorage.getItem(oldDraftKey(user)) != null;
  if (had) localStorage.removeItem(oldDraftKey(user));
  return had;
}

const revision = (a: { result: string }) => (a.result === 'pending' ? 0 : 1);
const skillOf = (raw: { version?: number; skill?: string; lesson?: string }) =>
  raw.version === 1 ? raw.skill! : raw.lesson!;

export interface SavedAiItem {
  id: string;
  lessonId: string;
  kind: 'fill' | 'fix' | 'translate' | 'write';
  level: 2 | 3 | 4;
  focusTag?: GrammarErrorTag;
  theme: string;
  sourceMode: 'learn' | 'errors' | 'review';
  item: Item;
  timesSeen: number;
  timesCorrect: number;
  lastResult?: 'correct' | 'incorrect' | 'pending';
  lastPracticedAt?: string;
  createdAt: string;
}

const isSavedAiItem = (v: unknown): v is SavedAiItem => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Partial<SavedAiItem>;
  return typeof o.id === 'string' && typeof o.lessonId === 'string' && !!o.item && typeof o.item === 'object';
};

export function getAiItems(user: string, lessonId?: string): SavedAiItem[] {
  const raw = read<unknown[]>(aiItemsKey(user));
  const list = Array.isArray(raw) ? raw.filter(isSavedAiItem) : [];
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return lessonId ? list.filter((x) => x.lessonId === lessonId) : list;
}

export function getAiItemMap(user: string): Map<string, Item> {
  return new Map(getAiItems(user).map((entry) => [entry.id, entry.item]));
}

function writeAiStore(user: string, list: SavedAiItem[], dirtyAdd: string[]) {
  write(aiItemsKey(user), list.slice(0, MAX_LOCAL_AI_ITEMS));
  if (!dirtyAdd.length) return;
  const existing = read<string[]>(aiDirtyKey(user));
  const next = [...new Set([...(Array.isArray(existing) ? existing : []), ...dirtyAdd])];
  write(aiDirtyKey(user), next);
}

export function saveAiItems(
  user: string,
  items: Item[],
  meta: { lessonId: string; focusTag?: GrammarErrorTag; theme: string; sourceMode: 'learn' | 'errors' | 'review' }
): SavedAiItem[] {
  const existing = getAiItems(user);
  const byId = new Map(existing.map((x) => [x.id, x]));
  const now = new Date().toISOString();
  const addedIds: string[] = [];
  const created: SavedAiItem[] = [];
  for (const item of items) {
    if (item.kind !== 'fill' && item.kind !== 'fix' && item.kind !== 'translate' && item.kind !== 'write') continue;
    const entry: SavedAiItem = {
      id: item.id,
      lessonId: meta.lessonId,
      kind: item.kind,
      level: item.level as 2 | 3 | 4,
      ...(meta.focusTag ? { focusTag: meta.focusTag } : {}),
      theme: meta.theme.slice(0, 250),
      sourceMode: meta.sourceMode,
      item,
      timesSeen: 0,
      timesCorrect: 0,
      createdAt: now,
    };
    byId.set(entry.id, entry);
    addedIds.push(entry.id);
    created.push(entry);
  }
  const merged = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  writeAiStore(user, merged, addedIds);
  return created;
}

export function recordAiItemOutcome(
  user: string,
  itemId: string,
  result: 'correct' | 'incorrect' | 'pending' | 'finished',
  at = new Date().toISOString()
) {
  if (!itemId || result === 'finished') return;
  const list = getAiItems(user);
  const idx = list.findIndex((x) => x.id === itemId);
  if (idx < 0) return;
  const cur = list[idx];
  const updated: SavedAiItem = {
    ...cur,
    timesSeen: result === 'correct' || result === 'incorrect' ? cur.timesSeen + 1 : cur.timesSeen,
    timesCorrect: result === 'correct' ? cur.timesCorrect + 1 : cur.timesCorrect,
    lastResult: result,
    lastPracticedAt: at,
  };
  list[idx] = updated;
  writeAiStore(user, list, [itemId]);
}

const isMissingAiTable = (error: { code?: string; message?: string } | null | undefined) =>
  !!error && (['42P01', 'PGRST205'].includes(error.code ?? '') || /grammar_ai_items|does not exist|schema cache/i.test(error.message ?? ''));

async function syncAiItems(user: string, pullHistory: boolean) {
  const dirtyRaw = read<string[]>(aiDirtyKey(user));
  const dirtyIds = Array.isArray(dirtyRaw) ? dirtyRaw : [];
  if (!dirtyIds.length && !pullHistory) return;

  const local = getAiItems(user);
  const byId = new Map(local.map((x) => [x.id, x]));
  const toPush = dirtyIds.map((id) => byId.get(id)).filter((x): x is SavedAiItem => !!x);
  if (toPush.length) {
    for (let i = 0; i < toPush.length; i += 50) {
      const batch = toPush.slice(i, i + 50);
      const { error } = await supabase.from('grammar_ai_items').upsert(
        batch.map((x) => ({
          user_id: user,
          id: x.id,
          lesson_id: x.lessonId,
          kind: x.kind,
          level: x.level,
          focus_tag: x.focusTag ?? null,
          theme: x.theme,
          item: x.item,
          source_mode: x.sourceMode,
          times_seen: x.timesSeen,
          times_correct: x.timesCorrect,
          last_result: x.lastResult ?? null,
          last_practiced_at: x.lastPracticedAt ?? null,
          created_at: x.createdAt,
        })),
        { onConflict: 'user_id,id' }
      );
      if (isMissingAiTable(error)) return;
      if (error) throw error;
    }
    write(aiDirtyKey(user), []);
  }

  if (!pullHistory) return;
  const { data, error } = await supabase
    .from('grammar_ai_items')
    .select('id,lesson_id,kind,level,focus_tag,theme,item,source_mode,times_seen,times_correct,last_result,last_practiced_at,created_at')
    .eq('user_id', user)
    .order('created_at', { ascending: false })
    .limit(MAX_LOCAL_AI_ITEMS);
  if (isMissingAiTable(error)) return;
  if (error) throw error;
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    if (typeof row.id !== 'string' || typeof row.lesson_id !== 'string' || !row.item) continue;
    const remote: SavedAiItem = {
      id: row.id,
      lessonId: row.lesson_id,
      kind: row.kind as SavedAiItem['kind'],
      level: row.level as 2 | 3 | 4,
      ...(typeof row.focus_tag === 'string' && row.focus_tag ? { focusTag: row.focus_tag as GrammarErrorTag } : {}),
      theme: typeof row.theme === 'string' ? row.theme : '',
      sourceMode: (row.source_mode as SavedAiItem['sourceMode']) ?? 'learn',
      item: row.item as Item,
      timesSeen: typeof row.times_seen === 'number' ? row.times_seen : 0,
      timesCorrect: typeof row.times_correct === 'number' ? row.times_correct : 0,
      ...(typeof row.last_result === 'string' ? { lastResult: row.last_result as SavedAiItem['lastResult'] } : {}),
      ...(typeof row.last_practiced_at === 'string' ? { lastPracticedAt: row.last_practiced_at } : {}),
      createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    };
    const cur = byId.get(remote.id);
    if (!cur || cur.timesSeen <= remote.timesSeen) byId.set(remote.id, remote);
  }
  const merged = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  write(aiItemsKey(user), merged.slice(0, MAX_LOCAL_AI_ITEMS));
}

export async function syncGrammar(user: string, pullHistory: boolean) {
  const sent = prefix(user) + 'sent:';
  const local = rawEvents(user).filter((raw) => toAttempt(raw)) as (Attempt & { skill?: string })[];
  const unsent = local.filter((e) => localStorage.getItem(sent + e.id) !== String(revision(e)));
  for (let i = 0; i < unsent.length; i += 100) {
    const batch = unsent.slice(i, i + 100);
    const { error } = await supabase.from('grammar_attempts').upsert(
      batch.map((e) => ({
        user_id: user,
        event_id: e.id,
        revision: revision(e),
        skill_id: skillOf(e),
        occurred_at: e.at,
        evidence: e,
      })),
      { onConflict: 'user_id,event_id,revision', ignoreDuplicates: true }
    );
    if (error) throw error;
    batch.forEach((e) => localStorage.setItem(sent + e.id, String(revision(e))));
  }
  if (!pullHistory) {
    await syncAiItems(user, false);
    return;
  }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('grammar_attempts')
      .select('evidence')
      .eq('user_id', user)
      .order('occurred_at')
      .order('event_id')
      .order('revision')
      .range(offset, offset + 499);
    if (error) throw error;
    for (const row of data || []) {
      const remote = row.evidence as Attempt;
      if (!toAttempt(remote)) continue;
      const current = read<Attempt>(eventKey(user, remote.id));
      if (!current || revision(current) <= revision(remote)) {
        write(eventKey(user, remote.id), remote);
        localStorage.setItem(sent + remote.id, String(revision(remote)));
      }
    }
    if (!data || data.length < 500) break;
  }
  await syncAiItems(user, true);
}
