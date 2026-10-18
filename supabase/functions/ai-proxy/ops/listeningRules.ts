/**
 * Data checks for IELTS Listening sections, shared by the app (hand-written
 * tests, services/listeningLogic.ts) and the generateListeningSection op, so
 * an AI-written part passes exactly the rules the built-in parts pass.
 *
 * Pure TypeScript with no imports: the types below are the structural subset
 * of data/ielts/listening/types.ts that the checks read.
 */

export const LISTENING_TEXT_LIMIT = 1500;

interface CheckLine {
  speaker: string;
  text: string;
}

interface CheckQuestion {
  number: number;
  prompt?: string;
  options?: { key: string; text: string }[];
  answers: string[];
  segmentId: string;
  evidence: string;
  distractor?: string;
  explanationVi: string;
}

interface CheckGroup {
  id: string;
  type: string;
  questions: CheckQuestion[];
  wordLimit?: number;
  numberAllowed?: boolean;
  lines?: string[];
  table?: { header: string[]; rows: string[][] };
  options?: { key: string; text: string }[];
  map?: { shapes: { key?: string }[] };
}

export interface CheckSection {
  id: string;
  speakers: { name: string }[];
  segments: { id: string; lines: CheckLine[] }[];
  groups: CheckGroup[];
}

/** Lowercase letters and digits only, for "does the script contain this answer". */
export const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Words and numbers in an answer as written; runs of digit groups ("07946 382115") count as one number. */
export function countAnswerTokens(raw: string): { words: number; numbers: number } {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  let words = 0;
  let numbers = 0;
  let prevNumber = false;
  for (const t of tokens) {
    const isNumber = /\d/.test(t);
    if (isNumber) {
      if (!prevNumber) numbers++;
    } else words++;
    prevNumber = isNumber;
  }
  return { words, numbers };
}

export function withinWordLimit(raw: string, wordLimit: number, numberAllowed: boolean): boolean {
  const { words, numbers } = countAnswerTokens(raw);
  return numberAllowed ? words <= wordLimit && numbers <= 1 : words + numbers <= wordLimit;
}

/** The text sent to TTS for a segment: plain lines for one voice, "Name: line" turns for two. */
export function segmentAudioText(lines: readonly CheckLine[]): string {
  const names = new Set(lines.map((l) => l.speaker));
  return names.size === 1 ? lines.map((l) => l.text).join('\n') : lines.map((l) => `${l.speaker}: ${l.text}`).join('\n');
}

const BLANK = /\{\{(\d+)\}\}/g;
const flat = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

/** Problems in one section; empty when it is usable. */
export function sectionProblems(section: CheckSection): string[] {
  const problems: string[] = [];
  const at = (q: { number: number }, msg: string) => problems.push(`${section.id} Q${q.number}: ${msg}`);
  const segText = new Map(section.segments.map((s) => [s.id, s.lines.map((l) => l.text).join(' ')]));
  const allText = [...segText.values()].join(' ');

  for (const seg of section.segments) {
    const names = new Set(seg.lines.map((l) => l.speaker));
    if (seg.lines.length === 0) problems.push(`${seg.id}: no lines`);
    if (names.size > 2) problems.push(`${seg.id}: more than two speakers`);
    for (const n of names) if (!section.speakers.some((s) => s.name === n)) problems.push(`${seg.id}: unknown speaker ${n}`);
    const length = segmentAudioText(seg.lines).length;
    if (length > LISTENING_TEXT_LIMIT) problems.push(`${seg.id}: audio text is ${length} characters (max ${LISTENING_TEXT_LIMIT})`);
  }

  const questions = section.groups.flatMap((g) => g.questions);
  questions.forEach((q, i) => {
    if (i > 0 && q.number !== questions[i - 1].number + 1) at(q, 'numbers are not consecutive');
  });

  for (const g of section.groups) {
    for (const q of g.questions) {
      const text = segText.get(q.segmentId);
      if (text === undefined) {
        at(q, `unknown segment ${q.segmentId}`);
        continue;
      }
      if (!q.answers.length) at(q, 'no answer');
      if (!q.evidence.trim() || !flat(text).includes(flat(q.evidence))) at(q, 'evidence is not in its segment');
      if (q.distractor && !flat(allText).includes(flat(q.distractor))) at(q, 'distractor is not in the script');
      if (!q.explanationVi.trim()) at(q, 'no explanation');

      if (g.type === 'completion' || g.type === 'short_answer') {
        const limit = g.wordLimit ?? 0;
        const numberAllowed = g.numberAllowed ?? false;
        for (const a of q.answers) if (!withinWordLimit(a, limit, numberAllowed)) at(q, `answer "${a}" breaks the word limit`);
        if (!q.answers.some((a) => squash(text).includes(squash(a)))) at(q, 'answer is not in its segment');
        if (!q.answers.some((a) => squash(q.evidence).includes(squash(a)))) at(q, 'evidence does not contain the answer');
        if (g.type === 'short_answer' && !q.prompt) at(q, 'no prompt');
      } else if (g.type === 'mcq') {
        if (!q.prompt || (q.options?.length ?? 0) < 3) at(q, 'needs a prompt and at least 3 options');
        if (!q.options?.some((o) => o.key === q.answers[0])) at(q, 'answer is not an option');
      } else if (g.type === 'mcq_multi') {
        if (q.answers.join() !== g.questions[0].answers.join()) at(q, 'questions in a multi-choice group must share answers');
        if (q.answers.length !== g.questions.length) at(q, 'number of answers must match the number of questions');
        for (const a of q.answers) if (!g.options?.some((o) => o.key === a)) at(q, `answer ${a} is not an option`);
      } else if (g.type === 'matching') {
        if (!q.prompt) at(q, 'no prompt');
        if (!g.options?.some((o) => o.key === q.answers[0])) at(q, 'answer is not an option');
      } else if (g.type === 'map') {
        if (!q.prompt) at(q, 'no prompt');
        if (!g.map?.shapes.some((s) => s.key === q.answers[0])) at(q, 'answer is not a letter on the map');
      } else {
        at(q, `unknown group type ${g.type}`);
      }
    }

    if (g.type === 'completion') {
      const template = [...(g.lines ?? []), ...(g.table ? [...g.table.header, ...g.table.rows.flat()] : [])].join('\n');
      const blanks = [...template.matchAll(BLANK)].map((m) => Number(m[1]));
      const numbers = g.questions.map((q) => q.number);
      if (blanks.join() !== numbers.join()) problems.push(`${section.id} ${g.id}: blanks ${blanks.join(',')} do not match questions ${numbers.join(',')}`);
    }
  }
  return problems;
}
