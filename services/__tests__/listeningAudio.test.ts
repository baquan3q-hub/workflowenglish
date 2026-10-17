import { describe, it, expect } from 'vitest';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { BadRequest } from '../../supabase/functions/ai-proxy/lib.ts';
import { base64ToBytes, listeningAudioKey, pcmToWav } from '../../supabase/functions/ai-proxy/ops/listening.ts';
import { publicAudioUrl, runPool, segmentKey } from '../listeningAudioService';

const op = OPS.listeningAudio;
const payload = { text: '  Good morning, how can I help you?  ', voice: 'Puck', style: 'uk' };

describe('listeningAudio op', () => {
  it('puts the delivery style before the text and uses the chosen voice', () => {
    const req = op.build(payload);
    const text = (req.contents[0].parts[0] as { text: string }).text;
    expect(text).toMatch(/^Read this in a natural British English accent/);
    expect(text).toContain('Good morning, how can I help you?');
    const speech = req.generationConfig.speechConfig as { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } };
    expect(speech.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Puck');
  });

  it('rejects unknown voices and overlong text, and defaults the style', () => {
    expect(() => op.build({ ...payload, voice: 'Nobody' })).toThrow(BadRequest);
    expect(() => op.build({ ...payload, text: 'x'.repeat(1501) })).toThrow(BadRequest);
    expect(() => op.build({ ...payload, text: '   ' })).toThrow(BadRequest);
    const text = (op.build({ ...payload, style: 'pirate' }).contents[0].parts[0] as { text: string }).text;
    expect(text).toContain('British English');
  });

  it('stores the clip under the same key the client computes', async () => {
    const path = await op.storage!.path(payload);
    const key = await segmentKey({ text: payload.text, voice: 'Puck', style: 'uk' });
    expect(path).toBe(`listening/${key}.wav`);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(publicAudioUrl(key)).toMatch(new RegExp(`/storage/v1/object/public/ielts-audio/listening/${key}\\.wav$`));
  });

  it('gives different keys for a different voice, style or text', async () => {
    const base = await listeningAudioKey('Puck', 'uk', 'Hello');
    expect(await listeningAudioKey('Kore', 'uk', 'Hello')).not.toBe(base);
    expect(await listeningAudioKey('Puck', 'us', 'Hello')).not.toBe(base);
    expect(await listeningAudioKey('Puck', 'uk', 'Hello.')).not.toBe(base);
  });

  it('wraps PCM in a 24 kHz mono 16-bit WAV', () => {
    const pcm = base64ToBytes(btoa('\x01\x02\x03\x04'));
    const { body, contentType } = op.storage!.encode(btoa('\x01\x02\x03\x04'));
    expect(contentType).toBe('audio/wav');
    expect(body).toEqual(pcmToWav(pcm));
    const v = new DataView(body.buffer);
    expect(String.fromCharCode(...body.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...body.slice(8, 12))).toBe('WAVE');
    expect(v.getUint32(4, true)).toBe(36 + 4);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(24_000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(4);
    expect([...body.slice(44)]).toEqual([1, 2, 3, 4]);
  });
});

describe('runPool', () => {
  const tick = () => new Promise((r) => setTimeout(r, 1));

  it('keeps order, caps concurrency and reports progress', async () => {
    let active = 0;
    let peak = 0;
    const progress: number[] = [];
    const out = await runPool(
      [5, 1, 4, 2, 3],
      2,
      async (n) => {
        active++;
        peak = Math.max(peak, active);
        for (let i = 0; i < n; i++) await tick();
        active--;
        return n * 10;
      },
      (done) => progress.push(done),
    );
    expect(out).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
    expect(progress).toEqual([1, 2, 3, 4, 5]);
  });

  it('stops starting work after a failure', async () => {
    const started: number[] = [];
    await expect(
      runPool([1, 2, 3, 4, 5, 6], 1, async (n) => {
        started.push(n);
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
    expect(started).toEqual([1, 2]);
  });

  it('handles an empty list', async () => {
    expect(await runPool([], 3, async () => 1)).toEqual([]);
  });
});
