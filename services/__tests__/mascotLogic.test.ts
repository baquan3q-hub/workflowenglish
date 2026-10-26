import { describe, expect, it } from 'vitest';
import { HOLD_MS, lookOffset, mascotMessage, normalisePoint, POSE_OF, reactTo, type MascotState } from '../mascotLogic';

describe('mascot reactions', () => {
  it('maps each event to its reaction and picture', () => {
    expect(reactTo('idle', 'hover-mascot', false)).toBe('wave');
    expect(reactTo('idle', 'hover-target', false)).toBe('look');
    expect(reactTo('idle', 'goal-added', false)).toBe('nod');
    expect(reactTo('idle', 'goal-done', false)).toBe('hop');
    expect(reactTo('idle', 'all-done', false)).toBe('celebrate');
    expect(reactTo('idle', 'idle-timeout', false)).toBe('sleepy');
    expect([POSE_OF.nod, POSE_OF.hop, POSE_OF.celebrate, POSE_OF.look]).toEqual(['thumbs', 'cheer', 'cheer', 'idle']);
  });

  it('does not let a smaller reaction cut a bigger one short', () => {
    expect(reactTo('celebrate', 'hover-mascot', true)).toBe('celebrate');
    expect(reactTo('hop', 'hover-target', true)).toBe('hop');
    expect(reactTo('nod', 'goal-done', true)).toBe('hop');
    expect(reactTo('hop', 'all-done', true)).toBe('celebrate');
    // Once it has finished playing, anything goes.
    expect(reactTo('celebrate', 'hover-mascot', false)).toBe('wave');
    // Waking up from a doze.
    expect(reactTo('sleepy', 'hover-target', true)).toBe('look');
  });

  it('only timed reactions return to rest on their own', () => {
    const timed = (Object.keys(HOLD_MS) as MascotState[]).sort();
    expect(timed).toEqual(['celebrate', 'hop', 'nod', 'wave']);
    expect(HOLD_MS.celebrate).toBeGreaterThan(HOLD_MS.hop!);
  });
});

describe('mascot speech', () => {
  const base = { greeting: 'Chào buổi sáng, Quân', done: 1, total: 4, next: 'Ôn 73 từ vựng' };

  it('greets and nudges toward the next goal', () => {
    expect(mascotMessage({ ...base, state: 'idle' })).toBe('Chào buổi sáng, Quân! Bắt đầu với “Ôn 73 từ vựng” nhé.');
    expect(mascotMessage({ ...base, state: 'idle', next: null, total: 0, done: 0 })).toBe('Chào buổi sáng, Quân! Thêm một mục tiêu cho hôm nay nhé.');
  });

  it('reacts to progress', () => {
    expect(mascotMessage({ ...base, state: 'nod' })).toMatch(/Mục tiêu mới/);
    expect(mascotMessage({ ...base, state: 'hop', done: 2 })).toBe('Xong thêm một việc! Còn 2 mục nữa.');
    expect(mascotMessage({ ...base, state: 'hop', done: 3 })).toMatch(/Chỉ còn một mục/);
    expect(mascotMessage({ ...base, state: 'celebrate', done: 4, next: null })).toBe('Xong hết 4 mục tiêu hôm nay rồi. Tuyệt vời!');
    expect(mascotMessage({ ...base, state: 'idle', done: 4, next: null })).toMatch(/đã xong hết/);
    expect(mascotMessage({ ...base, state: 'sleepy' })).toMatch(/chờ bạn/);
  });
});

describe('mascot gaze', () => {
  it('leans a little toward the cursor and never past the limit', () => {
    expect(lookOffset(0, 0, false)).toEqual({ x: 0, y: 0, rotate: 0 });
    expect(lookOffset(1, -1, false)).toEqual({ x: 6, y: -4, rotate: 4 });
    expect(lookOffset(5, 5, false)).toEqual({ x: 6, y: 4, rotate: 4 });
    expect(lookOffset(-0.5, 0.25, false)).toEqual({ x: -3, y: 1, rotate: -2 });
    expect(lookOffset(Number.NaN, 1, false)).toEqual({ x: 0, y: 4, rotate: 0 });
  });

  it('stays still with reduced motion', () => {
    expect(lookOffset(1, 1, true)).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it('normalises a point within a box', () => {
    const box = { left: 100, top: 0, width: 200, height: 100 };
    expect(normalisePoint(200, 50, box)).toEqual({ nx: 0, ny: 0 });
    expect(normalisePoint(100, 0, box)).toEqual({ nx: -1, ny: -1 });
    expect(normalisePoint(900, 50, box)).toEqual({ nx: 1, ny: 0 });
    expect(normalisePoint(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ nx: 0, ny: 0 });
  });
});
