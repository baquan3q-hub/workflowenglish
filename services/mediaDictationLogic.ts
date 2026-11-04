/**
 * Dictation on outside media (a YouTube video or an audio file): reading the
 * transcript the learner pastes, cutting it into sentences with times, and
 * the clip source each sentence plays from.
 *
 * Transcripts come as SRT, WebVTT, the text copied from YouTube's "Show
 * transcript" panel ("0:05" on its own line, or at the start of the line), or
 * plain text without times. Caption cues are fragments, so the words are
 * spread over each cue's time and regrouped into sentences.
 */
import { parseTimestamp, youtubeClipSource } from './youtubeLogic';

export interface Cue {
  start: number;
  /** Null when the format gives only start times (YouTube transcript copy). */
  end: number | null;
  text: string;
}

export type TranscriptFormat = 'srt' | 'vtt' | 'youtube' | 'plain';

export interface MediaSentence {
  id: string;
  text: string;
  /** Seconds; null until the sentence is timed (plain text). */
  start: number | null;
  end: number | null;
}

export type MediaSource = { kind: 'youtube'; videoId: string } | { kind: 'audio'; url: string };

export const MEDIA_CATEGORIES = ['ielts', 'conversation', 'story', 'news', 'talk', 'film', 'podcast', 'other'] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  ielts: 'IELTS Listening',
  conversation: 'Hội thoại',
  story: 'Truyện ngắn',
  news: 'Tin tức',
  talk: 'Bài nói (TED, bài giảng)',
  film: 'Phim',
  podcast: 'Podcast',
  other: 'Khác',
};

export const MEDIA_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;
export type MediaLevel = (typeof MEDIA_LEVELS)[number];

export interface MediaExercise {
  id: string;
  title: string;
  source: MediaSource;
  category: MediaCategory;
  level: MediaLevel;
  sentences: MediaSentence[];
  /** Where the material comes from, shown to the learner (channel, licence). */
  credit?: string;
}

// --- Parsing --------------------------------------------------------------------

const ARROW = /(\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?/;
const STAMP_LINE = /^\(?(\d{1,2}:)?\d{1,2}:\d{2}\)?$/;
const STAMP_LEAD = /^\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s+(.+)$/;

export function detectFormat(raw: string): TranscriptFormat {
  const text = raw.replace(/^﻿/, '').trimStart();
  if (/^WEBVTT/.test(text)) return 'vtt';
  if (ARROW.test(text)) return 'srt';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const stamped = lines.filter((l) => STAMP_LINE.test(l) || STAMP_LEAD.test(l)).length;
  return lines.length > 0 && stamped >= Math.max(2, lines.length * 0.25) ? 'youtube' : 'plain';
}

/** "00:01:02,500", "01:02.5" or "1:02" in seconds. */
function stampSeconds(s: string): number | null {
  return parseTimestamp(s.trim().replace(',', '.'));
}

/** Caption markup, sound labels and speaker arrows out; spaces tidied. */
export function cleanCaption(text: string): string {
  return text
    .replace(/<\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}>/g, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\[[^\]]*\]|\((?:music|applause|laughter|laughs|inaudible|cheering)[^)]*\)|♪+/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/^\s*(?:>>|-)\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTimedBlocks(raw: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = raw.replace(/^﻿/, '').replace(/\r/g, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const at = lines.findIndex((l) => ARROW.test(l));
    if (at < 0) continue;
    const [a, b] = lines[at].split('-->');
    const start = stampSeconds(a);
    // VTT settings ("align:start position:0%") follow the end time.
    const end = stampSeconds(b.trim().split(/\s+/)[0]);
    const text = cleanCaption(lines.slice(at + 1).join(' '));
    if (start === null || end === null || !text) continue;
    cues.push({ start, end: Math.max(end, start), text });
  }
  return dedupeRolling(cues);
}

/**
 * YouTube's automatic VTT repeats the previous line at the start of each cue
 * ("rolling" captions); keep only the new words.
 */
function dedupeRolling(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  for (const cue of cues) {
    const prev = out[out.length - 1];
    let text = cue.text;
    if (prev) {
      if (text === prev.text) {
        prev.end = Math.max(prev.end ?? cue.start, cue.end ?? cue.start);
        continue;
      }
      const tail = overlap(prev.text, text);
      if (tail > 0) text = text.slice(tail).trim();
    }
    if (text) out.push({ ...cue, text });
  }
  return out;
}

/** Length of the longest end of `a` (whole words) that `b` starts with. */
function overlap(a: string, b: string): number {
  const words = a.split(' ');
  for (let i = 0; i < words.length; i++) {
    const tail = words.slice(i).join(' ');
    if (tail.length >= 8 && (b === tail || b.startsWith(tail + ' '))) return tail.length;
  }
  return 0;
}

function parseYouTubeCopy(raw: string): Cue[] {
  const cues: Cue[] = [];
  let pending: number | null = null;
  for (const line of raw.replace(/\r/g, '').split('\n').map((l) => l.trim())) {
    if (!line) continue;
    if (STAMP_LINE.test(line)) {
      pending = stampSeconds(line.replace(/[()]/g, ''));
      continue;
    }
    const lead = STAMP_LEAD.exec(line);
    // The panel also lists chapter titles and "2 minutes, 5 seconds" labels.
    if (/^\d+\s+(?:seconds?|minutes?|hours?)(?:,\s*\d+\s+(?:seconds?|minutes?))*$/i.test(line)) continue;
    const start = lead ? stampSeconds(lead[1]) : pending;
    const text = cleanCaption(lead ? lead[2] : line);
    if (start === null || !text) continue;
    const last = cues[cues.length - 1];
    if (!lead && last && last.start === start) last.text = `${last.text} ${text}`;
    else cues.push({ start, end: null, text });
    pending = null;
  }
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

/** Timed cues of a pasted transcript; empty for plain text. */
export function parseCues(raw: string, format: TranscriptFormat = detectFormat(raw)): Cue[] {
  if (format === 'srt' || format === 'vtt') return parseTimedBlocks(raw);
  if (format === 'youtube') return parseYouTubeCopy(raw);
  return [];
}

// --- Sentences ------------------------------------------------------------------

export interface SentenceOptions {
  /** A sentence is cut after this many words even without a full stop (auto captions). */
  maxWords?: number;
  /** A silence this long (seconds) between cues also ends a sentence. */
  pauseGap?: number;
  /** Seconds a cue without an end time lasts at most (last cue of a YouTube copy). */
  lastCueSeconds?: number;
}

interface TimedWord {
  word: string;
  start: number;
  end: number;
  /** Silence before this word, in seconds. */
  gapBefore: number;
}

const ENDS_SENTENCE = /[.!?…]["'”’)]*$/;
/** Slow conversational speech, about 2 words a second. */
const SECONDS_PER_WORD = 0.5;
const ABBREVIATION = /^(?:mr|mrs|ms|dr|prof|st|vs|etc|e\.g|i\.e|u\.s|u\.k|no)\.$/i;

/** Each cue's words with times spread over the cue by their length. */
function timedWords(cues: Cue[], lastCueSeconds: number): TimedWord[] {
  const out: TimedWord[] = [];
  cues.forEach((cue, i) => {
    const next = cues[i + 1];
    const words = cue.text.split(/\s+/).filter(Boolean);
    let end = cue.end;
    if (end === null) {
      // No end time: the cue runs to the next one, but not longer than it takes to say its words.
      const spoken = Math.max(1.5, words.length * SECONDS_PER_WORD);
      end = cue.start + Math.min(spoken, next ? next.start - cue.start : lastCueSeconds);
    }
    end = Math.max(end, cue.start + 0.2);
    const weights = words.map((w) => w.length + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let at = cue.start;
    const prevEnd = out.length ? out[out.length - 1].end : cue.start;
    words.forEach((word, k) => {
      const span = ((end - cue.start) * weights[k]) / total;
      out.push({ word, start: at, end: at + span, gapBefore: k === 0 ? Math.max(0, cue.start - prevEnd) : 0 });
      at += span;
    });
  });
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sentences of timed cues, each with the time it is spoken. */
export function cuesToSentences(cues: Cue[], opts: SentenceOptions = {}): MediaSentence[] {
  const maxWords = opts.maxWords ?? 18;
  const pauseGap = opts.pauseGap ?? 1.5;
  const words = timedWords(cues, opts.lastCueSeconds ?? 5);
  const sentences: MediaSentence[] = [];
  let run: TimedWord[] = [];
  const flush = () => {
    if (!run.length) return;
    sentences.push({
      id: `s${sentences.length + 1}`,
      text: tidySentence(run.map((w) => w.word).join(' ')),
      start: round2(run[0].start),
      end: round2(run[run.length - 1].end),
    });
    run = [];
  };
  words.forEach((w) => {
    if (run.length && w.gapBefore >= pauseGap) flush();
    run.push(w);
    const stop = ENDS_SENTENCE.test(w.word) && !ABBREVIATION.test(w.word);
    // A long run with no full stop (auto captions): cut at a comma, else at the limit.
    if (stop || run.length >= maxWords + 6 || (run.length >= maxWords && /[,;:]$/.test(w.word))) flush();
  });
  flush();
  return sentences.filter((s) => s.text.length > 0);
}

function tidySentence(text: string): string {
  const t = text.replace(/\s+([,.!?;:])/g, '$1').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Sentences of plain text (no times yet); long ones split at commas. */
export function splitPlainText(raw: string, maxWords = 24): MediaSentence[] {
  const flat = cleanCaption(raw.replace(/\r?\n+/g, ' '));
  const parts = flat
    .split(/(?<=[.!?…]["'”’)]?)\s+(?=["'“‘(]?[A-Z0-9])/)
    .flatMap((s) => {
      const words = s.split(/\s+/);
      if (words.length <= maxWords) return [s];
      const pieces: string[] = [];
      let cur: string[] = [];
      words.forEach((w) => {
        cur.push(w);
        if (cur.length >= maxWords / 2 && /[,;:]$/.test(w)) {
          pieces.push(cur.join(' '));
          cur = [];
        }
      });
      if (cur.length) pieces.push(cur.join(' '));
      return pieces;
    })
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z0-9]/.test(s));
  return parts.map((text, i) => ({ id: `s${i + 1}`, text, start: null, end: null }));
}

/** The pasted transcript as sentences: timed when the format has times. */
export function transcriptToSentences(raw: string, opts?: SentenceOptions): { format: TranscriptFormat; sentences: MediaSentence[] } {
  const format = detectFormat(raw);
  if (format === 'plain') return { format, sentences: splitPlainText(raw) };
  return { format, sentences: cuesToSentences(parseCues(raw, format), opts) };
}

/** Sentences given times by tapping at each sentence's end while the media plays. */
export function applyTapMarks(sentences: MediaSentence[], marks: number[], startAt = 0): MediaSentence[] {
  let prev = startAt;
  return sentences.map((s, i) => {
    const end = marks[i];
    if (end === undefined || end <= prev) return { ...s, start: null, end: null };
    const timed = { ...s, start: round2(prev), end: round2(end) };
    prev = end;
    return timed;
  });
}

export const isTimed = (s: MediaSentence): s is MediaSentence & { start: number; end: number } =>
  s.start !== null && s.end !== null && s.end > s.start;

/** Moves one edge of a sentence by `delta` seconds, never past its neighbours' far edges or below 0. */
export function nudgeSentence(sentences: MediaSentence[], index: number, edge: 'start' | 'end', delta: number): MediaSentence[] {
  const s = sentences[index];
  if (!s || !isTimed(s)) return sentences;
  const next = { ...s };
  if (edge === 'start') next.start = round2(Math.min(Math.max(0, s.start + delta), s.end - 0.3));
  else next.end = round2(Math.max(s.end + delta, s.start + 0.3));
  return sentences.map((x, i) => (i === index ? next : x));
}

// --- Playback -------------------------------------------------------------------

/** Padding around a sentence so the first and last syllables are not cut off. */
export const CLIP_PAD = { before: 0.25, after: 0.4 };

/** What the clip player plays for a sentence: `yt:` source or the audio URL with a media fragment. */
export function sentenceSource(source: MediaSource, s: MediaSentence): string | null {
  if (!isTimed(s)) return null;
  const start = Math.max(0, s.start - CLIP_PAD.before);
  const end = s.end + CLIP_PAD.after;
  if (source.kind === 'youtube') return youtubeClipSource(source.videoId, start, end);
  return `${source.url.split('#')[0]}#t=${round2(start)},${round2(end)}`;
}

/** Start and end of a `#t=a,b` media fragment, or null. */
export function mediaFragment(url: string): { start: number; end: number } | null {
  const m = /#t=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/.exec(url);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  return end > start ? { start, end } : null;
}

/** A link to an audio file the browser can play directly (http/https, not a web page we know). */
export function parseAudioUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.toString();
}

// --- Hints ----------------------------------------------------------------------

/** "_ _ _" per word, punctuation kept, for the word-count hint. */
export function blankHint(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[A-Za-z0-9’']/g, '_').replace(/_+/g, (m) => '_'.repeat(Math.min(m.length, 12))))
    .join(' ');
}

/** Every word shown by its first letter only ("T_ w_____ i_ f___."). */
export function firstLetterHint(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/([A-Za-z0-9])([A-Za-z0-9’']*)/, (_, a: string, rest: string) => a + '_'.repeat(rest.length)))
    .join(' ');
}

/**
 * The typed text with the next missing word of the sentence filled in: the
 * words typed so far are kept up to the first one that is wrong.
 */
export function revealNextWord(reference: string, typed: string): string {
  const ref = reference.split(/\s+/).filter(Boolean);
  const got = typed.split(/\s+/).filter(Boolean);
  const key = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  let i = 0;
  while (i < got.length && i < ref.length && key(got[i]) === key(ref[i])) i++;
  return ref.slice(0, Math.min(i + 1, ref.length)).join(' ') + (i + 1 < ref.length ? ' ' : '');
}

// --- Progress -------------------------------------------------------------------

export interface DictationProgress {
  /** Best accuracy per sentence id, 0–100. */
  best: Record<string, number>;
  /** Sentence ids whose answer was revealed (counted as not done unaided). */
  revealed: string[];
  /** Where the learner stopped. */
  index: number;
  updatedAt: string;
}

export const emptyProgress = (): DictationProgress => ({ best: {}, revealed: [], index: 0, updatedAt: new Date(0).toISOString() });

export function summarizeProgress(p: DictationProgress, total: number) {
  const scores = Object.values(p.best);
  const done = scores.length;
  const average = done ? Math.round(scores.reduce((a, b) => a + b, 0) / done) : 0;
  const mastered = scores.filter((s) => s >= 90).length;
  return { done, total, average, mastered, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Exercise problems an editor must fix before saving; empty when fine. */
export function exerciseProblems(e: Pick<MediaExercise, 'title' | 'sentences'>): string[] {
  const out: string[] = [];
  if (!e.title.trim()) out.push('Bài chưa có tên.');
  if (e.sentences.length < 2) out.push('Cần ít nhất 2 câu.');
  const untimed = e.sentences.filter((s) => !isTimed(s)).length;
  if (untimed) out.push(`${untimed} câu chưa có mốc thời gian.`);
  for (let i = 1; i < e.sentences.length; i++) {
    const a = e.sentences[i - 1];
    const b = e.sentences[i];
    if (isTimed(a) && isTimed(b) && b.start < a.start) {
      out.push(`Câu ${i + 1} bắt đầu trước câu ${i}.`);
      break;
    }
  }
  return out;
}

// --- Checking (dailydictation style) ----------------------------------------------

const checkKey = (w: string) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');

/**
 * What "Kiểm tra" shows: the sentence's words up to the first one typed
 * wrong, and every word after it as stars of the same length, punctuation
 * kept. The learner sees where to look again without being told the word.
 */
export function maskedCheck(reference: string, typed: string): { shown: string; correct: number; total: number; complete: boolean } {
  const ref = reference.split(/\s+/).filter(Boolean);
  const got = typed.split(/\s+/).filter((w) => checkKey(w));
  const words = ref.filter((w) => checkKey(w));
  let i = 0;
  while (i < got.length && i < words.length && checkKey(got[i]) === checkKey(words[i])) i++;
  let seen = 0;
  const shown = ref
    .map((w) => {
      if (!checkKey(w)) return w;
      seen += 1;
      return seen <= i ? w : w.replace(/[A-Za-z0-9’']/g, '*');
    })
    .join(' ');
  return { shown, correct: i, total: words.length, complete: i === words.length && got.length === words.length };
}

// --- Stored rows -------------------------------------------------------------------

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** An exercise read back from storage, or null when it is not usable. */
export function sanitizeExercise(raw: unknown): MediaExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const src = r.source as Record<string, unknown> | undefined;
  let source: MediaSource | null = null;
  if (src?.kind === 'youtube' && typeof src.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(src.videoId)) source = { kind: 'youtube', videoId: src.videoId };
  else if (src?.kind === 'audio' && typeof src.url === 'string' && parseAudioUrl(src.url)) source = { kind: 'audio', url: src.url };
  if (!source || typeof r.id !== 'string' || !Array.isArray(r.sentences)) return null;
  const sentences = r.sentences
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof (s as MediaSentence).text === 'string')
    .map((s, i) => ({ id: typeof s.id === 'string' ? s.id : `s${i + 1}`, text: String(s.text), start: num(s.start), end: num(s.end) }));
  if (!sentences.length) return null;
  return {
    id: r.id,
    title: typeof r.title === 'string' ? r.title : 'Bài nghe',
    source,
    category: MEDIA_CATEGORIES.includes(r.category as MediaCategory) ? (r.category as MediaCategory) : 'other',
    level: MEDIA_LEVELS.includes(r.level as MediaLevel) ? (r.level as MediaLevel) : 'B1',
    sentences,
    credit: typeof r.credit === 'string' ? r.credit : undefined,
  };
}

export function sanitizeProgress(raw: unknown): DictationProgress {
  if (!raw || typeof raw !== 'object') return emptyProgress();
  const r = raw as Record<string, unknown>;
  const best: Record<string, number> = {};
  if (r.best && typeof r.best === 'object')
    for (const [k, v] of Object.entries(r.best as Record<string, unknown>)) if (typeof v === 'number' && v >= 0 && v <= 100) best[k] = Math.round(v);
  return {
    best,
    revealed: Array.isArray(r.revealed) ? r.revealed.filter((x): x is string => typeof x === 'string') : [],
    index: typeof r.index === 'number' && r.index >= 0 ? Math.floor(r.index) : 0,
    updatedAt: typeof r.updatedAt === 'string' && !Number.isNaN(Date.parse(r.updatedAt)) ? r.updatedAt : new Date(0).toISOString(),
  };
}

/** Progress after one checked sentence: the best score kept, a revealed answer remembered. */
export function recordSentence(p: DictationProgress, sentenceId: string, accuracy: number, revealed: boolean, index: number, now: Date): DictationProgress {
  return {
    best: { ...p.best, [sentenceId]: Math.max(p.best[sentenceId] ?? 0, revealed ? Math.min(accuracy, 50) : accuracy) },
    revealed: revealed && !p.revealed.includes(sentenceId) ? [...p.revealed, sentenceId] : p.revealed,
    index,
    updatedAt: now.toISOString(),
  };
}

// --- Where to find material -----------------------------------------------------

export interface SuggestedSource {
  name: string;
  url: string;
  kindVi: string;
  /** What may be done with it. */
  licenceVi: string;
  levels: string;
}

/** Sources that can be played here: embedded YouTube (visible player) or open audio files. */
export const SUGGESTED_SOURCES: readonly SuggestedSource[] = [
  {
    name: 'VOA Learning English',
    url: 'https://www.youtube.com/@voalearningenglish',
    kindVi: 'Tin tức đọc chậm, có phụ đề',
    licenceVi: 'Phạm vi công cộng (chính phủ Mỹ): dùng tự do.',
    levels: 'A2–B1',
  },
  {
    name: 'LibriVox',
    url: 'https://librivox.org',
    kindVi: 'Sách nói, truyện ngắn (file MP3)',
    licenceVi: 'Phạm vi công cộng. Dán link MP3 từ archive.org.',
    levels: 'B1–C1',
  },
  {
    name: 'BBC Learning English',
    url: 'https://www.youtube.com/@bbclearningenglish',
    kindVi: '6 Minute English, hội thoại đời thường',
    licenceVi: 'Chỉ phát qua trình phát YouTube nhúng, không tải về.',
    levels: 'B1–B2',
  },
  {
    name: 'Kênh IELTS trên YouTube',
    url: 'https://www.youtube.com/results?search_query=ielts+listening+practice+test',
    kindVi: 'Đề luyện IELTS Listening có transcript',
    licenceVi: 'Chỉ phát qua trình phát YouTube nhúng. Video phải cho phép nhúng.',
    levels: 'B1–C1',
  },
];
