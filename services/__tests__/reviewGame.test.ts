import { describe, expect, it } from 'vitest';
import {
  addXp,
  answerXp,
  comboMultiplier,
  emptyProfile,
  gardenBeds,
  gardenLine,
  gardenSummary,
  levelFor,
  newRun,
  outOfHearts,
  plantFor,
  plantState,
  recordBest,
  roundBonus,
  sanitizeProfile,
  scoreAnswer,
  scoreXp,
  todayXp,
  weekXp,
  type Answer,
  type Run,
} from '../reviewGameLogic';
import { autoGoals, type AutoGoalInput } from '../dailyGoalsLogic';
import { REVIEW_DAYS } from '../readingReviewLogic';
import { PRACTICE_STAGES } from '../speakingBankLogic';
import { dirFor } from '../../components/ielts/review/SwipeCard';

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { awardXp, GARDEN_KEYS, loadGarden, loadProfile, READING_STEPS, saveBest, SPEAKING_STEPS, WRITING_STEPS } = await import('../reviewGameService');

const NOW = new Date('2026-11-04T08:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const play = (answers: Answer[], run: Run = newRun()) => answers.reduce((r, a) => scoreAnswer(r, a).run, run);

describe('XP and combo', () => {
  it('pays most for a right answer without hints, less with hints, nothing when wrong', () => {
    expect(answerXp({ correct: true }, 1)).toBe(10);
    expect(answerXp({ correct: true, hintsUsed: 1 }, 1)).toBe(7);
    expect(answerXp({ correct: true, hintsUsed: 9 }, 1)).toBe(2);
    expect(answerXp({ correct: false }, 0)).toBe(0);
  });

  it('doubles from 3 in a row and triples from 6', () => {
    expect([1, 2, 3, 5, 6, 20].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3]);
    const gains: number[] = [];
    let run = newRun();
    for (let i = 0; i < 6; i++) {
      const r = scoreAnswer(run, { correct: true });
      gains.push(r.gained);
      run = r.run;
    }
    expect(gains).toEqual([10, 10, 20, 20, 20, 30]);
    expect(run.bestCombo).toBe(6);
  });

  it('resets the combo and takes a heart on a wrong answer; a hint keeps the combo without growing it', () => {
    let run = play([{ correct: true }, { correct: true }, { correct: true, hintsUsed: 1 }]);
    expect(run.combo).toBe(2);
    run = play([{ correct: false }], run);
    expect(run).toMatchObject({ combo: 0, hearts: 2, right: 3, total: 4, bestCombo: 2 });
    run = play([{ correct: false }, { correct: false }, { correct: false }], run);
    expect(run.hearts).toBe(0);
    expect(outOfHearts(run)).toBe(true);
  });

  it('gives a bonus for hearts left and a perfect round', () => {
    expect(roundBonus(newRun())).toBe(0);
    expect(roundBonus(play([{ correct: true }]))).toBe(25);
    expect(roundBonus(play([{ correct: true }, { correct: false }]))).toBe(10);
    expect(roundBonus(play([{ correct: true }], newRun(0)))).toBe(10);
  });

  it('scores graded tries and never pays nothing for an honest try', () => {
    expect(scoreXp(92)).toBe(10);
    expect(scoreXp(75)).toBe(7);
    expect(scoreXp(30)).toBe(2);
    expect(scoreXp(92, 2)).toBe(4);
  });
});

describe('levels and profile', () => {
  it('levels at 100, 300, 600 XP', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, size: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, into: 0, size: 200 });
    expect(levelFor(650)).toEqual({ level: 4, into: 50, size: 400 });
  });

  it('counts XP per day and keeps two weeks', () => {
    let p = emptyProfile();
    p = addXp(p, 30, new Date(NOW.getTime() - 20 * DAY));
    p = addXp(p, 20, NOW, 4);
    p = addXp(p, 5, NOW);
    expect(p.totalXp).toBe(55);
    expect(todayXp(p, NOW)).toBe(25);
    expect(Object.keys(p.days)).toEqual(['2026-11-04']);
    expect(p.bestCombo).toBe(4);
    expect(weekXp(p, NOW).map((d) => d.xp)).toEqual([0, 0, 0, 0, 0, 0, 25]);
    expect(addXp(p, 0, NOW)).toBe(p);
  });

  it('keeps records, lower-is-better for times', () => {
    let { profile, record } = recordBest(emptyProfile(), 'paraphrase-ms', 40_000, true);
    expect(record).toBe(true);
    ({ profile, record } = recordBest(profile, 'paraphrase-ms', 50_000, true));
    expect(record).toBe(false);
    ({ profile, record } = recordBest(profile, 'paraphrase-ms', 30_000, true));
    expect(record).toBe(true);
    expect(profile.best['paraphrase-ms']).toBe(30_000);
  });

  it('survives a broken stored profile', () => {
    expect(sanitizeProfile('x')).toEqual(emptyProfile());
    expect(sanitizeProfile({ totalXp: -5, days: { bad: 3, '2026-11-04': 7 }, best: { a: 'x', b: 3 }, quiet: 'yes' })).toEqual({
      totalXp: 0,
      days: { '2026-11-04': 7 },
      bestCombo: 0,
      best: { b: 3 },
      quiet: false,
      awarded: {},
    });
  });
});

describe('garden', () => {
  it('grows plants with the review steps and wilts them when overdue', () => {
    expect(plantState(null, NOW)).toBe('bloom');
    expect(plantState(new Date(NOW.getTime() + DAY).toISOString(), NOW)).toBe('growing');
    expect(plantState(ago(1), NOW)).toBe('thirsty');
    expect(plantState(ago(3), NOW)).toBe('wilted');
    expect([0, 1, 2, 3].map((b) => plantFor('x', 'reading', b, 4, null, NOW).stage)).toEqual([0, 1, 2, 3]);
    expect([0, 2, 4].map((s) => plantFor('x', 'speaking', s, 5, null, NOW).stage)).toEqual([0, 2, 3]);
  });

  it('sums the beds and puts plants that need water first', () => {
    const plants = [
      plantFor('a', 'reading', 1, 4, new Date(NOW.getTime() + DAY).toISOString(), NOW),
      plantFor('b', 'writing', 0, 4, ago(5), NOW),
      plantFor('c', 'speaking', 2, 5, ago(1), NOW),
      plantFor('d', 'reading', 3, 4, null, NOW),
    ];
    const s = gardenSummary(plants);
    expect(s).toMatchObject({ total: 4, thirsty: 1, wilted: 1, bloom: 1 });
    expect(s.bySkill.reading).toEqual({ total: 2, due: 0 });
    expect(gardenBeds(plants).map((p) => p.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(gardenLine(s)).toMatch(/héo/);
    expect(gardenLine(gardenSummary([]))).toMatch(/trống/);
  });

  it('uses the same step counts as the review screens', () => {
    expect(READING_STEPS).toBe(REVIEW_DAYS.length);
    expect(WRITING_STEPS).toBe(REVIEW_DAYS.length);
    expect(SPEAKING_STEPS).toBe(PRACTICE_STAGES.length);
  });

  it('reads the decks the review screens keep', () => {
    store.clear();
    store.set(GARDEN_KEYS.reading + 'u', JSON.stringify({ cards: { 't:p:1': { key: 't:p:1', box: 1, dueAt: ago(1) } }, mastered: 2 }));
    store.set(GARDEN_KEYS.writing + 'u', JSON.stringify({ sentences: { 's/1': { box: 2, due: ago(-3) }, 's/2': { box: -1, due: null }, 's/3': { box: -1, due: null } }, mastered: 2 }));
    store.set(GARDEN_KEYS.speaking + 'u', JSON.stringify({ q1: { answer: 'I live in Hanoi.', stage: 1, dueAt: null, updatedAt: ago(4) }, q2: { answer: ' ', stage: 0 } }));
    const plants = loadGarden('u', NOW);
    expect(plants.map((p) => `${p.id}:${p.stage}:${p.state}`).sort()).toEqual(
      ['r:t:p:1:1:thirsty', 'r:done:0:3:bloom', 'r:done:1:3:bloom', 'w:s/1:2:growing', 'w:done:0:3:bloom', 'w:done:1:3:bloom', 's:q1:1:wilted'].sort(),
    );
    store.set(GARDEN_KEYS.reading + 'u', 'not json');
    expect(() => loadGarden('u', NOW)).not.toThrow();
    expect(loadGarden('', NOW)).toEqual([]);
  });

  it('saves XP and records per learner', () => {
    store.clear();
    awardXp('u', 15, 3, NOW);
    awardXp('u', 5, 0, NOW);
    expect(loadProfile('u')).toMatchObject({ totalXp: 20, bestCombo: 3 });
    expect(loadProfile('v').totalXp).toBe(0);
    expect(saveBest('u', 'tfng', 80)).toBe(true);
    expect(saveBest('u', 'tfng', 60)).toBe(false);
  });
});

describe('daily goal', () => {
  const base: AutoGoalInput = { activeLesson: null, dueCount: 0, reviewedToday: 0, dailyWordGoal: 5, wrongSentences: 0, ieltsToday: 0 };

  it('shows the XP goal only once the learner has played', () => {
    expect(autoGoals(base).some((g) => g.kind === 'game')).toBe(false);
    const goal = autoGoals({ ...base, reviewXp: { today: 60, goal: 50 } }).find((g) => g.kind === 'game')!;
    expect(goal).toMatchObject({ done: true, progress: { value: 50, max: 50 } });
  });
});

describe('swipe', () => {
  it('needs a clear move in one direction', () => {
    expect(dirFor(30, -10)).toBeNull();
    expect(dirFor(-120, 10)).toBe('left');
    expect(dirFor(120, -40)).toBe('right');
    expect(dirFor(40, -120)).toBe('up');
  });
});

