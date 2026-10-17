/**
 * Lịch sử học (pure): lesson rows with their words and meanings, grouped by
 * day, searchable by topic, word or meaning.
 */

import type { FlashcardData, LessonProgress, StepResult } from '../types';
import { normalizeWord } from './masteryService';
import { foldText, splitLessonWords } from './vocabLibraryLogic';

/** A learning_history row as the history screen loads it (no full lesson_data). */
export interface HistoryRow {
  id: string;
  topic: string;
  level: string;
  words: string;
  quiz_score: number | null;
  quiz_total: number | null;
  completed_at: string;
  cards: Array<Partial<FlashcardData>> | null;
  progress: LessonProgress | null;
}

export interface HistoryWord {
  word: string;
  meaning: string | null;
  partOfSpeech: string | null;
  ipa: string | null;
}

export interface HistoryEntry {
  id: string;
  topic: string;
  level: string;
  /** The raw word list, as saved (used to regenerate a lesson without data). */
  rawWords: string;
  completedAt: string;
  words: HistoryWord[];
  finished: boolean;
  scores: Array<{ label: string; result: StepResult }>;
}

const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Words from the lesson's cards; older rows without cards fall back to the saved list. */
export function toHistoryEntry(row: HistoryRow, meanings?: ReadonlyMap<string, string | null>): HistoryEntry {
  const fromCards = (row.cards ?? [])
    .filter((c) => clean(c?.word))
    .map((c) => ({
      word: clean(c.word)!,
      meaning: clean(c.meaningVietnamese),
      partOfSpeech: clean(c.partOfSpeech),
      ipa: clean(c.ipa),
    }));
  const words =
    fromCards.length > 0
      ? fromCards
      : splitLessonWords(row.words ?? '').map((w) => ({
          word: w,
          meaning: meanings?.get(w) ?? null,
          partOfSpeech: null,
          ipa: null,
        }));

  const p = row.progress ?? undefined;
  const scores: HistoryEntry['scores'] = [];
  const quiz = p?.quiz ?? (row.quiz_score != null && row.quiz_total ? { score: row.quiz_score, total: row.quiz_total, wrong: [] } : undefined);
  if (quiz) scores.push({ label: 'Trắc nghiệm', result: quiz });
  if (p?.fillBlank) scores.push({ label: 'Điền từ', result: p.fillBlank });
  if (p?.sentences) scores.push({ label: 'Luyện câu', result: p.sentences });

  return {
    id: row.id,
    topic: clean(row.topic) ?? 'General',
    level: row.level,
    rawWords: row.words ?? '',
    completedAt: row.completed_at,
    words,
    finished: !!p?.completedAt,
    scores,
  };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Hôm nay", "Hôm qua", "7 ngày qua", then "Tháng 10/2026". */
export function dayGroupLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return '7 ngày qua';
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Consecutive groups in the given (newest-first) order. */
export function groupByDay<T extends { completedAt: string }>(entries: ReadonlyArray<T>, now: Date): Array<{ label: string; entries: T[] }> {
  const groups: Array<{ label: string; entries: T[] }> = [];
  for (const e of entries) {
    const label = dayGroupLabel(e.completedAt, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.entries.push(e);
    else groups.push({ label, entries: [e] });
  }
  return groups;
}

/** Accent-insensitive match on topic, level, any word or any meaning. */
export function matchesHistory(entry: HistoryEntry, query: string): boolean {
  const q = foldText(query);
  if (!q) return true;
  if (foldText(entry.topic).includes(q) || foldText(entry.level) === q) return true;
  return entry.words.some((w) => foldText(w.word).includes(q) || foldText(w.meaning ?? '').includes(q));
}

/** word_mastery ids for the entry's words that the learner is tracking. */
export function trackedIds(entry: HistoryEntry, idByWord: ReadonlyMap<string, string>): string[] {
  return entry.words.map((w) => idByWord.get(normalizeWord(w.word))).filter((id): id is string => !!id);
}

/** "14:05" for today and yesterday's groups, "17/10 · 14:05" otherwise. */
export function entryTime(iso: string, now: Date): string {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  return days <= 1 ? hm : `${d.getDate()}/${d.getMonth() + 1} · ${hm}`;
}
