/**
 * Gemini REST calls with model fallback. Uses only fetch, no SDK.
 */
import { parseModelJson, type GeminiRequest, type OpSpec } from './lib.ts';
import { generateBody, interactionAudio, interactionsBody, usesInteractions, wavToPcm } from './models.ts';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const BASE = `${API}/models`;

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number | 'timeout',
    /** Start of Gemini's error body, used to tell the app why. */
    readonly body = '',
  ) {
    super(message);
  }
}

export interface CallResult {
  model: string;
  /** Parsed JSON, plain text or base64 audio depending on the op kind. */
  data: unknown;
  /** Gemini's full response, for ops with an `after` hook. */
  raw: unknown;
}

function send(apiKey: string, url: string, body: unknown, label: string, timeoutMs: number): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err) => {
    const timeout = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new UpstreamError(`${label}: ${err}`, timeout ? 'timeout' : 0);
  });
}

function post(apiKey: string, model: string, req: GeminiRequest, method: string, timeoutMs: number): Promise<Response> {
  if (usesInteractions(model)) return send(apiKey, `${API}/interactions`, interactionsBody(model, req), model, timeoutMs);
  return send(apiKey, `${BASE}/${model}:${method}`, generateBody(model, req), model, timeoutMs);
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

type GeminiJson = { candidates?: { content?: { parts?: { text?: string; inlineData?: { data?: string } }[] } }[] };

function textOf(json: GeminiJson): string {
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

function extract(spec: OpSpec, model: string, json: GeminiJson): unknown {
  if (spec.kind === 'audio' && usesInteractions(model)) {
    // WAV from the Interactions API; the app expects bare PCM.
    return bytesToBase64(wavToPcm(base64ToBytes(interactionAudio(json as never))));
  }
  if (spec.kind === 'audio') {
    const data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!data) throw new Error('no audio returned');
    return data;
  }
  const text = textOf(json).trim();
  if (!text) throw new Error('empty response');
  if (spec.kind === 'text') return text;
  const parsed = parseModelJson(text);
  return spec.finalize ? spec.finalize(parsed) : parsed;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FAST_ATTEMPT_MS = 10_000;
const FALLBACK_FAST_ATTEMPT_MS = 8_500;
const STREAM_CONNECT_MS = 12_000;

/** Total wall-clock budget for an op, keeping Edge Function gateway timeouts safely out of reach. */
function totalBudgetMs(spec: OpSpec, modelCount: number): number {
  if (modelCount <= 1) return spec.timeoutMs;
  if (spec.kind === 'audio' || spec.timeoutMs >= 45_000) {
    return Math.min(115_000, Math.max(spec.timeoutMs, Math.round(spec.timeoutMs * 1.25)));
  }
  return Math.min(38_000, Math.max(spec.timeoutMs + 5_000, 28_000));
}

/** Per-attempt HTTP timeout so a stalled fallback model fails fast and never starves other candidates. */
function attemptTimeoutMs(spec: OpSpec, modelCount: number, modelsLeft: number, remainingMs: number): number {
  if (modelCount <= 1) return Math.max(1_000, Math.min(spec.timeoutMs, remainingMs));
  if (spec.kind === 'stream') {
    const cap = modelsLeft > 1 ? Math.min(spec.timeoutMs, STREAM_CONNECT_MS) : spec.timeoutMs;
    return Math.max(1_500, Math.min(cap, remainingMs));
  }
  if (spec.kind !== 'audio' && spec.timeoutMs <= 30_000) {
    const cap = modelsLeft === modelCount ? FAST_ATTEMPT_MS : FALLBACK_FAST_ATTEMPT_MS;
    return Math.max(1_500, Math.min(spec.timeoutMs, cap, remainingMs));
  }
  if (modelsLeft > 1) {
    return Math.max(2_000, Math.min(spec.timeoutMs, Math.max(20_000, Math.floor(remainingMs * 0.6))));
  }
  return Math.max(2_000, Math.min(spec.timeoutMs, remainingMs));
}

/** Picks the most informative failure when every model failed: avoid hiding 503/429 behind a backup timeout. */
function pickFailure(errors: UpstreamError[]): UpstreamError {
  if (!errors.length) return new UpstreamError('no model tried', 0);
  const fatalKey = errors.find((e) => e.status === 401 || e.status === 403);
  if (fatalKey) return fatalKey;
  const nonTimeout = errors.filter((e) => e.status !== 'timeout');
  if (nonTimeout.length > 0 && errors.some((e) => e.status === 503 || e.status === 502 || e.status === 429)) {
    // Only report quota if no model responded 503 (transient busy).
    const busy = nonTimeout.find((e) => e.status === 503 || e.status === 502);
    if (busy) return busy;
    const quota = nonTimeout.find((e) => e.status === 429);
    if (quota) return quota;
  }
  return errors[errors.length - 1];
}

const isFatalStatus = (status: number) => status === 401 || status === 403;

/**
 * Tries each model in turn within a bounded total deadline.
 * Pass 1 tries every model once quickly (retrying malformed output once on the
 * same model). If every failure was transient (503 / invalid output) and budget
 * remains, Pass 2 cools down briefly and retries those candidates.
 */
export async function callWithFallback(
  apiKey: string,
  spec: OpSpec,
  req: GeminiRequest,
  models: readonly string[] = spec.models,
): Promise<CallResult> {
  const candidates = models.filter((m) => !(usesInteractions(m) && !req.speech));
  if (!candidates.length) throw new UpstreamError('no model tried', 0);

  const deadline = Date.now() + totalBudgetMs(spec, candidates.length);
  const errors: UpstreamError[] = [];
  const retryable: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    const remaining = deadline - Date.now();
    if (remaining < 1_500) break;

    for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
      const left = deadline - Date.now();
      if (left < 1_500) break;
      const timeout = attemptTimeoutMs(spec, candidates.length, candidates.length - i, left);
      try {
        const res = await post(apiKey, model, req, 'generateContent', timeout);
        if (!res.ok) {
          const text = (await res.text()).slice(0, 500);
          const err = new UpstreamError(`${model}: HTTP ${res.status} ${text}`, res.status, text);
          errors.push(err);
          if (isFatalStatus(res.status)) throw err;
          if (res.status === 503) retryable.push(model);
          break; // Move straight to next model instead of sleeping on a single busy pool.
        }
        const json = (await res.json()) as GeminiJson;
        try {
          return { model, data: extract(spec, model, json), raw: json };
        } catch (err) {
          errors.push(new UpstreamError(`${model}: invalid output (${err})`, 502));
          if (parseAttempt === 0) continue; // One immediate retry on malformed JSON/validation.
        }
      } catch (err) {
        if (err instanceof UpstreamError && typeof err.status === 'number' && isFatalStatus(err.status)) throw err;
        const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
        const up = err instanceof UpstreamError ? err : new UpstreamError(String(err), timedOut ? 'timeout' : 0);
        errors.push(up);
        break;
      }
    }
  }

  // Pass 2: brief cooldown and one extra round on models that answered 503 (often succeeds in 1-2s).
  const remainingForPass2 = deadline - Date.now();
  if (retryable.length > 0 && remainingForPass2 >= 5_000) {
    await sleep(Math.min(900, Math.max(300, remainingForPass2 - 4_500)));
    for (let i = 0; i < retryable.length; i++) {
      const model = retryable[i];
      const left = deadline - Date.now();
      if (left < 2_500) break;
      const timeout = Math.min(FAST_ATTEMPT_MS, left);
      try {
        const res = await post(apiKey, model, req, 'generateContent', timeout);
        if (!res.ok) {
          const text = (await res.text()).slice(0, 500);
          errors.push(new UpstreamError(`${model}: HTTP ${res.status} ${text}`, res.status, text));
          continue;
        }
        const json = (await res.json()) as GeminiJson;
        return { model, data: extract(spec, model, json), raw: json };
      } catch (err) {
        const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
        errors.push(err instanceof UpstreamError ? err : new UpstreamError(String(err), timedOut ? 'timeout' : 0));
      }
    }
  }

  throw pickFailure(errors);
}

/**
 * Opens a streaming call, falling back until one model answers, and returns
 * a stream of plain text chunks. `onDone` runs once the stream ends.
 */
export async function streamWithFallback(
  apiKey: string,
  spec: OpSpec,
  req: GeminiRequest,
  onDone: (model: string, ok: boolean) => void,
  models: readonly string[] = spec.models,
): Promise<{ model: string; stream: ReadableStream<Uint8Array> }> {
  const candidates = models.filter((m) => !usesInteractions(m));
  if (!candidates.length) throw new UpstreamError('no model tried', 0);

  const deadline = Date.now() + totalBudgetMs(spec, candidates.length);
  const errors: UpstreamError[] = [];
  const retryable: string[] = [];

  const openStream = async (model: string, timeout: number): Promise<Response | null> => {
    const res = await post(apiKey, model, req, 'streamGenerateContent?alt=sse', timeout).catch((err) => {
      errors.push(err instanceof UpstreamError ? err : new UpstreamError(String(err), 0));
      return null;
    });
    if (!res) return null;
    if (res.ok && res.body) return res;
    const text = (await res.text()).slice(0, 500);
    const err = new UpstreamError(`${model}: HTTP ${res.status} ${text}`, res.status, text);
    errors.push(err);
    if (isFatalStatus(res.status)) throw err;
    if (res.status === 503) retryable.push(model);
    return null;
  };

  let winner: { model: string; res: Response } | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < 1_500) break;
    const timeout = attemptTimeoutMs(spec, candidates.length, candidates.length - i, remaining);
    const res = await openStream(candidates[i], timeout);
    if (res) {
      winner = { model: candidates[i], res };
      break;
    }
  }

  if (!winner && retryable.length > 0 && deadline - Date.now() >= 5_000) {
    await sleep(Math.min(900, Math.max(300, deadline - Date.now() - 4_500)));
    for (const model of retryable) {
      const left = deadline - Date.now();
      if (left < 2_500) break;
      const res = await openStream(model, Math.min(STREAM_CONNECT_MS, left));
      if (res) {
        winner = { model, res };
        break;
      }
    }
  }

  if (!winner || !winner.res.body) throw pickFailure(errors);
  const { model, res } = winner;
  const body = res.body!;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let ok = true;
  const emitLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith('data:')) return;
    try {
      const text = textOf(JSON.parse(line.slice(5)) as GeminiJson);
      if (text) controller.enqueue(encoder.encode(text));
    } catch {
      // A partial or keep-alive line; skip it.
    }
  };
  // `cancel` (client went away) is in Deno but not yet in TypeScript's DOM types.
  const transformer = {
    transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) emitLine(line.trim(), controller);
    },
    flush(controller: TransformStreamDefaultController<Uint8Array>) {
      emitLine(buffer.trim(), controller);
      onDone(model, ok);
    },
    cancel() {
      ok = false;
      onDone(model, false);
    },
  };
  return { model, stream: body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>(transformer)) };
}
