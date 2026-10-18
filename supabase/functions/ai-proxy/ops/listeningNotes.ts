/**
 * listeningNotes: for a Listening part an admin wrote by hand, suggests the
 * review notes of each question (the segment and words that give the answer,
 * the distractor, the paraphrase and a Vietnamese explanation).
 *
 * Admins only. The app keeps a suggestion only when its quotes really are in
 * the script, and only fills fields the admin left empty.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, list, q, S, str, userText, type OpSpec } from '../lib.ts';

export interface NotesSegment {
  id: string;
  /** "Name: line" turns. */
  text: string;
}

export interface NotesQuestion {
  number: number;
  type: string;
  /** The question as the learner reads it: the prompt, or the line with the blank. */
  question: string;
  options: string[];
  answers: string[];
}

export interface NotesRequest {
  part: number;
  segments: NotesSegment[];
  questions: NotesQuestion[];
}

export interface QuestionNote {
  number: number;
  segmentId: string;
  evidence: string;
  distractor: string;
  paraphraseQuestion: string;
  paraphraseAudio: string;
  explanationVi: string;
}

const SCRIPT_MAX = 30_000;

export function parseNotesRequest(payload: unknown): NotesRequest {
  const o = asObject(payload);
  const part = Number(o.part);
  if (![1, 2, 3, 4].includes(part)) throw new BadRequest('part must be 1-4');
  const segments = list(o, 'segments', 40, (v, i) => {
    const s = asObject(v, `segments[${i}]`);
    return { id: str(s, 'id', { max: 80 }), text: str(s, 'text', { max: 8000 }) };
  });
  if (!segments.length) throw new BadRequest('segments is required');
  if (segments.reduce((n, s) => n + s.text.length, 0) > SCRIPT_MAX) throw new BadRequest('script is too long');
  const questions = list(o, 'questions', 40, (v, i) => {
    const x = asObject(v, `questions[${i}]`);
    const number = Number(x.number);
    if (!Number.isInteger(number) || number < 1 || number > 40) throw new BadRequest(`questions[${i}].number must be 1-40`);
    return {
      number,
      type: str(x, 'type', { max: 20 }),
      question: str(x, 'question', { max: 600, optional: true }),
      options: list(x, 'options', 10, (t) => String(t).slice(0, 200)),
      answers: list(x, 'answers', 6, (t) => String(t).slice(0, 80)),
    };
  });
  if (!questions.length) throw new BadRequest('questions is required');
  return { part, segments, questions };
}

export function listeningNotesPrompt(r: NotesRequest): string {
  const script = r.segments.map((s) => `[${s.id}]\n${s.text}`).join('\n\n');
  const questions = r.questions
    .map((x) => {
      const options = x.options.length ? `\n  Options: ${x.options.join(' | ')}` : '';
      return `Q${x.number} (${x.type}): ${x.question || '(no prompt)'}${options}\n  Correct answer: ${x.answers.join(' / ') || '(missing)'}`;
    })
    .join('\n');
  return `You are an experienced IELTS Listening examiner writing the answer review for IELTS Listening Part ${r.part}.

The script is split into segments, each starting with its id in square brackets:
${q(script)}

The questions with their correct answers:
${questions}

For every question write:
- segmentId: the id of the segment where the answer is heard.
- evidence: the words from that segment that give the answer, copied exactly (same spelling and punctuation), one short phrase or sentence of at most 30 words. For completion and short-answer questions it must contain the answer.
- distractor: words copied exactly from the script that could mislead a learner (a wrong option mentioned, a speaker changing their mind, a similar number). Empty string if there is none.
- paraphraseQuestion and paraphraseAudio: a phrase from the question and the different words the audio uses for the same idea. Empty strings if the audio uses the same words.
- explanationVi: one or two sentences in Vietnamese saying why the answer is correct and, if there is a distractor, why it is wrong. Plain Vietnamese, no markdown.`;
}

const noteSchema = S.obj({
  number: S.num(),
  segmentId: S.str(),
  evidence: S.str(),
  distractor: S.str(),
  paraphraseQuestion: S.str(),
  paraphraseAudio: S.str(),
  explanationVi: S.str(),
});

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Well-formed notes only; whether the quotes are in the script is checked by the app. */
export function finalizeNotes(data: unknown): { notes: QuestionNote[] } {
  const raw = (data as { notes?: unknown } | null)?.notes;
  if (!Array.isArray(raw)) throw new Error('notes missing');
  const notes = raw
    .map((n: Record<string, unknown>) => ({
      number: Number(n?.number),
      segmentId: text(n?.segmentId, 80),
      evidence: text(n?.evidence, 400),
      distractor: text(n?.distractor, 400),
      paraphraseQuestion: text(n?.paraphraseQuestion, 200),
      paraphraseAudio: text(n?.paraphraseAudio, 200),
      explanationVi: text(n?.explanationVi, 600),
    }))
    .filter((n) => Number.isInteger(n.number) && n.number >= 1 && n.number <= 40);
  if (!notes.length) throw new Error('no usable notes');
  return { notes };
}

export const listeningNotes: OpSpec = {
  hourlyLimit: 30,
  models: FLASH_MODELS,
  timeoutMs: 90_000,
  kind: 'json',
  adminOnly: true,
  finalize: finalizeNotes,
  build(payload) {
    const r = parseNotesRequest(payload);
    return {
      contents: userText(listeningNotesPrompt(r)),
      generationConfig: jsonConfig(S.obj({ notes: S.arr(noteSchema) }), { temperature: 0.3 }),
    };
  },
};
