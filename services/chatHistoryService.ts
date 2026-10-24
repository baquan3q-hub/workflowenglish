/**
 * Saved IELTS Mentor conversations.
 *
 * The account copy lives in ai_chat_conversations (docs/migrations/013), so
 * history follows the learner across devices. This browser keeps a copy too:
 * the list opens instantly, works offline, and changes that could not reach
 * the server are remembered ("pending") and sent on the next sync.
 * Without the table (migration not run yet) everything stays in the browser.
 *
 * File data is dropped before saving (see messagesForStorage).
 */
import {
  conversationToRow,
  MAX_CONVERSATIONS,
  mergeConversations,
  messagesForStorage,
  rowToConversation,
  titleFrom,
  upsertConversation,
  type ChatMessage,
  type ConversationRow,
  type ModePref,
  type StoredConversation,
} from './chatLogic';
import { supabase, withTimeout } from './supabaseClient';

const TABLE = 'ai_chat_conversations';
const REMOTE_LIMIT = 100;
const key = (userId: string) => `wf-ielts-chat:v1:${userId}`;
const pendingKey = (userId: string) => `wf-ielts-chat:pending:${userId}`;
const deletedKey = (userId: string) => `wf-ielts-chat:deleted:${userId}`;
const migratedKey = (userId: string) => `wf-ielts-chat:migrated:${userId}`;
const PREF_KEY = 'wf-ielts-chat:prefs';

// ─── Sync status, for the history panel ─────────────────────────

/** synced: saved to the account · saving · offline: kept here, sent later · local: no table yet. */
export type SyncStatus = 'synced' | 'saving' | 'offline' | 'local';

let status: SyncStatus = 'saving';
let tableMissing = false;
const listeners = new Set<(s: SyncStatus) => void>();

function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((fn) => fn(s));
}

export function onSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

const isMissingTable = (err: { code?: string; message?: string } | null) =>
  !!err && (err.code === '42P01' || err.code === 'PGRST205' || /ai_chat_conversations/.test(err.message ?? ''));

// ─── Browser copy ───────────────────────────────────────────────

function readJson<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(k: string, value: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the server copy still counts */
  }
}

export function loadConversations(userId: string): StoredConversation[] {
  const parsed = readJson<unknown>(key(userId), []);
  return Array.isArray(parsed)
    ? parsed.filter((c): c is StoredConversation => !!c && typeof c.id === 'string' && Array.isArray(c.messages))
    : [];
}

function writeCache(userId: string, list: StoredConversation[]): StoredConversation[] {
  let items = list.slice(0, MAX_CONVERSATIONS);
  // Storage full: drop the oldest until it fits.
  while (items.length) {
    try {
      localStorage.setItem(key(userId), JSON.stringify(items));
      break;
    } catch {
      items = items.slice(0, -1);
    }
  }
  return list;
}

const getSet = (k: string) => new Set(readJson<string[]>(k, []));
const putSet = (k: string, s: Set<string>) => writeJson(k, [...s]);

function markPending(userId: string, id: string, on: boolean) {
  const s = getSet(pendingKey(userId));
  if (on) s.add(id);
  else s.delete(id);
  putSet(pendingKey(userId), s);
}

// ─── Server ─────────────────────────────────────────────────────

async function pushOne(userId: string, conv: StoredConversation): Promise<boolean> {
  if (tableMissing) return false;
  const { error } = await withTimeout(
    Promise.resolve(supabase.from(TABLE).upsert({ user_id: userId, ...conversationToRow(conv) }, { onConflict: 'user_id,id' })),
  );
  if (isMissingTable(error)) {
    tableMissing = true;
    setStatus('local');
    return false;
  }
  if (error) {
    console.warn('[ChatHistory] save failed, kept on this device', error.message);
    setStatus('offline');
    return false;
  }
  markPending(userId, conv.id, false);
  return true;
}

async function deleteRemote(userId: string, ids: string[] | 'all'): Promise<boolean> {
  if (tableMissing) return false;
  let q = supabase.from(TABLE).delete().eq('user_id', userId);
  if (ids !== 'all') q = q.in('id', ids);
  const { error } = await withTimeout(Promise.resolve(q));
  if (isMissingTable(error)) {
    tableMissing = true;
    setStatus('local');
    return false;
  }
  if (error) {
    setStatus('offline');
    return false;
  }
  return true;
}

function push(userId: string, conv: StoredConversation) {
  if (tableMissing) return;
  setStatus('saving');
  void pushOne(userId, conv).then((ok) => ok && setStatus('synced'));
}

/**
 * Brings this device and the account together: sends what is pending (and,
 * the first time, every conversation saved before the table existed), then
 * reads the account's list. Returns the list to show.
 */
export async function syncConversations(userId: string): Promise<StoredConversation[]> {
  const local = loadConversations(userId);
  if (tableMissing) return local;
  setStatus('saving');
  try {
    // Deletions made while offline.
    const deleted = getSet(deletedKey(userId));
    if (deleted.size && (await deleteRemote(userId, [...deleted]))) putSet(deletedKey(userId), new Set());
    if (tableMissing) return local;

    // First sync on this device: everything saved before counts as pending.
    const pending = getSet(pendingKey(userId));
    if (!readJson<boolean>(migratedKey(userId), false)) {
      local.forEach((c) => pending.add(c.id));
      putSet(pendingKey(userId), pending);
    }
    for (const c of local) if (pending.has(c.id)) await pushOne(userId, c);
    if (tableMissing) return local;
    writeJson(migratedKey(userId), true);

    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase
          .from(TABLE)
          .select('id, title, messages, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(REMOTE_LIMIT),
      ),
    );
    if (isMissingTable(error)) {
      tableMissing = true;
      setStatus('local');
      return local;
    }
    if (error) throw error;
    const remote = ((data ?? []) as ConversationRow[]).map(rowToConversation).filter((c): c is StoredConversation => c !== null);
    const merged = mergeConversations(local, remote, getSet(pendingKey(userId)));
    writeCache(userId, merged);
    setStatus(getSet(pendingKey(userId)).size ? 'offline' : 'synced');
    return merged;
  } catch (err) {
    console.warn('[ChatHistory] sync failed, showing this device', err);
    setStatus('offline');
    return local;
  }
}

// ─── Changes ────────────────────────────────────────────────────

/** Saves one conversation and returns the new list. Conversations without a question are not kept. */
export function saveConversation(userId: string, id: string, messages: ChatMessage[], createdAt: number): StoredConversation[] {
  const list = loadConversations(userId);
  if (!messages.some((m) => m.role === 'user')) return list;
  const conv: StoredConversation = {
    id,
    title: list.find((c) => c.id === id)?.title || titleFrom(messages),
    createdAt,
    updatedAt: Date.now(),
    messages: messagesForStorage(messages),
  };
  const next = writeCache(userId, upsertConversation(list, conv, REMOTE_LIMIT));
  markPending(userId, id, true);
  push(userId, conv);
  return next;
}

export function renameConversation(userId: string, id: string, title: string): StoredConversation[] {
  const list = loadConversations(userId).map((c) => (c.id === id ? { ...c, title: title.trim().slice(0, 80) || c.title, updatedAt: Date.now() } : c));
  writeCache(userId, list);
  const conv = list.find((c) => c.id === id);
  if (conv) {
    markPending(userId, id, true);
    push(userId, conv);
  }
  return list;
}

export function deleteConversation(userId: string, id: string): StoredConversation[] {
  const list = writeCache(userId, loadConversations(userId).filter((c) => c.id !== id));
  markPending(userId, id, false);
  if (!tableMissing) {
    setStatus('saving');
    void deleteRemote(userId, [id]).then((ok) => {
      if (ok) setStatus('synced');
      else if (!tableMissing) {
        const d = getSet(deletedKey(userId));
        d.add(id);
        putSet(deletedKey(userId), d);
      }
    });
  }
  return list;
}

export function clearConversations(userId: string): StoredConversation[] {
  const ids = loadConversations(userId).map((c) => c.id);
  writeCache(userId, []);
  putSet(pendingKey(userId), new Set());
  if (!tableMissing) {
    setStatus('saving');
    void deleteRemote(userId, 'all').then((ok) => {
      if (ok) setStatus('synced');
      else if (!tableMissing) putSet(deletedKey(userId), new Set([...getSet(deletedKey(userId)), ...ids]));
    });
  }
  return [];
}

// ─── Preferences (this browser only) ────────────────────────────

export interface ChatPrefs {
  mode: ModePref;
  useData: boolean;
}

const DEFAULT_PREFS: ChatPrefs = { mode: 'auto', useData: true };

export function loadPrefs(): ChatPrefs {
  const p = readJson<Partial<ChatPrefs>>(PREF_KEY, {});
  return {
    mode: (['auto', 'quick', 'standard', 'deep'] as const).includes(p.mode as ModePref) ? (p.mode as ModePref) : DEFAULT_PREFS.mode,
    useData: typeof p.useData === 'boolean' ? p.useData : DEFAULT_PREFS.useData,
  };
}

export function savePrefs(prefs: ChatPrefs): void {
  writeJson(PREF_KEY, prefs);
}
