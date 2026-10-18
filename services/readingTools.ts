/**
 * Word lookup and sentence explain while reading: what a selection is, the
 * passage glossary match, and the sentence around a selection.
 */
import type { GlossaryEntry } from '../data/ielts/reading/types';

export type SelectionKind = 'word' | 'sentence';

/** A word or phrase lookup is up to this many words; longer is a sentence. */
export const WORD_MAX = 4;
/** Longer selections are not sent to the AI. */
export const SENTENCE_MAX_CHARS = 600;

const EDGE_PUNCT = /^[\s"'“”‘’()[\],.;:!?–—-]+|[\s"'“”‘’()[\],.;:!?–—-]+$/g;

/** The selection without surrounding spaces, quotes and punctuation. */
export const cleanSelection = (text: string) => text.replace(EDGE_PUNCT, '').replace(/\s+/g, ' ');

export function selectionKind(text: string): SelectionKind | null {
  const clean = cleanSelection(text);
  if (!clean || clean.length > SENTENCE_MAX_CHARS) return null;
  // At least one letter: "40" or "–" alone is nothing to look up.
  if (!/\p{L}/u.test(clean)) return null;
  return clean.split(' ').length <= WORD_MAX ? 'word' : 'sentence';
}

const norm = (s: string) => cleanSelection(s).toLowerCase();

/** Forms of `term` the learner may have selected: plurals and -ed/-ing. */
function forms(term: string): string[] {
  const t = norm(term);
  const out = [t, `${t}s`, `${t}es`, `${t}d`, `${t}ed`, `${t}ing`];
  if (t.endsWith('y')) out.push(`${t.slice(0, -1)}ies`, `${t.slice(0, -1)}ied`);
  if (t.endsWith('e')) out.push(`${t.slice(0, -1)}ing`);
  return out;
}

/** The glossary entry for the selected words, if the passage has one. */
export function glossaryMatch(glossary: GlossaryEntry[] | undefined, text: string): GlossaryEntry | undefined {
  const sel = norm(text);
  if (!sel || !glossary?.length) return undefined;
  return glossary.find((g) => forms(g.term).includes(sel));
}

const ENDS = /[.!?]/;

/**
 * The sentence (or sentences) containing text[start, end), trimmed. A full
 * stop inside a number such as "3.5" does not end a sentence.
 */
export function sentenceAt(text: string, start: number, end: number): string {
  const isEnd = (i: number) => ENDS.test(text[i]) && (i + 1 >= text.length || /\s/.test(text[i + 1]));
  let a = Math.max(0, Math.min(start, text.length));
  while (a > 0 && !isEnd(a - 1)) a--;
  let b = Math.max(a, Math.min(end, text.length));
  // A selection that ends on the full stop keeps that sentence only.
  if (b > a && isEnd(b - 1)) return text.slice(a, b).trim();
  while (b < text.length && !isEnd(b)) b++;
  return text.slice(a, Math.min(text.length, b + 1)).trim();
}
