import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  insert: vi.fn(),
  rows: [] as unknown[],
  error: null as { message: string } | null,
  calls: [] as string[],
}));

vi.mock('../supabaseClient', () => {
  const query = {
    select: () => query,
    eq: (col: string, v: string) => (db.calls.push(`eq ${col}=${v}`), query),
    order: () => query,
    limit: () => Promise.resolve({ data: db.rows, error: db.error }),
    maybeSingle: () => Promise.resolve({ data: db.rows[0] ?? null, error: db.error }),
    delete: () => query,
    insert: (row: unknown) => Promise.resolve(db.insert(row) ?? { error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ error: db.error }),
  };
  return { supabase: { from: (t: string) => (db.calls.push(`from ${t}`), query) } };
});

const invoke = vi.hoisted(() => vi.fn());
vi.mock('../aiClient', async (orig) => ({ ...(await orig<typeof import('../aiClient')>()), invokeAi: invoke }));

import { getReadingTest, READING_TESTS, type ReadingPassage } from '../../data/ielts/reading';
import { readingGroupKind } from '../../components/ielts/questions/questionLogic';
import { BadRequest } from '../../supabase/functions/ai-proxy/lib.ts';
import {
  finalizeReadingPassage,
  generatedPassageProblems,
  generateReadingPassage,
  GENERATED_KINDS,
  MAX_WANTED_KINDS,
  normalizeGeneratedPassage,
  parsePlanKey,
  parseReadingGenerateRequest,
  planKey,
  readingPlan,
  type GeneratedKind,
} from '../../supabase/functions/ai-proxy/ops/readingGenerate.ts';
import { PASSAGE_QUESTIONS } from '../../supabase/functions/ai-proxy/ops/readingRules.ts';
import {
  generatedReadingProblems,
  generatedReadingRowId,
  generatedReadingTest,
  generatedReadingTestId,
  isGeneratedReadingTestId,
  ReadingCheckError,
  rowToGeneratedReading,
  storedReading,
  toGeneratedItem,
} from '../readingGenerationLogic';
import { deleteGeneratedReading, generateReading, getGeneratedReading, loadGeneratedReadingTest } from '../readingGenerationService';
import { validateReadingTest } from '../readingLogic';

const passage = (testId: string, passageId: string): ReadingPassage => getReadingTest(testId)!.passages.find((p) => p.id === passageId)!;

/** A bundled passage written out the way the model returns it. */
function rawFrom(p: ReadingPassage, difficulty: string = p.difficulty) {
  const plan = p.groups.map((g) => ({ kind: readingGroupKind(g) as GeneratedKind, count: g.questions.length }));
  return {
    blueprint: planKey(plan),
    part: String(p.part),
    difficulty,
    title: p.title,
    subtitle: p.subtitle ?? '',
    topic: 'history',
    summaryVi: 'Bài đọc mẫu.',
    paragraphs: p.paragraphs.map((x) => x.text),
    glossary: p.glossary ?? [],
    groups: p.groups.map((g) => {
      const kind = readingGroupKind(g);
      const any = g as unknown as Record<string, unknown>;
      const options = any.headings ?? any.wordBox ?? (kind === 'matching_paragraph' ? [] : any.options) ?? [];
      return {
        kind,
        title: any.title ?? '',
        // Bundled tables become one line per row, the way the generator writes them.
        lines: (any.lines as string[] | undefined) ?? (any.table as { rows: string[][] } | undefined)?.rows.map((r) => r.join(' | ')) ?? [],
        prompt: any.prompt ?? '',
        optionsTitle: any.optionsTitle ?? '',
        options,
        questions: g.questions.map((q) => ({
          number: q.number,
          prompt: q.prompt ?? '',
          options: q.options ?? [],
          answers: q.answers,
          paragraph: q.paragraph,
          evidence: q.evidence,
          distractor: q.distractor ?? '',
          paraphraseQuestion: q.paraphrase?.question ?? '',
          paraphrasePassage: q.paraphrase?.passage ?? '',
          explanationVi: q.explanationVi,
          skill: q.skill as string,
        })),
      };
    }),
  };
}

// tfng×6, completion×4, short_answer×3: also what readingPlan(1, those kinds) makes.
const TFNG_KINDS: GeneratedKind[] = ['tfng', 'completion', 'short_answer'];
const sample = () => rawFrom(passage('reading-test-1', 'rt1-p1'), 'medium');

describe('readingPlan', () => {
  it('gives each part its usual mix of about 13 questions', () => {
    for (const part of [1, 2, 3] as const) {
      const plan = readingPlan(part);
      const total = plan.reduce((n, g) => n + g.count, 0);
      expect(total).toBeGreaterThanOrEqual(13);
      expect(total).toBeLessThanOrEqual(14);
      expect(plan.length).toBe(3);
    }
  });

  it('keeps the kinds asked for, in exam order, and ignores unknown ones', () => {
    expect(readingPlan(1, TFNG_KINDS)).toEqual([
      { kind: 'tfng', count: 6 },
      { kind: 'completion', count: 4 },
      { kind: 'short_answer', count: 3 },
    ]);
    expect(readingPlan(2, ['tfng', 'headings', 'diagram', 'nope'] as GeneratedKind[]).map((g) => g.kind)).toEqual(['headings', 'tfng']);
  });

  it('adds a kind when the ones asked for cannot reach the question count', () => {
    const plan = readingPlan(2, ['mcq_multi']);
    expect(plan[0].kind).not.toBe('mcq_multi');
    expect(plan.map((g) => g.kind)).toContain('mcq_multi');
    expect(plan.find((g) => g.kind === 'mcq_multi')!.count).toBe(2);
  });

  it('stays within the passage question range for every choice of up to three kinds', () => {
    const k = GENERATED_KINDS;
    const choices: GeneratedKind[][] = [];
    for (let a = 0; a < k.length; a++) {
      choices.push([k[a]]);
      for (let b = a + 1; b < k.length; b++) {
        choices.push([k[a], k[b]]);
        for (let c = b + 1; c < k.length; c++) choices.push([k[a], k[b], k[c]]);
      }
    }
    for (const part of [1, 2, 3] as const) {
      for (const kinds of choices) {
        const plan = readingPlan(part, kinds);
        const total = plan.reduce((n, g) => n + g.count, 0);
        expect(total, `${part} ${kinds}`).toBeGreaterThanOrEqual(PASSAGE_QUESTIONS.min);
        expect(total, `${part} ${kinds}`).toBeLessThanOrEqual(PASSAGE_QUESTIONS.max);
        for (const want of kinds) expect(plan.map((g) => g.kind)).toContain(want);
        expect(parsePlanKey(planKey(plan))).toEqual(plan);
      }
    }
  });

  it('reads a plan key back, and rejects broken ones', () => {
    expect(parsePlanKey('tfng×5,mcq×4')).toEqual([
      { kind: 'tfng', count: 5 },
      { kind: 'mcq', count: 4 },
    ]);
    expect(parsePlanKey('tfng×0')).toBeNull();
    expect(parsePlanKey('diagram×4')).toBeNull();
    expect(parsePlanKey('')).toBeNull();
    expect(parsePlanKey(3)).toBeNull();
  });
});

describe('generateReadingPassage request', () => {
  it('checks the part and the kinds', () => {
    expect(() => parseReadingGenerateRequest({ part: 4 })).toThrow(BadRequest);
    expect(() => parseReadingGenerateRequest({ part: 1, kinds: ['tfng', 'mcq', 'headings', 'flowchart'] })).toThrow(BadRequest);
    expect(() => parseReadingGenerateRequest({ part: 1, kinds: ['diagram'] })).toThrow(BadRequest);
    expect(() => parseReadingGenerateRequest({ part: 1, kinds: 'tfng' })).toThrow(BadRequest);
    expect(parseReadingGenerateRequest({ part: '2', kinds: ['mcq', 'mcq'], topic: '  Bees ', difficulty: 'nope' })).toEqual({
      part: 2,
      difficulty: 'medium',
      topic: 'Bees',
      kinds: ['mcq'],
    });
    expect(MAX_WANTED_KINDS).toBe(3);
  });

  it('asks for the plan it will check, numbered from 1', () => {
    const req = generateReadingPassage.build({ part: 1, difficulty: 'hard', kinds: TFNG_KINDS, topic: 'Salt' });
    const schema = req.generationConfig.responseSchema as { properties: Record<string, { enum?: string[] }> };
    expect(schema.properties.blueprint.enum).toEqual(['tfng×6,completion×4,short_answer×3']);
    expect(schema.properties.difficulty.enum).toEqual(['hard']);
    const prompt = (req.contents[0].parts[0] as { text: string }).text;
    expect(prompt).toContain('questions 1-6');
    expect(prompt).toContain('questions 11-13');
    expect(prompt).toContain('"Salt"');
    expect(prompt).toContain('number runs from 1 to 13');
  });
});

describe('finalizeReadingPassage', () => {
  it('accepts a well-formed passage and fills in labels, instructions and minutes', () => {
    const g = finalizeReadingPassage(sample());
    expect(g.plan).toEqual(readingPlan(1, TFNG_KINDS));
    expect(g.summaryVi).toBe('Bài đọc mẫu.');
    expect(g.passage.paragraphs.map((p) => p.label).join('')).toMatch(/^ABCDE/);
    expect(g.passage.suggestedMinutes).toBe(17);
    expect(g.passage.groups[0]).toMatchObject({ type: 'tfng', variant: 'tfng', id: 'gen-r1-g1' });
    expect(g.passage.groups[0].instruction).toContain('TRUE, FALSE or NOT GIVEN');
    expect(g.passage.groups[1]).toMatchObject({ type: 'completion', wordLimit: 2, numberAllowed: false });
    expect(g.passage.groups[2]).toMatchObject({ type: 'short_answer', wordLimit: 3, numberAllowed: true });
  });

  it('accepts headings, matching and choice passages', () => {
    for (const [t, p] of [
      ['reading-practice-museums', 'rp-museums'],
      ['reading-practice-wayfinding', 'rp-wayfinding'],
    ]) {
      const g = finalizeReadingPassage(rawFrom(passage(t, p), 'medium'));
      const headings = g.passage.groups.find((x) => x.type === 'headings')!;
      expect(headings.headings![0].key).toBe('i');
      expect(headings.instruction).toMatch(/paragraphs, A–[A-H]/);
    }
  });

  it('repairs what models often get slightly wrong', () => {
    const raw = sample();
    raw.paragraphs[0] = `[A] ${raw.paragraphs[0]}`;
    raw.paragraphs[1] = `B. ${raw.paragraphs[1]}`;
    const tf = raw.groups[0].questions;
    const ng = tf.findIndex((q) => q.answers[0] === 'NOT GIVEN');
    tf[ng].answers = ['Not given'];
    raw.glossary = [...raw.glossary, { term: 'zzzunused', meaningVi: 'không có trong bài' }];
    const g = normalizeGeneratedPassage(raw);
    expect(g.passage.paragraphs[0].text.startsWith('[A]')).toBe(false);
    expect(g.passage.paragraphs[1].text.startsWith('B.')).toBe(false);
    expect(g.passage.groups[0].questions[ng].answers).toEqual(['NOT GIVEN']);
    expect(g.passage.glossary.some((e) => e.term === 'zzzunused')).toBe(false);
    expect(generatedPassageProblems(g)).toEqual([]);
  });

  it('shares the letters of a "Choose TWO" group', () => {
    const raw = rawFrom(passage('reading-practice-seeds', 'rp-seeds'));
    const multi = raw.groups.find((g) => g.kind === 'mcq_multi')!;
    const [a, b] = multi.questions[0].answers;
    multi.questions[0].answers = [a];
    multi.questions[1].answers = [b.toLowerCase()];
    const g = normalizeGeneratedPassage(raw).passage.groups.find((x) => x.type === 'mcq_multi')!;
    expect(g.questions.map((q) => q.answers)).toEqual([[a, b].sort(), [a, b].sort()]);
  });

  const fails = (mutate: (raw: ReturnType<typeof sample>) => void, message: RegExp) => {
    const raw = sample();
    mutate(raw);
    expect(() => finalizeReadingPassage(raw)).toThrow(message);
  };

  it('rejects a passage that does not follow its blueprint', () => {
    fails((r) => r.groups.pop(), /expected \[tfng×6,completion×4,short_answer×3\]/);
    fails((r) => (r.blueprint = 'nonsense'), /no blueprint/);
    fails((r) => (r.part = '5'), /no valid part/);
  });

  it('rejects a passage of the wrong length', () => {
    const short = sample();
    short.paragraphs = short.paragraphs.map((p) => p.split(' ').slice(0, 60).join(' '));
    expect(() => finalizeReadingPassage(short)).toThrow(/words \(700-950\)/);
    fails((r) => r.paragraphs.splice(5), /needs 5-8 paragraphs|words/);
  });

  it('rejects broken questions', () => {
    fails((r) => (r.groups[0].questions[0].evidence = 'words that are nowhere in the passage'), /evidence is not in paragraph/);
    fails((r) => r.groups[0].questions.forEach((q) => (q.answers = ['TRUE'])), /needs at least one NOT GIVEN/);
    fails((r) => (r.groups[0].questions[0].skill = 'guessing'), /unknown skill/);
    fails((r) => {
      const q = r.groups[1].questions[0];
      r.groups[1].lines = r.groups[1].lines.map((l: string) => l.replace(`{{${q.number}}}`, `${q.answers[0]} {{${q.number}}}`));
    }, /line already shows the answer/);
  });

  it('rejects a headings group that reuses a heading or a paragraph', () => {
    const reused = rawFrom(passage('reading-practice-museums', 'rp-museums'), 'medium');
    const headings = reused.groups.find((g) => g.kind === 'headings')!;
    headings.questions[1].answers = headings.questions[0].answers;
    expect(() => finalizeReadingPassage(reused)).toThrow(/a heading is used more than once/);

    const twice = rawFrom(passage('reading-practice-museums', 'rp-museums'), 'medium');
    const other = twice.groups.find((g) => g.kind === 'headings')!;
    other.questions[1].paragraph = other.questions[0].paragraph;
    expect(() => finalizeReadingPassage(twice)).toThrow(/a paragraph is asked about more than once/);
  });

  it('asks harder passages for distractors', () => {
    const raw = rawFrom(passage('reading-test-1', 'rt1-p1'), 'hard');
    raw.groups.forEach((g) => g.questions.forEach((q) => (q.distractor = '')));
    expect(() => finalizeReadingPassage(raw)).toThrow(/hard needs at least 3 distractors/);
    raw.difficulty = 'easy';
    expect(() => finalizeReadingPassage(raw)).not.toThrow();
  });
});

describe('readingGenerationLogic', () => {
  const g = () => finalizeReadingPassage(sample());
  const id = '0f4c2a9e-1111-4222-8333-444455556666';

  it('makes ids that round-trip and do not clash with other tests', () => {
    expect(generatedReadingTestId(id)).toBe(`rgen_${id}`);
    expect(isGeneratedReadingTestId(`rgen_${id}`)).toBe(true);
    expect(isGeneratedReadingTestId('gen_x')).toBe(false);
    expect(isGeneratedReadingTestId('rlib_x')).toBe(false);
    expect(generatedReadingRowId(`rgen_${id}`)).toBe(id);
  });

  it('checks the result against the request', () => {
    expect(generatedReadingProblems(g(), 1, TFNG_KINDS)).toEqual([]);
    expect(generatedReadingProblems(g(), 1)).toEqual([]);
    expect(generatedReadingProblems(g(), 2)).toEqual(['expected Part 2, got Part 1']);
    expect(generatedReadingProblems(g(), 1, ['mcq'])[0]).toMatch(/is not the one asked for/);
    expect(generatedReadingProblems(g(), 1, TFNG_KINDS, 'medium')).toEqual([]);
    expect(generatedReadingProblems(g(), 1, TFNG_KINDS, 'hard')).toEqual(['expected hard, got medium']);
    expect(generatedReadingProblems(null, 1)).toEqual(['not a generated Reading passage']);
    expect(generatedReadingProblems({ plan: [], passage: {} }, 1)).toEqual(['not a generated Reading passage']);
  });

  it('opens as a one-passage practice test with its own passage id', () => {
    const item = toGeneratedItem(id, g(), { topic: 'Salt', createdAt: '2026-10-18T10:00:00Z', saved: true });
    expect(item.passage.id).toBe('rgen-0f4c2a9e11');
    expect(item.passage.groups.every((x) => x.id.startsWith('rgen-0f4c2a9e11-g'))).toBe(true);
    const test = generatedReadingTest(item);
    expect(test).toMatchObject({ id: `rgen_${id}`, kind: 'practice', title: item.passage.title });
    expect(test.descriptionVi).toBe('Đề AI tạo, mức vừa. Bài đọc mẫu.');
    expect(validateReadingTest(test)).toEqual([]);
  });

  it('stores and reads back the same item', () => {
    const item = toGeneratedItem(id, g(), { topic: 'Salt', createdAt: '2026-10-18T10:00:00Z', saved: true });
    const row = { id, part: 1, topic: 'Salt', difficulty: 'medium', passage: JSON.parse(JSON.stringify(storedReading(item))), created_at: item.createdAt };
    expect(rowToGeneratedReading(row)).toEqual(item);
    expect(rowToGeneratedReading({ ...row, topic: null })!.topic).toBe('');
    expect(rowToGeneratedReading({ ...row, passage: { plan: [], passage: { ...item.passage, groups: [] } } })).toBeNull();
  });
});

describe('readingGenerationService', () => {
  beforeEach(() => {
    db.insert.mockReset();
    db.rows = [];
    db.error = null;
    db.calls = [];
    invoke.mockReset();
  });

  const req = { part: 1 as const, topic: '  Salt  ', difficulty: 'medium' as const, kinds: TFNG_KINDS };

  it('generates, checks, saves and registers a passage', async () => {
    invoke.mockResolvedValue(finalizeReadingPassage(sample()));
    const item = await generateReading('user-1', req);
    expect(invoke).toHaveBeenCalledWith(
      'generateReadingPassage',
      { part: 1, topic: 'Salt', difficulty: 'medium', kinds: TFNG_KINDS },
      // The op can retry and fall back, so the client waits longer than the 90 s default.
      { timeoutMs: expect.any(Number) },
    );
    expect(invoke.mock.calls[0][2].timeoutMs).toBeGreaterThan(240_000);
    expect(item.saved).toBe(true);
    const row = db.insert.mock.calls[0][0];
    expect(row).toMatchObject({ id: item.id, user_id: 'user-1', part: 1, topic: 'Salt', difficulty: 'medium' });
    expect(row.passage.passage.id).toBe(item.passage.id);
    expect(getReadingTest(generatedReadingTestId(item.id))?.passages[0].id).toBe(item.passage.id);
  });

  it('keeps the passage for this visit when it cannot be saved', async () => {
    invoke.mockResolvedValue(finalizeReadingPassage(sample()));
    db.insert.mockReturnValue({ error: { message: 'relation "reading_generated" does not exist' } });
    expect((await generateReading('user-1', req)).saved).toBe(false);
    expect((await generateReading('', req)).saved).toBe(false);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('refuses a result that fails the app checks', async () => {
    const bad = finalizeReadingPassage(sample());
    bad.passage.groups[0].questions[0].evidence = 'not in the passage at all';
    invoke.mockResolvedValue(bad);
    await expect(generateReading('user-1', req)).rejects.toBeInstanceOf(ReadingCheckError);
    invoke.mockResolvedValue(finalizeReadingPassage(sample()));
    await expect(generateReading('user-1', { ...req, kinds: ['mcq'] })).rejects.toBeInstanceOf(ReadingCheckError);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('lists, loads and deletes stored passages', async () => {
    const id = '9a9a9a9a-0000-4000-8000-000000000000';
    const item = toGeneratedItem(id, finalizeReadingPassage(sample()), { topic: '', createdAt: '2026-10-18T10:00:00Z', saved: true });
    const row = { id, part: 1, topic: null, difficulty: 'medium', passage: storedReading(item), created_at: item.createdAt };
    db.rows = [row, { ...row, id: 'broken', passage: {} }];
    expect((await getGeneratedReading('user-1')).map((g) => g.id)).toEqual([id]);
    expect(await getGeneratedReading('')).toEqual([]);

    db.rows = [row];
    const test = await loadGeneratedReadingTest(generatedReadingTestId(id));
    expect(test?.id).toBe(`rgen_${id}`);
    expect(await loadGeneratedReadingTest('rlib_x')).toBeNull();

    expect(await deleteGeneratedReading(id)).toBe(true);
    expect(getReadingTest(`rgen_${id}`)).toBeUndefined();
    db.error = { message: 'nope' };
    expect(await deleteGeneratedReading(id)).toBe(false);
    expect(await getGeneratedReading('user-1')).toEqual([]);
  });

  it('never registers over a bundled test', () => {
    expect(READING_TESTS.some((t) => isGeneratedReadingTestId(t.id))).toBe(false);
  });
});
