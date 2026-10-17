/**
 * IELTS progress (pure): overall band with the official rounding, a band per
 * skill from recent attempts, and days left to the exam.
 */

import type { IeltsAttempt, IeltsSkill } from '../types';
import { normalizeBand } from './ieltsAttemptService';

/** Attempts averaged for a skill's current band. */
export const RECENT_ATTEMPTS = 3;

/**
 * Mean of the skill bands, rounded the IELTS way: below .25 rounds down,
 * .25 to below .75 becomes .5, .75 and above rounds up. Null when empty.
 */
export function overallBand(bands: ReadonlyArray<number>): number | null {
  const valid = bands.filter((b) => Number.isFinite(b));
  if (valid.length === 0) return null;
  const mean = valid.reduce((s, b) => s + b, 0) / valid.length;
  const whole = Math.floor(mean + 1e-9);
  const frac = mean - whole;
  if (frac < 0.25 - 1e-9) return whole;
  if (frac < 0.75 - 1e-9) return whole + 0.5;
  return whole + 1;
}

export interface SkillProgress {
  skill: IeltsSkill;
  attempts: number;
  /** Band of the newest graded attempt. */
  latest: number | null;
  /** Mean of the newest RECENT_ATTEMPTS bands, to the nearest 0.5. */
  current: number | null;
  lastAt: string | null;
}

/** Progress for one skill from its attempts, newest first. */
export function skillProgress(skill: IeltsSkill, attempts: ReadonlyArray<IeltsAttempt>): SkillProgress {
  const graded = attempts.filter((a) => a.skill === skill && typeof a.estimatedBand === 'number');
  const recent = graded.slice(0, RECENT_ATTEMPTS).map((a) => a.estimatedBand as number);
  return {
    skill,
    attempts: attempts.filter((a) => a.skill === skill).length,
    latest: graded[0]?.estimatedBand ?? null,
    current: recent.length ? normalizeBand(recent.reduce((s, b) => s + b, 0) / recent.length) ?? null : null,
    lastAt: attempts.find((a) => a.skill === skill)?.createdAt ?? null,
  };
}

/** Whole days from today to a YYYY-MM-DD exam date; negative once it has passed. */
export function daysUntil(examDate: string | null | undefined, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate ?? '');
  if (!m) return null;
  const exam = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exam.getTime() - today.getTime()) / 86_400_000);
}

/** Band still to gain to reach the target; 0 once reached, null if either is unknown. */
export function bandGap(current: number | null, target: number | null): number | null {
  if (current == null || target == null) return null;
  return Math.max(0, Math.round((target - current) * 2) / 2);
}
