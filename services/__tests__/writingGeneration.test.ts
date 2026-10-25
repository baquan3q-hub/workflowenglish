import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  insert: vi.fn(),
  rows: [] as unknown[],
  error: null as { message: string } | null,
}));

vi.mock('../supabaseClient', () => {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => Promise.resolve({ data: db.rows, error: db.error }),
    delete: () => query,
    insert: (row: unknown) => Promise.resolve(db.insert(row) ?? { error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ error: db.error }),
  };
  return { supabase: { from: () => query } };
});

const invoke = vi.hoisted(() => vi.fn());
vi.mock('../aiClient', async (orig) => ({ ...(await orig<typeof import('../aiClient')>()), invokeAi: invoke }));

import { BadRequest } from '../../supabase/functions/ai-proxy/lib.ts';
import {
  blueprintKey,
  finalizeWritingPrompt,
  generateWritingPrompt,
  generatedWritingProblems,
  normalizeGeneratedWriting,
  parseWritingGenerateRequest,
  resolveWritingType,
  writingPromptText,
} from '../../supabase/functions/ai-proxy/ops/writingGenerate.ts';
import {
  generatedWritingQuestionId,
  generatedWritingResultProblems,
  isGeneratedWritingQuestionId,
  rowToGeneratedWriting,
  toGeneratedWritingItem,
  WritingCheckError,
} from '../writingGenerationLogic';
import { deleteGeneratedWriting, draftWritingPrompt, generateWriting, getGeneratedWriting } from '../writingGenerationService';
import { getWritingQuestionById } from '../ieltsWritingService';

const task2Raw = (over: Record<string, unknown> = {}) => ({
  blueprint: 'task_2|discussion',
  difficulty: 'medium',
  topic: 'Education',
  summaryVi: 'Bàn về việc đại học nên dạy kiến thức hàn lâm hay kỹ năng nghề.',
  prompt:
    'Some people believe that universities should focus on academic subjects. Others think they should teach practical job skills. Discuss both views and give your own opinion.',
  planningPrompts: ['What is the first view?', 'What is the second view?', 'What is your opinion?', 'How will you conclude?'],
  vocabulary: ['curriculum', 'employability', 'vocational', 'theoretical', 'graduate'],
  ...over,
});

const task1Raw = (over: Record<string, unknown> = {}) => ({
  blueprint: 'task_1|line_graph',
  difficulty: 'medium',
  topic: 'Tourism',
  summaryVi: 'Mô tả số khách tham quan ba bảo tàng.',
  prompt:
    'The line graph below shows the number of visitors to three museums between 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  planningPrompts: ['What is the overall trend?', 'Which line is highest?', 'Where do lines cross?', 'What changes most?'],
  vocabulary: ['fluctuate', 'peak', 'overtake', 'steady growth'],
  chart: {
    title: 'Visitors to three museums (thousands)',
    labels: ['2010', '2012', '2014', '2016', '2018', '2020'],
    datasets: [
      { label: 'History', data: [10, 12, 15, 14, 18, 22] },
      { label: 'Science', data: [8, 9, 14, 18, 20, 19] },
    ],
  },
  ...over,
});

describe('generateWritingPrompt request', () => {
  it('needs a task and checks the type', () => {
    expect(() => parseWritingGenerateRequest({})).toThrow(BadRequest);
    expect(() => parseWritingGenerateRequest({ task: 'task_3' })).toThrow(BadRequest);
    expect(() => parseWritingGenerateRequest({ task: 'task_1', questionType: 'opinion' })).toThrow(BadRequest);
    expect(() => parseWritingGenerateRequest({ task: 'task_2', questionType: 'map' })).toThrow(BadRequest);
    expect(parseWritingGenerateRequest({ task: 'task_2', questionType: 'opinion', topic: ' Bees ', difficulty: 'nope' })).toEqual({
      task: 'task_2',
      questionType: 'opinion',
      topic: 'Bees',
      difficulty: 'medium',
    });
  });

  it('picks a type when none is asked for', () => {
    expect(resolveWritingType({ task: 'task_1', questionType: 'table', topic: '', difficulty: 'easy' }, 0.99)).toBe('table');
    expect(resolveWritingType({ task: 'task_1', questionType: '', topic: '', difficulty: 'easy' }, 0)).toBe('line_graph');
    expect(resolveWritingType({ task: 'task_1', questionType: '', topic: '', difficulty: 'easy' }, 0.99)).toBe('table');
    expect(resolveWritingType({ task: 'task_2', questionType: '', topic: '', difficulty: 'easy' }, 0.5)).toBe('problem_solution');
  });

  it('asks for the plan it will check, with chart data only for Task 1', () => {
    const t1 = generateWritingPrompt.build({ task: 'task_1', questionType: 'pie_chart', difficulty: 'hard', topic: 'Salt' });
    const s1 = t1.generationConfig.responseSchema as { properties: Record<string, { enum?: string[] }> };
    expect(s1.properties.blueprint.enum).toEqual(['task_1|pie_chart']);
    expect(s1.properties.difficulty.enum).toEqual(['hard']);
    expect(s1.properties.chart).toBeDefined();
    expect((t1.contents[0].parts[0] as { text: string }).text).toContain('add up to exactly 100');
    expect((t1.contents[0].parts[0] as { text: string }).text).toContain('"Salt"');
    const t2 = generateWritingPrompt.build({ task: 'task_2', questionType: 'discussion' });
    expect((t2.generationConfig.responseSchema as { properties: Record<string, unknown> }).properties.chart).toBeUndefined();
    expect(writingPromptText({ task: 'task_2', questionType: '', topic: '', difficulty: 'easy' }, 'opinion')).toContain('To what extent do you agree or disagree');
    expect(blueprintKey('task_2', 'opinion')).toBe('task_2|opinion');
  });
});

describe('finalizeWritingPrompt', () => {
  it('accepts a good Task 2 and a good Task 1', () => {
    const g2 = finalizeWritingPrompt(task2Raw());
    expect(g2).toMatchObject({ task: 'task_2', question: { questionType: 'discussion', targetBand: '6.0-7.0', difficulty: 'medium' } });
    expect(g2.question.chartData).toBeUndefined();
    const g1 = finalizeWritingPrompt(task1Raw({ difficulty: 'hard' }));
    expect(g1.question).toMatchObject({ questionType: 'line_graph', targetBand: '7.0-8.0', difficulty: 'hard' });
    expect(g1.question.chartData?.type).toBe('line');
  });

  it('takes the chart drawing from the blueprint, and keeps a bad number visible', () => {
    const n = normalizeGeneratedWriting(task1Raw({ blueprint: 'task_1|bar_chart' }));
    expect(n.question.chartData?.type).toBe('bar');
    const bad = normalizeGeneratedWriting(task1Raw({ chart: { title: 't', labels: ['a', 'b'], datasets: [{ label: 'x', data: [1, 'two'] }] } }));
    expect(Number.isNaN(bad.question.chartData!.datasets[0].data[1])).toBe(true);
  });

  const fails = (raw: unknown, message: RegExp) => expect(() => finalizeWritingPrompt(raw)).toThrow(message);

  it('rejects what the rules reject', () => {
    fails(task2Raw({ blueprint: 'nonsense' }), /no blueprint/);
    fails(task2Raw({ prompt: 'Too short?' }), /too short/);
    fails(task2Raw({ prompt: 'Universities are important places where many young people study for years and years.' }), /ends with what the candidate must do/);
    fails(task2Raw({ planningPrompts: ['one'] }), /planning hints/);
    fails(task2Raw({ vocabulary: [] }), /vocabulary items/);
    fails(task2Raw({ summaryVi: '' }), /Vietnamese summary/);
    fails(task2Raw({ blueprint: 'task_2|two_part', prompt: 'Many people now work from home instead of in an office. Is this a good development for workers?' }), /two questions/);
    fails(task1Raw({ prompt: 'The graph below is about visitors to three museums. Summarise the information by selecting the main features.' }), /name the line graph/);
    fails(task1Raw({ chart: { title: 'Visitors', labels: ['2010'], datasets: [{ label: 'a', data: [1] }] } }), /needs 2-8 labels/);
    fails(task1Raw({ chart: { title: 'Visitors', labels: ['a', 'b'], datasets: [{ label: 'a', data: [1] }] } }), /1 values|has 1 values for 2 labels/);
    fails(
      task1Raw({
        blueprint: 'task_1|pie_chart',
        prompt: 'The pie chart below shows how a city spends its budget. Summarise the information by selecting and reporting the main features.',
        chart: { title: 'Budget', labels: ['a', 'b', 'c'], datasets: [{ label: 's', data: [50, 30, 20] }] },
      }),
      /should say \(%\)/,
    );
    fails(
      task1Raw({
        blueprint: 'task_1|pie_chart',
        prompt: 'The pie chart below shows how a city spends its budget. Summarise the information by selecting and reporting the main features.',
        chart: { title: 'Budget (%)', labels: ['a', 'b', 'c'], datasets: [{ label: 's', data: [50, 30, 10] }] },
      }),
      /adds up to 90/,
    );
  });

  it('puts the failure count and first problems in the message', () => {
    expect(() => finalizeWritingPrompt(task2Raw({ prompt: 'x', vocabulary: [] }))).toThrow(/^generated prompt failed 3 check\(s\): /);
    expect(generatedWritingProblems(finalizeWritingPrompt(task2Raw()), { task: 'task_2', questionType: 'opinion' })[0]).toMatch(/expected task_2 opinion, got task_2 discussion/);
  });
});

describe('writingGenerationLogic', () => {
  const id = '0f4c2a9e-1111-4222-8333-444455556666';
  const good = () => finalizeWritingPrompt(task2Raw());

  it('names ids so they never clash with the bank or the library', () => {
    expect(generatedWritingQuestionId(id)).toBe(`wgen_${id}`);
    expect(isGeneratedWritingQuestionId(`wgen_${id}`)).toBe(true);
    expect(isGeneratedWritingQuestionId('wlib_x')).toBe(false);
  });

  it('checks a result against the request', () => {
    const req = { task: 'task_2' as const, questionType: 'discussion', difficulty: 'medium' as const };
    expect(generatedWritingResultProblems(good(), req)).toEqual([]);
    expect(generatedWritingResultProblems(good(), { ...req, questionType: '' })).toEqual([]);
    expect(generatedWritingResultProblems(good(), { ...req, task: 'task_1' })).toEqual(['expected task_1, got task_2']);
    expect(generatedWritingResultProblems(good(), { ...req, difficulty: 'hard' })).toEqual(['expected hard, got medium']);
    expect(generatedWritingResultProblems(good(), { ...req, questionType: 'opinion' })).toEqual(['expected opinion, got discussion']);
    expect(generatedWritingResultProblems(null)).toEqual(['not a generated Writing prompt']);
    expect(generatedWritingResultProblems({ task: 'task_2', summaryVi: 's', question: { prompt: 'x', difficulty: 'wild' } })[0]).toMatch(/unknown difficulty/);
  });

  it('turns a result into a prompt with its own id, framework and chart', () => {
    const item = toGeneratedWritingItem(id, finalizeWritingPrompt(task1Raw()), { topic: '', createdAt: '2026-10-25T10:00:00Z', saved: true });
    expect(item.question).toMatchObject({ id: `wgen_${id}`, skill: 'writing', taskOrPart: 'task_1', questionType: 'line_graph', frameworkId: 'fw_peel' });
    expect(item.question.chartData).toBeDefined();
    expect(item.topic).toBe('Tourism');
    expect(toGeneratedWritingItem(id, good(), { topic: 'Fees', createdAt: 'c', saved: false }).topic).toBe('Fees');
  });

  it('reads a stored row, and drops one that no longer passes', () => {
    const g = good();
    const row = { id, task: 'task_2', topic: null, difficulty: 'medium', question: JSON.parse(JSON.stringify(g)), created_at: '2026-10-25T10:00:00Z' };
    expect(rowToGeneratedWriting(row)?.question.prompt).toBe(g.question.prompt);
    expect(rowToGeneratedWriting({ ...row, question: { ...g, question: { ...g.question, prompt: 'x' } } })).toBeNull();
    expect(rowToGeneratedWriting({ ...row, question: {} })).toBeNull();
  });
});

describe('writingGenerationService', () => {
  beforeEach(() => {
    db.insert.mockReset();
    db.rows = [];
    db.error = null;
    invoke.mockReset();
  });

  const req = { task: 'task_2' as const, questionType: 'discussion', topic: '  Fees  ', difficulty: 'medium' as const };

  it('generates, checks, saves and registers a prompt', async () => {
    invoke.mockResolvedValue(finalizeWritingPrompt(task2Raw()));
    const item = await generateWriting('user-1', req);
    expect(invoke).toHaveBeenCalledWith(
      'generateWritingPrompt',
      { task: 'task_2', questionType: 'discussion', topic: 'Fees', difficulty: 'medium' },
      { timeoutMs: expect.any(Number) },
    );
    expect(invoke.mock.calls[0][2].timeoutMs).toBeGreaterThan(120_000);
    expect(item.saved).toBe(true);
    expect(db.insert.mock.calls[0][0]).toMatchObject({ id: item.id, user_id: 'user-1', task: 'task_2', topic: 'Fees', difficulty: 'medium' });
    expect(getWritingQuestionById(`wgen_${item.id}`)?.prompt).toBe(item.question.prompt);
  });

  it('keeps the prompt for this visit when it cannot be saved', async () => {
    invoke.mockResolvedValue(finalizeWritingPrompt(task2Raw()));
    db.insert.mockReturnValue({ error: { message: 'relation "writing_generated" does not exist' } });
    expect((await generateWriting('user-1', req)).saved).toBe(false);
    expect((await generateWriting('', req)).saved).toBe(false);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('refuses a result that fails the app checks or is for another request', async () => {
    const bad = finalizeWritingPrompt(task2Raw());
    bad.question.prompt = 'x';
    invoke.mockResolvedValue(bad);
    await expect(generateWriting('user-1', req)).rejects.toBeInstanceOf(WritingCheckError);
    invoke.mockResolvedValue(finalizeWritingPrompt(task2Raw()));
    await expect(generateWriting('user-1', { ...req, difficulty: 'hard' })).rejects.toBeInstanceOf(WritingCheckError);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('gives the admin a draft body without saving anything', async () => {
    invoke.mockResolvedValue(finalizeWritingPrompt(task1Raw()));
    const body = await draftWritingPrompt('task_1', 'line_graph');
    expect(body.questionType).toBe('line_graph');
    expect(body.chartData).toBeDefined();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('lists and deletes stored prompts', async () => {
    const g = finalizeWritingPrompt(task2Raw());
    const id = '9a9a9a9a-0000-4000-8000-000000000000';
    db.rows = [
      { id, task: 'task_2', topic: null, difficulty: 'medium', question: g, created_at: '2026-10-25T10:00:00Z' },
      { id: 'broken', task: 'task_2', topic: null, difficulty: 'medium', question: {}, created_at: 'x' },
    ];
    expect((await getGeneratedWriting('user-1')).map((x) => x.id)).toEqual([id]);
    expect(await getGeneratedWriting('')).toEqual([]);
    expect(getWritingQuestionById(`wgen_${id}`)).toBeDefined();
    expect(await deleteGeneratedWriting(id)).toBe(true);
    expect(getWritingQuestionById(`wgen_${id}`)).toBeUndefined();
    db.error = { message: 'nope' };
    expect(await deleteGeneratedWriting(id)).toBe(false);
    expect(await getGeneratedWriting('user-1')).toEqual([]);
  });
});
