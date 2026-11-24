import { supabase, withTimeout } from './supabaseClient';
import { isLllKind, isLllLevel, legacyTopic, normalizeLllUrl, type LllEntry, type LllLink } from './lllLogic';

const table = 'lll_library';
const legacyColumns = 'url,title,topic,language,minutes,saved,finished,note,updated_at';
const columns = `${legacyColumns},level,kind,publisher,origin`;

/**
 * True once the database has turned out not to have migration 20261124120000
 * (no new columns, or the old topic check). Links are then saved the old way.
 */
let legacy = false;

/** Unknown column (select or upsert) or the old topic check. */
export const needsLegacy = (error: { code?: string } | null | undefined) =>
  !!error && ['42703', 'PGRST204', '23514'].includes(error.code ?? '');

const clean = (entry: LllEntry): LllEntry => ({
  ...entry,
  level: isLllLevel(entry.level) ? entry.level : null,
  kind: isLllKind(entry.kind) ? entry.kind : null,
});

export async function getLllLibrary(userId: string): Promise<LllEntry[]> {
  const result: LllEntry[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const run = () => withTimeout(Promise.resolve(supabase.from(table).select(legacy ? legacyColumns : columns)
      .eq('user_id', userId).order('url').range(from, from + pageSize - 1)));
    let { data, error } = await run();
    if (!legacy && needsLegacy(error)) {
      legacy = true;
      ({ data, error } = await run());
    }
    if (error) throw error;
    const page = (data ?? []) as unknown as LllEntry[];
    result.push(...page.filter((entry) => normalizeLllUrl(entry.url) === entry.url).map(clean));
    if (page.length < pageSize) return result;
  }
}

export async function saveLllEntry(
  userId: string, item: LllLink, patch: Partial<Pick<LllEntry, 'saved' | 'finished' | 'note'>>,
): Promise<LllEntry> {
  const { url, topic, language, minutes } = item;
  const title = item.title.trim().slice(0, 160) || url.slice(0, 160);
  const base = { user_id: userId, url, title, language, minutes, updated_at: new Date().toISOString(), ...patch };
  const run = () => withTimeout(Promise.resolve(supabase.from(table)
    .upsert(legacy
      ? { ...base, topic: legacyTopic(topic) }
      : { ...base, topic, level: item.level ?? null, kind: item.kind ?? null, publisher: item.publisher?.slice(0, 80) ?? null, origin: item.origin ?? 'user' },
    { onConflict: 'user_id,url', defaultToNull: false })
    .select(legacy ? legacyColumns : columns).single()));
  let { data, error } = await run();
  if (!legacy && needsLegacy(error)) {
    legacy = true;
    ({ data, error } = await run());
  }
  if (error) throw error;
  // Keep what the app knows about the link even when the database cannot store it yet.
  const saved = data as unknown as LllEntry;
  return clean({ ...item, ...saved, topic: legacy ? item.topic : saved.topic, level: saved.level ?? item.level, kind: saved.kind ?? item.kind, publisher: saved.publisher ?? item.publisher });
}
