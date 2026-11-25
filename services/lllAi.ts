/**
 * Lifelong Learning AI: find English pages (Google Search grounding), help
 * before reading (shared, cached companion), feedback after reading.
 */
import { invokeAi, withAbortSignal } from './aiClient';
import type { LllLevel, LllLink } from './lllLogic';
import type { Companion, DiscoverItem, Reflection } from '../supabase/functions/ai-proxy/ops/lll.ts';

export type { Companion, DiscoverItem, Reflection };

export interface DiscoverResult {
  items: DiscoverItem[];
  /** Google's search suggestions chip (HTML), shown under grounded results. */
  searchEntryPoint: string | null;
}

export function discoverLll(
  req: { query: string; level: LllLevel; minutes: number; perspectives: boolean; exclude: string[] },
  api: typeof invokeAi = invokeAi,
  signal?: AbortSignal,
): Promise<DiscoverResult> {
  return api<DiscoverResult>('lllDiscover', { ...req, exclude: req.exclude.slice(0, 200) }, { timeoutMs: 75_000, signal });
}

export const discoverToLink = (item: DiscoverItem): LllLink => ({
  url: item.url, title: item.title, topic: item.topic, language: 'en', minutes: item.minutes,
  level: item.level, kind: item.kind, publisher: item.publisher, origin: 'ai',
});

const companions = new Map<string, Promise<Companion>>();

/** The before-reading help for a page. Shared files come back as `{ url }`. */
export function getLllCompanion(
  url: string, title: string, level: LllLevel,
  api: typeof invokeAi = invokeAi, fetchFn: (url: string) => Promise<Response> = (url) => fetch(url),
  signal?: AbortSignal,
): Promise<Companion> {
  if (signal?.aborted) return withAbortSignal(Promise.resolve(undefined as never), signal);
  const key = `${level}\u0000${url}`;
  const hit = companions.get(key);
  if (hit) return withAbortSignal(hit, signal);
  const p = api<Companion | { url: string }>('lllCompanion', { url, title, level }, { timeoutMs: 120_000 }).then(async (data) => {
    if (data && 'url' in data && typeof data.url === 'string') {
      const res = await fetchFn(data.url);
      if (!res.ok) throw new Error(`companion file ${res.status}`);
      return (await res.json()) as Companion;
    }
    return data as Companion;
  });
  companions.set(key, p);
  // Failures and unreadable pages are not remembered, so "Thử lại" asks again.
  p.then((c) => { if (!c.readable) companions.delete(key); }, () => companions.delete(key));
  return withAbortSignal(p, signal);
}

export function reflectLll(
  req: { title: string; question: string; answer: string; level: LllLevel },
  api: typeof invokeAi = invokeAi,
  signal?: AbortSignal,
): Promise<Reflection> {
  return api<Reflection>('lllReflect', req, { timeoutMs: 40_000, signal });
}

// --- Words saved from LLL, kept on this device for the weekly line ------------

const wordKey = (userId: string) => `lll-words-v1:${userId}`;

export function getLllWordLog(userId: string, storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): { at: string }[] {
  try {
    const list = JSON.parse(storage?.getItem(wordKey(userId)) ?? '[]');
    return Array.isArray(list) ? list.filter((w) => typeof w?.at === 'string') : [];
  } catch {
    return [];
  }
}

export function logLllWords(userId: string, count: number, now = new Date(), storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage) {
  if (!storage || count <= 0) return;
  const since = now.getTime() - 30 * 24 * 3600 * 1000;
  const kept = getLllWordLog(userId, storage).filter((w) => Date.parse(w.at) >= since);
  const added = Array.from({ length: count }, () => ({ at: now.toISOString() }));
  try {
    storage.setItem(wordKey(userId), JSON.stringify([...kept, ...added].slice(-500)));
  } catch {
    // Storage full or blocked: the weekly line just undercounts.
  }
}
