/**
 * Quality of the generateListeningSection op: how many generated parts pass
 * validation, and what they contain. Not part of vitest: it calls the
 * deployed ai-proxy and uses your quota (the op allows 10 calls an hour).
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   SUPABASE_ACCESS_TOKEN=<your session access_token> \
 *   node --experimental-strip-types scripts/eval-listening.ts [count=8] [--out <dir>]
 *
 * Parts and difficulties take turns (Part 1 easy, Part 2 medium, ...). The op
 * already rejects broken output (retry, then the fallback model), so a 502 is
 * a part that failed every attempt. Each part that comes back is checked again
 * here with the same rules. With --out, every part is written as JSON for a
 * human read-through.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  generatedSectionProblems,
  LISTENING_DIFFICULTIES,
  type GeneratedSection,
  type ListeningDifficulty,
  type ListeningPart,
} from '../supabase/functions/ai-proxy/ops/listeningGenerate.ts';
import { LISTENING_TEXT_LIMIT, segmentAudioText } from '../supabase/functions/ai-proxy/ops/listeningRules.ts';

const env = (name: string) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. See the header of scripts/eval-listening.ts.`);
    process.exit(1);
  }
  return v;
};

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const outDir = outAt >= 0 ? args[outAt + 1] : '';
const count = Math.max(1, Math.min(40, Number(args.find((a, i) => /^\d+$/.test(a) && i !== outAt + 1) ?? 8)));
if (outDir) mkdirSync(outDir, { recursive: true });

const url = `${env('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/ai-proxy`;
const headers = {
  'Content-Type': 'application/json',
  apikey: env('SUPABASE_ANON_KEY'),
  Authorization: `Bearer ${env('SUPABASE_ACCESS_TOKEN')}`,
};

const percentile = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '-');
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const latencies: number[] = [];
const typeCounts: Record<string, number> = {};
const failures: Record<string, number> = {};
let returned = 0;
let passedHere = 0;
let failed = 0;
let questions = 0;
let withDistractor = 0;
let withParaphrase = 0;
let longestSegment = 0;
const wordTotals: number[] = [];
const answerLetters: Record<string, number> = {};

for (let i = 0; i < count; i++) {
  const part = ((i % 4) + 1) as ListeningPart;
  const difficulty: ListeningDifficulty = LISTENING_DIFFICULTIES[i % 3];
  const label = `#${i + 1} Part ${part} ${difficulty}`;
  const started = performance.now();
  let section: GeneratedSection;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ op: 'generateListeningSection', payload: { part, difficulty, topic: '' } }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      console.log(`${label}  rate limited, stopping (${body.message ?? ''})`);
      break;
    }
    if (!res.ok) throw new Error(`${res.status} ${body.error ?? ''} ${body.message ?? ''}`.trim());
    section = body.data as GeneratedSection;
  } catch (err) {
    failed++;
    const reason = (err as Error).message;
    failures[reason.slice(0, 60)] = (failures[reason.slice(0, 60)] ?? 0) + 1;
    console.log(`${label}  failed  ${reason}`);
    continue;
  }
  const ms = Math.round(performance.now() - started);
  latencies.push(ms);
  returned++;

  const problems = section.part === part ? generatedSectionProblems(section, difficulty) : [`asked for Part ${part}, got ${section.part}`];
  if (problems.length === 0) passedHere++;

  const qs = section.groups.flatMap((g) => g.questions);
  questions += qs.length;
  withDistractor += qs.filter((q) => q.distractor).length;
  withParaphrase += qs.filter((q) => q.paraphrase).length;
  for (const g of section.groups) {
    typeCounts[g.type] = (typeCounts[g.type] ?? 0) + g.questions.length;
    if (g.type !== 'completion') for (const q of g.questions) answerLetters[q.answers[0]] = (answerLetters[q.answers[0]] ?? 0) + 1;
  }
  const total = words(section.segments.flatMap((s) => s.lines.map((l) => l.text)).join(' '));
  wordTotals.push(total);
  for (const s of section.segments) longestSegment = Math.max(longestSegment, segmentAudioText(s.lines).length);

  console.log(
    `${label}  ${problems.length ? 'FAIL' : 'ok  '}  ${ms} ms  "${section.title}"  ${total} words, ${section.segments.length} segments, ` +
      `${qs.filter((q) => q.distractor).length} distractors`,
  );
  for (const p of problems.slice(0, 5)) console.log(`    ${p}`);
  if (outDir) writeFileSync(join(outDir, `part${part}-${difficulty}-${i + 1}.json`), JSON.stringify(section, null, 2));
}

const sorted = [...latencies].sort((a, b) => a - b);
const asked = returned + failed;
console.log('\n--- generateListeningSection ---');
console.log(`Requests:            ${asked}`);
console.log(`Returned by the op:  ${returned} (${pct(returned, asked)})  failed: ${failed}`);
console.log(`Pass the app checks: ${passedHere} of ${returned} returned (${pct(passedHere, returned)})`);
console.log(`Latency:             p50 ${percentile(sorted, 50)} ms, p95 ${percentile(sorted, 95)} ms`);
if (returned) {
  console.log(`Script length:       ${Math.min(...wordTotals)}-${Math.max(...wordTotals)} words; longest segment ${longestSegment}/${LISTENING_TEXT_LIMIT} characters`);
  console.log(`Distractors:         ${withDistractor} of ${questions} questions (${pct(withDistractor, questions)})`);
  console.log(`Paraphrase notes:    ${withParaphrase} of ${questions} questions (${pct(withParaphrase, questions)})`);
  console.log('Question types:');
  for (const [type, n] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${type.padEnd(12)} ${String(n).padStart(4)}  ${pct(n, questions)}`);
  const letters = Object.entries(answerLetters).sort();
  if (letters.length) console.log(`Choice answers:      ${letters.map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
if (Object.keys(failures).length) {
  console.log('Failures:');
  for (const [reason, n] of Object.entries(failures)) console.log(`  ${n}×  ${reason}`);
}
