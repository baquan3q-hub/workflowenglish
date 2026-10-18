import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: Array<[string, unknown[]]> = [];
let results: Array<{ data: unknown; error: unknown }> = [];
const chain: Record<string, (...args: unknown[]) => unknown> = {};
for (const name of ['from', 'upsert', 'update', 'eq', 'in']) {
  chain[name] = (...args: unknown[]) => {
    calls.push([name, args]);
    return chain;
  };
}
chain.select = (...args: unknown[]) => {
  calls.push(['select', args]);
  return Promise.resolve(results.shift() ?? { data: [], error: null });
};
vi.mock('../supabaseClient', () => ({ supabase: { from: (...a: unknown[]) => chain.from(...a) }, withTimeout: (p: unknown) => p }));

import {
  CUE_CARDS,
  CUE_CATEGORIES,
  OREO_STEPS,
  PART1_PACKS,
  PART3_THEMES,
  STORY_BANKS,
} from '../../data/ielts/speakingTopics';
import { PRONUNCIATION_ITEMS } from '../../data/ielts/pronunciation';
import { LISTENING_TEXT_MAX } from '../../supabase/functions/ai-proxy/ops/listening.ts';
import { findLesson, LIBRARY_LESSONS, PRONUNCIATION_LESSON_PREFIX } from '../../data/ielts/library';
import {
  cardsByCategory,
  cueCardPrompt,
  cueCardQuestion,
  findShadowSet,
  oreoText,
  part1Question,
  part3Question,
  reviewWords,
  shadowingSets,
  shadowScore,
  speakClip,
  splitSentences,
  storiesForCard,
} from '../speakingStudyLogic';
import { addWordsToReview } from '../masteryService';
import { reviewMessage } from '../../components/ielts/AddToReviewButton';
import { MasteryLevel } from '../../types';

const unique = (ids: string[]) => new Set(ids).size === ids.length;
const words = (s: string) => s.trim().split(/\s+/).length;

describe('speaking topic data', () => {
  it('has unique ids across packs, cards, stories and themes', () => {
    expect(unique([...PART1_PACKS, ...CUE_CARDS, ...STORY_BANKS, ...PART3_THEMES].map((x) => x.id))).toBe(true);
    expect(unique(PRONUNCIATION_ITEMS.map((p) => p.id))).toBe(true);
  });

  it('gives every Part 1 pack questions, ideas, vocabulary and two different samples', () => {
    expect(PART1_PACKS.length).toBeGreaterThanOrEqual(8);
    for (const p of PART1_PACKS) {
      expect(p.questions.length).toBeGreaterThanOrEqual(5);
      expect(p.ideasVi.length).toBeGreaterThanOrEqual(3);
      expect(p.vocabulary.length).toBeGreaterThanOrEqual(6);
      expect(p.questions).toContain(p.sample.question);
      expect(p.sample.band6).not.toBe(p.sample.band7);
      // A band 7 Part 1 answer is longer and fuller, but still short.
      expect(words(p.sample.band7)).toBeGreaterThan(words(p.sample.band6));
      expect(words(p.sample.band7)).toBeLessThan(90);
      expect(p.sample.whyVi.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('has at least two cue cards per category, each with one note per bullet and a sample of about 1–1.5 minutes', () => {
    for (const c of CUE_CATEGORIES) expect(CUE_CARDS.filter((x) => x.category === c).length).toBeGreaterThanOrEqual(2);
    for (const card of CUE_CARDS) {
      expect(card.bullets.length).toBe(4);
      expect(card.notes.length).toBe(card.bullets.length);
      expect(card.bullets[3]).toMatch(/^and explain/);
      expect(words(card.sample)).toBeGreaterThanOrEqual(140);
      expect(words(card.sample)).toBeLessThanOrEqual(230);
      expect(card.vocabulary.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('links stories only to real cue cards, each story covering several', () => {
    const ids = new Set(CUE_CARDS.map((c) => c.id));
    for (const s of STORY_BANKS) {
      expect(s.covers.length).toBeGreaterThanOrEqual(4);
      for (const c of s.covers) if (c.cardId) expect(ids.has(c.cardId)).toBe(true);
    }
  });

  it('fills every O.R.E.O. step of every Part 3 theme', () => {
    expect(OREO_STEPS.map((s) => s.label[0]).join('')).toBe('OREO');
    for (const t of PART3_THEMES) {
      expect(t.questions).toContain(t.oreo.question);
      for (const step of OREO_STEPS) expect(t.oreo[step.key].length).toBeGreaterThan(20);
    }
  });

  it('keeps every text the TTS reads under the clip limit', () => {
    const texts = [
      ...PART1_PACKS.flatMap((p) => [p.sample.band6, p.sample.band7, ...p.vocabulary.map((v) => v.example ?? v.phrase)]),
      ...CUE_CARDS.flatMap((c) => [c.sample, ...c.vocabulary.map((v) => v.example ?? v.phrase)]),
      ...PART3_THEMES.flatMap((t) => [oreoText(t.oreo), ...t.vocabulary.map((v) => v.example ?? v.phrase)]),
      ...PRONUNCIATION_ITEMS.flatMap((p) => p.examples.map((e) => e.text)),
    ];
    for (const t of texts) expect(speakClip('x', t).text.length).toBeLessThanOrEqual(LISTENING_TEXT_MAX);
  });

  it('gives each pronunciation item tips and playable examples', () => {
    expect(PRONUNCIATION_ITEMS.map((p) => p.id)).toEqual(
      expect.arrayContaining(['final_s', 'final_td', 'ed', 'th', 'sh_s', 'word_stress', 'linking', 'intonation']),
    );
    for (const p of PRONUNCIATION_ITEMS) {
      expect(p.tipsVi.length).toBeGreaterThanOrEqual(3);
      expect(p.examples.length).toBeGreaterThanOrEqual(2);
      for (const [a, b] of p.minimalPairs ?? []) expect(a).not.toBe(b);
    }
  });
});

describe('speaking study logic', () => {
  it('splits sentences on end punctuation followed by a capital', () => {
    expect(splitSentences("It's quiet. I like it!  Do you?\nYes, Mr. Smith said so.")).toEqual([
      "It's quiet.",
      'I like it!',
      'Do you?',
      'Yes, Mr.',
      'Smith said so.',
    ]);
    expect(splitSentences('around 6.5 hours a day. Then')).toEqual(['around 6.5 hours a day.', 'Then']);
    expect(splitSentences('   ')).toEqual([]);
  });

  it('builds one shadowing set per model answer with unique clip ids', () => {
    const sets = shadowingSets();
    expect(sets.length).toBe(PART1_PACKS.length + CUE_CARDS.length + PART3_THEMES.length);
    const clipIds = sets.flatMap((s) => s.sentences.map((x) => x.clip.id));
    expect(unique(clipIds)).toBe(true);
    for (const s of sets) {
      expect(s.sentences.length).toBeGreaterThanOrEqual(3);
      for (const x of s.sentences) {
        expect(x.clip.text).toBe(x.text);
        expect(x.clip.style).toBe('uk');
      }
    }
    const oreo = findShadowSet(PART3_THEMES[0].id)!;
    expect(oreo.sentences.map((x) => x.text).join(' ')).toBe(oreoText(PART3_THEMES[0].oreo));
    expect(findShadowSet('nope')).toBeUndefined();
  });

  it('scores shadowing like dictation and labels it', () => {
    const ref = 'I walked to the station and waited for an hour.';
    const good = shadowScore(ref, 'I walked to the station and waited for an hour');
    expect(good.tone).toBe('good');
    expect(good.result.accuracy).toBe(100);
    const missingEndings = shadowScore(ref, 'I walk to the station and wait for an hour');
    expect(missingEndings.result.accuracy).toBeLessThan(100);
    expect(missingEndings.result.tokens.some((t) => t.status !== 'ok')).toBe(true);
    expect(shadowScore(ref, 'station').tone).toBe('retry');
  });

  it('groups cue cards by category in a fixed order and finds reusable stories', () => {
    const groups = cardsByCategory();
    expect(groups.map((g) => g.category)).toEqual([...CUE_CATEGORIES]);
    expect(groups.reduce((n, g) => n + g.cards.length, 0)).toBe(CUE_CARDS.length);
    expect(cardsByCategory([CUE_CARDS[0]]).length).toBe(1);
    expect(storiesForCard('cc_person_influence').map((s) => s.id)).toEqual(['story_teacher']);
    expect(storiesForCard('nope')).toEqual([]);
  });

  it('turns study content into practice questions the Speaking screen accepts', () => {
    const card = CUE_CARDS[0];
    const q2 = cueCardQuestion(card);
    expect(q2.taskOrPart).toBe('part_2');
    expect(q2.prompt).toBe(cueCardPrompt(card));
    expect(q2.prompt.split('\n')).toEqual([card.title, 'You should say:', ...card.bullets.map((b) => `- ${b}`)]);
    expect(q2.sampleAnswer).toBe(card.sample);

    const pack = PART1_PACKS[0];
    const sampleIndex = pack.questions.indexOf(pack.sample.question);
    expect(part1Question(pack, sampleIndex).sampleAnswer).toBe(pack.sample.band7);
    const other = sampleIndex === 0 ? 1 : 0;
    expect(part1Question(pack, other).sampleAnswer).toBeUndefined();
    expect(part1Question(pack, other).prompt).toBe(pack.questions[other]);

    const theme = PART3_THEMES[0];
    const q3 = part3Question(theme, theme.questions.indexOf(theme.oreo.question));
    expect(q3.taskOrPart).toBe('part_3');
    expect(q3.frameworkId).toBe('fw_oreo');
    expect(q3.sampleAnswer).toBe(oreoText(theme.oreo));
    expect(unique([q2.id, q3.id, part1Question(pack, 0).id, part1Question(pack, 1).id])).toBe(true);
  });

  it('maps topic vocabulary to review words', () => {
    expect(reviewWords([{ phrase: 'a hybrid model', meaningVi: 'mô hình kết hợp' }])).toEqual([
      { word: 'a hybrid model', meaningVi: 'mô hình kết hợp', example: undefined },
    ]);
  });
});

describe('speaking library lessons', () => {
  it('adds the story, Part 3 and pronunciation lessons', () => {
    expect(findLesson('sp_one_story')?.skill).toBe('speaking');
    expect(findLesson('sp_part3_discussion')?.skill).toBe('speaking');
    for (const p of PRONUNCIATION_ITEMS) {
      const lesson = findLesson(PRONUNCIATION_LESSON_PREFIX + p.id)!;
      expect(lesson.title).toContain(p.title);
      expect(lesson.summary.endsWith('.')).toBe(true);
    }
    expect(unique(LIBRARY_LESSONS.map((l) => l.id))).toBe(true);
  });
});

describe('addWordsToReview', () => {
  beforeEach(() => {
    calls.length = 0;
    results = [];
  });

  it('inserts new words as due LEARNING rows and promotes existing NEW ones', async () => {
    results = [
      { data: [{ word: 'a hybrid model' }], error: null },
      { data: [{ word: 'job satisfaction' }], error: null },
    ];
    const r = await addWordsToReview('u1', [
      { word: '  A Hybrid   Model ', meaningVi: 'mô hình kết hợp', example: 'An example. ' },
      { word: 'job satisfaction' },
      { word: 'become the norm' },
      { word: 'a hybrid model' },
      { word: '   ' },
    ]);
    expect(r).toEqual({ added: 2, alreadyThere: 1 });

    const upsert = calls.find(([n]) => n === 'upsert')!;
    const rows = upsert[1][0] as Array<Record<string, unknown>>;
    expect(rows.map((x) => x.word)).toEqual(['a hybrid model', 'job satisfaction', 'become the norm']);
    expect(rows[0]).toMatchObject({ user_id: 'u1', meaning_vi: 'mô hình kết hợp', example_sentence: 'An example.', mastery_level: MasteryLevel.LEARNING });
    expect(rows[1]).toMatchObject({ meaning_vi: null, example_sentence: null });
    expect(typeof rows[0].next_review_date).toBe('string');
    expect(upsert[1][1]).toEqual({ onConflict: 'user_id,word', ignoreDuplicates: true });

    expect(calls).toContainEqual(['eq', ['mastery_level', MasteryLevel.NEW]]);
    expect(calls).toContainEqual(['in', ['word', ['job satisfaction', 'become the norm']]]);
    const update = calls.find(([n]) => n === 'update')!;
    expect(update[1][0]).toMatchObject({ mastery_level: MasteryLevel.LEARNING });
    expect(update[1][0]).not.toHaveProperty('meaning_vi');
  });

  it('skips the update when every word was new, and does nothing for no words', async () => {
    results = [{ data: [{ word: 'one' }, { word: 'two' }], error: null }];
    expect(await addWordsToReview('u1', [{ word: 'one' }, { word: 'two' }])).toEqual({ added: 2, alreadyThere: 0 });
    expect(calls.some(([n]) => n === 'update')).toBe(false);

    calls.length = 0;
    expect(await addWordsToReview('u1', [{ word: ' ' }])).toEqual({ added: 0, alreadyThere: 0 });
    expect(calls).toEqual([]);
  });

  it('throws when the insert fails', async () => {
    results = [{ data: null, error: new Error('offline') }];
    await expect(addWordsToReview('u1', [{ word: 'x' }])).rejects.toThrow('offline');
  });

  it('describes the result for the learner', () => {
    expect(reviewMessage(3, 0)).toBe('Đã thêm 3 từ vào ôn tập.');
    expect(reviewMessage(2, 1)).toBe('Đã thêm 2 từ, 1 từ đã có sẵn.');
    expect(reviewMessage(0, 1)).toBe('Từ này đã có trong ôn tập.');
    expect(reviewMessage(0, 4)).toBe('Các từ này đã có trong ôn tập.');
  });
});
