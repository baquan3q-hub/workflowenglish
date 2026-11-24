import { describe, expect, it } from 'vitest';
import { LLL_CATALOG } from '../../data/lllCatalog';
import {
  LLL_KINDS, LLL_LEVELS, LLL_TOPICS, foldLll, isLllKind, isLllLevel, isLllTopic, legacyTopic, lllBaseLevel, lllTargetLevel,
  lllWeeklyStats, lllYoutubeId, normalizeLllUrl, pickLllToday, searchLllCatalog, type LllEntry, type LllTopic,
} from '../lllLogic';

const date = '2026-11-05';
const defaults = { minutes: 10, topic: 'all' } as const;
const entry = (url: string, patch: Partial<LllEntry> = {}): LllEntry => ({
  url, title: 'My link', language: 'vi', topic: 'tech', minutes: 3, saved: true, finished: false, note: '', updated_at: date, ...patch,
});

describe('LLL catalog', () => {
  it('has canonical, unique https URLs in English with valid metadata', () => {
    expect(LLL_CATALOG.length).toBeGreaterThanOrEqual(80);
    expect(new Set(LLL_CATALOG.map((item) => item.url)).size).toBe(LLL_CATALOG.length);
    for (const item of LLL_CATALOG) {
      expect(normalizeLllUrl(item.url)).toBe(item.url);
      expect(item.language).toBe('en');
      expect(isLllLevel(item.level) && isLllKind(item.kind) && isLllTopic(item.topic)).toBe(true);
      expect(item.minutes).toBeGreaterThan(0);
      expect(item.minutes).toBeLessThanOrEqual(30);
      expect(item.title.trim() && item.publisher.trim() && item.description.trim()).toBeTruthy();
      expect(item.kind === 'video').toBe(Boolean(lllYoutubeId(new URL(item.url))));
    }
  });

  it('covers every topic, level and kind', () => {
    for (const topic of Object.keys(LLL_TOPICS)) {
      const group = LLL_CATALOG.filter((item) => item.topic === topic);
      expect(group.length, topic).toBeGreaterThanOrEqual(8);
      expect(new Set(group.map((item) => item.level)).size, topic).toBeGreaterThanOrEqual(3);
    }
    for (const level of LLL_LEVELS) expect(LLL_CATALOG.filter((item) => item.level === level).length, level).toBeGreaterThanOrEqual(8);
    for (const kind of Object.keys(LLL_KINDS)) expect(LLL_CATALOG.some((item) => item.kind === kind), kind).toBe(true);
  });
});

describe('LLL links and levels', () => {
  it('normalizes tracking links and YouTube variants and rejects unsafe URLs', () => {
    expect(normalizeLllUrl('https://youtu.be/TjPFZaMe2yw?si=abc')).toBe('https://www.youtube.com/watch?v=TjPFZaMe2yw');
    expect(normalizeLllUrl('https://example.org/article?part=2&utm_source=s#top')).toBe('https://example.org/article?part=2');
    for (const url of ['http://example.org', 'javascript:alert(1)', 'https://user@example.org', 'https://']) {
      expect(normalizeLllUrl(url)).toBeNull();
    }
    expect(lllYoutubeId(new URL('https://youtube.com.example.org/watch?v=TjPFZaMe2yw'))).toBeNull();
  });

  it('maps profile levels and difficulty to a reading level', () => {
    expect(lllBaseLevel(null)).toBe('B1');
    expect(lllBaseLevel('A1')).toBe('A2');
    expect(lllBaseLevel('C2')).toBe('C1');
    expect(lllBaseLevel('B2')).toBe('B2');
    expect(lllTargetLevel('B1', 'easy')).toBe('A2');
    expect(lllTargetLevel('B1', 'stretch')).toBe('B2');
    expect(lllTargetLevel('A2', 'easy')).toBe('A2');
    expect(lllTargetLevel('C1', 'stretch')).toBe('C1');
  });

  it('maps new topics onto the ones the first migration accepts', () => {
    const cases: [LllTopic, LllTopic][] = [['tech', 'tech'], ['skills', 'skills'], ['life', 'life'], ['work', 'skills'], ['health', 'life'], ['planet', 'life'], ['society', 'life']];
    for (const [topic, legacy] of cases) expect(legacyTopic(topic)).toBe(legacy);
  });
});

describe('Bản chọn hôm nay', () => {
  it('offers a stable, diverse set that respects time and topic', () => {
    const first = pickLllToday(LLL_CATALOG, [], [], defaults, date);
    expect(first).toHaveLength(3);
    expect(new Set(first.map(({ item }) => item.topic)).size).toBe(3);
    expect(pickLllToday(LLL_CATALOG, [], [], defaults, date)).toEqual(first);
    const limited = pickLllToday(LLL_CATALOG, [], ['technology'], { minutes: 5, topic: 'tech' }, date);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited.every(({ item }) => item.topic === 'tech' && item.minutes! <= 5)).toBe(true);
    expect(pickLllToday([], [], [], defaults, date)).toEqual([]);
  });

  it('keeps picks within one level of the target when enough exist', () => {
    for (const level of LLL_LEVELS) {
      const picks = pickLllToday(LLL_CATALOG, [], [], { minutes: 30, topic: 'all', level }, date);
      expect(picks).toHaveLength(3);
      for (const { item } of picks) {
        expect(Math.abs(LLL_LEVELS.indexOf(item.level!) - LLL_LEVELS.indexOf(level))).toBeLessThanOrEqual(1);
      }
      expect(picks[0].item.level).toBe(level);
    }
  });

  it('widens the level band rather than returning too few picks', () => {
    const tiny = LLL_CATALOG.filter((item) => item.level === 'A2').slice(0, 1).concat(LLL_CATALOG.filter((item) => item.level === 'C1').slice(0, 3));
    expect(pickLllToday(tiny, [], [], { minutes: 30, topic: 'all', level: 'A2' }, date)).toHaveLength(3);
  });

  it('prefers the learner’s interests and explains each pick', () => {
    const picks = pickLllToday(LLL_CATALOG, [], ['health'], { minutes: 30, topic: 'all', level: 'B1' }, date);
    expect(picks[0].item.topic).toBe('health');
    expect(picks[0].reason).toContain('Hợp sở thích');
    expect(picks[0].reason).toContain('B1');
  });

  it('only recommends English from the catalog', () => {
    const vi = { ...LLL_CATALOG[0], url: 'https://example.org/vi', language: 'vi' } as unknown as (typeof LLL_CATALOG)[number];
    const picks = pickLllToday([vi, ...LLL_CATALOG], [], [], { minutes: 30, topic: 'all' }, date);
    expect(picks.every(({ item }) => item.language === 'en')).toBe(true);
  });

  it('includes at most one eligible private link and excludes finished or untimed items', () => {
    const editorial = LLL_CATALOG.find((item) => item.minutes <= 10)!;
    const entries = [
      entry('https://example.org/first'), entry('https://example.org/second'),
      entry('https://example.org/finished', { finished: true }), entry('https://example.org/untimed', { minutes: null }),
      entry(editorial.url, { finished: true }),
    ];
    const items = pickLllToday(LLL_CATALOG, entries, ['technology'], defaults, date);
    expect(items.filter(({ reason }) => reason === 'Từ link của bạn')).toHaveLength(1);
    expect(items.every(({ item }) => item.minutes != null && !entries.find((e) => e.url === item.url)?.finished)).toBe(true);
    expect(items.every(({ item }) => item.url !== editorial.url)).toBe(true);
  });
});

describe('Tìm trong kho', () => {
  it('folds Vietnamese accents', () => {
    expect(foldLll('Giấc ngủ Đêm')).toBe('giac ngu dem');
  });

  it('finds items by English or Vietnamese words, title matches first', () => {
    const sleep = searchLllCatalog(LLL_CATALOG, 'sleep');
    expect(sleep.length).toBeGreaterThan(0);
    expect(foldLll(sleep[0].title)).toContain('sleep');
    expect(searchLllCatalog(LLL_CATALOG, 'bài về giấc ngủ').some((item) => /sleep/i.test(item.title))).toBe(true);
    expect(searchLllCatalog(LLL_CATALOG, 'giac ngu').length).toBeGreaterThan(0);
    expect(searchLllCatalog(LLL_CATALOG, 'stress', 2).length).toBeLessThanOrEqual(2);
  });

  it('needs more than half of the meaningful words, matched as whole Vietnamese syllables', () => {
    expect(searchLllCatalog(LLL_CATALOG, 'bài về')).toEqual([]);
    expect(searchLllCatalog(LLL_CATALOG, 'sleep zzzqqq')).toEqual([]);
    expect(searchLllCatalog(LLL_CATALOG, 'giấc ngủ và trí nhớ').some((item) => item.title === 'Sleep is your superpower')).toBe(true);
    expect(searchLllCatalog(LLL_CATALOG, 'ngu').every((item) => /\bngu\b/.test(foldLll(`${item.title} ${item.description}`)))).toBe(true);
  });
});

describe('Thống kê tuần', () => {
  it('counts items finished and words saved in the last 7 days', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    const entries = [
      entry('https://a.org', { finished: true, updated_at: '2026-11-23T00:00:00Z' }),
      entry('https://b.org', { finished: true, updated_at: '2026-11-10T00:00:00Z' }),
      entry('https://c.org', { finished: false, updated_at: '2026-11-23T00:00:00Z' }),
    ];
    const words = [{ at: '2026-11-20T00:00:00Z' }, { at: '2026-11-01T00:00:00Z' }];
    expect(lllWeeklyStats(entries, words, now)).toEqual({ read: 1, words: 1 });
  });
});
