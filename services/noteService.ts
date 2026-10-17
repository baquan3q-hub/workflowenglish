/**
 * Note Service — the learner's personal note on a word
 * (`word_mastery.personal_note`, added by docs/migrations/005_review_logs.sql).
 */

import { upsertWordMastery } from './masteryService';
import type { WordMasteryRecord } from '../types';

/** Longest note kept; anything beyond is cut. */
export const MAX_NOTE_LENGTH = 2000;

/** Trim and cap a note; an empty note is stored as null. */
export function cleanNote(note: string): string | null {
  const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
  return trimmed ? trimmed : null;
}

/** Save (or clear) the personal note on `word`. Creates the row if needed. */
export async function savePersonalNote(
  userId: string,
  word: string,
  note: string,
): Promise<WordMasteryRecord> {
  return upsertWordMastery({ user_id: userId, word, personal_note: cleanNote(note) });
}
