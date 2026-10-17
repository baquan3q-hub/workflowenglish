import { describe, it, expect } from 'vitest';
import { bandGap, daysUntil, overallBand, skillProgress } from '../ieltsProgressLogic';
import { descriptorBand, findDescriptor, CRITERION_DESCRIPTORS, DESCRIPTOR_BANDS } from '../../data/ielts/bandDescriptors';
import { LIBRARY_LESSONS, searchLessons } from '../../data/ielts/library';
import type { IeltsAttempt } from '../../types';

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
