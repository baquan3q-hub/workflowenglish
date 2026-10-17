/**
 * Luyện câu I/O: making the sentences, grading one answer, and the
 * sentence_attempts log (migration 008).
 */

import type { FlashcardData, SentenceGrade, SentenceItem, SentenceVerdict } from '../types';
import { invokeAi } from './aiClient';
import { applyRating } from './reviewService';
import { localGrade, pendingWrongSentences, withIds, type AttemptRow } from './sentenceLogic';
import { supabase } from './supabaseClient';

const TABLE = 'sentence_attempts';

/** Sentences for a lesson's words. The server validates the shape and retries once. */
export async function generateSentences(cards: FlashcardData[], level: string, topic: string): Promise<SentenceItem[]> {
  const { items } = await invokeAi<{ items: Array<Omit<SentenceItem, 'id'>> }>(
    'generateSentences',
    {
      level,
      topic,
      words: cards.slice(0, 30).map((c) => ({ word: c.word, meaning: c.meaningVietnamese, partOfSpeech: c.partOfSpeech })),
    },
    { timeoutMs: 60_000 },
  );
  const sentences = withIds(items ?? [], `s${Date.now().toString(36)}`);
  if (sentences.length === 0) throw new Error('No sentences returned');
  return sentences;
}

type ServerGrade = Omit<SentenceGrade, 'gradedBy' | 'latencyMs'>;

/** Local match first; otherwise one AI call (10 s per model on the server). */
export async function gradeSentence(item: SentenceItem, answer: string, level: string): Promise<SentenceGrade> {
  const local = localGrade(item, answer);
  if (local) return local;
  const started = performance.now();
  const g = await invokeAi<ServerGrade>(
    'gradeSentence',
    { promptVi: item.promptVi, targetWords: item.targetWords, references: item.references, answer, level },
    { timeoutMs: 25_000 },
  );
  return { ...g, gradedBy: 'ai', latencyMs: Math.round(performance.now() - started) };
}

/**
 * Log the attempt and, when a target word was misused, mark it Hard in SRS.
 * Fire-and-forget: practice never waits on these writes.
 */
export function recordSentenceAttempt(input: {
  userId: string;
  lessonRecordId: string | null;
  item: SentenceItem;
  answer: string;
  grade: SentenceGrade;
}): void {
  const { userId, lessonRecordId, item, answer, grade } = input;
  void Promise.resolve(
    supabase.from(TABLE).insert({
      user_id: userId,
      lesson_record_id: lessonRecordId,
      target_words: item.targetWords,
      reference_answers: item.references,
      prompt_vi: item.promptVi,
      user_answer: answer,
      verdict: grade.verdict,
      score: grade.score,
      corrected: grade.corrected,
      errors: grade.errors,
      graded_by: grade.gradedBy,
      latency_ms: grade.latencyMs,
    }),
  ).then(({ error }) => {
    if (error) console.warn('[Sentence] could not save attempt:', error.message);
  });

  if (!grade.usedTargetWords) {
    for (const word of item.targetWords) {
      void applyRating({ userId, word, rating: 1, source: 'sentence', creditGoal: false }).catch((err) =>
        console.warn('[Sentence] could not record rating:', err),
      );
    }
  }
}

/** Sentences answered "Cần sửa" in the last 30 days and not fixed since. */
export async function getWrongSentences(userId: string, limit = 10): Promise<SentenceItem[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select('prompt_vi, target_words, reference_answers, verdict, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return pendingWrongSentences((data ?? []) as AttemptRow[], limit);
}

export type { SentenceVerdict };
