/**
 * AI-written Writing prompts (pure): ids, the checks the app runs again on what
 * the op returns, and the stored row. services/writingGenerationService.ts does
 * the I/O.
 *
 * A row of `writing_generated` (migration 014) keeps the op's whole result in
 * its `question` column: { task, summaryVi, question }.
 */
import type { IeltsQuestion } from '../types';
import {
  generatedWritingProblems,
  type GeneratedWriting,
} from '../supabase/functions/ai-proxy/ops/writingGenerate.ts';
import { WRITING_DIFFICULTIES, type WritingDifficultyId, type WritingTaskId } from '../supabase/functions/ai-proxy/ops/writingRules.ts';
import { toWritingQuestion, type WritingQuestionBody } from './writingLibraryLogic';

export type { GeneratedWriting, WritingDifficultyId, WritingTaskId };

const PREFIX = 'wgen_';

export const generatedWritingQuestionId = (rowId: string) => `${PREFIX}${rowId}`;
export const isGeneratedWritingQuestionId = (id: string) => id.startsWith(PREFIX);

export const WRITING_DIFFICULTY_HINTS: Record<WritingDifficultyId, string> = {
  easy: 'Chủ đề quen thuộc, câu hỏi rõ ràng, số liệu dễ nhìn. Hợp band 5–6.',
  medium: 'Đề thường gặp trong IELTS, vài đặc điểm để so sánh. Hợp band 6–7.',
  hard: 'Chủ đề trừu tượng hoặc chính sách, số liệu có điểm giao nhau, cực trị. Hợp band 7–8.',
};

/** Topic ideas shown under the topic box, per task. */
export const WRITING_TOPIC_IDEAS: Record<WritingTaskId, string[]> = {
  task_1: ['Khách du lịch theo năm', 'Tỉ lệ tái chế rác thải', 'Chi tiêu của hộ gia đình', 'Dùng điện thoại và Internet'],
  task_2: ['Mạng xã hội và giới trẻ', 'Đại học miễn phí', 'Làm việc từ xa', 'Bảo vệ môi trường'],
};

export interface GenerateWritingRequest {
  task: WritingTaskId;
  /** Empty lets the op pick. */
  questionType: string;
  topic: string;
  difficulty: WritingDifficultyId;
}

export interface GeneratedWritingItem {
  id: string;
  task: WritingTaskId;
  topic: string;
  difficulty: WritingDifficultyId;
  summaryVi: string;
  /** The prompt in the shape every Writing screen uses, with the id `wgen_<id>`. */
  question: IeltsQuestion;
  createdAt: string;
  /** False when the table is missing or the insert failed: the prompt lasts for this visit only. */
  saved: boolean;
}

/** The op returned a prompt that fails the app's own checks. The message is for the learner. */
export class WritingCheckError extends Error {}

/**
 * Problems with a result from the op or the table; empty when it can be used.
 * With `req`, the prompt must also be what was asked for.
 */
export function generatedWritingResultProblems(value: unknown, req?: Pick<GenerateWritingRequest, 'task' | 'questionType' | 'difficulty'>): string[] {
  const g = value as GeneratedWriting | null;
  const q = g?.question;
  if (!g || typeof g !== 'object' || !q || typeof q !== 'object' || typeof q.prompt !== 'string' || (g.task !== 'task_1' && g.task !== 'task_2')) {
    return ['not a generated Writing prompt'];
  }
  if (!(WRITING_DIFFICULTIES as readonly string[]).includes(q.difficulty)) return [`unknown difficulty ${String(q.difficulty)}`];
  if (req) {
    if (g.task !== req.task) return [`expected ${req.task}, got ${g.task}`];
    if (q.difficulty !== req.difficulty) return [`expected ${req.difficulty}, got ${q.difficulty}`];
    if (req.questionType && q.questionType !== req.questionType) return [`expected ${req.questionType}, got ${q.questionType}`];
  }
  return generatedWritingProblems({ ...g, question: { ...q, planningPrompts: q.planningPrompts ?? [], vocabulary: q.vocabulary ?? [] } }, { task: g.task, questionType: q.questionType });
}

/** The op's result as an item with a prompt of its own. Assumes it passed the checks. */
export function toGeneratedWritingItem(id: string, g: GeneratedWriting, extra: { topic: string; createdAt: string; saved: boolean }): GeneratedWritingItem {
  const body: WritingQuestionBody = g.question;
  return {
    id,
    task: g.task,
    topic: extra.topic || g.question.topic,
    difficulty: g.question.difficulty,
    summaryVi: g.summaryVi,
    question: toWritingQuestion(generatedWritingQuestionId(id), g.task, body),
    createdAt: extra.createdAt,
    saved: extra.saved,
  };
}

export interface GeneratedWritingRow {
  id: string;
  task: string;
  topic: string | null;
  difficulty: string;
  question: unknown;
  created_at: string;
}

/** A stored row, or null when it no longer passes the checks. */
export function rowToGeneratedWriting(row: GeneratedWritingRow): GeneratedWritingItem | null {
  if (generatedWritingResultProblems(row.question).length) return null;
  const g = row.question as GeneratedWriting;
  return toGeneratedWritingItem(row.id, g, { topic: row.topic ?? '', createdAt: row.created_at, saved: true });
}
