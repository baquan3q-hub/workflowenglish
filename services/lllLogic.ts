import type { ProfileInterest } from './learningProfileLogic';

export const LLL_TOPICS = { tech: 'Công nghệ & AI', skills: 'Học tập & làm việc', life: 'Khoa học & đời sống' } as const;
export type LllTopic = keyof typeof LLL_TOPICS;
export type LllLanguage = 'vi' | 'en';
export interface LllLink {
  url: string;
  title: string;
  topic: LllTopic;
  language: LllLanguage;
  minutes: number | null;
}
export interface LllEditorial extends LllLink {
  minutes: number;
  publisher: string;
  description: string;
}
export interface LllEntry extends LllLink {
  saved: boolean;
  finished: boolean;
  note: string;
  updated_at: string;
}

export function lllYoutubeId(url: URL): string | null {
  let id: string | null | undefined;
  if (url.hostname === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    const [, route, segment] = url.pathname.split('/');
    id = route === 'watch' ? url.searchParams.get('v') : ['shorts', 'embed', 'live'].includes(route) ? segment : null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function normalizeLllUrl(raw: string): string | null {
  if (!/^https:\/\//i.test(raw.trim())) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) return null;
    const id = lllYoutubeId(url);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || key === 'fbclid' || key === 'gclid') url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

const interestTopics: Partial<Record<ProfileInterest, LllTopic>> = {
  technology: 'tech', business: 'skills', education: 'skills',
  science: 'life', environment: 'life', health: 'life',
};

function dailyRank(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function pickLllToday(
  catalog: readonly LllEditorial[], entries: readonly LllEntry[], interests: readonly ProfileInterest[],
  filters: { minutes: number; language: LllLanguage | 'all'; topic: LllTopic | 'all' }, day: string,
) {
  const states = new Map(entries.map((entry) => [entry.url, entry]));
  const editorialUrls = new Set(catalog.map((item) => item.url));
  const preferred = new Set(interests.map((interest) => interestTopics[interest]));
  const eligible = (item: LllLink) => item.minutes != null && item.minutes <= filters.minutes
    && (filters.language === 'all' || item.language === filters.language)
    && (filters.topic === 'all' || item.topic === filters.topic)
    && !states.get(item.url)?.finished;
  const rank = (a: LllLink, b: LllLink) =>
    Number(preferred.has(b.topic)) - Number(preferred.has(a.topic))
    || dailyRank(`${day}:${a.url}`) - dailyRank(`${day}:${b.url}`);
  const personal = entries.filter((item) => item.saved && !editorialUrls.has(item.url) && eligible(item)).sort(rank)[0];
  const remaining = catalog.filter(eligible).sort(rank);
  const result: { item: LllLink; reason: string }[] = [];
  const seen = new Set<LllTopic>();
  if (personal) {
    result.push({ item: personal, reason: 'Từ link của bạn' });
    seen.add(personal.topic);
  }
  while (result.length < 3 && remaining.length) {
    const freshTopic = remaining.findIndex((item) => !seen.has(item.topic));
    const [item] = remaining.splice(Math.max(0, freshTopic), 1);
    seen.add(item.topic);
    result.push({ item, reason: preferred.has(item.topic) ? 'Theo sở thích của bạn' : 'Gợi ý từ LLL' });
  }
  return result;
}
