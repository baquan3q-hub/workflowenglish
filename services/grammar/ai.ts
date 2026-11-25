/**
 * Calls to the AI proxy for the grammar module. The payload fits the limits of `ai-proxy/ops/grammar.ts`
 * (goal 450, rule 900, prompt 800, answer 1200, question 500, theme 250 characters).
 */
import { invokeAi } from '../aiClient';
import {
  parseGeneratedDrills,
  parseGrammarGrade,
  type GrammarErrorTag,
  type GrammarGrade,
} from '../../supabase/functions/ai-proxy/ops/grammar';
import type { Item, Lesson, OpenItem } from '../../data/grammar/types';
import type { SavedAiItem } from './store';

const cut = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

/** What the AI needs to know about the lesson: the outcome and the rule in short. */
export function lessonContext(lesson: Lesson) {
  const forms = lesson.forms.map((f) => f.label + ': ' + f.pattern).join('; ');
  return {
    goal: cut(lesson.title + ' (' + lesson.en + '). ' + lesson.hook, 450),
    rule: cut(forms + '. Khi dùng: ' + lesson.when.join(' '), 900),
  };
}

const VERB: Record<OpenItem['kind'], string> = {
  translate: 'Dịch sang tiếng Anh, dùng cấu trúc của bài',
  write: 'Viết bằng tiếng Anh, dùng cấu trúc của bài',
  speak: 'Nói bằng tiếng Anh (bản chép lời), dùng cấu trúc của bài',
};

/** Task text for an open item, with the model answer as a reference for the grader. */
export function openTask(item: Pick<OpenItem, 'kind' | 'task' | 'model'>) {
  return cut(VERB[item.kind] + ': ' + item.task + ' (Câu mẫu tham khảo: ' + item.model + ')', 800);
}

export function gradeOpen(lesson: Lesson, task: string, answer: string, theme: string, signal?: AbortSignal): Promise<GrammarGrade> {
  return invokeAi<unknown>(
    'gradeGrammarProduction',
    {
      ...lessonContext(lesson),
      prompt: cut(task, 800),
      answer: cut(answer, 1200),
      theme: cut(theme, 250),
    },
    { signal },
  ).then(parseGrammarGrade);
}

/** Concise one-line feedback summary passed to the AI tutor after grading. */
export function formatFeedbackSummary(g?: GrammarGrade): string | undefined {
  if (!g) return undefined;
  const parts = [
    g.errorTag ? `Lỗi: ${g.errorTag}` : '',
    g.corrected && g.corrected !== g.original ? `Sửa: "${g.corrected}"` : '',
    g.explanationVi,
  ].filter(Boolean);
  return parts.length ? cut(parts.join(' · '), 500) : undefined;
}

/** The AI tutor: a free question about the lesson, or a hint for the task at hand. */
export async function askTutor(
  lesson: Lesson,
  ask: {
    task?: string;
    answer?: string;
    question?: string;
    feedback?: string;
    history?: { q: string; a: string }[];
  },
  theme: string,
  signal?: AbortSignal,
) {
  const history = ask.history
    ?.slice(-6)
    .map((h) => ({ q: cut(h.q, 300), a: cut(h.a, 600) }));
  const r = await invokeAi<{ hint: string }>(
    'explainGrammar',
    {
      ...lessonContext(lesson),
      prompt: cut(ask.task || 'Hỏi về bài ' + lesson.title, 800),
      answer: ask.answer ? cut(ask.answer, 1200) : undefined,
      question: ask.question ? cut(ask.question, 500) : undefined,
      feedback: ask.feedback ? cut(ask.feedback, 500) : undefined,
      history: history?.length ? history : undefined,
      theme: cut(theme, 250),
    },
    { signal },
  );
  return r.hint;
}

const promptTextOf = (i: Item) => ('prompt' in i ? i.prompt : 'wrong' in i ? i.wrong : 'task' in i ? i.task : '');

/** Generates 2-10 personalized grammar drills matching the lesson, theme, error focus, and history. */
export async function generateDrills(
  lesson: Lesson,
  opts: {
    count?: number;
    theme: string;
    focusTag?: GrammarErrorTag;
    weakTags?: GrammarErrorTag[];
    recentMistakes?: string[];
    savedAiItems?: SavedAiItem[];
    signal?: AbortSignal;
  }
): Promise<Item[]> {
  const count = typeof opts.count === 'number' && Number.isFinite(opts.count) ? Math.min(10, Math.max(2, Math.round(opts.count))) : 4;
  const savedPrompts = (opts.savedAiItems ?? []).slice(0, 14).map((s) => promptTextOf(s.item));
  const staticPrompts = lesson.items.slice(0, 10).map(promptTextOf);
  const avoidPrompts = [...new Set([...savedPrompts, ...staticPrompts].filter(Boolean))].slice(0, 24).map((s) => cut(s, 160));
  const raw = await invokeAi<unknown>(
    'generateGrammarDrills',
    {
      ...lessonContext(lesson),
      count,
      theme: cut(opts.theme, 250),
      focusTag: opts.focusTag,
      weakTags: opts.weakTags?.slice(0, 4),
      recentMistakes: opts.recentMistakes?.slice(0, 3).map((m) => cut(m, 180)),
      avoidPrompts,
    },
    { timeoutMs: 42_000, signal: opts.signal }
  );
  const uniq = Math.random().toString(36).slice(2, 6);
  const prefix = `ai:${lesson.id}:${Date.now().toString(36)}-${uniq}`;
  return parseGeneratedDrills(raw, prefix, { maxItems: count, minItems: Math.min(2, count) }) as Item[];
}

export const isRight = (g: GrammarGrade) => g.meaningKept && g.targetMet;
