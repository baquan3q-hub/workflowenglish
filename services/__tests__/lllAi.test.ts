import { describe, expect, it, vi } from 'vitest';
import { discoverToLink, getLllCompanion, getLllWordLog, logLllWords } from '../lllAi';

const companion = { readable: true, summaryVi: ['a', 'b', 'c'], perspectiveVi: 'p', words: [], questions: ['Why?'] };

describe('getLllCompanion', () => {
  it('reads the shared file the proxy points to and remembers it', async () => {
    const api = vi.fn(async () => ({ url: 'https://cdn.example/v1/x.json', cached: true })) as never;
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(companion)));
    expect(await getLllCompanion('https://a.org/1', 'T', 'B1', api, fetchFn)).toEqual(companion);
    expect(await getLllCompanion('https://a.org/1', 'T', 'B1', api, fetchFn)).toEqual(companion);
    expect(api).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('https://cdn.example/v1/x.json');
  });

  it('asks again after a failure or an unreadable page', async () => {
    const api = vi.fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ readable: false, summaryVi: [], perspectiveVi: '', words: [], questions: [] })
      .mockResolvedValueOnce(companion);
    await expect(getLllCompanion('https://a.org/2', 'T', 'B1', api as never)).rejects.toThrow('down');
    await Promise.resolve();
    expect((await getLllCompanion('https://a.org/2', 'T', 'B1', api as never)).readable).toBe(false);
    await Promise.resolve();
    expect(await getLllCompanion('https://a.org/2', 'T', 'B1', api as never)).toEqual(companion);
    expect(api).toHaveBeenCalledTimes(3);
  });
});

describe('LLL word log', () => {
  it('appends saved words and drops entries older than 30 days', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    logLllWords('u1', 2, new Date('2026-10-01T00:00:00Z'), storage);
    logLllWords('u1', 3, new Date('2026-11-24T00:00:00Z'), storage);
    logLllWords('u1', 0, new Date('2026-11-24T00:00:00Z'), storage);
    expect(getLllWordLog('u1', storage)).toHaveLength(3);
    expect(getLllWordLog('u2', storage)).toEqual([]);
    store.set('lll-words-v1:u3', 'not json');
    expect(getLllWordLog('u3', storage)).toEqual([]);
  });
});

it('turns an AI find into an English link marked as from the AI', () => {
  expect(discoverToLink({
    url: 'https://a.org/x', title: 'X', publisher: 'A', kind: 'perspective', level: 'B2', minutes: 7, topic: 'work', reasonVi: 'r', stanceVi: '',
  })).toEqual({ url: 'https://a.org/x', title: 'X', topic: 'work', language: 'en', minutes: 7, level: 'B2', kind: 'perspective', publisher: 'A', origin: 'ai' });
});
