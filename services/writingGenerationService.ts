/**
 * AI-written Writing prompts. The generateWritingPrompt op writes and checks a
 * prompt; the app checks it again with the same rules, keeps it in
 * `writing_generated` (migration 014) and registers it as `wgen_<row id>` so
 * the hub, the practice screen and drafts find it like a bundled prompt.
 *
 * Before the migration is applied a generated prompt still works for the
 * current visit; it is just not kept.
 */
import { invokeAi } from './aiClient';
import {
  generatedWritingQuestionId,
  generatedWritingResultProblems,
  rowToGeneratedWriting,
  toGeneratedWritingItem,
  WritingCheckError,
  type GeneratedWriting,
  type GeneratedWritingItem,
  type GeneratedWritingRow,
  type GenerateWritingRequest,
} from './writingGenerationLogic';
import type { WritingQuestionBody } from './writingLibraryLogic';
import { registerWritingQuestions, unregisterWritingQuestion } from './writingQuestionRegistry';
import { supabase } from './supabaseClient';

const TABLE = 'writing_generated';
const COLUMNS = 'id, task, topic, difficulty, question, created_at';

/** The op waits for a second model when the first prompt fails its checks, so allow for that. */
const GENERATE_TIMEOUT_MS = 150_000;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

async function ask(req: GenerateWritingRequest): Promise<GeneratedWriting> {
  const raw = await invokeAi<unknown>(
    'generateWritingPrompt',
    { task: req.task, questionType: req.questionType, topic: req.topic.trim().slice(0, 100), difficulty: req.difficulty },
    { timeoutMs: GENERATE_TIMEOUT_MS },
  );
  const problems = generatedWritingResultProblems(raw, req);
  if (problems.length) {
    console.warn('[Writing] generated prompt failed checks:', problems);
    throw new WritingCheckError('Đề vừa tạo chưa đạt kiểm định. Bạn thử tạo lại nhé.');
  }
  return raw as GeneratedWriting;
}

/** Asks the op for a prompt, checks it, saves it and makes it available. Throws AiError or WritingCheckError. */
export async function generateWriting(userId: string, req: GenerateWritingRequest): Promise<GeneratedWritingItem> {
  const g = await ask(req);
  const id = newId();
  const topic = req.topic.trim().slice(0, 100);
  const item = toGeneratedWritingItem(id, g, { topic, createdAt: new Date().toISOString(), saved: !!userId });

  if (userId) {
    const { error } = await supabase.from(TABLE).insert({ id, user_id: userId, task: g.task, topic: topic || null, difficulty: item.difficulty, question: g });
    if (error) {
      console.warn('[Writing] could not save generated prompt:', error.message);
      item.saved = false;
    }
  }
  registerWritingQuestions([item.question]);
  return item;
}

/** A prompt for the admin editor to start from; nothing is saved. */
export async function draftWritingPrompt(task: GenerateWritingRequest['task'], questionType: string): Promise<WritingQuestionBody> {
  const g = await ask({ task, questionType, topic: '', difficulty: 'medium' });
  return g.question;
}

/** The learner's generated prompts, newest first. Empty when the table is missing. */
export async function getGeneratedWriting(userId: string, limit = 20): Promise<GeneratedWritingItem[]> {
  if (!userId) return [];
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.warn('[Writing] could not load generated prompts:', error.message);
    return [];
  }
  const list = ((data ?? []) as GeneratedWritingRow[]).map(rowToGeneratedWriting).filter((g): g is GeneratedWritingItem => g !== null);
  registerWritingQuestions(list.map((g) => g.question));
  return list;
}

export async function deleteGeneratedWriting(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    console.warn('[Writing] could not delete generated prompt:', error.message);
    return false;
  }
  unregisterWritingQuestion(generatedWritingQuestionId(id));
  return true;
}
