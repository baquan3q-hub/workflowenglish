/**
 * Which app-level tab a screen belongs to, and where the bottom navigation
 * is shown. Pure so it can be tested without rendering App.
 */

import { AppPhase } from '../types';

export type NavTabId = 'learn' | 'review' | 'vocab' | 'stats' | 'ielts';

/** Which tab of the analytics screen to open. */
export type AnalyticsSection = 'overview' | 'vocab';

/** The steps of a lesson, in order. */
export const LESSON_PHASES: readonly AppPhase[] = [
  AppPhase.FLASHCARDS,
  AppPhase.STORY,
  AppPhase.QUIZ,
  AppPhase.FILL_BLANK,
];

const IELTS_PHASES: readonly AppPhase[] = [
  AppPhase.IELTS_WRITING_HUB,
  AppPhase.IELTS_WRITING_PRACTICE,
  AppPhase.IELTS_WRITING_FEEDBACK,
  AppPhase.IELTS_SPEAKING_HUB,
  AppPhase.IELTS_SPEAKING_PRACTICE,
  AppPhase.IELTS_SPEAKING_FEEDBACK,
];

/**
 * Screens where the app tab bar would get in the way: lesson steps have
 * their own step bar, and the review session / IELTS practice keep the
 * bottom of the screen for answer and rating controls.
 */
const NO_TAB_BAR_PHASES: readonly AppPhase[] = [
  AppPhase.LANDING,
  AppPhase.AUTH,
  ...LESSON_PHASES,
  AppPhase.REVIEW_SESSION,
  AppPhase.IELTS_WRITING_PRACTICE,
  AppPhase.IELTS_SPEAKING_PRACTICE,
];

export function isLessonPhase(phase: AppPhase): boolean {
  return LESSON_PHASES.includes(phase);
}

export function isIeltsPhase(phase: AppPhase): boolean {
  return IELTS_PHASES.includes(phase);
}

/** The tab to highlight for a screen; `null` for screens outside the tabs (history). */
export function activeNavTab(phase: AppPhase): NavTabId | null {
  if (phase === AppPhase.DASHBOARD || isLessonPhase(phase) || phase === AppPhase.LESSON_SUMMARY) return 'learn';
  if (phase === AppPhase.REVIEW_SESSION) return 'review';
  if (phase === AppPhase.VOCAB_LIBRARY) return 'vocab';
  if (phase === AppPhase.ANALYTICS) return 'stats';
  if (isIeltsPhase(phase)) return 'ielts';
  return null;
}

/** Whether the mobile tab bar is shown on this screen. */
export function showsTabBar(phase: AppPhase): boolean {
  return !NO_TAB_BAR_PHASES.includes(phase);
}

/** Badge text for the due-word count: hidden at 0 or unknown, capped at "99+". */
export function dueBadgeText(count: number | null | undefined): string | null {
  if (count == null || !Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? '99+' : String(Math.floor(count));
}
