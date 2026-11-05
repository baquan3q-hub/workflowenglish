import { describe, expect, it } from 'vitest';
import { AppPhase, type IeltsAttempt, type UserGoals } from '../../types';
import { dailyReviewProgress, ieltsReport, reviewFindings } from '../analyticsReportLogic';
import { PRACTISED_SKILLS } from '../ieltsProgressLogic';
import { DEFAULT_PREFERENCES } from '../preferencesService';

const now = new Date(2026, 10, 4, 12);
const preferences = { ...DEFAULT_PREFERENCES, ieltsTargetBand: 7 };
const attempt = (skill: IeltsAttempt['skill'], band: number | undefined, day = 4): IeltsAttempt => ({
  userId: 'u', skill, estimatedBand: band, createdAt: new Date(2026, 10, day, 10).toISOString(),
  taskOrPart: '', questionType: '', topic: '', questionPrompt: '', answerText: '',
});

const input = {
  due: 0,
  daily: { reviewed: 3, goal: 10, remaining: 7 },
  retention: { rate: null, samples: 5, needed: 15 },
  activity: [],
  hasLogs: true,
  repeatedWords: 0,
  sessionSize: 20,
  hasWords: true,
};

describe('review findings', () => {
  it('uses the same UTC day as the persisted review counter', () => {
    const goals: UserGoals = {
      id: 'g', user_id: 'u', daily_word_goal: 10, words_reviewed_today: 6, last_review_reset_date: '2026-11-04',
      current_streak: 0, longest_streak: 0, last_active_date: null, preferred_level: 'B1', created_at: '', updated_at: '',
    };
    expect(dailyReviewProgress(goals, new Date('2026-11-04T23:59:00Z'))).toEqual({ reviewed: 6, goal: 10, remaining: 4 });
    expect(dailyReviewProgress(goals, new Date('2026-11-05T00:01:00Z')).reviewed).toBe(0);
  });

  it('prioritizes the queue and splits it at the preferred session size', () => {
    const findings = reviewFindings({ ...input, due: 26, retention: { rate: 0.8, samples: 20, needed: 0 } });
    expect(findings.map((f) => f.id)).toEqual(['due', 'retention']);
    expect(findings[0]).toMatchObject({ tone: 'warning', target: 'review' });
    expect(findings[0].advice).toContain('20 từ');
  });

  it('does not infer weak retention from a small sample or a goal reached from an empty queue', () => {
    expect(reviewFindings(input)[0]).toMatchObject({ id: 'lesson', tone: 'focus' });
  });

  it('compares full days and suppresses rhythm warnings when logs are unavailable', () => {
    const activity = Array.from({ length: 15 }, (_, i) => ({ date: String(i), count: i < 7 || i === 14 ? 1 : 0 }));
    expect(reviewFindings({ ...input, activity }).map((f) => f.id)).toEqual(['rhythm']);
    expect(reviewFindings({ ...input, activity, hasLogs: false }).map((f) => f.id)).toEqual(['lesson']);
  });
});

describe('IELTS report', () => {
  it('requires a scored attempt for each skill before comparing the overall goal', () => {
    const attempts = PRACTISED_SKILLS.map((skill) => attempt(skill, skill === 'reading' ? undefined : 6));
    const report = ieltsReport(attempts, preferences, now);
    expect(report).toMatchObject({ band: null, gap: null, measured: 3, engaged: true });
    expect(report.finding.target).toEqual({ kind: 'phase', phase: AppPhase.IELTS_READING_HUB });
  });

  it('prioritizes timed practice for the weakest skill near the exam', () => {
    const attempts = PRACTISED_SKILLS.map((skill) => attempt(skill, skill === 'writing' ? 5 : 6.5));
    const report = ieltsReport(attempts, { ...preferences, ieltsExamDate: '2026-11-12' }, now);
    expect(report).toMatchObject({ band: 6, gap: 1, soon: true, complete: false });
    expect(report.finding).toMatchObject({ tone: 'warning', target: { kind: 'phase', phase: AppPhase.IELTS_WRITING_HUB } });
  });

  it('flags a decline only when there are two groups of three scored attempts', () => {
    const others = PRACTISED_SKILLS.filter((skill) => skill !== 'speaking').map((skill) => attempt(skill, 7));
    const speaking = [4, 3, 2, 1, 0, -1].map((day, i) => attempt('speaking', i < 3 ? 6 : 7, day));
    expect(ieltsReport([...others, ...speaking.slice(0, 5)], preferences, now).finding.tone).toBe('focus');
    const report = ieltsReport([...others, ...speaking], preferences, now);
    expect(report.finding).toMatchObject({ tone: 'warning', title: 'Band luyện tập Speaking giảm' });
  });
});
