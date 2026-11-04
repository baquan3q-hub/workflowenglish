/**
 * transcribeYouTube: the words of a public YouTube video, sentence by sentence
 * with start and end times, for dictation. Gemini watches the video from its
 * URL (no download); a clip of at most 15 minutes is asked for at a time.
 * Times are approximate (about a second), so the app lets the learner nudge them.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, S, type OpSpec } from '../lib.ts';
import { YOUTUBE_ID } from './listeningRules.ts';

export const MAX_CLIP_SECONDS = 15 * 60;

const schema = S.obj({
  sentences: S.arr(S.obj({ start: S.num(), end: S.num(), text: S.str() })),
});

export interface TranscribedSentence {
  start: number;
  end: number;
  text: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Sentences cleaned up: times in order and inside the clip. Gemini sometimes
 * counts from the clip start instead of the video start; those are shifted.
 */
export function tidyTranscript(raw: unknown, clipStart: number, clipEnd: number): TranscribedSentence[] {
  const list = (raw as { sentences?: unknown })?.sentences;
  if (!Array.isArray(list)) return [];
  let rows = list
    .map((s) => s as Partial<TranscribedSentence>)
    .filter((s) => typeof s.text === 'string' && s.text.trim() && Number.isFinite(s.start) && Number.isFinite(s.end))
    .map((s) => ({ start: Number(s.start), end: Number(s.end), text: String(s.text).replace(/\s+/g, ' ').trim() }));
  if (rows.length && clipStart > 5 && rows[0].start < clipStart - 5 && rows[rows.length - 1].end <= clipEnd - clipStart + 5) {
    rows = rows.map((s) => ({ ...s, start: s.start + clipStart, end: s.end + clipStart }));
  }
  rows.sort((a, b) => a.start - b.start);
  return rows
    .map((s, i) => {
      const next = rows[i + 1];
      const end = Math.max(s.start + 0.5, next ? Math.min(s.end, next.start + 0.3) : s.end);
      return { start: round1(Math.max(clipStart, s.start)), end: round1(Math.min(clipEnd, end)), text: s.text };
    })
    .filter((s) => s.end > s.start);
}

export const transcribeYouTube: OpSpec = {
  hourlyLimit: 6,
  models: FLASH_MODELS,
  timeoutMs: 150_000,
  kind: 'json',
  finalize(data) {
    const sentences = (data as { sentences?: unknown[] })?.sentences;
    if (!Array.isArray(sentences) || sentences.length < 2) throw new Error('too few sentences');
    return data;
  },
  build(payload) {
    const p = asObject(payload);
    const videoId = typeof p.videoId === 'string' ? p.videoId : '';
    if (!YOUTUBE_ID.test(videoId)) throw new BadRequest('videoId is not a YouTube id');
    const start = typeof p.start === 'number' && p.start > 0 ? Math.floor(p.start) : 0;
    const end = typeof p.end === 'number' && p.end > start ? Math.ceil(p.end) : start + MAX_CLIP_SECONDS;
    if (end - start > MAX_CLIP_SECONDS) throw new BadRequest(`clip is longer than ${MAX_CLIP_SECONDS / 60} minutes`);

    const prompt = `Transcribe the English speech in this video clip for a dictation exercise.

- Write exactly what is said, word for word, with normal punctuation and capital letters. Leave out filler sounds ("um", "uh") and false starts; keep everything else.
- One entry per sentence. Split sentences longer than about 25 words at a natural pause.
- start and end: seconds from the very beginning of the video (not from the clip start), with one decimal, as precisely as you can hear the sentence begin and end.
- Skip music, sound effects and on-screen text that is not spoken.
- If nobody speaks English in the clip, return an empty list.`;
    return {
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` },
              videoMetadata: { startOffset: `${start}s`, endOffset: `${end}s` },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: jsonConfig(schema, { temperature: 0.1, mediaResolution: 'MEDIA_RESOLUTION_LOW' }),
    };
  },
};
