/**
 * Weakness Service — pattern analysis over a user's mistake history.
 *
 * This module looks at the `word_mastery` rows that have at least one
 * incorrect answer logged against them and groups those mistakes into
 * four categories the UI can surface on the Analytics dashboard:
 *
 *   - vocabulary_gap     "Từ vựng chưa biết"
 *   - grammar_confusion  "Nhầm loại từ"
 *   - spelling_similarity"Từ giống nhau"
 *   - meaning_overlap    "Nghĩa tương tự"
 *
 * The categorisation logic is intentionally lightweight (heuristics on
 * the strings already stored in `incorrect_contexts`) so it stays a
 * pure, easily testable function. The async helpers wrap Supabase /
 * ai-proxy / localStorage I/O.
 *
 * See `.kiro/specs/personalized-learning/requirements.md` Requirement 7
 * and `design.md` "Phase 3: AI-Enhanced Components" for context.
 */

import { supabase } from './supabaseClient';
import { invokeAi } from './aiClient';
import { levenshtein } from './reviewLogic';
import {
  type GeneratedLesson,
  type IncorrectContext,
  type WeaknessPattern,
  type WordMasteryRecord,
} from '../types';

// --- Constants -------------------------------------------------------------

/** Maximum number of weakness patterns returned to callers. */
const MAX_WEAKNESSES_RETURNED = 4;

/** Maximum number of example mistakes attached to each pattern. */
const MAX_EXAMPLES_PER_PATTERN = 3;

/** vocabulary_gap threshold: this many incorrect answers with zero correct. */
const VOCAB_GAP_INCORRECT_THRESHOLD = 3;

/** Levenshtein distance under which two answers are "similar" for spelling. */
const SPELLING_SIMILARITY_MAX_DISTANCE = 3;

/** Vietnamese display names per category, per requirement 7.3. */
const CATEGORY_VI: Record<string, string> = {
  vocabulary_gap: 'Từ vựng chưa biết',
  grammar_confusion: 'Nhầm loại từ',
  spelling_similarity: 'Từ giống nhau',
  meaning_overlap: 'Nghĩa tương tự',
};

const TABLE = 'word_mastery';

const LOCALSTORAGE_KEY_PREFIX = 'vocabmaster_weakness_status_';

// --- Pure helpers ----------------------------------------------------------

// Levenshtein lives in reviewLogic (shared with answer grading); re-exported
// here so existing imports keep working.
export { levenshtein };

/**
 * Cheap part-of-speech estimator based on common English suffixes. This
 * is deliberately approximate — we just want to detect whether the user
 * picked something with a clearly different morphological shape than
 * the correct answer.
 *
 * Returns `'unknown'` when nothing matches so two unknowns compare
 * equal and don't trigger a false positive.
 */
function estimatePartOfSpeech(word: string): string {
  const w = word.trim().toLowerCase();
  if (!w) return 'unknown';

  // Adverbs first — "ly" is a strong signal.
  if (/ly$/.test(w) && w.length > 3) return 'adverb';

  // Verb-ish endings.
  if (/(ing|ed|ize|ise|ate|ify)$/.test(w) && w.length > 4) return 'verb';

  // Adjective-ish endings.
  if (/(ous|ful|less|ive|able|ible|al|ic|ish)$/.test(w) && w.length > 4) {
    return 'adjective';
  }

  // Noun-ish endings.
  if (/(tion|sion|ment|ness|ity|ship|hood|ance|ence|er|or|ist)$/.test(w) && w.length > 3) {
    return 'noun';
  }

  return 'unknown';
}

/**
 * Build a `WeaknessPattern` from a category id, an error count, and the
 * collected examples. Examples are truncated to keep the payload small
 * for the UI.
 */
function buildPattern(
  category: keyof typeof CATEGORY_VI,
  errorCount: number,
  examples: WeaknessPattern['examples'],
): WeaknessPattern {
  return {
    category,
    categoryVi: CATEGORY_VI[category],
    errorCount,
    examples: examples.slice(0, MAX_EXAMPLES_PER_PATTERN),
    status: 'active',
  };
}

/**
 * Categorise a user's mistakes across their `word_mastery` rows.
 *
 * Pure function — no I/O. Each input row is expected to have its
 * `incorrect_contexts` populated (records with no incorrect answers
 * are simply ignored).
 *
 * Returned patterns are sorted by `errorCount` descending and capped
 * at {@link MAX_WEAKNESSES_RETURNED} entries.
 */
export function analyzeWeaknesses(
  records: WordMasteryRecord[],
): WeaknessPattern[] {
  const vocabGapExamples: WeaknessPattern['examples'] = [];
  let vocabGapCount = 0;

  const grammarExamples: WeaknessPattern['examples'] = [];
  let grammarCount = 0;

  const spellingExamples: WeaknessPattern['examples'] = [];
  let spellingCount = 0;

  // For meaning_overlap we need to see how often the same userAnswer
  // text was given for *different* correctAnswers across all records.
  const userAnswerToCorrects = new Map<string, Set<string>>();
  // And we need to remember an example per userAnswer to surface in the UI.
  const meaningOverlapExamples: WeaknessPattern['examples'] = [];
  const seenOverlapAnswers = new Set<string>();

  for (const rec of records) {
    if (!rec || !Array.isArray(rec.incorrect_contexts)) continue;
    const word = rec.word;
    const contexts = rec.incorrect_contexts as IncorrectContext[];

    // --- vocabulary_gap (per-record) ---
    if (
      (rec.incorrect_count ?? 0) >= VOCAB_GAP_INCORRECT_THRESHOLD &&
      (rec.correct_count ?? 0) === 0
    ) {
      vocabGapCount += rec.incorrect_count ?? 0;
      const sample = contexts[0];
      if (sample) {
        vocabGapExamples.push({
          word,
          question: sample.question,
          userAnswer: sample.userAnswer,
          correctAnswer: sample.correctAnswer,
        });
      } else {
        vocabGapExamples.push({
          word,
          question: '',
          userAnswer: '',
          correctAnswer: '',
        });
      }
    }

    // --- per-context categorisations ---
    for (const ctx of contexts) {
      if (!ctx || typeof ctx.userAnswer !== 'string' || typeof ctx.correctAnswer !== 'string') {
        continue;
      }
      const userAns = ctx.userAnswer.trim();
      const correctAns = ctx.correctAnswer.trim();
      if (!userAns || !correctAns || userAns === correctAns) continue;

      // grammar_confusion: different estimated POS.
      const userPos = estimatePartOfSpeech(userAns);
      const correctPos = estimatePartOfSpeech(correctAns);
      if (
        userPos !== 'unknown' &&
        correctPos !== 'unknown' &&
        userPos !== correctPos
      ) {
        grammarCount += 1;
        if (grammarExamples.length < MAX_EXAMPLES_PER_PATTERN) {
          grammarExamples.push({
            word,
            question: ctx.question,
            userAnswer: ctx.userAnswer,
            correctAnswer: ctx.correctAnswer,
          });
        }
      }

      // spelling_similarity: short edit distance.
      const dist = levenshtein(userAns.toLowerCase(), correctAns.toLowerCase());
      if (dist > 0 && dist < SPELLING_SIMILARITY_MAX_DISTANCE) {
        spellingCount += 1;
        if (spellingExamples.length < MAX_EXAMPLES_PER_PATTERN) {
          spellingExamples.push({
            word,
            question: ctx.question,
            userAnswer: ctx.userAnswer,
            correctAnswer: ctx.correctAnswer,
          });
        }
      }

      // meaning_overlap: track userAnswer -> set of correctAnswers.
      const key = userAns.toLowerCase();
      let bucket = userAnswerToCorrects.get(key);
      if (!bucket) {
        bucket = new Set<string>();
        userAnswerToCorrects.set(key, bucket);
      }
      bucket.add(correctAns.toLowerCase());

      // Stash a candidate example keyed by the userAnswer so we can
      // surface it later if this answer ends up qualifying.
      if (!seenOverlapAnswers.has(key)) {
        seenOverlapAnswers.add(key);
        meaningOverlapExamples.push({
          word,
          question: ctx.question,
          userAnswer: ctx.userAnswer,
          correctAnswer: ctx.correctAnswer,
        });
      }
    }
  }

  // Compute meaning_overlap count: every (userAnswer, correctAnswer)
  // pair beyond the first for the same userAnswer is an overlap event.
  let meaningOverlapCount = 0;
  const qualifyingAnswers = new Set<string>();
  for (const [answer, correctSet] of userAnswerToCorrects) {
    if (correctSet.size >= 2) {
      meaningOverlapCount += correctSet.size;
      qualifyingAnswers.add(answer);
    }
  }
  const meaningOverlapFiltered = meaningOverlapExamples.filter((ex) =>
    qualifyingAnswers.has(ex.userAnswer.trim().toLowerCase()),
  );

  const patterns: WeaknessPattern[] = [];
  if (vocabGapCount > 0) {
    patterns.push(buildPattern('vocabulary_gap', vocabGapCount, vocabGapExamples));
  }
  if (grammarCount > 0) {
    patterns.push(buildPattern('grammar_confusion', grammarCount, grammarExamples));
  }
  if (spellingCount > 0) {
    patterns.push(buildPattern('spelling_similarity', spellingCount, spellingExamples));
  }
  if (meaningOverlapCount > 0) {
    patterns.push(
      buildPattern('meaning_overlap', meaningOverlapCount, meaningOverlapFiltered),
    );
  }

  patterns.sort((a, b) => b.errorCount - a.errorCount);
  return patterns.slice(0, MAX_WEAKNESSES_RETURNED);
}

// --- Supabase fetch --------------------------------------------------------

/**
 * Fetch all `word_mastery` rows for `userId` that have at least one
 * incorrect answer recorded, then run {@link analyzeWeaknesses} on them.
 */
export async function getWeaknessData(
  userId: string,
): Promise<WeaknessPattern[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .gt('incorrect_count', 0);

  if (error) throw error;

  return analyzeWeaknesses((data ?? []) as WordMasteryRecord[]);
}

// --- Targeted lesson generation (ai-proxy op generateRemedialLesson) -------

function assertLesson(lesson: GeneratedLesson | null): GeneratedLesson {
  // The server checks the shape too; be defensive.
  if (!lesson || !Array.isArray(lesson.flashcards) || !Array.isArray(lesson.quiz) || !lesson.story) {
    throw new Error('Lesson response missing required sections');
  }
  return lesson;
}

/**
 * A 5-word remedial lesson aimed at a specific weakness pattern. The
 * response shape matches `GeneratedLesson` so the existing Flashcards /
 * Story / Quiz views can render it without any special casing.
 */
export async function generateTargetedLesson(
  weakness: WeaknessPattern,
  level: string,
): Promise<GeneratedLesson> {
  const lesson = await invokeAi<GeneratedLesson>('generateRemedialLesson', {
    mode: 'weakness',
    level,
    weakness: {
      category: weakness.category,
      categoryVi: weakness.categoryVi,
      examples: weakness.examples.slice(0, 5).map((ex) => ({
        word: ex.word,
        question: ex.question,
        userAnswer: ex.userAnswer,
        correctAnswer: ex.correctAnswer,
      })),
    },
  });
  return assertLesson(lesson);
}

/**
 * A lesson built on the user's hardest words, using their recorded
 * meanings and parts of speech.
 */
export async function generateHardestWordsLesson(
  words: any[],
  level: string,
): Promise<GeneratedLesson> {
  if (!words || words.length === 0) {
    throw new Error('No words provided to generate lesson');
  }
  const lesson = await invokeAi<GeneratedLesson>('generateRemedialLesson', {
    mode: 'words',
    level,
    words: words.slice(0, 10).map((w) => ({
      word: String(w.word ?? ''),
      meaning: String(w.meaning_vi ?? ''),
      partOfSpeech: String(w.part_of_speech ?? ''),
    })),
  });
  return assertLesson(lesson);
}

// --- Status flag (localStorage) -------------------------------------------

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Mark a weakness category as "improving" for `userId`. We don't have a
 * dedicated DB column for this yet (per task 3.2 notes), so the flag
 * lives in localStorage under
 * `vocabmaster_weakness_status_{userId}_{category}`.
 *
 * Async signature is preserved so the call site doesn't need to change
 * if/when this moves to Supabase.
 */
export async function markWeaknessImproving(
  userId: string,
  category: string,
): Promise<void> {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(
      `${LOCALSTORAGE_KEY_PREFIX}${userId}_${category}`,
      'improving',
    );
  } catch {
    // Quota / serialization errors — non-fatal.
  }
}
