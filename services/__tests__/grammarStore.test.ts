import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getDraft, getEvents, record, saveDraft, syncGrammar } from '../grammarStore';
import { makeSession, type Evidence } from '../grammarLogic';

const from = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { from } }));
const e: Evidence = {
  id: 'one',
  session: 'run',
  skill: 'be',
  item: 12,
  kind: 'translate',
  mode: 'lesson',
  version: 1,
  answer: 'My sister is a teacher.',
  at: '2026-11-24T10:00:00Z',
  result: 'pending',
  typedFallback: false,
  assisted: false,
};
beforeEach(() => {
  const values: Record<string, string> = {};
  vi.stubGlobal(
    'localStorage',
    Object.assign(values, {
      getItem: (k: string) => values[k] ?? null,
      setItem: (k: string, v: string) => {
        values[k] = v;
      },
      removeItem: (k: string) => {
        delete values[k];
      },
    })
  );
  from.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
it('keeps each draft and answer under its account and discards completed drafts', () => {
  const s = makeSession('lesson', 'be', [], 10);
  saveDraft('alice', s);
  record('alice', e);
  expect(getDraft('bob')).toBeNull();
  expect(getEvents('bob')).toEqual([]);
  expect(getDraft('alice')?.id).toBe(s.id);
  record('alice', { ...e, id: s.id, result: 'finished' });
  expect(getDraft('alice')).toBeNull();
});
it('retries failed writes and sends the final judgement once under the original id', async () => {
  const upsert = vi
    .fn()
    .mockResolvedValueOnce({ error: new Error('offline') })
    .mockResolvedValue({ error: null });
  from.mockReturnValue({ upsert });
  record('alice', e);
  await expect(syncGrammar('alice', false)).rejects.toThrow('offline');
  await syncGrammar('alice', false);
  record('alice', { ...e, result: 'correct' });
  await syncGrammar('alice', false);
  await syncGrammar('alice', false);
  expect(upsert.mock.calls.map(([rows]) => [rows[0].event_id, rows[0].revision])).toEqual([
    ['one', 0],
    ['one', 0],
    ['one', 1],
  ]);
  expect(getEvents('alice')).toHaveLength(1);
});
it('pulls remote history while preserving final grades over old pending rows', async () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi
      .fn()
      .mockResolvedValue({ error: null, data: [{ evidence: { ...e, result: 'correct' } }, { evidence: e }] }),
  };
  from.mockReturnValue(query);
  await syncGrammar('alice', true);
  expect(query.eq).toHaveBeenCalledWith('user_id', 'alice');
  expect(getEvents('alice').map((row) => row.result)).toEqual(['correct']);
});
