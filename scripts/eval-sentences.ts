/**
 * Accuracy and latency of the gradeSentence op against tests/eval/sentences.json.
 * Not part of vitest: it calls the deployed ai-proxy and uses your quota
 * (40 calls of the 60/hour gradeSentence limit).
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   SUPABASE_ACCESS_TOKEN=<your session access_token> \
 *   node --experimental-strip-types scripts/eval-sentences.ts
 *
 * Items whose `label` is still null are graded but left out of agreement.
 */

import { readFileSync } from 'node:fs';

type Verdict = 'correct' | 'acceptable' | 'incorrect';

interface EvalItem {
  id: number;
  level: string;
  promptVi: string;
  targetWords: string[];
  references: string[];
  answer: string;
  label: Verdict | null;
}

const env = (name: string) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. See the header of scripts/eval-sentences.ts.`);
    process.exit(1);
  }
  return v;
};

const url = `${env('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/ai-proxy`;
const headers = {
  'Content-Type': 'application/json',
  apikey: env('SUPABASE_ANON_KEY'),
  Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`,
};

const { items } = JSON.parse(readFileSync(new URL('../tests/eval/sentences.json', import.meta.url), 'utf8')) as {
  items: EvalItem[];
};

const percentile = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0;

const latencies: number[] = [];
let labelled = 0;
let exact = 0;
// "Cần sửa" or not: the call that decides whether the learner must redo it.
let binary = 0;
let failed = 0;

for (const it of items) {
  const started = performance.now();
  let verdict: Verdict | null = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        op: 'gradeSentence',
        payload: { promptVi: it.promptVi, answer: it.answer, level: it.level, targetWords: it.targetWords, references: it.references },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${body.error ?? ''} ${body.message ?? ''}`.trim());
    verdict = body.data?.verdict ?? null;
  } catch (err) {
    failed++;
    console.log(`#${it.id}  error  ${(err as Error).message}`);
    continue;
  }
  const ms = Math.round(performance.now() - started);
  latencies.push(ms);

  let mark = ' ';
  if (it.label) {
    labelled++;
    if (verdict === it.label) exact++;
    if ((verdict === 'incorrect') === (it.label === 'incorrect')) binary++;
    mark = verdict === it.label ? '=' : 'x';
  }
  console.log(`#${String(it.id).padEnd(3)} ${mark} ${String(verdict).padEnd(10)} label ${String(it.label).padEnd(10)} ${ms} ms  ${it.answer}`);
}

latencies.sort((a, b) => a - b);
const pct = (n: number) => (labelled ? `${Math.round((n / labelled) * 100)}%` : 'n/a');
console.log('');
console.log(`Graded ${latencies.length}/${items.length}, ${failed} failed`);
console.log(`Agreement on ${labelled} labelled: exact ${pct(exact)}, needs-fix vs not ${pct(binary)}`);
console.log(`Latency p50 ${percentile(latencies, 50)} ms, p95 ${percentile(latencies, 95)} ms (round trip)`);
