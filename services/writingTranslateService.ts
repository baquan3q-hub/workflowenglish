/**
 * "Viết từng câu" service: grading through gradeTranslation, AI-written sets
 * through generateTranslationSet (kept in `translation_sets`), the attempt log
 * in `translation_attempts` (migration 017), and the learner's level and
 * review schedule on the device.
 *
 * Without the migration everything still works; the sets and the log are just
 * not kept on the account.
 */
import { invokeAi } from './aiClient';
import { supabase } from './supabaseClient';
import { translationSetProblems, type GeneratedTranslationSet } from '../supabase/functions/ai-proxy/ops/writingTranslate.ts';
import {
  cappedScore,
  modelFor,
  sanitizeTranslateState,
  TRANSLATION_BAND_LIST,
  type TranslateState,
  type TranslationBand,
  type TranslationGrade,
  type TranslationMode,
  type TranslationSentence,
  type TranslationSet,
} from './writingTranslateLogic';
import type { IeltsWritingTask } from '../types';

const STATE_PREFIX = 'ielts-translate:v1:';

export function loadTranslateState(userId: string, target: number | null): TranslateState {
  try {
    const raw = userId ? localStorage.getItem(STATE_PREFIX + userId) : null;
    return sanitizeTranslateState(raw ? JSON.parse(raw) : null, target);
  } catch {
    return sanitizeTranslateState(null, target);
  }
}

export function saveTranslateState(userId: string, state: TranslateState): void {
  if (!userId) return;
  try {
    localStorage.setItem(STATE_PREFIX + userId, JSON.stringify(state));
  } catch {
    // Storage full or blocked: progress lasts for this visit only.
  }
}

export interface GradeRequest {
  set: TranslationSet;
  sentence: TranslationSentence;
  /** The sentence before it, for context. */
  before?: string;
  answer: string;
  band: TranslationBand;
  mode: TranslationMode;
  hintsUsed: number;
  previous?: string;
}

export interface GradedSentence extends TranslationGrade {
  /** The score after the hint cap; what progress and level use. */
  finalScore: number;
}

export async function gradeSentence(req: GradeRequest): Promise<GradedSentence> {
  const { sentence, band, mode } = req;
  // Models from the chosen band up, so a freer answer at a higher band still matches one.
  const models = TRANSLATION_BAND_LIST.filter((b) => b >= band).map((b) => modelFor(sentence, b));
  const grade = await invokeAi<TranslationGrade>(
    'gradeTranslation',
    {
      vi: sentence.vi,
      answer: req.answer.trim(),
      targetBand: String(mode === 'upgrade' ? 8 : band),
      task: req.set.task,
      prompt: req.set.prompt,
      before: req.before,
      previous: req.previous,
      models: mode === 'upgrade' ? [sentence.band8, sentence.band7] : models,
      keys: sentence.keys.map((k) => k.en),
      hintsUsed: req.hintsUsed,
      upgradeFrom: mode === 'upgrade' ? sentence.band6 : undefined,
    },
    { timeoutMs: 40_000 },
  );
  const raw = grade.score ?? (grade.verdict === 'correct' ? 90 : grade.verdict === 'acceptable' ? 70 : 40);
  return { ...grade, finalScore: cappedScore(raw, req.hintsUsed) ?? raw };
}

/** One row in translation_attempts; failures (no table yet) are only logged. */
export async function logTranslationAttempt(userId: string, req: GradeRequest, graded: GradedSentence): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from('translation_attempts').insert({
    user_id: userId,
    set_id: req.set.id.slice(0, 80),
    sentence_id: req.sentence.id.slice(0, 40),
    mode: req.mode,
    target_band: req.mode === 'upgrade' ? 8 : req.band,
    prompt_vi: req.sentence.vi,
    answer: req.answer.trim(),
    score: graded.finalScore,
    band: graded.band,
    verdict: graded.verdict,
    hints_used: req.hintsUsed,
    feedback: { corrected: graded.corrected, errors: graded.errors, upgrade: graded.upgrade, explanationVi: graded.explanationVi },
  });
  if (error) console.warn('[Translate] could not log attempt:', error.message);
}

// --- AI-written sets --------------------------------------------------------------

const SETS_TABLE = 'translation_sets';
export const GENERATED_SET_PREFIX = 'trgen_';

export class TranslationSetError extends Error {}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

export function toTranslationSet(id: string, task: IeltsWritingTask, prompt: string, g: GeneratedTranslationSet, createdAt: string): TranslationSet {
  return {
    id: GENERATED_SET_PREFIX + id,
    source: 'generated',
    task,
    prompt,
    title: g.title || (task === 'task_1' ? 'Task 1 · Đề của bạn' : 'Task 2 · Đề của bạn'),
    createdAt,
    paragraphs: g.paragraphs.map((p, pi) => ({
      label: p.label,
      sentences: p.sentences.map((s, si) => ({ id: `p${pi + 1}s${si + 1}`, vi: s.vi, band6: s.band6, band7: s.band7, band8: s.band8, keys: s.keys })),
    })),
  };
}

/** A set for any Writing prompt; saved to the account when possible. Throws AiError or TranslationSetError. */
export async function generateTranslationSet(userId: string, task: IeltsWritingTask, prompt: string): Promise<TranslationSet> {
  const clean = prompt.trim().slice(0, 2500);
  const raw = await invokeAi<unknown>('generateTranslationSet', { task, prompt: clean }, { timeoutMs: 160_000 });
  const problems = translationSetProblems(raw);
  if (problems.length) {
    console.warn('[Translate] generated set failed checks:', problems);
    throw new TranslationSetError('Bộ câu vừa tạo chưa đạt kiểm định. Bạn thử tạo lại nhé.');
  }
  const id = newId();
  const createdAt = new Date().toISOString();
  const g = raw as GeneratedTranslationSet;
  if (userId) {
    const { error } = await supabase.from(SETS_TABLE).insert({ id, user_id: userId, task, prompt: clean, body: g });
    if (error) console.warn('[Translate] could not save set:', error.message);
  }
  return toTranslationSet(id, task, clean, g, createdAt);
}

const LIST_LIMIT = 20;

/**
 * The learner's AI-written sets, newest first. `complete` is true when the
 * list surely holds all of them (loaded without error, under the limit), so
 * records of sets missing from it can be dropped.
 */
export async function listGeneratedSets(userId: string): Promise<{ sets: TranslationSet[]; complete: boolean }> {
  if (!userId) return { sets: [], complete: false };
  const { data, error } = await supabase
    .from(SETS_TABLE)
    .select('id, task, prompt, body, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (error) {
    console.warn('[Translate] could not load sets:', error.message);
    return { sets: [], complete: false };
  }
  const rows = data ?? [];
  const sets = rows.flatMap((row: { id: string; task: IeltsWritingTask; prompt: string; body: unknown; created_at: string }) =>
    translationSetProblems(row.body).length ? [] : [toTranslationSet(row.id, row.task, row.prompt, row.body as GeneratedTranslationSet, row.created_at)],
  );
  return { sets, complete: rows.length < LIST_LIMIT };
}

export async function deleteGeneratedSet(setId: string): Promise<boolean> {
  const { error } = await supabase.from(SETS_TABLE).delete().eq('id', setId.replace(GENERATED_SET_PREFIX, ''));
  if (error) {
    console.warn('[Translate] could not delete set:', error.message);
    return false;
  }
  return true;
}
