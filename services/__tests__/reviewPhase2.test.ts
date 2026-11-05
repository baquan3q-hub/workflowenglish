// Vietnam time, so "today" around midnight is tested where learners are.
process.env.TZ = 'Asia/Ho_Chi_Minh';

import { describe, expect, it } from 'vitest';
import { claimedToday, claimXp, dayKey, emptyProfile, mergeProfiles, sameSynced, sanitizeProfile, todayXp, type GameProfile } from '../reviewGameLogic';
import {
  addRecentErrors,
  emptyTranslateState,
  pruneSentences,
  recordGrade,
  sanitizeTranslateState,
  type RecentError,
  type TranslationError,
} from '../writingTranslateLogic';
import {
  buildHuntItem,
  chunkRound,
  chunkSentence,
  chunksRight,
  findSpan,
  firstWrongChunk,
  fixedSentence,
  huntId,
  huntRound,
  shuffleChunks,
  tapHits,
  withOnlyMistake,
} from '../writingGamesLogic';
import { STARTER_ERRORS } from '../../data/ielts/writingErrorHunt';
import { TRANSLATION_SETS } from '../../data/ielts/writingTranslations';
import { dirFor, keyDir } from '../../components/ielts/review/SwipeCard';

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { awardXp, GARDEN_KEYS, loadGarden, loadProfile } = await import('../reviewGameService');

// 23:30 and 00:30 in Hanoi (UTC+7), on either side of the learner's midnight.
const LATE = new Date('2026-11-04T16:30:00Z');
const EARLY = new Date('2026-11-04T17:30:00Z');
const DAY = 86_400_000;

describe('local day', () => {
  it('rolls over at midnight in Vietnam, not at 7:00', () => {
    expect(dayKey(LATE)).toBe('2026-11-04');
    expect(dayKey(EARLY)).toBe('2026-11-05');
    const p = claimXp(emptyProfile(), 'a', 10, LATE).profile;
    expect(todayXp(p, LATE)).toBe(10);
    expect(todayXp(p, EARLY)).toBe(0);
  });
});

describe('XP once per item per day', () => {
  it('pays the first try today only, and again tomorrow', () => {
    const first = claimXp(emptyProfile(), 't:1', 12, LATE);
    expect(first.paid).toBe(12);
    expect(claimedToday(first.profile, 't:1', LATE)).toBe(true);
    const again = claimXp(first.profile, 't:1', 12, LATE, 4);
    expect(again.paid).toBe(0);
    expect(again.profile.totalXp).toBe(12);
    // The combo still counts for the record.
    expect(again.profile.bestCombo).toBe(4);
    const tomorrow = claimXp(again.profile, 't:1', 12, EARLY);
    expect(tomorrow.paid).toBe(12);
    // Yesterday's claims are dropped.
    expect(claimXp(tomorrow.profile, 't:2', 5, EARLY).profile.awarded).toEqual({ 't:1': '2026-11-05', 't:2': '2026-11-05' });
  });

  it('keeps only today\'s claims from storage, and only sane ones', () => {
    const p = sanitizeProfile({ totalXp: 5, awarded: { a: '2026-11-04', b: '2026-11-03', c: 4, ['x'.repeat(300)]: '2026-11-04' } }, LATE);
    expect(p.awarded).toEqual({ a: '2026-11-04' });
  });

  it('awardXp with an item pays once a day, without an item always', () => {
    store.clear();
    expect(awardXp('u', 10, 0, LATE, 'w:s/1')).toBe(10);
    expect(awardXp('u', 10, 0, LATE, 'w:s/1')).toBe(0);
    expect(awardXp('u', 5, 0, LATE)).toBe(5);
    expect(awardXp('u', 5, 0, LATE)).toBe(5);
    expect(loadProfile('u').totalXp).toBe(20);
    expect(awardXp('u', 10, 0, EARLY, 'w:s/1')).toBe(10);
  });
});

describe('profile sync merge', () => {
  const a: GameProfile = { ...emptyProfile(), totalXp: 120, bestCombo: 4, days: { '2026-11-03': 30, '2026-11-04': 20 }, best: { tfng: 80, 'paraphrase-ms': 9000 }, quiet: true, awarded: { x: '2026-11-04' } };
  const b: GameProfile = { ...emptyProfile(), totalXp: 150, bestCombo: 2, days: { '2026-11-04': 45, '2026-11-02': 10 }, best: { tfng: 60, 'paraphrase-ms': 7000, speed: 3 } };

  it('keeps the larger of everything, and the faster time', () => {
    const m = mergeProfiles(a, b);
    expect(m).toEqual({
      totalXp: 150,
      bestCombo: 4,
      days: { '2026-11-02': 10, '2026-11-03': 30, '2026-11-04': 45 },
      best: { tfng: 80, 'paraphrase-ms': 7000, speed: 3 },
      quiet: true,
      awarded: { x: '2026-11-04' },
    });
  });

  it('changes nothing when synced again', () => {
    const m = mergeProfiles(a, b);
    expect(sameSynced(mergeProfiles(m, b), m)).toBe(true);
    expect(sameSynced(mergeProfiles(m, m), m)).toBe(true);
    expect(sameSynced(a, b)).toBe(false);
    // Claims and the effects switch are not synced data.
    expect(sameSynced(a, { ...a, quiet: false, awarded: {} })).toBe(true);
  });
});

const err = (original: string, corrected: string, category: TranslationError['category'] = 'article'): TranslationError => ({ original, corrected, category, explanationVi: 'vì sao' });

describe('Writing: graded tries', () => {
  const now = new Date('2026-11-04T03:00:00Z');

  it('a retry keeps the mistakes but never moves the sentence on', () => {
    const s0 = emptyTranslateState(6.5);
    const first = recordGrade(s0, 'a/1', { score: 50, answer: 'I go school.', errors: [err('go school', 'go to school', 'preposition')] }, false, now);
    expect(first.sentences['a/1']).toMatchObject({ box: 0, last: 50 });
    const retry = recordGrade(first, 'a/1', { score: 95, answer: 'I go to school.', errors: [err('a', 'the')] }, true, now);
    expect(retry.sentences).toBe(first.sentences);
    expect(retry.errors.map((e) => e.corrected)).toEqual(['the', 'go to school']);
  });

  it('counts a sentence as mastered when its last review passes', () => {
    let s = emptyTranslateState(6.5);
    s = recordGrade(s, 'a/1', { score: 40, answer: 'x', errors: [] }, false, now);
    for (let i = 0; i < 4; i++) s = recordGrade(s, 'a/1', { score: 90, answer: 'x', errors: [] }, false, now);
    expect(s.sentences['a/1']).toMatchObject({ box: -1, due: null });
    expect(s.mastered).toBe(1);
    // Right the first time is not a review finished.
    expect(recordGrade(emptyTranslateState(6.5), 'b/1', { score: 95, answer: 'y', errors: [] }, false, now).mastered).toBe(0);
  });

  it('keeps recent mistakes new first, without repeats or empty fixes', () => {
    const list: RecentError[] = addRecentErrors([], [err('a', 'the'), err('A', 'The'), err('same', 'same'), err('x', 'y', 'meaning')], 'k', 'ans');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ original: 'a', corrected: 'the', sentence: 'k', answer: 'ans', explanationVi: 'vì sao' });
    const many = Array.from({ length: 50 }, (_, i) => err(`w${i}`, `v${i}`));
    expect(addRecentErrors(list, many, 'k', 'ans')).toHaveLength(40);
  });

  it('drops records of AI sets that are gone, never built-in ones', () => {
    const s = { ...emptyTranslateState(6.5), sentences: { 'gen-1/a': { box: 0, due: null, best: 1, last: 1, tries: 1 }, 'gen-2/a': { box: 0, due: null, best: 1, last: 1, tries: 1 }, 'core/a': { box: 0, due: null, best: 1, last: 1, tries: 1 } } } as never;
    const out = pruneSentences(s, new Set(['gen-1']), 'gen-');
    expect(Object.keys(out.sentences).sort()).toEqual(['core/a', 'gen-1/a']);
    expect(pruneSentences(out, new Set(['gen-1']), 'gen-')).toBe(out);
  });

  it('reads mastered and mistakes back from storage safely', () => {
    const s = sanitizeTranslateState({ mastered: 3.7, errors: [{ original: 'a', corrected: 'the', category: 'article', sentence: 'k', answer: 'x' }, { original: 1 }, { original: 'b', corrected: 'c', category: 'nope' }] }, 6.5);
    expect(s.mastered).toBe(3);
    expect(s.errors).toHaveLength(1);
    expect(sanitizeTranslateState({ mastered: -2, errors: 'x' }, 6.5)).toMatchObject({ mastered: 0, errors: [] });
  });
});

describe('garden: Writing', () => {
  it('flowers sentences that passed their last review, skips done ones', () => {
    store.clear();
    const now = new Date('2026-11-04T03:00:00Z');
    store.set(GARDEN_KEYS.writing + 'u', JSON.stringify({ sentences: { 's/1': { box: 1, due: new Date(now.getTime() + 2 * DAY).toISOString() }, 's/2': { box: -1, due: null } }, mastered: 2 }));
    const ids = loadGarden('u', now)
      .filter((p) => p.skill === 'writing')
      .map((p) => `${p.id}:${p.state}`)
      .sort();
    expect(ids).toEqual(['w:done:0:bloom', 'w:done:1:bloom', 'w:s/1:growing']);
  });
});

describe('swipe card input', () => {
  it('on touch only sideways swipes answer, so scrolling up does not', () => {
    expect(dirFor(0, -200, 80, true)).toBeNull();
    expect(dirFor(-120, -40, 80, true)).toBe('left');
    expect(dirFor(60, -200, 80, true)).toBeNull();
    expect(dirFor(0, -200, 80, false)).toBe('up');
  });

  const key = (k: string, extra: Partial<KeyboardEvent> = {}) => ({ key: k, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false, defaultPrevented: false, ...extra });
  const on = (inside: boolean) => ({ closest: () => (inside ? {} : null) });

  it('leaves arrow keys to tabs, fields, menus and dialogs', () => {
    expect(keyDir(key('ArrowLeft'), on(false))).toBe('left');
    expect(keyDir(key('ArrowUp'), null)).toBe('up');
    expect(keyDir(key('ArrowRight'), on(true))).toBeNull();
    expect(keyDir(key('ArrowRight', { ctrlKey: true }), on(false))).toBeNull();
    expect(keyDir(key('ArrowRight', { repeat: true }), on(false))).toBeNull();
    expect(keyDir(key('ArrowRight', { defaultPrevented: true }), on(false))).toBeNull();
    expect(keyDir(key('ArrowRight'), on(false), true)).toBeNull();
    expect(keyDir(key('Enter'), on(false))).toBeNull();
  });
});

describe('Xếp mảnh câu', () => {
  const sentences = TRANSLATION_SETS.flatMap((s) => s.paragraphs.flatMap((p) => p.sentences.map((x) => x.band7)));

  it('cuts every model sentence into 4-6 chunks that join back exactly', () => {
    expect(sentences.length).toBeGreaterThan(10);
    for (const text of sentences) {
      const chunks = chunkSentence(text);
      const words = text.trim().split(/\s+/).length;
      expect(chunks.join(' ')).toBe(text.trim().split(/\s+/).join(' '));
      expect(chunks.every((c) => c.length > 0)).toBe(true);
      if (words >= 8) expect(chunks.length).toBeGreaterThanOrEqual(4);
      expect(chunks.length).toBeLessThanOrEqual(6);
    }
  });

  it('cuts at commas and clause words when it can', () => {
    expect(chunkSentence('Although many people prefer cars, public transport is cheaper and it reduces pollution in big cities.')).toContain('public transport is cheaper');
  });

  it('never ends a chunk on a word that leads into the next', () => {
    const chunks = chunkSentence('The best approach is probably to combine the two so that learners can benefit from the strengths of each.');
    expect(chunks.slice(0, -1).some((c) => /(so|to|the|that|of|from)$/i.test(c))).toBe(false);
    expect(chunks.every((c) => c.split(' ').length >= 2)).toBe(true);
  });

  it('shuffles into an order that never reads as the answer', () => {
    const chunks = chunkSentence(sentences[0]);
    for (let seed = 0; seed < 200; seed++) {
      const order = shuffleChunks(chunks, seed);
      expect([...order].sort()).toEqual(chunks.map((_, i) => i));
      expect(chunksRight(chunks, order)).toBe(false);
    }
    // Equal chunks: still never the answer.
    expect(chunksRight(['a b', 'a b', 'c'], shuffleChunks(['a b', 'a b', 'c'], 1))).toBe(false);
  });

  it('accepts equal chunks in either place and finds the first wrong one', () => {
    const chunks = ['the cat', 'and', 'the cat'];
    expect(chunksRight(chunks, [2, 1, 0])).toBe(true);
    expect(chunksRight(chunks, [0, 1])).toBe(false);
    expect(firstWrongChunk(['a', 'b', 'c', 'd'], [0, 2, 1, 3])).toBe(1);
    expect(firstWrongChunk(['a', 'b'], [0, 1])).toBe(-1);
  });

  it('puts sentences the learner already wrote first', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k) => ({ key: k, vi: k, text: 'one two three four five six seven' }));
    const round = chunkRound(pool, new Set(['f', 'g']), 5, 3);
    expect(round).toHaveLength(5);
    expect(round.slice(0, 2).map((s) => s.key).sort()).toEqual(['f', 'g']);
    expect(chunkRound([{ key: 'x', vi: '', text: 'too short' }], new Set(), 5, 1)).toEqual([]);
  });
});

describe('Săn lỗi', () => {
  it('every starter mistake is found in its sentence', () => {
    expect(STARTER_ERRORS.length).toBeGreaterThanOrEqual(15);
    for (const s of STARTER_ERRORS) {
      const item = buildHuntItem({ ...s, answer: s.sentence }, [], 1);
      expect(item, s.id).not.toBeNull();
      expect(item!.options).toContain(s.corrected);
      expect(new Set(item!.options.map((o) => o.toLowerCase())).size).toBe(item!.options.length);
    }
    expect(new Set(STARTER_ERRORS.map((s) => huntId(s.original, s.corrected))).size).toBe(STARTER_ERRORS.length);
  });

  it('builds a card: where the mistake is, three distinct fixes, the fixed sentence', () => {
    const item = buildHuntItem({ original: 'invest on', corrected: 'invest in', category: 'preposition', answer: 'We should invest on schools.' }, [], 4)!;
    expect(item.span).toEqual([2, 4]);
    expect(tapHits(item, 2) && tapHits(item, 3) && !tapHits(item, 4)).toBe(true);
    expect(item.options).toHaveLength(3);
    expect(item.options).toEqual(expect.arrayContaining(['invest in', 'invest on']));
    expect(fixedSentence(item)).toBe('We should invest in schools.');
    expect(buildHuntItem({ original: 'nowhere', corrected: 'x', category: 'other', answer: 'A sentence.' }, [], 1)).toBeNull();
  });

  it('takes the third option from the same kind of mistake first', () => {
    const pool = [
      { original: 'x', corrected: 'more relaxed', category: 'word_form' as const, answer: '' },
      { original: 'y', corrected: 'is often', category: 'plural_agreement' as const, answer: '' },
    ];
    for (let seed = 0; seed < 20; seed++) {
      const item = buildHuntItem({ original: 'Many student', corrected: 'Many students', category: 'plural_agreement', answer: 'Many student use it.' }, pool, seed)!;
      expect(item.options).toContain('is often');
    }
  });

  it('finds a phrase by word, ignoring case and punctuation', () => {
    expect(findSpan(['Many', 'student,', 'think'], 'many student')).toEqual([0, 2]);
    expect(findSpan(['a', 'b'], '')).toBeNull();
  });

  it('fixes the other mistakes of the same answer so one is left', () => {
    const answer = 'Many student use internet every day.';
    const own: RecentError[] = [
      { original: 'Many student', corrected: 'Many students', category: 'plural_agreement', sentence: 'k', answer },
      { original: 'use internet', corrected: 'use the internet', category: 'article', sentence: 'k', answer },
    ];
    expect(withOnlyMistake(own[0], own)).toBe('Many student use the internet every day.');
    expect(withOnlyMistake(own[1], own)).toBe('Many students use internet every day.');
  });

  it('uses the learner\'s own mistakes, topped up with starters while they have few', () => {
    const own: RecentError[] = [{ original: 'go school', corrected: 'go to school', category: 'preposition', sentence: 'k', answer: 'Children go school early.' }];
    const round = huntRound(own, STARTER_ERRORS, 6, 9);
    expect(round).toHaveLength(6);
    expect(round[0].corrected).toBe('go to school');
    expect(new Set(round.map((r) => r.id)).size).toBe(6);
    const many: RecentError[] = Array.from({ length: 8 }, (_, i) => ({ original: `bad${i}`, corrected: `good${i}`, category: 'word_choice', sentence: `k${i}`, answer: `This is bad${i} here.` }));
    expect(huntRound(many, STARTER_ERRORS, 6, 2).every((r) => r.corrected.startsWith('good'))).toBe(true);
  });
});
