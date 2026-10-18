/**
 * readingExplain: while reading a passage, the learner selects a word or a
 * sentence. A word gets its meaning in this context; a sentence gets a
 * Vietnamese translation, its structure broken down, the harder words, and
 * the paraphrases an IELTS question might use for it.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, q, S, str, userText, type OpSpec } from '../lib.ts';

export type ExplainMode = 'word' | 'sentence';

export interface ExplainRequest {
  mode: ExplainMode;
  text: string;
  /** The paragraph the selection is in. */
  context: string;
}

export interface ExplainVocab {
  term: string;
  meaningVi: string;
}

export interface ExplainResult {
  /** Word: the dictionary form, e.g. "colony" for "colonies". */
  headword: string;
  partOfSpeech: string;
  /** Word: its meaning here. */
  meaningVi: string;
  /** Sentence: the translation. */
  translationVi: string;
  /** Sentence: one line per part of the structure. */
  structureVi: string[];
  vocab: ExplainVocab[];
  /** "phrase ≈ another way to say it", as a question might word it. */
  paraphrases: string[];
}

const WORD_MAX_CHARS = 80;
const SENTENCE_MAX_CHARS = 600;
const CONTEXT_MAX_CHARS = 2500;

export function parseExplainRequest(payload: unknown): ExplainRequest {
  const o = asObject(payload);
  const mode = o.mode;
  if (mode !== 'word' && mode !== 'sentence') throw new BadRequest('mode must be word or sentence');
  const text = str(o, 'text', { max: mode === 'word' ? WORD_MAX_CHARS : SENTENCE_MAX_CHARS }).trim();
  if (!text) throw new BadRequest('text is required');
  const context = str(o, 'context', { max: CONTEXT_MAX_CHARS });
  return { mode, text, context };
}

export function readingExplainPrompt(r: ExplainRequest): string {
  const shared = `You are helping a Vietnamese learner (IELTS band 5-6.5) read an IELTS Academic Reading passage.

The paragraph:
${q(r.context)}
`;
  if (r.mode === 'word') {
    return `${shared}
The learner selected: ${q(r.text)}

Explain what it means in this paragraph.
- headword: its dictionary form (base form of a verb, singular of a noun), or the phrase as it is.
- partOfSpeech: in English, e.g. "noun", "verb", "adjective", "phrasal verb", "phrase".
- meaningVi: its meaning in this context, in short Vietnamese (a few words, like a dictionary entry).
- vocab: up to 3 common words in the same family or collocations, each with a short Vietnamese meaning.
- paraphrases: up to 3 English words or phrases an IELTS question might use instead of it, each written as "${r.text} ≈ synonym".
- translationVi: an empty string. structureVi: an empty list.
Plain text only, no markdown.`;
  }
  return `${shared}
The learner selected this sentence: ${q(r.text)}

Help them understand it.
- translationVi: a natural Vietnamese translation of the sentence.
- structureVi: 2-5 short lines in Vietnamese that break the sentence into its parts (main clause, subject and verb, relative or other clauses, long noun phrases, linking words), quoting the English part first, e.g. "which scatters more...: mệnh đề quan hệ bổ nghĩa cho blue light".
- vocab: up to 5 harder words or phrases from the sentence, each with a short Vietnamese meaning.
- paraphrases: up to 3 lines "phrase from the sentence ≈ different words with the same meaning", the way an IELTS question might reword it.
- headword, partOfSpeech and meaningVi: empty strings.
Plain text only, no markdown.`;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const lines = (v: unknown, n: number, max: number) =>
  (Array.isArray(v) ? v : [])
    .map((x) => text(x, max))
    .filter(Boolean)
    .slice(0, n);

/** Well-formed output with something to show; throwing triggers one retry. */
export function finalizeExplain(data: unknown): ExplainResult {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const vocab = (Array.isArray(d.vocab) ? d.vocab : [])
    .map((v: Record<string, unknown>) => ({ term: text(v?.term, 80), meaningVi: text(v?.meaningVi, 160) }))
    .filter((v) => v.term && v.meaningVi)
    .slice(0, 6);
  const out: ExplainResult = {
    headword: text(d.headword, 80),
    partOfSpeech: text(d.partOfSpeech, 40),
    meaningVi: text(d.meaningVi, 300),
    translationVi: text(d.translationVi, 1200),
    structureVi: lines(d.structureVi, 6, 300),
    vocab,
    paraphrases: lines(d.paraphrases, 4, 200),
  };
  if (!out.meaningVi && !out.translationVi) throw new Error('no meaning or translation');
  return out;
}

export const readingExplain: OpSpec = {
  hourlyLimit: 30,
  models: FLASH_MODELS,
  timeoutMs: 45_000,
  kind: 'json',
  finalize: finalizeExplain,
  build(payload) {
    const r = parseExplainRequest(payload);
    return {
      contents: userText(readingExplainPrompt(r)),
      generationConfig: jsonConfig(
        S.obj({
          headword: S.str(),
          partOfSpeech: S.str(),
          meaningVi: S.str(),
          translationVi: S.str(),
          structureVi: S.arr(S.str()),
          vocab: S.arr(S.obj({ term: S.str(), meaningVi: S.str() })),
          paraphrases: S.arr(S.str()),
        }),
        { temperature: 0.2 },
      ),
    };
  },
};
