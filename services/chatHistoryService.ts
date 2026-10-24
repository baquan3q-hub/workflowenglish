/**
 * Saved IELTS Mentor conversations, per user, in this browser's storage.
 * File data is dropped before saving (see messagesForStorage); when storage
 * is full the oldest conversations go first.
 */
import {
  messagesForStorage,
  titleFrom,
  upsertConversation,
  type ChatMessage,
  type ModePref,
  type StoredConversation,
} from './chatLogic';

const key = (userId: string) => `wf-ielts-chat:v1:${userId}`;
const PREF_KEY = 'wf-ielts-chat:prefs';

export function loadConversations(userId: string): StoredConversation[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((c): c is StoredConversation => c && typeof c.id === 'string' && Array.isArray(c.messages))
      : [];
  } catch {
    return [];
  }
}

function write(userId: string, list: StoredConversation[]): StoredConversation[] {
  let items = list;
  // Storage full: drop the oldest until it fits (or nothing is left).
  while (true) {
    try {
      localStorage.setItem(key(userId), JSON.stringify(items));
      return items;
    } catch {
      if (items.length <= 1) return items;
      items = items.slice(0, -1);
    }
  }
}

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
  return write(userId, upsertConversation(list, conv));
}

export function renameConversation(userId: string, id: string, title: string): StoredConversation[] {
  const list = loadConversations(userId).map((c) => (c.id === id ? { ...c, title: title.trim().slice(0, 80) || c.title } : c));
  return write(userId, list);
}

export function deleteConversation(userId: string, id: string): StoredConversation[] {
  return write(userId, loadConversations(userId).filter((c) => c.id !== id));
}

export function clearConversations(userId: string): StoredConversation[] {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
  return [];
}

export interface ChatPrefs {
  mode: ModePref;
  useData: boolean;
}

const DEFAULT_PREFS: ChatPrefs = { mode: 'auto', useData: true };

export function loadPrefs(): ChatPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
    return {
      mode: ['auto', 'quick', 'standard', 'deep'].includes(p.mode) ? p.mode : DEFAULT_PREFS.mode,
      useData: typeof p.useData === 'boolean' ? p.useData : DEFAULT_PREFS.useData,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ChatPrefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
