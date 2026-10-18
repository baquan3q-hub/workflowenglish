import { describe, expect, it, vi } from 'vitest';
import { cleanSelection, glossaryMatch, selectionKind, sentenceAt } from '../readingTools';
import { explainReading } from '../readingExplainService';
import { finalizeExplain, parseExplainRequest, readingExplain } from '../../supabase/functions/ai-proxy/ops/readingExplain.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { READING_TESTS } from '../../data/ielts/reading';

describe('selectionKind', () => {
  it('treats up to four words as a word lookup and more as a sentence', () => {
    expect(selectionKind('colonies')).toBe('word');
    expect(selectionKind(' “green roofs,” ')).toBe('word');
    expect(selectionKind('as a matter of')).toBe('word');
    expect(selectionKind('the loss of wild flowers from the countryside')).toBe('sentence');
  });

  it('ignores empty, number-only and very long selections', () => {
    expect(selectionKind('  ')).toBeNull();
    expect(selectionKind('3,000')).toBeNull();
    expect(selectionKind(' – ')).toBeNull();
    expect(selectionKind('word '.repeat(150))).toBeNull();
  });

  it('cleans edge punctuation and spacing', () => {
    expect(cleanSelection('  (wind farms),\n  ')).toBe('wind farms');
    expect(cleanSelection('a  b\nc.')).toBe('a b c');
  });
});

describe('glossaryMatch', () => {
  const glossary = [
    { term: 'colony', meaningVi: 'đàn' },
    { term: 'drift', meaningVi: 'trôi dạt' },
    { term: 'as a matter of course', meaningVi: 'như lẽ đương nhiên' },
  ];

  it('matches regardless of case, punctuation and simple inflections', () => {
    expect(glossaryMatch(glossary, 'Colony,')?.meaningVi).toBe('đàn');
    expect(glossaryMatch(glossary, 'colonies')?.term).toBe('colony');
    expect(glossaryMatch(glossary, 'drifted')?.term).toBe('drift');
    expect(glossaryMatch(glossary, 'As a matter of course')?.term).toBe('as a matter of course');
  });

  it('finds nothing for other words or a missing glossary', () => {
    expect(glossaryMatch(glossary, 'col')).toBeUndefined();
    expect(glossaryMatch(undefined, 'colony')).toBeUndefined();
  });

  it('every bundled glossary term is unique within its passage', () => {
    for (const p of READING_TESTS.flatMap((t) => t.passages)) {
      const terms = (p.glossary ?? []).map((g) => g.term.toLowerCase());
      expect(new Set(terms).size, p.id).toBe(terms.length);
    }
  });
});

describe('sentenceAt', () => {
  const text = 'Hives in Paris produce 3.5 kg more. Wind is a problem! Bees need water.';

  it('returns the sentence around a selection', () => {
    const at = text.indexOf('problem');
    expect(sentenceAt(text, at, at + 7)).toBe('Wind is a problem!');
    expect(sentenceAt(text, 0, 5)).toBe('Hives in Paris produce 3.5 kg more.');
    expect(sentenceAt(text, text.length - 3, text.length)).toBe('Bees need water.');
  });

  it('keeps every sentence a selection spans', () => {
    const a = text.indexOf('more');
    expect(sentenceAt(text, a, text.indexOf('Wind') + 4)).toBe('Hives in Paris produce 3.5 kg more. Wind is a problem!');
  });

  it('stops at a selected full stop', () => {
    const a = text.indexOf('Wind');
    expect(sentenceAt(text, a, text.indexOf('!') + 1)).toBe('Wind is a problem!');
  });
});

describe('readingExplain op', () => {
  const context = 'Bees also need water, particularly in hot weather.';

  it('is registered, open to all users and limited to 30 an hour', () => {
    expect(OPS.readingExplain).toBe(readingExplain);
    expect(readingExplain.adminOnly).toBeFalsy();
    expect(readingExplain.hourlyLimit).toBe(30);
  });

  it('builds a word and a sentence prompt with the context', () => {
    const w = JSON.stringify(readingExplain.build({ mode: 'word', text: 'particularly', context }).contents);
    expect(w).toContain('particularly');
    expect(w).toContain('meaningVi');
    const s = JSON.stringify(readingExplain.build({ mode: 'sentence', text: context, context }).contents);
    expect(s).toContain('translationVi');
  });

  it('rejects bad payloads', () => {
    expect(() => parseExplainRequest({ mode: 'paragraph', text: 'x', context })).toThrow();
    expect(() => parseExplainRequest({ mode: 'word', text: '', context })).toThrow();
    expect(() => parseExplainRequest({ mode: 'word', text: 'x'.repeat(81), context })).toThrow();
    expect(() => parseExplainRequest({ mode: 'sentence', text: 'x', context: 'y'.repeat(2501) })).toThrow();
    expect(() => parseExplainRequest({ mode: 'word', text: 'x' })).toThrow();
  });

  it('keeps well-formed output and needs a meaning or a translation', () => {
    const out = finalizeExplain({
      headword: ' colony ',
      meaningVi: 'đàn',
      vocab: [{ term: 'colonise', meaningVi: 'chiếm' }, { term: '', meaningVi: 'x' }, 'junk'],
      paraphrases: ['colony ≈ group', '', 3],
      structureVi: 'not a list',
    });
    expect(out).toMatchObject({ headword: 'colony', meaningVi: 'đàn', translationVi: '', structureVi: [] });
    expect(out.vocab).toEqual([{ term: 'colonise', meaningVi: 'chiếm' }]);
    expect(out.paraphrases).toEqual(['colony ≈ group']);
    expect(() => finalizeExplain({ headword: 'x' })).toThrow();
    expect(() => finalizeExplain(null)).toThrow();
  });
});

describe('explainReading', () => {
  const result = { headword: 'x', partOfSpeech: '', meaningVi: 'y', translationVi: '', structureVi: [], vocab: [], paraphrases: [] };

  it('asks once for the same selection and context', async () => {
    const api = vi.fn().mockResolvedValue(result);
    await explainReading('word', 'Unique-A', 'ctx-a', api);
    await explainReading('word', 'unique-a', 'ctx-a', api);
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith('readingExplain', { mode: 'word', text: 'Unique-A', context: 'ctx-a' }, expect.any(Object));
  });

  it('asks again after a failure', async () => {
    const api = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(result);
    await expect(explainReading('sentence', 'unique-b', 'ctx-b', api)).rejects.toThrow('down');
    await expect(explainReading('sentence', 'unique-b', 'ctx-b', api)).resolves.toEqual(result);
    expect(api).toHaveBeenCalledTimes(2);
  });
});
