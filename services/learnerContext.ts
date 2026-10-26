/**
 * The learner summary (Hồ sơ học tập) for this visit, set by
 * learningProfileService when the profile loads or is saved. aiClient adds it
 * to the payload of the ops that personalise (`PERSONALISED_OPS`).
 */

let summary = '';

export const setLearnerSummary = (text: string) => {
  summary = text;
};

export const learnerSummaryNow = () => summary;

/** Ops whose prompt reads `payload.learner` (supabase/functions/ai-proxy/ops/learner.ts). */
export const PERSONALISED_OPS: ReadonlySet<string> = new Set([
  'generateLesson',
  'recommendWords',
  'ieltsIdeas',
  'ieltsChat',
  'generateReadingPassage',
  'generateWritingPrompt',
]);

/** The payload to send: with the learner summary for a personalised op, unchanged otherwise. */
export function withLearner(op: string, payload: unknown): unknown {
  if (!summary || !PERSONALISED_OPS.has(op) || !payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  if ('learner' in (payload as Record<string, unknown>)) return payload;
  return { ...(payload as Record<string, unknown>), learner: summary };
}
