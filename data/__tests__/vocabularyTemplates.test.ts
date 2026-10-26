import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DifficultyLevel } from '../../types';
import { TEMPLATE_TOPICS, VOCABULARY_TEMPLATES } from '../vocabularyTemplates';

/** Topic values from the TOPICS array in views/Dashboard.tsx (it is not exported, so read the source). */
function dashboardTopics(): string[] {
  const src = readFileSync(fileURLToPath(new URL('../../views/Dashboard.tsx', import.meta.url)), 'utf8');
  const block = src.match(/const TOPICS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!block) throw new Error('TOPICS not found in views/Dashboard.tsx');
  return [...block[1].matchAll(/value:\s*'([^']+)'/g)].map((m) => m[1]);
}

describe('VOCABULARY_TEMPLATES', () => {
  it('has about 60 sets with unique ids', () => {
    const ids = VOCABULARY_TEMPLATES.map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(55);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('TEMPLATE_TOPICS matches the Dashboard topic list', () => {
    expect(TEMPLATE_TOPICS.map((t) => t.value)).toEqual(dashboardTopics());
  });

  it('has at least 6 sets per CEFR level', () => {
    for (const level of Object.values(DifficultyLevel)) {
      const count = VOCABULARY_TEMPLATES.filter((t) => t.cefrLevel === level).length;
      expect(count, `${level} sets`).toBeGreaterThanOrEqual(6);
    }
  });

  const topics = new Set(dashboardTopics());

  describe.each(VOCABULARY_TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    it('has 10–12 words with one meaning each', () => {
      expect(t.words.length).toBeGreaterThanOrEqual(10);
      expect(t.words.length).toBeLessThanOrEqual(12);
      expect(t.meanings).toHaveLength(t.words.length);
      for (const m of t.meanings) expect(m.trim()).not.toBe('');
    });

    it('has no duplicate word', () => {
      const lower = t.words.map((w) => w.trim().toLowerCase());
      expect(new Set(lower).size).toBe(lower.length);
    });

    it('previews only words from the set', () => {
      expect(t.samplePreview.length).toBeGreaterThan(0);
      for (const w of t.samplePreview) expect(t.words).toContain(w);
    });

    it('uses a Dashboard topic and a CEFR level', () => {
      expect(topics.has(t.topic)).toBe(true);
      expect(Object.values(DifficultyLevel)).toContain(t.cefrLevel);
      expect(t.name.trim()).not.toBe('');
    });
  });
});
