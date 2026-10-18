/**
 * Pure business logic for the Vocabulary Mastery Test (Kiểm tra từ vựng).
 * No I/O or Supabase calls — fully unit-testable.
 */

import {
  MasteryLevel,
  type VocabTestConfig,
  type VocabTestExplanation,
  type VocabTestQuestion,
  type VocabTestQuestionType,
  type VocabTestSummary,
  type VocabTestWrongItem,
  type WordMasteryRecord,
} from '../types';
import {
  FALLBACK_MEANINGS,
  findWordForm,
  shuffle,
} from './reviewLogic';

/** Fallback English words if pool has fewer than 3 distractors. */
export const FALLBACK_WORDS: readonly { word: string; meaning_vi: string }[] = [
  { word: 'achieve', meaning_vi: 'đạt được, hoàn thành' },
  { word: 'maintain', meaning_vi: 'duy trì, giữ vững' },
  { word: 'expand', meaning_vi: 'phát triển, mở rộng' },
  { word: 'determine', meaning_vi: 'xác định, định rõ' },
  { word: 'improve', meaning_vi: 'cải thiện, nâng cao' },
  { word: 'observe', meaning_vi: 'quan sát, theo dõi' },
  { word: 'explain', meaning_vi: 'giải thích, làm rõ' },
  { word: 'protect', meaning_vi: 'bảo vệ, gìn giữ' },
  { word: 'consider', meaning_vi: 'cân nhắc, xem xét' },
  { word: 'require', meaning_vi: 'yêu cầu, đòi hỏi' },
];

/** Blank out target word in an example sentence. */
export function blankWordInSentence(sentence: string | null | undefined, word: string): string | null {
  if (!sentence || !word) return null;
  const match = findWordForm(sentence, word);
  if (!match) return null;
  return sentence.slice(0, match.index) + '_____' + sentence.slice(match.index + match.form.length);
}

/** Build explanation object from a word mastery record. */
export function buildExplanation(record: WordMasteryRecord): VocabTestExplanation {
  return {
    meaningVi: record.meaning_vi || 'Chưa có nghĩa tiếng Việt',
    ipa: record.ipa || undefined,
    exampleSentence: record.example_sentence || undefined,
    exampleSentenceVi: record.example_sentence_vi || undefined,
    definitionEn: record.definition_en || undefined,
  };
}

/**
 * Build a Word-to-Meaning question:
 * English word given -> Pick 1 of 4 Vietnamese meanings.
 */
export function buildWordToMeaningQuestion(
  target: WordMasteryRecord,
  pool: readonly WordMasteryRecord[],
  rand: () => number = Math.random,
): VocabTestQuestion | null {
  const correctMeaning = target.meaning_vi?.trim();
  if (!correctMeaning) return null;

  const seen = new Set<string>([correctMeaning.toLowerCase()]);
  const distractors: string[] = [];

  const shuffledPool = shuffle(pool, rand);
  for (const item of shuffledPool) {
    if (!item.meaning_vi || item.word.toLowerCase() === target.word.toLowerCase()) continue;
    const m = item.meaning_vi.trim();
    if (!seen.has(m.toLowerCase())) {
      seen.add(m.toLowerCase());
      distractors.push(m);
      if (distractors.length >= 3) break;
    }
  }

  if (distractors.length < 3) {
    const fallbackShuffled = shuffle(FALLBACK_MEANINGS, rand);
    for (const fb of fallbackShuffled) {
      if (!seen.has(fb.toLowerCase())) {
        seen.add(fb.toLowerCase());
        distractors.push(fb);
        if (distractors.length >= 3) break;
      }
    }
  }

  const options = shuffle([correctMeaning, ...distractors.slice(0, 3)], rand);

  return {
    id: `w2m-${target.id || target.word}`,
    targetWord: target.word,
    type: 'word_to_meaning',
    prompt: target.word,
    subPrompt: target.part_of_speech ? `(${target.part_of_speech})` : undefined,
    audioText: target.word,
    options,
    correctAnswer: correctMeaning,
    explanation: buildExplanation(target),
  };
}

/**
 * Build a Meaning-to-Word question:
 * Vietnamese meaning given -> Pick 1 of 4 English words.
 */
export function buildMeaningToWordQuestion(
  target: WordMasteryRecord,
  pool: readonly WordMasteryRecord[],
  rand: () => number = Math.random,
): VocabTestQuestion | null {
  const correctMeaning = target.meaning_vi?.trim();
  if (!correctMeaning) return null;

  const seen = new Set<string>([target.word.toLowerCase()]);
  const distractors: string[] = [];

  const shuffledPool = shuffle(pool, rand);
  for (const item of shuffledPool) {
    const w = item.word.trim();
    if (!seen.has(w.toLowerCase())) {
      seen.add(w.toLowerCase());
      distractors.push(w);
      if (distractors.length >= 3) break;
    }
  }

  if (distractors.length < 3) {
    const fallbackShuffled = shuffle(FALLBACK_WORDS, rand);
    for (const fb of fallbackShuffled) {
      if (!seen.has(fb.word.toLowerCase())) {
        seen.add(fb.word.toLowerCase());
        distractors.push(fb.word);
        if (distractors.length >= 3) break;
      }
    }
  }

  const options = shuffle([target.word, ...distractors.slice(0, 3)], rand);

  return {
    id: `m2w-${target.id || target.word}`,
    targetWord: target.word,
    type: 'meaning_to_word',
    prompt: correctMeaning,
    subPrompt: target.part_of_speech ? `(${target.part_of_speech})` : undefined,
    audioText: target.word,
    options,
    correctAnswer: target.word,
    explanation: buildExplanation(target),
  };
}

/**
 * Build a Fill-in-the-Blank question:
 * Sentence with blanked word -> Pick 1 of 4 English words.
 */
export function buildFillBlankQuestion(
  target: WordMasteryRecord,
  pool: readonly WordMasteryRecord[],
  rand: () => number = Math.random,
): VocabTestQuestion | null {
  const blanked = blankWordInSentence(target.example_sentence, target.word);
  if (!blanked) return null;

  const seen = new Set<string>([target.word.toLowerCase()]);
  const distractors: string[] = [];

  const shuffledPool = shuffle(pool, rand);
  for (const item of shuffledPool) {
    const w = item.word.trim();
    if (!seen.has(w.toLowerCase())) {
      seen.add(w.toLowerCase());
      distractors.push(w);
      if (distractors.length >= 3) break;
    }
  }

  if (distractors.length < 3) {
    const fallbackShuffled = shuffle(FALLBACK_WORDS, rand);
    for (const fb of fallbackShuffled) {
      if (!seen.has(fb.word.toLowerCase())) {
        seen.add(fb.word.toLowerCase());
        distractors.push(fb.word);
        if (distractors.length >= 3) break;
      }
    }
  }

  const options = shuffle([target.word, ...distractors.slice(0, 3)], rand);

  return {
    id: `fb-${target.id || target.word}`,
    targetWord: target.word,
    type: 'fill_blank',
    prompt: blanked,
    subPrompt: target.example_sentence_vi || target.meaning_vi || undefined,
    audioText: target.word,
    options,
    correctAnswer: target.word,
    explanation: buildExplanation(target),
  };
}

/**
 * Build a Listening question:
 * Audio cue -> Pick 1 of 4 English words.
 */
export function buildListeningQuestion(
  target: WordMasteryRecord,
  pool: readonly WordMasteryRecord[],
  rand: () => number = Math.random,
): VocabTestQuestion {
  const seen = new Set<string>([target.word.toLowerCase()]);
  const distractors: string[] = [];

  const shuffledPool = shuffle(pool, rand);
  for (const item of shuffledPool) {
    const w = item.word.trim();
    if (!seen.has(w.toLowerCase())) {
      seen.add(w.toLowerCase());
      distractors.push(w);
      if (distractors.length >= 3) break;
    }
  }

  if (distractors.length < 3) {
    const fallbackShuffled = shuffle(FALLBACK_WORDS, rand);
    for (const fb of fallbackShuffled) {
      if (!seen.has(fb.word.toLowerCase())) {
        seen.add(fb.word.toLowerCase());
        distractors.push(fb.word);
        if (distractors.length >= 3) break;
      }
    }
  }

  const options = shuffle([target.word, ...distractors.slice(0, 3)], rand);

  return {
    id: `lis-${target.id || target.word}`,
    targetWord: target.word,
    type: 'listening',
    prompt: 'Nghe phát âm và chọn từ vựng chính xác:',
    subPrompt: target.ipa ? `/${target.ipa.replace(/^\/+|\/+$/g, '')}/` : undefined,
    audioText: target.word,
    options,
    correctAnswer: target.word,
    explanation: buildExplanation(target),
  };
}

/**
 * Build a test question for a target word according to requested question types.
 */
export function buildQuestionForWord(
  target: WordMasteryRecord,
  pool: readonly WordMasteryRecord[],
  types: readonly VocabTestQuestionType[],
  rand: () => number = Math.random,
): VocabTestQuestion | null {
  const shuffledTypes = shuffle(types, rand);
  for (const qType of shuffledTypes) {
    let q: VocabTestQuestion | null = null;
    switch (qType) {
      case 'fill_blank':
        q = buildFillBlankQuestion(target, pool, rand);
        break;
      case 'meaning_to_word':
        q = buildMeaningToWordQuestion(target, pool, rand);
        break;
      case 'listening':
        q = buildListeningQuestion(target, pool, rand);
        break;
      case 'word_to_meaning':
      default:
        q = buildWordToMeaningQuestion(target, pool, rand);
        break;
    }
    if (q) return q;
  }

  // Fallback to word-to-meaning or listening
  return buildWordToMeaningQuestion(target, pool, rand) || buildListeningQuestion(target, pool, rand);
}

/**
 * Generate full VocabTest questions given candidate words and test configuration.
 */
export function generateVocabTestQuestions(
  words: readonly WordMasteryRecord[],
  config: VocabTestConfig,
  rand: () => number = Math.random,
): VocabTestQuestion[] {
  if (words.length === 0) return [];

  // Filter words by sourceLevels if specified
  const filteredWords = words.filter((w) =>
    config.sourceLevels.includes(w.mastery_level),
  );
  const candidateWords = filteredWords.length > 0 ? filteredWords : words;

  // Shuffle and limit to requested questionCount
  const shuffledTargets = shuffle(candidateWords, rand).slice(0, config.questionCount);
  const questions: VocabTestQuestion[] = [];

  for (const target of shuffledTargets) {
    const q = buildQuestionForWord(target, candidateWords, config.questionTypes, rand);
    if (q) questions.push(q);
  }

  return questions;
}

export type PerformanceTier = 'exceptional' | 'great' | 'good' | 'needs_practice';

export interface PerformanceRating {
  tier: PerformanceTier;
  title: string;
  badgeTone: string;
  message: string;
}

/** Determine performance tier and feedback message based on score percentage. */
export function getPerformanceRating(percentage: number): PerformanceRating {
  if (percentage >= 90) {
    return {
      tier: 'exceptional',
      title: 'Xuất sắc! 🎉',
      badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700',
      message: 'Bạn ghi nhớ từ vựng rất vững chắc! Hãy tiếp tục duy trì phong độ.',
    };
  }
  if (percentage >= 80) {
    return {
      tier: 'great',
      title: 'Rất tốt! 👏',
      badgeTone: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700',
      message: 'Vốn từ của bạn đang rất tốt, chỉ cần ôn lại một vài từ nhỏ.',
    };
  }
  if (percentage >= 65) {
    return {
      tier: 'good',
      title: 'Khá ổn! 👍',
      badgeTone: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700',
      message: 'Một số từ cần được củng cố lại để chuyển sang thành thạo hoàn toàn.',
    };
  }
  return {
    tier: 'needs_practice',
    title: 'Cần luyện tập thêm 💪',
    badgeTone: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700',
    message: 'Đừng lo lắng, hãy ôn lại các từ làm sai và thử lại nhé!',
  };
}

/** Compute overall test summary. */
export function summarizeVocabTest(
  questions: readonly VocabTestQuestion[],
  answers: Record<string, string>, // questionId -> selectedOption
  durationSeconds: number,
): VocabTestSummary {
  let correctCount = 0;
  const wrongItems: VocabTestWrongItem[] = [];

  for (const q of questions) {
    const selected = answers[q.id];
    if (selected === q.correctAnswer) {
      correctCount++;
    } else {
      wrongItems.push({
        targetWord: q.targetWord,
        questionType: q.type,
        questionPrompt: q.prompt,
        userAnswer: selected || 'Không trả lời',
        correctAnswer: q.correctAnswer,
        meaningVi: q.explanation.meaningVi,
        ipa: q.explanation.ipa,
        exampleSentence: q.explanation.exampleSentence,
      });
    }
  }

  const totalQuestions = questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    correctCount,
    wrongCount: totalQuestions - correctCount,
    scorePercentage,
    durationSeconds,
    wrongItems,
  };
}
