import { describe, expect, it } from 'vitest';
import { READING_TESTS, getReadingTest } from '../../data/ielts/reading';
import { isReadingDetails, passageQuestions } from '../readingLogic';
import {
  addMisses,
  allQuestions,
  attemptMisses,
  chunkDelayMs,
  chunkPassage,
  dueCards,
  emptyDeck,
  evidenceSentences,
  findQuestion,
  locateQuiz,
  nextDue,
  paraphrasePairs,
  paraphraseRound,
  REVIEW_DAYS,
  reviewCard,
  sanitizeDeck,
  splitSentences,
  syncAttempts,
  tfngChoices,
  tfngMistakeVi,
  tfngPool,
  tfngRound,
  wordsPerMinute,
} from '../readingReviewLogic';

const NOW = new Date('2026-11-04T08:00:00Z');
const DAY = 86_400_000;

describe('question pools', () => {
  it('finds every bundled question by its key', () => {
    const all = allQuestions();
    expect(all.length).toBe(READING_TESTS.reduce((n, t) => n + t.passages.reduce((m, p) => m + passageQuestions(p).length, 0), 0));
    for (const q of all.slice(0, 50)) expect(findQuestion(q.key)?.question).toBe(q.question);
    expect(findQuestion('nope:x:1')).toBeUndefined();
  });

  it('builds TFNG statements with their paragraph and normalised answers', () => {
    const pool = tfngPool();
    expect(pool.length).toBeGreaterThan(10);
    for (const item of pool) {
      expect(tfngChoices(item.variant)).toContain(item.answer);
      expect(item.paragraph.text.length).toBeGreaterThan(0);
    }
  });

  it('puts weak statements first and keeps a NOT GIVEN in the round', () => {
    const pool = tfngPool();
    const weak = new Set([pool[3].key, pool[7].key]);
    const round = tfngRound(pool, weak, 6, 42);
    expect(round).toHaveLength(6);
    expect(round.map((i) => i.key)).toEqual(expect.arrayContaining([...weak]));
    expect(round.some((i) => i.answer === 'NOT GIVEN')).toBe(true);
    expect(tfngRound(pool, weak, 6, 42).map((i) => i.key)).toEqual(round.map((i) => i.key));
  });

  it('explains the usual TFNG mistakes', () => {
    expect(tfngMistakeVi('TRUE', 'TRUE')).toBe('');
    expect(tfngMistakeVi('FALSE', 'NOT GIVEN')).toMatch(/không nói/);
    expect(tfngMistakeVi('NOT GIVEN', 'FALSE')).toMatch(/ngược/);
  });

  it('pairs question wording with distinct passage wording, shuffled', () => {
    const pairs = paraphrasePairs();
    expect(pairs.length).toBeGreaterThan(10);
    expect(new Set(pairs.map((p) => p.passage.toLowerCase())).size).toBe(pairs.length);
    const round = paraphraseRound(pairs, 5, 7);
    expect(round.pairs).toHaveLength(5);
    expect(new Set(round.right)).toEqual(new Set(round.pairs));
    expect(round.right.some((r, i) => r !== round.pairs[i])).toBe(true);
  });
});

describe('speed reading', () => {
  const passage = READING_TESTS[0].passages[0];

  it('chunks words without crossing paragraphs', () => {
    const chunks = chunkPassage(passage.paragraphs, 3);
    expect(chunks.every((c) => c.text.split(' ').length <= 3)).toBe(true);
    expect(chunks.map((c) => c.text).join(' ').split(' ').length).toBe(passage.paragraphs.map((p) => p.text).join(' ').split(/\s+/).length);
  });

  it('paces chunks and lingers on sentence ends', () => {
    expect(chunkDelayMs('one two three', 180)).toBe(1000);
    expect(chunkDelayMs('one two three.', 180)).toBe(1400);
    expect(wordsPerMinute(500, 120)).toBe(250);
    expect(wordsPerMinute(500, 0)).toBe(0);
  });

  it('asks which paragraph, spreading the answers', () => {
    const quiz = locateQuiz(passage, READING_TESTS[0].id, 3, 3);
    expect(quiz.length).toBe(3);
    const labels = passage.paragraphs.map((p) => p.label);
    for (const q of quiz) expect(labels).toContain(q.answer);
    expect(new Set(quiz.map((q) => q.answer)).size).toBeGreaterThan(1);
  });
});

describe('finding the sentence', () => {
  const text = 'Bees fly far. Some travel 5 km, e.g. in summer. Others stay near the hive!';

  it('splits sentences and keeps "e.g." inside one', () => {
    expect(splitSentences(text).map((s) => s.text)).toEqual(['Bees fly far.', 'Some travel 5 km, e.g. in summer.', 'Others stay near the hive!']);
    for (const s of splitSentences(text)) expect(text.slice(s.start, s.start + s.text.length)).toBe(s.text);
  });

  it('finds the evidence, quoted or reworded', () => {
    expect(evidenceSentences(text, 'travel 5 km')).toEqual([1]);
    expect(evidenceSentences(text, 'far. Some travel')).toEqual([0, 1]);
    expect(evidenceSentences(text, 'others remaining near hives')).toEqual([2]);
  });

  it('finds the evidence of every bundled question', () => {
    for (const { key, passage, question } of allQuestions()) {
      const p = passage.paragraphs.find((x) => x.label === question.paragraph);
      if (!p || !question.evidence) continue;
      expect(evidenceSentences(p.text, question.evidence).length, key).toBeGreaterThan(0);
    }
  });
});

describe('review deck', () => {
  const [a, b] = allQuestions().map((q) => q.key);

  it('spaces reviews at 1, 3, 7 and 21 days, then retires the card', () => {
    let deck = addMisses(emptyDeck(), [a], NOW);
    expect(dueCards(deck, NOW).map((c) => c.key)).toEqual([a]);
    for (const days of REVIEW_DAYS) {
      deck = reviewCard(deck, a, 'good', NOW);
      if (deck.cards[a]) expect(Date.parse(deck.cards[a].dueAt) - NOW.getTime()).toBe(days * DAY);
    }
    expect(deck.cards[a]).toBeUndefined();
    expect(deck.mastered).toBe(1);
  });

  it('starts a missed card over tomorrow', () => {
    let deck = addMisses(emptyDeck(), [a, b], NOW);
    deck = reviewCard(reviewCard(deck, a, 'good', NOW), a, 'again', NOW);
    expect(deck.cards[a]).toMatchObject({ box: 0, lapses: 1 });
    expect(dueCards(deck, NOW).map((c) => c.key)).toEqual([b]);
    expect(nextDue(deck, NOW)?.getTime()).toBe(NOW.getTime() + DAY);
    expect(addMisses(deck, [a], NOW).cards[a]).toMatchObject({ box: 0, lapses: 2, dueAt: NOW.toISOString() });
  });

  it('adds the misses of each attempt once', () => {
    const test = READING_TESTS[0];
    const passage = test.passages[0];
    const first = passageQuestions(passage)[0];
    const answers = { [first.number]: first.answers[0] };
    const details = { testId: test.id, passageIds: [passage.id], mode: 'practice' as const, answers, score: 1, total: 13, seconds: {} };
    const misses = attemptMisses(details, getReadingTest);
    expect(misses).toHaveLength(passageQuestions(passage).length - 1);
    expect(misses).not.toContain(`${test.id}:${passage.id}:${first.number}`);
    const deck = syncAttempts(emptyDeck(), [{ id: 'att1', details }, { id: 'bad', details: { nope: 1 } }], isReadingDetails, NOW);
    expect(Object.keys(deck.cards)).toHaveLength(misses.length);
    expect(deck.seenAttempts).toEqual(['att1']);
    expect(syncAttempts(deck, [{ id: 'att1', details }], isReadingDetails, NOW)).toBe(deck);
  });

  it('survives broken stored data', () => {
    expect(sanitizeDeck(null)).toEqual(emptyDeck());
    const d = sanitizeDeck({ cards: { x: { key: 'a:b:1', box: 99, dueAt: 'bad' }, y: { key: 3 } }, seenAttempts: ['a', 2], mastered: -1 });
    expect(Object.keys(d.cards)).toEqual(['a:b:1']);
    expect(d.cards['a:b:1']).toMatchObject({ box: REVIEW_DAYS.length - 1, dueAt: new Date(0).toISOString() });
    expect(d.seenAttempts).toEqual(['a']);
    expect(d.mastered).toBe(0);
  });
});
