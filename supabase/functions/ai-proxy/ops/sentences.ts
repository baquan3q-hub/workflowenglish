import { asObject, BadRequest, FLASH_MODELS, jsonConfig, list, oneOf, q, str, S, userText, type OpSpec } from '../lib.ts';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const VERDICTS = ['correct', 'acceptable', 'incorrect'] as const;
export const ERROR_CATEGORIES = [
  'tense',
  'article',
  'preposition',
  'word_choice',
  'word_order',
  'spelling',
  'grammar',
  'meaning',
  'other',
] as const;

const itemsSchema = S.obj({
  items: S.arr(S.obj({ promptVi: S.str(), targetWords: S.arr(S.str()), references: S.arr(S.str()) })),
});

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Vietnamese sentences to translate, each using one or two lesson words, with
 * 1–3 reference translations. Made in the background right after a lesson.
 */
export const generateSentences: OpSpec = {
  hourlyLimit: 20,
  models: FLASH_MODELS,
  timeoutMs: 45_000,
  kind: 'json',
  finalize(data) {
    const raw = (data as { items?: unknown })?.items;
    if (!Array.isArray(raw)) throw new Error('items must be an array');
    const items = raw
      .map((it) => it as { promptVi?: unknown; targetWords?: unknown; references?: unknown })
      .filter((it) => nonEmpty(it.promptVi) && Array.isArray(it.targetWords) && Array.isArray(it.references))
      .map((it) => ({
        promptVi: (it.promptVi as string).trim(),
        targetWords: (it.targetWords as unknown[]).filter(nonEmpty).map((w) => w.trim()).slice(0, 2),
        references: (it.references as unknown[]).filter(nonEmpty).map((r) => r.trim()).slice(0, 3),
      }))
      .filter((it) => it.targetWords.length > 0 && it.references.length > 0);
    if (items.length < 3) throw new Error(`only ${items.length} valid sentences`);
    return { items: items.slice(0, 8) };
  },
  build(payload) {
    const p = asObject(payload);
    const level = oneOf(p, 'level', LEVELS, 'B1');
    const topic = str(p, 'topic', { max: 100, optional: true }) || 'General';
    const words = list(p, 'words', 30, (v) => {
      const w = asObject(v, 'word');
      return {
        word: str(w, 'word', { max: 80 }),
        meaning: str(w, 'meaning', { max: 300, optional: true }),
        partOfSpeech: str(w, 'partOfSpeech', { max: 40, optional: true }),
      };
    });
    if (words.length === 0) throw new BadRequest('words is required');
    const count = Math.min(8, Math.max(5, words.length));
    const wordLines = words.map((w) => `- ${w.word} (${w.partOfSpeech}): ${w.meaning}`).join('\n');

    const prompt = `You write translation drills for Vietnamese learners of English at CEFR ${level}. Topic: ${q(topic)}.

Vocabulary of the lesson:
${wordLines}

Write ${count} Vietnamese sentences for the learner to translate into English.
- Each sentence practises 1 or 2 of the words above; together they cover as many different words as possible.
- 'targetWords' lists those English words exactly as written above (dictionary form).
- Sentences sound like natural everyday Vietnamese, 8-18 words, at ${level} difficulty, related to the topic.
- The meaning must be unambiguous so a correct English translation clearly needs the target word.
- 'references': 1 to 3 natural English translations, each using every target word (inflected forms are fine). Vary them (e.g. contraction vs full form, different but correct word order) so common correct answers match.
- No markdown.`;
    return { contents: userText(prompt), generationConfig: jsonConfig(itemsSchema, { temperature: 0.7 }) };
  },
};

const gradeSchema = S.obj({
  verdict: S.str([...VERDICTS]),
  score: S.num(),
  corrected: S.str(),
  usedTargetWords: S.bool(),
  errors: S.arr(
    S.obj({ original: S.str(), corrected: S.str(), category: S.str([...ERROR_CATEGORIES]), explanationVi: S.str() }),
  ),
  explanationVi: S.str(),
  natural: S.str(),
});

/** Grades one learner sentence against the Vietnamese prompt and references. */
export const gradeSentence: OpSpec = {
  hourlyLimit: 60,
  models: FLASH_MODELS,
  timeoutMs: 10_000,
  kind: 'json',
  finalize(data) {
    const g = data as Record<string, unknown> | null;
    if (!g || !(VERDICTS as readonly string[]).includes(g.verdict as string) || typeof g.corrected !== 'string') {
      throw new Error('grade is missing verdict or correction');
    }
    const errors = Array.isArray(g.errors)
      ? g.errors
          .map((e) => e as Record<string, unknown>)
          .filter((e) => nonEmpty(e.corrected))
          .map((e) => ({
            original: String(e.original ?? ''),
            corrected: String(e.corrected),
            category: (ERROR_CATEGORIES as readonly string[]).includes(e.category as string) ? e.category : 'other',
            explanationVi: String(e.explanationVi ?? ''),
          }))
          .slice(0, 5)
      : [];
    const score = typeof g.score === 'number' ? Math.max(0, Math.min(100, Math.round(g.score))) : null;
    return {
      verdict: g.verdict,
      score,
      corrected: g.corrected,
      usedTargetWords: g.usedTargetWords !== false,
      errors: g.verdict === 'correct' ? [] : errors,
      explanationVi: String(g.explanationVi ?? ''),
      natural: String(g.natural ?? ''),
    };
  },
  build(payload) {
    const p = asObject(payload);
    const promptVi = str(p, 'promptVi', { max: 500 });
    const answer = str(p, 'answer', { max: 600 });
    const level = oneOf(p, 'level', LEVELS, 'B1');
    const targetWords = list(p, 'targetWords', 3, (v) => String(v).slice(0, 80));
    const references = list(p, 'references', 3, (v) => String(v).slice(0, 500));

    const prompt = `You grade one English translation by a Vietnamese learner (CEFR ${level}).

Vietnamese sentence: ${q(promptVi)}
Target word(s) the learner must use: ${targetWords.map(q).join(', ')}
Reference translations (examples, not the only correct answers): ${references.map(q).join(' | ')}
Learner's answer: ${q(answer)}

Rubric, in order:
1. Meaning: does it say what the Vietnamese says? Missing or changed meaning is an error.
2. Grammar: tense, articles, prepositions, agreement, word order.
3. Target word: used, with the right meaning and part of speech (inflected forms are fine).
4. Naturalness.

Verdict:
- "correct": right meaning, no grammar errors, target word used correctly. Different wording from the references is fine.
- "acceptable": understandable and grammatical enough, but has a small slip (minor article/preposition, slightly unnatural wording) or misses a nuance.
- "incorrect": wrong meaning, a clear grammar error, or the target word missing or misused.
Do NOT penalise valid alternative phrasing, British/American spelling, contractions or punctuation. Only correct real errors.

Output:
- score: 0-100.
- corrected: the learner's sentence with the MINIMUM changes needed, keeping their wording. Wrap each changed or added word in **double asterisks**. If nothing needs changing, repeat the answer unchanged with no asterisks.
- usedTargetWords: true only if every target word is used correctly.
- errors: one entry per real error (max 5), each { original, corrected, category, explanationVi }. Empty when verdict is "correct".
- explanationVi: one or two short sentences in Vietnamese, friendly and specific.
- natural: one natural English version of the Vietnamese sentence using the target word(s).`;
    return { contents: userText(prompt), generationConfig: jsonConfig(gradeSchema, { temperature: 0.1 }) };
  },
};
