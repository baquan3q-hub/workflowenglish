/**
 * YouTube as the audio of a Listening part (IELTS phase I12): reading the
 * links an admin pastes, timestamps, and the clip sources the players use.
 *
 * A clip source is a string like `yt:M7lc1UVf-VE@12.5-40`: video id, then the
 * start and end in seconds. It travels in the same `segment id -> url` maps
 * as the TTS clips, so the players only need to tell the two apart.
 */
import { YOUTUBE_ID } from '../supabase/functions/ai-proxy/ops/listeningRules.ts';

export { YOUTUBE_ID };

const HOSTS = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/;

/** The 11-character video id in a pasted link or id, or null. */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (YOUTUBE_ID.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (HOSTS.test(host)) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v', 'e'].includes(parts[0])) id = parts[1] ?? null;
    else if (parts.length === 0) id = url.searchParams.get('v');
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** Seconds from "83", "83.5", "1:23", "1:23.4" or "1:02:03"; null when unreadable. */
export function parseTimestamp(input: string): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;
  const m = /^(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(raw);
  if (!m) return null;
  const [, a, b, c] = m;
  const secs = Number(c);
  if (a !== undefined && b !== undefined) {
    if (Number(b) >= 60 || secs >= 60) return null;
    return round2(Number(a) * 3600 + Number(b) * 60 + secs);
  }
  if (a !== undefined) {
    if (secs >= 60) return null;
    return round2(Number(a) * 60 + secs);
  }
  return round2(secs);
}

/** "1:23", "1:23.5" or "1:02:03" for seconds; tenths only when there are some. */
export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds * 10) / 10);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const whole = Math.floor(s);
  const tenth = Math.round((s - whole) * 10);
  const sec = `${String(whole).padStart(2, '0')}${tenth ? `.${tenth}` : ''}`;
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export interface YouTubeClip {
  videoId: string;
  start: number;
  end: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const SOURCE = /^yt:([A-Za-z0-9_-]{11})@(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;

export function youtubeClipSource(videoId: string, start: number, end: number): string {
  return `yt:${videoId}@${round2(start)}-${round2(end)}`;
}

export function parseClipSource(src: string | undefined): YouTubeClip | null {
  const m = src ? SOURCE.exec(src) : null;
  if (!m) return null;
  const start = Number(m[2]);
  const end = Number(m[3]);
  return end > start ? { videoId: m[1], start, end } : null;
}

export const isYouTubeSource = (src: string | undefined) => !!src && src.startsWith('yt:');

export const youtubeWatchUrl = (videoId: string, start = 0) =>
  `https://www.youtube.com/watch?v=${videoId}${start > 0 ? `&t=${Math.floor(start)}s` : ''}`;

export const youtubeThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
