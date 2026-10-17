/**
 * Word library (Sổ từ): filtering, searching, sorting and lesson lists. Pure.
 */

import { MasteryLevel, type WordMasteryRecord } from '../types';
import { isWordDue, normalizeWord } from './masteryService';

/** The columns the library loads from word_mastery. */
export const LIBRARY_COLUMNS =
  'id, word, mastery_level, easiness_factor, interval_days, repetition_count, next_review_date, last_reviewed_at, correct_count, incorrect_count, created_at, ipa, meaning_vi, definition_en, example_sentence, example_sentence_vi, part_of_speech, personal_note, is_suspended';

/** A library row: word_mastery without the columns the library never reads. */
export type LibraryWord = Pick<
  WordMasteryRecord,
  | 'id'
  | 'word'
  | 'mastery_level'
  | 'easiness_factor'
  | 'interval_days'
  | 'repetition_count'
  | 'next_review_date'
  | 'last_reviewed_at'
  | 'correct_count'
  | 'incorrect_count'
  | 'created_at'
  | 'ipa'
  | 'meaning_vi'
  | 'definition_en'
  | 'example_sentence'
  | 'example_sentence_vi'
  | 'part_of_speech'
  | 'personal_note'
  | 'is_suspended'
>;

export type StatusFilter = 'all' | 'due' | 'learning' | 'reviewing' | 'mastered' | 'lapsed' | 'new' | 'suspended';
export type SortKey = 'due' | 'added' | 'difficulty' | 'az';

export const STATUS_FILTERS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'due', label: 'Đến hạn' },
  { id: 'new', label: 'Mới' },
  { id: 'learning', label: 'Đang học' },
  { id: 'reviewing', label: 'Ôn tập' },
  { id: 'mastered', label: 'Thành thạo' },
  { id: 'lapsed', label: 'Đã quên' },
  { id: 'suspended', label: 'Tạm ẩn' },
];

export const SORT_OPTIONS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'due', label: 'Hạn ôn' },
  { id: 'added', label: 'Mới thêm' },
  { id: 'difficulty', label: 'Khó nhất' },
  { id: 'az', label: 'A–Z' },
];

const LEVEL_FOR: Partial<Record<StatusFilter, MasteryLevel>> = {
  new: MasteryLevel.NEW,
  learning: MasteryLevel.LEARNING,
  reviewing: MasteryLevel.REVIEWING,
  mastered: MasteryLevel.MASTERED,
  lapsed: MasteryLevel.LAPSED,
};

/** Whether a word belongs under a status chip. Suspended words show only under "Tạm ẩn" and "Tất cả". */
export function matchesStatus(w: LibraryWord, filter: StatusFilter, now: Date): boolean {
  if (filter === 'all') return true;
  if (filter === 'suspended') return !!w.is_suspended;
  if (w.is_suspended) return false;
  if (filter === 'due') return isWordDue(w, now);
  return w.mastery_level === LEVEL_FOR[filter];
}

export function statusCounts(words: ReadonlyArray<LibraryWord>, now: Date): Record<StatusFilter, number> {
  const counts = Object.fromEntries(STATUS_FILTERS.map((f) => [f.id, 0])) as Record<StatusFilter, number>;
  for (const w of words) for (const f of STATUS_FILTERS) if (matchesStatus(w, f.id, now)) counts[f.id] += 1;
  return counts;
}

/** Fold Vietnamese diacritics so "ky nang" finds "kỹ năng". */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/** Words whose word or Vietnamese meaning contains the query (accent-insensitive). */
export function searchWords<T extends Pick<LibraryWord, 'word' | 'meaning_vi'>>(words: ReadonlyArray<T>, query: string): T[] {
  const q = foldText(query);
  if (!q) return [...words];
  return words.filter((w) => foldText(w.word).includes(q) || foldText(w.meaning_vi ?? '').includes(q));
}

/** Share of answers that were wrong; 0 for a word never answered. */
export function difficultyOf(w: Pick<LibraryWord, 'correct_count' | 'incorrect_count'>): number {
  const total = (w.correct_count ?? 0) + (w.incorrect_count ?? 0);
  return total === 0 ? 0 : (w.incorrect_count ?? 0) / total;
}

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

/**
 * Sorted copy. "Hạn ôn" puts scheduled words first (soonest first) and NEW /
 * suspended words last, since they have no real due date.
 */
export function sortWords<T extends LibraryWord>(words: ReadonlyArray<T>, key: SortKey): T[] {
  const byWord = (a: T, b: T) => a.word.localeCompare(b.word);
  const list = [...words];
  switch (key) {
    case 'az':
      return list.sort(byWord);
    case 'added':
      return list.sort((a, b) => time(b.created_at) - time(a.created_at) || byWord(a, b));
    case 'difficulty':
      return list.sort(
        (a, b) =>
          (b.incorrect_count ?? 0) - (a.incorrect_count ?? 0) || difficultyOf(b) - difficultyOf(a) || byWord(a, b),
      );
    case 'due': {
      const unscheduled = (w: T) => (w.is_suspended || w.mastery_level === MasteryLevel.NEW ? 1 : 0);
      return list.sort(
        (a, b) => unscheduled(a) - unscheduled(b) || time(a.next_review_date) - time(b.next_review_date) || byWord(a, b),
      );
    }
  }
}

export interface LibraryQuery {
  status: StatusFilter;
  search: string;
  sort: SortKey;
  /** Restrict to these normalized words (a lesson or a list); null for all. */
  only: ReadonlySet<string> | null;
}

export function filterWords<T extends LibraryWord>(words: ReadonlyArray<T>, q: LibraryQuery, now: Date): T[] {
  const scoped = q.only ? words.filter((w) => q.only!.has(w.word)) : words;
  return sortWords(searchWords(scoped.filter((w) => matchesStatus(w, q.status, now)), q.search), q.sort);
}

/** Short relative due label: "Đến hạn", "Mai", "3 ngày", "2 tháng"; null when not scheduled. */
export function relativeDue(w: Pick<LibraryWord, 'mastery_level' | 'next_review_date' | 'is_suspended'>, now: Date): string | null {
  if (w.is_suspended || w.mastery_level === MasteryLevel.NEW || !w.next_review_date) return null;
  const due = new Date(w.next_review_date);
  if (due.getTime() <= now.getTime()) return 'Đến hạn';
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(now)) / 86_400_000);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Mai';
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${Math.round(days / 365)} năm`;
}

// --- Lesson lists ------------------------------------------------------------

export interface LessonRow {
  id: string;
  topic: string;
  words: string;
  completed_at: string;
}

export interface LessonList {
  /** Topic key (folded), stable across lessons of the same topic. */
  id: string;
  topic: string;
  /** Most recent lesson of the topic. */
  lastAt: string;
  lessonCount: number;
  /** Normalized words that exist in word_mastery, deduplicated. */
  words: string[];
}

/** Split a lesson's `words` text ("a, b\nc; d") into normalized words. */
export function splitLessonWords(text: string): string[] {
  return [...new Set(text.split(/[,;\n\r\t]+/).map(normalizeWord).filter(Boolean))];
}

/**
 * Group lessons by topic, keeping only words the learner has in word_mastery.
 * Topics with no tracked word are dropped. Newest topic first.
 */
export function buildLessonLists(lessons: ReadonlyArray<LessonRow>, tracked: ReadonlySet<string>): LessonList[] {
  const byTopic = new Map<string, LessonList>();
  for (const lesson of lessons) {
    const topic = lesson.topic?.trim() || 'Khác';
    const id = foldText(topic);
    const words = splitLessonWords(lesson.words ?? '').filter((w) => tracked.has(w));
    const entry = byTopic.get(id) ?? { id, topic, lastAt: lesson.completed_at, lessonCount: 0, words: [] };
    entry.lessonCount += 1;
    if (lesson.completed_at > entry.lastAt) {
      entry.lastAt = lesson.completed_at;
      entry.topic = topic;
    }
    entry.words = [...new Set([...entry.words, ...words])];
    byTopic.set(id, entry);
  }
  return [...byTopic.values()].filter((l) => l.words.length > 0).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** "8/12": words at Ôn tập or above, out of the list. Suspended words still count by level. */
export function listProgress(words: ReadonlyArray<string>, byWord: ReadonlyMap<string, LibraryWord>): { done: number; total: number } {
  let done = 0;
  for (const w of words) {
    const level = byWord.get(w)?.mastery_level;
    if (level === MasteryLevel.REVIEWING || level === MasteryLevel.MASTERED) done += 1;
  }
  return { done, total: words.length };
}
