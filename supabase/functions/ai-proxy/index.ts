/**
 * ai-proxy: the only way the app talks to Gemini.
 *
 * POST { op, payload } with the user's Supabase JWT.
 * - The Gemini key comes from the GEMINI_API_KEY secret and never leaves here.
 * - Only the ops in ./ops are accepted; prompts are built on the server.
 * - Each call is logged to ai_usage, which also backs the hourly limit.
 *
 * Ops with `storage` write their output to a public Storage file and answer
 * { url }; a file that already exists is returned without calling Gemini.
 *
 * Errors are JSON { error, message, retryAt?, reason? } with error one of
 * bad_request (400), auth (401), forbidden (403), rate_limit (429),
 * server (500/502), timeout (504).
 * `reason` says why a server error happened: not_configured (no key),
 * model_unavailable, key_invalid, quota, blocked or unknown.
 *
 * op "aiHealth" checks the setup (key, each model, ai_usage, the audio
 * bucket) and reports per item; see the admin page. It and ops marked
 * `adminOnly` need a row in app_admins (migration 011).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { BadRequest } from './lib.ts';
import { callWithFallback, streamWithFallback, UpstreamError } from './gemini.ts';
import { resolveModels, TEXT_MODELS, TTS_MODELS, upstreamReason } from './models.ts';
import { OPS } from './ops/index.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Lets the chat show which model answered.
  'Access-Control-Expose-Headers': 'x-ai-model',
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

const modelEnv = () => ({ text: Deno.env.get('GEMINI_TEXT_MODELS'), tts: Deno.env.get('GEMINI_TTS_MODELS') });

interface ModelCheck {
  model: string;
  group: 'text' | 'tts';
  ok: boolean;
  status: number | 'timeout' | null;
  reason: string | null;
  ms: number;
}

/** One tiny call per model, so the admin sees which ones this key can use. */
async function checkModel(apiKey: string, model: string, group: 'text' | 'tts'): Promise<ModelCheck> {
  const started = Date.now();
  const spec = {
    hourlyLimit: 1,
    models: [model],
    timeoutMs: 30_000,
    kind: group === 'tts' ? ('audio' as const) : ('text' as const),
    build: () => ({ contents: [], generationConfig: {} }),
  };
  const req =
    group === 'tts'
      ? {
          contents: [{ role: 'user' as const, parts: [{ text: 'OK.' }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
          speech: { text: 'OK.', speakers: [{ voice: 'Kore' }] },
        }
      : { contents: [{ role: 'user' as const, parts: [{ text: 'Reply with the single word OK.' }] }], generationConfig: { maxOutputTokens: 16 } };
  try {
    await callWithFallback(apiKey, spec, req, [model]);
    return { model, group, ok: true, status: 200, reason: null, ms: Date.now() - started };
  } catch (err) {
    const up = err instanceof UpstreamError ? err : null;
    return {
      model,
      group,
      ok: false,
      status: up?.status ?? null,
      reason: up ? (up.status === 'timeout' ? 'timeout' : upstreamReason(up.status, up.body)) : String(err).slice(0, 120),
      ms: Date.now() - started,
    };
  }
}

async function health(): Promise<Response> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const usage = await admin.from('ai_usage').select('id', { head: true, count: 'exact' }).limit(1);
  const bucket = await admin.storage.getBucket('ielts-audio');
  const report: Record<string, unknown> = {
    checkedAt: new Date().toISOString(),
    keyConfigured: Boolean(apiKey),
    usageTable: !usage.error,
    audioBucket: !bucket.error,
    models: [] as ModelCheck[],
  };
  if (apiKey) {
    const env = modelEnv();
    const text = resolveModels(TEXT_MODELS, env);
    const tts = resolveModels(TTS_MODELS, env);
    report.models = await Promise.all([
      ...text.map((m) => checkModel(apiKey, m, 'text')),
      ...tts.map((m) => checkModel(apiKey, m, 'tts')),
    ]);
  }
  return json(200, { data: report, model: null });
}

/** Whether the user is listed in app_admins. False when the table is missing. */
async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await admin.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) console.error('[ai-proxy] admin lookup failed:', error.message);
  return !error && !!data;
}

const notAdmin = () => fail(403, 'forbidden', 'Chỉ quản trị viên được dùng tính năng này.');

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

/** The public URL when the file is already in the bucket, otherwise null. */
async function existingPublicUrl(bucket: string, path: string): Promise<string | null> {
  const url = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
  return res?.ok ? url : null;
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
  if (op === 'aiHealth') {
    if (!(await isAdmin(userId))) return notAdmin();
    const wait = await rateLimited(userId, op, 10);
    if (wait) return fail(429, 'rate_limit', 'Bạn đã kiểm tra quá nhiều lần trong giờ này.', { retryAt: wait.toISOString() });
    void logUsage(userId, op, null, Date.now(), true);
    return health();
  }
  const spec = Object.hasOwn(OPS, op) ? OPS[op] : undefined;
  if (!spec) return fail(400, 'bad_request', `Thao tác không được hỗ trợ: ${op || '(trống)'}`);
  if (spec.adminOnly && !(await isAdmin(userId))) return notAdmin();

  let request;
  let storagePath: string | null = null;
  try {
    request = spec.build(body.payload);
    if (spec.storage) storagePath = await spec.storage.path(body.payload);
  } catch (err) {
    if (err instanceof BadRequest) return fail(400, 'bad_request', err.message);
    throw err;
  }

  // Shared output another learner already generated: free, no limit.
  if (spec.storage && storagePath) {
    const url = await existingPublicUrl(spec.storage.bucket, storagePath);
    if (url) return json(200, { data: { url, cached: true }, model: null });
  }

  const retryAt = await rateLimited(userId, op, spec.hourlyLimit);
  if (retryAt) {
    return fail(429, 'rate_limit', 'Bạn đã dùng hết lượt cho tính năng này trong giờ này.', {
      retryAt: retryAt.toISOString(),
    });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return fail(500, 'server', 'Máy chủ AI chưa được cấu hình.', { reason: 'not_configured' });
  const startedAt = Date.now();
  const models = resolveModels(spec.modelsFor?.(body.payload) ?? spec.models, modelEnv());

  try {
    if (spec.kind === 'stream') {
      const { model, stream } = await streamWithFallback(apiKey, spec, request, (used, ok) => {
        void logUsage(userId, op, used, startedAt, ok);
      }, models);
      return new Response(stream, {
        headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'x-ai-model': model },
      });
    }
    const { model, data } = await callWithFallback(apiKey, spec, request, models);
    if (spec.storage && storagePath) {
      const { body: file, contentType } = spec.storage.encode(data);
      const bucket = admin.storage.from(spec.storage.bucket);
      const { error } = await bucket.upload(storagePath, file, { contentType, upsert: true, cacheControl: '31536000' });
      if (error) throw new Error(`storage upload failed: ${error.message}`);
      await logUsage(userId, op, model, startedAt, true);
      return json(200, { data: { url: bucket.getPublicUrl(storagePath).data.publicUrl, cached: false }, model });
    }
    await logUsage(userId, op, model, startedAt, true);
    return json(200, { data, model });
  } catch (err) {
    await logUsage(userId, op, null, startedAt, false);
    console.error(`[ai-proxy] ${op} failed:`, err instanceof Error ? err.message : err);
    if (err instanceof UpstreamError && err.status === 'timeout') {
      return fail(504, 'timeout', 'AI phản hồi quá lâu. Vui lòng thử lại.');
    }
    const reason = err instanceof UpstreamError ? upstreamReason(err.status, err.body) : 'unknown';
    return fail(502, 'server', 'AI đang bận hoặc gặp sự cố. Vui lòng thử lại sau ít phút.', { reason });
  }
});
