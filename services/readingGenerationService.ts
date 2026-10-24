/**
 * AI-generated Reading passages (IELTS phase R8). The generateReadingPassage
 * op writes and checks a passage; the app checks it again with the same
 * rules, keeps it in `reading_generated` (migration 012) and opens it as a
 * one-passage practice test whose id is `rgen_<row id>`.
 *
 * Before the migration is applied a generated passage still works for the
 * current visit; it is just not kept.
 */
import { registerReadingTests, unregisterReadingTest, type ReadingTest } from '../data/ielts/reading';
import { invokeAi } from './aiClient';
import {
  generatedReadingProblems,
  generatedReadingRowId,
  generatedReadingTest,
  generatedReadingTestId,
  isGeneratedReadingTestId,
  ReadingCheckError,
  rowToGeneratedReading,
  storedReading,
  toGeneratedItem,
  type GeneratedReadingItem,
  type GeneratedReadingRow,
  type GenerateReadingRequest,
} from './readingGenerationLogic';
import type { GeneratedReading } from '../supabase/functions/ai-proxy/ops/readingGenerate.ts';
import { supabase } from './supabaseClient';

const TABLE = 'reading_generated';
const COLUMNS = 'id, part, topic, difficulty, passage, created_at';
const GENERATE_TIMEOUT_MS = 270_000;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/** Asks the op for a passage, checks it, saves it and makes it openable. Throws AiError or ReadingCheckError. */
export async function generateReading(userId: string, req: GenerateReadingRequest): Promise<GeneratedReadingItem> {
  const topic = req.topic.trim().slice(0, 100);
  // The op may retry and fall back to a second model, up to 120 s each; the default 90 s would give up first.
  const raw = await invokeAi<unknown>(
    'generateReadingPassage',
    { part: req.part, topic, difficulty: req.difficulty, kinds: req.kinds },
    { timeoutMs: GENERATE_TIMEOUT_MS },
  );
  const problems = generatedReadingProblems(raw, req.part, req.kinds, req.difficulty);
  if (problems.length) {
    console.warn('[Reading] generated passage failed checks:', problems);
    throw new ReadingCheckError('Đề vừa tạo chưa đạt kiểm định. Bạn thử tạo lại nhé.');
  }
  const id = newId();
  const item = toGeneratedItem(id, raw as GeneratedReading, { topic, createdAt: new Date().toISOString(), saved: !!userId });

  if (userId) {
    const { error } = await supabase
      .from(TABLE)
      .insert({ id, user_id: userId, part: req.part, topic: topic || null, difficulty: item.difficulty, passage: storedReading(item) });
    if (error) {
      console.warn('[Reading] could not save generated passage:', error.message);
      item.saved = false;
    }
  }
  registerReadingTests([generatedReadingTest(item)]);
  return item;
}

/** The learner's generated passages, newest first. Empty when the table is missing. */
export async function getGeneratedReading(userId: string, limit = 20): Promise<GeneratedReadingItem[]> {
  if (!userId) return [];
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) {
    console.warn('[Reading] could not load generated passages:', error.message);
    return [];
  }
  const list = ((data ?? []) as GeneratedReadingRow[]).map(rowToGeneratedReading).filter((g): g is GeneratedReadingItem => g !== null);
  registerReadingTests(list.map(generatedReadingTest));
  return list;
}

/** Loads one generated test by its test id, for opening an old attempt. */
export async function loadGeneratedReadingTest(testId: string): Promise<ReadingTest | null> {
  if (!isGeneratedReadingTestId(testId)) return null;
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', generatedReadingRowId(testId)).maybeSingle();
  if (error || !data) return null;
  const item = rowToGeneratedReading(data as GeneratedReadingRow);
  if (!item) return null;
  const test = generatedReadingTest(item);
  registerReadingTests([test]);
  return test;
}

export async function deleteGeneratedReading(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    console.warn('[Reading] could not delete generated passage:', error.message);
    return false;
  }
  unregisterReadingTest(generatedReadingTestId(id));
  return true;
}
