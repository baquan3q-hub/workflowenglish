/**
 * Adaptive Difficulty Service
 *
 * Suggests CEFR level upgrades / downgrades based on the user's recent quiz
 * performance at their current preferred level, and persists the user's
 * choice (accept / dismiss).
 *
 * Thresholds (from design.md / Requirement 3.1, 3.2):
 *   - Upgrade   : last 3 consecutive same-level scores all >= 90%
 *   - Downgrade : last 2 consecutive same-level scores all  < 50%
 *
 * The "current level" is read from `user_goals.preferred_level` via
 * {@link getOrCreateUserGoals}. Recent scores come from `learning_history`
 * (columns: quiz_score, quiz_total, level, completed_at) ordered by
 * completed_at descending, limit 5.
 *
 * Dismissals are stored in `localStorage` (not the DB) because they are
 * UI-only nudges: the same suggestion shouldn't pester the user repeatedly
 * for the same level + direction. The key is scoped by user + level +
 * direction so a fresh qualifying streak at a new level can re-surface a
 * suggestion.
 */

import { supabase } from './supabaseClient';
import { getOrCreateUserGoals } from './goalService';
import { DifficultyLevel } from '../types';

// --- Constants -------------------------------------------------------------

const USER_GOALS_TABLE = 'user_goals';
const LEARNING_HISTORY_TABLE = 'learning_history';

const RECENT_HISTORY_LIMIT = 5;

const UPGRADE_WINDOW = 3;
const UPGRADE_THRESHOLD = 0.9; // >= 90%

const DOWNGRADE_WINDOW = 2;
const DOWNGRADE_THRESHOLD = 0.5; // < 50%

/**
 * Ordered CEFR levels from easiest to hardest. The order defines what
 * "next" and "previous" mean for {@link getNextLevel}.
 */
const LEVEL_ORDER: DifficultyLevel[] = [
  DifficultyLevel.A1,
  DifficultyLevel.A2,
  DifficultyLevel.B1,
  DifficultyLevel.B2,
  DifficultyLevel.C1,
  DifficultyLevel.C2,
];

// --- Pure helpers ----------------------------------------------------------

/**
 * Return the level adjacent to `current` in the given `direction`, or
 * `null` if `current` is at the boundary (A1 going down, C2 going up).
 *
 * Pure function — no I/O, safe for property tests.
 */
export function getNextLevel(
  current: DifficultyLevel,
  direction: 'up' | 'down',
): DifficultyLevel | null {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx === -1) return null;

  const nextIdx = direction === 'up' ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= LEVEL_ORDER.length) return null;

  return LEVEL_ORDER[nextIdx];
}

// --- localStorage dismissal helpers ---------------------------------------

function dismissalKey(
  userId: string,
  currentLevel: DifficultyLevel,
  direction: 'upgrade' | 'downgrade',
): string {
  return `vocabmaster_level_dismissed_${userId}_${currentLevel}_${direction}`;
}

/**
 * Mark a level suggestion as dismissed so we don't show it again for the
 * same (user, level, direction) tuple. Safe to call on the server / in
 * tests — silently no-ops if `localStorage` is unavailable.
 */
export function dismissLevelSuggestion(
  userId: string,
  direction: 'upgrade' | 'downgrade',
  currentLevel: DifficultyLevel,
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(dismissalKey(userId, currentLevel, direction), '1');
  } catch {
    // Storage may be full or blocked (private mode) — ignore.
  }
}

/**
 * True if the user has previously dismissed this suggestion for the given
 * (level, direction). Returns `false` when `localStorage` is unavailable
 * so callers default to showing the suggestion.
 */
export function wasLevelSuggestionDismissed(
  userId: string,
  direction: 'upgrade' | 'downgrade',
  currentLevel: DifficultyLevel,
): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return (
      localStorage.getItem(dismissalKey(userId, currentLevel, direction)) ===
      '1'
    );
  } catch {
    return false;
  }
}

// --- Supabase-backed API ---------------------------------------------------

/**
 * Decide whether the user should be nudged to upgrade or downgrade their
 * preferred CEFR level based on recent quiz performance.
 *
 * Algorithm:
 *   1. Read the user's current preferred level from `user_goals`.
 *   2. Pull the last {@link RECENT_HISTORY_LIMIT} learning-history rows,
 *      newest first, that have quiz scores.
 *   3. Restrict to rows whose `level` matches the current preferred level.
 *   4. Upgrade   : top {@link UPGRADE_WINDOW} same-level scores all >= 0.9.
 *   5. Downgrade : top {@link DOWNGRADE_WINDOW} same-level scores all <  0.5.
 *
 * Returns `null` when neither threshold is met, when the user has no
 * history, or when the current level is already at a boundary in the
 * suggested direction (e.g., already at C2 for upgrade).
 */
export async function checkLevelSuggestion(
  userId: string,
): Promise<'upgrade' | 'downgrade' | null> {
  const goals = await getOrCreateUserGoals(userId);
  const currentLevel = goals.preferred_level as DifficultyLevel;

  const { data, error } = await supabase
    .from(LEARNING_HISTORY_TABLE)
    .select('quiz_score, quiz_total, level, completed_at')
    .eq('user_id', userId)
    .not('quiz_score', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(RECENT_HISTORY_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    quiz_score: number | null;
    quiz_total: number | null;
    level: string | null;
    completed_at: string;
  }>;

  // Keep only rows at the user's current level with a valid score/total.
  const sameLevel = rows.filter(
    (r) =>
      r.level === currentLevel &&
      r.quiz_score != null &&
      r.quiz_total != null &&
      (r.quiz_total as number) > 0,
  );

  // Upgrade check — only if there's a level above the current one.
  if (
    sameLevel.length >= UPGRADE_WINDOW &&
    getNextLevel(currentLevel, 'up') !== null
  ) {
    const window = sameLevel.slice(0, UPGRADE_WINDOW);
    const allPass = window.every(
      (r) =>
        (r.quiz_score as number) / (r.quiz_total as number) >=
        UPGRADE_THRESHOLD,
    );
    if (allPass) return 'upgrade';
  }

  // Downgrade check — only if there's a level below the current one.
  if (
    sameLevel.length >= DOWNGRADE_WINDOW &&
    getNextLevel(currentLevel, 'down') !== null
  ) {
    const window = sameLevel.slice(0, DOWNGRADE_WINDOW);
    const allFail = window.every(
      (r) =>
        (r.quiz_score as number) / (r.quiz_total as number) <
        DOWNGRADE_THRESHOLD,
    );
    if (allFail) return 'downgrade';
  }

  return null;
}

/**
 * Persist the user's accepted level change by updating
 * `user_goals.preferred_level`. Ensures a goals row exists first so this
 * is safe to call for users without prior activity.
 */
export async function acceptLevelChange(
  userId: string,
  newLevel: DifficultyLevel,
): Promise<void> {
  // Make sure the row exists before updating it.
  await getOrCreateUserGoals(userId);

  const { error } = await supabase
    .from(USER_GOALS_TABLE)
    .update({ preferred_level: newLevel })
    .eq('user_id', userId);

  if (error) throw error;
}
