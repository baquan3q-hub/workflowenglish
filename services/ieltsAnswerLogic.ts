/**
 * Answer checking shared by IELTS Listening and Reading, done on the device:
 * normalising written answers, word limits and the error type of a wrong one.
 */
import { countAnswerTokens, squash, withinWordLimit } from '../supabase/functions/ai-proxy/ops/listeningRules.ts';

export { countAnswerTokens, squash, withinWordLimit };

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

// --- Choice questions ------------------------------------------------------------

/** A choice answer as stored: trimmed, upper case. */
export const letter = (s: string | undefined) => (s ?? '').trim().toUpperCase();

/**
 * Marks for a "choose TWO/THREE letters" group, stored comma-separated on its
 * first question. Order-free: each right letter earns one of the group's
 * `count` questions, then each wrong letter, then blanks.
 */
export function multiChoiceMarks(
  raw: string | undefined,
  accepted: readonly string[],
  count: number,
): { given: string; status: 'correct' | 'wrong' | 'blank'; expected: string }[] {
  const chosen = [...new Set((raw ?? '').split(',').map(letter).filter(Boolean))];
  const correctSet = accepted.map(letter);
  const right = chosen.filter((c) => correctSet.includes(c));
  const wrong = chosen.filter((c) => !correctSet.includes(c));
  const expected = correctSet.join(',');
  return Array.from({ length: count }, (_, i) => {
    if (i < right.length) return { given: right[i], status: 'correct' as const, expected };
    const w = wrong[i - right.length];
    return { given: w ?? '', status: w ? ('wrong' as const) : ('blank' as const), expected };
  });
}

// --- Results -------------------------------------------------------------------

/** Counts of each wrong-answer type, for the result summary. */
export function errorBreakdown<S extends string>(results: readonly { status: S | 'correct' }[]): Partial<Record<S, number>> {
  const out: Partial<Record<S, number>> = {};
  for (const r of results) if (r.status !== 'correct') out[r.status as S] = (out[r.status as S] ?? 0) + 1;
  return out;
}

/** Questions that still have no answer (a choose-two group counts each missing letter). */
export function unansweredCount(
  groups: readonly { type: string; questions: readonly { number: number }[] }[],
  answers: Readonly<Record<number, string>>,
): number {
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
