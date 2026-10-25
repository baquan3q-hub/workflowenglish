/**
 * Writing practice (pure): the word and time limits of each task, the word
 * count, the draft kept on the device while a learner writes, and the
 * per-question progress the hub shows from past attempts.
 */
import type { IeltsAttempt, IeltsQuestion } from '../types';

export type WritingTask = 'task_1' | 'task_2';

/** What the exam asks for: at least this many words, about this many minutes. */
export const WRITING_LIMITS: Record<WritingTask, { minWords: number; minutes: number }> = {
  task_1: { minWords: 150, minutes: 20 },
  task_2: { minWords: 250, minutes: 40 },
};

export const writingLimits = (question: Pick<IeltsQuestion, 'taskOrPart'>) =>
  WRITING_LIMITS[question.taskOrPart === 'task_1' ? 'task_1' : 'task_2'];

export const countWords = (text: string): number => (text.trim() ? text.trim().split(/\s+/).length : 0);

// --- Drafts ----------------------------------------------------------------------

export interface WritingDraft {
  questionId: string;
  text: string;
  /** Seconds already spent, so the timer resumes instead of restarting. */
  elapsedSeconds: number;
  savedAt: string;
}

const PREFIX = 'ielts-writing-draft:';
const draftKey = (userId: string, questionId: string) => `${PREFIX}${userId}:${questionId}`;

/** Drafts shorter than this are not worth keeping. */
export const MIN_DRAFT_WORDS = 5;
/** Drafts the hub offers to resume. */
export const MAX_RESUME_DRAFTS = 3;

function parseDraft(raw: string | null, questionId: string): WritingDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<WritingDraft>;
    if (typeof d?.text !== 'string' || !d.text.trim()) return null;
    return {
      questionId,
      text: d.text,
      elapsedSeconds: Math.max(0, Math.floor(Number(d.elapsedSeconds) || 0)),
      savedAt: typeof d.savedAt === 'string' ? d.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function readWritingDraft(userId: string, questionId: string, storage: Pick<Storage, 'getItem'> = localStorage): WritingDraft | null {
  try {
    return parseDraft(storage.getItem(draftKey(userId, questionId)), questionId);
  } catch {
    return null;
  }
}

/** Keeps the draft, or drops it when there is next to nothing in it. */
export function saveWritingDraft(
  userId: string,
  questionId: string,
  text: string,
  elapsedSeconds: number,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage,
  now: () => Date = () => new Date(),
): boolean {
  try {
    if (countWords(text) < MIN_DRAFT_WORDS) {
      storage.removeItem(draftKey(userId, questionId));
      return false;
    }
    const draft: Omit<WritingDraft, 'questionId'> = { text, elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)), savedAt: now().toISOString() };
    storage.setItem(draftKey(userId, questionId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearWritingDraft(userId: string, questionId: string, storage: Pick<Storage, 'removeItem'> = localStorage) {
  try {
    storage.removeItem(draftKey(userId, questionId));
  } catch {
    /* nothing saved */
  }
}

/** The learner's drafts, newest first, as many as the hub shows. */
export function listWritingDrafts(userId: string, storage: Pick<Storage, 'length' | 'key' | 'getItem'> = localStorage): WritingDraft[] {
  const prefix = `${PREFIX}${userId}:`;
  const found: WritingDraft[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const draft = parseDraft(storage.getItem(key), key.slice(prefix.length));
      if (draft) found.push(draft);
    }
  } catch {
    return [];
  }
  return found.sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, MAX_RESUME_DRAFTS);
}

// --- Progress per prompt ---------------------------------------------------------------

export interface PromptProgress {
  attempts: number;
  bestBand: number | null;
}

/** Attempts and best band per prompt text, from the learner's graded Writing attempts. */
export function progressByPrompt(attempts: readonly IeltsAttempt[]): Map<string, PromptProgress> {
  const map = new Map<string, PromptProgress>();
  for (const a of attempts) {
    if (a.skill !== 'writing') continue;
    const cur = map.get(a.questionPrompt) ?? { attempts: 0, bestBand: null };
    cur.attempts += 1;
    if (a.estimatedBand != null) cur.bestBand = cur.bestBand == null ? a.estimatedBand : Math.max(cur.bestBand, a.estimatedBand);
    map.set(a.questionPrompt, cur);
  }
  return map;
}

export interface WritingSummary {
  prompts: number;
  attempts: number;
  bestBand: number | null;
  averageBand: number | null;
}

export function summarizeWriting(attempts: readonly IeltsAttempt[]): WritingSummary {
  const writing = attempts.filter((a) => a.skill === 'writing');
  const bands = writing.map((a) => a.estimatedBand).filter((b): b is number => b != null);
  return {
    prompts: new Set(writing.map((a) => a.questionPrompt)).size,
    attempts: writing.length,
    bestBand: bands.length ? Math.max(...bands) : null,
    averageBand: bands.length ? Math.round((bands.reduce((s, b) => s + b, 0) / bands.length) * 10) / 10 : null,
  };
}

// --- Exam mode ---------------------------------------------------------------------------

export type WritingMode = 'practice' | 'exam';

const MODE_KEY = 'ielts-writing-mode';

export function readWritingMode(storage: Pick<Storage, 'getItem'> = localStorage): WritingMode {
  try {
    return storage.getItem(MODE_KEY) === 'exam' ? 'exam' : 'practice';
  } catch {
    return 'practice';
  }
}

export function saveWritingMode(mode: WritingMode, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(MODE_KEY, mode);
  } catch {
    /* the choice just is not remembered */
  }
}

/** Seconds left of the task's time limit; 0 once it is over. */
export function examSecondsLeft(startMs: number, nowMs: number, minutes: number): number {
  return Math.max(0, Math.ceil(minutes * 60 - (nowMs - startMs) / 1000));
}

/** What happens when the time is up: send what is written, or nothing to grade. */
export const examOutcome = (wordCount: number): 'submit' | 'empty' => (wordCount >= 1 ? 'submit' : 'empty');
