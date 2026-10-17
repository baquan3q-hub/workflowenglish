import { describe, it, expect } from 'vitest';
import { AppPhase } from '../../types';
import { activeNavTab, dueBadgeText, isLessonPhase, showsTabBar } from '../navConfig';

describe('navConfig', () => {
  it('maps every screen to its tab', () => {
    expect(activeNavTab(AppPhase.DASHBOARD)).toBe('learn');
    expect(activeNavTab(AppPhase.QUIZ)).toBe('learn');
    expect(activeNavTab(AppPhase.REVIEW_SESSION)).toBe('review');
    expect(activeNavTab(AppPhase.ANALYTICS)).toBe('stats');
    expect(activeNavTab(AppPhase.ANALYTICS, 'vocab')).toBe('vocab');
    expect(activeNavTab(AppPhase.IELTS_SPEAKING_FEEDBACK)).toBe('ielts');
    expect(activeNavTab(AppPhase.HISTORY)).toBeNull();
  });

  it('hides the tab bar where the screen needs the bottom edge', () => {
    for (const phase of [AppPhase.FLASHCARDS, AppPhase.FILL_BLANK, AppPhase.REVIEW_SESSION, AppPhase.IELTS_WRITING_PRACTICE, AppPhase.AUTH]) {
      expect(showsTabBar(phase)).toBe(false);
    }
    for (const phase of [AppPhase.DASHBOARD, AppPhase.ANALYTICS, AppPhase.HISTORY, AppPhase.IELTS_WRITING_HUB]) {
      expect(showsTabBar(phase)).toBe(true);
    }
  });

  it('knows the lesson steps', () => {
    expect(isLessonPhase(AppPhase.STORY)).toBe(true);
    expect(isLessonPhase(AppPhase.DASHBOARD)).toBe(false);
  });

  it('formats the due badge', () => {
    expect(dueBadgeText(null)).toBeNull();
    expect(dueBadgeText(0)).toBeNull();
    expect(dueBadgeText(-3)).toBeNull();
    expect(dueBadgeText(12)).toBe('12');
    expect(dueBadgeText(99)).toBe('99');
    expect(dueBadgeText(100)).toBe('99+');
  });
});
