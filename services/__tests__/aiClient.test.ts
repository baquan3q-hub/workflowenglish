import { describe, it, expect, vi, afterEach } from 'vitest';
import { AiError, aiErrorFromResponse, aiErrorMessage, invokeAi, isAbortError, withAbortSignal } from '../aiClient';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { BadRequest } from '../../supabase/functions/ai-proxy/lib.ts';

describe('aiErrorFromResponse', () => {
  it('keeps the retry time of a rate limit', () => {
    const err = aiErrorFromResponse(429, { error: 'rate_limit', retryAt: '2026-10-17T09:05:00Z' });
    expect(err.kind).toBe('rate_limit');
    expect(err.retryAt?.toISOString()).toBe('2026-10-17T09:05:00.000Z');
  });

  it('maps statuses to kinds', () => {
    expect(aiErrorFromResponse(401, null).kind).toBe('auth');
    expect(aiErrorFromResponse(400, {}).kind).toBe('bad_request');
    expect(aiErrorFromResponse(504, {}).kind).toBe('timeout');
    expect(aiErrorFromResponse(502, {}).kind).toBe('server');
    expect(aiErrorFromResponse(500, 'oops').kind).toBe('server');
  });

  it('ignores a malformed retry time', () => {
    expect(aiErrorFromResponse(429, { retryAt: 'soon' }).retryAt).toBeUndefined();
  });
});

describe('aiErrorMessage', () => {
  it('names the time the limit resets', () => {
    const at = new Date(2026, 9, 17, 14, 5);
    expect(aiErrorMessage(new AiError('rate_limit', 'x', at))).toBe('Bạn đã dùng hết lượt AI trong giờ này, thử lại sau 14:05.');
    expect(aiErrorMessage(new AiError('rate_limit', 'x'))).toContain('thử lại sau ít phút');
  });

  it('has a line per kind and a generic one for anything else', () => {
    expect(aiErrorMessage(new AiError('network', 'x'))).toMatch(/Mất kết nối|máy chủ AI/);
    expect(aiErrorMessage(new AiError('timeout', 'x'))).toContain('quá lâu');
    expect(aiErrorMessage(new Error('boom'))).toContain('AI đang bận');
    expect(aiErrorMessage(new DOMException('Aborted', 'AbortError'))).toContain('Đã hủy');
  });
});

describe('abort helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('distinguishes learner abort from AiError timeout', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(Object.assign(new Error('stopped'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortError(new AiError('timeout', 'timed out'))).toBe(false);
    expect(isAbortError(new Error('boom'))).toBe(false);
  });

  it('rejects invokeAi immediately when caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(invokeAi('explainGrammar', {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('lets a caller cancel a shared promise via withAbortSignal without altering the underlying promise', async () => {
    let settle!: (v: string) => void;
    const shared = new Promise<string>((resolve) => {
      settle = resolve;
    });
    const controller = new AbortController();
    const raced = withAbortSignal(shared, controller.signal);
    controller.abort();
    await expect(raced).rejects.toMatchObject({ name: 'AbortError' });
    settle('ok');
    await expect(shared).resolves.toBe('ok');
  });
});

describe('ai-proxy ops', () => {
  it('builds a lesson request from the payload, server-side prompt included', () => {
    const req = OPS.generateLesson.build({ words: 'apple, pear', level: 'A2', topic: 'Food' });
    const text = (req.contents[0].parts[0] as { text: string }).text;
    expect(text).toContain('"apple, pear"');
    expect(text).toContain('CEFR Level A2');
    expect(req.generationConfig.responseMimeType).toBe('application/json');
  });

  it('rejects bad payloads with BadRequest', () => {
    expect(() => OPS.generateLesson.build(null)).toThrow(BadRequest);
    expect(() => OPS.generateLesson.build({ words: 'x'.repeat(5000) })).toThrow(BadRequest);
    expect(() => OPS.gradeIeltsSpeaking.build({ question: 'q', transcript: 't', audio: { mimeType: 'text/html', data: 'x' } })).toThrow(BadRequest);
    expect(() => OPS.ieltsChat.build({ history: [], message: {} })).toThrow(BadRequest);
    expect(() => OPS.generateRemedialLesson.build({ mode: 'words', words: [] })).toThrow(BadRequest);
  });

  it('falls back to a safe level for unknown values', () => {
    const req = OPS.generateLesson.build({ words: 'a', level: 'Z9' });
    expect((req.contents[0].parts[0] as { text: string }).text).toContain('CEFR Level B1');
  });

  it('keeps the mentor prompt on the server and trims chat history', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}` }));
    const req = OPS.ieltsChat.build({ history, message: { text: 'hi' } });
    expect(req.systemInstruction?.parts[0].text).toContain('IELTS Mentor AI');
    expect(req.contents).toHaveLength(21);
    expect(req.contents[0].role).toBe('user');
    expect(req.contents[1].role).toBe('model');
  });

  it('checks lesson and recommendation output before returning it', () => {
    expect(() => OPS.generateLesson.finalize!({ flashcards: [] })).toThrow();
    const ok = { flashcards: [], quiz: [], story: { title: '', content: '', translation: '' } };
    expect(OPS.generateLesson.finalize!(ok)).toBe(ok);
    expect(() => OPS.recommendWords.finalize!([])).toThrow();
    const recs = [{ word: 'resilient' }];
    expect(OPS.recommendWords.finalize!(recs)).toBe(recs);
  });
});
