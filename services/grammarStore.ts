import { supabase } from './supabaseClient';
import { curriculum } from '../data/grammar/catalog';
import type { Evidence, Session } from './grammarLogic';

const prefix = (user: string) => 'workflow:grammar:v1:' + user + ':';
const key = (user: string, id: string) => prefix(user) + 'event:' + id;
const valid = (e: Evidence | null): e is Evidence =>
  !!e &&
  e.version === 1 &&
  typeof e.id === 'string' &&
  typeof e.session === 'string' &&
  Number.isFinite(Date.parse(e.at)) &&
  curriculum.some((s) => s.id === e.skill) &&
  ['correct', 'incorrect', 'pending', 'finished'].includes(e.result);
function read<T>(name: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(name) || 'null');
  } catch {
    return null;
  }
}
export function getEvents(user: string): Evidence[] {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix(user) + 'event:'))
    .map((k) => read<Evidence>(k))
    .filter(valid);
}
export function getDraft(user: string) {
  const s = read<Session>(prefix(user) + 'draft');
  if (
    !s ||
    !Array.isArray(s.tasks) ||
    !s.tasks[s.index] ||
    !['lesson', 'review', 'checkpoint', 'placement'].includes(s.mode)
  )
    return null;
  if (read<Evidence>(key(user, s.id))?.result === 'finished') return null;
  return s.tasks.every(
    (t) =>
      t &&
      curriculum.some((c) => c.id === t.skill) &&
      Number.isInteger(t.item) &&
      t.item >= 0 &&
      t.item <= 16 &&
      ['choice', 'fill', 'translate', 'write', 'speak'].includes(t.kind)
  )
    ? s
    : null;
}
export function saveDraft(user: string, s: Session | null) {
  if (s) localStorage.setItem(prefix(user) + 'draft', JSON.stringify(s));
  else localStorage.removeItem(prefix(user) + 'draft');
}
export function record(user: string, e: Evidence) {
  localStorage.setItem(key(user, e.id), JSON.stringify(e));
}
// Only a final judgement supersedes a pending one. Append-only revisions make replay safe.
export async function syncGrammar(user: string, pullHistory: boolean) {
  const synced = prefix(user) + 'sent:';
  const local = getEvents(user);
  const rev = (e: Evidence) => (e.result === 'pending' ? 0 : 1);
  const unsent = local.filter((e) => localStorage.getItem(synced + e.id) !== String(rev(e)));
  for (let i = 0; i < unsent.length; i += 100) {
    const batch = unsent.slice(i, i + 100);
    const { error } = await supabase.from('grammar_attempts').upsert(
      batch.map((e) => ({
        user_id: user,
        event_id: e.id,
        revision: rev(e),
        skill_id: e.skill,
        occurred_at: e.at,
        evidence: e,
      })),
      { onConflict: 'user_id,event_id,revision', ignoreDuplicates: true }
    );
    if (error) throw error;
    batch.forEach((e) => localStorage.setItem(synced + e.id, String(rev(e))));
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
      const remote = row.evidence as Evidence;
      if (!valid(remote)) continue;
      const current = read<Evidence>(key(user, remote.id));
      if (!current || rev(current) <= rev(remote)) {
        record(user, remote);
        localStorage.setItem(synced + remote.id, String(rev(remote)));
      }
    }
    if (!data || data.length < 500) break;
  }
}
