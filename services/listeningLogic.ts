/**
 * IELTS Listening grading, done on the device (no AI): grading each group,
 * raw score to band, and checks on test data. Answer checking itself is in
 * ieltsAnswerLogic, shared with Reading.
 */
import type {
  ListeningAnswers,
  ListeningGroup,
  ListeningQuestion,
  ListeningSection,
  ListeningTest,
} from '../data/ielts/listening/types';
import type { AudioSegment } from './listeningAudioService';
import { youtubeClipSource } from './youtubeLogic';
import { sectionProblems } from '../supabase/functions/ai-proxy/ops/listeningRules.ts';
import { classifyTextAnswer, letter, multiChoiceMarks, type AnswerStatus } from './ieltsAnswerLogic';

export {
  ANSWER_STATUS_LABELS,
  classifyTextAnswer,
  countAnswerTokens,
  errorBreakdown,
  levenshtein,
  normalizeAnswer,
  squash,
  unansweredCount,
  withinWordLimit,
} from './ieltsAnswerLogic';
export type { AnswerStatus } from './ieltsAnswerLogic';

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
      const first = group.questions[0];
      const marks = multiChoiceMarks(answers[first.number], first.answers, group.questions.length);
      return group.questions.map((q, i) => ({ ...base(q), ...marks[i] }));
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


// --- Audio -------------------------------------------------------------------

/** The TTS request for each segment: one voice, or a two-person dialogue. */
export function sectionAudioSegments(section: ListeningSection): AudioSegment[] {
  const yt = section.youtube;
  return section.segments.map((seg) => {
    // A recorded part plays its own video; the voices are never asked for.
    const source = yt && seg.start !== undefined && seg.end !== undefined ? youtubeClipSource(yt.videoId, seg.start, seg.end) : undefined;
    if (source) {
      return { id: seg.id, style: section.style, text: seg.lines.map((l) => l.text).join(' '), voice: section.speakers[0]?.voice ?? 'Kore', source };
    }
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

/**
 * Gives the part, its segments and groups ids of its own: every generated
 * Part 2 comes back as `gen-p2`, a copied library test repeats its source, and drafts and audio progress are keyed by id.
 */
export function rekeySection(section: ListeningSection, sectionId: string): ListeningSection {
  const segmentIds = new Map(section.segments.map((s, i) => [s.id, `${sectionId}-s${i + 1}`]));
  return {
    ...section,
    id: sectionId,
    segments: section.segments.map((s) => ({ ...s, id: segmentIds.get(s.id)! })),
    groups: section.groups.map((g, i) => ({
      ...g,
      id: `${sectionId}-g${i + 1}`,
      questions: g.questions.map((q) => ({ ...q, segmentId: segmentIds.get(q.segmentId) ?? q.segmentId })),
    })) as ListeningSection['groups'],
  };
}

// --- Data checks ---------------------------------------------------------------

/** Problems in one section; empty when it is usable. Same rules as the generateListeningSection op. */
export function validateSection(section: ListeningSection): string[] {
  return sectionProblems(section);
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
