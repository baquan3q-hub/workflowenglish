/**
 * Reads and writes `reading_library` (migration 012). Learners get the
 * published tests; admins get every test and may change them. RLS enforces
 * both, so these calls only follow it.
 *
 * Before the migration is applied the learner calls quietly return nothing.
 */
import { registerReadingTests, unregisterReadingTest } from '../data/ielts/reading';
import type { ReadingPassage, ReadingTest } from '../data/ielts/reading/types';
import { invokeAi } from './aiClient';
import { isMissingTable } from './listeningLibraryLogic';
import {
  applyReadingNotes,
  isReadingLibraryTestId,
  libraryReadingTest,
  readingItemRow,
  readingLibraryErrorText,
  readingLibraryRowId,
  readingLibraryTestId,
  readingNotesPayload,
  readingPreviewTestId,
  rowToReadingItem,
  type ReadingLibraryItem,
  type ReadingLibraryRow,
  type ReadingNotesOutcome,
} from './readingLibraryLogic';
import { supabase } from './supabaseClient';
import type { ReadingQuestionNote } from '../supabase/functions/ai-proxy/ops/readingNotes.ts';

const TABLE = 'reading_library';
const COLUMNS = 'id, title, kind, status, description_vi, passages, created_at, updated_at';

const toItems = (rows: unknown[] | null) =>
  ((rows ?? []) as ReadingLibraryRow[]).map(rowToReadingItem).filter((i): i is ReadingLibraryItem => i !== null);

/** Published tests, newest first, made openable. */
export async function getPublishedReadingLibrary(): Promise<ReadingTest[]> {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('status', 'published').order('updated_at', { ascending: false }).limit(100);
  if (error) {
    if (!isMissingTable(error.message)) console.warn('[ReadingLibrary] could not load tests:', error.message);
    return [];
  }
  const tests = toItems(data).map((i) => libraryReadingTest(i));
  registerReadingTests(tests);
  return tests;
}

/** The most the admin list loads; the page says so when it is reached. */
export const READING_LIST_LIMIT = 500;

/** Every test, drafts included. Admins only (RLS returns published rows to anyone else). */
export async function getAllReadingLibrary(): Promise<ReadingLibraryItem[]> {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).order('updated_at', { ascending: false }).limit(READING_LIST_LIMIT);
  if (error) throw new Error(readingLibraryErrorText(error.message));
  return toItems(data);
}

/** One test by its test id, for opening an old attempt. */
export async function loadReadingLibraryTest(testId: string): Promise<ReadingTest | null> {
  if (!isReadingLibraryTestId(testId)) return null;
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', readingLibraryRowId(testId)).maybeSingle();
  if (error || !data) return null;
  const item = rowToReadingItem(data as ReadingLibraryRow);
  if (!item) return null;
  const test = libraryReadingTest(item);
  registerReadingTests([test]);
  return test;
}

/** Inserts or updates; returns the stored item. Throws with the database message. */
export async function saveReadingLibraryItem(item: ReadingLibraryItem): Promise<ReadingLibraryItem> {
  const { data, error } = await supabase.from(TABLE).upsert(readingItemRow(item)).select(COLUMNS).single();
  if (error) throw new Error(readingLibraryErrorText(error.message));
  const saved = rowToReadingItem(data as ReadingLibraryRow);
  if (!saved) throw new Error('saved row is not a test');
  // A changed test must not stay cached under its old content.
  unregisterReadingTest(readingLibraryTestId(saved.id));
  if (saved.status === 'published') registerReadingTests([libraryReadingTest(saved)]);
  return saved;
}

export async function deleteReadingLibraryItem(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
  if (error) throw new Error(readingLibraryErrorText(error.message));
  // RLS drops rows it hides without an error.
  if (!data?.length) throw new Error('Đề không còn hoặc tài khoản không có quyền xoá.');
  unregisterReadingTest(readingLibraryTestId(id));
}

/** Asks the readingNotes op for the missing notes of a passage. Throws AiError. */
export async function suggestReadingNotes(passage: ReadingPassage, api: typeof invokeAi = invokeAi): Promise<ReadingNotesOutcome> {
  const { notes } = await api<{ notes: ReadingQuestionNote[] }>('readingNotes', readingNotesPayload(passage));
  return applyReadingNotes(passage, notes);
}

/**
 * Registers a draft so the normal practice screen can open it. Its own id keeps
 * the draft away from the published test, old attempts and practice drafts.
 */
export function registerReadingPreview(item: ReadingLibraryItem): ReadingTest {
  const test = libraryReadingTest(item, readingPreviewTestId(item.id));
  unregisterReadingTest(test.id);
  registerReadingTests([test]);
  return test;
}
