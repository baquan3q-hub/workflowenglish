import { describe, it, expect } from 'vitest';
import {
  attemptUnits,
  bandGap,
  criterionAction,
  criterionScoresOf,
  criterionTrends,
  daysUntil,
  nextAction,
  overallBand,
  overallNote,
  PRACTISED_SKILLS,
  SKILL_CRITERIA,
  skillProgress,
  weakestCriterion,
  weeklyProgress,
  weekStart,
  WEEKLY_GOALS,
} from '../ieltsProgressLogic';
import { descriptorBand, findDescriptor, CRITERION_DESCRIPTORS, DESCRIPTOR_BANDS } from '../../data/ielts/bandDescriptors';
import { findLesson, LIBRARY_LESSONS, searchLessons } from '../../data/ielts/library';
import { AppPhase, type IeltsAttempt } from '../../types';

describe('overallBand', () => {
  it('rounds the mean the IELTS way', () => {
    expect(overallBand([6.5, 6, 5.5, 6])).toBe(6); // 6.0
    expect(overallBand([6.5, 6, 6, 6])).toBe(6); // 6.125
    expect(overallBand([6.5, 6.5, 6, 6])).toBe(6.5); // 6.25
    expect(overallBand([7, 6.5, 6, 6])).toBe(6.5); // 6.375
    expect(overallBand([7, 7, 6.5, 6.5])).toBe(7); // 6.75
    expect(overallBand([6, 6.5, 7])).toBe(6.5); // 6.5
  });

  it('is null without bands', () => {
    expect(overallBand([])).toBeNull();
    expect(overallBand([NaN])).toBeNull();
  });
});

const attempt = (skill: IeltsAttempt['skill'], band: number | undefined, at: string): IeltsAttempt => ({
  userId: 'u',
  skill,
  taskOrPart: 'task_2',
  questionType: '',
  topic: '',
  questionPrompt: 'p',
  answerText: '',
  estimatedBand: band,
  createdAt: at,
});

describe('skillProgress', () => {
  it('uses the newest attempts of that skill', () => {
    const list = [
      attempt('writing', 6.5, '2026-10-17'),
      attempt('speaking', 5, '2026-10-16'),
      attempt('writing', undefined, '2026-10-15'),
      attempt('writing', 6, '2026-10-14'),
      attempt('writing', 5.5, '2026-10-13'),
      attempt('writing', 4, '2026-10-12'),
    ];
    expect(skillProgress('writing', list)).toEqual({
      skill: 'writing',
      attempts: 5,
      latest: 6.5,
      current: 6,
      lastAt: '2026-10-17',
    });
    expect(skillProgress('listening', list)).toEqual({ skill: 'listening', attempts: 0, latest: null, current: null, lastAt: null });
  });
});

describe('exam countdown and gap', () => {
  const now = new Date(2026, 9, 17, 22, 0);
  it('counts whole days', () => {
    expect(daysUntil('2026-10-17', now)).toBe(0);
    expect(daysUntil('2026-11-16', now)).toBe(30);
    expect(daysUntil('2026-10-10', now)).toBe(-7);
    expect(daysUntil('17/10/2026', now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
  });

  it('measures the band still to gain', () => {
    expect(bandGap(5.5, 6.5)).toBe(1);
    expect(bandGap(7, 6.5)).toBe(0);
    expect(bandGap(null, 6.5)).toBeNull();
  });
});

describe('band descriptors', () => {
  it('matches the criterion names the AI returns, per skill', () => {
    expect(findDescriptor('writing', 'Task Response')?.id).toBe('wr_tr');
    expect(findDescriptor('writing', 'Task Achievement')?.id).toBe('wr_ta');
    expect(findDescriptor('writing', 'Lexical Resource')?.id).toBe('wr_lr');
    expect(findDescriptor('speaking', 'Lexical Resource')?.id).toBe('sp_lr');
    expect(findDescriptor('speaking', ' Pronunciation ')?.id).toBe('sp_pr');
    expect(findDescriptor('speaking', 'Task Response')).toBeUndefined();
  });

  it('clamps scores to the 5–8 descriptors', () => {
    expect(descriptorBand(4)).toBe(5);
    expect(descriptorBand(6.5)).toBe(6);
    expect(descriptorBand(9)).toBe(8);
  });

  it('has every band and next step filled in', () => {
    for (const d of CRITERION_DESCRIPTORS) {
      for (const b of DESCRIPTOR_BANDS) {
        expect(d.bands[b].length).toBeGreaterThan(20);
        expect(d.toNext[b].length).toBeGreaterThan(20);
      }
    }
  });
});

describe('library', () => {
  it('has unique ids and lessons for every skill', () => {
    const ids = LIBRARY_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const skill of ['general', 'listening', 'writing', 'speaking'] as const) {
      expect(LIBRARY_LESSONS.some((l) => l.skill === skill)).toBe(true);
    }
  });

  it('searches without accents and filters by skill', () => {
    expect(searchLessons(LIBRARY_LESSONS, 'all', 'lam tron').map((l) => l.id)).toContain('gen_band_score');
    expect(searchLessons(LIBRARY_LESSONS, 'speaking', 'tiêu chí').every((l) => l.skill === 'speaking')).toBe(true);
    expect(searchLessons(LIBRARY_LESSONS, 'writing', '')).toHaveLength(LIBRARY_LESSONS.filter((l) => l.skill === 'writing').length);
  });
});

// ─── I10: criteria, weekly goals, next action ──────────────────────

const scored = (skill: 'writing' | 'speaking', scores: Record<string, number>, at: string): IeltsAttempt => {
  const values = Object.values(scores);
  return { ...attempt(skill, values.reduce((s, x) => s + x, 0) / values.length, at), criterionScores: scores };
};
const W = (ta: number, cc: number, lr: number, gra: number, at: string, task = 'Task Response') =>
  scored('writing', { [task]: ta, 'Coherence and Cohesion': cc, 'Lexical Resource': lr, 'Grammatical Range and Accuracy': gra }, at);
const S = (fc: number, lr: number, gra: number, pr: number, at: string) =>
  scored('speaking', { 'Fluency and Coherence': fc, 'Lexical Resource': lr, 'Grammatical Range and Accuracy': gra, Pronunciation: pr }, at);

describe('overallNote', () => {
  it('says how many skills and that Reading is missing', () => {
    expect(overallNote(3)).toBe('Ước tính từ 3 kỹ năng (chưa có Reading), mỗi kỹ năng lấy 3 bài gần nhất.');
    expect(overallNote(2)).toContain('từ 2/3 kỹ năng đã luyện (chưa có Reading)');
    expect(overallNote(0)).toContain('để có band ước tính');
  });
});

describe('criterionTrends', () => {
  it('merges Task Achievement and Task Response and compares with the three before', () => {
    const list = [
      W(6, 6.5, 6, 5.5, '2026-10-16'),
      W(6, 6.5, 6, 5.5, '2026-10-15', 'Task Achievement'),
      W(6.5, 6, 6, 5.5, '2026-10-14'),
      W(5, 6, 6, 6, '2026-10-10'),
      W(5.5, 6, 6, 6, '2026-10-09', 'Task Achievement'),
      W(5, 6.5, 6, 6, '2026-10-08'),
      W(4, 4, 4, 4, '2026-10-01'), // seventh: outside both windows
    ];
    const t = Object.fromEntries(criterionTrends('writing', list).map((c) => [c.key, c]));
    expect(Object.keys(t)).toEqual(['task', 'coherence', 'lexical', 'grammar']);
    expect(t.task).toMatchObject({ current: 6, previous: 5, trend: 'up', samples: 7 });
    expect(t.task.delta).toBeCloseTo(1, 2);
    expect(t.coherence).toMatchObject({ trend: 'flat' });
    expect(t.lexical).toMatchObject({ current: 6, delta: 0, trend: 'flat' });
    expect(t.grammar).toMatchObject({ current: 5.5, previous: 6, trend: 'down' });
  });

  it('has no trend with three attempts or fewer and skips missing criteria', () => {
    const list = [S(6, 6, 6, 5, '2026-10-16'), scored('speaking', { 'Fluency and Coherence': 5 }, '2026-10-15')];
    const t = criterionTrends('speaking', list);
    expect(t.map((c) => c.key)).toEqual(['fluency', 'lexical', 'grammar', 'pronunciation']);
    expect(t[0]).toMatchObject({ current: 5.5, previous: null, delta: null, trend: null, samples: 2 });
    expect(t[3]).toMatchObject({ current: 5, samples: 1 });
    expect(criterionTrends('speaking', [attempt('speaking', 6, '2026-10-16')])).toEqual([]);
  });

  it('reads the feedback list when the score map is missing', () => {
    const a = {
      ...attempt('speaking', 6, '2026-10-16'),
      aiFeedback: { criterionScores: [{ name: 'Pronunciation', nameVi: '', score: 5, comment: '' }] },
    } as unknown as IeltsAttempt;
    expect(criterionScoresOf('speaking', a)).toEqual({ pronunciation: 5 });
    expect(criterionScoresOf('writing', W(6, 5, 7, 6.5, 'x'))).toEqual({ task: 6, coherence: 5, lexical: 7, grammar: 6.5 });
  });

  it('picks the lowest criterion, preferring one going down on a tie', () => {
    const base = { nameVi: '', previous: null, delta: null, samples: 3 };
    expect(
      weakestCriterion([
        { ...base, key: 'task', current: 5.5, trend: 'flat' },
        { ...base, key: 'grammar', current: 5.5, trend: 'down' },
        { ...base, key: 'lexical', current: 6, trend: 'down' },
      ])?.key,
    ).toBe('grammar');
    expect(weakestCriterion([])).toBeNull();
  });
});

describe('weekly goals', () => {
  it('starts the week on Monday, local time', () => {
    expect(weekStart(new Date(2026, 9, 18, 23, 59))).toEqual(new Date(2026, 9, 12)); // Sunday
    expect(weekStart(new Date(2026, 9, 12, 0, 0))).toEqual(new Date(2026, 9, 12)); // Monday
    expect(weekStart(new Date(2026, 9, 14, 9))).toEqual(new Date(2026, 9, 12));
    expect(weekStart(new Date(2026, 10, 1, 9))).toEqual(new Date(2026, 9, 26)); // across months
  });

  it('counts this week only, Listening in parts', () => {
    const now = new Date(2026, 9, 18, 20);
    const iso = (d: number, h = 10) => new Date(2026, 9, d, h).toISOString();
    const full = { ...attempt('listening', 6, iso(13)), criterionScores: { 'Part 1': 8, 'Part 2': 7, 'Part 3': 6, 'Part 4': 5 } };
    const list = [
      attempt('writing', 6, iso(18)),
      attempt('writing', 6, iso(11, 23)), // last Sunday: previous week
      attempt('speaking', 6, iso(12, 0)),
      attempt('speaking', 6, iso(15)),
      attempt('speaking', 6, iso(16)),
      attempt('speaking', 6, iso(17)),
      full,
      { ...attempt('writing', 6, iso(14)), createdAt: undefined },
    ];
    expect(weeklyProgress(list, now)).toEqual([
      { skill: 'listening', goal: 1, done: 4, remaining: 0 },
      { skill: 'writing', goal: 2, done: 1, remaining: 1 },
      { skill: 'speaking', goal: 3, done: 4, remaining: 0 },
    ]);
    expect(attemptUnits(attempt('listening', 6, iso(13)))).toBe(1);
    expect(WEEKLY_GOALS).toEqual({ listening: 1, writing: 2, speaking: 3 });
  });
});

describe('nextAction', () => {
  const now = new Date(2026, 9, 18, 12);
  const iso = (d: number) => new Date(2026, 9, d, 10).toISOString();
  type Input = Parameters<typeof nextAction>[0];
  const run = (list: IeltsAttempt[], extra: Partial<Input> = {}) =>
    nextAction({
      progress: Object.fromEntries(PRACTISED_SKILLS.map((s) => [s, skillProgress(s, list)])) as Input['progress'],
      attempts: list,
      weekly: weeklyProgress(list, now),
      ...extra,
    });

  it('starts with a Listening diagnostic, then the untried skill', () => {
    expect(run([])).toMatchObject({ rule: 'start', target: { kind: 'phase', phase: AppPhase.IELTS_LISTENING_HUB } });
    const a = run([attempt('listening', 6, iso(16)), attempt('speaking', 6, iso(15))]);
    expect(a).toMatchObject({ rule: 'untried', skill: 'writing', target: { phase: AppPhase.IELTS_WRITING_HUB } });
    expect(a.title).toBe('Làm bài Writing đầu tiên');
  });

  it('puts a timed mock of the weakest skill first close to the exam', () => {
    const list = [attempt('listening', 5, iso(16)), W(6, 6, 6, 6, iso(15)), S(6, 6, 6, 6, iso(15))];
    expect(run(list, { daysToExam: 10 })).toMatchObject({ rule: 'exam_soon', skill: 'listening' });
    expect(run(list, { daysToExam: 30 }).rule).not.toBe('exam_soon');
    expect(run(list, { daysToExam: -2 }).rule).not.toBe('exam_soon');
  });

  it('sends a clearly weak criterion to its lesson', () => {
    const list = [attempt('listening', 7, iso(16)), W(6.5, 6.5, 6.5, 5, iso(15)), S(7, 7, 7, 7, iso(14))];
    const a = run(list);
    expect(a).toMatchObject({ rule: 'weak_criterion', skill: 'writing', target: { kind: 'lesson' } });
    expect(a.reason).toContain('Ngữ pháp (5.0) đang thấp hơn band Writing 6.0');
    // With a recurring labelled error, grammar goes to the error log instead.
    expect(run(list, { topError: { label: 'Mạo từ', total: 4 } })).toMatchObject({
      title: 'Sửa lỗi mạo từ lặp lại',
      target: { kind: 'phase', phase: AppPhase.IELTS_ERROR_LOG },
    });
  });

  it('checks the weaker of Writing and Speaking first', () => {
    const list = [attempt('listening', 7, iso(16)), W(7, 7, 7, 6, iso(15)), S(5.5, 5.5, 5.5, 4.5, iso(14))];
    expect(run(list)).toMatchObject({ skill: 'speaking', target: { kind: 'speakingStudy', tab: 'pronunciation' } });
  });

  it('flags the lowest criterion when it is going down', () => {
    const list = [
      attempt('listening', 7, iso(17)),
      ...[16, 15, 14].map((d) => S(6, 6, 6, 6, iso(d))),
      ...[13, 12, 11].map((d) => S(7, 6, 6, 6, iso(d))),
      W(6, 6, 6, 6, iso(10)),
    ];
    const a = run(list);
    expect(a).toMatchObject({ rule: 'weak_criterion', target: { kind: 'speakingStudy', tab: 'part2' } });
    expect(a.reason).toContain('đang đi xuống');
  });

  it('then the weekly goal with the largest share left', () => {
    const a = run([attempt('listening', 6, iso(13)), W(6, 6, 6, 6, iso(14)), S(6, 6, 6, 6, iso(15))]);
    // Listening 1 of 1 done; Writing 1 of 2 left (50%); Speaking 2 of 3 left (67%).
    expect(a).toMatchObject({ rule: 'weekly', skill: 'speaking', title: 'Luyện Speaking: còn 2 bài tuần này' });
  });

  it('suggests a full mock of the weakest skill once the week is done', () => {
    const list = [
      S(6.5, 6.5, 6.5, 6.5, iso(17)),
      S(6.5, 6.5, 6.5, 6.5, iso(16)),
      W(6.5, 6.5, 6.5, 6.5, iso(16)),
      S(6.5, 6.5, 6.5, 6.5, iso(15)),
      W(6.5, 6.5, 6.5, 6.5, iso(15)),
      { ...attempt('listening', 6, iso(13)), criterionScores: { 'Part 1': 7 } },
    ];
    expect(run(list)).toMatchObject({ rule: 'mock', skill: 'listening', target: { phase: AppPhase.IELTS_LISTENING_HUB } });
  });

  it('maps every criterion to a real place', () => {
    for (const skill of ['writing', 'speaking'] as const) {
      for (const def of SKILL_CRITERIA[skill]) {
        const a = criterionAction(skill, def.key);
        if (a.target.kind === 'lesson') expect(findLesson(a.target.lessonId), def.key).toBeTruthy();
        expect(a.title.length).toBeGreaterThan(5);
      }
    }
  });
});
