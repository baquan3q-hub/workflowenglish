/**
 * Luyện câu (pure): local matching against reference translations, the
 * **bold** markup in corrections, and the end-of-section error summary.
 */

import type {
  SentenceErrorCategory,
  SentenceGrade,
  SentenceItem,
  SentenceVerdict,
  StepResult,
} from '../types';
import { findWordForm } from './reviewLogic';

// Longest first so "won't" is not read as "wo" + "n't".
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bshan't\b/g, 'shall not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\bi'm\b/g, 'i am'],
  [/\b(\w+)'re\b/g, '$1 are'],
  [/\b(\w+)'ve\b/g, '$1 have'],
  [/\b(\w+)'ll\b/g, '$1 will'],
  [/\b(\w+)'d\b/g, '$1 would'],
  [/\b(it|that|what|there|here|he|she|who|where|how)'s\b/g, '$1 is'],
  [/\bcan not\b/g, 'cannot'],
];

/** Lower case, straight quotes, contractions expanded, punctuation and extra spaces gone. */
export function normalizeSentence(text: string): string {
  let s = text.toLowerCase().replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"');
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to);
  return s
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .replace(/(^|\s)'|'(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchReference(answer: string, references: ReadonlyArray<string>): boolean {
  const a = normalizeSentence(answer);
  return a.length > 0 && references.some((r) => normalizeSentence(r) === a);
}

export function missingTargetWords(answer: string, targetWords: ReadonlyArray<string>): string[] {
  return targetWords.filter((w) => !findWordForm(answer, w));
}

/** "Đúng" without calling the AI when the answer matches a reference. */
export function localGrade(item: SentenceItem, answer: string): SentenceGrade | null {
  if (!matchReference(answer, item.references)) return null;
  if (missingTargetWords(answer, item.targetWords).length > 0) return null;
  return {
    verdict: 'correct',
    score: 100,
    corrected: answer.trim(),
    usedTargetWords: true,
    errors: [],
    explanationVi: 'Chính xác, khớp với câu tham chiếu.',
    natural: item.references[0] ?? answer.trim(),
    gradedBy: 'local',
    latencyMs: 0,
  };
}

/** "I **went** home" → [{text:'I '}, {text:'went', bold}, {text:' home'}]. */
export function splitBold(text: string): Array<{ text: string; bold: boolean }> {
  const out: Array<{ text: string; bold: boolean }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}

export const stripBold = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1');

export const VERDICT_LABELS: Record<SentenceVerdict, string> = {
  correct: 'Đúng',
  acceptable: 'Chấp nhận được',
  incorrect: 'Cần sửa',
};

export const CATEGORY_LABELS: Record<SentenceErrorCategory, string> = {
  tense: 'Thì',
  article: 'Mạo từ',
  preposition: 'Giới từ',
  word_choice: 'Dùng từ',
  word_order: 'Trật tự từ',
  spelling: 'Chính tả',
  grammar: 'Ngữ pháp',
  meaning: 'Sai nghĩa',
  other: 'Khác',
};

/** Error counts by category, most frequent first. */
export function groupErrors(grades: ReadonlyArray<SentenceGrade>): Array<{ category: SentenceErrorCategory; label: string; count: number }> {
  const counts = new Map<SentenceErrorCategory, number>();
  for (const g of grades) for (const e of g.errors) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, label: CATEGORY_LABELS[category] ?? 'Khác', count }));
}

/** Step result for the lesson summary: "Cần sửa" sentences count as wrong. */
export function sentenceStepResult(
  items: ReadonlyArray<SentenceItem>,
  grades: Readonly<Record<string, SentenceGrade>>,
): StepResult {
  const graded = items.filter((it) => grades[it.id]);
  const wrongItems = graded.filter((it) => grades[it.id].verdict === 'incorrect');
  return {
    score: graded.length - wrongItems.length,
    total: graded.length,
    wrong: [...new Set(wrongItems.flatMap((it) => it.targetWords))],
  };
}

/** Gives generated items stable ids and drops empty ones. */
export function withIds(raw: ReadonlyArray<Omit<SentenceItem, 'id'>>, prefix: string): SentenceItem[] {
  return raw
    .filter((it) => it.promptVi?.trim() && it.targetWords?.length && it.references?.length)
    .map((it, i) => ({ ...it, id: `${prefix}-${i + 1}` }));
}

export interface AttemptRow {
  prompt_vi: string;
  target_words: string[];
  reference_answers: string[] | null;
  verdict: SentenceVerdict | null;
  created_at: string;
}

/**
 * Sentences whose latest attempt was "Cần sửa", newest first, one per prompt.
 * A later correct or acceptable attempt clears it.
 */
export function pendingWrongSentences(rows: ReadonlyArray<AttemptRow>, limit = 10): SentenceItem[] {
  const latest = new Map<string, AttemptRow>();
  for (const r of rows) {
    const key = r.prompt_vi.trim();
    const seen = latest.get(key);
    if (!seen || r.created_at > seen.created_at) latest.set(key, r);
  }
  return [...latest.values()]
    .filter((r) => r.verdict === 'incorrect')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((r, i) => ({
      id: `drill-${i + 1}`,
      promptVi: r.prompt_vi,
      targetWords: r.target_words,
      references: r.reference_answers ?? [],
    }));
}
