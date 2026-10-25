/**
 * Op generateWritingPrompt: writes one IELTS Academic Writing prompt. Task 1
 * comes with the numbers the app draws as a chart; Task 2 is an essay
 * question of the type asked for. `finalize` runs the same rules as the admin
 * page (writingRules), so a prompt that cannot be published is retried and
 * then handed to the fallback model by the proxy.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, oneOf, q, S, str, userText, type OpSpec } from '../lib.ts';
import {
  CHART_TYPE_FOR,
  TASK1_DATA_TYPES,
  TASK2_TYPES,
  WRITING_DIFFICULTIES,
  WRITING_TASKS,
  WRITING_TOPICS,
  writingQuestionProblems,
  type WritingChart,
  type WritingDifficultyId,
  type WritingTaskId,
} from './writingRules.ts';

export interface WritingGenerateRequest {
  task: WritingTaskId;
  /** Empty lets the op pick. */
  questionType: string;
  topic: string;
  difficulty: WritingDifficultyId;
}

const TARGET_BAND: Record<WritingDifficultyId, string> = { easy: '5.0-6.0', medium: '6.0-7.0', hard: '7.0-8.0' };

const DIFFICULTY_BRIEF: Record<WritingDifficultyId, string> = {
  easy: 'easy (band 5-6): a familiar everyday theme and a clear, simple question; simple data with obvious trends.',
  medium: 'medium (band 6-7): a typical IELTS theme and question; data with a few features to compare.',
  hard: 'hard (band 7-8): an abstract or policy-level theme with a demanding question; data with crossings, peaks or exceptions to select from.',
};

const TASK2_BRIEF: Record<string, string> = {
  opinion: 'an opinion essay: state a view in one sentence, then end with "To what extent do you agree or disagree?"',
  discussion: 'a discussion essay: give two opposing views ("Some people think… Others believe…") and end with "Discuss both views and give your own opinion."',
  advantages_disadvantages: 'an advantages and disadvantages essay: describe a trend or development and end with "Do the advantages of this development outweigh the disadvantages?"',
  problem_solution: 'a problem and solution essay: describe a situation and end with "What problems does this cause, and what solutions can you suggest?"',
  cause_effect: 'a causes and effects essay: describe a trend and end with "What are the main causes of this, and what effects might it have?"',
  two_part: 'a two-question essay: give a short statement, then two direct questions, each ending with a question mark.',
};

const TASK1_BRIEF: Record<string, string> = {
  line_graph: 'a line graph: 2 or 3 lines over 5-7 time points (years, evenly spaced). Labels are the years; each series is one line. Include at least one crossing, peak or turning point.',
  bar_chart: 'a bar chart: 4-6 categories (countries, groups, products) and 2 series (for example two years). Labels are the categories.',
  pie_chart: 'a pie chart: ONE series of 4-6 slices that add up to exactly 100, with "(%)" in the chart title. Labels are the slices.',
  table: 'a table: 2-4 column labels (years or groups) and 4-6 rows, each row one series. Values are numbers only.',
};

export function parseWritingGenerateRequest(payload: unknown): WritingGenerateRequest {
  const p = asObject(payload);
  const task = oneOf(p, 'task', WRITING_TASKS, '' as WritingTaskId);
  if (!task) throw new BadRequest('task must be task_1 or task_2');
  const questionType = typeof p.questionType === 'string' ? p.questionType : '';
  const allowed: readonly string[] = task === 'task_1' ? TASK1_DATA_TYPES : TASK2_TYPES;
  if (questionType && !allowed.includes(questionType)) throw new BadRequest(`questionType must be one of ${allowed.join(', ')}`);
  return {
    task,
    questionType,
    topic: str(p, 'topic', { max: 100, optional: true }).trim(),
    difficulty: oneOf(p, 'difficulty', WRITING_DIFFICULTIES, 'medium'),
  };
}

/** The type to write: the one asked for, else one picked with `pick` (0 ≤ pick < 1). */
export function resolveWritingType(r: WritingGenerateRequest, pick: number = Math.random()): string {
  if (r.questionType) return r.questionType;
  const list: readonly string[] = r.task === 'task_1' ? TASK1_DATA_TYPES : TASK2_TYPES;
  return list[Math.min(list.length - 1, Math.floor(pick * list.length))];
}

export const blueprintKey = (task: WritingTaskId, questionType: string) => `${task}|${questionType}`;

function promptSchema(r: WritingGenerateRequest, questionType: string) {
  const base = {
    blueprint: S.str([blueprintKey(r.task, questionType)]),
    difficulty: S.str([r.difficulty]),
    topic: S.str([...WRITING_TOPICS]),
    summaryVi: S.str(),
    prompt: S.str(),
    planningPrompts: S.arr(S.str()),
    vocabulary: S.arr(S.str()),
  };
  if (r.task === 'task_2') return S.obj(base);
  return S.obj({
    ...base,
    chart: S.obj({
      title: S.str(),
      labels: S.arr(S.str()),
      datasets: S.arr(S.obj({ label: S.str(), data: S.arr(S.num()) })),
    }),
  });
}

export function writingPromptText(r: WritingGenerateRequest, questionType: string): string {
  const topic = r.topic ? q(r.topic) : `choose a fresh academic topic (one of ${WRITING_TOPICS.join(', ')})`;
  const common = `You are an experienced IELTS Academic Writing examiner. Write one original IELTS Academic Writing ${r.task === 'task_1' ? 'Task 1' : 'Task 2'} prompt for Vietnamese learners. Never copy or adapt a published IELTS or Cambridge question.

Topic: ${topic}
Difficulty: ${DIFFICULTY_BRIEF[r.difficulty]}

Return JSON with:
- blueprint: ${q(blueprintKey(r.task, questionType))}; difficulty: "${r.difficulty}"
- topic: the closest tag
- summaryVi: one Vietnamese sentence saying what the prompt asks the candidate to write about
- planningPrompts: 4-5 short planning questions in English that help a learner plan the answer (one per paragraph)
- vocabulary: 5-8 useful words or phrases for this prompt`;

  if (r.task === 'task_2') {
    return `${common}
- prompt: the question exactly as the exam prints it, 2-4 sentences, ${TASK2_BRIEF[questionType]}. Plain English, no numbering, no title.`;
  }
  return `${common}
- prompt: one or two sentences: "The ${questionType === 'table' ? 'table' : questionType.replace('_', ' ')} below shows…" with the subject, place and period, then exactly: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
- chart: the data behind it, ${TASK1_BRIEF[questionType]}
  - title names the quantity and the unit, for example "Visitors to three museums (thousands)".
  - Every series has exactly one number for each label. Numbers are realistic, 0 or more, and invented (no real statistics).
  - Do not describe the answer in the prompt; it only introduces the data.`;
}

// --- Output ------------------------------------------------------------------

interface RawChart {
  title?: unknown;
  labels?: unknown[];
  datasets?: { label?: unknown; data?: unknown[] }[];
}
interface RawPrompt {
  blueprint?: unknown;
  difficulty?: unknown;
  topic?: unknown;
  summaryVi?: unknown;
  prompt?: unknown;
  planningPrompts?: unknown[];
  vocabulary?: unknown[];
  chart?: RawChart;
}

/** What the op returns: the prompt body (the app's `WritingQuestionBody`) and a line for the hub. */
export interface GeneratedWriting {
  task: WritingTaskId;
  summaryVi: string;
  question: {
    questionType: string;
    topic: string;
    difficulty: WritingDifficultyId;
    prompt: string;
    targetBand: string;
    planningPrompts: string[];
    vocabulary: string[];
    chartData?: WritingChart;
  };
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const list = (v: unknown[] | undefined) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

/** The model's JSON in the app's shape. Does not check it. */
export function normalizeGeneratedWriting(data: unknown): GeneratedWriting & { blueprint: string } {
  const d = (data && typeof data === 'object' ? data : {}) as RawPrompt;
  const difficulty = (WRITING_DIFFICULTIES as readonly unknown[]).includes(d.difficulty) ? (d.difficulty as WritingDifficultyId) : 'medium';
  const blueprint = text(d.blueprint);
  const [taskPart, typePart = ''] = blueprint.split('|');
  const task: WritingTaskId = taskPart === 'task_1' ? 'task_1' : 'task_2';
  const topic = text(d.topic);
  let chartData: WritingChart | undefined;
  if (task === 'task_1' && d.chart) {
    const labels = list(d.chart.labels);
    chartData = {
      type: CHART_TYPE_FOR[typePart as keyof typeof CHART_TYPE_FOR] ?? 'line',
      title: text(d.chart.title),
      labels,
      datasets: (Array.isArray(d.chart.datasets) ? d.chart.datasets : []).map((s) => ({
        label: text(s?.label),
        data: (Array.isArray(s?.data) ? s.data : []).map((n) => (typeof n === 'number' ? n : Number.NaN)),
      })),
    };
  }
  return {
    blueprint,
    task,
    summaryVi: text(d.summaryVi),
    question: {
      questionType: typePart,
      topic: (WRITING_TOPICS as readonly string[]).includes(topic) ? topic : topic || 'Society',
      difficulty,
      prompt: text(d.prompt),
      targetBand: TARGET_BAND[difficulty],
      planningPrompts: list(d.planningPrompts),
      vocabulary: list(d.vocabulary),
      ...(chartData ? { chartData } : {}),
    },
  };
}

const NOUN: Record<string, RegExp> = {
  line_graph: /line graph/i,
  bar_chart: /bar chart/i,
  pie_chart: /pie chart/i,
  table: /table/i,
};

/** Every problem in a generated prompt: the shared rules plus what the op promised. */
export function generatedWritingProblems(g: GeneratedWriting, expected?: { task: WritingTaskId; questionType: string }): string[] {
  const q2 = g.question;
  const problems = writingQuestionProblems({ ...q2, taskOrPart: g.task });
  if (expected && (g.task !== expected.task || q2.questionType !== expected.questionType)) {
    problems.push(`expected ${expected.task} ${expected.questionType}, got ${g.task} ${q2.questionType}`);
  }
  if (!g.summaryVi) problems.push('no Vietnamese summary');
  if (q2.planningPrompts.length < 3 || q2.planningPrompts.length > 6) problems.push(`needs 3-6 planning hints, got ${q2.planningPrompts.length}`);
  if (q2.vocabulary.length < 3 || q2.vocabulary.length > 10) problems.push(`needs 3-10 vocabulary items, got ${q2.vocabulary.length}`);
  if (g.task === 'task_1') {
    const noun = NOUN[q2.questionType];
    if (noun && !noun.test(q2.prompt)) problems.push(`the prompt should name the ${q2.questionType.replace('_', ' ')}`);
    if (q2.chartData?.type === 'pie' && !/%/.test(q2.chartData.title)) problems.push('a pie chart title should say (%)');
  }
  if (g.task === 'task_2' && q2.questionType === 'two_part' && (q2.prompt.match(/\?/g) ?? []).length < 2) problems.push('a two-part prompt has two questions');
  return problems;
}

export function finalizeWritingPrompt(data: unknown): GeneratedWriting {
  const { blueprint, ...generated } = normalizeGeneratedWriting(data);
  const [task, type] = blueprint.split('|');
  if (!(WRITING_TASKS as readonly string[]).includes(task) || !type) throw new Error('generated prompt has no blueprint');
  const problems = generatedWritingProblems(generated, { task: task as WritingTaskId, questionType: type });
  if (problems.length) throw new Error(`generated prompt failed ${problems.length} check(s): ${problems.slice(0, 6).join('; ')}`);
  return generated;
}

/** Writes one IELTS Academic Writing prompt (Task 1 with data, or Task 2). */
export const generateWritingPrompt: OpSpec = {
  hourlyLimit: 15,
  models: FLASH_MODELS,
  timeoutMs: 60_000,
  kind: 'json',
  // finalize only sees the data, so the plan and difficulty come back as single-value enum fields.
  finalize: finalizeWritingPrompt,
  build(payload) {
    const r = parseWritingGenerateRequest(payload);
    const questionType = resolveWritingType(r);
    return {
      contents: userText(writingPromptText(r, questionType)),
      generationConfig: jsonConfig(promptSchema(r, questionType), { temperature: 0.9 }),
    };
  },
};

