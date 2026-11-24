import { supabase, withTimeout } from './supabaseClient';
import { normalizeLllUrl, type LllEntry, type LllLink } from './lllLogic';

const table = 'lll_library';
const columns = 'url,title,topic,language,minutes,saved,finished,note,updated_at';

export async function getLllLibrary(userId: string): Promise<LllEntry[]> {
  const result: LllEntry[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await withTimeout(Promise.resolve(supabase.from(table).select(columns)
      .eq('user_id', userId).order('url').range(from, from + pageSize - 1)));
    if (error) throw error;
    const page = (data ?? []) as LllEntry[];
    result.push(...page.filter((entry) => normalizeLllUrl(entry.url) === entry.url));
    if (page.length < pageSize) return result;
  }
}

export async function saveLllEntry(
  userId: string, item: LllLink, patch: Partial<Pick<LllEntry, 'saved' | 'finished' | 'note'>>,
): Promise<LllEntry> {
  const { url, title, topic, language, minutes } = item;
  const { data, error } = await withTimeout(Promise.resolve(supabase.from(table)
    .upsert({ user_id: userId, url, title, topic, language, minutes, updated_at: new Date().toISOString(), ...patch },
      { onConflict: 'user_id,url', defaultToNull: false })
    .select(columns).single()));
  if (error) throw error;
  return data as LllEntry;
}
