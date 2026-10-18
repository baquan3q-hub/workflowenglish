/**
 * AI-generated Reading passages (IELTS phase R8), the pure part: ids, the
 * checks the app runs again on what the op returns, and the one-passage test
 * a stored row opens as. services/readingGenerationService.ts does the I/O.
 *
 * A row of `reading_generated` (migration 012) keeps the op's whole result in
 * its `passage` column: { plan, summaryVi, passage }.
 */
import type { ReadingPassage, ReadingTest } from '../data/ielts/reading/types';
import {
  generatedPassageProblems,
  planKey,
  readingPlan,
  READING_DIFFICULTIES,
  type GeneratedKind,
  type GeneratedReading,
  type PlannedGroup,
  type ReadingDifficulty,
  type ReadingPart,
} from '../supabase/functions/ai-proxy/ops/readingGenerate.ts';
import { rekeyPassage } from './readingLibraryLogic';

export type { GeneratedKind, PlannedGroup, ReadingDifficulty, ReadingPart };

const TEST_PREFIX = 'rgen_';

export const generatedReadingTestId = (id: string) => `${TEST_PREFIX}${id}`;
export const isGeneratedReadingTestId = (testId: string) => testId.startsWith(TEST_PREFIX);
export const generatedReadingRowId = (testId: string) => testId.slice(TEST_PREFIX.length);
/** Passage ids stay unique across generated tests, so drafts and highlights never mix. */
export const generatedPassageId = (id: string) => `rgen-${id.replace(/-/g, '').slice(0, 10)}`;

export const READING_DIFFICULTY_HINTS: Record<ReadingDifficulty, string> = {
  easy: 'Câu chữ rõ ràng, câu hỏi diễn đạt gần với bài, ít bẫy. Hợp band 5–6.',
  medium: 'Câu hỏi paraphrase bằng từ đồng nghĩa, có vài câu bẫy. Hợp band 6–7.',
  hard: 'Câu dài, giọng học thuật, cần suy luận và có nhiều bẫy. Hợp band 7–8.',
};

/** Topic ideas shown under the topic box, per part. */
export const READING_TOPIC_IDEAS: Record<ReadingPart, string[]> = {
  1: ['Lịch sử của chiếc xe đạp', 'Loài ong và nông nghiệp', 'Kiến trúc nhà sàn', 'Muối trong đời sống cổ đại'],
  2: ['Thành phố bọt biển chống ngập', 'Âm nhạc và trí nhớ', 'Nghề in và tri thức', 'Du lịch sinh thái'],
  3: ['Trí tuệ nhân tạo trong y khoa', 'Kinh tế học hành vi', 'Ngôn ngữ ảnh hưởng tư duy', 'Bảo tồn hay phát triển'],
};

export interface GenerateReadingRequest {
  part: ReadingPart;
  topic: string;
  difficulty: ReadingDifficulty;
  /** Up to three kinds; empty lets the part's usual mix decide. */
  kinds: GeneratedKind[];
}

export interface GeneratedReadingItem {
  id: string;
  part: ReadingPart;
  topic: string;
  difficulty: ReadingDifficulty;
  /** The groups the passage really has, in exam order. */
  plan: PlannedGroup[];
  summaryVi: string;
  passage: ReadingPassage;
  createdAt: string;
  /** False when the table is missing or the insert failed: the passage lasts for this visit only. */
  saved: boolean;
}

/** The op returned a passage that fails the app's own checks. The message is for the learner. */
export class ReadingCheckError extends Error {}

/**
 * Problems with a result from the op or the table; empty when it can be
 * opened. With `kinds`, the passage must also follow the plan those kinds
 * make, so a result for another request is never shown.
 */
export function generatedReadingProblems(value: unknown, part: ReadingPart, kinds?: readonly GeneratedKind[]): string[] {
  const g = value as GeneratedReading | null;
  const p = g?.passage;
  if (!g || typeof g !== 'object' || !Array.isArray(g.plan) || !p || !Array.isArray(p.paragraphs) || !Array.isArray(p.groups)) {
    return ['not a generated Reading passage'];
  }
  if (p.part !== part) return [`expected Part ${part}, got Part ${String(p.part)}`];
  const problems = generatedPassageProblems(g);
  if (kinds && planKey(g.plan) !== planKey(readingPlan(part, kinds))) problems.push(`plan ${planKey(g.plan)} is not the one asked for`);
  return problems;
}

/** The op's result as an item, with a passage id of its own. Assumes it passed the checks. */
export function toGeneratedItem(
  id: string,
  g: GeneratedReading,
  extra: { topic: string; createdAt: string; saved: boolean },
): GeneratedReadingItem {
  const passage = rekeyPassage(g.passage as unknown as ReadingPassage, generatedPassageId(id));
  return {
    id,
    part: passage.part,
    topic: extra.topic,
    difficulty: passage.difficulty,
    plan: g.plan,
    summaryVi: g.summaryVi,
    passage,
    createdAt: extra.createdAt,
    saved: extra.saved,
  };
}

/** What the `passage` column keeps. */
export const storedReading = (item: GeneratedReadingItem): GeneratedReading => ({
  plan: item.plan,
  summaryVi: item.summaryVi,
  passage: item.passage as unknown as GeneratedReading['passage'],
});

export function generatedReadingTest(item: GeneratedReadingItem): ReadingTest {
  const level = { easy: 'dễ', medium: 'vừa', hard: 'khó' }[item.difficulty];
  return {
    id: generatedReadingTestId(item.id),
    title: item.passage.title,
    kind: 'practice',
    descriptionVi: `Đề AI tạo, mức ${level}. ${item.summaryVi}`.trim(),
    passages: [item.passage],
  };
}

export interface GeneratedReadingRow {
  id: string;
  part: number;
  topic: string | null;
  difficulty: string;
  passage: unknown;
  created_at: string;
}

/** A stored row, or null when it no longer passes the checks. */
export function rowToGeneratedReading(row: GeneratedReadingRow): GeneratedReadingItem | null {
  const part = row.part as ReadingPart;
  if (generatedReadingProblems(row.passage, part).length) return null;
  const g = row.passage as GeneratedReading;
  const item = toGeneratedItem(row.id, g, { topic: row.topic ?? '', createdAt: row.created_at, saved: true });
  if (!(READING_DIFFICULTIES as readonly string[]).includes(row.difficulty)) return item;
  return { ...item, difficulty: row.difficulty as ReadingDifficulty };
}
