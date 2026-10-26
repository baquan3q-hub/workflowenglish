import { describe, it, expect } from 'vitest';
import { countInputWords, lessonMinutes, reviewMinutes } from '../dashboardLogic';

describe('estimates', () => {
  it('rounds review time to at least a minute', () => {
    expect(reviewMinutes(1)).toBe(1);
    expect(reviewMinutes(12)).toBe(4);
    expect(reviewMinutes(45)).toBe(15);
  });

  it('estimates a lesson from its word count', () => {
    expect(lessonMinutes(0)).toBe(0);
    expect(lessonMinutes(2)).toBe(5);
    expect(lessonMinutes(10)).toBe(15);
  });

  it('counts distinct input words', () => {
    expect(countInputWords('Apple, banana\napple;  cherry ,, ')).toBe(3);
    expect(countInputWords('   ')).toBe(0);
  });
});

import { greeting, heroCardText, streakWeek } from '../dashboardLogic';

describe('hero', () => {
  it('greets by time of day, with the name when there is one', () => {
    expect(greeting(new Date(2026, 9, 26, 8), 'Quân')).toBe('Chào buổi sáng, Quân');
    expect(greeting(new Date(2026, 9, 26, 14))).toBe('Chào buổi chiều');
    expect(greeting(new Date(2026, 9, 26, 21), '  ')).toBe('Chào buổi tối');
    expect(greeting(new Date(2026, 9, 26, 2))).toBe('Chào buổi tối');
  });

  it('marks the streak days of the last week', () => {
    const now = new Date('2026-10-26T10:00:00Z'); // Monday
    const week = streakWeek(now, 3, '2026-10-26');
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.active)).toEqual([false, false, false, false, true, true, true]);
    expect(week[6]).toMatchObject({ date: '2026-10-26', today: true, label: 'T2' });
    expect(week[0].label).toBe('T3');
  });

  it('counts days in UTC, like goalService stamps them', () => {
    // 06:00 in Hanoi on 27 Oct is still 26 Oct in UTC: today's dot is the one that was stamped.
    const week = streakWeek(new Date('2026-10-26T23:00:00Z'), 1, '2026-10-26');
    expect(week[6]).toMatchObject({ date: '2026-10-26', active: true, today: true });
  });

  it('keeps a streak that ended yesterday, drops an older one', () => {
    const now = new Date('2026-10-26T10:00:00Z');
    expect(streakWeek(now, 2, '2026-10-25').map((d) => d.active)).toEqual([false, false, false, false, true, true, false]);
    expect(streakWeek(now, 5, '2026-10-20').every((d) => !d.active)).toBe(true);
    expect(streakWeek(now, 0, '2026-10-26').every((d) => !d.active)).toBe(true);
    expect(streakWeek(now, 4, null).every((d) => !d.active)).toBe(true);
    expect(streakWeek(now, 30, '2026-10-26').every((d) => d.active)).toBe(true);
  });

  it('writes a short line for each card, never a bare zero', () => {
    const base = { dueCount: 12, band: 6.5, streak: 4, longest: 9 };
    expect(heroCardText('review', base)).toBe('12 từ đến hạn');
    expect(heroCardText('review', { ...base, dueCount: 0 })).toBe('Không có từ đến hạn');
    expect(heroCardText('review', { ...base, dueCount: null })).toBe('Đang tải…');
    expect(heroCardText('ielts', base)).toBe('Band ước tính 6.5');
    expect(heroCardText('ielts', { ...base, band: null })).toBe('Bắt đầu lộ trình');
    expect(heroCardText('streak', base)).toBe('4 ngày · kỷ lục 9');
    expect(heroCardText('streak', { ...base, longest: 4 })).toBe('4 ngày');
    expect(heroCardText('streak', { ...base, streak: 0 })).toBe('Học hôm nay để bắt đầu chuỗi');
    expect(heroCardText('test', base)).toBe('Kiểm tra nhanh từ đã học');
  });
});
