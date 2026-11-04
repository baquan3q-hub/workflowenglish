/**
 * "Kho câu trả lời" service: answers are built through buildSpeakingAnswer
 * and kept in `speaking_answers` (migration 017), one row per question, with
 * a copy on the device. Without the migration the device copy is all there is.
 */
import { invokeAi } from './aiClient';
import { supabase } from './supabaseClient';
import { builtAnswerProblems, type BuiltSpeakingAnswer } from '../supabase/functions/ai-proxy/ops/speakingBank.ts';
import { sanitizeSavedAnswer, type IdeaNote, type SavedAnswer, type SpeakingPartKey } from './speakingBankLogic';

const TABLE = 'speaking_answers';
const LOCAL_PREFIX = 'ielts-speaking-bank:v1:';

export class SpeakingAnswerError extends Error {}

function readLocal(userId: string): Record<string, SavedAnswer> {
  try {
    const raw = userId ? localStorage.getItem(LOCAL_PREFIX + userId) : null;
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const out: Record<string, SavedAnswer> = {};
    for (const v of Object.values(parsed ?? {})) {
      const s = sanitizeSavedAnswer(v);
      if (s) out[s.key] = s;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocal(userId: string, all: Record<string, SavedAnswer>): void {
  if (!userId) return;
  try {
    localStorage.setItem(LOCAL_PREFIX + userId, JSON.stringify(all));
  } catch {
    // Storage full or blocked: the account copy (if any) still has it.
  }
}

/** Every saved answer: the account's rows, with newer device copies winning. */
export async function loadSavedAnswers(userId: string): Promise<SavedAnswer[]> {
  const local = readLocal(userId);
  if (userId) {
    const { data, error } = await supabase.from(TABLE).select('body').eq('user_id', userId).order('updated_at', { ascending: false }).limit(300);
    if (error) console.warn('[SpeakingBank] could not load answers:', error.message);
    for (const row of (data ?? []) as { body: unknown }[]) {
      const s = sanitizeSavedAnswer(row.body);
      if (s && (!local[s.key] || Date.parse(local[s.key].updatedAt) < Date.parse(s.updatedAt))) local[s.key] = s;
    }
    writeLocal(userId, local);
  }
  return Object.values(local);
}

export async function saveAnswer(userId: string, saved: SavedAnswer): Promise<void> {
  const local = readLocal(userId);
  local[saved.key] = saved;
  writeLocal(userId, local);
  if (!userId) return;
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      question_key: saved.key.slice(0, 120),
      part: saved.part,
      question: saved.question.slice(0, 600),
      body: saved,
      stage: saved.stage,
      practice_count: saved.practiceCount,
      due_at: saved.dueAt,
      updated_at: saved.updatedAt,
    },
    { onConflict: 'user_id,question_key' },
  );
  if (error) console.warn('[SpeakingBank] could not save answer:', error.message);
}

export async function deleteAnswer(userId: string, key: string): Promise<void> {
  const local = readLocal(userId);
  delete local[key];
  writeLocal(userId, local);
  if (!userId) return;
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('question_key', key.slice(0, 120));
  if (error) console.warn('[SpeakingBank] could not delete answer:', error.message);
}

export interface BuildRequest {
  part: SpeakingPartKey;
  question: string;
  bullets: string[];
  frame: string;
  ideas: IdeaNote[];
  notes: string;
  targetBand: string;
}

/** The answer built from the learner's ideas. Throws AiError or SpeakingAnswerError. */
export async function buildAnswer(req: BuildRequest): Promise<BuiltSpeakingAnswer> {
  const built = await invokeAi<BuiltSpeakingAnswer>(
    'buildSpeakingAnswer',
    {
      part: req.part,
      question: req.question,
      bullets: req.bullets,
      frame: req.frame,
      ideas: req.ideas.filter((i) => i.text.trim()),
      notes: req.notes,
      targetBand: req.targetBand,
    },
    { timeoutMs: 45_000 },
  );
  const problems = builtAnswerProblems(built, req.part);
  if (problems.length) {
    console.warn('[SpeakingBank] built answer failed checks:', problems);
    throw new SpeakingAnswerError('Câu trả lời vừa tạo chưa đạt (quá ngắn hoặc thiếu từ khoá). Bạn bấm tạo lại nhé.');
  }
  return built;
}

/** The band the op is asked for: the learner's goal, rounded to a half band within 5.5-8. */
export function bandForTarget(target: number | null): string {
  if (target == null || !Number.isFinite(target)) return '6.5';
  const b = Math.min(8, Math.max(5.5, Math.round(target * 2) / 2));
  return Number.isInteger(b) ? String(b) : b.toFixed(1);
}
