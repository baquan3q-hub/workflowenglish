import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  row: null as unknown,
  error: null as { message: string } | null,
  upserted: [] as unknown[],
  reads: 0,
}));

vi.mock('../supabaseClient', () => {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    maybeSingle: () => (db.reads++, Promise.resolve({ data: db.row, error: db.error })),
    upsert: (row: unknown) => (db.upserted.push(row), Promise.resolve({ error: db.error })),
  };
  return { supabase: { from: () => query } };
});

import {
  EMPTY_PROFILE,
  isProfileEmpty,
  NOTE_MAX,
  profileCompletion,
  profileSummary,
  sanitizeProfile,
  SUMMARY_MAX,
  type LearningProfile,
} from '../learningProfileLogic';
import { clearLearningProfileCache, getLearningProfile, learnerSummary, saveLearningProfile } from '../learningProfileService';

const full: LearningProfile = {
  nickname: 'Quân',
  goal: 'ielts',
  level: 'B2',
  occupation: 'Software engineer',
  interests: ['technology', 'travel'],
  weakAreas: ['speaking', 'grammar'],
  minutesPerDay: 30,
  note: 'I want examples about software projects.',
};

describe('learning profile logic', () => {
  it('keeps valid values and drops everything else', () => {
    expect(sanitizeProfile(full)).toEqual(full);
    expect(sanitizeProfile(null)).toEqual(EMPTY_PROFILE);
    expect(sanitizeProfile([1, 2])).toEqual(EMPTY_PROFILE);
    expect(
      sanitizeProfile({
        nickname: '  Q\u0007 \n uân  ',
        goal: 'fly',
        level: 'B5',
        interests: ['technology', 'technology', 'nope', 3],
        weakAreas: 'grammar',
        minutesPerDay: 25,
        note: 'x'.repeat(500),
        extra: true,
      }),
    ).toEqual({ ...EMPTY_PROFILE, nickname: 'Q uân', interests: ['technology'], note: 'x'.repeat(NOTE_MAX) });
  });

  it('measures how much is filled in', () => {
    expect(profileCompletion(EMPTY_PROFILE)).toBe(0);
    expect(isProfileEmpty(EMPTY_PROFILE)).toBe(true);
    expect(profileCompletion(full)).toBe(100);
    expect(profileCompletion({ ...EMPTY_PROFILE, goal: 'work', level: 'A2' })).toBe(25);
  });

  it('writes a short English summary for the AI, empty for an empty profile', () => {
    expect(profileSummary(EMPTY_PROFILE)).toBe('');
    const s = profileSummary(full);
    expect(s).toContain('Goal: pass the IELTS Academic exam.');
    expect(s).toContain('Job or field: Software engineer.');
    expect(s).toContain('Interests: technology, travel.');
    expect(s).toContain('Wants to improve: speaking, grammar.');
    expect(s).toContain('Note from the learner: I want examples');
    expect(profileSummary({ ...full, note: 'y'.repeat(NOTE_MAX), occupation: 'z'.repeat(60) }).length).toBeLessThanOrEqual(SUMMARY_MAX);
  });
});

describe('learning profile service', () => {
  beforeEach(() => {
    db.row = null;
    db.error = null;
    db.upserted = [];
    db.reads = 0;
    clearLearningProfileCache();
  });

  it('reads, checks and caches the profile', async () => {
    db.row = { data: { ...full, goal: 'nope' } };
    expect(await getLearningProfile('u1')).toEqual({ ...full, goal: null });
    await getLearningProfile('u1');
    expect(db.reads).toBe(1);
    expect(await getLearningProfile('')).toEqual(EMPTY_PROFILE);
  });

  it('gives an empty profile before the migration, and says so when saving', async () => {
    db.error = { message: 'relation "public.learning_profiles" does not exist' };
    expect(await getLearningProfile('u1')).toEqual(EMPTY_PROFILE);
    await expect(saveLearningProfile('u1', full)).rejects.toThrow(/migration 015/);
  });

  it('saves the cleaned profile and serves it from the cache', async () => {
    const saved = await saveLearningProfile('u1', { ...full, interests: ['technology', 'x' as never] });
    expect(saved.interests).toEqual(['technology']);
    expect(db.upserted[0]).toMatchObject({ user_id: 'u1', data: saved });
    expect(await learnerSummary('u1')).toContain('Interests: technology.');
    expect(db.reads).toBe(0);
  });
});
