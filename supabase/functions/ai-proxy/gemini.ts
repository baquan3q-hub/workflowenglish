/**
 * Gemini REST calls with model fallback. Uses only fetch, no SDK.
 */
import type { GeminiRequest, OpSpec } from './lib.ts';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class UpstreamError extends Error {
  constructor(message: string, readonly status: number | 'timeout') {
    super(message);
  }
}

export interface CallResult {
  model: string;
  /** Parsed JSON, plain text or base64 audio depending on the op kind. */
  data: unknown;
}

/** Thinking is off for 2.5+ text models; older models reject the field. */
function withThinking(model: string, config: Record<string, unknown>): Record<string, unknown> {
  if (/tts/.test(model) || !/gemini-(2\.5|3)/.test(model)) return config;
  return { thinkingConfig: { thinkingBudget: 0 }, ...config };
}

function post(apiKey: string, model: string, req: GeminiRequest, method: string, timeoutMs: number): Promise<Response> {
  const body = { ...req, generationConfig: withThinking(model, req.generationConfig) };
  return fetch(`${BASE}/${model}:${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err) => {
    const timeout = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new UpstreamError(`${model}: ${err}`, timeout ? 'timeout' : 0);
  });
}

type GeminiJson = { candidates?: { content?: { parts?: { text?: string; inlineData?: { data?: string } }[] } }[] };

function textOf(json: GeminiJson): string {
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

function extract(spec: OpSpec, json: GeminiJson): unknown {
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
export async function callWithFallback(apiKey: string, spec: OpSpec, req: GeminiRequest): Promise<CallResult> {
  let last: UpstreamError = new UpstreamError('no model tried', 0);
  for (const model of spec.models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await post(apiKey, model, req, 'generateContent', spec.timeoutMs);
        if (!res.ok) {
          last = new UpstreamError(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`, res.status);
          break; // next model
        }
        const json = (await res.json()) as GeminiJson;
        try {
          return { model, data: extract(spec, json) };
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
): Promise<ReadableStream<Uint8Array>> {
  let last: UpstreamError = new UpstreamError('no model tried', 0);
  for (const model of spec.models) {
    const res = await post(apiKey, model, req, 'streamGenerateContent?alt=sse', spec.timeoutMs).catch((err) => {
      last = err;
      return null;
    });
    if (!res) continue;
    if (!res.ok || !res.body) {
      last = new UpstreamError(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`, res.status);
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
