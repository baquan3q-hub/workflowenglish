/**
 * Client for the ai-proxy Edge Function. Every AI feature goes through here,
 * so the Gemini key never reaches the browser.
 *
 * Failures are normalised to AiError, and aiErrorMessage() turns one into
 * the Vietnamese line shown in toasts and error states.
 */
import { getCachedSession, supabase } from './supabaseClient';

export type AiErrorKind = 'rate_limit' | 'timeout' | 'network' | 'server' | 'auth' | 'bad_request';

/** Why the server failed, when ai-proxy knows (see its index.ts). */
export type AiErrorReason = 'not_configured' | 'model_unavailable' | 'key_invalid' | 'quota' | 'blocked' | 'unknown';
const REASONS: readonly AiErrorReason[] = ['not_configured', 'model_unavailable', 'key_invalid', 'quota', 'blocked', 'unknown'];

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    readonly retryAt?: Date,
    readonly reason?: AiErrorReason,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface InvokeOptions {
  /** Whole request, including the server's model fallback. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/ai-proxy`;

/** Maps an HTTP error from the proxy to an AiError. */
export function aiErrorFromResponse(status: number, body: unknown): AiError {
  const b = (body && typeof body === 'object' ? body : {}) as { error?: string; message?: string; retryAt?: string; reason?: string };
  const message = typeof b.message === 'string' ? b.message : `HTTP ${status}`;
  if (status === 429) {
    const retryAt = b.retryAt ? new Date(b.retryAt) : undefined;
    return new AiError('rate_limit', message, retryAt && !isNaN(retryAt.getTime()) ? retryAt : undefined);
  }
  if (status === 401) return new AiError('auth', message);
  if (status === 400) return new AiError('bad_request', message);
  if (status === 504) return new AiError('timeout', message);
  const reason = REASONS.find((r) => r === b.reason);
  return new AiError('server', message, undefined, reason);
}

const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** The line to show the learner. Non-AI errors get the generic server line. */
export function aiErrorMessage(err: unknown): string {
  const kind = err instanceof AiError ? err.kind : 'server';
  switch (kind) {
    case 'rate_limit': {
      const at = err instanceof AiError && err.retryAt ? `, thử lại sau ${clock(err.retryAt)}` : ', thử lại sau ít phút';
      return `Bạn đã dùng hết lượt AI trong giờ này${at}.`;
    }
    case 'timeout':
      return 'AI phản hồi quá lâu. Vui lòng thử lại.';
    case 'network':
      // Online but the request still failed: the AI server is unreachable
      // (down, or the ai-proxy function is not deployed), not the learner's network.
      return typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'Mất kết nối mạng. Kiểm tra mạng rồi thử lại.'
        : 'Chưa kết nối được máy chủ AI. Vui lòng thử lại sau ít phút.';
    case 'auth':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 'bad_request':
      return 'Yêu cầu chưa hợp lệ. Vui lòng kiểm tra nội dung rồi thử lại.';
    default:
      switch (err instanceof AiError ? err.reason : undefined) {
        // Setup problems: retrying will not help, so say so.
        case 'not_configured':
        case 'key_invalid':
        case 'model_unavailable':
          return 'Tính năng AI đang tạm ngưng do cấu hình máy chủ. Quản trị viên cần kiểm tra lại.';
        case 'quota':
          return 'AI đã dùng hết hạn mức hôm nay. Vui lòng thử lại sau.';
        case 'blocked':
          return 'AI từ chối xử lý nội dung này. Hãy thử nội dung khác.';
        default:
          return 'AI đang bận hoặc gặp sự cố. Vui lòng thử lại sau ít phút.';
      }
  }
}

/** A fresh access token: the cached one, refreshed when close to expiry. */
async function accessToken(): Promise<string> {
  const cached = getCachedSession();
  const expiresAt = typeof cached?.expires_at === 'number' ? cached.expires_at * 1000 : 0;
  if (cached?.access_token && expiresAt - Date.now() > 60_000) return cached.access_token;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? cached?.access_token;
  if (!token) throw new AiError('auth', 'not signed in');
  return token;
}

async function post(op: string, payload: unknown, opts: InvokeOptions): Promise<Response> {
  const token = await accessToken();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ op, payload }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw aiErrorFromResponse(res.status, body);
    }
    return res;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (timedOut) throw new AiError('timeout', `${op} timed out`);
    if (opts.signal?.aborted) throw err;
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        `[AI] Could not reach ${FUNCTION_URL}. A CORS or 404 error here usually means the ai-proxy function is not deployed: see supabase/functions/ai-proxy/README.md.`,
      );
    }
    throw new AiError('network', err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/** One request, one JSON (or text/base64) result. */
export async function invokeAi<T>(op: string, payload: unknown, opts: InvokeOptions = {}): Promise<T> {
  const res = await post(op, payload, opts);
  const body = (await res.json()) as { data: T };
  return body.data;
}

/** Streamed text, chunk by chunk (the mentor chat). */
export async function* streamAi(op: string, payload: unknown, opts: InvokeOptions = {}): AsyncGenerator<string> {
  const res = await post(op, payload, { timeoutMs: 120_000, ...opts });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }
  } finally {
    reader.releaseLock();
  }
}
