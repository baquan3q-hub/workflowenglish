import { describe, it, expect } from 'vitest';
import { MasteryLevel } from '../../../types';
import {
  RATING_META,
  SRS_LEVEL_META,
  SRS_LEVEL_ORDER,
  SUSPENDED_META,
  getLevelMeta,
  getRatingMeta,
} from '../srsTheme';

describe('srsTheme', () => {
  it('has a Vietnamese label and token classes for every level', () => {
    for (const level of SRS_LEVEL_ORDER) {
      const meta = SRS_LEVEL_META[level];
      expect(meta.label).toBeTruthy();
      expect(meta.dot).toMatch(/^bg-srs-/);
      expect(meta.text).toMatch(/^text-srs-.*-fg$/);
    }
    expect(SRS_LEVEL_ORDER).toHaveLength(Object.keys(SRS_LEVEL_META).length);
  });

  it('uses the labels the app already shows', () => {
    expect(getLevelMeta(MasteryLevel.NEW).label).toBe('Mới');
    expect(getLevelMeta(MasteryLevel.LEARNING).label).toBe('Đang học');
    expect(getLevelMeta(MasteryLevel.REVIEWING).label).toBe('Ôn tập');
    expect(getLevelMeta(MasteryLevel.MASTERED).label).toBe('Thành thạo');
    expect(getLevelMeta(MasteryLevel.LAPSED).label).toBe('Đã quên');
  });

  it('shows suspended words as "Tạm ẩn" whatever their level', () => {
    expect(getLevelMeta(MasteryLevel.MASTERED, true)).toBe(SUSPENDED_META);
  });

  it('falls back to "Mới" for unknown levels', () => {
    expect(getLevelMeta(99)).toBe(SRS_LEVEL_META[MasteryLevel.NEW]);
    expect(getLevelMeta(null)).toBe(SRS_LEVEL_META[MasteryLevel.NEW]);
  });

  it('orders ratings 0–3 with keys 1–4', () => {
    expect(RATING_META.map((r) => r.rating)).toEqual([0, 1, 2, 3]);
    expect(RATING_META.map((r) => r.key)).toEqual(['1', '2', '3', '4']);
    expect(RATING_META.map((r) => r.label)).toEqual(['Lại', 'Khó', 'Tốt', 'Dễ']);
    expect(getRatingMeta(2).label).toBe('Tốt');
  });
});
