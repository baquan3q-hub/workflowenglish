import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationToRow, mergeConversations, rowToConversation, type ChatMessage, type StoredConversation } from '../chatLogic';

// ─── A tiny in-memory ai_chat_conversations ─────────────────────

type Row = { user_id: string; id: string; title: string; messages: unknown; created_at: string; updated_at: string };
const db = { rows: [] as Row[], missing: false, failing: false };
const missingError = { code: 'PGRST205', message: "Could not find the table 'public.ai_chat_conversations'" };

function query() {
  const filters: ((r: Row) => boolean)[] = [];
  let action: 'select' | 'delete' = 'select';
  const result = () => {
    if (db.missing) return { data: null, error: missingError };
    if (db.failing) return { data: null, error: { message: 'network' } };
    if (action === 'delete') {
      db.rows = db.rows.filter((r) => !filters.every((f) => f(r)));
      return { data: null, error: null };
    }
    const data = db.rows.filter((r) => filters.every((f) => f(r))).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { data, error: null };
  };
  const chain = {
    select: () => chain,
    delete: () => ((action = 'delete'), chain),
    eq: (col: keyof Row, v: string) => (filters.push((r) => r[col] === v), chain),
    in: (col: keyof Row, vs: string[]) => (filters.push((r) => vs.includes(r[col] as string)), chain),
    order: () => chain,
    limit: () => chain,
    upsert: (row: Row) => {
      if (db.missing) return Promise.resolve({ error: missingError });
      if (db.failing) return Promise.resolve({ error: { message: 'network' } });
      db.rows = [...db.rows.filter((r) => !(r.user_id === row.user_id && r.id === row.id)), row];
      return Promise.resolve({ error: null });
    },
    then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad),
  };
  return chain;
}

vi.mock('../supabaseClient', () => ({
  supabase: { from: () => query() },
  withTimeout: (p: Promise<unknown>) => p,
}));

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const msgs = (q: string): ChatMessage[] => [
  { id: 'u', role: 'user', content: q, timestamp: 1 },
  { id: 'a', role: 'assistant', content: 'trả lời', timestamp: 2 },
];
const flush = () => new Promise((r) => setTimeout(r, 0));

async function freshService() {
  vi.resetModules();
  return import('../chatHistoryService');
}

beforeEach(() => {
  db.rows = [];
  db.missing = false;
  db.failing = false;
  store.clear();
});

describe('conversation rows', () => {
  it('round-trips a conversation without file data', () => {
    const conv: StoredConversation = {
      id: 'c1',
      title: 'Hỏi',
      createdAt: Date.UTC(2026, 9, 1),
      updatedAt: Date.UTC(2026, 9, 2),
      messages: [{ id: 'u', role: 'user', content: 'x', timestamp: 1, attachments: [{ type: 'image', data: 'BIG', mimeType: 'image/png' }] }],
    };
    const row = conversationToRow(conv);
    expect((row.messages as ChatMessage[])[0].attachments?.[0].data).toBe('');
    expect(rowToConversation(row)).toMatchObject({ id: 'c1', title: 'Hỏi', createdAt: conv.createdAt, updatedAt: conv.updatedAt });
    expect(rowToConversation({ ...row, messages: 'nope' })).toBeNull();
  });

  it('keeps unsent local changes over older server copies', () => {
    const c = (id: string, updatedAt: number): StoredConversation => ({ id, title: id, createdAt: 0, updatedAt, messages: [] });
    const merged = mergeConversations([c('a', 5), c('b', 9), c('x', 1)], [c('a', 7), c('b', 3)], new Set(['a', 'b']));
    expect(merged.map((m) => [m.id, m.updatedAt])).toEqual([
      ['b', 9],
      ['a', 7],
    ]);
  });
});

describe('chat history service', () => {
  it('saves to the account and reads it back on another device', async () => {
    const svc = await freshService();
    svc.saveConversation('u1', 'c1', msgs('Lộ trình 6.5?'), 1000);
    await flush();
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ user_id: 'u1', id: 'c1', title: 'Lộ trình 6.5?' });

    store.clear(); // a new browser
    const other = await freshService();
    const list = await other.syncConversations('u1');
    expect(list.map((c) => c.id)).toEqual(['c1']);
    expect(other.loadConversations('u1')).toHaveLength(1);
  });

  it('uploads history saved before the table existed, once', async () => {
    db.missing = true;
    const svc = await freshService();
    svc.saveConversation('u1', 'old', msgs('cũ'), 1000);
    await flush();
    let seen: string | undefined;
    svc.onSyncStatus((s) => (seen = s));
    expect(seen).toBe('local');

    db.missing = false; // migration 013 has run
    const later = await freshService();
    await later.syncConversations('u1');
    expect(db.rows.map((r) => r.id)).toEqual(['old']);
  });

  it('keeps changes on the device when offline and sends them later', async () => {
    db.failing = true;
    const svc = await freshService();
    svc.saveConversation('u1', 'c2', msgs('offline'), 1000);
    svc.deleteConversation('u1', 'gone');
    await flush();
    expect(db.rows).toHaveLength(0);

    db.failing = false;
    db.rows.push({ user_id: 'u1', id: 'gone', title: 'x', messages: [], created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString() });
    const list = await svc.syncConversations('u1');
    expect(db.rows.map((r) => r.id)).toEqual(['c2']);
    expect(list.map((c) => c.id)).toEqual(['c2']);
  });

  it('only touches the signed-in user', async () => {
    db.rows.push({ user_id: 'other', id: 'c9', title: 'x', messages: [], created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString() });
    const svc = await freshService();
    svc.saveConversation('u1', 'c1', msgs('a'), 1);
    svc.clearConversations('u1');
    await flush();
    expect(db.rows.map((r) => r.user_id)).toEqual(['other']);
  });
});
