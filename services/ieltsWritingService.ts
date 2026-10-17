import { IeltsAiFeedback, IeltsQuestion } from '../types';
import { writingTask2Questions } from '../data/ieltsWritingQuestions';
import { invokeAi } from './aiClient';

// ─── Grade Writing Task ──────────────────────────────────────────

/** Prompt, schema and model fallback live in the ai-proxy function (op gradeIeltsWriting). */
export async function gradeWritingTask(
  question: string,
  answer: string,
  essayType: string,
  targetBand: string,
  taskType: 'task_1' | 'task_2' = 'task_2'
): Promise<IeltsAiFeedback> {
  return invokeAi<IeltsAiFeedback>('gradeIeltsWriting', { question, answer, essayType, targetBand, taskType });
}

// ─── Get Writing Questions ──────────────────────────────────────────

export function getWritingQuestions(filters?: {
  taskOrPart?: string;
  essayType?: string;
  topic?: string;
  difficulty?: string;
}): IeltsQuestion[] {
  let questions = writingTask2Questions;

  if (filters?.taskOrPart) {
    questions = questions.filter(q => q.taskOrPart === filters.taskOrPart);
  }
  if (filters?.essayType) {
    questions = questions.filter(q => q.questionType === filters.essayType);
  }
  if (filters?.topic) {
    questions = questions.filter(q => q.topic.toLowerCase() === filters.topic!.toLowerCase());
  }
  if (filters?.difficulty) {
    questions = questions.filter(q => q.difficulty === filters.difficulty);
  }

  return questions;
}

export function getWritingQuestionById(id: string): IeltsQuestion | undefined {
  return writingTask2Questions.find(q => q.id === id);
}
