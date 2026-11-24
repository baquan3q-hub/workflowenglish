import type { ProfileInterest, ProfileLevel } from './learningProfileLogic';

export const LLL_TOPICS = {
  tech: 'Công nghệ & AI',
  skills: 'Học tập & tư duy',
  life: 'Khoa học & đời sống',
  society: 'Xã hội & văn hóa',
  work: 'Công việc & kinh doanh',
  planet: 'Môi trường',
  health: 'Sức khỏe & tâm lý',
} as const;
export type LllTopic = keyof typeof LLL_TOPICS;
/** Topics the first lll_library migration accepts; the rest need the lll_ai migration. */
export const LLL_LEGACY_TOPICS: readonly LllTopic[] = ['tech', 'skills', 'life'];
export const legacyTopic = (topic: LllTopic): LllTopic => (LLL_LEGACY_TOPICS.includes(topic) ? topic : topic === 'work' ? 'skills' : 'life');

export const LLL_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;
export type LllLevel = (typeof LLL_LEVELS)[number];
export const LLL_KINDS = { article: 'Bài báo', perspective: 'Góc nhìn', explainer: 'Giải thích', video: 'Video' } as const;
export type LllKind = keyof typeof LLL_KINDS;
export const LLL_DIFFICULTY = { easy: 'Dễ', fit: 'Vừa sức', stretch: 'Thử thách' } as const;
export type LllDifficulty = keyof typeof LLL_DIFFICULTY;
export type LllOrigin = 'catalog' | 'ai' | 'user';

export type LllLanguage = 'vi' | 'en';
export interface LllLink {
  url: string;
  title: string;
  topic: LllTopic;
  language: LllLanguage;
  minutes: number | null;
  level?: LllLevel | null;
  kind?: LllKind | null;
  publisher?: string | null;
  origin?: LllOrigin | null;
}
export interface LllEditorial extends LllLink {
  language: 'en';
  minutes: number;
  publisher: string;
  description: string;
  level: LllLevel;
  kind: LllKind;
}
export interface LllEntry extends LllLink {
  saved: boolean;
  finished: boolean;
  note: string;
  updated_at: string;
}
export interface LllPick {
  item: LllLink;
  reason: string;
}

export const isLllLevel = (v: unknown): v is LllLevel => LLL_LEVELS.includes(v as LllLevel);
export const isLllKind = (v: unknown): v is LllKind => typeof v === 'string' && Object.hasOwn(LLL_KINDS, v);
export const isLllTopic = (v: unknown): v is LllTopic => typeof v === 'string' && Object.hasOwn(LLL_TOPICS, v);

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

export const INTEREST_TOPICS: Record<ProfileInterest, LllTopic> = {
  technology: 'tech', business: 'work', education: 'skills', science: 'life', environment: 'planet', health: 'health',
  travel: 'society', food: 'society', film: 'society', music: 'society', sports: 'society', games: 'society',
};

/** The reading level LLL aims at for a self-assessed profile level (B1 when unknown). */
export function lllBaseLevel(level: ProfileLevel | null | undefined): LllLevel {
  if (level === 'A1' || level === 'A2') return 'A2';
  if (level === 'C1' || level === 'C2') return 'C1';
  return level ?? 'B1';
}

export function lllTargetLevel(base: LllLevel, difficulty: LllDifficulty): LllLevel {
  const i = LLL_LEVELS.indexOf(base) + (difficulty === 'easy' ? -1 : difficulty === 'stretch' ? 1 : 0);
  return LLL_LEVELS[Math.min(LLL_LEVELS.length - 1, Math.max(0, i))];
}

const levelGap = (a: LllLevel, b: LllLevel) => Math.abs(LLL_LEVELS.indexOf(a) - LLL_LEVELS.indexOf(b));

function dailyRank(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export interface LllFilters {
  minutes: number;
  topic: LllTopic | 'all';
  /** Reading level to aim at; editorial picks at this level come first, then one step either side. */
  level?: LllLevel;
}

/**
 * Three picks for the day: at most one of the learner's own unfinished links,
 * then catalog items that fit the time, topic and level, spread across topics.
 * Stable within a day.
 */
export function pickLllToday(
  catalog: readonly LllEditorial[], entries: readonly LllEntry[], interests: readonly ProfileInterest[],
  filters: LllFilters, day: string,
): LllPick[] {
  const states = new Map(entries.map((entry) => [entry.url, entry]));
  const editorialUrls = new Set(catalog.map((item) => item.url));
  const preferred = new Set(interests.map((interest) => INTEREST_TOPICS[interest]));
  const eligible = (item: LllLink) => item.minutes != null && item.minutes <= filters.minutes
    && (filters.topic === 'all' || item.topic === filters.topic)
    && !states.get(item.url)?.finished;
  const gap = (item: LllLink) => (filters.level && item.level ? levelGap(filters.level, item.level) : 0);
  const rank = (a: LllLink, b: LllLink) =>
    gap(a) - gap(b)
    || Number(preferred.has(b.topic)) - Number(preferred.has(a.topic))
    || dailyRank(`${day}:${a.url}`) - dailyRank(`${day}:${b.url}`);
  const personal = entries.filter((item) => item.saved && !editorialUrls.has(item.url) && eligible(item)).sort(rank)[0];
  const inBand = catalog.filter((item) => eligible(item) && item.language === 'en' && gap(item) <= 1);
  const remaining = (inBand.length >= 3 ? inBand : catalog.filter((item) => eligible(item) && item.language === 'en')).sort(rank);
  const result: LllPick[] = [];
  const seen = new Set<LllTopic>();
  if (personal) {
    result.push({ item: personal, reason: 'Từ link của bạn' });
    seen.add(personal.topic);
  }
  while (result.length < 3 && remaining.length) {
    const freshTopic = remaining.findIndex((item) => !seen.has(item.topic));
    const [item] = remaining.splice(Math.max(0, freshTopic), 1);
    seen.add(item.topic);
    result.push({ item, reason: pickReason(item, preferred.has(item.topic), filters.level) });
  }
  return result;
}

function pickReason(item: LllLink, preferred: boolean, target?: LllLevel): string {
  const parts = [preferred ? `Hợp sở thích ${LLL_TOPICS[item.topic].charAt(0).toLowerCase()}${LLL_TOPICS[item.topic].slice(1)}` : 'Mở rộng chủ đề mới'];
  if (item.level && target) {
    const d = LLL_LEVELS.indexOf(item.level) - LLL_LEVELS.indexOf(target);
    parts.push(d === 0 ? `vừa mức ${item.level}` : d < 0 ? `dễ đọc (${item.level})` : `hơi thử thách (${item.level})`);
  }
  return parts.join(' · ');
}

/** Lowercase, no Vietnamese accents, đ → d. */
export function foldLll(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

/**
 * Catalog items matching a free-text request (Vietnamese or English, accents
 * optional), best first. Each word of the query must appear in the title,
 * description, publisher or topic name; a few filler words are ignored.
 */
export function searchLllCatalog(catalog: readonly LllEditorial[], query: string, limit = 5): LllEditorial[] {
  const stop = new Set(['bai', 've', 'va', 'cac', 'nhung', 'mot', 'cho', 'toi', 'doc', 'muon', 'cua', 'voi', 'trong', 'the', 'a', 'an', 'of', 'about', 'and', 'in', 'on', 'to', 'for']);
  const tokens = (text: string) => foldLll(text).split(/[^a-z0-9]+/).filter(Boolean);
  const words = [...new Set(tokens(query).filter((w) => w.length > 1 && !stop.has(w)))];
  if (!words.length) return [];
  // More than half of the meaningful words must match. Short words (Vietnamese syllables) match whole
  // words only, so "ngu" does not hit "nguoi"; longer ones may match inside a word ("sleep" → "sleeping").
  const need = Math.floor(words.length / 2) + 1;
  const hit = (w: string, text: string, set: Set<string>) => set.has(w) || (w.length >= 4 && text.includes(w));
  const scored = catalog.map((item) => {
    const title = tokens(item.title);
    const rest = tokens(`${item.description} ${item.publisher} ${LLL_TOPICS[item.topic]} ${LLL_KINDS[item.kind]}`);
    const titleSet = new Set(title);
    const restSet = new Set(rest);
    let score = 0;
    let matched = 0;
    for (const w of words) {
      if (hit(w, title.join(' '), titleSet)) { score += 2; matched += 1; }
      else if (hit(w, rest.join(' '), restSet)) { score += 1; matched += 1; }
    }
    return { item, score: matched >= need ? score : 0 };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
}

/** Items finished and words saved in the last 7 days. */
export function lllWeeklyStats(entries: readonly LllEntry[], words: readonly { at: string }[], now: Date): { read: number; words: number } {
  const since = now.getTime() - 7 * 24 * 3600 * 1000;
  const recent = (iso: string) => Date.parse(iso) >= since;
  return { read: entries.filter((e) => e.finished && recent(e.updated_at)).length, words: words.filter((w) => recent(w.at)).length };
}
