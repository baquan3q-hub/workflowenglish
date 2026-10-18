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

import {
  deleteGeneratedListening,
  GeneratedCheckError,
  generatedProblems,
  generatedRowId,
  generatedTest,
  generatedTestId,
  generateListening,
  getGeneratedListening,
  isGeneratedTestId,
  loadGeneratedTest,
  rekeySection,
  rowToGenerated,
  type GeneratedListening,
} from '../listeningGenerationService';
import { finalizeListeningSection } from '../../supabase/functions/ai-proxy/ops/listeningGenerate.ts';
import { getListeningTest, LISTENING_TESTS, registerListeningTests, type ListeningSection } from '../../data/ielts/listening';
import { validateSection } from '../listeningLogic';
import { RAW_PART2, RAW_PART4 } from './listeningGenerate.fixtures';

const part2 = () => finalizeListeningSection(structuredClone(RAW_PART2)) as unknown as ListeningSection;
const part4 = () => finalizeListeningSection(structuredClone(RAW_PART4)) as unknown as ListeningSection;
const row = (id: string, section: unknown, extra: Record<string, unknown> = {}) => ({
  id,
  part: 2,
  topic: null,
  difficulty: 'medium',
  section,
  created_at: '2026-10-18T03:00:00Z',
  ...extra,
});

beforeEach(() => {
  db.insert.mockReset();
  db.rows = [];
  db.error = null;
  db.calls = [];
  invoke.mockReset();
});

describe('generated part helpers', () => {
  it('accepts the op output for its own part only', () => {
    expect(generatedProblems(part2(), 2)).toEqual([]);
    expect(generatedProblems(part2(), 3)).toEqual(['expected Part 3, got Part 2']);
    expect(generatedProblems(null, 2)).toEqual(['not a Listening section']);
    expect(generatedProblems({ part: 2 }, 2)).toEqual(['not a Listening section']);
    const broken = part4();
    broken.groups[0].questions[0].answers = ['nothing'];
    expect(generatedProblems(broken, 4).length).toBeGreaterThan(0);
  });

  it('gives a part ids of its own and keeps it valid', () => {
    const s = rekeySection(part2(), 'gen-ab12cd34');
    expect(s.id).toBe('gen-ab12cd34');
    expect(s.segments.map((x) => x.id)).toEqual(['gen-ab12cd34-s1', 'gen-ab12cd34-s2', 'gen-ab12cd34-s3', 'gen-ab12cd34-s4']);
    expect(s.groups.map((g) => g.id)).toEqual(['gen-ab12cd34-g1', 'gen-ab12cd34-g2', 'gen-ab12cd34-g3']);
    expect(s.groups[2].questions[0].segmentId).toBe('gen-ab12cd34-s4');
    expect(validateSection(s)).toEqual([]);
    expect(generatedProblems(s, 2)).toEqual([]);
  });

  it('wraps a part as a practice test that getListeningTest finds once registered', () => {
    const g: GeneratedListening = { id: 'r1', part: 2, topic: '', difficulty: 'hard', section: part2(), createdAt: '', saved: true };
    const test = generatedTest(g);
    expect(test).toMatchObject({ id: 'gen_r1', kind: 'practice', title: 'A visit to Hollybank Farm Park' });
    expect(test.descriptionVi.startsWith('Đề AI tạo, mức khó.')).toBe(true);
    expect(getListeningTest('gen_r1')).toBeUndefined();
    registerListeningTests([test]);
    expect(getListeningTest('gen_r1')).toBe(test);
    // A bundled test is never replaced.
    registerListeningTests([{ ...test, id: LISTENING_TESTS[0].id }]);
    expect(getListeningTest(LISTENING_TESTS[0].id)).toBe(LISTENING_TESTS[0]);
    expect(isGeneratedTestId('gen_r1')).toBe(true);
    expect(isGeneratedTestId(LISTENING_TESTS[0].id)).toBe(false);
    expect(generatedRowId(generatedTestId('abc'))).toBe('abc');
  });

  it('drops stored rows that no longer pass and defaults an odd difficulty', () => {
    expect(rowToGenerated(row('a', { part: 2 }))).toBeNull();
    expect(rowToGenerated(row('b', part2(), { part: 4 }))).toBeNull();
    expect(rowToGenerated(row('c', part2(), { difficulty: '??', topic: 'farm' }))).toMatchObject({
      id: 'c',
      difficulty: 'medium',
      topic: 'farm',
      saved: true,
    });
  });
});

describe('generateListening', () => {
  it('checks, saves and registers the part', async () => {
    invoke.mockResolvedValue(part2());
    const g = await generateListening('u1', { part: 2, topic: '  a farm park  ', difficulty: 'medium' });
    expect(invoke).toHaveBeenCalledWith('generateListeningSection', { part: 2, topic: 'a farm park', difficulty: 'medium' });
    expect(g).toMatchObject({ part: 2, topic: 'a farm park', difficulty: 'medium', saved: true });
    expect(g.section.id).toBe(`gen-${g.id.slice(0, 8)}`);
    const saved = db.insert.mock.calls[0][0];
    expect(saved).toMatchObject({ id: g.id, user_id: 'u1', part: 2, topic: 'a farm park', difficulty: 'medium' });
    expect(saved.section).toBe(g.section);
    expect(getListeningTest(generatedTestId(g.id))?.sections[0]).toBe(g.section);
  });

  it('keeps the part for this visit when it cannot be saved', async () => {
    invoke.mockResolvedValue(part4());
    db.insert.mockReturnValue({ error: { message: 'relation "listening_sections" does not exist' } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = await generateListening('u1', { part: 4, topic: '', difficulty: 'easy' });
    expect(g.saved).toBe(false);
    expect(db.insert.mock.calls[0][0].topic).toBeNull();
    expect(getListeningTest(generatedTestId(g.id))).toBeDefined();
    warn.mockRestore();
  });

  it('refuses a part that fails the app checks', async () => {
    invoke.mockResolvedValue({ ...part2(), part: 3 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(generateListening('u1', { part: 3, topic: '', difficulty: 'medium' })).rejects.toBeInstanceOf(GeneratedCheckError);
    expect(db.insert).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('stored parts', () => {
  it('lists valid rows, newest first as stored, and registers them', async () => {
    db.rows = [row('11111111-aaaa', rekeySection(part2(), 'gen-11111111')), row('bad', { part: 2 })];
    const list = await getGeneratedListening('u1');
    expect(list.map((g) => g.id)).toEqual(['11111111-aaaa']);
    expect(db.calls).toContain('eq user_id=u1');
    expect(getListeningTest('gen_11111111-aaaa')).toBeDefined();
    expect(await getGeneratedListening('')).toEqual([]);
  });

  it('returns nothing when the table is missing', async () => {
    db.error = { message: 'relation does not exist' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getGeneratedListening('u1')).toEqual([]);
    expect(await deleteGeneratedListening('x')).toBe(false);
    warn.mockRestore();
  });

  it('loads one test by id for an old attempt', async () => {
    expect(await loadGeneratedTest('listening-test-1')).toBeNull();
    db.rows = [row('22222222-bbbb', rekeySection(part2(), 'gen-22222222'))];
    const test = await loadGeneratedTest('gen_22222222-bbbb');
    expect(test?.id).toBe('gen_22222222-bbbb');
    expect(db.calls).toContain('eq id=22222222-bbbb');
    expect(getListeningTest('gen_22222222-bbbb')).toBe(test);
  });

  it('forgets a deleted test', async () => {
    registerListeningTests([generatedTest({ id: 'del1', part: 2, topic: '', difficulty: 'easy', section: part2(), createdAt: '', saved: true })]);
    expect(await deleteGeneratedListening('del1')).toBe(true);
    expect(getListeningTest('gen_del1')).toBeUndefined();
  });
});
