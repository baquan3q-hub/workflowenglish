/**
 * IELTS Attempt Service — persists Writing / Speaking practice attempts and
 * their AI feedback to the `ielts_attempts` table created by
 * `docs/migrations/003_ielts_modules.sql`.
 *
 * Saving is best-effort: a failure (offline, missing migration) is logged and
 * reported as `null` so grading feedback is still shown to the learner.
 */

import { supabase, withTimeout } from './supabaseClient';
import type { ReadingAttemptDetails } from './readingLogic';
import { IeltsAiFeedback, IeltsAttempt, IeltsQuestion, IeltsSkill } from '../types';
import { allWritingQuestions } from './writingQuestionRegistry';
import { questionFromDetails } from './writingPracticeLogic';
import { speakingPart1Questions } from '../data/ieltsSpeakingQuestions';

const TABLE = 'ielts_attempts';

interface IeltsAttemptRow {
  id: string;
  user_id: string;
  skill: IeltsSkill;
  task_or_part: string;
  question_type: string | null;
  topic: string | null;
  question_prompt: string;
  answer_text: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  word_count: number | null;
  estimated_band: number | string | null;
  criterion_scores: Record<string, number> | null;
  ai_feedback: IeltsAiFeedback | null;
  attempt_number: number | null;
  /** Added by migration 009; absent before it runs. */
  details?: Record<string, unknown> | null;
  created_at: string;
}

// --- Pure helpers ----------------------------------------------------------

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Map criterion list → { "Lexical Resource": 6.5, ... } for the jsonb column. */
export function criterionScoresToMap(feedback: IeltsAiFeedback): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of feedback.criterionScores || []) {
    map[c.name] = c.score;
  }
  return map;
}

/** Clamp to the 0–9 IELTS range and round to the nearest 0.5. */
export function normalizeBand(band: unknown): number | undefined {
  const n = typeof band === 'string' ? parseFloat(band) : band;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.round(Math.min(9, Math.max(0, n)) * 2) / 2;
}

function rowToAttempt(row: IeltsAttemptRow): IeltsAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    skill: row.skill,
    taskOrPart: row.task_or_part,
    questionType: row.question_type ?? '',
    topic: row.topic ?? '',
    questionPrompt: row.question_prompt,
    answerText: row.answer_text ?? '',
    audioUrl: row.audio_url ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    wordCount: row.word_count ?? undefined,
    estimatedBand: normalizeBand(row.estimated_band),
    criterionScores: row.criterion_scores ?? undefined,
    aiFeedback: row.ai_feedback ?? undefined,
    attemptNumber: row.attempt_number ?? 1,
    details: row.details ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Find the bank question an attempt was made on (matched by prompt), or
 * build a minimal stand-in so the feedback screen can still be shown.
 */
export function resolveAttemptQuestion(attempt: IeltsAttempt): IeltsQuestion {
  const bank = attempt.skill === 'writing' ? allWritingQuestions() : speakingPart1Questions;
  if (attempt.skill === 'writing') {
    // By the saved id first, then the copy kept for library and AI prompts (which a reload forgets).
    const id = attempt.details?.questionId;
    const byId = typeof id === 'string' ? bank.find(q => q.id === id) : undefined;
    const kept = byId ?? questionFromDetails(attempt.details);
    if (kept) return kept;
  }
  const match = bank.find(q => q.prompt === attempt.questionPrompt);
  if (match) return match;
  return {
    id: `attempt-${attempt.id ?? 'unknown'}`,
    skill: attempt.skill,
    taskOrPart: attempt.taskOrPart as IeltsQuestion['taskOrPart'],
    questionType: attempt.questionType,
    topic: attempt.topic,
    difficulty: 'medium',
    prompt: attempt.questionPrompt,
    frameworkId: '',
    targetBand: '6.5',
  };
}

// --- Supabase I/O ----------------------------------------------------------

/**
 * Save a graded attempt. `attempt_number` counts previous attempts by the
 * same user on the same prompt (1 = first try, 2 = first rewrite, ...).
 */
export async function saveIeltsAttempt(input: {
  userId: string;
  skill: IeltsSkill;
  question: IeltsQuestion;
  taskOrPart?: string;
  answerText: string;
  durationSeconds?: number;
  feedback: IeltsAiFeedback;
  /** Only sent when given, so saves keep working before migration 009. */
  details?: Record<string, unknown>;
}): Promise<IeltsAttempt | null> {
  try {
    const { count, error: countError } = await withTimeout(Promise.resolve(supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.userId)
      .eq('question_prompt', input.question.prompt)));
    if (countError) console.warn('[IELTS Attempts] count failed:', countError);

    const payload = {
      user_id: input.userId,
      skill: input.skill,
      task_or_part: input.taskOrPart ?? input.question.taskOrPart,
      question_type: input.question.questionType,
      topic: input.question.topic,
      question_prompt: input.question.prompt,
      answer_text: input.answerText,
      duration_seconds: input.durationSeconds != null ? Math.round(input.durationSeconds) : null,
      word_count: countWords(input.answerText),
      estimated_band: normalizeBand(input.feedback.estimatedBand) ?? null,
      criterion_scores: criterionScoresToMap(input.feedback),
      ai_feedback: input.feedback,
      attempt_number: (count ?? 0) + 1,
      ...(input.details ? { details: input.details } : {}),
    };

    const { data, error } = await withTimeout(Promise.resolve(supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single()));

    if (error) {
      console.warn('[IELTS Attempts] save failed (could be missing migration 003):', error);
      return null;
    }
    return rowToAttempt(data as IeltsAttemptRow);
  } catch (err) {
    console.error('[IELTS Attempts] save failed:', err);
    return null;
  }
}

/** What a Listening attempt keeps in `details`, enough to grade it again. */
export interface ListeningAttemptDetails {
  testId: string;
  sectionIds: string[];
  mode: 'exam' | 'practice';
  answers: Record<number, string>;
  score: number;
  total: number;
}

export function isListeningDetails(d: unknown): d is ListeningAttemptDetails {
  const o = d as Partial<ListeningAttemptDetails> | null | undefined;
  return !!o && typeof o.testId === 'string' && Array.isArray(o.sectionIds) && !!o.answers && typeof o.answers === 'object';
}

export { isReadingDetails, type ReadingAttemptDetails } from './readingLogic';

interface GradedAttemptInput<D extends { mode: string }> {
  userId: string;
  title: string;
  topic: string;
  taskOrPart: string;
  band: number;
  durationSeconds?: number;
  /** Score per part or passage, as criterion scores. */
  byPart: Record<string, number>;
  details: D;
}

/** Insert an attempt graded on the device (no AI feedback): Listening or Reading. */
async function saveGradedAttempt<D extends { mode: string }>(
  skill: 'listening' | 'reading',
  migration: string,
  input: GradedAttemptInput<D>,
): Promise<IeltsAttempt | null> {
  try {
    const { count } = await withTimeout(Promise.resolve(supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.userId)
      .eq('question_prompt', input.title)));

    const { data, error } = await withTimeout(Promise.resolve(supabase
      .from(TABLE)
      .insert({
        user_id: input.userId,
        skill,
        task_or_part: input.taskOrPart,
        question_type: input.details.mode,
        topic: input.topic,
        question_prompt: input.title,
        answer_text: '',
        duration_seconds: input.durationSeconds != null ? Math.round(input.durationSeconds) : null,
        word_count: null,
        estimated_band: normalizeBand(input.band) ?? null,
        criterion_scores: input.byPart,
        ai_feedback: null,
        attempt_number: (count ?? 0) + 1,
        details: input.details,
      })
      .select()
      .single()));

    if (error) {
      console.warn(`[IELTS Attempts] ${skill} save failed (could be missing migration ${migration}):`, error);
      return null;
    }
    return rowToAttempt(data as IeltsAttemptRow);
  } catch (err) {
    console.error(`[IELTS Attempts] ${skill} save failed:`, err);
    return null;
  }
}

/** Save a Listening attempt. Needs migration 009 for the 'listening' skill and the `details` column. */
export function saveListeningAttempt(input: GradedAttemptInput<ListeningAttemptDetails>): Promise<IeltsAttempt | null> {
  return saveGradedAttempt('listening', '009', input);
}

/** Save a Reading attempt; `byPart` holds "Passage N" scores. Needs migration 012 for the 'reading' skill. */
export function saveReadingAttempt(input: GradedAttemptInput<ReadingAttemptDetails>): Promise<IeltsAttempt | null> {
  return saveGradedAttempt('reading', '012', input);
}

/**
 * The latest Writing attempt on the same prompt, or the latest one before
 * `before` (an ISO time) when given. Best-effort: null on any failure.
 */
export async function getPreviousWritingAttempt(
  userId: string,
  questionPrompt: string,
  before?: string,
): Promise<IeltsAttempt | null> {
  try {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('skill', 'writing')
      .eq('question_prompt', questionPrompt);
    if (before) query = query.lt('created_at', before);
    const { data, error } = await withTimeout(Promise.resolve(query.order('created_at', { ascending: false }).limit(1)));
    if (error) throw error;
    const row = (data as IeltsAttemptRow[] | null)?.[0];
    return row ? rowToAttempt(row) : null;
  } catch (err) {
    console.warn('[IELTS Attempts] previous attempt lookup failed:', err);
    return null;
  }
}

/** Most recent attempts for one skill, newest first. */
export async function getIeltsAttempts(
  userId: string,
  skill: IeltsSkill,
  limit: number = 20,
): Promise<IeltsAttempt[]> {
  const { data, error } = await withTimeout(Promise.resolve(supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('skill', skill)
    .order('created_at', { ascending: false })
    .limit(limit)));

  if (error) throw error;
  return ((data || []) as IeltsAttemptRow[]).map(rowToAttempt);
}

