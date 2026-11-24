import type { FillItem, Item } from '../../data/grammar/types';

/** Lower-case, straight quotes, single spaces, no final punctuation, contractions spelled out. */
export function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/\bcan't\b/g, 'can not')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not')
    .replace(/'m\b/g, ' am')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const isOpen = (item: Item) => item.kind === 'translate' || item.kind === 'write' || item.kind === 'speak';

/** The sentence with its gap filled, for feedback. */
export const filled = (item: FillItem | { prompt: string }, answer: string) => item.prompt.replace('___', answer);

/** Correct answer shown after a closed item. */
export function expectedOf(item: Item) {
  switch (item.kind) {
    case 'choice':
      return filled(item, item.answer);
    case 'fill':
      return filled(item, item.answer);
    case 'spot':
      return item.sentences[0];
    case 'fix':
      return item.answer;
    case 'order':
      return sentenceCase(item.answer);
    default:
      return item.model;
  }
}

export function sentenceCase(text: string) {
  const s = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(s) ? s : s + '.';
}

/** Grades closed items in the browser. Open items return null and go to the AI. */
export function gradeClosed(item: Item, answer: string): boolean | null {
  const a = normalize(answer);
  switch (item.kind) {
    case 'choice':
      return answer === item.answer;
    case 'spot':
      return answer === item.sentences[0];
    case 'fill': {
      const ok = [item.answer, ...item.accept];
      return (
        ok.some((v) => normalize(v) === a) || ok.some((v) => normalize(filled(item, v)) === a)
      );
    }
    case 'fix':
      return [item.answer, ...item.accept].some((v) => normalize(v) === a);
    case 'order':
      return a === normalize(item.answer);
    default:
      return null;
  }
}

/** Deterministic shuffle so a redraw does not reorder options under the learner's finger. */
export function shuffled<T>(list: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Order items: shuffle until the chunks are not already in order. */
export function scrambled(chunks: string[], seed: string) {
  if (chunks.length < 2) return chunks;
  for (let n = 0; n < 6; n++) {
    const next = shuffled(chunks, seed + n);
    if (next.join(' ') !== chunks.join(' ')) return next;
  }
  return [...chunks].reverse();
}

/** What the screen shows as the question. */
export function promptOf(item: Item) {
  switch (item.kind) {
    case 'choice':
    case 'fill':
      return item.prompt;
    case 'spot':
      return 'Câu nào đúng?';
    case 'fix':
      return item.wrong;
    case 'order':
      return 'Sắp xếp thành câu đúng';
    default:
      return item.task;
  }
}
