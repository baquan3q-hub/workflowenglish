/**
 * IELTS Listening audio: one TTS clip per script segment, saved as a WAV in
 * the public `ielts-audio` bucket. The file name is a hash of voice(s), style
 * and text, so a segment is generated once and shared by every learner.
 *
 * A segment is either one voice reading plain text, or a two-person dialogue
 * (Gemini multi-speaker TTS) whose text has one "Name: line" per turn.
 *
 * services/listeningAudioService.ts computes the same key to check the
 * bucket before calling this op; keep `listeningAudioKey` in step with it.
 */
import { asObject, BadRequest, oneOf, str, userText, type OpSpec } from '../lib.ts';
import { TTS_MODELS } from '../models.ts';

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

export interface DialogueSpeaker {
  name: string;
  voice: ListeningVoice;
}

/** What a client asks for: one `voice`, or two `speakers` for a dialogue. */
export interface ListeningAudioRequest {
  text: string;
  style: ListeningStyle;
  voice?: ListeningVoice;
  speakers?: DialogueSpeaker[];
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** sha256 of `v1|voice|style|text`, hex. */
export async function listeningAudioKey(voice: string, style: string, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(`v1|${voice}|${style}|${text}`);
  return toHex(await crypto.subtle.digest('SHA-256', bytes));
}

/** The voice part of the cache key: "Kore", or "Anna=Kore,Tom=Puck" for a dialogue. */
export function voiceKey(req: Pick<ListeningAudioRequest, 'voice' | 'speakers'>): string {
  return req.speakers?.length ? req.speakers.map((s) => `${s.name}=${s.voice}`).join(',') : (req.voice ?? '');
}

const isVoice = (v: unknown): v is ListeningVoice => typeof v === 'string' && (LISTENING_VOICES as readonly string[]).includes(v);
export const SPEAKER_NAME = /^[A-Z][A-Za-z]{0,19}$/;

function parsePayload(payload: unknown): ListeningAudioRequest {
  const o = asObject(payload);
  const text = str(o, 'text', { max: LISTENING_TEXT_MAX }).trim();
  if (!text) throw new BadRequest('text is required');
  const style = oneOf(o, 'style', STYLE_KEYS, 'uk');
  if (o.speakers !== undefined && o.speakers !== null) {
    if (!Array.isArray(o.speakers) || o.speakers.length !== 2) throw new BadRequest('speakers must list exactly 2 people');
    const speakers = o.speakers.map((sp, i) => {
      const s = asObject(sp, `speakers[${i}]`);
      if (typeof s.name !== 'string' || !SPEAKER_NAME.test(s.name)) throw new BadRequest('speaker name is not valid');
      if (!isVoice(s.voice)) throw new BadRequest('voice is not supported');
      return { name: s.name, voice: s.voice };
    });
    if (speakers[0].name === speakers[1].name) throw new BadRequest('speaker names must differ');
    return { text, style, speakers };
  }
  if (!isVoice(o.voice)) throw new BadRequest('voice is not supported');
  return { text, style, voice: o.voice };
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

const voiceConfig = (voiceName: string) => ({ prebuiltVoiceConfig: { voiceName } });

export const listeningAudio: OpSpec = {
  hourlyLimit: 80,
  models: TTS_MODELS,
  timeoutMs: 90_000,
  kind: 'audio',
  build(payload) {
    const { text, voice, style, speakers } = parsePayload(payload);
    const intro = LISTENING_STYLES[style];
    if (speakers) {
      return {
        contents: userText(`${intro}\nTTS the following conversation between ${speakers[0].name} and ${speakers[1].name}:\n${text}`),
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakers.map((s) => ({ speaker: s.name, voiceConfig: voiceConfig(s.voice) })),
            },
          },
        },
        speech: { text, style: intro, speakers: speakers.map((s) => ({ speaker: s.name, voice: s.voice })) },
      };
    }
    return {
      contents: userText(`${intro}\n\n${text}`),
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: voiceConfig(voice!) },
      },
      speech: { text, style: intro, speakers: [{ voice: voice! }] },
    };
  },
  storage: {
    bucket: 'ielts-audio',
    async path(payload) {
      const req = parsePayload(payload);
      return `${LISTENING_AUDIO_FOLDER}/${await listeningAudioKey(voiceKey(req), req.style, req.text)}.wav`;
    },
    encode(data) {
      if (typeof data !== 'string') throw new Error('expected base64 audio');
      return { body: pcmToWav(base64ToBytes(data)), contentType: 'audio/wav' };
    },
  },
};
