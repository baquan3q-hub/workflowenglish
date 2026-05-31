/**
 * Analytics Service — read-only aggregations powering the analytics dashboard.
 *
 * Responsibilities:
 *   - `getMasteryDistribution`  → counts of words at each `MasteryLevel`.
 *   - `getActivityHeatmap`      → per-day review counts for the last N days,
 *                                 backfilling empty days with `count: 0`.
 *   - `getQuizScoreTrend`       → most recent quiz scores from
 *                                 `learning_history`, oldest-first for charts.
 *   - `getTotalStats`           → summary tiles for the dashboard (totals,
 *                                 mastered, due today, current CEFR level).
 *
 * All functions are read-only and safe to call concurrently. Day grouping
 * is performed in JavaScript rather than via a Supabase RPC to keep this
 * service self-contained and avoid adding server-side functions.
 *
 * Date convention: heatmap dates use `YYYY-MM-DD` derived from local time
 * (so a day boundary aligns with the user's perception of "today"). The
 * resulting array is sorted ascending by date with the most recent day
 * last, which is what charting components expect.
 */

import { supabase } from './supabaseClient';
import { getOrCreateUserGoals } from './goalService';
import { MasteryLevel } from '../types';

// --- Constants -------------------------------------------------------------

const WORD_MASTERY_TABLE = 'word_mastery';
const LEARNING_HISTORY_TABLE = 'learning_history';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Helpers ---------------------------------------------------------------

/**
 * Format a `Date` as `YYYY-MM-DD` using local time. The heatmap groups by
 * the user's local calendar day, so we deliberately avoid `toISOString()`
 * (which would shift dates near midnight into the next/previous UTC day).
 */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local midnight of the given date. */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// --- Public API ------------------------------------------------------------

/**
 * Count of words per mastery level for `userId`.
 *
 * The returned record always contains an entry for every `MasteryLevel`
 * value (filled with `0` when no rows exist) so callers can render charts
 * without defensive lookups.
 */
export async function getMasteryDistribution(
  userId: string,
): Promise<Record<MasteryLevel, number>> {
  const { data, error } = await supabase
    .from(WORD_MASTERY_TABLE)
    .select('mastery_level')
    .eq('user_id', userId);

  if (error) throw error;

  const distribution: Record<MasteryLevel, number> = {
    [MasteryLevel.NEW]: 0,
    [MasteryLevel.LEARNING]: 0,
    [MasteryLevel.REVIEWING]: 0,
    [MasteryLevel.MASTERED]: 0,
    [MasteryLevel.LAPSED]: 0,
  };

  for (const row of data ?? []) {
    const level = (row as { mastery_level: number }).mastery_level;
    if (level in distribution) {
      distribution[level as MasteryLevel] += 1;
    }
  }

  return distribution;
}

export interface HeatmapEntry {
  /** Local calendar date in `YYYY-MM-DD` format. */
  date: string;
  /** Number of words whose `last_reviewed_at` falls on `date`. */
  count: number;
}

/**
 * Per-day review counts for the last `days` days (inclusive of today).
 *
 * We query `word_mastery` for rows with a `last_reviewed_at` falling
 * within the window, then bucket them by local calendar day on the
 * client. Days with no activity are filled with `count: 0` so the
 * caller always receives exactly `days` entries in chronological order
 * (oldest first, today last).
 *
 * @param userId  Profile id whose activity to aggregate.
 * @param days    Number of days to include. Values <= 0 produce `[]`.
 */
export async function getActivityHeatmap(
  userId: string,
  days: number,
): Promise<HeatmapEntry[]> {
  if (days <= 0) return [];

  const today = startOfLocalDay(new Date());
  // Window starts at local midnight `days - 1` days ago so that exactly
  // `days` calendar days are represented (e.g. days=7 → today + 6 prior).
  const windowStart = new Date(today.getTime() - (days - 1) * MS_PER_DAY);

  const { data, error } = await supabase
    .from(WORD_MASTERY_TABLE)
    .select('last_reviewed_at')
    .eq('user_id', userId)
    .gte('last_reviewed_at', windowStart.toISOString())
    .not('last_reviewed_at', 'is', null);

  if (error) throw error;

  // Bucket reviews by local calendar day.
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const ts = (row as { last_reviewed_at: string | null }).last_reviewed_at;
    if (!ts) continue;
    const key = toLocalDateString(new Date(ts));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Build the dense, ordered output. Walking forward from `windowStart`
  // guarantees ascending order without a separate sort step.
  const result: HeatmapEntry[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(windowStart.getTime() + i * MS_PER_DAY);
    const key = toLocalDateString(day);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return result;
}

export interface QuizScorePoint {
  /** `YYYY-MM-DD` of the quiz completion (local time). */
  date: string;
  /** Score the user earned on that quiz. */
  score: number;
  /** Maximum possible score for that quiz. */
  total: number;
}

/**
 * Last `limit` quiz scores for the user, ordered chronologically
 * (oldest first) so a line chart reads left-to-right as time advances.
 *
 * Records without a recorded `quiz_score` are excluded — a `null` here
 * means the user abandoned the lesson before the quiz, which would
 * pollute the trend.
 */
export async function getQuizScoreTrend(
  userId: string,
  limit: number,
): Promise<QuizScorePoint[]> {
  if (limit <= 0) return [];

  // Pull the most recent `limit` rows, then reverse client-side so the
  // returned array is oldest → newest.
  const { data, error } = await supabase
    .from(LEARNING_HISTORY_TABLE)
    .select('quiz_score, quiz_total, completed_at')
    .eq('user_id', userId)
    .not('quiz_score', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    quiz_score: number | null;
    quiz_total: number | null;
    completed_at: string;
  }>;

  return rows
    .filter((r) => r.quiz_score != null && r.quiz_total != null)
    .map((r) => ({
      date: toLocalDateString(new Date(r.completed_at)),
      score: r.quiz_score as number,
      total: r.quiz_total as number,
    }))
    .reverse();
}

export interface TotalStats {
  /** Total unique words tracked for this user. */
  totalWords: number;
  /** Words at `MasteryLevel.MASTERED`. */
  masteredWords: number;
  /** Words whose `next_review_date` is now or earlier (due for review). */
  dueToday: number;
  /** User's preferred CEFR level (e.g. `'B1'`). */
  currentLevel: string;
}

/**
 * Summary tiles shown at the top of the analytics dashboard.
 *
 * Combines three queries (full mastery rows for total + mastered counts,
 * a head-only count for due words, and the user's goals row) so the
 * dashboard can render its summary section with a single call.
 */
export async function getTotalStats(userId: string): Promise<TotalStats> {
  const nowIso = new Date().toISOString();

  const [allWordsRes, dueCountRes, goals] = await Promise.all([
    supabase
      .from(WORD_MASTERY_TABLE)
      .select('mastery_level')
      .eq('user_id', userId),
    supabase
      .from(WORD_MASTERY_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('next_review_date', nowIso),
    getOrCreateUserGoals(userId),
  ]);

  if (allWordsRes.error) throw allWordsRes.error;
  if (dueCountRes.error) throw dueCountRes.error;

  const rows = (allWordsRes.data ?? []) as Array<{ mastery_level: number }>;
  const totalWords = rows.length;
  const masteredWords = rows.filter(
    (r) => r.mastery_level === MasteryLevel.MASTERED,
  ).length;

  return {
    totalWords,
    masteredWords,
    dueToday: dueCountRes.count ?? 0,
    currentLevel: goals.preferred_level,
  };
}

/**
 * Get top `limit` hardest words for `userId` (ordered by `incorrect_count DESC` and `correct_count ASC`).
 * Only includes words with at least one incorrect attempt (`incorrect_count > 0`).
 */
export async function getHardestWords(
  userId: string,
  limit: number = 5,
): Promise<any[]> {
  const { data, error } = await supabase
    .from(WORD_MASTERY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .gt('incorrect_count', 0)
    .order('incorrect_count', { ascending: false })
    .order('correct_count', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get top `limit` recently mastered words for `userId` (mastery_level = MasteryLevel.MASTERED).
 */
export async function getMasteredWords(
  userId: string,
  limit: number = 15,
): Promise<any[]> {
  const { data, error } = await supabase
    .from(WORD_MASTERY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('mastery_level', MasteryLevel.MASTERED)
    .order('last_reviewed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get all tracked words for `userId` with full metadata, ordered by their creation date.
 */
export async function getAllTrackedWords(
  userId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from(WORD_MASTERY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

