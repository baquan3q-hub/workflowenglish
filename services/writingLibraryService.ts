/**
 * Reads and writes `writing_library` (migration 014). Learners get the
 * published prompts; admins get every prompt and may change them. RLS
 * enforces both, so these calls only follow it.
 *
 * Before the migration is applied the learner call quietly returns nothing.
 */
import type { IeltsQuestion } from '../types';
import { isMissingTable } from './listeningLibraryLogic';
import {
  libraryWritingQuestion,
  rowToWritingItem,
  writingItemRow,
  writingLibraryErrorText,
  writingLibraryQuestionId,
  type WritingLibraryItem,
  type WritingLibraryRow,
} from './writingLibraryLogic';
import { registerWritingQuestions, unregisterWritingQuestion } from './writingQuestionRegistry';
import { supabase } from './supabaseClient';

const TABLE = 'writing_library';
const COLUMNS = 'id, title, kind, status, question, created_at, updated_at';

const toItems = (rows: unknown[] | null) =>
  ((rows ?? []) as WritingLibraryRow[]).map(rowToWritingItem).filter((i): i is WritingLibraryItem => i !== null);

/** Published prompts, newest first, made available to the hub. */
export async function getPublishedWritingLibrary(): Promise<IeltsQuestion[]> {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('status', 'published').order('updated_at', { ascending: false }).limit(200);
  if (error) {
    if (!isMissingTable(error.message)) console.warn('[WritingLibrary] could not load prompts:', error.message);
    return [];
  }
  const questions = toItems(data).map(libraryWritingQuestion);
  registerWritingQuestions(questions);
  return questions;
}

/** The most the admin list loads; the page says so when it is reached. */
export const WRITING_LIST_LIMIT = 500;

/** Every prompt, drafts included. Admins only (RLS returns published rows to anyone else). */
export async function getAllWritingLibrary(): Promise<WritingLibraryItem[]> {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).order('updated_at', { ascending: false }).limit(WRITING_LIST_LIMIT);
  if (error) throw new Error(writingLibraryErrorText(error.message));
  return toItems(data);
}

/** Inserts or updates; returns the stored item. Throws with the database message. */
export async function saveWritingLibraryItem(item: WritingLibraryItem): Promise<WritingLibraryItem> {
  const { data, error } = await supabase.from(TABLE).upsert(writingItemRow(item)).select(COLUMNS).single();
  if (error) throw new Error(writingLibraryErrorText(error.message));
  const saved = rowToWritingItem(data as WritingLibraryRow);
  if (!saved) throw new Error('saved row is not a prompt');
  // A changed prompt must not stay cached under its old content, and a draft must not show to learners.
  unregisterWritingQuestion(writingLibraryQuestionId(saved.id));
  if (saved.status === 'published') registerWritingQuestions([libraryWritingQuestion(saved)]);
  return saved;
}

export async function deleteWritingLibraryItem(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
  if (error) throw new Error(writingLibraryErrorText(error.message));
  // RLS drops rows it hides without an error.
  if (!data?.length) throw new Error('Đề không còn hoặc tài khoản không có quyền xoá.');
  unregisterWritingQuestion(writingLibraryQuestionId(id));
}
