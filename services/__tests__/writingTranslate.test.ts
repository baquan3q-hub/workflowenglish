import { describe, expect, it } from 'vitest';
import { TRANSLATION_SETS } from '../../data/ielts/writingTranslations';
import { BAND_SAMPLE_SETS } from '../../data/ielts/writingSamples';
import { getWritingQuestionById } from '../ieltsWritingService';
import {
  answerProblem,
  assembledEssay,
  cappedScore,
  copiesModel,
  dueSentences,
  emptyTranslateState,
  firstLetters,
  levelFor,
  markedParts,
  nextLevel,
  sanitizeTranslateState,
  scheduleSentence,
  sentenceFrame,
  sentenceKey,
  setProgress,
  startBand,
  upgradeUnlocked,
} from '../writingTranslateLogic';
import { toTranslationSet } from '../writingTranslateService';
import { gradeTranslation, translationSetProblems } from '../../supabase/functions/ai-proxy/ops/writingTranslate';

const NOW = new Date('2026-11-04T08:00:00Z');
const DAY = 86_400_000;

describe('bundled translation sets', () => {
  it('pass the same checks as AI-written sets', () => {
    for (const set of TRANSLATION_SETS) expect(translationSetProblems(set), set.id).toEqual([]);
  });

  it('have unique ids and point at real prompts and samples', () => {
    expect(new Set(TRANSLATION_SETS.map((s) => s.id)).size).toBe(TRANSLATION_SETS.length);
    for (const set of TRANSLATION_SETS) {
      const ids = set.paragraphs.flatMap((p) => p.sentences.map((s) => s.id));
      expect(new Set(ids).size, set.id).toBe(ids.length);
      if (set.questionId) expect(getWritingQuestionById(set.questionId), set.questionId).toBeDefined();
      if (set.sampleSetId) expect(BAND_SAMPLE_SETS.some((s) => s.id === set.sampleSetId)).toBe(true);
      for (const s of set.paragraphs.flatMap((p) => p.sentences)) {
        expect(s.keys.length, `${set.id}/${s.id}`).toBeGreaterThanOrEqual(2);
        expect(s.band7, `${set.id}/${s.id}`).not.toBe(s.band6);
      }
    }
  });
});

describe('level', () => {
  it('starts one step above the goal band', () => {
    expect(startBand(null)).toBe(6);
    expect(startBand(6)).toBe(6);
    expect(startBand(7)).toBe(7);
    expect(startBand(8)).toBe(8);
  });

  it('moves up after three strong sentences and down after two weak ones', () => {
    let level = levelFor(6);
    for (let i = 0; i < 3; i++) level = nextLevel(level, { score: 90, band: 7, hintsUsed: 0 });
    expect(level.band).toBe(7);
    expect(level.upStreak).toBe(0);
    level = nextLevel(level, { score: 40, band: 5, hintsUsed: 3 });
    expect(level.band).toBe(7);
    level = nextLevel(level, { score: 40, band: 5, hintsUsed: 3 });
    expect(level.band).toBe(6);
  });

  it('does not count a strong score that leaned on hints', () => {
    let level = levelFor(6);
    for (let i = 0; i < 3; i++) level = nextLevel(level, { score: 90, band: 7, hintsUsed: 2 });
    expect(level.band).toBe(6);
  });

  it('keeps a moving band estimate and unlocks upgrade mode at 7', () => {
    let level = levelFor(6);
    level = nextLevel(level, { score: 70, band: 6, hintsUsed: 0 });
    expect(level.estimate).toBe(6);
    expect(upgradeUnlocked(level)).toBe(false);
    for (let i = 0; i < 6; i++) level = nextLevel(level, { score: 80, band: 8, hintsUsed: 0 });
    expect(level.estimate).toBeGreaterThanOrEqual(7);
    expect(upgradeUnlocked(level)).toBe(true);
  });
});

describe('hints', () => {
  it('cap the score more with each step', () => {
    expect(cappedScore(98, 0)).toBe(98);
    expect(cappedScore(98, 2)).toBe(90);
    expect(cappedScore(98, 5)).toBe(50);
    expect(cappedScore(98, 9)).toBe(50);
    expect(cappedScore(null, 3)).toBeNull();
  });

  it('show first letters and a frame of function words', () => {
    expect(firstLetters("The car's share fell to 30%.")).toBe("T__ c__'_ s____ f___ t_ 30%.");
    expect(sentenceFrame('The proportion of bus users rose from 25% to 35%.')).toBe('The ____ of ____ ____ ____ from 25% to 35%.');
  });
});

describe('answers', () => {
  it('rejects empty, too short, Vietnamese and pasted answers', () => {
    expect(answerProblem('', 'xin chào')).toMatch(/Viết/);
    expect(answerProblem('Hello there', 'x')).toMatch(/ngắn/);
    expect(answerProblem('Tôi không đồng ý với quan điểm', 'x')).toMatch(/tiếng Anh/);
    expect(answerProblem('I disagree with this view.', 'Tôi không đồng ý')).toBeNull();
    // A stray accented letter from the Vietnamese keyboard, or a place name, still gets graded.
    expect(answerProblem('The bar chart show the percentage of worker in the city, they go to work beweênt 2000 and 2020.', 'x')).toBeNull();
    expect(answerProblem('Many tourists visit Hà Nội every year.', 'x')).toBeNull();
    expect(answerProblem('Tôi nghĩ rằng education is important', 'x')).toMatch(/Tôi, nghĩ, rằng/);
    expect(copiesModel('i disagree with this view', ['I disagree with this view.'])).toBe(true);
  });

  it('splits the marked correction', () => {
    expect(markedParts('the **number** of **tourists**.')).toEqual([
      { text: 'the ', changed: false },
      { text: 'number', changed: true },
      { text: ' of ', changed: false },
      { text: 'tourists', changed: true },
      { text: '.', changed: false },
    ]);
  });
});

describe('review schedule', () => {
  it('brings a weak sentence back tomorrow and walks it through 3, 7 and 21 days', () => {
    let r = scheduleSentence(undefined, 50, 'a', NOW);
    expect(r.box).toBe(0);
    expect(Date.parse(r.due!) - NOW.getTime()).toBe(DAY);
    r = scheduleSentence(r, 90, 'b', NOW);
    expect(r.box).toBe(1);
    expect(Date.parse(r.due!) - NOW.getTime()).toBe(3 * DAY);
    r = scheduleSentence(r, 90, 'c', NOW);
    r = scheduleSentence(r, 90, 'd', NOW);
    expect(r.box).toBe(3);
    expect(Date.parse(r.due!) - NOW.getTime()).toBe(21 * DAY);
    r = scheduleSentence(r, 95, 'e', NOW);
    expect(r.due).toBeNull();
    expect(r.best).toBe(95);
    expect(r.tries).toBe(5);
  });

  it('never schedules a sentence written well the first time', () => {
    expect(scheduleSentence(undefined, 88, 'a', NOW).due).toBeNull();
  });

  it('lists due sentences and progress', () => {
    const set = TRANSLATION_SETS[0];
    const s1 = set.paragraphs[0].sentences[0];
    const s2 = set.paragraphs[0].sentences[1];
    const state = emptyTranslateState(6);
    state.sentences[sentenceKey(set.id, s1.id)] = scheduleSentence(undefined, 40, 'One answer.', new Date(NOW.getTime() - 2 * DAY));
    state.sentences[sentenceKey(set.id, s2.id)] = scheduleSentence(undefined, 92, 'Two answer.', NOW);
    const due = dueSentences(state, TRANSLATION_SETS, NOW);
    expect(due.map((d) => d.sentence.id)).toEqual([s1.id]);
    expect(setProgress(state, set)).toMatchObject({ done: 2, average: 66 });
    expect(assembledEssay(state, set)[0]).toEqual({ label: 'Mở bài', text: 'One answer. Two answer.' });
  });

  it('survives a broken stored state', () => {
    expect(sanitizeTranslateState('nope', 7).level.band).toBe(7);
    const s = sanitizeTranslateState({ level: { band: 9, estimate: 'x' }, sentences: { a: { best: 'x', due: 'bad' }, b: null } }, 6);
    expect(s.level).toEqual({ band: 6, estimate: null, upStreak: 0, downStreak: 0 });
    expect(s.sentences.a).toMatchObject({ best: 0, due: null });
    expect(s.sentences.b).toBeUndefined();
  });
});

describe('gradeTranslation op', () => {
  const payload = { vi: 'Tôi không đồng ý.', answer: 'I disagree.', models: ['I disagree.'], targetBand: '7' };

  it('needs models and mentions upgrade mode only when asked', () => {
    expect(() => gradeTranslation.build({ ...payload, models: [] })).toThrow(/models/);
    const plain = JSON.stringify(gradeTranslation.build(payload));
    expect(plain).not.toContain('UPGRADE');
    const up = JSON.stringify(gradeTranslation.build({ ...payload, upgradeFrom: 'I do not agree.' }));
    expect(up).toContain('UPGRADE');
  });

  it('keeps only real errors on a correct sentence', () => {
    const out = gradeTranslation.finalize!({
      verdict: 'correct',
      score: 120,
      band: 7.3,
      corrected: 'I disagree.',
      errors: [
        { original: 'a', corrected: 'b', category: 'tense', explanationVi: '' },
        { original: 'c', corrected: 'd', category: 'collocation', explanationVi: '' },
      ],
    }) as { score: number; band: number; errors: unknown[] };
    expect(out.score).toBe(100);
    expect(out.band).toBe(7.5);
    expect(out.errors).toHaveLength(1);
  });
});

describe('generated sets', () => {
  it('get stable sentence ids', () => {
    const set = toTranslationSet('abc', 'task_2', 'Prompt', TRANSLATION_SETS[1] as never, NOW.toISOString());
    expect(set.id).toBe('trgen_abc');
    expect(set.paragraphs[1].sentences[0].id).toBe('p2s1');
  });
});
