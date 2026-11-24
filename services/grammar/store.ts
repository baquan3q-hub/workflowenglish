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
import { grammarStateKey } from './peek';
import { toAttempt, type Attempt } from './progress';
import type { Session } from './session';

const prefix = (user: string) => 'workflow:grammar:v1:' + user + ':';
const eventKey = (user: string, id: string) => prefix(user) + 'event:' + id;
const draftKey = (user: string) => prefix(user) + 'draft2';
const oldDraftKey = (user: string) => prefix(user) + 'draft';
const stateKey = grammarStateKey;
const libraryKey = (user: string) => 'workflow:grammar:library:v1:' + user;

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
}
export function getState(user: string): ModuleState {
  const s = read<ModuleState>(stateKey(user)) ?? {};
  if (s.current && !lessonById.has(s.current.lesson)) delete s.current;
  if (!s.current) {
    const recent = getOldLibrary(user).recent;
    if (recent) s.current = { lesson: recent, step: 0 };
  }
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
  if (!pullHistory) return;
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
}
