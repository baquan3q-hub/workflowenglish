/**
 * Writing by translation: the learner rebuilds an IELTS answer one sentence at
 * a time from its Vietnamese version.
 *
 * - gradeTranslation grades one English sentence against the Vietnamese and
 *   the model sentences, and shows the same sentence one band higher.
 * - generateTranslationSet writes a set for any Writing prompt: the answer in
 *   sentences, each in Vietnamese and at bands 6, 7 and 8, with key phrases.
 */
import { asObject, BadRequest, FLASH_MODELS, LIGHT_TEXT_MODELS, jsonConfig, list, oneOf, q, str, S, userText, type OpSpec } from '../lib.ts';
import { learnerBlockFor } from './learner.ts';

export const TRANSLATION_BANDS = ['6', '7', '8'] as const;
export const TRANSLATION_VERDICTS = ['correct', 'acceptable', 'incorrect'] as const;
export const TRANSLATION_ERRORS = [
  'meaning',
  'tense',
  'article',
  'plural_agreement',
  'preposition',
  'word_choice',
  'collocation',
  'word_form',
  'word_order',
  'sentence_structure',
  'spelling_punctuation',
  'register',
  'other',
] as const;

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const clampBand = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(4, Math.min(9, Math.round(n * 2) / 2)) : null);

const gradeSchema = S.obj({
  verdict: S.str([...TRANSLATION_VERDICTS]),
  score: S.num(),
  band: S.num(),
  meaningKept: S.bool(),
  corrected: S.str(),
  errors: S.arr(
    S.obj({ original: S.str(), corrected: S.str(), category: S.str([...TRANSLATION_ERRORS]), explanationVi: S.str() }),
  ),
  explanationVi: S.str(),
  upgrade: S.str(),
  upgradeNoteVi: S.str(),
  revision: S.str(['better', 'same', 'worse', 'first']),
});

export const gradeTranslation: OpSpec = {
  hourlyLimit: 90,
  models: LIGHT_TEXT_MODELS,
  timeoutMs: 12_000,
  kind: 'json',
  finalize(data) {
    const g = data as Record<string, unknown> | null;
    if (!g || !(TRANSLATION_VERDICTS as readonly string[]).includes(g.verdict as string) || !nonEmpty(g.corrected)) {
      throw new Error('grade is missing verdict or correction');
    }
    const errors = Array.isArray(g.errors)
      ? g.errors
          .map((e) => e as Record<string, unknown>)
          .filter((e) => nonEmpty(e.corrected))
          .map((e) => ({
            original: String(e.original ?? ''),
            corrected: String(e.corrected),
            category: (TRANSLATION_ERRORS as readonly string[]).includes(e.category as string) ? e.category : 'other',
            explanationVi: String(e.explanationVi ?? ''),
          }))
          .slice(0, 6)
      : [];
    return {
      verdict: g.verdict,
      score: typeof g.score === 'number' ? Math.max(0, Math.min(100, Math.round(g.score))) : null,
      band: clampBand(g.band),
      meaningKept: g.meaningKept !== false,
      corrected: String(g.corrected),
      errors: g.verdict === 'correct' ? errors.filter((e) => e.category === 'collocation' || e.category === 'register') : errors,
      explanationVi: String(g.explanationVi ?? ''),
      upgrade: String(g.upgrade ?? ''),
      upgradeNoteVi: String(g.upgradeNoteVi ?? ''),
      revision: ['better', 'same', 'worse', 'first'].includes(g.revision as string) ? g.revision : 'first',
    };
  },
  build(payload) {
    const p = asObject(payload);
    const vi = str(p, 'vi', { max: 800 });
    const answer = str(p, 'answer', { max: 1000 });
    const targetBand = oneOf(p, 'targetBand', TRANSLATION_BANDS, '7');
    const task = oneOf(p, 'task', ['task_1', 'task_2'] as const, 'task_2');
    const prompt = str(p, 'prompt', { max: 1500, optional: true });
    const before = str(p, 'before', { max: 800, optional: true });
    const previous = str(p, 'previous', { max: 1000, optional: true });
    // Upgrade mode (band 7+): the learner rewrites this simpler English sentence instead of translating.
    const upgradeFrom = str(p, 'upgradeFrom', { max: 800, optional: true });
    const models = list(p, 'models', 3, (v) => String(v).slice(0, 800)).filter(nonEmpty);
    const keys = list(p, 'keys', 8, (v) => String(v).slice(0, 120)).filter(nonEmpty);
    const hintsUsed = typeof p.hintsUsed === 'number' ? Math.max(0, Math.min(5, Math.round(p.hintsUsed))) : 0;
    if (!models.length) throw new BadRequest('models is required');

    const upBand = Math.min(9, Number(targetBand) + 1);
    const text = `You are an IELTS Writing examiner and a Vietnamese-speaking teacher. A Vietnamese learner is rebuilding an IELTS Writing ${task === 'task_1' ? 'Task 1 report' : 'Task 2 essay'} one sentence at a time by translating the Vietnamese version into English. Their current target is band ${targetBand}.
${prompt ? `\nThe essay question: ${q(prompt)}` : ''}${before ? `\nThe sentence just before this one: ${q(before)}` : ''}
Vietnamese sentence to translate: ${q(vi)}
Model English sentences (examples at different bands, NOT the only correct answer): ${models.map(q).join(' | ')}
${keys.length ? `Key phrases the models use: ${keys.map(q).join(', ')}` : ''}
${previous ? `The learner's previous try at this sentence: ${q(previous)}` : ''}
${upgradeFrom ? `UPGRADE exercise: instead of translating, the learner was given this simpler English version and asked to rewrite it at band ${targetBand} or higher: ${q(upgradeFrom)}. Judge the meaning against the Vietnamese as usual, and also whether the rewrite is clearly better than the given version. An answer that is the given version with only trivial changes is "acceptable" at most, with a score of no more than 60.` : ''}
Learner's sentence: ${q(answer)}
${hintsUsed ? `The learner used ${hintsUsed} hint(s) before writing.` : ''}

Judge in this order:
1. Meaning: does it say what the Vietnamese says, in a way that fits the essay? Missing or changed ideas are "meaning" errors. A freer translation that keeps the idea is fine.
2. Grammar: tense, articles, plural and agreement, prepositions, word form, word order, sentence structure (run-ons, fragments, comma splices). Vietnamese learners often drop articles, plurals, -s/-ed endings and linking words; check these carefully.
3. Vocabulary: precise words, natural collocations, academic register (no contractions, no "a lot of" in formal writing).
4. Band of this sentence alone, from 4 to 9 in steps of 0.5, using the IELTS Lexical Resource and Grammatical Range and Accuracy descriptors.

Verdict:
- "correct": the meaning is kept, no grammar errors, natural English. Wording different from the models is fine.
- "acceptable": the meaning is kept and it is understandable, with a small slip or an unnatural word choice.
- "incorrect": the meaning is lost or changed, or there is a clear grammar error.
Never penalise valid alternative wording, British or American spelling, or punctuation choices.

Output:
- score: 0-100 (meaning 40, grammar 35, vocabulary 25).
- band: the band of the learner's sentence.
- meaningKept: false when an idea of the Vietnamese is missing or changed.
- corrected: the learner's sentence with the MINIMUM changes needed, keeping their wording. Wrap each changed or added word in **double asterisks**. If nothing needs changing, repeat it with no asterisks.
- errors: one entry per real error (max 6) { original, corrected, category, explanationVi }. explanationVi is one short sentence in Vietnamese that names the rule.
- explanationVi: one or two friendly, specific sentences in Vietnamese: what was good, then the most important fix.
- upgrade: the learner's sentence rewritten at about band ${upBand}, keeping their idea and as much of their wording as possible (better collocations, a more complex structure, a more precise word). Must be grammatical and natural.
- upgradeNoteVi: one short Vietnamese sentence naming what the upgrade changes (e.g. "Dùng mệnh đề quan hệ rút gọn và collocation 'pose a threat to'").
- revision: "first" when there is no previous try; otherwise "better", "same" or "worse" compared with the previous try.`;
    return { contents: userText(text), generationConfig: jsonConfig(gradeSchema, { temperature: 0.1 }) };
  },
};

// --- Sets for any prompt ---------------------------------------------------------

const setSchema = S.obj({
  title: S.str(),
  paragraphs: S.arr(
    S.obj({
      label: S.str(),
      sentences: S.arr(
        S.obj({
          vi: S.str(),
          band6: S.str(),
          band7: S.str(),
          band8: S.str(),
          keys: S.arr(S.obj({ en: S.str(), vi: S.str() })),
        }),
      ),
    }),
  ),
});

export interface GeneratedTranslationSentence {
  vi: string;
  band6: string;
  band7: string;
  band8: string;
  keys: { en: string; vi: string }[];
}

export interface GeneratedTranslationSet {
  title: string;
  paragraphs: { label: string; sentences: GeneratedTranslationSentence[] }[];
}

/** Problems that make a generated set unusable; empty when it is fine. */
export function translationSetProblems(data: unknown): string[] {
  const d = data as Partial<GeneratedTranslationSet> | null;
  if (!d || !Array.isArray(d.paragraphs)) return ['paragraphs missing'];
  const out: string[] = [];
  const sentences = d.paragraphs.flatMap((p) => (Array.isArray(p?.sentences) ? p.sentences : []));
  if (d.paragraphs.length < 3) out.push(`only ${d.paragraphs.length} paragraphs`);
  if (sentences.length < 6) out.push(`only ${sentences.length} sentences`);
  if (sentences.length > 22) out.push(`${sentences.length} sentences is too many`);
  sentences.forEach((s, i) => {
    if (![s?.vi, s?.band6, s?.band7, s?.band8].every(nonEmpty)) out.push(`sentence ${i + 1} has an empty field`);
    else if (s.band6.trim() === s.band8.trim()) out.push(`sentence ${i + 1} is the same at band 6 and 8`);
  });
  return out;
}

export const generateTranslationSet: OpSpec = {
  hourlyLimit: 10,
  models: FLASH_MODELS,
  timeoutMs: 75_000,
  kind: 'json',
  finalize(data) {
    const problems = translationSetProblems(data);
    if (problems.length) throw new Error(problems.slice(0, 3).join('; '));
    const d = data as GeneratedTranslationSet;
    return {
      title: String(d.title ?? '').trim().slice(0, 160),
      paragraphs: d.paragraphs
        .filter((p) => p.sentences?.length)
        .map((p) => ({
          label: String(p.label ?? '').trim().slice(0, 40) || 'Đoạn',
          sentences: p.sentences.map((s) => ({
            vi: s.vi.trim(),
            band6: s.band6.trim(),
            band7: s.band7.trim(),
            band8: s.band8.trim(),
            keys: (Array.isArray(s.keys) ? s.keys : [])
              .filter((k) => nonEmpty(k?.en))
              .slice(0, 4)
              .map((k) => ({ en: k.en.trim(), vi: String(k.vi ?? '').trim() })),
          })),
        })),
    };
  },
  build(payload) {
    const p = asObject(payload);
    const task = oneOf(p, 'task', ['task_1', 'task_2'] as const, 'task_2');
    const prompt = str(p, 'prompt', { max: 2500 });
    const chart = str(p, 'chart', { max: 4000, optional: true });

    const text = `You write a sentence-by-sentence translation drill for Vietnamese IELTS learners.

${task === 'task_1' ? 'IELTS Writing Task 1 (Academic report, about 170 words)' : 'IELTS Writing Task 2 (essay, about 270 words)'}.
Question: ${q(prompt)}${chart ? `\nChart data (JSON): ${chart}` : ''}

Write one complete model answer, then present it sentence by sentence.
- paragraphs: ${task === 'task_1' ? '4 paragraphs labelled "Mở bài", "Tổng quan", "Thân bài 1", "Thân bài 2"' : '4 paragraphs labelled "Mở bài", "Thân bài 1", "Thân bài 2", "Kết bài"'}, 2 to 5 sentences each, 10 to 18 sentences in all.
- For each sentence:
  - band8: the sentence as a band 8 writer would write it (precise vocabulary, natural collocations, varied complex structures).
  - band7: the same idea at band 7 (clear, some complex sentences, good collocations).
  - band6: the same idea at band 6 (simpler structures and common words, but still correct English).
  - vi: a natural Vietnamese translation of the idea, as a Vietnamese student would say it. Do not translate word for word from English; it must read like real Vietnamese.
  - keys: 2 to 4 key English phrases from the band 7 or 8 version (collocations, linking phrases, academic words) with their Vietnamese meaning.
- Every version of a sentence keeps the same meaning, so a learner can translate the Vietnamese at any band.
${task === 'task_1' ? '- Use only numbers that are in the chart data; never invent data.' : '- Give a clear position and realistic examples.'}
- title: a short Vietnamese title for the set, e.g. "Task 2 · Học trực tuyến (Discussion)".
- No markdown.`;
    return { contents: userText(text + learnerBlockFor(p)), generationConfig: jsonConfig(setSchema, { temperature: 0.6 }) };
  },
};
