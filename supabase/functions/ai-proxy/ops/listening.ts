/**
 * IELTS Listening audio: one TTS clip per script segment, saved as a WAV in
 * the public `ielts-audio` bucket. The file name is a hash of voice, style
 * and text, so a segment is generated once and shared by every learner.
 *
 * services/listeningAudioService.ts computes the same key to check the
 * bucket before calling this op; keep `listeningAudioKey` in step with it.
 */
import { asObject, BadRequest, oneOf, str, userText, type OpSpec } from '../lib.ts';

/** Gemini prebuilt voices used as distinct speakers. */
export const LISTENING_VOICES = ['Kore', 'Aoede', 'Leda', 'Puck', 'Charon', 'Orus'] as const;
export type ListeningVoice = (typeof LISTENING_VOICES)[number];

/** Delivery instructions put before the text. Accents other than British and American are approximate. */
export const LISTENING_STYLES = {
  uk: 'Read this in a natural British English accent at a normal conversational pace:',
  us: 'Read this in a natural American English accent at a normal conversational pace:',
  au: 'Read this with an Australian English accent at a normal conversational pace:',
  lecture: 'Read this like a university lecturer, British English, clear and measured pace:',
} as const;
export type ListeningStyle = keyof typeof LISTENING_STYLES;
const STYLE_KEYS = Object.keys(LISTENING_STYLES) as ListeningStyle[];

export const LISTENING_TEXT_MAX = 1500;
export const LISTENING_AUDIO_FOLDER = 'listening';

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** sha256 of `v1|voice|style|text`, hex. */
export async function listeningAudioKey(voice: string, style: string, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(`v1|${voice}|${style}|${text}`);
  return toHex(await crypto.subtle.digest('SHA-256', bytes));
}

function parsePayload(payload: unknown): { text: string; voice: ListeningVoice; style: ListeningStyle } {
  const o = asObject(payload);
  const text = str(o, 'text', { max: LISTENING_TEXT_MAX }).trim();
  if (!text) throw new BadRequest('text is required');
  if (typeof o.voice !== 'string' || !(LISTENING_VOICES as readonly string[]).includes(o.voice)) {
    throw new BadRequest('voice is not supported');
  }
  return { text, voice: o.voice as ListeningVoice, style: oneOf(o, 'style', STYLE_KEYS, 'uk') };
}

/** Wraps 16-bit mono PCM in a WAV header. */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24_000): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export const listeningAudio: OpSpec = {
  hourlyLimit: 80,
  models: ['gemini-2.5-flash-preview-tts'],
  timeoutMs: 90_000,
  kind: 'audio',
  build(payload) {
    const { text, voice, style } = parsePayload(payload);
    return {
      contents: userText(`${LISTENING_STYLES[style]}\n\n${text}`),
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    };
  },
  storage: {
    bucket: 'ielts-audio',
    async path(payload) {
      const { text, voice, style } = parsePayload(payload);
      return `${LISTENING_AUDIO_FOLDER}/${await listeningAudioKey(voice, style, text)}.wav`;
    },
    encode(data) {
      if (typeof data !== 'string') throw new Error('expected base64 audio');
      return { body: pcmToWav(base64ToBytes(data)), contentType: 'audio/wav' };
    },
  },
};
