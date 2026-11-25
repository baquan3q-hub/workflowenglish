/**
 * Asks the AI to explain a word or sentence from a Reading passage. Answers
 * are kept for the session, so selecting the same words again is free.
 */
import { invokeAi, withAbortSignal } from './aiClient';
import type { ExplainMode, ExplainResult } from '../supabase/functions/ai-proxy/ops/readingExplain.ts';

export type { ExplainMode, ExplainResult } from '../supabase/functions/ai-proxy/ops/readingExplain.ts';

const cache = new Map<string, Promise<ExplainResult>>();

export function explainReading(
  mode: ExplainMode,
  text: string,
  context: string,
  api: typeof invokeAi = invokeAi,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  if (signal?.aborted) return withAbortSignal(Promise.resolve(undefined as never), signal);
  const key = `${mode}\u0000${text.toLowerCase()}\u0000${context}`;
  const hit = cache.get(key);
  if (hit) return withAbortSignal(hit, signal);
  const p = api<ExplainResult>('readingExplain', { mode, text, context }, { timeoutMs: 60_000 });
  cache.set(key, p);
  // A failed call is not remembered, so "Thử lại" really asks again.
  p.catch(() => cache.delete(key));
  return withAbortSignal(p, signal);
}
