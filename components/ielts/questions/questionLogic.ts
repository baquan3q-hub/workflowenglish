/**
 * Pure helpers behind the question renderers (Listening and Reading), kept
 * apart so they can be tested without a DOM.
 */
import type { ReadingGroup } from '../../../data/ielts/reading/types';
import { TFNG_VALUES } from '../../../supabase/functions/ai-proxy/ops/readingRules.ts';

/** "{{12}}" in a template line. */
export const BLANK = /\{\{(\d+)\}\}/;

/** Text and blank numbers of a template line, in order. */
export function splitBlanks(line: string): ({ text: string } | { blank: number })[] {
  return line
    .split(BLANK)
    .map((part, i) => (i % 2 === 1 ? { blank: Number(part) } : { text: part }))
    .filter((p) => !('text' in p) || p.text !== '');
}

/** "Câu 4" or "Câu 4–9". */
export function questionRange(questions: readonly { number: number }[]): string {
  const first = questions[0]?.number;
  const last = questions[questions.length - 1]?.number;
  return first === last ? `Câu ${first}` : `Câu ${first}–${last}`;
}

/** Adds or removes a letter of a choose-two group; never more than `max`, stored sorted. */
export function toggleChoice(stored: string | undefined, key: string, max: number): string {
  const chosen = (stored ?? '').split(',').filter(Boolean);
  if (chosen.includes(key)) return chosen.filter((k) => k !== key).join(',');
  if (chosen.length >= max) return chosen.join(',');
  return [...chosen, key].sort().join(',');
}

/** The three buttons of a TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN statement. */
export function tfngChoices(variant: 'tfng' | 'ynng'): readonly string[] {
  return TFNG_VALUES[variant];
}

/** One line on what each answer means, in Vietnamese. */
export const TFNG_HINTS = {
  tfng: 'TRUE: bài đọc nói đúng như vậy · FALSE: bài đọc nói ngược lại · NOT GIVEN: bài đọc không nhắc tới',
  ynng: 'YES: đúng quan điểm tác giả · NO: trái quan điểm tác giả · NOT GIVEN: tác giả không nói tới',
} as const;

/**
 * Whether the answers of a group follow the passage order, as the exam
 * does; null when it varies. Learners who know this save minutes.
 */
export function followsPassageOrder(group: ReadingGroup): boolean | null {
  switch (group.type) {
    case 'tfng':
    case 'short_answer':
    case 'mcq':
      return true;
    case 'completion':
      return group.wordBox?.length ? null : true;
    case 'headings':
    case 'matching':
      return false;
    default:
      return null;
  }
}

/** Question types as the learner meets them; one group type can be several (TFNG or YNNG). */
export type GroupKind =
  | 'completion'
  | 'summary_box'
  | 'flowchart'
  | 'short_answer'
  | 'mcq'
  | 'mcq_multi'
  | 'tfng'
  | 'ynng'
  | 'headings'
  | 'matching_paragraph'
  | 'matching_feature'
  | 'matching_ending'
  | 'diagram'
  | 'map';

export function readingGroupKind(group: ReadingGroup): GroupKind {
  switch (group.type) {
    case 'completion':
      return group.wordBox?.length ? 'summary_box' : group.layout === 'flowchart' ? 'flowchart' : 'completion';
    case 'tfng':
      return group.variant;
    case 'matching':
      return `matching_${group.target}`;
    default:
      return group.type;
  }
}

/**
 * The questions that chose each heading or word-box letter, in order, so a
 * list can mark what is taken (choosing it again stays allowed).
 */
export function usedBy(
  questions: readonly { number: number }[],
  answers: Readonly<Record<number, string>>,
  normalize: (s: string) => string = (s) => s.trim(),
): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const q of questions) {
    const v = normalize(answers[q.number] ?? '');
    if (v) out.set(v, [...(out.get(v) ?? []), q.number]);
  }
  return out;
}

/** The next blank after `current` in a word-box summary, wrapping to the first empty one. */
export function nextBlank(numbers: readonly number[], answers: Readonly<Record<number, string>>, current: number): number | null {
  const at = numbers.indexOf(current);
  const order = [...numbers.slice(at + 1), ...numbers.slice(0, at + 1)];
  return order.find((n) => !(answers[n] ?? '').trim()) ?? null;
}
