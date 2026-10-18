/**
 * AI-generated Listening parts (IELTS phase I11). The generateListeningSection
 * op writes and checks a part; the app checks it again with the same rules,
 * keeps it in `listening_sections` (migration 010) and opens it as a one-part
 * practice test whose id is `gen_<row id>`.
 *
 * Before the migration is applied a generated part still works for the
 * current visit; it is just not kept.
 */
import { registerListeningTests, unregisterListeningTest, type ListeningSection, type ListeningTest } from '../data/ielts/listening';
import {
  generatedSectionProblems,
  LISTENING_DIFFICULTIES,
  type GeneratedSection,
  type ListeningDifficulty,
  type ListeningPart,
} from '../supabase/functions/ai-proxy/ops/listeningGenerate.ts';
import { invokeAi } from './aiClient';
import { supabase } from './supabaseClient';

export type { ListeningDifficulty, ListeningPart };

const TABLE = 'listening_sections';
const TEST_PREFIX = 'gen_';

export const DIFFICULTY_LABELS_VI: Record<ListeningDifficulty, string> = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };

/** Topic ideas shown under the topic box, per part. */
export const TOPIC_IDEAS: Record<ListeningPart, string[]> = {
  1: ['Đặt bàn nhà hàng', 'Đăng ký câu lạc bộ thể thao', 'Thuê xe đạp', 'Báo mất đồ'],
  2: ['Giới thiệu bảo tàng', 'Lễ hội âm nhạc địa phương', 'Chương trình tình nguyện', 'Trung tâm thể thao mới'],
  3: ['Dự án nghiên cứu nhóm', 'Chuẩn bị bài thuyết trình', 'Nhận xét bài luận', 'Chọn môn học'],
  4: ['Lịch sử của giấy', 'Đô thị và biến đổi khí hậu', 'Tâm lý người tiêu dùng', 'Sinh vật biển sâu'],
};

export interface GenerateRequest {
  part: ListeningPart;
  topic: string;
  difficulty: ListeningDifficulty;
}

export interface GeneratedListening extends GenerateRequest {
  id: string;
  section: ListeningSection;
  createdAt: string;
  /** False when the table is missing or the insert failed: the part lasts for this visit only. */
  saved: boolean;
}

/** The op returned a part that fails the app's own checks. The message is for the learner. */
export class GeneratedCheckError extends Error {}

export const generatedTestId = (id: string) => `${TEST_PREFIX}${id}`;
export const isGeneratedTestId = (testId: string) => testId.startsWith(TEST_PREFIX);
export const generatedRowId = (testId: string) => testId.slice(TEST_PREFIX.length);

/** Problems with a part from the op or the table; empty when it can be opened. */
export function generatedProblems(section: unknown, part: ListeningPart): string[] {
  const s = section as GeneratedSection | null;
  if (!s || typeof s !== 'object' || !Array.isArray(s.segments) || !Array.isArray(s.groups) || !Array.isArray(s.speakers)) {
    return ['not a Listening section'];
  }
  if (s.part !== part) return [`expected Part ${part}, got Part ${String(s.part)}`];
  return generatedSectionProblems(s);
}

/**
 * Gives the part, its segments and groups ids of its own: every generated
 * Part 2 comes back as `gen-p2`, and drafts and audio progress are keyed by id.
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

export function generatedTest(g: GeneratedListening): ListeningTest {
  const level = DIFFICULTY_LABELS_VI[g.difficulty].toLowerCase();
  return {
    id: generatedTestId(g.id),
    title: g.section.title,
    kind: 'practice',
    descriptionVi: `Đề AI tạo, mức ${level}. ${g.section.contextVi}`,
    sections: [g.section],
  };
}

interface Row {
  id: string;
  part: number;
  topic: string | null;
  difficulty: string;
  section: unknown;
  created_at: string;
}

/** A stored row, or null when it no longer passes the checks. */
export function rowToGenerated(row: Row): GeneratedListening | null {
  const part = row.part as ListeningPart;
  const difficulty = (LISTENING_DIFFICULTIES as readonly string[]).includes(row.difficulty) ? (row.difficulty as ListeningDifficulty) : 'medium';
  if (generatedProblems(row.section, part).length) return null;
  return {
    id: row.id,
    part,
    topic: row.topic ?? '',
    difficulty,
    section: row.section as ListeningSection,
    createdAt: row.created_at,
    saved: true,
  };
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/** Asks the op for a part, checks it, saves it and makes it openable. Throws AiError or GeneratedCheckError. */
export async function generateListening(userId: string, req: GenerateRequest): Promise<GeneratedListening> {
  const topic = req.topic.trim().slice(0, 100);
  const raw = await invokeAi<unknown>('generateListeningSection', { part: req.part, topic, difficulty: req.difficulty });
  const problems = generatedProblems(raw, req.part);
  if (problems.length) {
    console.warn('[Listening] generated part failed checks:', problems);
    throw new GeneratedCheckError('Đề vừa tạo chưa đạt kiểm định. Bạn thử tạo lại nhé.');
  }
  const id = newId();
  const section = rekeySection(raw as ListeningSection, `gen-${id.slice(0, 8)}`);
  const item: GeneratedListening = { id, ...req, topic, section, createdAt: new Date().toISOString(), saved: true };

  if (userId) {
    const { error } = await supabase
      .from(TABLE)
      .insert({ id, user_id: userId, part: req.part, topic: topic || null, difficulty: req.difficulty, section });
    if (error) {
      console.warn('[Listening] could not save generated part:', error.message);
      item.saved = false;
    }
  } else {
    item.saved = false;
  }
  registerListeningTests([generatedTest(item)]);
  return item;
}

/** The learner's generated parts, newest first. Empty when the table is missing. */
export async function getGeneratedListening(userId: string, limit = 20): Promise<GeneratedListening[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, part, topic, difficulty, section, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[Listening] could not load generated parts:', error.message);
    return [];
  }
  const list = ((data ?? []) as Row[]).map(rowToGenerated).filter((g): g is GeneratedListening => g !== null);
  registerListeningTests(list.map(generatedTest));
  return list;
}

/** Loads one generated test by its test id, for opening an old attempt. */
export async function loadGeneratedTest(testId: string): Promise<ListeningTest | null> {
  if (!isGeneratedTestId(testId)) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, part, topic, difficulty, section, created_at')
    .eq('id', generatedRowId(testId))
    .maybeSingle();
  if (error || !data) return null;
  const g = rowToGenerated(data as Row);
  if (!g) return null;
  const test = generatedTest(g);
  registerListeningTests([test]);
  return test;
}

export async function deleteGeneratedListening(id: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    console.warn('[Listening] could not delete generated part:', error.message);
    return false;
  }
  unregisterListeningTest(generatedTestId(id));
  return true;
}
