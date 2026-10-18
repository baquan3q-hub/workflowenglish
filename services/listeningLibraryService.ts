/**
 * Reads and writes `listening_library` (migration 011). Learners get the
 * published tests; admins (rows in `app_admins`) get every test and may
 * change them. RLS enforces both, so these calls only follow it.
 *
 * Before the migration is applied every call quietly returns nothing.
 */
import { registerListeningTests, unregisterListeningTest, type ListeningSection, type ListeningTest } from '../data/ielts/listening';
import { invokeAi } from './aiClient';
import {
  applyNotes,
  isLibraryTestId,
  libraryRow,
  libraryRowId,
  libraryTest,
  isMissingTable,
  libraryErrorText,
  libraryTestId,
  notesPayload,
  rowToLibrary,
  type LibraryItem,
  type LibraryRow,
  type NotesOutcome,
} from './listeningLibraryLogic';
import { supabase } from './supabaseClient';
import type { QuestionNote } from '../supabase/functions/ai-proxy/ops/listeningNotes.ts';

const TABLE = 'listening_library';
const COLUMNS = 'id, title, kind, status, description_vi, sections, created_at, updated_at';

/** Whether the signed-in user is an admin. False when the table is missing. */
export async function isAppAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) {
    // Expected before migration 011; anything else is worth a look.
    if (!isMissingTable(error.message)) console.warn('[Library] admin check failed:', error.message);
    return false;
  }
  return !!data;
}

const toItems = (rows: unknown[] | null) =>
  ((rows ?? []) as LibraryRow[]).map(rowToLibrary).filter((i): i is LibraryItem => i !== null);

/** Published tests, newest first, made openable. */
export async function getPublishedLibrary(): Promise<ListeningTest[]> {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('status', 'published').order('updated_at', { ascending: false }).limit(100);
  if (error) {
    if (!isMissingTable(error.message)) console.warn('[Library] could not load tests:', error.message);
    return [];
  }
  const tests = toItems(data).map(libraryTest);
  registerListeningTests(tests);
  return tests;
}

/** The most the admin list loads; the page says so when it is reached. */
export const LIBRARY_LIST_LIMIT = 500;

/** Every test, drafts included. Admins only (RLS returns published rows to anyone else). */
export async function getAllLibrary(): Promise<LibraryItem[]> {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).order('updated_at', { ascending: false }).limit(LIBRARY_LIST_LIMIT);
  if (error) throw new Error(libraryErrorText(error.message));
  return toItems(data);
}

/** One test by its test id, for opening an old attempt. */
export async function loadLibraryTest(testId: string): Promise<ListeningTest | null> {
  if (!isLibraryTestId(testId)) return null;
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', libraryRowId(testId)).maybeSingle();
  if (error || !data) return null;
  const item = rowToLibrary(data as LibraryRow);
  if (!item) return null;
  const test = libraryTest(item);
  registerListeningTests([test]);
  return test;
}

/** Inserts or updates; returns the stored item. Throws with the database message. */
export async function saveLibraryItem(item: LibraryItem): Promise<LibraryItem> {
  const { data, error } = await supabase.from(TABLE).upsert(libraryRow(item)).select(COLUMNS).single();
  if (error) throw new Error(libraryErrorText(error.message));
  const saved = rowToLibrary(data as LibraryRow);
  if (!saved) throw new Error('saved row is not a test');
  // A changed test must not stay cached under its old content.
  unregisterListeningTest(libraryTestId(saved.id));
  if (saved.status === 'published') registerListeningTests([libraryTest(saved)]);
  return saved;
}

export async function deleteLibraryItem(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
  if (error) throw new Error(libraryErrorText(error.message));
  // RLS drops rows it hides without an error.
  if (!data?.length) throw new Error('Đề không còn hoặc tài khoản không có quyền xoá.');
  unregisterListeningTest(libraryTestId(id));
}

/** Asks the listeningNotes op for the missing notes of a part. Throws AiError. */
export async function suggestNotes(section: ListeningSection, api: typeof invokeAi = invokeAi): Promise<NotesOutcome> {
  const { notes } = await api<{ notes: QuestionNote[] }>('listeningNotes', notesPayload(section));
  return applyNotes(section, notes);
}

/**
 * Registers a draft so the normal practice screen can open it. Its own id keeps
 * the draft away from the published test, old attempts and practice drafts.
 */
export function registerPreview(item: LibraryItem): ListeningTest {
  const test = { ...libraryTest(item), id: `preview_${item.id}` };
  unregisterListeningTest(test.id);
  registerListeningTests([test]);
  return test;
}
