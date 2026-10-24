/**
 * Reads the learner's own data for the IELTS Mentor chat: goals, streak,
 * vocabulary, missed and due words, IELTS bands and recurring errors.
 * Every source is optional; one failing (or a missing table) only leaves
 * that part out. Cached for a few minutes so each message is not a refetch.
 */
import type { IeltsAttempt, IeltsSkill } from '../types';
import { getIeltsAttempts } from './ieltsAttemptService';
import { summarizeErrors } from './ieltsErrorLogic';
import { criterionTrends, PRACTISED_SKILLS, skillProgress, weakestCriterion } from './ieltsProgressLogic';
import { getDueWords, getWordMasteryStats } from './masteryService';
import { getOrCreateUserGoals } from './goalService';
import { supabase, withTimeout } from './supabaseClient';
import { EMPTY_LEARNER, type LearnerData } from './chatLogic';

const CACHE_MS = 5 * 60_000;
let cache: { userId: string; at: number; data: LearnerData } | null = null;
let inflight: { userId: string; promise: Promise<LearnerData> } | null = null;

async function weakWords(userId: string): Promise<LearnerData['weakWords']> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('word_mastery')
        .select('word, meaning_vi, incorrect_count')
        .eq('user_id', userId)
        .gt('incorrect_count', 0)
        .order('incorrect_count', { ascending: false })
        .limit(10),
    ),
  );
  if (error) throw error;
  return ((data ?? []) as { word: string; meaning_vi: string | null; incorrect_count: number }[]).map((r) => ({
    word: r.word,
    meaning: r.meaning_vi ?? undefined,
    misses: r.incorrect_count,
  }));
}

const value = <T,>(r: PromiseSettledResult<T>): T | undefined => (r.status === 'fulfilled' ? r.value : undefined);

async function load(userId: string, name?: string): Promise<LearnerData> {
  const [goals, stats, due, weak, ...attemptLists] = await Promise.allSettled([
    getOrCreateUserGoals(userId),
    getWordMasteryStats(userId),
    getDueWords(userId, 30),
    weakWords(userId),
    ...PRACTISED_SKILLS.map((s: IeltsSkill) => getIeltsAttempts(userId, s, 12)),
  ]);

  const g = value(goals);
  const st = value(stats);
  const dueList = value(due) ?? [];
  const attempts: IeltsAttempt[] = attemptLists.flatMap((r) => value(r as PromiseSettledResult<IeltsAttempt[]>) ?? []);
  attempts.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  const weakest = (['writing', 'speaking'] as const)
    .map((skill) => {
      const w = weakestCriterion(criterionTrends(skill, attempts));
      return w ? { skill, nameVi: w.nameVi, current: w.current } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.current - b.current)[0];

  const errors = summarizeErrors(attempts);

  return {
    ...EMPTY_LEARNER,
    name,
    level: g?.preferred_level,
    streak: g?.current_streak,
    longestStreak: g?.longest_streak,
    dailyGoal: g?.daily_word_goal,
    reviewedToday: g?.words_reviewed_today,
    dueCount: due.status === 'fulfilled' ? dueList.length : undefined,
    words: st ? { total: st.total, mastered: st.mastered, learning: st.learning + st.reviewing, lapsed: st.lapsed } : undefined,
    weakWords: value(weak) ?? [],
    dueWords: dueList.map((w) => w.word),
    skills: PRACTISED_SKILLS.map((s) => {
      const p = skillProgress(s, attempts);
      return { skill: s, attempts: p.attempts, current: p.current };
    }),
    weakest,
    topErrors: errors.categories.slice(0, 4).map((c) => ({ label: c.label, total: c.total })),
  };
}

/** The learner snapshot, from cache when fresh. Pass `refresh` after the learner studied. */
export function loadLearnerData(userId: string, name?: string, refresh = false): Promise<LearnerData> {
  if (!refresh && cache && cache.userId === userId && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.data);
  if (inflight && inflight.userId === userId) return inflight.promise;
  const promise = load(userId, name)
    .then((data) => {
      cache = { userId, at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  inflight = { userId, promise };
  return promise;
}
