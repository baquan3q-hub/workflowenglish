/**
 * Writing prompts that are not in the bundled bank: published library prompts
 * (`wlib_…`) and the ones the AI wrote for this learner (`wgen_…`). They are
 * registered here when they load, so the hub, drafts and the attempt history
 * find them like bundled ones. The map lives for this visit only.
 */
import type { IeltsQuestion } from '../types';
import { writingTask2Questions } from '../data/ieltsWritingQuestions';

const extra = new Map<string, IeltsQuestion>();

export function registerWritingQuestions(questions: readonly IeltsQuestion[]) {
  for (const q of questions) extra.set(q.id, q);
}

export function unregisterWritingQuestion(id: string) {
  extra.delete(id);
}

/** Bundled prompts first, then the registered ones in the order they came. */
export const allWritingQuestions = (): IeltsQuestion[] => [...writingTask2Questions, ...extra.values()];

export const registeredWritingQuestions = (prefix: string): IeltsQuestion[] => [...extra.values()].filter((q) => q.id.startsWith(prefix));
