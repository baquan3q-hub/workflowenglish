import { describe, expect, it } from 'vitest';
import { LEGACY_LESSON, WRITING_CATEGORY_LESSON } from '../grammar/legacy';
import { hubs, lessonById, lessonIds, lessons, loadLessons, searchLessons, stageLessons, stages, TENSE_GRID } from '../grammar/meta';
import type { Lesson } from '../grammar/types';
import { expectedOf, gradeClosed } from '../../services/grammar/grade';
import { PLACEMENT } from '../../services/grammar/session';

const all: Lesson[] = await loadLessons(lessonIds);

describe('grammar lesson bank', () => {
  it('has seven stages and every lesson body', () => {
    expect(stages).toHaveLength(7);
    expect(all).toHaveLength(lessons.length);
    expect(lessons.length).toBeGreaterThanOrEqual(60);
    for (const s of stages) expect(stageLessons(s.id).length).toBeGreaterThan(0);
  });

  it('uses unique lesson and item IDs', () => {
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    const itemIds = all.flatMap((l) => l.items.map((i) => i.id));
    const dupes = itemIds.filter((id, i) => itemIds.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('points prereqs, hubs, legacy and writing links at real lessons', () => {
    for (const l of lessons) for (const p of l.prereq) expect(lessonById.has(p), `${l.id} → ${p}`).toBe(true);
    for (const h of hubs) for (const id of h.lessons) expect(lessonById.has(id), `${h.id} → ${id}`).toBe(true);
    for (const [old, id] of Object.entries(LEGACY_LESSON)) expect(lessonById.has(id), `${old} → ${id}`).toBe(true);
    for (const v of Object.values(WRITING_CATEGORY_LESSON)) expect(lessonById.has(v.lesson)).toBe(true);
    for (const pair of Object.values(PLACEMENT)) for (const id of pair) expect(lessonById.has(id)).toBe(true);
    for (const l of all) if (l.contrast?.with) expect(lessonById.has(l.contrast.with), `${l.id} contrast`).toBe(true);
  });

  it('has the twelve tenses', () => {
    expect(TENSE_GRID.flat()).toHaveLength(12);
    expect(new Set(TENSE_GRID.flat()).size).toBe(12);
  });

  it('opens topic hubs by search', () => {
    expect(searchLessons('bị động').map((l) => l.id)).toContain('passive');
    expect(searchLessons('menh de quan he').map((l) => l.id)).toContain('relative');
  });

  describe.each(all.map((l) => [l.id, l] as const))('%s', (_id, l) => {
    it('explains when, why, forms, examples and traps', () => {
      expect(l.when.length).toBeGreaterThanOrEqual(2);
      expect(l.why.length).toBeGreaterThan(60);
      expect(l.forms.length).toBeGreaterThanOrEqual(2);
      expect(l.examples.length).toBeGreaterThanOrEqual(3);
      expect(l.traps.length).toBeGreaterThanOrEqual(1);
      for (const t of l.traps) expect(t.wrong).not.toBe(t.right);
    });

    it('climbs from recognition to speaking, with diagnostic and review items', () => {
      const levels = new Set(l.items.map((i) => i.level));
      for (const level of [1, 2, 3, 4, 5] as const) expect(levels.has(level), `level ${level}`).toBe(true);
      expect(l.items.some((i) => i.diag)).toBe(true);
      expect(l.items.filter((i) => i.review).length).toBeGreaterThanOrEqual(2);
      expect(l.items.filter((i) => !i.review).length).toBeGreaterThanOrEqual(10);
    });

    it('has closed items that grade their own answers', () => {
      for (const item of l.items) {
        switch (item.kind) {
          case 'choice':
            expect(item.prompt.split('___').length, item.prompt).toBe(2);
            expect(new Set(item.options).size, item.prompt).toBe(item.options.length);
            expect(item.answer).not.toContain('|');
            expect(gradeClosed(item, item.answer)).toBe(true);
            for (const o of item.options.slice(1)) expect(gradeClosed(item, o)).toBe(false);
            break;
          case 'fill':
            expect(item.prompt.split('___').length, item.prompt).toBe(2);
            expect(gradeClosed(item, item.answer)).toBe(true);
            expect(gradeClosed(item, expectedOf(item))).toBe(true);
            break;
          case 'fix':
            expect(gradeClosed(item, item.wrong), item.wrong).toBe(false);
            expect(gradeClosed(item, item.answer)).toBe(true);
            break;
          case 'spot':
            expect(item.sentences.length).toBeGreaterThanOrEqual(2);
            expect(new Set(item.sentences).size).toBe(item.sentences.length);
            break;
          case 'order':
            expect(item.chunks.length, item.answer).toBeGreaterThanOrEqual(3);
            expect(gradeClosed(item, item.answer)).toBe(true);
            break;
          default:
            expect(item.model.length).toBeGreaterThan(5);
            expect(item.model).not.toContain('|');
        }
      }
    });
  });
});
