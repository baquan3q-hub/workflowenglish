import { describe, expect, it } from 'vitest';
import {
  afterPractice,
  bankQuestions,
  cueFrame,
  customQuestionKey,
  fadeWords,
  fallbackKeywords,
  FRAMES,
  framesFor,
  hasIdeas,
  isDue,
  keywordCoverage,
  keywordsFor,
  newSavedAnswer,
  practiceOrder,
  PRACTICE_STAGES,
  sanitizeSavedAnswer,
  soundsMemorised,
  starterFor,
  verbatimShare,
  withAnswer,
} from '../speakingBankLogic';
import { bandForTarget } from '../speakingBankService';
import { buildSpeakingAnswer, builtAnswerProblems } from '../../supabase/functions/ai-proxy/ops/speakingBank';

const NOW = new Date('2026-11-04T08:00:00Z');
const DAY = 86_400_000;
const ANSWER =
  "Yes, definitely. I'd say my hometown is a lovely place to live, mainly because the people are friendly and the street food is amazing. For instance, every weekend I grab a bowl of pho near the market with my cousins.";

const sample = () => ({ ...newSavedAnswer({ key: 'k1', part: 'part_1' as const, question: 'Do you like your hometown?', bullets: [] }, 'area', NOW), answer: ANSWER });

describe('question bank', () => {
  const questions = bankQuestions();

  it('covers all three parts with unique keys that fit the table', () => {
    expect(new Set(questions.map((q) => q.key)).size).toBe(questions.length);
    for (const part of ['part_1', 'part_2', 'part_3'] as const) expect(questions.some((q) => q.part === part)).toBe(true);
    for (const q of questions) expect(q.key.length, q.key).toBeLessThanOrEqual(120);
  });

  it('gives every Part 2 card its bullets and a sample', () => {
    for (const q of questions.filter((x) => x.part === 'part_2')) {
      expect(q.bullets.length, q.key).toBeGreaterThan(0);
      expect(q.sample?.text, q.key).toBeTruthy();
    }
  });

  it('has a sample under at least one question of each Part 1 topic', () => {
    const topics = new Set(questions.filter((q) => q.part === 'part_1').map((q) => q.topicId));
    for (const t of topics) expect(questions.some((q) => q.topicId === t && q.sample), t).toBe(true);
  });

  it('keys custom questions by their text', () => {
    expect(customQuestionKey('Do you like rain?')).toBe('custom:do_you_like_rain');
  });
});

describe('frames', () => {
  it('offer every part a frame with slots and rotating starters', () => {
    expect(framesFor('part_1').length).toBeGreaterThan(0);
    expect(framesFor('part_3').length).toBe(2);
    for (const f of FRAMES.filter((x) => x.id !== 'cue')) for (const s of f.slots) expect(s.starters.length, `${f.id}/${s.id}`).toBeGreaterThan(1);
    const slot = FRAMES[0].slots[0];
    expect(starterFor(slot, 0)).not.toBe(starterFor(slot, 1));
    expect(starterFor(slot, -1)).toBe(slot.starters[slot.starters.length - 1]);
  });

  it('make one slot per cue-card bullet', () => {
    const f = cueFrame(['who it is', 'how you know them', 'and why you admire them']);
    expect(f.slots.map((s) => s.label)).toEqual(['who it is', 'how you know them', 'why you admire them']);
  });

  it('need at least one idea', () => {
    expect(hasIdeas([{ slot: 'a', text: '  ' }], '')).toBe(false);
    expect(hasIdeas([], 'đi chợ với mẹ')).toBe(true);
  });
});

describe('practice ladder', () => {
  it('fades every other content word and keeps function words', () => {
    const faded = fadeWords('I really love the street food in my hometown');
    expect(faded).toContain('the');
    expect(faded).toMatch(/_/);
    expect(faded.split(' ')).toHaveLength(9);
    expect(fadeWords('street food', 1)).not.toBe(fadeWords('street food', 0));
  });

  it('counts covered keywords loosely', () => {
    const c = keywordCoverage('I love eating noodles with my cousin', ['eat noodles', 'cousins', 'market']);
    expect(c.hit).toEqual(['eat noodles', 'cousins']);
    expect(c.missed).toEqual(['market']);
  });

  it('flags a word-for-word answer only from the keyword stage on', () => {
    const share = verbatimShare(ANSWER, ANSWER);
    expect(share).toBe(1);
    expect(soundsMemorised(0, share)).toBe(false);
    expect(soundsMemorised(2, share)).toBe(true);
    expect(verbatimShare('My hometown is nice because people there are kind to visitors', ANSWER)).toBeLessThan(0.3);
  });

  it('moves up the ladder and spaces reviews out', () => {
    let s = sample();
    expect(isDue(s, NOW)).toBe(true);
    s = afterPractice(s, 'good', NOW);
    expect(s.stage).toBe(1);
    expect(Date.parse(s.dueAt!) - NOW.getTime()).toBe(2 * DAY);
    s = afterPractice(s, 'easy', NOW);
    expect(s.stage).toBe(3);
    s = afterPractice(s, 'again', NOW);
    expect(s.stage).toBe(3);
    expect(Date.parse(s.dueAt!) - NOW.getTime()).toBe(DAY);
    for (let i = 0; i < 5; i++) s = afterPractice(s, 'easy', NOW);
    expect(s.stage).toBe(PRACTICE_STAGES.length - 1);
    expect(s.practiceCount).toBe(8);
    expect(isDue(s, NOW)).toBe(false);
  });

  it('puts due answers first', () => {
    const a = { ...sample(), key: 'a', dueAt: new Date(NOW.getTime() + DAY).toISOString() };
    const b = { ...sample(), key: 'b', dueAt: new Date(NOW.getTime() - DAY).toISOString() };
    const c = { ...sample(), key: 'c', answer: '' };
    expect(practiceOrder([a, b, c], NOW).map((s) => s.key)[0]).toBe('b');
    expect(isDue(c, NOW)).toBe(false);
  });
});

describe('saved answers', () => {
  it('keep the earlier answer as a version', () => {
    const s = withAnswer(sample(), 'A new answer.', NOW);
    expect(s.versions[0].answer).toBe(ANSWER);
    expect(withAnswer(s, ' A new answer. ', NOW)).toBe(s);
  });

  it('fall back to keywords from the answer when the learner rewrote it', () => {
    const s = { ...sample(), built: { answer: 'x', answerVi: '', keywords: ['airport', 'delayed flight', 'stranger'], moves: [], vocabulary: [], followUps: [], tipVi: '' } };
    expect(keywordsFor(s)).toEqual(fallbackKeywords(ANSWER));
    expect(fallbackKeywords(ANSWER)).toContain('hometown');
    const same = { ...s, built: { ...s.built, keywords: ['hometown', 'friendly people', 'street food'] } };
    expect(keywordsFor(same)).toEqual(['hometown', 'friendly people', 'street food']);
  });

  it('survive broken stored rows', () => {
    expect(sanitizeSavedAnswer(null)).toBeNull();
    expect(sanitizeSavedAnswer({ key: 'a', question: 'q', part: 'part_9' })).toBeNull();
    const s = sanitizeSavedAnswer({ key: 'a', question: 'q', part: 'part_2', stage: 99, dueAt: 'bad', ideas: [{ slot: 'x', text: 'y' }, 3], built: { answer: 'hi', keywords: [1, 'k'] } });
    expect(s).toMatchObject({ stage: PRACTICE_STAGES.length - 1, dueAt: null, ideas: [{ slot: 'x', text: 'y' }] });
    expect(s?.built?.keywords).toEqual(['k']);
  });
});

describe('buildSpeakingAnswer op', () => {
  it('needs ideas and sends the frame and the bullets', () => {
    expect(() => buildSpeakingAnswer.build({ question: 'Q?', ideas: [] })).toThrow(/ideas/);
    const body = JSON.stringify(buildSpeakingAnswer.build({ part: 'part_2', question: 'Describe a person', bullets: ['who'], frame: 'PPF', ideas: [{ slot: 'Giới thiệu', text: 'bà tôi' }] }));
    expect(body).toContain('PPF');
    expect(body).toContain('bà tôi');
  });

  it('rejects answers of the wrong length', () => {
    expect(builtAnswerProblems({ answer: 'Too short.', keywords: ['a', 'b', 'c'] }, 'part_1')).not.toEqual([]);
    expect(builtAnswerProblems({ answer: ANSWER + ' ' + 'And I really enjoy it there.', keywords: ['a', 'b', 'c'] }, 'part_1')).toEqual([]);
  });

  it('asks for the goal band within range', () => {
    expect(bandForTarget(null)).toBe('6.5');
    expect(bandForTarget(9)).toBe('8');
    expect(bandForTarget(6.3)).toBe('6.5');
    expect(bandForTarget(5)).toBe('5.5');
  });
});
