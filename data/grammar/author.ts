/**
 * Short helpers for writing lessons. Item IDs come from the lesson ID and the item text,
 * so reordering items keeps saved progress; rewording an item makes it a new item.
 */
import type { Contrast, Example, Form, Item, LessonBody, OpenItem, Trap } from './types';

/** An item before its ID is set; Omit is applied to each kind separately. */
type Draft = (Item extends infer T ? (T extends unknown ? Omit<T, 'id'> : never) : never) & { id?: string };

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const keyText = (d: Draft) =>
  d.kind === 'choice' || d.kind === 'fill'
    ? d.prompt
    : d.kind === 'spot'
      ? d.sentences[0]
      : d.kind === 'fix'
        ? d.wrong
        : d.kind === 'order'
          ? d.answer
          : d.kind + ':' + d.task;

/** Choice: `prompt` has one `___` gap. */
export const c = (prompt: string, answer: string, wrong: string[], why: string): Draft => ({
  kind: 'choice',
  level: 1,
  prompt,
  answer,
  options: [answer, ...wrong],
  why,
});
/** Spot the correct sentence: the first one is correct. */
export const s = (sentences: string[], why: string): Draft => ({ kind: 'spot', level: 1, sentences, why });
/** Fill the gap. `answer` may list accepted variants separated by `|`; `cue` is shown after the gap. */
export const f = (prompt: string, answer: string, why: string, cue?: string): Draft => {
  const [first, ...rest] = answer.split('|');
  return { kind: 'fill', level: 2, prompt, answer: first, accept: rest, why, cue };
};
/** Correct the sentence. `answer` may list accepted variants separated by `|`. */
export const x = (wrong: string, answer: string, why: string): Draft => {
  const [first, ...rest] = answer.split('|');
  return { kind: 'fix', level: 2, wrong, answer: first, accept: rest, why };
};
/** Put chunks in order. Write the sentence with ` / ` between chunks. */
export const o = (sentence: string, why: string): Draft => {
  const chunks = sentence.split(' / ').map((part) => part.trim());
  return { kind: 'order', level: 2, chunks, answer: chunks.join(' '), why };
};
/** `model` may list other good answers separated by `|`; the first one is shown. */
const open = (kind: OpenItem['kind'], level: 3 | 4 | 5) => (task: string, model: string): Draft => {
  const [first, ...alts] = model.split('|');
  return { kind, level, task, model: first, ...(alts.length ? { alts } : {}) };
};
/** Translate Vietnamese → English. */
export const t = open('translate', 3);
/** Write a sentence or two. */
export const w = open('write', 4);
/** Say it aloud (typing is the fallback). */
export const sp = open('speak', 5);
export const diag = (d: Draft): Draft => ({ ...d, diag: true });
export const rev = (d: Draft): Draft => ({ ...d, review: true });

interface LessonInput {
  when: string[];
  why: string;
  forms: [label: string, pattern: string, example: string][];
  examples: [en: string, vi: string][];
  contrast?: Omit<Contrast, 'pairs'> & { pairs: [a: string, b: string, meaning: string][] };
  traps: [wrong: string, right: string, why: string][];
  ielts?: string;
  items: Draft[];
}

export function lesson(id: string, input: LessonInput): LessonBody {
  const forms: Form[] = input.forms.map(([label, pattern, example]) => ({ label, pattern, example }));
  const examples: Example[] = input.examples.map(([en, vi]) => ({ en, vi }));
  const traps: Trap[] = input.traps.map(([wrong, right, why]) => ({ wrong, right: right.split('|').join(' / '), why }));
  const contrast = input.contrast && {
    ...input.contrast,
    pairs: input.contrast.pairs.map(([a, b, meaning]) => ({ a, b, meaning })),
  };
  const items = input.items.map((d) => ({ ...d, id: id + ':' + d.kind[0] + hash(keyText(d)) }) as Item);
  return { id, when: input.when, why: input.why, forms, examples, contrast, traps, ielts: input.ielts, items };
}
