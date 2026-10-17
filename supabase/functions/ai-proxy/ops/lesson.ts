import { asObject, BadRequest, FLASH_MODELS, jsonConfig, list, oneOf, str, S, userText, type OpSpec } from '../lib.ts';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const flashcardSchema = S.obj(
  {
    id: S.str(),
    word: S.str(),
    ipa: S.str(),
    partOfSpeech: S.str(),
    meaningVietnamese: S.str(),
    definitionEnglish: S.str(),
    exampleSentence: S.str(),
    exampleSentenceVietnamese: S.str(),
    collocations: S.arr(S.str()),
    memoryTip: S.str(),
  },
  ['id', 'word', 'ipa', 'partOfSpeech', 'meaningVietnamese', 'definitionEnglish', 'exampleSentence', 'exampleSentenceVietnamese'],
);

const lessonSchema = S.obj({
  flashcards: S.arr(flashcardSchema),
  story: S.obj({ title: S.str(), content: S.str(), translation: S.str() }),
  quiz: S.arr(
    S.obj({
      id: S.str(),
      question: S.str(),
      options: S.arr(S.str()),
      correctAnswer: S.str(),
      explanation: S.str(),
      type: S.str(['multiple-choice', 'fill-blank']),
    }),
  ),
});

function checkLesson(data: unknown): unknown {
  const l = data as { flashcards?: unknown; quiz?: unknown; story?: unknown } | null;
  if (!l || !Array.isArray(l.flashcards) || !Array.isArray(l.quiz) || !l.story) {
    throw new Error('lesson is missing flashcards, story or quiz');
  }
  return data;
}

export const generateLesson: OpSpec = {
  hourlyLimit: 20,
  models: FLASH_MODELS,
  timeoutMs: 60_000,
  kind: 'json',
  finalize: checkLesson,
  build(payload) {
    const p = asObject(payload);
    const words = str(p, 'words', { max: 3000 });
    const level = oneOf(p, 'level', LEVELS, 'B1');
    const topic = str(p, 'topic', { max: 100, optional: true }) || 'General';
    const prompt = `
    You are an expert English teacher (EdTech specialist).
    Create a comprehensive English lesson based on the following vocabulary list, targeting CEFR Level ${level} and the topic "${topic}".

    The output must strictly be a JSON object containing:
    1. 'flashcards': Detailed info for each word provided.
    2. 'story': A cohesive, engaging short story (approx 150-200 words) using the vocabulary naturally.
    3. 'quiz': ONE question for EACH word in the vocabulary list (so if there are 10 words, create exactly 10 quiz questions).

    CRITICAL INSTRUCTION FOR QUIZ:
    - The 'question' must be the English vocabulary word (e.g., "What does 'Serendipity' mean?").
    - The 'options' must be Vietnamese definitions/meanings.
    - One option must be correct, others distractors.

    Input Vocabulary:
    "${words}"

    FLASHCARD REQUIREMENTS:
    - 'exampleSentence' MUST contain the vocabulary word itself (an inflected form such as plural or past tense is fine), so it can be used for fill-in-the-blank practice.
    - 'collocations': 2-4 short, high-frequency collocations or chunks using the word (e.g. "make a decision", "decide on sth").
    - 'memoryTip': ONE short Vietnamese sentence (max 25 words) with a memory hook OR a common mistake Vietnamese learners make with this word (confusable words, wrong preposition, pronunciation trap).

    QUIZ OPTION REQUIREMENTS:
    - Exactly 4 options, all distinct, all in Vietnamese, similar length and the same part of speech, so the answer cannot be guessed from form.
    - Distractors should be plausible (meanings of related or easily confused words), not absurd.
    - 'correctAnswer' must be copied EXACTLY from one of the options.

    Requirements:
    - Vietnamese translations must be natural and accurate.
    - Example sentences must match the ${level} complexity.
    - Quiz should follow 'Mastery Learning' principles.
    - IMPORTANT: The story content must be PLAIN TEXT only. Do NOT use markdown formatting like **bold** or *italic*. Just write the words naturally.
  `;
    return { contents: userText(prompt), generationConfig: jsonConfig(lessonSchema) };
  },
};

const FOCUS_BY_CATEGORY: Record<string, string> = {
  vocabulary_gap: 'pick 5 brand-new English words the learner has not seen, drawn from the same topic as their mistakes',
  grammar_confusion:
    'pick 5 English words that share the same root but differ in part of speech (e.g. analyze/analysis/analytical), so the learner can practise telling them apart',
  spelling_similarity:
    'pick 5 English words that look or sound similar to the words the learner confused, so they can drill the differences',
  meaning_overlap:
    'pick 5 English words whose Vietnamese meanings are commonly mixed up with the words above, so the learner can disambiguate them',
};

const LESSON_OUTPUT = `Output MUST be a JSON object containing exactly:`;

function weaknessPrompt(p: Record<string, unknown>, level: string): string {
  const w = asObject(p.weakness, 'weakness');
  const category = str(w, 'category', { max: 40 });
  const categoryVi = str(w, 'categoryVi', { max: 80, optional: true });
  const examples = list(w, 'examples', 5, (v) => {
    const e = asObject(v, 'example');
    return {
      word: str(e, 'word', { max: 80 }),
      question: str(e, 'question', { max: 300, optional: true }),
      userAnswer: str(e, 'userAnswer', { max: 300, optional: true }),
      correctAnswer: str(e, 'correctAnswer', { max: 300, optional: true }),
    };
  });
  const exampleLines = examples
    .map(
      (ex, i) =>
        `${i + 1}. word="${ex.word}", question="${ex.question}", userAnswered="${ex.userAnswer}", correctAnswer="${ex.correctAnswer}"`,
    )
    .join('\n');
  const focus = FOCUS_BY_CATEGORY[category] ?? 'pick 5 English words that target this weakness';

  return `
You are an expert English teacher (EdTech specialist) creating a remedial mini-lesson for a Vietnamese learner at CEFR level ${level}.

Weakness category: ${category} (${categoryVi})
Recent mistakes from this learner:
${exampleLines || '(no specific examples available)'}

Task: ${focus}.

${LESSON_OUTPUT}
1. 'flashcards': 5 entries with detailed info per word.
2. 'story': a cohesive ~120-180 word short story using all 5 words naturally.
3. 'quiz': 5 questions where the 'question' is the English word (e.g. "What does 'X' mean?") and 'options' are Vietnamese definitions, with one correct answer.

Requirements:
- Vietnamese translations must be natural and accurate.
- Example sentences must match ${level} complexity.
- The lesson must directly target the ${category} weakness.
`.trim();
}

function hardestWordsPrompt(p: Record<string, unknown>, level: string): string {
  const words = list(p, 'words', 10, (v) => {
    const w = asObject(v, 'word');
    return {
      word: str(w, 'word', { max: 80 }),
      meaning: str(w, 'meaning', { max: 300, optional: true }),
      partOfSpeech: str(w, 'partOfSpeech', { max: 40, optional: true }),
    };
  });
  if (words.length === 0) throw new BadRequest('words is required');
  const wordDetails = words
    .map((w, i) => `${i + 1}. word="${w.word}", meaning="${w.meaning}", partOfSpeech="${w.partOfSpeech}"`)
    .join('\n');

  return `
You are an expert English teacher (EdTech specialist) creating a remedial mini-lesson for a Vietnamese learner at CEFR level ${level}.

The learner has been struggling with these specific English words:
${wordDetails}

Task:
Create a cohesive remedial mini-lesson that uses these EXACT words.

${LESSON_OUTPUT}
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
}

/** Five-word lessons from the analytics page: a weakness pattern, or the hardest words. */
export const generateRemedialLesson: OpSpec = {
  hourlyLimit: 10,
  models: ['gemini-3-flash-preview', 'gemini-2.5-flash'],
  timeoutMs: 60_000,
  kind: 'json',
  finalize: checkLesson,
  build(payload) {
    const p = asObject(payload);
    const level = oneOf(p, 'level', LEVELS, 'B1');
    const mode = oneOf(p, 'mode', ['weakness', 'words'] as const, 'weakness');
    const prompt = mode === 'weakness' ? weaknessPrompt(p, level) : hardestWordsPrompt(p, level);
    return { contents: userText(prompt), generationConfig: jsonConfig(lessonSchema) };
  },
};

const recommendationSchema = S.arr(
  S.obj({ word: S.str(), meaningVietnamese: S.str(), cefrLevel: S.str(), topic: S.str(), relevanceReason: S.str() }),
);

/** Ten new words for the dashboard, excluding words already learnt. */
export const recommendWords: OpSpec = {
  hourlyLimit: 10,
  models: ['gemini-3-flash-preview', 'gemini-2.5-flash'],
  timeoutMs: 30_000,
  kind: 'json',
  finalize(data) {
    if (!Array.isArray(data)) throw new Error('recommendations must be an array');
    return data;
  },
  build(payload) {
    const p = asObject(payload);
    const level = oneOf(p, 'level', LEVELS, 'B1');
    const topics = list(p, 'topics', 3, (v) => String(v).slice(0, 60));
    const exclude = list(p, 'exclude', 50, (v) => String(v).slice(0, 60));
    const topicsText = topics.length > 0 ? topics.join(', ') : 'general';
    const wordsText = exclude.length > 0 ? exclude.join(', ') : 'none';
    const prompt = `Suggest 10 English vocabulary words for a Vietnamese learner at ${level} level, related to topics: ${topicsText}. Exclude these already-known words: ${wordsText}. Return JSON array with: word, meaningVietnamese, cefrLevel, topic, relevanceReason (in Vietnamese).`;
    return { contents: userText(prompt), generationConfig: jsonConfig(recommendationSchema) };
  },
};
