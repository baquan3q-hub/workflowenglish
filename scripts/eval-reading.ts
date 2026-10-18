/**
 * Quality of the generateReadingPassage op: how many generated passages pass
 * validation, and what they contain. Not part of vitest: it calls the
 * deployed ai-proxy and uses your quota (the op allows 10 calls an hour).
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   SUPABASE_ACCESS_TOKEN=<your session access_token> \
 *   node --experimental-strip-types scripts/eval-reading.ts [count=6] [--kinds tfng,mcq] [--out <dir>]
 *
 * Parts and difficulties take turns (Passage 1 easy, Passage 2 medium, ...).
 * Without --kinds each part gets its usual mix. The op already rejects broken
 * output (retry, then the fallback model), so a 502 is a passage that failed
 * every attempt. Each passage that comes back is checked again here with the
 * same rules. With --out, every passage is written as JSON for a human
 * read-through.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GENERATED_KINDS,
  generatedPassageProblems,
  groupKind,
  planKey,
  readingPlan,
  READING_DIFFICULTIES,
  type GeneratedKind,
  type GeneratedReading,
  type ReadingDifficulty,
  type ReadingPart,
} from '../supabase/functions/ai-proxy/ops/readingGenerate.ts';
import { passageWordCount } from '../supabase/functions/ai-proxy/ops/readingRules.ts';

const env = (name: string) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. See the header of scripts/eval-reading.ts.`);
    process.exit(1);
  }
  return v;
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] ?? '' : '';
};
const outDir = flag('--out');
const kinds = flag('--kinds')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean) as GeneratedKind[];
const unknown = kinds.filter((k) => !(GENERATED_KINDS as readonly string[]).includes(k));
if (unknown.length) {
  console.error(`Unknown kinds: ${unknown.join(', ')}. Use: ${GENERATED_KINDS.join(', ')}`);
  process.exit(1);
}
const flagValues = new Set([outDir, flag('--kinds')].filter(Boolean));
const count = Math.max(1, Math.min(30, Number(args.find((a) => /^\d+$/.test(a) && !flagValues.has(a)) ?? 6)));
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

const latencies: number[] = [];
const kindCounts: Record<string, number> = {};
const answerValues: Record<string, number> = {};
const skills: Record<string, number> = {};
const failures: Record<string, number> = {};
const wordCounts: number[] = [];
let returned = 0;
let passedHere = 0;
let failed = 0;
let questions = 0;
let withDistractor = 0;
let withParaphrase = 0;
let glossary = 0;

for (let i = 0; i < count; i++) {
  const part = ((i % 3) + 1) as ReadingPart;
  const difficulty: ReadingDifficulty = READING_DIFFICULTIES[i % 3];
  const plan = readingPlan(part, kinds);
  const label = `#${i + 1} Passage ${part} ${difficulty} [${planKey(plan)}]`;
  const started = performance.now();
  let result: GeneratedReading;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ op: 'generateReadingPassage', payload: { part, difficulty, topic: '', kinds } }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      console.log(`${label}  rate limited, stopping (${body.message ?? ''})`);
      break;
    }
    if (!res.ok) throw new Error(`${res.status} ${body.error ?? ''} ${body.message ?? ''}`.trim());
    result = body.data as GeneratedReading;
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

  const p = result.passage;
  const problems = p.part !== part ? [`asked for Passage ${part}, got ${p.part}`] : generatedPassageProblems(result, difficulty);
  if (planKey(result.plan) !== planKey(plan)) problems.push(`plan ${planKey(result.plan)} is not ${planKey(plan)}`);
  if (problems.length === 0) passedHere++;

  const qs = p.groups.flatMap((g) => g.questions);
  questions += qs.length;
  withDistractor += qs.filter((q) => q.distractor).length;
  withParaphrase += qs.filter((q) => q.paraphrase).length;
  glossary += p.glossary.length;
  for (const g of p.groups) {
    const kind = groupKind(g) ?? g.type;
    kindCounts[kind] = (kindCounts[kind] ?? 0) + g.questions.length;
    if (g.type === 'tfng') for (const q of g.questions) answerValues[q.answers[0]] = (answerValues[q.answers[0]] ?? 0) + 1;
  }
  for (const q of qs) skills[q.skill] = (skills[q.skill] ?? 0) + 1;
  const words = passageWordCount(p);
  wordCounts.push(words);

  console.log(
    `${label}  ${problems.length ? 'FAIL' : 'ok  '}  ${ms} ms  "${p.title}"  ${words} words, ${p.paragraphs.length} paragraphs, ` +
      `${qs.length} questions, ${qs.filter((q) => q.distractor).length} distractors`,
  );
  for (const msg of problems.slice(0, 5)) console.log(`    ${msg}`);
  if (outDir) writeFileSync(join(outDir, `passage${part}-${difficulty}-${i + 1}.json`), JSON.stringify(result, null, 2));
}

const sorted = [...latencies].sort((a, b) => a - b);
const asked = returned + failed;
console.log('\n--- generateReadingPassage ---');
console.log(`Requests:            ${asked}`);
console.log(`Returned by the op:  ${returned} (${pct(returned, asked)})  failed: ${failed}`);
console.log(`Pass the app checks: ${passedHere} of ${returned} returned (${pct(passedHere, returned)})`);
console.log(`Latency:             p50 ${percentile(sorted, 50)} ms, p95 ${percentile(sorted, 95)} ms`);
if (returned) {
  console.log(`Passage length:      ${Math.min(...wordCounts)}-${Math.max(...wordCounts)} words`);
  console.log(`Distractors:         ${withDistractor} of ${questions} questions (${pct(withDistractor, questions)})`);
  console.log(`Paraphrase notes:    ${withParaphrase} of ${questions} questions (${pct(withParaphrase, questions)})`);
  console.log(`Glossary entries:    ${glossary} (${(glossary / returned).toFixed(1)} a passage)`);
  console.log('Question types:');
  for (const [kind, n] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${kind.padEnd(19)} ${String(n).padStart(4)}  ${pct(n, questions)}`);
  console.log('Skills:');
  for (const [skill, n] of Object.entries(skills).sort((a, b) => b[1] - a[1])) console.log(`  ${skill.padEnd(19)} ${String(n).padStart(4)}  ${pct(n, questions)}`);
  const values = Object.entries(answerValues).sort();
  if (values.length) console.log(`T/F/NG answers:      ${values.map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
if (Object.keys(failures).length) {
  console.log('Failures:');
  for (const [reason, n] of Object.entries(failures)) console.log(`  ${n}×  ${reason}`);
}
