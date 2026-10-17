/**
 * IELTS Listening grading, done on the device (no AI): answer normalising,
 * word limits, error types, raw score to band, and checks on test data.
 */
import type {
  ListeningAnswers,
  ListeningGroup,
  ListeningQuestion,
  ListeningSection,
  ListeningTest,
} from '../data/ielts/listening/types';
import type { AudioSegment } from './listeningAudioService';

export type AnswerStatus = 'correct' | 'spelling' | 'plural' | 'over_limit' | 'wrong' | 'blank';

export const ANSWER_STATUS_LABELS: Record<AnswerStatus, string> = {
  correct: 'Đúng',
  spelling: 'Sai chính tả',
  plural: 'Thiếu/thừa số nhiều',
  over_limit: 'Vượt giới hạn từ',
  wrong: 'Sai',
  blank: 'Bỏ trống',
};

// --- Normalising -------------------------------------------------------------

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBR: Record<string, string> = Object.fromEntries(MONTHS.map((m) => [m.slice(0, 3), m]));
MONTH_ABBR.sept = 'september';

function numberWordValue(w: string): number | null {
  const u = UNITS.indexOf(w);
  if (u >= 0) return u;
  const t = TENS.indexOf(w);
  return t >= 2 ? t * 10 : null;
}

/** Replaces runs of number words ("twenty five", "one hundred and fifty") with digits. */
function numberWordsToDigits(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let total = 0;
    let current = 0;
    let used = 0;
    let j = i;
    while (j < tokens.length) {
      const w = tokens[j];
      const v = numberWordValue(w);
      if (v !== null) {
        current += v;
        used++;
      } else if (w === 'hundred' && used > 0) {
        current *= 100;
      } else if (w === 'thousand' && used > 0) {
        total += current * 1000;
        current = 0;
      } else if (w === 'and' && used > 0 && j + 1 < tokens.length && numberWordValue(tokens[j + 1]) !== null) {
        // "one hundred and fifty"
      } else break;
      j++;
    }
    if (used > 0) {
      out.push(String(total + current));
      i = j;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

/**
 * Case, spacing, final punctuation, number words, ordinals, "March 15" vs
 * "15 March", "7:30" vs "7.30", "1,500" vs "1500", currency signs, hyphens.
 */
export function normalizeAnswer(raw: string): string {
  let s = raw.toLowerCase().normalize('NFKC');
  s = s.replace(/[’'`]/g, '');
  s = s.replace(/(\d),(?=\d{3}\b)/g, '$1');
  s = s.replace(/(\d):(\d)/g, '$1.$2');
  s = s.replace(/[£$€]/g, ' ');
  s = s.replace(/-/g, ' ');
  s = s.replace(/\.(?!\d)|(?<!\d)\./g, ''); // dots, except decimals and times
  s = s.replace(/[^a-z0-9. ]+/g, ' ');
  let tokens = s.split(/\s+/).filter(Boolean);
  tokens = tokens.map((t) => t.replace(/^(\d+)(st|nd|rd|th)$/, '$1'));
  tokens = tokens.map((t) => MONTH_ABBR[t] ?? t);
  tokens = numberWordsToDigits(tokens);
  // "march 15" -> "15 march"
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (MONTHS.includes(tokens[i]) && /^\d{1,2}$/.test(tokens[i + 1])) {
      [tokens[i], tokens[i + 1]] = [tokens[i + 1], tokens[i]];
      i++;
    }
  }
  return tokens.join(' ');
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

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function isPluralSlip(given: string, accepted: string): boolean {
  const forms = (w: string) => [w + 's', w + 'es', w.endsWith('y') ? w.slice(0, -1) + 'ies' : ''];
  return forms(given).includes(accepted) || forms(accepted).includes(given);
}

/** Error type of a written answer (completion or short answer). */
export function classifyTextAnswer(raw: string, accepted: readonly string[], wordLimit: number, numberAllowed: boolean): AnswerStatus {
  const given = normalizeAnswer(raw);
  if (!given) return 'blank';
  const targets = accepted.map(normalizeAnswer);
  if (targets.includes(given)) return 'correct';
  if (!withinWordLimit(raw, wordLimit, numberAllowed)) return 'over_limit';
  if (targets.some((t) => isPluralSlip(given, t))) return 'plural';
  // One slip in a short word, two in a long one ("factorys" for "factories").
  const slips = (t: string) => (t.length >= 8 ? 2 : 1);
  if (targets.some((t) => !/\d/.test(t) && t.length >= 4 && levenshtein(given, t) <= slips(t))) return 'spelling';
  return 'wrong';
}

// --- Grading -----------------------------------------------------------------

export interface QuestionResult {
  number: number;
  part: number;
  sectionId: string;
  groupId: string;
  groupType: ListeningGroup['type'];
  given: string;
  status: AnswerStatus;
  /** The first accepted answer; letters for choice questions (see answerLabel). */
  expected: string;
  question: ListeningQuestion;
}

const letter = (s: string | undefined) => (s ?? '').trim().toUpperCase();

export function gradeGroup(group: ListeningGroup, answers: ListeningAnswers, section: Pick<ListeningSection, 'id' | 'part'>): QuestionResult[] {
  const base = (q: ListeningQuestion) => ({ number: q.number, part: section.part, sectionId: section.id, groupId: group.id, groupType: group.type, question: q });

  switch (group.type) {
    case 'completion':
    case 'short_answer':
      return group.questions.map((q) => ({
        ...base(q),
        given: answers[q.number] ?? '',
        status: classifyTextAnswer(answers[q.number] ?? '', q.answers, group.wordLimit, group.numberAllowed),
        expected: q.answers[0],
      }));

    case 'mcq':
    case 'matching':
    case 'map':
      return group.questions.map((q) => {
        const given = letter(answers[q.number]);
        return {
          ...base(q),
          given,
          status: !given ? 'blank' : q.answers.map(letter).includes(given) ? 'correct' : 'wrong',
          expected: q.answers[0],
        };
      });

    case 'mcq_multi': {
      // Order-free: each correct letter earns one of the group's questions.
      const first = group.questions[0];
      const chosen = [...new Set((answers[first.number] ?? '').split(',').map(letter).filter(Boolean))];
      const correctSet = first.answers.map(letter);
      const right = chosen.filter((c) => correctSet.includes(c));
      const wrong = chosen.filter((c) => !correctSet.includes(c));
      const expected = correctSet.join(',');
      return group.questions.map((q, i) => {
        if (i < right.length) return { ...base(q), given: right[i], status: 'correct' as const, expected };
        const w = wrong[i - right.length];
        return { ...base(q), given: w ?? '', status: w ? ('wrong' as const) : ('blank' as const), expected };
      });
    }
  }
}

export function gradeSection(section: ListeningSection, answers: ListeningAnswers): QuestionResult[] {
  return section.groups.flatMap((g) => gradeGroup(g, answers, section));
}

/** Academic and General Training share this Listening table. */
const BAND_TABLE: ReadonlyArray<[number, number]> = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [2, 2],
  [1, 1],
];

/** Raw score out of 40 to band. */
export function rawToBand(raw: number): number {
  for (const [min, band] of BAND_TABLE) if (raw >= min) return band;
  return 0;
}

export interface ListeningScore {
  score: number;
  total: number;
  band: number;
  /** True when fewer than 40 questions were answered: band scaled from the percentage. */
  estimated: boolean;
  byPart: { part: number; sectionId: string; score: number; total: number }[];
  results: QuestionResult[];
}

export function scoreSections(sections: readonly ListeningSection[], answers: ListeningAnswers): ListeningScore {
  const byPart = sections.map((s) => {
    const results = gradeSection(s, answers);
    return { part: s.part, sectionId: s.id, results, score: results.filter((r) => r.status === 'correct').length, total: results.length };
  });
  const score = byPart.reduce((n, p) => n + p.score, 0);
  const total = byPart.reduce((n, p) => n + p.total, 0);
  const estimated = total !== 40;
  return {
    score,
    total,
    band: rawToBand(estimated && total > 0 ? Math.round((score / total) * 40) : score),
    estimated,
    byPart: byPart.map(({ results: _r, ...p }) => p),
    results: byPart.flatMap((p) => p.results),
  };
}

/** Counts of each wrong-answer type, for the result summary. */
export function errorBreakdown(results: readonly QuestionResult[]): Partial<Record<AnswerStatus, number>> {
  const out: Partial<Record<AnswerStatus, number>> = {};
  for (const r of results) if (r.status !== 'correct') out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

/** Questions in a section that still have no answer (a choose-two group counts each missing letter). */
export function unansweredCount(groups: readonly ListeningGroup[], answers: ListeningAnswers): number {
  let n = 0;
  for (const g of groups) {
    if (g.type === 'mcq_multi') {
      const chosen = (answers[g.questions[0].number] ?? '').split(',').filter(Boolean).length;
      n += Math.max(0, g.questions.length - chosen);
    } else {
      n += g.questions.filter((q) => !(answers[q.number] ?? '').trim()).length;
    }
  }
  return n;
}

// --- Audio -------------------------------------------------------------------

/** The TTS request for each segment: one voice, or a two-person dialogue. */
export function sectionAudioSegments(section: ListeningSection): AudioSegment[] {
  return section.segments.map((seg) => {
    const names = [...new Set(seg.lines.map((l) => l.speaker))];
    const voiceOf = (name: string) => {
      const sp = section.speakers.find((s) => s.name === name);
      if (!sp) throw new Error(`unknown speaker ${name} in ${seg.id}`);
      return sp.voice;
    };
    if (names.length === 1) {
      return { id: seg.id, style: section.style, voice: voiceOf(names[0]), text: seg.lines.map((l) => l.text).join('\n') };
    }
    return {
      id: seg.id,
      style: section.style,
      speakers: names.map((name) => ({ name, voice: voiceOf(name) })),
      text: seg.lines.map((l) => `${l.speaker}: ${l.text}`).join('\n'),
    };
  });
}

export function sectionQuestions(section: ListeningSection): ListeningQuestion[] {
  return section.groups.flatMap((g) => g.questions);
}

// --- Data checks ---------------------------------------------------------------

const BLANK = /\{\{(\d+)\}\}/g;
const flat = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

/** Problems in one section; empty when it is usable. */
export function validateSection(section: ListeningSection): string[] {
  const problems: string[] = [];
  const at = (q: ListeningQuestion | { number: number }, msg: string) => problems.push(`${section.id} Q${q.number}: ${msg}`);
  const segText = new Map(section.segments.map((s) => [s.id, s.lines.map((l) => l.text).join(' ')]));
  const allText = [...segText.values()].join(' ');

  for (const seg of section.segments) {
    const names = new Set(seg.lines.map((l) => l.speaker));
    if (names.size > 2) problems.push(`${seg.id}: more than two speakers`);
    for (const n of names) if (!section.speakers.some((s) => s.name === n)) problems.push(`${seg.id}: unknown speaker ${n}`);
  }
  try {
    for (const a of sectionAudioSegments(section)) if (a.text.length > 1500) problems.push(`${a.id}: audio text is ${a.text.length} characters (max 1500)`);
  } catch (err) {
    problems.push(String(err));
  }

  const questions = sectionQuestions(section);
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
      if (!flat(text).includes(flat(q.evidence))) at(q, 'evidence is not in its segment');
      if (q.distractor && !flat(allText).includes(flat(q.distractor))) at(q, 'distractor is not in the script');
      if (!q.explanationVi.trim()) at(q, 'no explanation');

      if (g.type === 'completion' || g.type === 'short_answer') {
        for (const a of q.answers) if (!withinWordLimit(a, g.wordLimit, g.numberAllowed)) at(q, `answer "${a}" breaks the word limit`);
        if (!q.answers.some((a) => squash(text).includes(squash(a)))) at(q, 'answer is not in its segment');
        if (!q.answers.some((a) => squash(q.evidence).includes(squash(a)))) at(q, 'evidence does not contain the answer');
        if (g.type === 'short_answer' && !q.prompt) at(q, 'no prompt');
      } else if (g.type === 'mcq') {
        if (!q.prompt || (q.options?.length ?? 0) < 3) at(q, 'needs a prompt and at least 3 options');
        if (!q.options?.some((o) => o.key === q.answers[0])) at(q, 'answer is not an option');
      } else if (g.type === 'mcq_multi') {
        if (q.answers.join() !== g.questions[0].answers.join()) at(q, 'questions in a multi-choice group must share answers');
        if (q.answers.length !== g.questions.length) at(q, 'number of answers must match the number of questions');
        for (const a of q.answers) if (!g.options.some((o) => o.key === a)) at(q, `answer ${a} is not an option`);
      } else if (g.type === 'matching') {
        if (!q.prompt) at(q, 'no prompt');
        if (!g.options.some((o) => o.key === q.answers[0])) at(q, 'answer is not an option');
      } else if (g.type === 'map') {
        if (!q.prompt) at(q, 'no prompt');
        if (!g.map.shapes.some((s) => s.key === q.answers[0])) at(q, 'answer is not a letter on the map');
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

export function validateTest(test: ListeningTest): string[] {
  const problems = test.sections.flatMap(validateSection);
  if (test.kind === 'full') {
    const numbers = test.sections.flatMap((s) => sectionQuestions(s).map((q) => q.number));
    if (numbers.length !== 40 || numbers.some((n, i) => n !== i + 1)) problems.push(`${test.id}: questions must run 1–40`);
    if (test.sections.map((s) => s.part).join() !== '1,2,3,4') problems.push(`${test.id}: parts must be 1–4 in order`);
  }
  for (const s of test.sections) if (sectionQuestions(s).length !== 10) problems.push(`${s.id}: a part has 10 questions`);
  return problems;
}

// --- Sessions and review --------------------------------------------------------

export type ListeningMode = 'exam' | 'practice';

/** The parts being taken, in test order; all of them when `sectionIds` is empty. */
export function sessionSections(test: ListeningTest, sectionIds: readonly string[]): ListeningSection[] {
  const picked = test.sections.filter((s) => sectionIds.includes(s.id));
  return picked.length ? picked : test.sections;
}

/** Labels for saving an attempt: the full test, or one part of it. */
export function attemptLabels(test: ListeningTest, sections: readonly ListeningSection[]) {
  const whole = sections.length === test.sections.length;
  return {
    title: test.title,
    topic: whole || test.kind === 'practice' ? '' : sections.map((s) => s.title).join(', '),
    taskOrPart: whole && test.kind === 'full' ? 'full_test' : `part_${sections[0].part}`,
  };
}

/** The line a completion blank sits in (other blanks shown as "…"), or the question text. */
export function questionContext(group: ListeningGroup, q: ListeningQuestion): string {
  if (group.type === 'mcq_multi') return group.prompt;
  if (group.type !== 'completion') return q.prompt ?? '';
  const tag = `{{${q.number}}}`;
  const lines = [...(group.lines ?? []), ...(group.table?.rows.map((r) => r.join(' · ')) ?? [])];
  const line = lines.find((l) => l.includes(tag)) ?? '';
  return line.replace(tag, '_____').replace(/\{\{\d+\}\}/g, '…');
}

/** "B. owned by one family." for a letter answer; the text itself otherwise. */
export function answerLabel(group: ListeningGroup, q: ListeningQuestion, value: string): string {
  if (!value) return '';
  const options = group.type === 'mcq' ? q.options : group.type === 'matching' || group.type === 'mcq_multi' ? group.options : undefined;
  if (!options) return value;
  return value
    .split(',')
    .map((k) => {
      const text = options.find((o) => o.key === k.trim())?.text;
      return text ? `${k.trim()}. ${text}` : k.trim();
    })
    .join('; ');
}
