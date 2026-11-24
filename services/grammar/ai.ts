/**
 * Calls to the AI proxy for the grammar module. The payload fits the limits of `ai-proxy/ops/grammar.ts`
 * (goal 450, rule 900, prompt 800, answer 1200, question 500, theme 250 characters).
 */
import { invokeAi } from '../aiClient';
import { parseGrammarGrade, type GrammarGrade } from '../../supabase/functions/ai-proxy/ops/grammar';
import type { Lesson, OpenItem } from '../../data/grammar/types';

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

export function gradeOpen(lesson: Lesson, task: string, answer: string, theme: string): Promise<GrammarGrade> {
  return invokeAi<unknown>('gradeGrammarProduction', {
    ...lessonContext(lesson),
    prompt: cut(task, 800),
    answer: cut(answer, 1200),
    theme: cut(theme, 250),
  }).then(parseGrammarGrade);
}

/** The AI tutor: a free question about the lesson, or a hint for the task at hand. */
export async function askTutor(
  lesson: Lesson,
  ask: { task?: string; answer?: string; question?: string },
  theme: string
) {
  const r = await invokeAi<{ hint: string }>('explainGrammar', {
    ...lessonContext(lesson),
    prompt: cut(ask.task || 'Hỏi về bài ' + lesson.title, 800),
    answer: ask.answer ? cut(ask.answer, 1200) : undefined,
    question: ask.question ? cut(ask.question, 500) : undefined,
    theme: cut(theme, 250),
  });
  return r.hint;
}

export const isRight = (g: GrammarGrade) => g.meaningKept && g.targetMet;
