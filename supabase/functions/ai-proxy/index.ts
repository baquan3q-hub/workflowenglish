/**
 * ai-proxy: the only way the app talks to Gemini.
 *
 * POST { op, payload } with the user's Supabase JWT.
 * - The Gemini key comes from the GEMINI_API_KEY secret and never leaves here.
 * - Only the ops in ./ops are accepted; prompts are built on the server.
 * - Each call is logged to ai_usage, which also backs the hourly limit.
 *
 * Errors are JSON { error, message, retryAt? } with error one of
 * bad_request (400), auth (401), rate_limit (429), server (502), timeout (504).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { BadRequest } from './lib.ts';
import { callWithFallback, streamWithFallback, UpstreamError } from './gemini.ts';
import { OPS } from './ops/index.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const fail = (status: number, error: string, message: string, extra: Record<string, unknown> = {}) =>
  json(status, { error, message, ...extra });

const HOUR_MS = 60 * 60 * 1000;

/** null when under the limit, otherwise when the oldest call in the window expires. */
async function rateLimited(userId: string, op: string, limit: number): Promise<Date | null> {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { data, count, error } = await admin
    .from('ai_usage')
    .select('created_at', { count: 'exact' })
    .eq('user_id', userId)
    .eq('op', op)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) {
    // Missing table or a hiccup should not take AI down; log and allow.
    console.error('[ai-proxy] usage lookup failed:', error.message);
    return null;
  }
  if ((count ?? 0) < limit) return null;
  const oldest = data?.[0]?.created_at ? new Date(data[0].created_at).getTime() : Date.now();
  return new Date(oldest + HOUR_MS);
}

async function logUsage(userId: string, op: string, model: string | null, startedAt: number, ok: boolean) {
  const { error } = await admin.from('ai_usage').insert({
    user_id: userId,
    op,
    model,
    latency_ms: Date.now() - startedAt,
    ok,
  });
  if (error) console.error('[ai-proxy] usage insert failed:', error.message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'bad_request', 'Chỉ hỗ trợ POST.');

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return fail(401, 'auth', 'Bạn cần đăng nhập để dùng tính năng AI.');
  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth.user) return fail(401, 'auth', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const userId = auth.user.id;

  let body: { op?: unknown; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Yêu cầu không hợp lệ.');
  }
  const op = typeof body.op === 'string' ? body.op : '';
  const spec = Object.hasOwn(OPS, op) ? OPS[op] : undefined;
  if (!spec) return fail(400, 'bad_request', `Thao tác không được hỗ trợ: ${op || '(trống)'}`);

  let request;
  try {
    request = spec.build(body.payload);
  } catch (err) {
    if (err instanceof BadRequest) return fail(400, 'bad_request', err.message);
    throw err;
  }

  const retryAt = await rateLimited(userId, op, spec.hourlyLimit);
  if (retryAt) {
    return fail(429, 'rate_limit', 'Bạn đã dùng hết lượt cho tính năng này trong giờ này.', {
      retryAt: retryAt.toISOString(),
    });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return fail(500, 'server', 'Máy chủ AI chưa được cấu hình.');
  const startedAt = Date.now();

  try {
    if (spec.kind === 'stream') {
      const stream = await streamWithFallback(apiKey, spec, request, (model, ok) => {
        void logUsage(userId, op, model, startedAt, ok);
      });
      return new Response(stream, {
        headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    const { model, data } = await callWithFallback(apiKey, spec, request);
    await logUsage(userId, op, model, startedAt, true);
    return json(200, { data, model });
  } catch (err) {
    await logUsage(userId, op, null, startedAt, false);
    console.error(`[ai-proxy] ${op} failed:`, err instanceof Error ? err.message : err);
    if (err instanceof UpstreamError && err.status === 'timeout') {
      return fail(504, 'timeout', 'AI phản hồi quá lâu. Vui lòng thử lại.');
    }
    return fail(502, 'server', 'AI đang bận hoặc gặp sự cố. Vui lòng thử lại sau ít phút.');
  }
});
