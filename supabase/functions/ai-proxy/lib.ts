/**
 * Shared types and helpers for the ai-proxy ops. Pure TypeScript with no
 * Deno APIs, so vitest can import the ops directly.
 */

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

/** Body for Gemini's generateContent, minus the model. */
export interface GeminiRequest {
  contents: Content[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig: Record<string, unknown>;
}

export type OpKind = 'json' | 'text' | 'audio' | 'stream';

export interface OpSpec {
  /** Calls allowed per user per hour. */
  hourlyLimit: number;
  /** Tried in order; the next one is used when a call fails. */
  models: readonly string[];
  /** Per model attempt. */
  timeoutMs: number;
  kind: OpKind;
  /** Validates the client payload and builds the request. Throws BadRequest. */
  build(payload: unknown): GeminiRequest;
  /** Checks parsed JSON output; throwing triggers one retry. */
  finalize?(data: unknown): unknown;
}

export class BadRequest extends Error {}

export const FLASH_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;

// --- Payload validation ------------------------------------------------------

export function asObject(v: unknown, name = 'payload'): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BadRequest(`${name} must be an object`);
  return v as Record<string, unknown>;
}

export function str(o: Record<string, unknown>, key: string, opts: { max?: number; optional?: boolean } = {}): string {
  const v = o[key];
  if (v === undefined || v === null || v === '') {
    if (opts.optional) return '';
    throw new BadRequest(`${key} is required`);
  }
  if (typeof v !== 'string') throw new BadRequest(`${key} must be a string`);
  const max = opts.max ?? 2000;
  if (v.length > max) throw new BadRequest(`${key} is longer than ${max} characters`);
  return v;
}

export function list<T>(o: Record<string, unknown>, key: string, max: number, item: (v: unknown, i: number) => T): T[] {
  const v = o[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new BadRequest(`${key} must be an array`);
  if (v.length > max) throw new BadRequest(`${key} has more than ${max} items`);
  return v.map(item);
}

export function oneOf<T extends string>(o: Record<string, unknown>, key: string, values: readonly T[], fallback: T): T {
  const v = o[key];
  return typeof v === 'string' && (values as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** ~12 MB of base64, about 9 MB of audio or image. */
const MAX_INLINE_BASE64 = 12_000_000;

export function inlineData(v: unknown, name: string, allowedPrefix: string[]): { mimeType: string; data: string } {
  const o = asObject(v, name);
  const mimeType = str(o, 'mimeType', { max: 100 });
  if (!allowedPrefix.some((p) => mimeType.startsWith(p))) throw new BadRequest(`${name}.mimeType is not allowed`);
  const data = str(o, 'data', { max: MAX_INLINE_BASE64 });
  return { mimeType, data };
}

/** Quote user text inside a prompt without letting it close the quotes. */
export const q = (s: string) => JSON.stringify(s);

// --- Response schema (Gemini OpenAPI subset) ---------------------------------

type SchemaNode = Record<string, unknown>;
export const S = {
  str: (enumValues?: string[]): SchemaNode => (enumValues ? { type: 'STRING', enum: enumValues } : { type: 'STRING' }),
  num: (): SchemaNode => ({ type: 'NUMBER' }),
  bool: (): SchemaNode => ({ type: 'BOOLEAN' }),
  arr: (items: SchemaNode): SchemaNode => ({ type: 'ARRAY', items }),
  obj: (properties: Record<string, SchemaNode>, required: string[] = Object.keys(properties)): SchemaNode => ({
    type: 'OBJECT',
    properties,
    required,
  }),
};

export function jsonConfig(schema: SchemaNode, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { responseMimeType: 'application/json', responseSchema: schema, ...extra };
}

export const userText = (text: string): Content[] => [{ role: 'user', parts: [{ text }] }];
