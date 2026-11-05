/**
 * Two short Writing games on top of "Viết từng câu" (pure, no I/O):
 *
 * - "Xếp mảnh câu": a band-level model sentence cut into 4–6 chunks at
 *   natural joints (commas, clause words, prepositions) and shuffled; the
 *   learner puts it back together. A warm-up that trains how a good sentence
 *   is built before writing one.
 * - "Săn lỗi": a sentence with one of the learner's own past mistakes in it.
 *   Tap the wrong words, then pick the fix. Mistakes come from their graded
 *   tries; new learners get a starter set of typical mistakes.
 */
import type { StarterError } from '../data/ielts/writingErrorHunt';
import type { RecentError, TranslationErrorCategory } from './writingTranslateLogic';

// --- Random --------------------------------------------------------------------------

/** A small seeded generator (mulberry32), so a round is the same on re-render. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// --- Sentence chunks -----------------------------------------------------------------

const CLAUSE_WORDS = new Set([
  'which', 'that', 'who', 'whom', 'whose', 'where', 'when', 'whenever', 'wherever', 'while', 'because', 'as', 'since', 'although', 'though',
  'if', 'unless', 'and', 'but', 'or', 'so', 'leading', 'resulting', 'meaning', 'such', 'rather', 'instead', 'whereas',
]);
const PREPOSITIONS = new Set(['to', 'for', 'in', 'on', 'at', 'with', 'of', 'by', 'from', 'through', 'into', 'about', 'between', 'than', 'without', 'during', 'over', 'under']);

/** Words that lead into what follows: a chunk never ends on one ("so | that", "to | the"). */
const GLUE = new Set([...CLAUSE_WORDS, ...PREPOSITIONS, 'a', 'an', 'the', 'not', 'more', 'most', 'less', 'very', 'can', 'will', 'should', 'would', 'could', 'may', 'might', 'must', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'their', 'its', 'his', 'her', 'our', 'my', 'your', 'this', 'these', 'those']);
const bare = (w: string) => w.toLowerCase().replace(/[^a-z-]/g, '');

/** How good a cut is just before word `i`: after a comma best, then before a clause word, then a preposition; never after a glue word. */
function cutScore(words: readonly string[], i: number): number {
  const prev = words[i - 1];
  const word = bare(words[i]);
  if (/[,;:]$/.test(prev)) return 3;
  if (GLUE.has(bare(prev))) return -3;
  if (CLAUSE_WORDS.has(word)) return 2;
  if (PREPOSITIONS.has(word)) return 1;
  return 0;
}

/**
 * The sentence in 4–6 chunks (fewer only for very short sentences), cut at
 * the best joints near even lengths. Joined with spaces they give the
 * sentence back exactly.
 */
export function chunkSentence(text: string, maxChunks = 6): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 4) return words;
  const count = Math.min(maxChunks, Math.max(4, Math.round(words.length / 4)), words.length);
  const cuts: number[] = [];
  let last = 0;
  for (let k = 1; k < count; k++) {
    const ideal = Math.round((words.length * k) / count);
    // Leave at least one word for each chunk still to come.
    const lo = Math.max(last + 1, ideal - 2);
    const hi = Math.min(words.length - (count - k), ideal + 2);
    let best = Math.min(Math.max(ideal, lo), hi);
    let bestScore = -Infinity;
    for (let i = lo; i <= hi; i++) {
      const score = cutScore(words, i) * 2 - Math.abs(i - ideal);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    cuts.push(best);
    last = best;
  }
  const out: string[] = [];
  let from = 0;
  for (const c of [...cuts, words.length]) {
    out.push(words.slice(from, c).join(' '));
    from = c;
  }
  return out;
}

/** Chunk positions in a shuffled order that never reads as the sentence already. */
export function shuffleChunks(chunks: readonly string[], seed: number): number[] {
  const ids = chunks.map((_, i) => i);
  if (chunks.length < 2) return ids;
  const order = shuffled(ids, seeded(seed));
  const reads = (o: number[]) => o.map((i) => chunks[i]).join(' ') === chunks.join(' ');
  if (!reads(order)) return order;
  // Same text as the answer (possible with repeated chunks): rotate once.
  const rotated = [...order.slice(1), order[0]];
  return reads(rotated) ? order.reverse() : rotated;
}

/** Whether the picked chunks read as the sentence (two equal chunks may swap places). */
export const chunksRight = (chunks: readonly string[], picked: readonly number[]) =>
  picked.length === chunks.length && picked.map((i) => chunks[i]).join(' ') === chunks.join(' ');

/** The first place the picked order goes wrong, or -1 when all of it reads right. */
export function firstWrongChunk(chunks: readonly string[], picked: readonly number[]): number {
  for (let i = 0; i < picked.length; i++) if (chunks[picked[i]] !== chunks[i]) return i;
  return -1;
}

export interface ChunkSource {
  key: string;
  vi: string;
  text: string;
}

/**
 * A round of `n` sentences: ones the learner has already written first (they
 * know the meaning, now see a good build), then others, in seeded order.
 */
export function chunkRound(pool: readonly ChunkSource[], tried: ReadonlySet<string>, n: number, seed: number): ChunkSource[] {
  const rand = seeded(seed);
  const usable = pool.filter((s) => s.text.split(/\s+/).length >= 6);
  const known = shuffled(usable.filter((s) => tried.has(s.key)), rand);
  const rest = shuffled(usable.filter((s) => !tried.has(s.key)), rand);
  return [...known, ...rest].slice(0, n);
}

// --- Error hunt ------------------------------------------------------------------------

export interface HuntItem {
  id: string;
  /** The sentence with the mistake, word by word. */
  words: string[];
  /** Word positions of the mistake: [from, to). */
  span: [number, number];
  original: string;
  corrected: string;
  category: TranslationErrorCategory;
  explanationVi: string;
  /** Three fixes to choose from, one right (`corrected`). */
  options: string[];
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');

/** Where `phrase` sits in `words` (by word, ignoring case and punctuation), or null. */
export function findSpan(words: readonly string[], phrase: string): [number, number] | null {
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  if (!target.length) return null;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((t, j) => norm(words[i + j]) === t)) return [i, i + target.length];
  }
  return null;
}

/** A stable short id for a mistake, for the once-a-day XP. */
export function huntId(original: string, corrected: string): string {
  let h = 2166136261;
  for (const ch of `${original.toLowerCase()}→${corrected.toLowerCase()}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}

const SWAPS: Partial<Record<TranslationErrorCategory, string[][]>> = {
  preposition: [['in', 'on', 'at', 'for', 'to', 'with', 'of', 'about']],
  article: [['a', 'an', 'the']],
};

/** A wrong-but-plausible fix made from the right one (swap a preposition or article), or ''. */
function mutate(corrected: string, category: TranslationErrorCategory, rand: () => number): string {
  const words = corrected.split(/\s+/);
  for (const group of SWAPS[category] ?? []) {
    const at = words.findIndex((w) => group.includes(w.toLowerCase()));
    if (at >= 0) {
      const others = group.filter((g) => g !== words[at].toLowerCase());
      return [...words.slice(0, at), others[Math.floor(rand() * others.length)], ...words.slice(at + 1)].join(' ');
    }
  }
  return '';
}

export type HuntSource = Pick<RecentError, 'original' | 'corrected' | 'category' | 'answer'> & { explanationVi?: string };

/**
 * The answer with every other mistake graded in it fixed, so the hunt shows
 * a sentence with exactly the one mistake it asks about.
 */
export function withOnlyMistake(err: HuntSource, siblings: readonly HuntSource[]): string {
  let words = err.answer.trim().split(/\s+/).filter(Boolean);
  for (const s of siblings) {
    if (s === err || s.answer !== err.answer) continue;
    const span = findSpan(words, s.original);
    const own = findSpan(words, err.original);
    // Leave a fix that would touch the mistake being hunted.
    if (!span || (own && span[0] < own[1] && own[0] < span[1])) continue;
    words = [...words.slice(0, span[0]), ...s.corrected.trim().split(/\s+/).filter(Boolean), ...words.slice(span[1])];
  }
  return words.join(' ');
}

/**
 * The game card for one mistake: its sentence (the learner's own answer, or
 * the starter sentence), where the mistake is, and three fixes: the right
 * one, the mistake itself (leaving it as it was), and another plausible fix.
 * Null when the mistake cannot be found in its sentence.
 */
export function buildHuntItem(err: HuntSource, others: readonly HuntSource[], seed: number): HuntItem | null {
  const text = (err.answer ?? '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const span = findSpan(words, err.original);
  if (!span) return null;
  const rand = seeded(seed);
  const right = err.corrected.trim();
  const seen = new Set([right.toLowerCase(), err.original.trim().toLowerCase()]);
  const pickThird = (): string => {
    const swap = mutate(right, err.category, rand);
    if (swap && !seen.has(swap.toLowerCase())) return swap;
    // A fix of the same kind of mistake first, so the wrong option looks like a real answer.
    const sameKind = others.filter((o) => o.category === err.category);
    for (const o of [...shuffled(sameKind, rand), ...shuffled(others, rand)]) {
      const c = o.corrected.trim();
      if (c && !seen.has(c.toLowerCase()) && Math.abs(c.split(/\s+/).length - right.split(/\s+/).length) <= 2) return c;
    }
    return '';
  };
  const third = pickThird();
  const options = shuffled([right, err.original.trim(), ...(third ? [third] : [])], rand);
  return {
    id: huntId(err.original, err.corrected),
    words,
    span,
    original: err.original.trim(),
    corrected: right,
    category: err.category,
    explanationVi: err.explanationVi ?? '',
    options,
  };
}

/** The learner needs this many own mistakes before the hunt uses only theirs. */
export const MIN_OWN_ERRORS = 3;

/**
 * A round of up to `n` cards: the learner's own mistakes first (newest
 * first, as kept), topped up with starter ones while they have few.
 */
export function huntRound(own: readonly RecentError[], starters: readonly StarterError[], n: number, seed: number): HuntItem[] {
  const sources: HuntSource[] = own.map((e) => ({ ...e, answer: withOnlyMistake(e, own) }));
  if (own.length < MIN_OWN_ERRORS || sources.length < n) {
    for (const s of shuffled(starters, seeded(seed ^ 0x5bd1))) sources.push({ original: s.original, corrected: s.corrected, category: s.category, explanationVi: s.explanationVi, answer: s.sentence });
  }
  const items: HuntItem[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < sources.length && items.length < n; i++) {
    const item = buildHuntItem(sources[i], sources, seed + i);
    if (item && !ids.has(item.id)) {
      ids.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/** Whether a tapped word is part of the mistake. */
export const tapHits = (item: HuntItem, wordIndex: number) => wordIndex >= item.span[0] && wordIndex < item.span[1];

/** The sentence with the fix in place, for the explanation. */
export function fixedSentence(item: HuntItem): string {
  return [...item.words.slice(0, item.span[0]), item.corrected, ...item.words.slice(item.span[1])].join(' ');
}
