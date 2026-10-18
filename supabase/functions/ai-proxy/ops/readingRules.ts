/**
 * Data checks for IELTS Reading passages, shared by the app (hand-written
 * tests, services/readingLogic.ts) and the AI ops that write or annotate
 * passages, so every passage passes the same rules.
 *
 * Pure TypeScript: the types below are the structural subset of
 * data/ielts/reading/types.ts that the checks read.
 */
import { squash, withinWordLimit } from './listeningRules.ts';

export const READING_SKILLS = ['scan', 'skim', 'detail', 'inference', 'main_idea'] as const;

/** Accepted answers of a TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN group. */
export const TFNG_VALUES = {
  tfng: ['TRUE', 'FALSE', 'NOT GIVEN'],
  ynng: ['YES', 'NO', 'NOT GIVEN'],
} as const;

interface CheckOption {
  key: string;
  text: string;
}

interface CheckQuestion {
  number: number;
  prompt?: string;
  options?: CheckOption[];
  answers: string[];
  paragraph: string;
  evidence: string;
  distractor?: string;
  explanationVi: string;
  skill: string;
}

interface CheckGroup {
  id: string;
  type: string;
  questions: CheckQuestion[];
  wordLimit?: number;
  numberAllowed?: boolean;
  lines?: string[];
  table?: { header: string[]; rows: string[][] };
  wordBox?: CheckOption[];
  options?: CheckOption[];
  variant?: string;
  headings?: CheckOption[];
  example?: { paragraph: string; heading: string };
  target?: string;
  reuse?: boolean;
  diagram?: { shapes: { text?: string }[] };
}

export interface CheckPassage {
  id: string;
  paragraphs: { label: string; text: string }[];
  groups: CheckGroup[];
}

const BLANK = /\{\{(\d+)\}\}/g;
const flat = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const upper = (s: string | undefined) => (s ?? '').trim().toUpperCase();

/** Words in the passage body, as counted for the 700–950 words a passage should have. */
export function passageWordCount(passage: Pick<CheckPassage, 'paragraphs'>): number {
  return passage.paragraphs.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
}

/** The blank numbers a completion or diagram group's template holds, in order. */
export function templateBlanks(group: CheckGroup): number[] {
  const parts =
    group.type === 'diagram'
      ? (group.diagram?.shapes ?? []).map((s) => s.text ?? '')
      : [...(group.lines ?? []), ...(group.table ? [...group.table.header, ...group.table.rows.flat()] : [])];
  return [...parts.join('\n').matchAll(BLANK)].map((m) => Number(m[1]));
}

/** Groups whose answers come in passage order in the exam. */
function inPassageOrder(g: CheckGroup): boolean {
  return g.type === 'tfng' || g.type === 'short_answer' || (g.type === 'completion' && !g.wordBox?.length);
}

/** Problems in one passage; empty when it is usable. */
export function passageProblems(passage: CheckPassage): string[] {
  const problems: string[] = [];
  const at = (q: { number: number }, msg: string) => problems.push(`${passage.id} Q${q.number}: ${msg}`);
  const labels = passage.paragraphs.map((p) => p.label);
  const textOf = new Map(passage.paragraphs.map((p) => [p.label, p.text]));
  const allText = passage.paragraphs.map((p) => p.text).join(' ');

  if (!passage.paragraphs.length) problems.push(`${passage.id}: no paragraphs`);
  passage.paragraphs.forEach((p, i) => {
    const expected = String.fromCharCode(65 + i);
    if (p.label !== expected) problems.push(`${passage.id}: paragraph ${i + 1} should be labelled ${expected}`);
    if (!p.text.trim()) problems.push(`${passage.id}: paragraph ${p.label} is empty`);
  });

  const questions = passage.groups.flatMap((g) => g.questions);
  if (!questions.length) problems.push(`${passage.id}: no questions`);
  questions.forEach((q, i) => {
    if (i > 0 && q.number !== questions[i - 1].number + 1) at(q, 'numbers are not consecutive');
  });

  for (const g of passage.groups) {
    if (!g.questions.length) problems.push(`${passage.id} ${g.id}: no questions`);
    const boxed = g.type === 'completion' && !!g.wordBox?.length;

    for (const q of g.questions) {
      const text = textOf.get(q.paragraph);
      if (text === undefined) {
        at(q, `unknown paragraph ${q.paragraph}`);
        continue;
      }
      if (!q.answers.length || q.answers.some((a) => !a.trim())) at(q, 'no answer');
      if (!q.evidence.trim() || !flat(text).includes(flat(q.evidence))) at(q, `evidence is not in paragraph ${q.paragraph}`);
      if (q.distractor && !flat(allText).includes(flat(q.distractor))) at(q, 'distractor is not in the passage');
      if (!q.explanationVi.trim()) at(q, 'no explanation');
      if (!(READING_SKILLS as readonly string[]).includes(q.skill)) at(q, `unknown skill ${q.skill}`);

      switch (g.type) {
        case 'completion':
        case 'short_answer':
        case 'diagram':
          if (boxed) {
            if (!g.wordBox!.some((o) => o.key === upper(q.answers[0]))) at(q, 'answer is not a letter in the word box');
            break;
          }
          for (const a of q.answers) if (!withinWordLimit(a, g.wordLimit ?? 0, g.numberAllowed ?? false)) at(q, `answer "${a}" breaks the word limit`);
          // Answers are copied from the passage, so the words must be there.
          if (!q.answers.some((a) => squash(text).includes(squash(a)))) at(q, `answer is not in paragraph ${q.paragraph}`);
          if (!q.answers.some((a) => squash(q.evidence).includes(squash(a)))) at(q, 'evidence does not contain the answer');
          if (g.type === 'short_answer' && !q.prompt) at(q, 'no prompt');
          break;
        case 'mcq':
          if (!q.prompt || (q.options?.length ?? 0) < 3) at(q, 'needs a prompt and at least 3 options');
          if (!q.options?.some((o) => o.key === upper(q.answers[0]))) at(q, 'answer is not an option');
          break;
        case 'mcq_multi':
          if (q.answers.join() !== g.questions[0].answers.join()) at(q, 'questions in a multi-choice group must share answers');
          if (q.answers.length !== g.questions.length) at(q, 'number of answers must match the number of questions');
          for (const a of q.answers) if (!g.options?.some((o) => o.key === upper(a))) at(q, `answer ${a} is not an option`);
          break;
        case 'tfng': {
          const allowed: readonly string[] = TFNG_VALUES[g.variant === 'ynng' ? 'ynng' : 'tfng'];
          if (g.variant !== 'tfng' && g.variant !== 'ynng') at(q, `unknown variant ${g.variant}`);
          if (!q.prompt) at(q, 'no statement');
          if (q.answers.length !== 1 || !allowed.includes(upper(q.answers[0]))) at(q, `answer must be one of ${allowed.join(', ')}`);
          break;
        }
        case 'headings':
          if (!g.headings?.some((h) => h.key === q.answers[0])) at(q, 'answer is not a heading');
          break;
        case 'matching':
          if (!q.prompt) at(q, 'no prompt');
          if (!g.options?.some((o) => o.key === upper(q.answers[0]))) at(q, 'answer is not an option');
          break;
        default:
          at(q, `unknown group type ${g.type}`);
      }
    }

    const numbers = g.questions.map((q) => q.number);
    if (g.type === 'completion' || g.type === 'diagram') {
      const blanks = templateBlanks(g);
      if (blanks.join() !== numbers.join()) problems.push(`${passage.id} ${g.id}: blanks ${blanks.join(',')} do not match questions ${numbers.join(',')}`);
    }
    if (boxed && g.wordBox!.length <= g.questions.length) problems.push(`${passage.id} ${g.id}: the word box needs more words than blanks`);

    if (g.type === 'headings') {
      const used = g.questions.map((q) => q.answers[0]);
      const asked = g.questions.map((q) => q.paragraph);
      if (new Set(asked).size !== asked.length) problems.push(`${passage.id} ${g.id}: a paragraph is asked twice`);
      if (new Set(used).size !== used.length) problems.push(`${passage.id} ${g.id}: a heading is the answer twice`);
      const fromExample = g.example ? 1 : 0;
      if ((g.headings?.length ?? 0) <= g.questions.length + fromExample) problems.push(`${passage.id} ${g.id}: needs more headings than paragraphs`);
      if (g.example) {
        if (!labels.includes(g.example.paragraph) || asked.includes(g.example.paragraph)) problems.push(`${passage.id} ${g.id}: example paragraph is unknown or also asked`);
        if (!g.headings?.some((h) => h.key === g.example!.heading) || used.includes(g.example.heading)) problems.push(`${passage.id} ${g.id}: example heading is unknown or also an answer`);
      }
    }

    if (g.type === 'matching') {
      const keys = (g.options ?? []).map((o) => o.key);
      if (g.target === 'paragraph') {
        if (keys.some((k) => !labels.includes(k))) problems.push(`${passage.id} ${g.id}: options must be paragraph letters`);
        // Matching information points to where it is said.
        for (const q of g.questions) if (upper(q.answers[0]) !== q.paragraph) at(q, 'answer must be the paragraph that holds the evidence');
      } else if (g.target === 'feature' || g.target === 'ending') {
        if (keys.length < 2) problems.push(`${passage.id} ${g.id}: needs at least 2 options`);
      } else problems.push(`${passage.id} ${g.id}: unknown target ${g.target}`);
      if (g.target === 'ending' && keys.length <= g.questions.length) problems.push(`${passage.id} ${g.id}: needs more endings than sentences`);
      if (!g.reuse) {
        const used = g.questions.map((q) => upper(q.answers[0]));
        if (new Set(used).size !== used.length) problems.push(`${passage.id} ${g.id}: a letter is used twice without "reuse"`);
      }
    }

    if (inPassageOrder(g)) {
      // Paragraph first, then where the evidence sits in it.
      const place = (q: CheckQuestion) => [labels.indexOf(q.paragraph), flat(textOf.get(q.paragraph) ?? '').indexOf(flat(q.evidence))];
      for (let i = 1; i < g.questions.length; i++) {
        const [pa, oa] = place(g.questions[i - 1]);
        const [pb, ob] = place(g.questions[i]);
        if (pb < pa || (pb === pa && ob < oa)) at(g.questions[i], 'answers in this group must follow the passage order');
      }
    }
  }
  return problems;
}
