/**
 * Word List Service — user-made word lists ("Bộ từ của tôi"), tables from
 * docs/migrations/006_word_lists.sql. A list only references word_mastery
 * rows, so deleting a list never touches words or SRS progress.
 *
 * Before migration 006 is applied the tables are missing: reads return an
 * empty result with `available: false` and writes throw a readable error.
 */

import { supabase, withTimeout } from './supabaseClient';

export interface WordList {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  /** word_mastery ids in the list. */
  wordIds: string[];
}

/** The eight list colours (Tailwind bg classes, written out for the CDN compiler). */
export const LIST_COLORS: ReadonlyArray<{ id: string; dot: string; label: string }> = [
  { id: 'slate', dot: 'bg-slate-500', label: 'Xám' },
  { id: 'blue', dot: 'bg-blue-500', label: 'Xanh dương' },
  { id: 'sky', dot: 'bg-sky-400', label: 'Xanh trời' },
  { id: 'emerald', dot: 'bg-emerald-500', label: 'Xanh lá' },
  { id: 'amber', dot: 'bg-amber-400', label: 'Vàng' },
  { id: 'orange', dot: 'bg-orange-500', label: 'Cam' },
  { id: 'rose', dot: 'bg-rose-500', label: 'Hồng' },
  { id: 'violet', dot: 'bg-violet-500', label: 'Tím' },
];

export function listColorDot(color: string | null | undefined): string {
  return LIST_COLORS.find((c) => c.id === color)?.dot ?? LIST_COLORS[0].dot;
}

export const LIST_NAME_MAX = 60;

/** Trimmed name, or null when it is empty or too long. */
export function validListName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 1 && trimmed.length <= LIST_NAME_MAX ? trimmed : null;
}

function isMissingTable(error: { code?: string } | null): boolean {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205');
}

const MISSING_MESSAGE = 'Chưa bật Bộ từ: cần chạy docs/migrations/006_word_lists.sql';

function rethrow(error: { code?: string; message?: string }): never {
  throw new Error(isMissingTable(error) ? MISSING_MESSAGE : error.message || 'Không lưu được bộ từ');
}

export async function getWordLists(userId: string): Promise<{ lists: WordList[]; available: boolean }> {
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('word_lists')
    .select('id, name, color, created_at, word_list_items(word_mastery_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })));
  if (error) {
    if (isMissingTable(error)) return { lists: [], available: false };
    throw error;
  }
  const lists = ((data ?? []) as Array<{
    id: string;
    name: string;
    color: string | null;
    created_at: string;
    word_list_items: Array<{ word_mastery_id: string }> | null;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    created_at: row.created_at,
    wordIds: (row.word_list_items ?? []).map((i) => i.word_mastery_id),
  }));
  return { lists, available: true };
}

export async function createWordList(userId: string, name: string, color: string): Promise<WordList> {
  const valid = validListName(name);
  if (!valid) throw new Error(`Tên bộ từ cần 1–${LIST_NAME_MAX} ký tự`);
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('word_lists')
    .insert({ user_id: userId, name: valid, color })
    .select('id, name, color, created_at')
    .single()));
  if (error) rethrow(error);
  return { ...(data as Omit<WordList, 'wordIds'>), wordIds: [] };
}

export async function updateWordList(id: string, changes: { name?: string; color?: string }): Promise<void> {
  const patch: Record<string, string> = {};
  if (changes.name !== undefined) {
    const valid = validListName(changes.name);
    if (!valid) throw new Error(`Tên bộ từ cần 1–${LIST_NAME_MAX} ký tự`);
    patch.name = valid;
  }
  if (changes.color !== undefined) patch.color = changes.color;
  const { error } = await withTimeout(Promise.resolve(supabase.from('word_lists').update(patch).eq('id', id)));
  if (error) rethrow(error);
}

/** Delete a list. Its items go with it (cascade); words and progress stay. */
export async function deleteWordList(id: string): Promise<void> {
  const { error } = await withTimeout(Promise.resolve(supabase.from('word_lists').delete().eq('id', id)));
  if (error) rethrow(error);
}

export async function addWordsToList(listId: string, wordIds: ReadonlyArray<string>): Promise<void> {
  if (wordIds.length === 0) return;
  const { error } = await withTimeout(Promise.resolve(supabase
    .from('word_list_items')
    .upsert(wordIds.map((id) => ({ list_id: listId, word_mastery_id: id })), {
      onConflict: 'list_id,word_mastery_id',
      ignoreDuplicates: true,
    })));
  if (error) rethrow(error);
}

export async function removeWordsFromList(listId: string, wordIds: ReadonlyArray<string>): Promise<void> {
  if (wordIds.length === 0) return;
  const { error } = await withTimeout(Promise.resolve(supabase
    .from('word_list_items')
    .delete()
    .eq('list_id', listId)
    .in('word_mastery_id', [...wordIds])));
  if (error) rethrow(error);
}
