/**
 * Pure helpers for Writing feedback 2.0: paragraph notes, error labels,
 * the Task 1 checklist and the comparison with the previous attempt.
 * Everything tolerates feedback saved before these fields existed.
 */
import type { IeltsAiFeedback, IeltsParagraphFeedback, IeltsSentenceCorrection, IeltsTask1Check } from '../types';
import { ERROR_CATEGORIES, errorCategory, type ErrorCategoryInfo } from '../data/ielts/errorCategories';

/** Paragraphs as the learner typed them: one per non-empty line (same rule as the grading op). */
export function splitEssayParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Note for each paragraph by its 0-based position; out-of-range or repeated indices are ignored. */
export function paragraphNotes(
  feedback: Pick<IeltsAiFeedback, 'paragraphFeedback'>,
  paragraphCount: number,
): Map<number, IeltsParagraphFeedback> {
  const notes = new Map<number, IeltsParagraphFeedback>();
  for (const note of feedback.paragraphFeedback ?? []) {
    const i = Math.round(note.index) - 1;
    if (i >= 0 && i < paragraphCount && !notes.has(i)) notes.set(i, note);
  }
  return notes;
}

export interface CorrectionGroup {
  /** undefined for corrections without a known label ("Khác"). */
  category?: ErrorCategoryInfo;
  label: string;
  corrections: IeltsSentenceCorrection[];
}

/** Corrections grouped by error label, biggest group first, unlabelled ones last. */
export function groupCorrections(corrections: ReadonlyArray<IeltsSentenceCorrection>): CorrectionGroup[] {
  const groups = new Map<string, CorrectionGroup>();
  for (const c of corrections) {
    const info = errorCategory(c.category);
    const key = info?.id ?? '';
    const group = groups.get(key) ?? { category: info, label: info?.label ?? 'Khác', corrections: [] };
    group.corrections.push(c);
    groups.set(key, group);
  }
  const order = (g: CorrectionGroup) => (g.category ? ERROR_CATEGORIES.indexOf(g.category) : ERROR_CATEGORIES.length);
  return [...groups.values()].sort(
    (a, b) => (a.category ? 0 : 1) - (b.category ? 0 : 1) || b.corrections.length - a.corrections.length || order(a) - order(b),
  );
}

export const TASK1_CHECK_LABELS: Record<IeltsTask1Check['id'], string> = {
  overview: 'Có overview nêu xu hướng chính',
  key_features: 'Chọn đặc điểm nổi bật, có số liệu',
  comparisons: 'Có so sánh, không liệt kê',
  no_opinion: 'Không nêu ý kiến cá nhân',
};

/** The four Task 1 checks in a fixed order, skipping unknown or repeated ids. */
export function task1Checks(feedback: Pick<IeltsAiFeedback, 'task1Checklist'>): Array<IeltsTask1Check & { label: string }> {
  const byId = new Map<string, IeltsTask1Check>();
  for (const c of feedback.task1Checklist ?? []) if (!byId.has(c.id)) byId.set(c.id, c);
  return (Object.keys(TASK1_CHECK_LABELS) as IeltsTask1Check['id'][])
    .filter((id) => byId.has(id))
    .map((id) => ({ ...byId.get(id)!, label: TASK1_CHECK_LABELS[id] }));
}

export interface BandComparison {
  overall: number;
  /** Change per criterion of the current feedback; undefined when the previous one has no match. */
  criteria: Array<number | undefined>;
}

/** Band changes from the previous attempt, criteria matched by name. */
export function compareBands(previous: IeltsAiFeedback, current: IeltsAiFeedback): BandComparison {
  const before = new Map(previous.criterionScores.map((c) => [c.name.toLowerCase(), c.score]));
  return {
    overall: round(current.estimatedBand - previous.estimatedBand),
    criteria: current.criterionScores.map((c) => {
      const old = before.get(c.name.toLowerCase());
      return old === undefined ? undefined : round(c.score - old);
    }),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** "+0.5", "−0.5" or "0". */
export function formatDelta(delta: number): string {
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

export interface DiffToken {
  text: string;
  kind: 'same' | 'added' | 'removed';
}

const PARAGRAPH = '\n';

function tokens(text: string): string[] {
  return splitEssayParagraphs(text).flatMap((p, i) => [...(i ? [PARAGRAPH] : []), ...p.split(/\s+/)]);
}

/**
 * Word diff between two versions (longest common subsequence). Paragraph
 * breaks come through as "\n" tokens; runs of the same kind are merged.
 */
export function diffWords(before: string, after: string): DiffToken[] {
  const a = tokens(before);
  const b = tokens(after);
  const n = a.length;
  const m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const out: DiffToken[] = [];
  const push = (text: string, kind: DiffToken['kind']) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind && text !== PARAGRAPH && last.text !== PARAGRAPH) last.text += ` ${text}`;
    else out.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      push(a[i], 'same');
      i++;
      j++;
    } else if (i < n && (j === m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      push(a[i++], 'removed');
    } else {
      push(b[j++], 'added');
    }
  }
  return out;
}

/** Words added and removed, ignoring paragraph breaks. */
export function diffStats(diff: ReadonlyArray<DiffToken>): { added: number; removed: number } {
  const count = (kind: DiffToken['kind']) =>
    diff.filter((t) => t.kind === kind && t.text !== PARAGRAPH).reduce((sum, t) => sum + t.text.split(' ').length, 0);
  return { added: count('added'), removed: count('removed') };
}
