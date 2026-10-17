/**
 * Audio for IELTS Listening segments.
 *
 * Each segment is a WAV in the public `ielts-audio` bucket, named by a hash of
 * voice, style and text (see supabase/functions/ai-proxy/ops/listening.ts).
 * A cheap HEAD request finds clips someone already generated; only missing
 * ones go to the `listeningAudio` op, which uses an AI call.
 */
import { invokeAi } from './aiClient';
import {
  LISTENING_AUDIO_FOLDER,
  listeningAudioKey,
  type ListeningStyle,
  type ListeningVoice,
} from '../supabase/functions/ai-proxy/ops/listening.ts';

export { LISTENING_VOICES, LISTENING_STYLES } from '../supabase/functions/ai-proxy/ops/listening.ts';
export type { ListeningStyle, ListeningVoice };

export interface AudioSegment {
  id: string;
  text: string;
  voice: ListeningVoice;
  style: ListeningStyle;
}

export type AudioUrls = Record<string, string>;

const BUCKET = 'ielts-audio';
const resolved = new Map<string, string>();

export function publicAudioUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${LISTENING_AUDIO_FOLDER}/${key}.wav`;
}

/** The key the server will use; text is trimmed the same way. */
export function segmentKey(seg: Pick<AudioSegment, 'voice' | 'style' | 'text'>): Promise<string> {
  return listeningAudioKey(seg.voice, seg.style, seg.text.trim());
}

async function exists(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal });
    return res.ok;
  } catch (err) {
    if (signal?.aborted) throw err;
    return false;
  }
}

/** URL of a playable clip for one segment, generating it if nobody has yet. */
export async function segmentAudioUrl(seg: AudioSegment, signal?: AbortSignal): Promise<string> {
  const key = await segmentKey(seg);
  const known = resolved.get(key);
  if (known) return known;

  const url = publicAudioUrl(key);
  if (!(await exists(url, signal))) {
    const res = await invokeAi<{ url: string }>(
      'listeningAudio',
      { text: seg.text.trim(), voice: seg.voice, style: seg.style },
      { signal, timeoutMs: 120_000 },
    );
    if (!res?.url) throw new Error('listeningAudio returned no url');
  }
  resolved.set(key, url);
  return url;
}

/**
 * Runs `worker` over `items` with at most `limit` in flight, keeping order in
 * the result. `onProgress` gets the count finished so far. Stops starting new
 * work after the first failure and rethrows it.
 */
export async function runPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  let failed = false;
  const lane = async () => {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        failed = true;
        throw err;
      }
      onProgress?.(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, lane));
  return results;
}

/** URLs for every segment of a part, three at a time. */
export async function prepareSegmentAudio(
  segments: readonly AudioSegment[],
  opts: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<AudioUrls> {
  const urls = await runPool(segments, 3, (s) => segmentAudioUrl(s, opts.signal), opts.onProgress);
  return Object.fromEntries(segments.map((s, i) => [s.id, urls[i]]));
}
