import { describe, expect, it } from 'vitest';
import { LLL_CATALOG } from '../../data/lllCatalog';
import { LLL_TOPICS, lllYoutubeId, normalizeLllUrl, pickLllToday, type LllEntry } from '../lllLogic';

const date = '2026-11-05';
const defaults = { minutes: 10, language: 'all', topic: 'all' } as const;
const entry = (url: string, patch: Partial<LllEntry> = {}): LllEntry => ({
  url, title: 'My link', language: 'vi', topic: 'tech', minutes: 3, saved: true, finished: false, note: '', updated_at: date, ...patch,
});

describe('LLL catalog and links', () => {
  it('has canonical, unique URLs and both languages and formats in every topic', () => {
    expect(LLL_CATALOG.length).toBeGreaterThanOrEqual(24);
    expect(new Set(LLL_CATALOG.map((item) => item.url)).size).toBe(LLL_CATALOG.length);
    for (const item of LLL_CATALOG) expect(normalizeLllUrl(item.url)).toBe(item.url);
    for (const topic of Object.keys(LLL_TOPICS)) {
      for (const language of ['vi', 'en']) {
        const group = LLL_CATALOG.filter((item) => item.topic === topic && item.language === language);
        expect(group.some((item) => lllYoutubeId(new URL(item.url)))).toBe(true);
        expect(group.some((item) => !lllYoutubeId(new URL(item.url)))).toBe(true);
      }
    }
  });

  it('normalizes tracking links and YouTube variants and rejects unsafe URLs', () => {
    expect(normalizeLllUrl('https://youtu.be/TjPFZaMe2yw?si=abc')).toBe('https://www.youtube.com/watch?v=TjPFZaMe2yw');
    expect(normalizeLllUrl('https://example.org/article?part=2&utm_source=s#top')).toBe('https://example.org/article?part=2');
    for (const url of ['http://example.org', 'javascript:alert(1)', 'https://user@example.org', 'https://']) {
      expect(normalizeLllUrl(url)).toBeNull();
    }
    expect(lllYoutubeId(new URL('https://youtube.com.example.org/watch?v=TjPFZaMe2yw'))).toBeNull();
  });
});

describe('Bản chọn hôm nay', () => {
  it('offers a stable, finite, diverse set and applies strict filters', () => {
    const first = pickLllToday(LLL_CATALOG, [], [], defaults, date);
    expect(first).toHaveLength(3);
    expect(new Set(first.map(({ item }) => item.topic)).size).toBe(3);
    expect(pickLllToday(LLL_CATALOG, [], [], defaults, date)).toEqual(first);
    const limited = pickLllToday(LLL_CATALOG, [], ['technology'], { minutes: 5, language: 'en', topic: 'tech' }, date);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited.every(({ item }) => item.language === 'en' && item.topic === 'tech' && item.minutes! <= 5)).toBe(true);
    expect(pickLllToday([], [], [], defaults, date)).toEqual([]);
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
