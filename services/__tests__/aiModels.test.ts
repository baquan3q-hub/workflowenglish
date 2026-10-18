import { describe, expect, it } from 'vitest';
import {
  generateBody,
  interactionAudio,
  interactionsBody,
  modelsFromEnv,
  resolveModels,
  STRONG_TEXT_MODELS,
  TEXT_MODELS,
  thinkingConfig,
  TTS_MODELS,
  upstreamReason,
  usesInteractions,
  wavToPcm,
} from '../../supabase/functions/ai-proxy/models.ts';
import { FLASH_MODELS } from '../../supabase/functions/ai-proxy/lib.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { pcmToWav } from '../../supabase/functions/ai-proxy/ops/listening.ts';
import { AiError, aiErrorFromResponse, aiErrorMessage } from '../aiClient';
import { healthItems, type AiHealthReport } from '../aiHealthService';

describe('model lists', () => {
  it('no op uses a retired model any more', () => {
    for (const [name, spec] of Object.entries(OPS)) {
      expect(spec.models, name).not.toContain('gemini-2.0-flash');
      expect(spec.models, name).not.toContain('gemini-3-flash-preview');
      // A current model comes before the access-limited 2.5 family.
      expect(spec.models[0], name).toMatch(/^gemini-(3\.|2\.5-flash-preview-tts)/);
    }
    expect(FLASH_MODELS).toBe(TEXT_MODELS);
  });

  it('every speech op can also run on 3.x TTS', () => {
    for (const name of ['tts', 'listeningAudio']) {
      const req = OPS[name].build(
        name === 'tts' ? { text: 'Hello there.' } : { text: 'Hello there.', voice: 'Kore', style: 'uk' },
      );
      expect(req.speech?.text).toBe('Hello there.');
      expect(req.speech?.speakers[0].voice).toBe('Kore');
    }
    const dialogue = OPS.listeningAudio.build({
      text: 'Anna: Hi.\nTom: Hello.',
      style: 'us',
      speakers: [
        { name: 'Anna', voice: 'Kore' },
        { name: 'Tom', voice: 'Puck' },
      ],
    });
    expect(dialogue.speech?.speakers).toEqual([
      { speaker: 'Anna', voice: 'Kore' },
      { speaker: 'Tom', voice: 'Puck' },
    ]);
    // The accent direction stays out of what is read aloud.
    expect(dialogue.speech?.text).toBe('Anna: Hi.\nTom: Hello.');
    expect(dialogue.speech?.style).toMatch(/American/);
  });

  it('follows the model secrets for shared lists only', () => {
    expect(modelsFromEnv(' gemini-9-flash , ,bad model!,gemini-8-lite', TEXT_MODELS)).toEqual(['gemini-9-flash', 'gemini-8-lite']);
    expect(modelsFromEnv('', TEXT_MODELS)).toBe(TEXT_MODELS);
    expect(modelsFromEnv(undefined, TEXT_MODELS)).toBe(TEXT_MODELS);
    const env = { text: 'gemini-x', tts: 'gemini-y-tts' };
    expect(resolveModels(TEXT_MODELS, env)).toEqual(['gemini-x']);
    expect(resolveModels(STRONG_TEXT_MODELS, env)).toEqual(['gemini-x']);
    expect(resolveModels(TTS_MODELS, env)).toEqual(['gemini-y-tts']);
    expect(resolveModels(['custom'], env)).toEqual(['custom']);
  });
});

describe('per-model calls', () => {
  it('sets thinking the way each family accepts', () => {
    expect(thinkingConfig('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfig('gemini-3.6-flash')).toEqual({ thinkingLevel: 'minimal' });
    expect(thinkingConfig('gemini-3.5-flash-lite')).toEqual({ thinkingLevel: 'minimal' });
    expect(thinkingConfig('gemini-3.8-flash')).toEqual({ thinkingLevel: 'low' });
    expect(thinkingConfig('gemini-2.5-flash-preview-tts')).toBeNull();
    expect(thinkingConfig('gemini-3.8-flash-tts')).toBeNull();
    expect(thinkingConfig('gemini-2.0-flash')).toBeNull();
  });

  it('keeps the speech description out of generateContent and lets the op override thinking', () => {
    const body = generateBody('gemini-3.6-flash', {
      contents: [],
      generationConfig: { temperature: 0.2, thinkingConfig: { thinkingLevel: 'high' } },
      speech: { text: 'x', speakers: [{ voice: 'Kore' }] },
    });
    expect(body).not.toHaveProperty('speech');
    expect(body.generationConfig).toEqual({ temperature: 0.2, thinkingConfig: { thinkingLevel: 'high' } });
  });

  it('builds an Interactions request for 3.x TTS and reads its audio back as PCM', () => {
    expect(usesInteractions('gemini-3.8-flash-tts')).toBe(true);
    expect(usesInteractions('gemini-2.5-flash-preview-tts')).toBe(false);
    expect(usesInteractions('gemini-3.6-flash')).toBe(false);
    const body = interactionsBody('gemini-3.8-flash-tts', {
      contents: [],
      generationConfig: {},
      speech: { text: 'Hi.', style: 'calm', speakers: [{ voice: 'Kore' }] },
    }) as { model: string; input: { content: { text: string; annotations: unknown[] }[] }[]; generation_config: unknown };
    expect(body.model).toBe('gemini-3.8-flash-tts');
    expect(body.input[0].content[0]).toEqual({ type: 'text', text: 'Hi.', annotations: [{ type: 'speech_metadata', style: 'calm' }] });
    expect(body.generation_config).toEqual({ speech_config: [{ voice: 'Kore' }] });
    expect(() => interactionsBody('gemini-3.8-flash-tts', { contents: [], generationConfig: {} })).toThrow();

    expect(
      interactionAudio({
        steps: [
          { type: 'thought', content: [{ type: 'audio', data: 'nope' }] },
          { type: 'model_output', content: [{ type: 'text' }, { type: 'audio', data: 'QUJD' }] },
        ],
      }),
    ).toBe('QUJD');
    expect(() => interactionAudio({ steps: [] })).toThrow('no audio');

    const pcm = new Uint8Array([1, 2, 3, 4, 5, 6]);
    expect([...wavToPcm(pcmToWav(pcm))]).toEqual([...pcm]);
    expect(wavToPcm(pcm)).toBe(pcm);
  });

  it('names why Gemini refused', () => {
    expect(upstreamReason(404, 'models/gemini-2.0-flash is not found')).toBe('model_unavailable');
    expect(upstreamReason(400, '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}')).toBe('key_invalid');
    expect(upstreamReason(403, 'PERMISSION_DENIED')).toBe('key_invalid');
    expect(upstreamReason(429, 'RESOURCE_EXHAUSTED')).toBe('quota');
    expect(upstreamReason(400, 'model is no longer available to new users')).toBe('model_unavailable');
    expect(upstreamReason(500, 'internal')).toBe('unknown');
  });
});

describe('error lines in the app', () => {
  it('reads the reason and says when retrying will not help', () => {
    const err = aiErrorFromResponse(502, { error: 'server', reason: 'model_unavailable' });
    expect(err.reason).toBe('model_unavailable');
    expect(aiErrorMessage(err)).toContain('cấu hình máy chủ');
    expect(aiErrorMessage(aiErrorFromResponse(500, { reason: 'not_configured' }))).toContain('cấu hình máy chủ');
    expect(aiErrorMessage(new AiError('server', 'x', undefined, 'quota'))).toContain('hạn mức');
    expect(aiErrorFromResponse(502, { reason: 'made_up' }).reason).toBeUndefined();
    expect(aiErrorMessage(aiErrorFromResponse(502, {}))).toContain('AI đang bận');
  });
});

describe('healthItems', () => {
  const report = (over: Partial<AiHealthReport> = {}): AiHealthReport => ({
    checkedAt: '2026-10-18T00:00:00Z',
    keyConfigured: true,
    usageTable: true,
    audioBucket: true,
    models: [
      { model: 'gemini-3.6-flash', group: 'text', ok: true, status: 200, reason: null, ms: 400 },
      { model: 'gemini-2.5-flash-preview-tts', group: 'tts', ok: true, status: 200, reason: null, ms: 900 },
    ],
    ...over,
  });

  it('is all green when everything works', () => {
    expect(healthItems(report()).every((i) => i.level === 'ok')).toBe(true);
  });

  it('puts the missing key first with the command to fix it', () => {
    const items = healthItems(report({ keyConfigured: false, models: [], audioBucket: false }));
    expect(items[0]).toMatchObject({ level: 'error' });
    expect(items[0].fix).toContain('GEMINI_API_KEY');
    expect(items.at(-1)?.title).toContain('ielts-audio');
  });

  it('warns when only a fallback model works and explains a dead list', () => {
    const items = healthItems(
      report({
        models: [
          { model: 'gemini-3.6-flash', group: 'text', ok: false, status: 404, reason: 'model_unavailable', ms: 100 },
          { model: 'gemini-2.5-flash', group: 'text', ok: true, status: 200, reason: null, ms: 300 },
          { model: 'gemini-2.5-flash-preview-tts', group: 'tts', ok: false, status: 400, reason: 'key_invalid', ms: 80 },
        ],
      }),
    );
    expect(items[0].level).toBe('error');
    expect(items[0].fix).toContain('GEMINI_API_KEY');
    expect(items.find((i) => i.title.includes('gemini-2.5-flash'))?.level).toBe('warn');
  });
});
