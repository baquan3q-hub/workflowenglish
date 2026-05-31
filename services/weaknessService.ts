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
 * Gemini / localStorage I/O.
 *
 * See `.kiro/specs/personalized-learning/requirements.md` Requirement 7
 * and `design.md` "Phase 3: AI-Enhanced Components" for context.
 */

import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { supabase } from './supabaseClient';
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

/**
 * Standard iterative Levenshtein distance with O(min(a,b)) memory.
 * Returns the minimum number of single-character edits (insert / delete
 * / substitute) needed to turn `a` into `b`.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `a` is the shorter string to keep the row buffer small.
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);

  for (let i = 0; i <= m; i++) prev[i] = i;

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,    // insertion
        prev[i] + 1,        // deletion
        prev[i - 1] + cost, // substitution
      );
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }

  return prev[m];
}

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

// --- Targeted lesson generation (Gemini) -----------------------------------

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';

/**
 * Schema mirrors the one in `geminiService.ts` so the response is a
 * drop-in `GeneratedLesson`. Inlined here to keep this service
 * self-contained.
 */
const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          word: { type: Type.STRING },
          ipa: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          meaningVietnamese: { type: Type.STRING },
          definitionEnglish: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          exampleSentenceVietnamese: { type: Type.STRING },
        },
        required: [
          'id',
          'word',
          'ipa',
          'partOfSpeech',
          'meaningVietnamese',
          'definitionEnglish',
          'exampleSentence',
          'exampleSentenceVietnamese',
        ],
      },
    },
    story: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        translation: { type: Type.STRING },
      },
      required: ['title', 'content', 'translation'],
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['multiple-choice', 'fill-blank'] },
        },
        required: [
          'id',
          'question',
          'options',
          'correctAnswer',
          'explanation',
          'type',
        ],
      },
    },
  },
  required: ['flashcards', 'story', 'quiz'],
};

function buildWeaknessPrompt(
  weakness: WeaknessPattern,
  level: string,
): string {
  const exampleLines = weakness.examples
    .map(
      (ex, i) =>
        `${i + 1}. word="${ex.word}", question="${ex.question}", userAnswered="${ex.userAnswer}", correctAnswer="${ex.correctAnswer}"`,
    )
    .join('\n');

  const focusByCategory: Record<string, string> = {
    vocabulary_gap:
      'pick 5 brand-new English words the learner has not seen, drawn from the same topic as their mistakes',
    grammar_confusion:
      'pick 5 English words that share the same root but differ in part of speech (e.g. analyze/analysis/analytical), so the learner can practise telling them apart',
    spelling_similarity:
      'pick 5 English words that look or sound similar to the words the learner confused, so they can drill the differences',
    meaning_overlap:
      'pick 5 English words whose Vietnamese meanings are commonly mixed up with the words above, so the learner can disambiguate them',
  };

  const focus =
    focusByCategory[weakness.category] ??
    'pick 5 English words that target this weakness';

  return `
You are an expert English teacher (EdTech specialist) creating a remedial mini-lesson for a Vietnamese learner at CEFR level ${level}.

Weakness category: ${weakness.category} (${weakness.categoryVi})
Recent mistakes from this learner:
${exampleLines || '(no specific examples available)'}

Task: ${focus}.

Output MUST be a JSON object containing exactly:
1. 'flashcards': 5 entries with detailed info per word.
2. 'story': a cohesive ~120-180 word short story using all 5 words naturally.
3. 'quiz': 5 questions where the 'question' is the English word (e.g. "What does 'X' mean?") and 'options' are Vietnamese definitions, with one correct answer.

Requirements:
- Vietnamese translations must be natural and accurate.
- Example sentences must match ${level} complexity.
- The lesson must directly target the ${weakness.category} weakness.
`.trim();
}

async function callLessonModel(prompt: string): Promise<string> {
  const config = {
    responseMimeType: 'application/json',
    responseSchema: lessonSchema,
    thinkingConfig: { thinkingBudget: 0 },
  };
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config,
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from primary model');
    return text;
  } catch (err) {
    console.warn(
      `Weakness lesson primary model "${PRIMARY_MODEL}" failed, falling back to "${FALLBACK_MODEL}":`,
      err,
    );
    const response = await ai.models.generateContent({
      model: FALLBACK_MODEL,
      contents: prompt,
      config,
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from fallback model');
    return text;
  }
}

/**
 * Ask Gemini to generate a 5-word remedial lesson aimed at a specific
 * weakness pattern. The response shape matches `GeneratedLesson` so the
 * existing Flashcards / Story / Quiz views can render it without any
 * special casing.
 */
export async function generateTargetedLesson(
  weakness: WeaknessPattern,
  level: string,
): Promise<GeneratedLesson> {
  const prompt = buildWeaknessPrompt(weakness, level);
  const text = await callLessonModel(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Failed to parse targeted-lesson JSON: ${(e as Error).message}`,
    );
  }

  // The schema constrains the structure server-side, but be defensive.
  const lesson = parsed as GeneratedLesson;
  if (
    !lesson ||
    !Array.isArray(lesson.flashcards) ||
    !Array.isArray(lesson.quiz) ||
    !lesson.story
  ) {
    throw new Error('Targeted lesson response missing required sections');
  }
  return lesson;
}

/**
 * Ask Gemini to generate a lesson focusing specifically on the user's hardest words.
 * The lesson will use the actual hardest words (with their recorded meanings, definition, examples, etc.).
 */
export async function generateHardestWordsLesson(
  words: any[],
  level: string,
): Promise<GeneratedLesson> {
  if (!words || words.length === 0) {
    throw new Error('No words provided to generate lesson');
  }
  const wordDetails = words
    .map(
      (w, i) =>
        `${i + 1}. word="${w.word}", meaning="${w.meaning_vi || ''}", partOfSpeech="${w.part_of_speech || ''}"`,
    )
    .join('\n');

  const prompt = `
You are an expert English teacher (EdTech specialist) creating a remedial mini-lesson for a Vietnamese learner at CEFR level ${level}.

The learner has been struggling with these specific English words:
${wordDetails}

Task:
Create a cohesive remedial mini-lesson that uses these EXACT words.

Output MUST be a JSON object containing exactly:
1. 'flashcards': 5 entries. For EACH entry, use the word itself, and populate its fields. Use the existing metadata where applicable, but make sure all fields are fully populated with accurate and natural details:
   - 'id': standard unique id
   - 'word': the English word (exactly as listed above)
   - 'ipa': accurate IPA pronunciation
   - 'partOfSpeech': part of speech
   - 'meaningVietnamese': accurate and clear Vietnamese meaning
   - 'definitionEnglish': simple English definition
   - 'exampleSentence': a clear, high-quality example sentence matching ${level} CEFR complexity using the word
   - 'exampleSentenceVietnamese': Vietnamese translation of the example sentence
2. 'story': a cohesive ~120-180 word short story using all 5 words naturally.
3. 'quiz': 5 questions where the 'question' is the English word (e.g. "What does 'X' mean?") and 'options' are Vietnamese definitions, with one correct answer.

Requirements:
- Vietnamese translations must be natural and accurate.
- Example sentences must match ${level} complexity.
- The lesson must focus exactly on teaching the 5 words listed above.
`.trim();

  const text = await callLessonModel(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Failed to parse targeted JSON: ${(e as Error).message}`,
    );
  }

  const lesson = parsed as GeneratedLesson;
  if (
    !lesson ||
    !Array.isArray(lesson.flashcards) ||
    !Array.isArray(lesson.quiz) ||
    !lesson.story
  ) {
    throw new Error('Lesson response missing required sections');
  }
  return lesson;
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
