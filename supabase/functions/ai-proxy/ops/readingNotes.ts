/**
 * readingNotes: for a Reading passage an admin wrote by hand, suggests the
 * review notes of each question (the paragraph and words that give the
 * answer, the distractor, the paraphrase and a Vietnamese explanation).
 *
 * Admins only. The app keeps a suggestion only when its quotes really are in
 * the passage, and only fills fields the admin left empty.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, list, q, S, str, userText, type OpSpec } from '../lib.ts';

export interface ReadingNotesParagraph {
  label: string;
  text: string;
}

export interface ReadingNotesQuestion {
  number: number;
  type: string;
  /** The question as the learner reads it: the statement, prompt, or the line with the blank. */
  question: string;
  options: string[];
  answers: string[];
}

export interface ReadingNotesRequest {
  title: string;
  paragraphs: ReadingNotesParagraph[];
  questions: ReadingNotesQuestion[];
}

export interface ReadingQuestionNote {
  number: number;
  paragraph: string;
  evidence: string;
  distractor: string;
  paraphraseQuestion: string;
  paraphrasePassage: string;
  explanationVi: string;
}

const PASSAGE_MAX = 12_000;

export function parseReadingNotesRequest(payload: unknown): ReadingNotesRequest {
  const o = asObject(payload);
  const title = str(o, 'title', { max: 200, optional: true });
  const paragraphs = list(o, 'paragraphs', 12, (v, i) => {
    const p = asObject(v, `paragraphs[${i}]`);
    const label = str(p, 'label', { max: 2 });
    if (!/^[A-L]$/.test(label)) throw new BadRequest(`paragraphs[${i}].label must be a letter A-L`);
    return { label, text: str(p, 'text', { max: 4000 }) };
  });
  if (!paragraphs.length) throw new BadRequest('paragraphs is required');
  if (paragraphs.reduce((n, p) => n + p.text.length, 0) > PASSAGE_MAX) throw new BadRequest('passage is too long');
  const questions = list(o, 'questions', 20, (v, i) => {
    const x = asObject(v, `questions[${i}]`);
    const number = Number(x.number);
    if (!Number.isInteger(number) || number < 1 || number > 40) throw new BadRequest(`questions[${i}].number must be 1-40`);
    return {
      number,
      type: str(x, 'type', { max: 30 }),
      question: str(x, 'question', { max: 600, optional: true }),
      options: list(x, 'options', 15, (t) => String(t).slice(0, 200)),
      answers: list(x, 'answers', 6, (t) => String(t).slice(0, 80)),
    };
  });
  if (!questions.length) throw new BadRequest('questions is required');
  return { title, paragraphs, questions };
}

export function readingNotesPrompt(r: ReadingNotesRequest): string {
  const passage = r.paragraphs.map((p) => `[${p.label}] ${p.text}`).join('\n\n');
  const questions = r.questions
    .map((x) => {
      const options = x.options.length ? `\n  Options: ${x.options.join(' | ')}` : '';
      return `Q${x.number} (${x.type}): ${x.question || '(no prompt)'}${options}\n  Correct answer: ${x.answers.join(' / ') || '(missing)'}`;
    })
    .join('\n');
  return `You are an experienced IELTS Academic Reading examiner writing the answer review for a passage${r.title ? ` titled ${q(r.title)}` : ''}.

The passage, each paragraph starting with its letter in square brackets:
${q(passage)}

The questions with their correct answers:
${questions}

For every question write:
- paragraph: the letter of the paragraph that holds the answer (for matching headings, the paragraph the heading is for).
- evidence: the words from that paragraph that give the answer, copied exactly (same spelling and punctuation), one short phrase or sentence of at most 35 words. For completion and short-answer questions it must contain the answer. For NOT GIVEN, the words that come closest to the statement.
- distractor: words copied exactly from the passage that could mislead a learner (a keyword match with a different meaning, a wrong option mentioned). Empty string if there is none.
- paraphraseQuestion and paraphrasePassage: a phrase from the question and the different words the passage uses for the same idea. Empty strings if the passage uses the same words.
- explanationVi: one or two sentences in Vietnamese saying why the answer is correct; for TRUE/FALSE/NOT GIVEN say whether the passage agrees, contradicts or does not mention it. Plain Vietnamese, no markdown.`;
}

const noteSchema = S.obj({
  number: S.num(),
  paragraph: S.str(),
  evidence: S.str(),
  distractor: S.str(),
  paraphraseQuestion: S.str(),
  paraphrasePassage: S.str(),
  explanationVi: S.str(),
});

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Well-formed notes only; whether the quotes are in the passage is checked by the app. */
export function finalizeReadingNotes(data: unknown): { notes: ReadingQuestionNote[] } {
  const raw = (data as { notes?: unknown } | null)?.notes;
  if (!Array.isArray(raw)) throw new Error('notes missing');
  const notes = raw
    .map((n: Record<string, unknown>) => ({
      number: Number(n?.number),
      paragraph: text(n?.paragraph, 2).toUpperCase(),
      evidence: text(n?.evidence, 400),
      distractor: text(n?.distractor, 400),
      paraphraseQuestion: text(n?.paraphraseQuestion, 200),
      paraphrasePassage: text(n?.paraphrasePassage, 200),
      explanationVi: text(n?.explanationVi, 600),
    }))
    .filter((n) => Number.isInteger(n.number) && n.number >= 1 && n.number <= 40);
  if (!notes.length) throw new Error('no usable notes');
  return { notes };
}

export const readingNotes: OpSpec = {
  hourlyLimit: 30,
  models: FLASH_MODELS,
  timeoutMs: 90_000,
  kind: 'json',
  adminOnly: true,
  finalize: finalizeReadingNotes,
  build(payload) {
    const r = parseReadingNotesRequest(payload);
    return {
      contents: userText(readingNotesPrompt(r)),
      generationConfig: jsonConfig(S.obj({ notes: S.arr(noteSchema) }), { temperature: 0.3 }),
    };
  },
};
