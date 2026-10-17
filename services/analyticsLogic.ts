/**
 * Analytics logic — pure aggregations behind the analytics screen.
 *
 * Inputs are the raw rows `analyticsService.getAnalyticsSnapshot` returns
 * (word_mastery rows and recent review_logs rows); `now` is injectable so
 * everything here is deterministic. Days are local calendar days, keyed
 * `YYYY-MM-DD`, oldest first.
 */

import { SUCCESSFUL_RATING_THRESHOLD } from './masteryService';
import { MasteryLevel, type WordMasteryRecord } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Fewer graded reviews than this and a retention rate is noise, not a number. */
export const RETENTION_MIN_SAMPLES = 20;

/** The retention band SRS aims for: lower means intervals are too long, higher too short. */
export const RETENTION_TARGET = { min: 0.85, max: 0.9 } as const;

export interface DayCount {
  date: string;
  count: number;
}

/** The review_logs columns analytics reads. */
export interface ReviewLogLite {
  word: string;
  reviewed_at: string;
  rating: number | null;
  level_before: number | null;
}

export type AnalyticsWord = Pick<
  WordMasteryRecord,
  | 'word'
  | 'mastery_level'
  | 'next_review_date'
  | 'last_reviewed_at'
  | 'created_at'
  | 'correct_count'
  | 'incorrect_count'
> & { is_suspended?: boolean };

// --- Dates -----------------------------------------------------------------

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local day `offset` days from `date` (DST-safe: steps by calendar date). */
function addDays(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

// --- Activity --------------------------------------------------------------

/**
 * Count timestamps per local day over the last `days` days (today last).
 * Always returns exactly `days` entries; timestamps outside the window are ignored.
 */
export function dailyCounts(timestamps: ReadonlyArray<string | null | undefined>, days: number, now: Date): DayCount[] {
  if (days <= 0) return [];
  const today = startOfLocalDay(now);
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    if (!ts) continue;
    const key = localDateKey(new Date(ts));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = localDateKey(addDays(today, -i));
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/**
 * Review timestamps for the activity charts. review_logs has one row per
 * rating; without it (migration 005 not applied) fall back to each word's
 * last review, which undercounts but still shows which days were active.
 */
export function activityTimestamps(
  logs: ReadonlyArray<ReviewLogLite> | null,
  words: ReadonlyArray<Pick<AnalyticsWord, 'last_reviewed_at'>>,
): string[] {
  if (logs) return logs.map((l) => l.reviewed_at);
  return words.map((w) => w.last_reviewed_at).filter((ts): ts is string => !!ts);
}

export interface PeriodComparison {
  current: number;
  previous: number;
  /** current − previous. */
  delta: number;
}

/** Sum of the last `period` days vs the `period` days before them. */
export function periodOverPeriod(days: ReadonlyArray<DayCount>, period = 7): PeriodComparison {
  const sum = (from: number, to: number) =>
    days.slice(Math.max(0, from), Math.max(0, to)).reduce((acc, d) => acc + d.count, 0);
  const n = days.length;
  const current = sum(n - period, n);
  const previous = sum(n - 2 * period, n - period);
  return { current, previous, delta: current - previous };
}

/** Days in a row with activity, ending today (or yesterday, if today has none yet). */
export function activeStreak(days: ReadonlyArray<DayCount>): number {
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let streak = 0;
  for (; i >= 0 && days[i].count > 0; i--) streak++;
  return streak;
}

// --- Retention -------------------------------------------------------------

export interface RetentionResult {
  /** Share of graded reviews remembered, 0–1; null below `RETENTION_MIN_SAMPLES`. */
  rate: number | null;
  /** Graded reviews in the window. */
  samples: number;
  /** Reviews still needed before a rate is shown (0 once it is). */
  needed: number;
}

/**
 * Retention over the last `days` days: of the reviews of words already
 * learned (not a word's first rating), how many were remembered (rating ≥ Khó).
 */
export function retention(logs: ReadonlyArray<ReviewLogLite>, days: number, now: Date): RetentionResult {
  const since = addDays(startOfLocalDay(now), -(days - 1)).getTime();
  let samples = 0;
  let remembered = 0;
  for (const log of logs) {
    if (log.rating == null) continue;
    if (log.level_before == null || log.level_before === MasteryLevel.NEW) continue;
    const t = new Date(log.reviewed_at).getTime();
    if (t < since || t > now.getTime()) continue;
    samples++;
    if (log.rating >= SUCCESSFUL_RATING_THRESHOLD) remembered++;
  }
  if (samples < RETENTION_MIN_SAMPLES) {
    return { rate: null, samples, needed: RETENTION_MIN_SAMPLES - samples };
  }
  return { rate: remembered / samples, samples, needed: 0 };
}

export type RetentionStatus = 'low' | 'on-target' | 'high';

export function retentionStatus(rate: number): RetentionStatus {
  if (rate < RETENTION_TARGET.min) return 'low';
  if (rate > RETENTION_TARGET.max) return 'high';
  return 'on-target';
}

// --- Words -----------------------------------------------------------------

function isScheduled(w: Pick<AnalyticsWord, 'mastery_level' | 'next_review_date' | 'is_suspended'>): boolean {
  return w.mastery_level !== MasteryLevel.NEW && !w.is_suspended && !!w.next_review_date;
}

/**
 * Reviews falling due on each of the next `days` days. Index 0 is today and
 * includes everything overdue. NEW and suspended words are not scheduled.
 */
export function dueForecast(words: ReadonlyArray<AnalyticsWord>, days: number, now: Date): DayCount[] {
  if (days <= 0) return [];
  const today = startOfLocalDay(now);
  const out: DayCount[] = [];
  for (let i = 0; i < days; i++) out.push({ date: localDateKey(addDays(today, i)), count: 0 });
  const index = new Map(out.map((d, i) => [d.date, i]));
  for (const w of words) {
    if (!isScheduled(w)) continue;
    const due = new Date(w.next_review_date as string);
    if (due.getTime() < today.getTime()) {
      out[0].count++;
      continue;
    }
    const i = index.get(localDateKey(due));
    if (i !== undefined) out[i].count++;
  }
  return out;
}

/** Words due now (same rule as `masteryService.isWordDue`, minus suspended words). */
export function dueNow(words: ReadonlyArray<AnalyticsWord>, now: Date): number {
  return words.filter((w) => isScheduled(w) && new Date(w.next_review_date as string).getTime() <= now.getTime()).length;
}

/** Word count per mastery level; every level present. */
export function levelFunnel(words: ReadonlyArray<Pick<AnalyticsWord, 'mastery_level'>>): Record<MasteryLevel, number> {
  const out: Record<MasteryLevel, number> = {
    [MasteryLevel.NEW]: 0,
    [MasteryLevel.LEARNING]: 0,
    [MasteryLevel.REVIEWING]: 0,
    [MasteryLevel.MASTERED]: 0,
    [MasteryLevel.LAPSED]: 0,
  };
  for (const w of words) {
    if (w.mastery_level in out) out[w.mastery_level as MasteryLevel]++;
  }
  return out;
}

/** Monday of the local week containing `date`. */
function startOfWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const shift = (day.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(day, -shift);
}

/** Words added per week over the last `weeks` weeks (Monday-based, this week last). */
export function weeklyNewWords(
  words: ReadonlyArray<Pick<AnalyticsWord, 'created_at'>>,
  weeks: number,
  now: Date,
): DayCount[] {
  if (weeks <= 0) return [];
  const thisWeek = startOfWeek(now);
  const out: DayCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ date: localDateKey(addDays(thisWeek, -7 * i)), count: 0 });
  const index = new Map(out.map((d, i) => [d.date, i]));
  for (const w of words) {
    if (!w.created_at) continue;
    const i = index.get(localDateKey(startOfWeek(new Date(w.created_at))));
    if (i !== undefined) out[i].count++;
  }
  return out;
}

/** Share of answers that were wrong, 0–1 (0 for a word never answered). */
export function lapseRate(w: Pick<AnalyticsWord, 'correct_count' | 'incorrect_count'>): number {
  const wrong = w.incorrect_count ?? 0;
  const total = (w.correct_count ?? 0) + wrong;
  return total > 0 ? wrong / total : 0;
}

/** Words most often forgotten: most wrong answers first, then highest lapse rate. */
export function mostForgotten<T extends AnalyticsWord>(words: ReadonlyArray<T>, limit: number): T[] {
  return words
    .filter((w) => (w.incorrect_count ?? 0) > 0)
    .sort((a, b) => (b.incorrect_count ?? 0) - (a.incorrect_count ?? 0) || lapseRate(b) - lapseRate(a))
    .slice(0, Math.max(0, limit));
}
