/**
 * Reading review ("Ôn tập Reading"), all on the device and built from the
 * passages the app already has:
 * - TRUE / FALSE / NOT GIVEN sorting, one statement and its paragraph at a time;
 * - matching the question's wording to how the passage says it (paraphrase);
 * - a speed reader (chunks at a set pace, or self-paced with a clock) and a
 *   "which paragraph?" check after it;
 * - spaced review of questions missed in tests, at 1, 3, 7 and 21 days, where
 *   the learner finds the sentence that holds the answer before seeing it.
 */
import { getReadingTest, READING_TESTS, type ReadingGroup, type ReadingParagraph, type ReadingPassage, type ReadingQuestion, type ReadingTest } from '../data/ielts/reading';
import { gradePassage, normalizeTfng, sessionPassages, type ReadingAttemptDetails } from './readingLogic';
import { findPhrase } from './readingReview';
import { shuffle } from './reviewLogic';

const DAY = 86_400_000;

/** The same order for the same seed, so a round does not reshuffle on every render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// --- Questions -----------------------------------------------------------------

export interface LocatedQuestion {
  key: string;
  test: ReadingTest;
  passage: ReadingPassage;
  group: ReadingGroup;
  question: ReadingQuestion;
}

export const questionKey = (testId: string, passageId: string, number: number) => `${testId}:${passageId}:${number}`;

export function allQuestions(tests: readonly ReadingTest[] = READING_TESTS): LocatedQuestion[] {
  return tests.flatMap((test) =>
    test.passages.flatMap((passage) =>
      passage.groups.flatMap((group) => group.questions.map((question) => ({ key: questionKey(test.id, passage.id, question.number), test, passage, group, question }))),
    ),
  );
}

/** A question by its key, in the bundled tests or in a loaded library test. */
export function findQuestion(key: string, lookup: (id: string) => ReadingTest | undefined = getReadingTest): LocatedQuestion | undefined {
  const [testId, passageId, n] = key.split(':');
  const test = lookup(testId);
  const passage = test?.passages.find((p) => p.id === passageId);
  if (!test || !passage) return undefined;
  for (const group of passage.groups) {
    const question = group.questions.find((q) => q.number === Number(n));
    if (question) return { key, test, passage, group, question };
  }
  return undefined;
}

export const paragraphOf = (passage: ReadingPassage, label: string): ReadingParagraph | undefined => passage.paragraphs.find((p) => p.label === label);

// --- TRUE / FALSE / NOT GIVEN ----------------------------------------------------

export type TfngValue = 'TRUE' | 'FALSE' | 'NOT GIVEN' | 'YES' | 'NO';

export interface TfngItem {
  key: string;
  variant: 'tfng' | 'ynng';
  statement: string;
  answer: TfngValue;
  paragraph: ReadingParagraph;
  evidence: string;
  explanationVi: string;
  passageTitle: string;
}

export function tfngPool(tests: readonly ReadingTest[] = READING_TESTS): TfngItem[] {
  return allQuestions(tests).flatMap(({ key, passage, group, question }) => {
    if (group.type !== 'tfng' || !question.prompt) return [];
    const paragraph = paragraphOf(passage, question.paragraph);
    if (!paragraph) return [];
    return [
      {
        key,
        variant: group.variant,
        statement: question.prompt,
        answer: normalizeTfng(question.answers[0]) as TfngValue,
        paragraph,
        evidence: question.evidence,
        explanationVi: question.explanationVi,
        passageTitle: passage.title,
      },
    ];
  });
}

export const tfngChoices = (variant: TfngItem['variant']): TfngValue[] => (variant === 'ynng' ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN']);

/** What the learner's mistake was, in the words a teacher would use. */
export function tfngMistakeVi(given: TfngValue, answer: TfngValue): string {
  if (given === answer) return '';
  if (answer === 'NOT GIVEN') return 'Bài không nói tới điều này: đừng suy luận thêm. Có chữ giống nhau chưa chắc là cùng ý.';
  if (given === 'NOT GIVEN') return answer === 'FALSE' || answer === 'NO' ? 'Bài có nói, và nói ngược lại: tìm từ trái nghĩa hoặc con số khác.' : 'Bài có nói cùng ý này, chỉ bằng từ khác.';
  return 'Đọc lại từ chỉ mức độ (all, some, only, always…): một chữ đó đổi đúng thành sai.';
}

/** A round: statements due for review first, the rest shuffled, NOT GIVEN neither missing nor flooding. */
export function tfngRound(pool: readonly TfngItem[], weak: ReadonlySet<string>, size = 8, seed = 1): TfngItem[] {
  const rand = seededRandom(seed);
  const first = shuffle(
    pool.filter((i) => weak.has(i.key)),
    rand,
  );
  const rest = shuffle(
    pool.filter((i) => !weak.has(i.key)),
    rand,
  );
  const round = [...first, ...rest].slice(0, size);
  if (round.length >= 3 && !round.some((i) => i.answer === 'NOT GIVEN')) {
    const ng = rest.find((i) => i.answer === 'NOT GIVEN' && !round.includes(i));
    if (ng) round[round.length - 1] = ng;
  }
  return shuffle(round, rand);
}

// --- Paraphrase ----------------------------------------------------------------

export interface ParaphrasePair {
  key: string;
  question: string;
  passage: string;
  passageTitle: string;
}

export function paraphrasePairs(tests: readonly ReadingTest[] = READING_TESTS): ParaphrasePair[] {
  const seen = new Set<string>();
  return allQuestions(tests).flatMap(({ key, passage, question }) => {
    const p = question.paraphrase;
    if (!p?.question.trim() || !p.passage.trim() || norm(p.question) === norm(p.passage)) return [];
    const id = norm(p.passage);
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ key, question: p.question.trim(), passage: p.passage.trim(), passageTitle: passage.title }];
  });
}

export interface ParaphraseRound {
  pairs: ParaphrasePair[];
  /** The passage phrases in a different order from the questions. */
  right: ParaphrasePair[];
}

export function paraphraseRound(pool: readonly ParaphrasePair[], size = 5, seed = 1): ParaphraseRound {
  const rand = seededRandom(seed);
  const pairs = shuffle(pool, rand).slice(0, size);
  let right = shuffle(pairs, rand);
  if (pairs.length > 1 && right.every((r, i) => r === pairs[i])) right = [...right.slice(1), right[0]];
  return { pairs, right };
}

// --- Speed reading -------------------------------------------------------------

export const WPM_OPTIONS = [150, 200, 250, 300] as const;
/** About what a band-7 reader needs: three passages, 2,700 words, 60 minutes with the questions. */
export const TARGET_WPM = 250;

/** Words in groups of `size`, never across a paragraph. */
export function chunkPassage(paragraphs: readonly ReadingParagraph[], size = 3): { paragraph: string; text: string }[] {
  return paragraphs.flatMap((p) => {
    const words = p.text.split(/\s+/).filter(Boolean);
    const out: { paragraph: string; text: string }[] = [];
    for (let i = 0; i < words.length; i += size) out.push({ paragraph: p.label, text: words.slice(i, i + size).join(' ') });
    return out;
  });
}

/** How long a chunk stays up: its words at the pace, a little longer at the end of a sentence. */
export function chunkDelayMs(chunk: string, wpm: number): number {
  const words = chunk.split(/\s+/).filter(Boolean).length;
  const base = (words * 60_000) / Math.max(60, wpm);
  return Math.round(/[.!?;:]["')]?$/.test(chunk) ? base * 1.4 : base);
}

export const wordsPerMinute = (words: number, seconds: number) => (seconds > 0 ? Math.round((words * 60) / seconds) : 0);

export function paceVi(wpm: number): string {
  if (wpm >= 300) return 'Rất nhanh: nhớ đọc kỹ lại câu chứa đáp án.';
  if (wpm >= TARGET_WPM) return 'Đủ nhanh cho đề thật.';
  if (wpm >= 180) return 'Khá: luyện thêm để kịp làm câu hỏi trong 60 phút.';
  return 'Còn chậm: đọc theo cụm 3 từ, đừng đọc lại từng chữ.';
}

export interface LocateItem {
  key: string;
  prompt: string;
  answer: string;
}

/** "Which paragraph says…?" questions on a passage, from its questions' paraphrases. */
export function locateQuiz(passage: ReadingPassage, testId: string, count = 3, seed = 1): LocateItem[] {
  const labels = new Set(passage.paragraphs.map((p) => p.label));
  const seen = new Set<string>();
  const items = passage.groups.flatMap((group) =>
    group.type === 'headings'
      ? []
      : group.questions.flatMap((q) => {
          const prompt = (q.paraphrase?.question || q.prompt || '').trim();
          if (!prompt || prompt.includes('{{') || !labels.has(q.paragraph) || seen.has(norm(prompt))) return [];
          seen.add(norm(prompt));
          return [{ key: questionKey(testId, passage.id, q.number), prompt, answer: q.paragraph }];
        }),
  );
  const rand = seededRandom(seed);
  const picked: LocateItem[] = [];
  // Different paragraphs first, so the answers are not all "B".
  for (const item of shuffle(items, rand)) if (picked.length < count && !picked.some((p) => p.answer === item.answer)) picked.push(item);
  for (const item of items) if (picked.length < count && !picked.includes(item)) picked.push(item);
  return picked;
}

// --- Finding the sentence -------------------------------------------------------

export interface Sentence {
  text: string;
  start: number;
}

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?]+(?:[.!?]+["')\]]?|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!m[0].trim()) {
      if (re.lastIndex >= text.length) break;
      continue;
    }
    const lead = m[0].length - m[0].trimStart().length;
    const sentence = { text: m[0].trim(), start: m.index + lead };
    // "e.g." and "Dr." do not end a sentence: join a piece that starts lower-case.
    const prev = out[out.length - 1];
    if (prev && /^[a-z0-9]/.test(sentence.text)) prev.text = text.slice(prev.start, sentence.start + sentence.text.length);
    else out.push(sentence);
  }
  return out;
}

const contentWords = (s: string) => new Set(norm(s).match(/[a-z0-9']{4,}/g) ?? []);

/** Indexes of the sentences that hold the evidence (or, if it is reworded, share most words with it). */
export function evidenceSentences(text: string, evidence: string): number[] {
  const sentences = splitSentences(text);
  const ev = evidence.trim();
  if (!sentences.length || !ev) return [];
  const range = findPhrase(text, ev);
  if (range) {
    const [at, end] = range;
    return sentences.flatMap((s, i) => (s.start < end && s.start + s.text.length > at ? [i] : []));
  }
  const want = contentWords(ev);
  let best = -1;
  let bestScore = 0;
  sentences.forEach((s, i) => {
    let score = 0;
    for (const w of contentWords(s.text)) if (want.has(w)) score++;
    if (score > bestScore) [best, bestScore] = [i, score];
  });
  return best >= 0 ? [best] : [];
}

// --- Spaced review of missed questions --------------------------------------------

/** Days until the next review after each success; after the last one the card is done. */
export const REVIEW_DAYS = [1, 3, 7, 21] as const;

export interface ReviewCard {
  key: string;
  /** Successful reviews in a row (0 = new or just missed). */
  box: number;
  dueAt: string;
  lapses: number;
  addedAt: string;
}

export interface ReviewDeck {
  cards: Record<string, ReviewCard>;
  /** Attempts whose misses were added already. */
  seenAttempts: string[];
  /** Cards finished after 21 days, counted for the learner's pride. */
  mastered: number;
}

export const emptyDeck = (): ReviewDeck => ({ cards: {}, seenAttempts: [], mastered: 0 });

const isoOr = (v: unknown, fallback: string) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fallback);

export function sanitizeDeck(raw: unknown): ReviewDeck {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReviewDeck>;
  const cards: Record<string, ReviewCard> = {};
  const epoch = new Date(0).toISOString();
  for (const c of Object.values(o.cards && typeof o.cards === 'object' ? o.cards : {}) as Partial<ReviewCard>[]) {
    if (!c || typeof c.key !== 'string' || !c.key.includes(':')) continue;
    cards[c.key] = {
      key: c.key,
      box: Math.min(REVIEW_DAYS.length - 1, Math.max(0, Math.floor(Number(c.box) || 0))),
      dueAt: isoOr(c.dueAt, epoch),
      lapses: Math.max(0, Math.floor(Number(c.lapses) || 0)),
      addedAt: isoOr(c.addedAt, epoch),
    };
  }
  return {
    cards,
    seenAttempts: Array.isArray(o.seenAttempts) ? o.seenAttempts.filter((s): s is string => typeof s === 'string').slice(-200) : [],
    mastered: Math.max(0, Math.floor(Number(o.mastered) || 0)),
  };
}

/** Missed questions go in due now; one missed again starts over. */
export function addMisses(deck: ReviewDeck, keys: readonly string[], now: Date): ReviewDeck {
  if (!keys.length) return deck;
  const cards = { ...deck.cards };
  const at = now.toISOString();
  for (const key of keys) {
    const old = cards[key];
    cards[key] = old ? { ...old, box: 0, dueAt: at, lapses: old.lapses + 1 } : { key, box: 0, dueAt: at, lapses: 0, addedAt: at };
  }
  return { ...deck, cards };
}

/** Keys of the questions an attempt got wrong or left blank. */
export function attemptMisses(details: ReadingAttemptDetails, lookup: (id: string) => ReadingTest | undefined = getReadingTest): string[] {
  const test = lookup(details.testId);
  if (!test) return [];
  return sessionPassages(test, details.passageIds).flatMap((passage) =>
    gradePassage(passage, details.answers)
      .filter((r) => r.status !== 'correct')
      .map((r) => questionKey(test.id, passage.id, r.number)),
  );
}

export interface AttemptLike {
  id?: string;
  details?: unknown;
}

/** Adds the misses of attempts not seen before; `isDetails` checks each attempt's details. */
export function syncAttempts(
  deck: ReviewDeck,
  attempts: readonly AttemptLike[],
  isDetails: (d: unknown) => d is ReadingAttemptDetails,
  now: Date,
  lookup: (id: string) => ReadingTest | undefined = getReadingTest,
): ReviewDeck {
  const seen = new Set(deck.seenAttempts);
  const fresh = attempts.filter((a) => a.id && !seen.has(a.id) && isDetails(a.details));
  if (!fresh.length) return deck;
  // Older attempts first, so a question missed in the newest attempt keeps that miss.
  const misses = [...fresh].reverse().flatMap((a) => attemptMisses(a.details as ReadingAttemptDetails, lookup).filter((k) => !deck.cards[k]));
  const next = addMisses(deck, [...new Set(misses)], now);
  return { ...next, seenAttempts: [...deck.seenAttempts, ...fresh.map((a) => a.id as string)].slice(-200) };
}

/** After a review: "again" starts the card over tomorrow; "good" moves it to the next interval or retires it. */
export function reviewCard(deck: ReviewDeck, key: string, result: 'again' | 'good', now: Date): ReviewDeck {
  const card = deck.cards[key];
  if (!card) return deck;
  const cards = { ...deck.cards };
  if (result === 'again') {
    cards[key] = { ...card, box: 0, lapses: card.lapses + 1, dueAt: new Date(now.getTime() + DAY).toISOString() };
    return { ...deck, cards };
  }
  if (card.box >= REVIEW_DAYS.length - 1) {
    delete cards[key];
    return { ...deck, cards, mastered: deck.mastered + 1 };
  }
  cards[key] = { ...card, box: card.box + 1, dueAt: new Date(now.getTime() + REVIEW_DAYS[card.box] * DAY).toISOString() };
  return { ...deck, cards };
}

export const isCardDue = (card: ReviewCard, now: Date) => Date.parse(card.dueAt) <= now.getTime();

/** Due cards whose question still exists, the longest-waiting first. */
export function dueCards(deck: ReviewDeck, now: Date, exists: (key: string) => boolean = (k) => !!findQuestion(k)): ReviewCard[] {
  return Object.values(deck.cards)
    .filter((c) => isCardDue(c, now) && exists(c.key))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

/** When the next card comes due, for "Hết bài đến hạn — lần tới: …". */
export function nextDue(deck: ReviewDeck, now: Date): Date | null {
  const later = Object.values(deck.cards)
    .map((c) => Date.parse(c.dueAt))
    .filter((t) => t > now.getTime());
  return later.length ? new Date(Math.min(...later)) : null;
}
