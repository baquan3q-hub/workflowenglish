/**
 * Lesson flow (pure): which steps are done, and the end-of-lesson summary.
 * Step state comes from data the lesson already has (rated cards, quiz,
 * fill-blank and sentence results), so going back to a step never loses a score.
 */

import { AppPhase, MasteryLevel, type LessonProgress, type StepResult, type WordMasteryRecord } from '../types';
import { normalizeWord } from './masteryService';

export type { LessonProgress, StepResult };

export type StepStatus = 'done' | 'current' | 'todo';

export interface LessonStep {
  phase: AppPhase;
  label: string;
  status: StepStatus;
}

export const LESSON_STEPS: ReadonlyArray<{ phase: AppPhase; label: string }> = [
  { phase: AppPhase.FLASHCARDS, label: 'Thẻ từ' },
  { phase: AppPhase.STORY, label: 'Truyện' },
  { phase: AppPhase.QUIZ, label: 'Trắc nghiệm' },
  { phase: AppPhase.FILL_BLANK, label: 'Điền từ' },
  { phase: AppPhase.SENTENCE_PRACTICE, label: 'Luyện câu' },
];

/**
 * A step is done when its own data exists or any later step has data (Truyện
 * has none of its own). The open step is "current" even if done before.
 */
export function lessonStepStates(
  phase: AppPhase,
  flashcardsRated: boolean,
  progress: LessonProgress | undefined,
): LessonStep[] {
  const own = [flashcardsRated, false, !!progress?.quiz, !!progress?.fillBlank, !!progress?.sentences];
  const finished = phase === AppPhase.LESSON_SUMMARY || !!progress?.completedAt;
  return LESSON_STEPS.map((step, i) => {
    const done = finished || own.slice(i).some(Boolean);
    return { ...step, status: step.phase === phase ? 'current' : done ? 'done' : 'todo' };
  });
}

export type SummaryRecord = Pick<
  WordMasteryRecord,
  'id' | 'word' | 'mastery_level' | 'next_review_date' | 'incorrect_count' | 'meaning_vi'
> & { is_suspended?: boolean };

export interface LessonSummary {
  total: number;
  remembered: number;
  /** Words to review now: wrong in this lesson or forgotten. */
  needReview: string[];
  quiz: StepResult | null;
  fillBlank: StepResult | null;
  sentences: StepResult | null;
  /** Up to 3 words missed most in this lesson. */
  mistakes: Array<{ word: string; misses: number; meaning: string | null }>;
  /** Earliest upcoming review day: 0 = today, 1 = tomorrow. */
  nextReview: { days: number; count: number } | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function summarizeLesson(
  lessonWords: ReadonlyArray<string>,
  records: ReadonlyArray<SummaryRecord>,
  progress: LessonProgress | undefined,
  now: Date,
): LessonSummary {
  const words = [...new Set(lessonWords.map(normalizeWord).filter(Boolean))];
  const inLesson = new Set(words);
  const byWord = new Map(records.filter((r) => inLesson.has(r.word)).map((r) => [r.word, r]));

  const misses = new Map<string, number>();
  for (const w of [
    ...(progress?.quiz?.wrong ?? []),
    ...(progress?.fillBlank?.wrong ?? []),
    ...(progress?.sentences?.wrong ?? []),
  ]) {
    const key = normalizeWord(w);
    if (inLesson.has(key)) misses.set(key, (misses.get(key) ?? 0) + 1);
  }

  const needReview = words.filter((w) => misses.has(w) || byWord.get(w)?.mastery_level === MasteryLevel.LAPSED);

  const mistakes = [...misses.entries()]
    .sort(
      ([a, ma], [b, mb]) =>
        mb - ma || (byWord.get(b)?.incorrect_count ?? 0) - (byWord.get(a)?.incorrect_count ?? 0) || words.indexOf(a) - words.indexOf(b),
    )
    .slice(0, 3)
    .map(([word, n]) => ({ word, misses: n, meaning: byWord.get(word)?.meaning_vi ?? null }));

  const buckets = new Map<number, number>();
  const today = startOfDay(now);
  for (const r of byWord.values()) {
    if (r.is_suspended || r.mastery_level === MasteryLevel.NEW || !r.next_review_date) continue;
    const days = Math.max(0, Math.round((startOfDay(new Date(r.next_review_date)) - today) / 86_400_000));
    buckets.set(days, (buckets.get(days) ?? 0) + 1);
  }
  const first = [...buckets.keys()].sort((a, b) => a - b)[0];

  return {
    total: words.length,
    remembered: words.length - needReview.length,
    needReview,
    quiz: progress?.quiz ?? null,
    fillBlank: progress?.fillBlank ?? null,
    sentences: progress?.sentences ?? null,
    mistakes,
    nextReview: first === undefined ? null : { days: first, count: buckets.get(first)! },
  };
}

/** "Hôm nay ôn 3 từ", "Ngày mai ôn 6 từ", "Sau 4 ngày ôn 2 từ". */
export function nextReviewLabel(next: { days: number; count: number }): string {
  const when = next.days === 0 ? 'Hôm nay' : next.days === 1 ? 'Ngày mai' : `Sau ${next.days} ngày`;
  return `${when} ôn ${next.count} từ`;
}
