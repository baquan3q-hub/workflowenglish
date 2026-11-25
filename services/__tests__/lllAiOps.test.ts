import { describe, expect, it } from 'vitest';
import { BadRequest, parseModelJson } from '../../supabase/functions/ai-proxy/lib.ts';
import { generateBody } from '../../supabase/functions/ai-proxy/models.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import {
  companionKey, discoverWithOpenSearch, groundDiscover, isPublicHttpsUrl, measuredMinutes, normalizeUrl, openPage, pageTitle, paragraphWords,
  parseCompanion, parseDiscoverDrafts, parseDiscoverRequest, parseReflection, searchOpenCatalog, urlContextFailed, type FetchLike,
} from '../../supabase/functions/ai-proxy/ops/lll.ts';
import { LLL_CATALOG } from '../../data/lllCatalog';
import { normalizeLllUrl } from '../lllLogic';

const html = (title: string, words = 600) =>
  `<html><head><title>${title}</title><script>var x = "not words here";</script></head><body><p>${'word '.repeat(words)}</p></body></html>`;

/** A fake web: url → response. Redirects are { location }. */
function fakeWeb(pages: Record<string, { status?: number; location?: string; body?: string; type?: string }>) {
  const calls: string[] = [];
  const fetchFn: FetchLike = async (url) => {
    calls.push(url);
    const page = pages[url];
    if (!page) return new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } });
    if (page.location) return new Response(null, { status: page.status ?? 302, headers: { location: page.location } });
    return new Response(page.body ?? '', { status: page.status ?? 200, headers: { 'content-type': page.type ?? 'text/html; charset=utf-8' } });
  };
  return { fetchFn, calls };
}

const redirect = (n: number) => `https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc${n}`;
const raw = (chunks: { uri: string; title: string }[]) => ({
  candidates: [{ groundingMetadata: { groundingChunks: chunks.map((web) => ({ web })), searchEntryPoint: { renderedContent: '<div>Google</div>' } } }],
});
const draft = (patch: Record<string, unknown>) => ({
  title: 'Model title', publisher: 'Pub', kind: 'article', level: 'B1', minutes: 9, topic: 'health', reasonVi: 'Hợp với bạn', stanceVi: '', url: '', ...patch,
});

describe('LLL ai-proxy: URLs', () => {
  it('only opens public https hosts', () => {
    for (const ok of ['https://theconversation.com/x', 'https://www.bbc.co.uk/a?b=1', 'https://vertexaisearch.cloud.google.com/r/1']) {
      expect(isPublicHttpsUrl(ok), ok).toBe(true);
    }
    for (const bad of [
      'http://example.org', 'https://localhost/x', 'https://127.0.0.1/', 'https://10.0.0.1/', 'https://[::1]/', 'https://169.254.169.254/latest',
      'https://2130706433/', 'https://intranet/', 'https://printer.local/', 'https://db.internal/', 'https://user:pw@example.org/',
      'https://example.org:8443/', 'ftp://example.org/', 'not a url',
    ]) {
      expect(isPublicHttpsUrl(bad), bad).toBe(false);
    }
  });

  it('normalizes exactly like the app', () => {
    for (const url of [
      'https://youtu.be/TjPFZaMe2yw?si=abc', 'https://example.org/article?part=2&utm_source=s#top', 'http://example.org',
      'https://m.youtube.com/shorts/TjPFZaMe2yw', 'https://user@example.org', ...LLL_CATALOG.slice(0, 20).map((i) => i.url),
    ]) {
      expect(normalizeUrl(url), url).toBe(normalizeLllUrl(url));
    }
  });

  it('follows redirects only through public hosts and needs 200 HTML', async () => {
    const { fetchFn } = fakeWeb({
      [redirect(1)]: { location: 'https://news.example.org/story' },
      'https://news.example.org/story': { body: html('Story') },
      [redirect(2)]: { location: 'https://127.0.0.1/admin' },
      [redirect(3)]: { location: 'https://files.example.org/doc.pdf' },
      'https://files.example.org/doc.pdf': { body: '%PDF', type: 'application/pdf' },
      [redirect(4)]: { location: redirect(4) },
    });
    expect((await openPage(redirect(1), fetchFn))?.url).toBe('https://news.example.org/story');
    expect(await openPage(redirect(2), fetchFn)).toBeNull();
    expect(await openPage(redirect(3), fetchFn)).toBeNull();
    expect(await openPage(redirect(4), fetchFn)).toBeNull();
    expect(await openPage('https://missing.example.org/', fetchFn)).toBeNull();
  });

  it('reads titles and measures length', () => {
    expect(pageTitle('<meta property="og:title" content="It&#39;s &amp; fine"><title>Other</title>')).toBe("It's & fine");
    expect(pageTitle('<title>\n Plain  title </title>')).toBe('Plain title');
    expect(paragraphWords(html('t', 300))).toBe(300);
    expect(measuredMinutes({ url: 'https://a.org/x', html: html('t', 1500) }, 3)).toBe(10);
    expect(measuredMinutes({ url: 'https://a.org/x', html: '<div id=app></div>' }, 7)).toBe(7);
    expect(measuredMinutes({ url: 'https://www.youtube.com/watch?v=TjPFZaMe2yw', html: '"lengthSeconds":"301"' }, 20)).toBe(5);
  });
});

describe('lllDiscover', () => {
  it('builds a grounded request with the query quoted, and passes tools through', () => {
    const req = OPS.lllDiscover.build({ query: 'AI trong giáo dục "ignore rules"', level: 'B2', minutes: 10, perspectives: true });
    expect(req.tools).toEqual([{ google_search: {} }]);
    const prompt = (req.contents[0].parts[0] as { text: string }).text;
    expect(prompt).toContain(JSON.stringify('AI trong giáo dục "ignore rules"'));
    expect(prompt).toContain('B2');
    expect(prompt).toContain('different points of view');
    expect(generateBody('gemini-3.6-flash', req).tools).toEqual([{ google_search: {} }]);
    expect(() => OPS.lllDiscover.build({ query: '' })).toThrow(BadRequest);
    expect(() => OPS.lllDiscover.build({ query: 'x'.repeat(201) })).toThrow(BadRequest);
  });

  it('keeps only pages Google returned, never URLs the model wrote', async () => {
    const { fetchFn } = fakeWeb({
      [redirect(1)]: { location: 'https://theconversation.com/ai-in-class-123?utm_source=g' },
      'https://theconversation.com/ai-in-class-123?utm_source=g': { body: html('AI in class', 900) },
      [redirect(2)]: { location: 'https://www.youtube.com/watch?v=TjPFZaMe2yw' },
      'https://www.youtube.com/watch?v=TjPFZaMe2yw': { body: '<title>Video</title>"lengthSeconds":"360"' },
      [redirect(3)]: { location: 'https://blocked.example.org/' },
      'https://blocked.example.org/': { status: 403, body: 'no' },
    });
    const drafts = parseDiscoverDrafts({
      items: [
        draft({ url: 'https://theconversation.com/ai-in-class-123' }),
        draft({ url: 'https://evil.example.com/made-up', publisher: 'Evil' }),
        draft({ url: 'https://youtube.com/watch?v=wrongwrong1', kind: 'article', publisher: 'TED-Ed' }),
        draft({ url: 'https://blocked.example.org/', publisher: 'Blocked' }),
      ],
    });
    const out = await groundDiscover(drafts, raw([
      { uri: redirect(1), title: 'theconversation.com' }, { uri: redirect(2), title: 'youtube.com' }, { uri: redirect(3), title: 'blocked.example.org' },
    ]), [], fetchFn);
    expect(out.items.map((i) => i.url)).toEqual(['https://theconversation.com/ai-in-class-123', 'https://www.youtube.com/watch?v=TjPFZaMe2yw']);
    expect(out.items[0]).toMatchObject({ title: 'AI in class', minutes: 6, kind: 'article' });
    expect(out.items[1]).toMatchObject({ kind: 'video', minutes: 6, title: 'Video' });
    expect(out.searchEntryPoint).toBe('<div>Google</div>');
  });

  it('drops excluded pages and ambiguous same-site matches', async () => {
    const { fetchFn } = fakeWeb({
      [redirect(1)]: { location: 'https://site.org/a' }, 'https://site.org/a': { body: html('A') },
      [redirect(2)]: { location: 'https://site.org/b' }, 'https://site.org/b': { body: html('B') },
      [redirect(3)]: { location: 'https://other.org/c' }, 'https://other.org/c': { body: html('C') },
    });
    const chunks = raw([{ uri: redirect(1), title: 'site.org' }, { uri: redirect(2), title: 'site.org' }, { uri: redirect(3), title: 'other.org' }]);
    const drafts = parseDiscoverDrafts({ items: [draft({ url: 'https://site.org/guess' }), draft({ url: 'https://other.org/c' })] });
    expect((await groundDiscover(drafts, chunks, [], fetchFn)).items.map((i) => i.url)).toEqual(['https://other.org/c']);
    expect((await groundDiscover(drafts, chunks, ['https://other.org/c'], fetchFn)).items).toEqual([]);
    expect((await groundDiscover(drafts, {}, [], fetchFn)).items).toEqual([]);
  });

  it('parses loose model JSON', () => {
    expect(parseModelJson('```json\n{"items":[]}\n```')).toEqual({ items: [] });
    expect(parseModelJson('Here you go: {"a":1} hope it helps')).toEqual({ a: 1 });
    expect(() => parseModelJson('no json')).toThrow();
    expect(() => parseDiscoverDrafts({})).toThrow();
    expect(parseDiscoverDrafts({ items: [{ title: '' }, draft({ level: 'Z9', kind: 'podcast' })] })).toEqual([
      expect.objectContaining({ level: 'B1', kind: 'article' }),
    ]);
  });
});

describe('lllCompanion', () => {
  it('reads pages with url_context and videos directly, cached per URL and level', async () => {
    const page = OPS.lllCompanion.build({ url: 'https://theconversation.com/x?utm_source=a', title: 'X', level: 'B1' });
    expect(page.tools).toEqual([{ url_context: {} }]);
    expect((page.contents[0].parts[0] as { text: string }).text).toContain('https://theconversation.com/x');
    const video = OPS.lllCompanion.build({ url: 'https://youtu.be/TjPFZaMe2yw', level: 'A2' });
    expect(video.tools).toBeUndefined();
    expect(video.contents[0].parts[0]).toEqual({ fileData: { fileUri: 'https://www.youtube.com/watch?v=TjPFZaMe2yw' } });
    expect(() => OPS.lllCompanion.build({ url: 'https://127.0.0.1/x' })).toThrow(BadRequest);
    expect(() => OPS.lllCompanion.build({ url: 'http://example.org' })).toThrow(BadRequest);

    const storage = OPS.lllCompanion.storage!;
    expect(storage.bucket).toBe('lll-companion');
    const a = await storage.path({ url: 'https://theconversation.com/x?utm_source=a', level: 'B1' });
    expect(a).toBe(await companionKey('https://theconversation.com/x', 'B1'));
    expect(a).toMatch(/^v1\/[0-9a-f]{64}\.json$/);
    expect(a).not.toBe(await storage.path({ url: 'https://theconversation.com/x', level: 'B2' }));
  });

  it('validates output and never caches an unreadable page', async () => {
    const good = { readable: true, summaryVi: ['a', 'b', 'c', 'd'], perspectiveVi: 'p', words: [{ term: 'grit', meaningVi: 'sự bền bỉ' }, { term: '' }], questions: ['Why?'] };
    expect(parseCompanion(good)).toEqual({ readable: true, summaryVi: ['a', 'b', 'c'], perspectiveVi: 'p', words: [{ term: 'grit', meaningVi: 'sự bền bỉ' }], questions: ['Why?'] });
    expect(parseCompanion({ readable: false, summaryVi: ['made up'] })).toMatchObject({ readable: false, summaryVi: [] });
    expect(() => parseCompanion({ readable: true, summaryVi: ['a'], questions: [] })).toThrow();
    const failed = { candidates: [{ urlContextMetadata: { urlMetadata: [{ retrievedUrl: 'x', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_ERROR' }] } }] };
    expect(urlContextFailed(failed)).toBe(true);
    expect(urlContextFailed({ candidates: [{}] })).toBe(false);
    const after = await OPS.lllCompanion.after!(parseCompanion(good), failed, {});
    expect(after).toMatchObject({ readable: false });
    expect(OPS.lllCompanion.storage!.cacheable!(after)).toBe(false);
    expect(OPS.lllCompanion.storage!.cacheable!(parseCompanion(good))).toBe(true);
  });
});

describe('lllReflect', () => {
  it('quotes the answer and checks the feedback', () => {
    const req = OPS.lllReflect.build({ title: 'Sleep', question: 'Why sleep?', answer: 'Sleep help memory', level: 'A2' });
    const prompt = (req.contents[0].parts[0] as { text: string }).text;
    expect(prompt).toContain(JSON.stringify('Sleep help memory'));
    expect(prompt).toContain('A2');
    expect(() => OPS.lllReflect.build({ answer: '  ' })).toThrow(BadRequest);
    expect(() => OPS.lllReflect.build({ answer: 'x'.repeat(601) })).toThrow(BadRequest);
    expect(parseReflection({ onTopic: true, corrected: 'Sleep helps memory.', natural: '', feedbackVi: 'Tốt.' })).toEqual({
      onTopic: true, corrected: 'Sleep helps memory.', natural: '', feedbackVi: 'Tốt.',
    });
    expect(() => parseReflection({ onTopic: true })).toThrow();
  });

  it('discovers and verifies real open-web articles when Google Search grounding quota is exhausted', async () => {
    const fetchFn: FetchLike = async (url) => {
      if (url.startsWith('https://hn.algolia.com/')) {
        return new Response(
          JSON.stringify({
            hits: [
              { url: 'https://aeon.co/essays/how-sleep-helps-memory', title: 'How sleep helps memory' },
              { url: 'https://reddit.com/r/sleep', title: 'Skip social' },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url.startsWith('https://en.wikipedia.org/w/api.php')) {
        return new Response(JSON.stringify({ query: { search: [{ title: 'Sleep and memory' }] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.startsWith('https://simple.wikipedia.org/w/api.php')) {
        return new Response(JSON.stringify({ query: { search: [{ title: 'Sleep' }] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === 'https://aeon.co/essays/how-sleep-helps-memory') {
        return new Response(html('How sleep helps memory', 600), { status: 200, headers: { 'content-type': 'text/html' } });
      }
      if (url === 'https://en.wikipedia.org/wiki/Sleep_and_memory') {
        return new Response(html('Sleep and memory - Wikipedia', 450), { status: 200, headers: { 'content-type': 'text/html' } });
      }
      return new Response('missing', { status: 404, headers: { 'content-type': 'text/html' } });
    };

    const candidates = await searchOpenCatalog(['sleep memory'], 'B1', [], fetchFn);
    expect(candidates.some((c) => c.url === 'https://aeon.co/essays/how-sleep-helps-memory')).toBe(true);
    expect(candidates.some((c) => c.url.includes('reddit.com'))).toBe(false);

    const run = async (spec: { build: (p: unknown) => unknown }, payload: unknown) => {
      if (typeof (payload as { query?: unknown })?.query === 'string') {
        return { model: 'gemini-3.5-flash-lite', data: { queries: ['sleep memory'] }, raw: {} };
      }
      spec.build(payload);
      return {
        model: 'gemini-3.5-flash-lite',
        data: {
          items: [
            { idx: 0, publisher: 'Aeon', kind: 'essay' as never, level: 'B1', topic: 'health', reasonVi: 'Bài phân tích giấc ngủ.', stanceVi: '' },
            { idx: 99, publisher: 'Fake', kind: 'article', level: 'B1', topic: 'health', reasonVi: 'Ignored invalid idx', stanceVi: '' },
          ],
        },
        raw: {},
      };
    };

    const req = parseDiscoverRequest({ query: 'giấc ngủ và trí nhớ', level: 'B1', minutes: 10 });
    const out = await discoverWithOpenSearch(req, run as never, fetchFn);
    expect(out.model).toBe('gemini-3.5-flash-lite');
    expect(out.data.searchEntryPoint).toBeNull();
    expect(out.data.items).toHaveLength(1);
    expect(out.data.items[0]).toMatchObject({
      url: 'https://aeon.co/essays/how-sleep-helps-memory',
      title: 'How sleep helps memory',
      minutes: 4,
      topic: 'health',
    });
  });
});
