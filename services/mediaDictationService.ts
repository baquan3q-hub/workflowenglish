/**
 * Media dictation service: exercises in `dictation_exercises` (a learner's
 * own rows are private; admins publish rows for everyone), progress in
 * `dictation_progress` (migration 017), both with a copy on the device, and
 * AI transcripts of YouTube clips through transcribeYouTube.
 */
import { invokeAi } from './aiClient';
import { supabase } from './supabaseClient';
import { MAX_CLIP_SECONDS, tidyTranscript } from '../supabase/functions/ai-proxy/ops/mediaTranscript.ts';
import {
  emptyProgress,
  sanitizeExercise,
  sanitizeProgress,
  type DictationProgress,
  type MediaExercise,
  type MediaSentence,
} from './mediaDictationLogic';

export { MAX_CLIP_SECONDS };

const TABLE = 'dictation_exercises';
const PROGRESS_TABLE = 'dictation_progress';
const LOCAL_EXERCISES = 'ielts-media-dictation:v1:';
const LOCAL_PROGRESS = 'ielts-media-progress:v1:';

export interface StoredExercise extends MediaExercise {
  status: 'private' | 'published';
  /** The learner made it (they may edit and delete it). */
  own: boolean;
  updatedAt: string;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked.
  }
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

function localExercises(userId: string): StoredExercise[] {
  const list = readJson<unknown[]>(LOCAL_EXERCISES + userId, []);
  return (Array.isArray(list) ? list : []).flatMap((raw) => {
    const e = sanitizeExercise(raw);
    const r = raw as { updatedAt?: string };
    return e ? [{ ...e, status: 'private' as const, own: true, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(0).toISOString() }] : [];
  });
}

/** Published exercises and the learner's own, newest first. */
export async function listExercises(userId: string): Promise<StoredExercise[]> {
  const out = new Map<string, StoredExercise>();
  for (const e of localExercises(userId)) out.set(e.id, e);
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, owner_id, title, status, category, level, body, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) console.warn('[MediaDictation] could not load exercises:', error.message);
  for (const row of (data ?? []) as { id: string; owner_id: string; title: string; status: 'private' | 'published'; category: string; level: string; body: Record<string, unknown>; updated_at: string }[]) {
    const e = sanitizeExercise({ ...row.body, id: row.id, title: row.title, category: row.category, level: row.level });
    if (e) out.set(e.id, { ...e, status: row.status, own: row.owner_id === userId, updatedAt: row.updated_at });
  }
  return [...out.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

/** Saves (adds or updates) an exercise; `publish` only works for admins (the table's policy). */
export async function saveExercise(userId: string, exercise: MediaExercise, publish = false): Promise<StoredExercise> {
  const id = exercise.id || newId();
  const updatedAt = new Date().toISOString();
  const stored: StoredExercise = { ...exercise, id, status: publish ? 'published' : 'private', own: true, updatedAt };
  const local = localExercises(userId).filter((e) => e.id !== id);
  writeJson(LOCAL_EXERCISES + userId, [{ ...stored }, ...local].slice(0, 50));
  if (userId) {
    const { error } = await supabase.from(TABLE).upsert({
      id,
      owner_id: userId,
      title: exercise.title.trim().slice(0, 200),
      status: stored.status,
      category: exercise.category,
      level: exercise.level,
      body: { source: exercise.source, sentences: exercise.sentences, credit: exercise.credit },
      updated_at: updatedAt,
    });
    if (error) {
      console.warn('[MediaDictation] could not save exercise:', error.message);
      return { ...stored, status: 'private' };
    }
  }
  return stored;
}

export async function deleteExercise(userId: string, id: string): Promise<void> {
  writeJson(
    LOCAL_EXERCISES + userId,
    localExercises(userId).filter((e) => e.id !== id),
  );
  try {
    localStorage.removeItem(LOCAL_PROGRESS + userId + ':' + id);
  } catch {
    // Storage blocked.
  }
  if (!userId) return;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) console.warn('[MediaDictation] could not delete exercise:', error.message);
}

export async function loadProgress(userId: string, exerciseId: string): Promise<DictationProgress> {
  const local = sanitizeProgress(readJson<unknown>(LOCAL_PROGRESS + userId + ':' + exerciseId, null));
  if (!userId) return local;
  const { data, error } = await supabase.from(PROGRESS_TABLE).select('progress').eq('user_id', userId).eq('exercise_key', exerciseId.slice(0, 80)).maybeSingle();
  if (error) console.warn('[MediaDictation] could not load progress:', error.message);
  const remote = data ? sanitizeProgress((data as { progress: unknown }).progress) : emptyProgress();
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
}

export async function saveProgress(userId: string, exerciseId: string, progress: DictationProgress): Promise<void> {
  writeJson(LOCAL_PROGRESS + userId + ':' + exerciseId, progress);
  if (!userId) return;
  const { error } = await supabase
    .from(PROGRESS_TABLE)
    .upsert({ user_id: userId, exercise_key: exerciseId.slice(0, 80), progress, updated_at: progress.updatedAt }, { onConflict: 'user_id,exercise_key' });
  if (error) console.warn('[MediaDictation] could not save progress:', error.message);
}

/** The sentences of a YouTube clip, written down by the AI. Throws AiError. */
export async function transcribeVideo(videoId: string, start: number, end: number): Promise<MediaSentence[]> {
  const raw = await invokeAi<unknown>('transcribeYouTube', { videoId, start, end }, { timeoutMs: 170_000 });
  return tidyTranscript(raw, start, end).map((s, i) => ({ id: `s${i + 1}`, text: s.text, start: s.start, end: s.end }));
}

export const newExerciseId = newId;
