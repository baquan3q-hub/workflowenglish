/**
 * Manual status changes in the word library (pure).
 *
 * Changing only `mastery_level` would let SM-2 pull the word back to its old
 * state on the next review, so each target also resets the schedule
 * (docs/upgrade-plan-v3.md, section 2.3):
 *
 * | Target     | repetitions   | interval       | next review     | EF        |
 * |------------|---------------|----------------|-----------------|-----------|
 * | Mới        | 0             | 0              | now (not due)   | reset 2.5 |
 * | Đang học   | 0             | 1              | now             | kept      |
 * | Ôn tập     | max(rep, 3)   | max(int, 3)    | now + interval  | kept      |
 * | Thành thạo | max(rep, 4)   | max(int, 22)   | now + interval  | kept      |
 * | Tạm ẩn     | kept          | kept           | kept            | kept      |
 *
 * Any level change also clears `is_suspended`; "Bỏ ẩn" clears it alone.
 */

import { MasteryLevel, type WordMasteryRecord } from '../types';
import { DEFAULT_EASINESS_FACTOR } from './srsService';

export type ManualStatus = 'new' | 'learning' | 'reviewing' | 'mastered' | 'suspended' | 'unsuspended';

export type ManualStatusState = Pick<
  WordMasteryRecord,
  'mastery_level' | 'easiness_factor' | 'interval_days' | 'repetition_count' | 'next_review_date'
> & { is_suspended?: boolean };

export type ManualStatusPatch = Partial<ManualStatusState>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const MANUAL_STATUS_LABEL: Record<ManualStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  reviewing: 'Ôn tập',
  mastered: 'Thành thạo',
  suspended: 'Tạm ẩn',
  unsuspended: 'Bỏ ẩn',
};

/** The SRS columns to write for `target`. Never touches word metadata or counters. */
export function manualStatusPatch(
  record: ManualStatusState,
  target: ManualStatus,
  now: Date,
): ManualStatusPatch {
  const rep = record.repetition_count ?? 0;
  const interval = record.interval_days ?? 0;
  const nowIso = now.toISOString();
  const inDays = (days: number) => new Date(now.getTime() + days * MS_PER_DAY).toISOString();

  switch (target) {
    case 'new':
      return {
        mastery_level: MasteryLevel.NEW,
        repetition_count: 0,
        interval_days: 0,
        next_review_date: nowIso,
        easiness_factor: DEFAULT_EASINESS_FACTOR,
        is_suspended: false,
      };
    case 'learning':
      return {
        mastery_level: MasteryLevel.LEARNING,
        repetition_count: 0,
        interval_days: 1,
        next_review_date: nowIso,
        is_suspended: false,
      };
    case 'reviewing': {
      const days = Math.max(interval, 3);
      return {
        mastery_level: MasteryLevel.REVIEWING,
        repetition_count: Math.max(rep, 3),
        interval_days: days,
        next_review_date: inDays(days),
        is_suspended: false,
      };
    }
    case 'mastered': {
      const days = Math.max(interval, 22);
      return {
        mastery_level: MasteryLevel.MASTERED,
        repetition_count: Math.max(rep, 4),
        interval_days: days,
        next_review_date: inDays(days),
        is_suspended: false,
      };
    }
    case 'suspended':
      return { is_suspended: true };
    case 'unsuspended':
      return { is_suspended: false };
  }
}

/** The columns a manual change may write, read back from a row (for undo). */
export function manualStatusSnapshot(record: ManualStatusState): ManualStatusState {
  return {
    mastery_level: record.mastery_level,
    easiness_factor: record.easiness_factor,
    interval_days: record.interval_days,
    repetition_count: record.repetition_count,
    next_review_date: record.next_review_date,
    is_suspended: !!record.is_suspended,
  };
}
