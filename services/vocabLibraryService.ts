/**
 * Vocab Library Service — data for the word library screen (Sổ từ).
 * Filtering, sorting and grouping live in `vocabLibraryLogic` (pure).
 */

import { supabase, withTimeout } from './supabaseClient';
import { normalizeWord } from './masteryService';
import { buildLessonLists, LIBRARY_COLUMNS, type LessonList, type LibraryWord } from './vocabLibraryLogic';
import type { ReviewLogEntry, WordMasteryRecord } from '../types';

/** Every tracked word with the columns the library shows, newest first. */
export async function getLibraryWords(userId: string): Promise<LibraryWord[]> {
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('word_mastery')
    .select(LIBRARY_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })));
  if (error) {
    // Before migration 005 personal_note / is_suspended don't exist: retry without them.
    if (error.code === '42703' || /personal_note|is_suspended/.test(error.message ?? '')) {
      const fallback = LIBRARY_COLUMNS.replace(', personal_note, is_suspended', '');
      const retry = await withTimeout(Promise.resolve(supabase
        .from('word_mastery')
        .select(fallback)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })));
      if (retry.error) throw retry.error;
      return (retry.data ?? []) as unknown as LibraryWord[];
    }
    throw error;
  }
  return (data ?? []) as unknown as LibraryWord[];
}

/** Lessons grouped by topic, limited to words in `tracked`. */
export async function getLessonLists(userId: string, tracked: ReadonlySet<string>): Promise<LessonList[]> {
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('learning_history')
    .select('id, topic, words, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })));
  if (error) throw error;
  return buildLessonLists((data ?? []) as Array<{ id: string; topic: string; words: string; completed_at: string }>, tracked);
}

export type TimelineEntry = Pick<
  ReviewLogEntry,
  'source' | 'rating' | 'level_before' | 'level_after' | 'interval_before' | 'interval_after' | 'reviewed_at'
>;

/** A word's review history, newest first; empty when review_logs is unavailable. */
export async function getWordTimeline(userId: string, word: string, limit = 30): Promise<TimelineEntry[]> {
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('review_logs')
    .select('source, rating, level_before, level_after, interval_before, interval_after, reviewed_at')
    .eq('user_id', userId)
    .eq('word', normalizeWord(word))
    .order('reviewed_at', { ascending: false })
    .limit(limit)));
  if (error) {
    console.warn('[Library] review timeline unavailable:', error);
    return [];
  }
  return (data ?? []) as TimelineEntry[];
}

/** Full word_mastery rows for `ids`, for a review of hand-picked words. Order follows `ids`. */
export async function getWordsByIds(userId: string, ids: ReadonlyArray<string>): Promise<WordMasteryRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('word_mastery')
    .select('*')
    .eq('user_id', userId)
    .in('id', [...ids])));
  if (error) throw error;
  const byId = new Map(((data ?? []) as WordMasteryRecord[]).map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is WordMasteryRecord => !!r);
}

/** word_mastery rows for the given words (any spelling), e.g. a lesson's words for its summary. */
export async function getWordsByWords(userId: string, words: ReadonlyArray<string>): Promise<WordMasteryRecord[]> {
  const keys = [...new Set(words.map(normalizeWord).filter(Boolean))];
  if (keys.length === 0) return [];
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from('word_mastery')
    .select('*')
    .eq('user_id', userId)
    .in('word', keys)));
  if (error) throw error;
  return (data ?? []) as WordMasteryRecord[];
}
