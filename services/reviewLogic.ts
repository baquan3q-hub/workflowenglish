/**
 * Review Logic — pure helpers shared by every vocabulary exercise
 * (Flashcards, Review Session, Quiz, Fill-in-the-blank, Story).
 *
 * Nothing in this module performs I/O, so it can be unit/property tested
 * without a Supabase client.
 *
 * Responsibilities:
 *   - `computeReviewUpdate`: turn a rating into the next SRS state, with a
 *     same-session guard (several exercises in one lesson must not push a
 *     brand-new word weeks into the future) and interval fuzz (words learned
 *     together don't all fall due on the same day).
 *   - `gradeTypedAnswer`: tolerant grading of typed answers (typos, wrong
 *     inflection) so learners get "almost right" feedback instead of a hard
 *     fail.
 *   - `wordFormsOf` / `findWordForm`: locate a vocabulary word inside a
 *     sentence even when it is inflected ("decide" → "decided").
 */

import {
  MasteryLevel,
  type ConfidenceRating,
  type WordMasteryRecord,
} from '../types';
import {
  calculateSRS,
  DEFAULT_EASINESS_FACTOR,
  getNextReviewDate,
} from './srsService';
import {
  determineMasteryTransition,
  SUCCESSFUL_RATING_THRESHOLD,
} from './masteryService';

// --- Constants -------------------------------------------------------------

/**
 * Two reviews closer than this are considered part of the same study
 * session. A successful answer inside the window does not advance the
 * schedule again (the word was only just seen), but a failure still does.
 */
export const SAME_SESSION_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Intervals shorter than this (days) are never fuzzed. */
export const FUZZ_MIN_INTERVAL_DAYS = 3;

/** Maximum relative fuzz applied to the next review date (±10%). */
export const FUZZ_RATIO = 0.1;

// --- SRS update ------------------------------------------------------------

/** The subset of a mastery row needed to compute a review update. */
export type ReviewableState = Pick<
  WordMasteryRecord,
  | 'mastery_level'
  | 'easiness_factor'
  | 'interval_days'
  | 'repetition_count'
  | 'correct_count'
  | 'incorrect_count'
> & {
  last_reviewed_at?: string | null;
  next_review_date?: string | null;
};

export interface ReviewUpdate {
  mastery_level: MasteryLevel;
  easiness_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_date: string;
  last_reviewed_at: string;
  correct_count: number;
  incorrect_count: number;
  /** False when the same-session guard kept the previous schedule. */
  scheduleChanged: boolean;
}

export const DEFAULT_REVIEWABLE_STATE: ReviewableState = {
  mastery_level: MasteryLevel.NEW,
  easiness_factor: DEFAULT_EASINESS_FACTOR,
  interval_days: 0,
  repetition_count: 0,
  correct_count: 0,
  incorrect_count: 0,
  last_reviewed_at: null,
  next_review_date: null,
};

/** True when `lastReviewedAt` falls inside the same-session window. */
export function isSameSession(
  lastReviewedAt: string | null | undefined,
  now: Date,
): boolean {
  if (!lastReviewedAt) return false;
  const last = new Date(lastReviewedAt).getTime();
  if (Number.isNaN(last)) return false;
  const elapsed = now.getTime() - last;
  return elapsed >= 0 && elapsed < SAME_SESSION_WINDOW_MS;
}

/**
 * Number of whole days to add to an interval as fuzz. `rand` must return a
 * value in [0, 1). Short intervals are never fuzzed.
 */
export function fuzzDays(intervalDays: number, rand: () => number): number {
  if (!Number.isFinite(intervalDays) || intervalDays < FUZZ_MIN_INTERVAL_DAYS) {
    return 0;
  }
  const maxShift = Math.max(1, Math.round(intervalDays * FUZZ_RATIO));
  // Uniform integer in [-maxShift, maxShift]
  return Math.floor(rand() * (2 * maxShift + 1)) - maxShift;
}

/**
 * Apply a rating to a word's SRS state.
 *
 * Same-session rule: if the word was already reviewed inside
 * {@link SAME_SESSION_WINDOW_MS}, a non-failing rating (Hard/Good/Easy)
 * only updates counters — the schedule set by the first review stands.
 * "Again" always applies, so a fresh mistake is never ignored.
 */
export function computeReviewUpdate(
  existing: ReviewableState | null | undefined,
  rating: ConfidenceRating,
  now: Date = new Date(),
  rand: () => number = Math.random,
): ReviewUpdate {
  const base: ReviewableState = { ...DEFAULT_REVIEWABLE_STATE, ...(existing ?? {}) };
  const successful = rating >= SUCCESSFUL_RATING_THRESHOLD;
  const counters = {
    correct_count: (base.correct_count ?? 0) + (successful ? 1 : 0),
    incorrect_count: (base.incorrect_count ?? 0) + (successful ? 0 : 1),
    last_reviewed_at: now.toISOString(),
  };

  if (rating > 0 && isSameSession(base.last_reviewed_at, now) && base.next_review_date) {
    return {
      mastery_level: base.mastery_level,
      easiness_factor: base.easiness_factor,
      interval_days: base.interval_days,
      repetition_count: base.repetition_count,
      next_review_date: base.next_review_date,
      ...counters,
      scheduleChanged: false,
    };
  }

  const srs = calculateSRS(
    {
      easinessFactor: base.easiness_factor,
      intervalDays: base.interval_days,
      repetitionCount: base.repetition_count,
    },
    rating,
    now,
  );
  const level = determineMasteryTransition(
    base.mastery_level,
    rating,
    srs.repetitionCount,
    srs.intervalDays,
  );
  const scheduledDays = Math.max(1, Math.ceil(srs.intervalDays) + fuzzDays(srs.intervalDays, rand));

  return {
    mastery_level: level,
    easiness_factor: srs.easinessFactor,
    interval_days: srs.intervalDays,
    repetition_count: srs.repetitionCount,
    next_review_date: getNextReviewDate(scheduledDays, now).toISOString(),
    ...counters,
    scheduleChanged: true,
  };
}

// --- Answer grading --------------------------------------------------------

/**
 * Standard iterative Levenshtein distance with O(min(a,b)) memory.
 * Returns the minimum number of single-character edits (insert / delete
 * / substitute) needed to turn `a` into `b`.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `a` is the shorter string to keep the row buffer small.
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);

  for (let i = 0; i <= m; i++) prev[i] = i;

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,    // insertion
        prev[i] + 1,        // deletion
        prev[i - 1] + cost, // substitution
      );
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }

  return prev[m];
}

/**
 * Optimal-string-alignment distance: Levenshtein plus adjacent
 * transpositions ("recieve" → "receive" costs 1). Used for grading typed
 * answers, where swapped letters are the most common slip.
 */
export function typoDistance(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Lowercase, unify apostrophes, strip surrounding punctuation, collapse spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\- ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Typos tolerated for a target of the given length. */
export function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 7) return 1;
  return 2;
}

export type AnswerGrade = 'correct' | 'close' | 'wrong';

export interface GradeResult {
  grade: AnswerGrade;
  /** Why the answer is "close" — drives the feedback message. */
  reason?: 'typo' | 'form';
}

/**
 * Grade a typed answer against the expected answer.
 *
 * - exact match with `expected` → correct
 * - exact match with one of `alsoAccept` (e.g. the base form when the
 *   sentence needs "decided") → close / form
 * - within {@link allowedTypos} edits of any accepted answer → close / typo
 * - otherwise → wrong
 */
export function gradeTypedAnswer(
  input: string,
  expected: string,
  alsoAccept: string[] = [],
): GradeResult {
  const answer = normalizeAnswer(input);
  const target = normalizeAnswer(expected);
  if (!answer) return { grade: 'wrong' };
  if (answer === target) return { grade: 'correct' };

  const others = alsoAccept.map(normalizeAnswer).filter((w) => w && w !== target);
  if (others.includes(answer)) return { grade: 'close', reason: 'form' };

  for (const candidate of [target, ...others]) {
    if (typoDistance(answer, candidate) <= allowedTypos(candidate.length)) {
      return { grade: 'close', reason: 'typo' };
    }
  }
  return { grade: 'wrong' };
}

export type DiffOp = 'same' | 'sub' | 'ins' | 'del';

export interface DiffChar {
  /** The typed character (`same`, `sub`, `ins`) or the missing one (`del`). */
  ch: string;
  op: DiffOp;
  /** For `sub`: the character the target has here. */
  expected?: string;
}

/**
 * Character alignment of a typed word against the target (minimum edits,
 * Levenshtein). `ins` is an extra typed letter, `del` a letter the input is
 * missing. Reading `same`/`sub`/`ins` gives the input back; reading
 * `same`/`sub.expected`/`del` gives the target. Compared case-insensitively
 * after {@link normalizeAnswer}.
 */
export function spellingDiff(input: string, target: string): DiffChar[] {
  const a = [...normalizeAnswer(input)];
  const b = [...normalizeAnswer(target)];
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  const out: DiffChar[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      out.push(a[i - 1] === b[j - 1] ? { ch: a[i - 1], op: 'same' } : { ch: a[i - 1], op: 'sub', expected: b[j - 1] });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      out.push({ ch: a[i - 1], op: 'ins' });
      i--;
    } else {
      out.push({ ch: b[j - 1], op: 'del' });
      j--;
    }
  }
  return out.reverse();
}

/** Rating suggested for a spelling attempt: Tốt when exact, Khó when close, Lại otherwise. */
export function suggestedRatingForGrade(grade: AnswerGrade): ConfidenceRating {
  return grade === 'correct' ? 2 : grade === 'close' ? 1 : 0;
}

// --- Word forms ------------------------------------------------------------

/** Common irregular verbs: base → [past, past participle, ...]. */
const IRREGULAR_FORMS: Record<string, string[]> = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
  have: ['has', 'had', 'having'],
  do: ['does', 'did', 'done', 'doing'],
  go: ['goes', 'went', 'gone', 'going'],
  arise: ['arose', 'arisen'],
  bear: ['bore', 'borne', 'born'],
  become: ['became'],
  begin: ['began', 'begun'],
  bend: ['bent'],
  bind: ['bound'],
  bite: ['bit', 'bitten'],
  blow: ['blew', 'blown'],
  break: ['broke', 'broken'],
  bring: ['brought'],
  build: ['built'],
  burn: ['burnt'],
  buy: ['bought'],
  catch: ['caught'],
  choose: ['chose', 'chosen'],
  come: ['came'],
  cost: ['cost'],
  creep: ['crept'],
  cut: ['cut'],
  deal: ['dealt'],
  dig: ['dug'],
  draw: ['drew', 'drawn'],
  dream: ['dreamt'],
  drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'],
  feed: ['fed'],
  feel: ['felt'],
  fight: ['fought'],
  find: ['found'],
  flee: ['fled'],
  fly: ['flew', 'flown', 'flies'],
  forbid: ['forbade', 'forbidden'],
  forecast: ['forecast'],
  foresee: ['foresaw', 'foreseen'],
  forget: ['forgot', 'forgotten'],
  forgive: ['forgave', 'forgiven'],
  freeze: ['froze', 'frozen'],
  get: ['got', 'gotten'],
  give: ['gave', 'given'],
  grind: ['ground'],
  grow: ['grew', 'grown'],
  hang: ['hung'],
  hear: ['heard'],
  hide: ['hid', 'hidden'],
  hit: ['hit'],
  hold: ['held'],
  hurt: ['hurt'],
  keep: ['kept'],
  know: ['knew', 'known'],
  lay: ['laid'],
  lead: ['led'],
  lean: ['leant'],
  learn: ['learnt'],
  leave: ['left'],
  lend: ['lent'],
  let: ['let'],
  lie: ['lay', 'lain', 'lying'],
  light: ['lit'],
  lose: ['lost'],
  make: ['made'],
  mean: ['meant'],
  meet: ['met'],
  mislead: ['misled'],
  mistake: ['mistook', 'mistaken'],
  overcome: ['overcame'],
  overtake: ['overtook', 'overtaken'],
  pay: ['paid'],
  put: ['put'],
  quit: ['quit'],
  read: ['read'],
  ride: ['rode', 'ridden'],
  ring: ['rang', 'rung'],
  rise: ['rose', 'risen'],
  run: ['ran'],
  say: ['said'],
  see: ['saw', 'seen'],
  seek: ['sought'],
  sell: ['sold'],
  send: ['sent'],
  set: ['set'],
  shake: ['shook', 'shaken'],
  shine: ['shone'],
  shoot: ['shot'],
  show: ['shown'],
  shrink: ['shrank', 'shrunk'],
  shut: ['shut'],
  sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'],
  sit: ['sat'],
  sleep: ['slept'],
  slide: ['slid'],
  speak: ['spoke', 'spoken'],
  spend: ['spent'],
  spin: ['spun'],
  split: ['split'],
  spread: ['spread'],
  stand: ['stood'],
  steal: ['stole', 'stolen'],
  stick: ['stuck'],
  sting: ['stung'],
  strike: ['struck', 'stricken'],
  strive: ['strove', 'striven'],
  swear: ['swore', 'sworn'],
  sweep: ['swept'],
  swim: ['swam', 'swum'],
  swing: ['swung'],
  take: ['took', 'taken'],
  teach: ['taught'],
  tear: ['tore', 'torn'],
  tell: ['told'],
  think: ['thought'],
  throw: ['threw', 'thrown'],
  understand: ['understood'],
  undergo: ['underwent', 'undergone'],
  undertake: ['undertook', 'undertaken'],
  uphold: ['upheld'],
  upset: ['upset'],
  wake: ['woke', 'woken'],
  wear: ['wore', 'worn'],
  weep: ['wept'],
  win: ['won'],
  withdraw: ['withdrew', 'withdrawn'],
  withstand: ['withstood'],
  write: ['wrote', 'written'],
  // Irregular plurals
  analysis: ['analyses'],
  child: ['children'],
  crisis: ['crises'],
  criterion: ['criteria'],
  hypothesis: ['hypotheses'],
  life: ['lives'],
  man: ['men'],
  person: ['people'],
  phenomenon: ['phenomena'],
  woman: ['women'],
  // Irregular comparatives
  good: ['better', 'best'],
  bad: ['worse', 'worst'],
  far: ['farther', 'further', 'farthest', 'furthest'],
};

const VOWELS = 'aeiou';

function isConsonant(ch: string | undefined): boolean {
  return !!ch && /[a-z]/.test(ch) && !VOWELS.includes(ch);
}

/** Regular inflections of a single lowercase token (heuristic, over-generates on purpose). */
function inflectToken(token: string): string[] {
  const forms = new Set<string>([token]);
  if (token.length < 2 || !/^[a-z]+$/.test(token)) return [...forms];

  const last = token[token.length - 1];
  const prev = token[token.length - 2];

  // -s / -es
  if (/(s|x|z|ch|sh|o)$/.test(token)) forms.add(token + 'es');
  else if (last === 'y' && isConsonant(prev)) forms.add(token.slice(0, -1) + 'ies');
  else forms.add(token + 's');
  if (token.endsWith('f')) forms.add(token.slice(0, -1) + 'ves');
  if (token.endsWith('fe')) forms.add(token.slice(0, -2) + 'ves');

  // -ed / -ing / -er / -est
  if (last === 'e') {
    forms.add(token + 'd');
    forms.add(token + 'r');
    forms.add(token + 'st');
    forms.add(token.slice(0, -1) + 'ing');
    if (token.endsWith('ie')) forms.add(token.slice(0, -2) + 'ying');
  } else if (last === 'y' && isConsonant(prev)) {
    const stem = token.slice(0, -1);
    forms.add(stem + 'ied');
    forms.add(stem + 'ier');
    forms.add(stem + 'iest');
    forms.add(stem + 'ily');
    forms.add(token + 'ing');
  } else {
    forms.add(token + 'ed');
    forms.add(token + 'ing');
    forms.add(token + 'er');
    forms.add(token + 'est');
    // Consonant doubling: stop → stopped, plan → planning
    if (isConsonant(last) && !'wxy'.includes(last) && VOWELS.includes(prev) && isConsonant(token[token.length - 3])) {
      forms.add(token + last + 'ed');
      forms.add(token + last + 'ing');
      forms.add(token + last + 'er');
    }
  }

  // Adverb
  if (token.endsWith('le')) forms.add(token.slice(0, -1) + 'y');
  else if (!token.endsWith('ly')) forms.add(token + 'ly');

  for (const irregular of IRREGULAR_FORMS[token] ?? []) forms.add(irregular);
  return [...forms];
}

/**
 * All surface forms of a vocabulary entry. For phrases ("take off",
 * "give up on") only the first token is inflected.
 */
export function wordFormsOf(word: string): string[] {
  const tokens = normalizeAnswer(word).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  const [head, ...rest] = tokens;
  const tail = rest.length ? ' ' + rest.join(' ') : '';
  return inflectToken(head).map((form) => form + tail);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface WordFormMatch {
  /** Start offset in the original text. */
  index: number;
  /** Matched surface form, exactly as it appears in the text. */
  form: string;
}

/**
 * Locate `word` (or one of its inflections) in `text`. Longer forms win
 * over shorter ones so "decided" is preferred to "decide" when both fit.
 * Returns `null` when the word does not occur.
 */
export function findWordForm(text: string, word: string): WordFormMatch | null {
  if (!text || !word) return null;
  const forms = wordFormsOf(word).sort((a, b) => b.length - a.length);
  if (forms.length === 0) return null;

  const pattern = forms
    .map((f) => f.split(' ').map(escapeRegex).join('\\s+'))
    .join('|');
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'iu');
  const match = regex.exec(text);
  return match ? { index: match.index, form: match[0] } : null;
}

/**
 * Build a lookup from every surface form of every word to the original
 * word. Used to highlight vocabulary in free text such as stories.
 */
export function buildWordFormIndex(words: string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const word of words) {
    for (const form of wordFormsOf(word)) {
      if (!index.has(form)) index.set(form, word);
    }
  }
  return index;
}

// --- Misc ------------------------------------------------------------------

/** IPA from the model may or may not carry slashes — render exactly one pair. */
export function formatIpa(ipa: string): string {
  return `/${ipa.trim().replace(/^\/+|\/+$/g, '')}/`;
}

/** Fisher–Yates shuffle. Returns a new array; does not mutate `items`. */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Built-in fallback Vietnamese meanings when pool has fewer than 3 distractors. */
export const FALLBACK_MEANINGS: readonly string[] = [
  'duy trì, giữ vững',
  'phát triển, mở rộng',
  'nhận thức, hiểu biết',
  'thực hiện, tiến hành',
  'đạt được, hoàn thành',
  'quan sát, theo dõi',
  'ảnh hưởng, tác động',
  'xác định, định rõ',
  'cải thiện, nâng cao',
  'chuẩn bị, sẵn sàng',
  'giải thích, làm rõ',
  'bảo vệ, gìn giữ',
];

export interface MultipleChoiceOption {
  text: string;
  isCorrect: boolean;
}

/**
 * Generate 4 multiple-choice options for a target meaning.
 * Selects 3 distinct distractors from candidate `pool`, backfilling from
 * `FALLBACK_MEANINGS` if needed, and shuffles the resulting 4 options.
 */
export function generateMultipleChoiceOptions(
  targetMeaning: string,
  pool: ReadonlyArray<{ meaning_vi?: string | null; word?: string }>,
  rand: () => number = Math.random,
): MultipleChoiceOption[] {
  const normTarget = targetMeaning.trim().toLowerCase();
  const seen = new Set<string>([normTarget]);
  const distractors: string[] = [];

  // 1. Pick from candidate pool
  const candidatePool = shuffle(pool, rand);
  for (const item of candidatePool) {
    if (!item.meaning_vi) continue;
    const m = item.meaning_vi.trim();
    const norm = m.toLowerCase();
    if (!seen.has(norm) && m.length > 0) {
      seen.add(norm);
      distractors.push(m);
      if (distractors.length >= 3) break;
    }
  }

  // 2. Backfill from FALLBACK_MEANINGS if necessary
  if (distractors.length < 3) {
    const fallbackCandidates = shuffle(FALLBACK_MEANINGS, rand);
    for (const fb of fallbackCandidates) {
      const norm = fb.toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        distractors.push(fb);
        if (distractors.length >= 3) break;
      }
    }
  }

  const choices: MultipleChoiceOption[] = [
    { text: targetMeaning.trim(), isCorrect: true },
    ...distractors.slice(0, 3).map((d) => ({ text: d, isCorrect: false })),
  ];

  return shuffle(choices, rand);
}
