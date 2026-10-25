/**
 * Rules a Writing prompt has to meet (IELTS Writing library and AI phases).
 * Pure TypeScript with no imports, so the ai-proxy op, the admin page and
 * vitest all run the same checks.
 */

export const WRITING_TASKS = ['task_1', 'task_2'] as const;
export type WritingTaskId = (typeof WRITING_TASKS)[number];

/** Task 1 types the app can draw from numbers (process and map need drawings, so only the admin bank has them). */
export const TASK1_DATA_TYPES = ['line_graph', 'bar_chart', 'pie_chart', 'table'] as const;
export const TASK2_TYPES = ['opinion', 'discussion', 'advantages_disadvantages', 'problem_solution', 'cause_effect', 'two_part'] as const;

export type Task1DataType = (typeof TASK1_DATA_TYPES)[number];
export type Task2Type = (typeof TASK2_TYPES)[number];

export const WRITING_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type WritingDifficultyId = (typeof WRITING_DIFFICULTIES)[number];

export const WRITING_TOPICS = ['Education', 'Environment', 'Technology', 'Health', 'Society', 'Work', 'Government', 'Media', 'Tourism', 'Culture', 'Economy', 'Transport'] as const;

/** The chart `type` the renderer draws for each Task 1 question type. */
export const CHART_TYPE_FOR: Record<Task1DataType, 'line' | 'bar' | 'pie' | 'table'> = {
  line_graph: 'line',
  bar_chart: 'bar',
  pie_chart: 'pie',
  table: 'table',
};

/** The framework (data/ieltsFrameworks.ts) suggested for each type. */
export const FRAMEWORK_FOR: Record<string, string> = {
  line_graph: 'fw_peel',
  bar_chart: 'fw_peel',
  pie_chart: 'fw_peel',
  table: 'fw_peel',
  opinion: 'fw_opinion_essay',
  discussion: 'fw_discussion_essay',
  advantages_disadvantages: 'fw_opinion_essay',
  problem_solution: 'fw_problem_solution_essay',
  cause_effect: 'fw_peel',
  two_part: 'fw_two_part_essay',
};

export const PROMPT_LENGTH = { min: 40, max: 700 } as const;
export const CHART_LIMITS = { minLabels: 2, maxLabels: 8, maxDatasets: 4, maxTableRows: 6 } as const;

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface WritingChart {
  type: 'line' | 'bar' | 'pie' | 'table';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

/** What the rules look at; IeltsQuestion and the op's output both fit. */
export interface WritingQuestionLike {
  taskOrPart: string;
  questionType: string;
  topic: string;
  prompt: string;
  targetBand: string;
  planningPrompts?: string[];
  chartData?: unknown;
}

const isTask1Type = (t: string): t is Task1DataType => (TASK1_DATA_TYPES as readonly string[]).includes(t);
const isTask2Type = (t: string): t is Task2Type => (TASK2_TYPES as readonly string[]).includes(t);

/** Task 2 types written before the grouped list, still valid in the bank. */
const isKnownTask2 = (t: string) => isTask2Type(t) || t === 'positive_negative' || t === 'personal';

/** Problems with a chart; empty when the app can draw it. */
export function chartProblems(chart: unknown, questionType?: string): string[] {
  const problems: string[] = [];
  const c = chart as Partial<WritingChart> | null;
  if (!c || typeof c !== 'object') return ['no chart data'];
  if (!['line', 'bar', 'pie', 'table'].includes(String(c.type))) return [`chart type "${String(c.type)}" cannot be drawn`];
  if (questionType && isTask1Type(questionType) && CHART_TYPE_FOR[questionType] !== c.type) {
    problems.push(`a ${questionType} needs a ${CHART_TYPE_FOR[questionType]} chart, got ${c.type}`);
  }
  if (typeof c.title !== 'string' || !c.title.trim()) problems.push('chart has no title');
  const labels = Array.isArray(c.labels) ? c.labels : [];
  if (labels.length < CHART_LIMITS.minLabels || labels.length > CHART_LIMITS.maxLabels) {
    problems.push(`chart needs ${CHART_LIMITS.minLabels}-${CHART_LIMITS.maxLabels} labels, got ${labels.length}`);
  }
  if (labels.some((l) => typeof l !== 'string' || !l.trim())) problems.push('a chart label is empty');
  if (new Set(labels.map((l) => String(l).trim().toLowerCase())).size !== labels.length) problems.push('chart labels repeat');
  const datasets = Array.isArray(c.datasets) ? c.datasets : [];
  // A table lists its rows as series, so it may have more than a chart can show clearly.
  const maxSeries = c.type === 'table' ? CHART_LIMITS.maxTableRows : CHART_LIMITS.maxDatasets;
  if (!datasets.length || datasets.length > maxSeries) problems.push(`chart needs 1-${maxSeries} data series, got ${datasets.length}`);
  if (c.type === 'pie' && datasets.length !== 1) problems.push('a pie chart has exactly one data series');
  datasets.forEach((d, i) => {
    const where = `series ${i + 1}`;
    if (!d || typeof d.label !== 'string' || !d.label.trim()) problems.push(`${where} has no name`);
    const data = Array.isArray(d?.data) ? d.data : [];
    if (data.length !== labels.length) problems.push(`${where} has ${data.length} values for ${labels.length} labels`);
    if (data.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) problems.push(`${where} has a value that is not a number of 0 or more`);
  });
  if (c.type === 'pie' && datasets.length === 1 && /%|percent/i.test(String(c.title))) {
    const sum = datasets[0].data.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    if (Math.abs(sum - 100) > 1.5) problems.push(`a pie chart in percent adds up to ${Math.round(sum)}, not 100`);
  }
  return problems;
}

/** Problems with a prompt as a whole; empty when it can be published or shown. */
export function writingQuestionProblems(q: WritingQuestionLike): string[] {
  const problems: string[] = [];
  const task = q.taskOrPart;
  if (task !== 'task_1' && task !== 'task_2') return ['task must be Task 1 or Task 2'];

  const prompt = (q.prompt ?? '').trim();
  if (prompt.length < PROMPT_LENGTH.min) problems.push(`prompt is too short (${prompt.length} characters, at least ${PROMPT_LENGTH.min})`);
  if (prompt.length > PROMPT_LENGTH.max) problems.push(`prompt is too long (${prompt.length} characters, at most ${PROMPT_LENGTH.max})`);
  if (!(q.topic ?? '').trim()) problems.push('topic is empty');
  if (!/^\d(\.\d)?-\d(\.\d)?$/.test((q.targetBand ?? '').trim())) problems.push('target band must look like 5.5-6.5');
  (q.planningPrompts ?? []).forEach((p, i) => {
    if (typeof p !== 'string' || !p.trim()) problems.push(`planning hint ${i + 1} is empty`);
  });

  if (task === 'task_1') {
    if (!isTask1Type(q.questionType) && q.chartData === undefined) {
      // Process, map and mixed prompts of the bank carry their own drawings; the editor only makes data charts.
      problems.push(`Task 1 type must be one of ${TASK1_DATA_TYPES.join(', ')}`);
    } else if (isTask1Type(q.questionType) || q.chartData !== undefined) {
      problems.push(...chartProblems(q.chartData, q.questionType));
    }
    if (prompt && !/summari[sz]e|report|describe|compare/i.test(prompt)) problems.push('a Task 1 prompt asks the candidate to summarise or compare the data');
  } else {
    if (!isKnownTask2(q.questionType)) problems.push(`Task 2 type must be one of ${TASK2_TYPES.join(', ')}`);
    if (q.chartData !== undefined) problems.push('a Task 2 prompt has no chart');
    if (prompt && !/\?|discuss|to what extent|give your own opinion|do you agree|your opinion|explain|suggest/i.test(prompt)) {
      problems.push('a Task 2 prompt ends with what the candidate must do (a question or "Discuss…")');
    }
  }
  return problems;
}
