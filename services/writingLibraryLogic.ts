/**
 * Writing library (pure): prompts written on the admin page and kept in
 * `writing_library` (migration 014). One row is one prompt; a published one
 * opens like a bundled prompt, with the id `wlib_<row id>`.
 */
import type { IeltsDifficulty, IeltsQuestion } from '../types';
import { isMissingTable } from './listeningLibraryLogic';
import { foldText } from './vocabLibraryLogic';
import {
  CHART_LIMITS,
  CHART_TYPE_FOR,
  FRAMEWORK_FOR,
  TASK1_DATA_TYPES,
  TASK2_TYPES,
  WRITING_DIFFICULTIES,
  writingQuestionProblems,
  type WritingChart,
  type WritingTaskId,
} from '../supabase/functions/ai-proxy/ops/writingRules.ts';

export type WritingLibraryStatus = 'draft' | 'published';

/** What the editor changes: a prompt without its id and task. */
export interface WritingQuestionBody {
  questionType: string;
  topic: string;
  difficulty: IeltsDifficulty;
  prompt: string;
  targetBand: string;
  planningPrompts?: string[];
  vocabulary?: string[];
  sampleAnswer?: string;
  chartData?: WritingChart;
}

export interface WritingLibraryItem {
  id: string;
  title: string;
  /** The task, named `kind` so the shared admin list can show it. */
  kind: WritingTaskId;
  status: WritingLibraryStatus;
  question: WritingQuestionBody;
  createdAt: string;
  updatedAt: string;
}

export const TASK_LABELS: Record<WritingTaskId, string> = { task_1: 'Task 1', task_2: 'Task 2' };

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  line_graph: 'Line graph',
  bar_chart: 'Bar chart',
  pie_chart: 'Pie chart',
  table: 'Table',
  opinion: 'Opinion',
  discussion: 'Discussion',
  advantages_disadvantages: 'Advantages / disadvantages',
  problem_solution: 'Problem / solution',
  cause_effect: 'Cause / effect',
  two_part: 'Two-part question',
};

export const typesFor = (task: WritingTaskId): readonly string[] => (task === 'task_1' ? TASK1_DATA_TYPES : TASK2_TYPES);

// --- Ids -----------------------------------------------------------------------------------------

const PREFIX = 'wlib_';

export const writingLibraryQuestionId = (rowId: string) => `${PREFIX}${rowId}`;
export const isWritingLibraryQuestionId = (id: string) => id.startsWith(PREFIX);
export const writingLibraryRowId = (id: string) => id.slice(PREFIX.length);

const TARGET_BAND = '6.0-7.0';

/** A prompt in the shape every Writing screen uses. */
export function toWritingQuestion(id: string, task: WritingTaskId, body: WritingQuestionBody): IeltsQuestion {
  return {
    id,
    skill: 'writing',
    taskOrPart: task,
    questionType: body.questionType,
    topic: body.topic,
    difficulty: body.difficulty,
    prompt: body.prompt.trim(),
    frameworkId: FRAMEWORK_FOR[body.questionType] ?? 'fw_peel',
    targetBand: body.targetBand.trim(),
    ...(body.planningPrompts?.length ? { planningPrompts: body.planningPrompts } : {}),
    ...(body.vocabulary?.length ? { vocabulary: body.vocabulary } : {}),
    ...(body.sampleAnswer?.trim() ? { sampleAnswer: body.sampleAnswer } : {}),
    ...(body.chartData ? { chartData: body.chartData } : {}),
  };
}

export const libraryWritingQuestion = (item: WritingLibraryItem): IeltsQuestion => toWritingQuestion(writingLibraryQuestionId(item.id), item.kind, item.question);

// --- Building --------------------------------------------------------------------------------------

export function blankChart(type: WritingChart['type']): WritingChart {
  return { type, title: '', labels: ['2010', '2015', '2020'], datasets: [{ label: 'Series 1', data: [0, 0, 0] }] };
}

export function emptyWritingItem(id: string, task: WritingTaskId, now = new Date().toISOString()): WritingLibraryItem {
  const questionType = task === 'task_1' ? 'line_graph' : 'opinion';
  return {
    id,
    title: '',
    kind: task,
    status: 'draft',
    question: {
      questionType,
      topic: '',
      difficulty: 'medium',
      prompt: '',
      targetBand: TARGET_BAND,
      planningPrompts: [],
      ...(task === 'task_1' ? { chartData: blankChart('line') } : {}),
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateWritingItem(item: WritingLibraryItem, newId: string, now = new Date().toISOString()): WritingLibraryItem {
  return { ...structuredClone(item), id: newId, title: `${item.title} (bản sao)`.slice(0, 200), status: 'draft', createdAt: now, updatedAt: now };
}

/** Another type of the same task; a Task 1 chart changes to the drawing that type needs. */
export function setWritingType(item: WritingLibraryItem, questionType: string): WritingLibraryItem {
  const question: WritingQuestionBody = { ...item.question, questionType };
  if (item.kind === 'task_1') {
    const chartType = CHART_TYPE_FOR[questionType as keyof typeof CHART_TYPE_FOR];
    if (chartType) question.chartData = { ...(question.chartData ?? blankChart(chartType)), type: chartType };
  }
  return { ...item, question };
}

/** The name shown in the list when none was typed: the start of the prompt. */
export const suggestWritingTitle = (body: Pick<WritingQuestionBody, 'prompt'>): string => {
  const text = body.prompt.trim().replace(/\s+/g, ' ');
  return text.length > 70 ? `${text.slice(0, 67).trimEnd()}...` : text;
};

// --- Chart as text (the editor's two boxes) ---------------------------------------------------------------

export const splitList = (text: string): string[] =>
  text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** One data series per line: "Name: 1, 2, 3". */
export function seriesToText(chart: WritingChart): string {
  return chart.datasets.map((d) => `${d.label}: ${d.data.join(', ')}`).join('\n');
}

export function parseSeriesText(text: string): WritingChart['datasets'] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const at = line.indexOf(':');
      const label = (at >= 0 ? line.slice(0, at) : `Series ${i + 1}`).trim();
      const values = (at >= 0 ? line.slice(at + 1) : line).split(/[,;\s]+/).filter(Boolean);
      return { label, data: values.map((v) => Number(v)) };
    });
}

// --- Checks ----------------------------------------------------------------------------------------

export interface WritingLibraryProblem {
  where: string;
  message: string;
}

const MESSAGES: [RegExp, string][] = [
  [/^task must be Task 1 or Task 2$/, 'chọn Task 1 hoặc Task 2'],
  [/^prompt is too short \((\d+) characters, at least (\d+)\)$/, 'đề bài quá ngắn ($1 ký tự, cần ít nhất $2)'],
  [/^prompt is too long \((\d+) characters, at most (\d+)\)$/, 'đề bài quá dài ($1 ký tự, tối đa $2)'],
  [/^topic is empty$/, 'chưa nhập chủ đề'],
  [/^target band must look like (.*)$/, 'band mục tiêu phải có dạng $1'],
  [/^planning hint (\d+) is empty$/, 'gợi ý dàn ý $1 đang trống'],
  [/^Task 1 type must be one of .*$/, 'chọn dạng biểu đồ: line, bar, pie hoặc table'],
  [/^a Task 1 prompt asks the candidate to summarise or compare the data$/, 'đề Task 1 cần yêu cầu tóm tắt hoặc so sánh số liệu (Summarise the information…)'],
  [/^Task 2 type must be one of .*$/, 'chọn dạng bài Task 2'],
  [/^a Task 2 prompt has no chart$/, 'đề Task 2 không có biểu đồ'],
  [/^a Task 2 prompt ends with what the candidate must do.*$/, 'đề Task 2 cần có câu hỏi hoặc yêu cầu rõ ở cuối (Discuss both views…, To what extent…)'],
  [/^no chart data$/, 'chưa có số liệu biểu đồ'],
  [/^chart type "(.*)" cannot be drawn$/, 'không vẽ được biểu đồ loại "$1"'],
  [/^a (\w+) needs a (\w+) chart, got (\w+)$/, 'dạng $1 cần biểu đồ $2, đang là $3'],
  [/^chart has no title$/, 'biểu đồ chưa có tiêu đề'],
  [/^chart needs (\d+)-(\d+) labels, got (\d+)$/, 'biểu đồ cần $1–$2 nhãn, đang có $3'],
  [/^a chart label is empty$/, 'có nhãn đang trống'],
  [/^chart labels repeat$/, 'có nhãn bị trùng'],
  [/^chart needs 1-(\d+) data series, got (\d+)$/, 'biểu đồ cần 1–$1 dãy số liệu, đang có $2'],
  [/^a pie chart has exactly one data series$/, 'biểu đồ tròn chỉ có một dãy số liệu'],
  [/^series (\d+) has no name$/, 'dãy $1 chưa có tên'],
  [/^series (\d+) has (\d+) values for (\d+) labels$/, 'dãy $1 có $2 số cho $3 nhãn'],
  [/^series (\d+) has a value that is not a number of 0 or more$/, 'dãy $1 có giá trị không phải số từ 0 trở lên'],
  [/^a pie chart in percent adds up to (\d+), not 100$/, 'biểu đồ tròn theo % cộng lại $1, phải là 100'],
];

export function viProblem(message: string): string {
  for (const [re, vi] of MESSAGES) if (re.test(message)) return message.replace(re, vi);
  return message;
}

/** Everything that stops a prompt from being published, in Vietnamese. */
export function writingItemProblems(item: WritingLibraryItem): WritingLibraryProblem[] {
  const q = toWritingQuestion(writingLibraryQuestionId(item.id), item.kind, item.question);
  const problems = writingQuestionProblems(q).map((m) => ({ where: m.includes('chart') || m.startsWith('series') || m.includes('pie') ? 'Biểu đồ' : 'Đề bài', message: viProblem(m) }));
  if (!(WRITING_DIFFICULTIES as readonly string[]).includes(item.question.difficulty)) problems.push({ where: 'Đề bài', message: 'chọn mức độ' });
  return problems;
}

export const chartLimitsText = `${CHART_LIMITS.minLabels}–${CHART_LIMITS.maxLabels} nhãn, tối đa ${CHART_LIMITS.maxDatasets} dãy`;

// --- List ------------------------------------------------------------------------------------------

export function filterWritingLibrary(items: readonly WritingLibraryItem[], query: string, status: 'all' | WritingLibraryStatus): WritingLibraryItem[] {
  const needle = foldText(query);
  return items
    .filter((i) => status === 'all' || i.status === status)
    .filter((i) => !needle || foldText([i.title, i.question.topic, i.question.prompt, i.question.questionType].join(' ')).includes(needle))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const writingItemStats = (item: WritingLibraryItem) => ({
  words: item.question.prompt.trim() ? item.question.prompt.trim().split(/\s+/).length : 0,
  chart: !!item.question.chartData,
});

export function writingLibraryErrorText(message: string): string {
  if (isMissingTable(message)) return 'Chưa chạy migration 014 (docs/migrations/014_writing.sql) trong Supabase SQL Editor.';
  if (/row-level security|permission denied/i.test(message)) return 'Tài khoản này chưa có quyền quản trị (chưa có trong bảng app_admins).';
  return message;
}

// --- Rows ------------------------------------------------------------------------------------------

export interface WritingLibraryRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  question: unknown;
  created_at: string;
  updated_at: string;
}

const isBody = (v: unknown): v is WritingQuestionBody => {
  const q = v as Partial<WritingQuestionBody> | null;
  return !!q && typeof q === 'object' && typeof q.prompt === 'string' && typeof q.questionType === 'string' && typeof q.topic === 'string' && typeof q.targetBand === 'string' && (WRITING_DIFFICULTIES as readonly string[]).includes(String(q.difficulty));
};

/** A stored row, or null when it is not a usable prompt. */
export function rowToWritingItem(row: WritingLibraryRow): WritingLibraryItem | null {
  if (row.kind !== 'task_1' && row.kind !== 'task_2') return null;
  if (!isBody(row.question)) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status === 'published' ? 'published' : 'draft',
    question: row.question,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The columns to write; timestamps are the database's. */
export const writingItemRow = (item: WritingLibraryItem) => ({
  id: item.id,
  title: (item.title.trim() || suggestWritingTitle(item.question) || 'Đề chưa đặt tên').slice(0, 200),
  kind: item.kind,
  status: item.status,
  question: item.question,
});
