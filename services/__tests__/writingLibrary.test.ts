import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: null as { message: string } | null,
  upserted: [] as unknown[],
  deleted: [] as unknown[],
}));

vi.mock('../supabaseClient', () => {
  const result = () => Promise.resolve({ data: db.rows, error: db.error });
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => result(),
    upsert: (row: unknown) => (db.upserted.push(row), query),
    single: () => Promise.resolve({ data: db.rows[0] ?? null, error: db.error }),
    delete: () => query,
    then: (resolve: (v: unknown) => void) => resolve({ data: db.deleted, error: db.error }),
  };
  return { supabase: { from: () => query } };
});

import { writingTask2Questions } from '../../data/ieltsWritingQuestions';
import {
  TASK1_DATA_TYPES,
  chartProblems,
  writingQuestionProblems,
  type WritingChart,
} from '../../supabase/functions/ai-proxy/ops/writingRules.ts';
import {
  blankChart,
  duplicateWritingItem,
  emptyWritingItem,
  filterWritingLibrary,
  isWritingLibraryQuestionId,
  libraryWritingQuestion,
  parseSeriesText,
  rowToWritingItem,
  seriesToText,
  setWritingType,
  splitList,
  suggestWritingTitle,
  viProblem,
  writingItemProblems,
  writingItemRow,
  writingLibraryErrorText,
  writingLibraryQuestionId,
  writingLibraryRowId,
  type WritingLibraryItem,
} from '../writingLibraryLogic';
import { allWritingQuestions } from '../writingQuestionRegistry';
import { getWritingQuestionById, getWritingQuestions } from '../ieltsWritingService';
import { deleteWritingLibraryItem, getAllWritingLibrary, getPublishedWritingLibrary, saveWritingLibraryItem } from '../writingLibraryService';

const chart = (over: Partial<WritingChart> = {}): WritingChart => ({
  type: 'line',
  title: 'Visitors (millions)',
  labels: ['2010', '2015', '2020'],
  datasets: [{ label: 'North', data: [1, 2, 3] }],
  ...over,
});

const task1 = (id = 'a1'): WritingLibraryItem => {
  const item = emptyWritingItem(id, 'task_1');
  item.question = {
    ...item.question,
    topic: 'Tourism',
    prompt: 'The line graph below shows the number of visitors to three museums. Summarise the information by selecting and reporting the main features.',
    chartData: chart(),
  };
  return item;
};

const task2 = (id = 'b1'): WritingLibraryItem => {
  const item = emptyWritingItem(id, 'task_2');
  item.question = { ...item.question, topic: 'Education', prompt: 'Some people think universities should be free. To what extent do you agree or disagree?' };
  return item;
};

describe('writing rules', () => {
  it('accepts the bundled Task 2 prompts and the Task 1 prompts with data charts', () => {
    for (const q of writingTask2Questions) {
      const drawable = q.taskOrPart === 'task_2' || (TASK1_DATA_TYPES as readonly string[]).includes(q.questionType);
      if (!drawable) continue;
      expect(writingQuestionProblems(q), q.id).toEqual([]);
    }
  });

  it('checks a chart: type, labels, series, numbers and a pie that adds up', () => {
    expect(chartProblems(chart(), 'line_graph')).toEqual([]);
    expect(chartProblems(chart(), 'bar_chart')[0]).toMatch(/needs a bar chart/);
    expect(chartProblems(undefined)).toEqual(['no chart data']);
    expect(chartProblems(chart({ type: 'map' as never }))[0]).toMatch(/cannot be drawn/);
    expect(chartProblems(chart({ title: ' ' }))).toContain('chart has no title');
    expect(chartProblems(chart({ labels: ['2010'] }))[0]).toMatch(/needs 2-8 labels/);
    expect(chartProblems(chart({ labels: ['a', 'A', 'c'] }))).toContain('chart labels repeat');
    expect(chartProblems(chart({ datasets: [{ label: 'x', data: [1, 2] }] }))).toContain('series 1 has 2 values for 3 labels');
    expect(chartProblems(chart({ datasets: [{ label: 'x', data: [1, -2, 3] }] }))[0]).toMatch(/not a number of 0 or more/);
    expect(chartProblems(chart({ datasets: [] }))[0]).toMatch(/needs 1-4 data series/);
    const pie = chart({ type: 'pie', title: 'Spending (%)', labels: ['a', 'b'], datasets: [{ label: 's', data: [60, 30] }] });
    expect(chartProblems(pie)).toEqual(['a pie chart in percent adds up to 90, not 100']);
    expect(chartProblems({ ...pie, datasets: [{ label: 's', data: [60, 40] }] })).toEqual([]);
  });

  it('checks a prompt by its task', () => {
    expect(writingQuestionProblems({ taskOrPart: 'part_1', questionType: 'x', topic: 't', prompt: 'p', targetBand: '6.0-7.0' })).toEqual(['task must be Task 1 or Task 2']);
    const t2 = libraryWritingQuestion(task2());
    expect(writingQuestionProblems(t2)).toEqual([]);
    expect(writingQuestionProblems({ ...t2, prompt: 'Too short?' })[0]).toMatch(/too short/);
    expect(writingQuestionProblems({ ...t2, prompt: 'Universities are important places for many young people around the world today.' })[0]).toMatch(/ends with what the candidate must do/);
    expect(writingQuestionProblems({ ...t2, targetBand: '6' })[0]).toMatch(/target band/);
    expect(writingQuestionProblems({ ...t2, chartData: chart() })).toContain('a Task 2 prompt has no chart');
    expect(writingQuestionProblems({ ...t2, questionType: 'line_graph' })[0]).toMatch(/Task 2 type/);
    const t1 = libraryWritingQuestion(task1());
    expect(writingQuestionProblems(t1)).toEqual([]);
    expect(writingQuestionProblems({ ...t1, chartData: undefined })[0]).toBe('no chart data');
    expect(writingQuestionProblems({ ...t1, prompt: 'The graph below is about visitors to three museums during the last ten years.' })).toContain(
      'a Task 1 prompt asks the candidate to summarise or compare the data',
    );
  });
});

describe('writing library logic', () => {
  it('builds empty items per task with the right defaults', () => {
    const a = emptyWritingItem('x', 'task_1', '2026-10-25T00:00:00Z');
    expect(a).toMatchObject({ kind: 'task_1', status: 'draft', question: { questionType: 'line_graph' } });
    expect(a.question.chartData?.type).toBe('line');
    const b = emptyWritingItem('y', 'task_2');
    expect(b.question.questionType).toBe('opinion');
    expect(b.question.chartData).toBeUndefined();
  });

  it('turns an item into a prompt with its own id, framework and chart', () => {
    const q = libraryWritingQuestion(task1('abc'));
    expect(q).toMatchObject({ id: 'wlib_abc', skill: 'writing', taskOrPart: 'task_1', questionType: 'line_graph', frameworkId: 'fw_peel' });
    expect(q.chartData).toBeDefined();
    expect(libraryWritingQuestion(task2('def')).frameworkId).toBe('fw_opinion_essay');
    expect(isWritingLibraryQuestionId('wlib_abc')).toBe(true);
    expect(isWritingLibraryQuestionId('wr_t1_x')).toBe(false);
    expect(writingLibraryRowId(writingLibraryQuestionId('abc'))).toBe('abc');
  });

  it('copies as a draft with a new id and keeps the chart apart', () => {
    const original = { ...task1('a'), title: 'Museums', status: 'published' as const };
    const copy = duplicateWritingItem(original, 'b');
    expect(copy).toMatchObject({ id: 'b', title: 'Museums (bản sao)', status: 'draft' });
    copy.question.chartData!.labels.push('2025');
    expect(original.question.chartData!.labels).toHaveLength(3);
  });

  it('changes the chart drawing with the Task 1 type, and leaves Task 2 alone', () => {
    expect(setWritingType(task1(), 'bar_chart').question.chartData?.type).toBe('bar');
    expect(setWritingType(task1(), 'pie_chart').question.chartData?.type).toBe('pie');
    expect(setWritingType(task2(), 'discussion').question).toMatchObject({ questionType: 'discussion' });
    expect(setWritingType(task2(), 'discussion').question.chartData).toBeUndefined();
    expect(blankChart('bar').type).toBe('bar');
  });

  it('writes the chart as text and reads it back', () => {
    const c = chart({ datasets: [{ label: 'North', data: [1, 2.5, 3] }, { label: 'South', data: [4, 5, 6] }] });
    expect(seriesToText(c)).toBe('North: 1, 2.5, 3\nSouth: 4, 5, 6');
    expect(parseSeriesText(seriesToText(c))).toEqual(c.datasets);
    expect(parseSeriesText('10, 20,5')).toEqual([{ label: 'Series 1', data: [10, 20, 5] }]);
    expect(parseSeriesText('A: 1.5 2; 3')[0].data).toEqual([1.5, 2, 3]);
    expect(parseSeriesText('\n  \n')).toEqual([]);
    expect(splitList(' a, b ;c\n d ,, ')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('lists what stops publishing, in Vietnamese', () => {
    expect(writingItemProblems(task1())).toEqual([]);
    expect(writingItemProblems(task2())).toEqual([]);
    const bad = task1();
    bad.question.prompt = 'short';
    bad.question.chartData = chart({ labels: ['2010'] });
    const msgs = writingItemProblems(bad).map((p) => p.message);
    expect(msgs.some((m) => /quá ngắn/.test(m))).toBe(true);
    expect(msgs.some((m) => /cần 2–8 nhãn/.test(m))).toBe(true);
    expect(writingItemProblems(bad).find((p) => /nhãn/.test(p.message))?.where).toBe('Biểu đồ');
    expect(viProblem('something new')).toBe('something new');
  });

  it('names an item from its prompt when no title was typed', () => {
    expect(suggestWritingTitle({ prompt: 'Short prompt' })).toBe('Short prompt');
    expect(suggestWritingTitle({ prompt: 'word '.repeat(40) }).length).toBeLessThanOrEqual(70);
    expect(writingItemRow({ ...task2(), title: '  ' }).title).toMatch(/^Some people think universities/);
    expect(writingItemRow({ ...task2(), title: 'Fees' })).toMatchObject({ id: 'b1', title: 'Fees', kind: 'task_2', status: 'draft' });
  });

  it('filters by text and status, newest first', () => {
    const a = { ...task1('a'), title: 'Museums', updatedAt: '2026-10-01T00:00:00Z', status: 'published' as const };
    const b = { ...task2('b'), title: 'Free university', updatedAt: '2026-10-02T00:00:00Z' };
    expect(filterWritingLibrary([a, b], '', 'all').map((i) => i.id)).toEqual(['b', 'a']);
    expect(filterWritingLibrary([a, b], 'museum', 'all').map((i) => i.id)).toEqual(['a']);
    expect(filterWritingLibrary([a, b], 'education', 'all').map((i) => i.id)).toEqual(['b']);
    expect(filterWritingLibrary([a, b], '', 'published').map((i) => i.id)).toEqual(['a']);
  });

  it('reads rows and refuses broken ones', () => {
    const item = task2('r1');
    const row = { id: 'r1', title: 'T', kind: 'task_2', status: 'published', question: item.question, created_at: 'c', updated_at: 'u' };
    expect(rowToWritingItem(row)).toMatchObject({ id: 'r1', kind: 'task_2', status: 'published', createdAt: 'c', updatedAt: 'u' });
    expect(rowToWritingItem({ ...row, kind: 'task_3' })).toBeNull();
    expect(rowToWritingItem({ ...row, question: {} })).toBeNull();
    expect(rowToWritingItem({ ...row, question: { ...item.question, difficulty: 'wild' } })).toBeNull();
    expect(rowToWritingItem({ ...row, status: 'x' })?.status).toBe('draft');
    expect(writingLibraryErrorText('relation "public.writing_library" does not exist')).toMatch(/migration 014/);
    expect(writingLibraryErrorText('new row violates row-level security policy')).toMatch(/quản trị/);
    expect(writingLibraryErrorText('boom')).toBe('boom');
  });
});

describe('writing library service and registry', () => {
  beforeEach(() => {
    db.rows = [];
    db.error = null;
    db.upserted = [];
    db.deleted = [];
  });

  const rowOf = (item: WritingLibraryItem, status = item.status) => ({ id: item.id, title: item.title || 'T', kind: item.kind, status, question: item.question, created_at: 'c', updated_at: 'u' });

  it('registers published prompts so the hub and attempts find them', async () => {
    const item = task2('p1');
    db.rows = [rowOf(item, 'published'), { ...rowOf(item), id: 'bad', question: {} }];
    const got = await getPublishedWritingLibrary();
    expect(got.map((q) => q.id)).toEqual(['wlib_p1']);
    expect(getWritingQuestionById('wlib_p1')?.prompt).toBe(item.question.prompt);
    expect(getWritingQuestions({ taskOrPart: 'task_2' }).some((q) => q.id === 'wlib_p1')).toBe(true);
    expect(allWritingQuestions().length).toBeGreaterThan(writingTask2Questions.length);
  });

  it('returns nothing, quietly, when the table is missing', async () => {
    db.error = { message: 'relation "public.writing_library" does not exist' };
    expect(await getPublishedWritingLibrary()).toEqual([]);
    await expect(getAllWritingLibrary()).rejects.toThrow(/migration 014/);
  });

  it('saves, and a published prompt shows while a draft does not', async () => {
    const item = { ...task2('s1'), status: 'published' as const };
    db.rows = [rowOf(item)];
    const saved = await saveWritingLibraryItem(item);
    expect(saved.id).toBe('s1');
    expect(db.upserted[0]).toMatchObject({ id: 's1', kind: 'task_2', status: 'published' });
    expect(getWritingQuestionById('wlib_s1')).toBeDefined();
    db.rows = [rowOf(item, 'draft')];
    await saveWritingLibraryItem({ ...item, status: 'draft' });
    expect(getWritingQuestionById('wlib_s1')).toBeUndefined();
  });

  it('deletes, or says the prompt is gone', async () => {
    const item = { ...task2('d1'), status: 'published' as const };
    db.rows = [rowOf(item)];
    await saveWritingLibraryItem(item);
    db.deleted = [{ id: 'd1' }];
    await deleteWritingLibraryItem('d1');
    expect(getWritingQuestionById('wlib_d1')).toBeUndefined();
    db.deleted = [];
    await expect(deleteWritingLibraryItem('d1')).rejects.toThrow(/không còn/);
  });
});
