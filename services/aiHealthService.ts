/**
 * The admin's "is AI working?" check: asks ai-proxy to test the key, each
 * model, the usage table and the audio bucket, then turns the report into
 * plain Vietnamese steps.
 */
import { invokeAi } from './aiClient';

export interface ModelCheck {
  model: string;
  group: 'text' | 'tts';
  ok: boolean;
  status: number | 'timeout' | null;
  reason: string | null;
  ms: number;
}

export interface AiHealthReport {
  checkedAt: string;
  keyConfigured: boolean;
  usageTable: boolean;
  audioBucket: boolean;
  models: ModelCheck[];
}

export type HealthLevel = 'ok' | 'warn' | 'error';

export interface HealthItem {
  level: HealthLevel;
  title: string;
  /** What to do about it; empty when nothing is needed. */
  fix: string;
}

export const checkAiHealth = (api: typeof invokeAi = invokeAi) => api<AiHealthReport>('aiHealth', {}, { timeoutMs: 120_000 });

const REASON_VI: Record<string, string> = {
  model_unavailable: 'model không còn hoặc khoá này không được dùng',
  key_invalid: 'khoá API sai, bị chặn hoặc chưa bật Gemini API',
  quota: 'hết hạn mức (quota) của khoá',
  blocked: 'bị chặn nội dung',
  timeout: 'quá thời gian chờ',
  unknown: 'lỗi khác',
};

export const reasonVi = (reason: string | null) => (reason ? (REASON_VI[reason] ?? reason) : '');

/** Each finding, worst first, with the step that fixes it. */
export function healthItems(r: AiHealthReport): HealthItem[] {
  const items: HealthItem[] = [];
  if (!r.keyConfigured) {
    items.push({
      level: 'error',
      title: 'Máy chủ chưa có khoá Gemini',
      fix: 'Tạo khoá ở aistudio.google.com/apikey rồi chạy: supabase secrets set GEMINI_API_KEY=<khoá>',
    });
  }
  for (const group of ['text', 'tts'] as const) {
    const checks = r.models.filter((m) => m.group === group);
    if (!checks.length) continue;
    const name = group === 'text' ? 'Model văn bản (chấm bài, sinh đề, chat)' : 'Model giọng đọc (audio Listening)';
    const working = checks.filter((m) => m.ok);
    if (working.length) {
      items.push({ level: working[0] === checks[0] ? 'ok' : 'warn', title: `${name}: đang dùng ${working[0].model}`, fix: '' });
      continue;
    }
    const reasons = [...new Set(checks.map((m) => m.reason ?? 'unknown'))];
    const fix = reasons.includes('key_invalid')
      ? 'Kiểm tra lại GEMINI_API_KEY (đúng khoá, project đã bật Generative Language API, không giới hạn theo IP/referrer).'
      : reasons.includes('quota')
        ? 'Khoá đã hết quota: chờ reset, bật billing cho project, hoặc dùng khoá khác.'
        : 'Đặt danh sách model mới bằng secret GEMINI_TEXT_MODELS / GEMINI_TTS_MODELS (cách nhau bằng dấu phẩy) rồi deploy lại ai-proxy.';
    items.push({ level: 'error', title: `${name}: không model nào dùng được (${reasons.map(reasonVi).join(', ')})`, fix });
  }
  if (!r.usageTable) {
    items.push({
      level: 'warn',
      title: 'Thiếu bảng ai_usage: giới hạn lượt dùng không hoạt động',
      fix: 'Chạy migration tạo bảng ai_usage trong SQL Editor.',
    });
  }
  if (!r.audioBucket) {
    items.push({
      level: 'warn',
      title: 'Thiếu bucket ielts-audio: audio Listening sẽ không lưu được',
      fix: 'Chạy migration 009 trong SQL Editor.',
    });
  }
  const rank: Record<HealthLevel, number> = { error: 0, warn: 1, ok: 2 };
  return items.sort((a, b) => rank[a.level] - rank[b.level]);
}
