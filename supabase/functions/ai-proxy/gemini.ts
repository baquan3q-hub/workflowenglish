/**
 * Gemini REST calls with model fallback. Uses only fetch, no SDK.
 */
import type { GeminiRequest, OpSpec } from './lib.ts';
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
  const parsed = JSON.parse(text);
  return spec.finalize ? spec.finalize(parsed) : parsed;
}

/**
 * Tries each model in turn. A response that fails JSON parsing or the op's
 * own check is retried once on the same model before moving on.
 */
export async function callWithFallback(
  apiKey: string,
  spec: OpSpec,
  req: GeminiRequest,
  models: readonly string[] = spec.models,
): Promise<CallResult> {
  let last: UpstreamError = new UpstreamError('no model tried', 0);
  for (const model of models) {
    if (usesInteractions(model) && !req.speech) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await post(apiKey, model, req, 'generateContent', spec.timeoutMs);
        if (!res.ok) {
          const text = (await res.text()).slice(0, 500);
          last = new UpstreamError(`${model}: HTTP ${res.status} ${text}`, res.status, text);
          break; // next model
        }
        const json = (await res.json()) as GeminiJson;
        try {
          return { model, data: extract(spec, model, json) };
        } catch (err) {
          last = new UpstreamError(`${model}: invalid output (${err})`, 502);
          continue; // same model once more
        }
      } catch (err) {
        const timeout = err instanceof DOMException && err.name === 'TimeoutError';
        last = err instanceof UpstreamError ? err : new UpstreamError(String(err), timeout ? 'timeout' : 0);
        break;
      }
    }
  }
  throw last;
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
): Promise<ReadableStream<Uint8Array>> {
  let last: UpstreamError = new UpstreamError('no model tried', 0);
  for (const model of models) {
    if (usesInteractions(model)) continue;
    const res = await post(apiKey, model, req, 'streamGenerateContent?alt=sse', spec.timeoutMs).catch((err) => {
      last = err;
      return null;
    });
    if (!res) continue;
    if (!res.ok || !res.body) {
      const text = (await res.text()).slice(0, 500);
      last = new UpstreamError(`${model}: HTTP ${res.status} ${text}`, res.status, text);
      continue;
    }

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
    return res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>(transformer));
  }
  throw last;
}
