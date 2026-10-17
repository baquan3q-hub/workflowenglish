/**
 * Lịch sử học I/O: one page of lessons with only the parts of lesson_data the
 * list shows (cards for words and meanings, progress for scores).
 */

import type { HistoryRow } from './historyLogic';
import { supabase, withTimeout } from './supabaseClient';

export const HISTORY_PAGE_SIZE = 20;

export async function getHistoryPage(userId: string, offset: number, limit = HISTORY_PAGE_SIZE): Promise<HistoryRow[]> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('learning_history')
        .select('id, topic, level, words, quiz_score, quiz_total, completed_at, cards:lesson_data->flashcards, progress:lesson_data->progress')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ),
    15000,
  );
  if (error) throw error;
  return (data ?? []) as unknown as HistoryRow[];
}
