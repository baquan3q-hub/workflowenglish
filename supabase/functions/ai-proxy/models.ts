/**
 * Which Gemini models the proxy uses, and the per-model differences in how
 * they are called. Pure TypeScript with no Deno APIs, so vitest can test it.
 *
 * Google retired gemini-2.0-flash (June 2026), deprecated gemini-3.5-flash
 * (routes to gemini-3.6-flash), and limits gemini-2.5-* to projects that
 * already used them. Put fast, broadly available models first so fallback
 * never stalls on an overloaded or retired endpoint.
 * The GEMINI_TEXT_MODELS / GEMINI_TTS_MODELS secrets (comma separated)
 * replace them without a code change when Google moves on again.
 */
import type { GeminiRequest } from './lib.ts';

/** Everyday text and JSON: grading, generation, chat. */
export const TEXT_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'] as const;

/** Longer, harder generations (lessons): fast reliable flash-lite pools first, then 3.6/3.8 fallback. */
export const STRONG_TEXT_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'] as const;

/** Fast, lightweight text & micro-evaluations (sentence grading, word suggestions): low latency, minimal token consumption. */
export const LIGHT_TEXT_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.6-flash'] as const;

/**
 * Speech. 3.8 TTS runs through the Interactions API; 2.5 preview TTS is kept
 * last as a legacy fallback only.
 */
export const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'] as const;

/** A model list from a secret, or the default when the secret is unset or empty. */
export function modelsFromEnv(value: string | undefined, fallback: readonly string[]): readonly string[] {
  const list = (value ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => /^[a-z0-9][a-z0-9.-]*$/.test(m));
  return list.length ? list : fallback;
}

/**
 * The models an op uses after secrets: ops on a shared default list follow
 * the matching secret, ops with their own list keep it.
 */
export function resolveModels(models: readonly string[], env: { text?: string; tts?: string }): readonly string[] {
  if (models === TEXT_MODELS || models === STRONG_TEXT_MODELS || models === LIGHT_TEXT_MODELS) return modelsFromEnv(env.text, models);
  if (models === TTS_MODELS) return modelsFromEnv(env.tts, models);
  return models;
}

export const isTtsModel = (model: string) => /-tts(-|$)/.test(model);

/** 3.x TTS models answer only on the Interactions API. */
export const usesInteractions = (model: string) => isTtsModel(model) && /^gemini-3\./.test(model);

/**
 * Keeps thinking as low as each family allows: these are short, latency
 * sensitive calls. 2.5 takes a budget, 3.x a level (3.8 Flash's lowest is
 * "low"), and older or TTS models reject the field.
 */
export function thinkingConfig(model: string, effort: 'minimal' | 'low' = 'minimal'): Record<string, unknown> | null {
  if (isTtsModel(model)) return null;
  if (/^gemini-2\.5-/.test(model)) return { thinkingBudget: effort === 'low' ? 1024 : 0 };
  if (/^gemini-4/.test(model)) return { thinkingLevel: 'low' };
  if (/^gemini-3\.[78]-flash/.test(model)) return { thinkingLevel: 'low' };
  if (model === 'gemini-flash-lite-latest') return { thinkingLevel: effort };
  if (/^gemini-3/.test(model)) return { thinkingLevel: effort };
  return null;
}

/** The generateContent body for a model: the op's request plus its thinking setting. */
export function generateBody(model: string, req: GeminiRequest): Record<string, unknown> {
  const { speech: _speech, thinking: effort, ...rest } = req;
  const thinking = thinkingConfig(model, effort);
  const generationConfig = thinking ? { thinkingConfig: thinking, ...req.generationConfig } : req.generationConfig;
  return { ...rest, generationConfig };
}

/** Splits "Name: line" dialogue text into per-turn items for multi-speaker Interactions TTS. */
function dialogueTurns(text: string, speakers: readonly { speaker?: string; voice: string }[], style?: string) {
  const names = new Set(speakers.map((s) => s.speaker).filter((n): n is string => Boolean(n)));
  const fallback = speakers[0]?.speaker;
  const turns: { speaker: string; text: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.+)$/.exec(line);
    if (m && (!names.size || names.has(m[1]))) {
      turns.push({ speaker: m[1], text: m[2].trim() });
    } else if (turns.length) {
      turns[turns.length - 1].text += ` ${line}`;
    } else if (fallback) {
      turns.push({ speaker: fallback, text: line });
    }
  }
  if (!turns.length && fallback) turns.push({ speaker: fallback, text });
  return turns.map((t) => ({
    type: 'text',
    text: t.text,
    annotations: [{ type: 'speech_metadata', speaker: t.speaker, ...(style ? { style } : {}) }],
  }));
}

/** The Interactions API body for a 3.x TTS model. Needs the op's `speech` description. */
export function interactionsBody(model: string, req: GeminiRequest): Record<string, unknown> {
  const speech = req.speech;
  if (!speech) throw new Error(`${model}: op has no speech description`);
  const multi = speech.speakers.length > 1 || speech.speakers.some((s) => Boolean(s.speaker));
  if (multi) {
    return {
      model,
      input: [{ type: 'user_input', content: dialogueTurns(speech.text, speech.speakers, speech.style) }],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: {
          speakers: speech.speakers.map((s) => ({ speaker: s.speaker, voice: s.voice })),
        },
      },
    };
  }
  const annotation: Record<string, string> = { type: 'speech_metadata' };
  if (speech.style) annotation.style = speech.style;
  return {
    model,
    input: [{ type: 'user_input', content: [{ type: 'text', text: speech.text, annotations: [annotation] }] }],
    response_format: { type: 'audio' },
    generation_config: {
      speech_config: [{ voice: speech.speakers[0]?.voice ?? 'Kore' }],
    },
  };
}

type InteractionJson = { steps?: { type?: string; content?: { type?: string; data?: string }[] }[] };

/** The last audio part of an interaction, as base64. */
export function interactionAudio(json: InteractionJson): string {
  const parts = (json.steps ?? [])
    .filter((s) => s.type === 'model_output')
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === 'audio' && typeof c.data === 'string');
  const data = parts.at(-1)?.data;
  if (!data) throw new Error('no audio returned');
  return data;
}

/**
 * Raw 16-bit PCM from a WAV file. 3.x TTS answers with WAV while the rest of
 * the app expects the bare PCM that generateContent returns.
 */
export function wavToPcm(bytes: Uint8Array): Uint8Array {
  const ascii = (at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (bytes.length < 12 || ascii(0) !== 'RIFF' || ascii(8) !== 'WAVE') return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 12;
  while (at + 8 <= bytes.length) {
    const size = view.getUint32(at + 4, true);
    if (ascii(at) === 'data') return bytes.subarray(at + 8, Math.min(bytes.length, at + 8 + size));
    at += 8 + size + (size % 2);
  }
  return bytes;
}

/**
 * Why Gemini refused, for the app to show something more useful than
 * "AI is busy". Based on the last model's HTTP status and error text.
 */
export type UpstreamReason = 'model_unavailable' | 'key_invalid' | 'quota' | 'blocked' | 'unknown';

export function upstreamReason(status: number | 'timeout', body: string): UpstreamReason {
  if (status === 404) return 'model_unavailable';
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(body)) return 'quota';
  if (/API_KEY_INVALID|API key not valid|API_KEY_SERVICE_BLOCKED|PERMISSION_DENIED|SERVICE_DISABLED/i.test(body)) return 'key_invalid';
  if (status === 401 || status === 403) return 'key_invalid';
  if (/not found|is not supported|no longer available|limited/i.test(body) && status === 400) return 'model_unavailable';
  if (/SAFETY|blocked|PROHIBITED_CONTENT/i.test(body)) return 'blocked';
  return 'unknown';
}
