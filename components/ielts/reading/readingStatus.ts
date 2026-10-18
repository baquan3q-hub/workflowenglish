import type { ReadingAnswerStatus } from '../../../services/readingLogic';
import type { Tone } from '../../ui/palette';

/** Correct is mint, a near miss (spelling, plural, word limit) butter, wrong blush, blank sky. */
export const READING_STATUS_TONE: Record<ReadingAnswerStatus, Tone> = {
  correct: 'mint',
  spelling: 'butter',
  plural: 'butter',
  over_limit: 'butter',
  wrong: 'blush',
  ng_confusion: 'blush',
  blank: 'sky',
};

/** "12:05" or "1:02:05". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
