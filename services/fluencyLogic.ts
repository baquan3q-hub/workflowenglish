/**
 * Fluency measures for Speaking answers, computed on the device from the
 * transcript and the recorded audio. Pure functions; the audio decoding that
 * feeds `computeRms` lives in fluencyAudio.ts.
 *
 * The band references are rough guides for learners, not IELTS rules: the
 * examiner judges fluency as a whole, but speech rate, fillers and long
 * pauses are what most often keeps Vietnamese learners at 5.0–6.0.
 */

export const FRAME_MS = 50;
export const LONG_PAUSE_MS = 1500;

/** Hesitation sounds, always fillers. */
const FILLER_SOUNDS = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'ahh', 'hmm', 'mm', 'uhm']);
/**
 * Phrases that work as fillers in learner speech. Not "do you know…" (a
 * question) or "what I mean is…" (a useful way to rephrase).
 */
const FILLER_PHRASES: [string, RegExp][] = [
  ['you know', /(?<!\b(?:do|did|don't|didn't|if|what)\s)\byou know\b(?!\s+(?:what|how|why|that|where|when|who)\b)/g],
  ['i mean', /(?<!\bwhat\s)\bi mean\b(?!\s+(?:is|was|that)\b)/g],
];
/** Words that are fine twice in a row ("I had had", "that that"). */
const ALLOWED_DOUBLES = new Set(['had', 'that']);

export interface FillerCount {
  word: string;
  count: number;
}

export interface PauseInfo {
  count: number;
  longestMs: number;
  totalMs: number;
}

export interface FluencyMetrics {
  /** Words without fillers. */
  words: number;
  /** Seconds used for the rate: the voiced span when audio was analysed. */
  seconds: number;
  wpm: number;
  fillers: { total: number; perMinute: number; top: FillerCount[] };
  repeats: number;
  /** Absent when the audio could not be decoded. */
  pauses?: PauseInfo & { perMinute: number };
}

/** Lower-case words, keeping apostrophes ("it's", "don't"). */
export function tokenize(transcript: string): string[] {
  return (
    transcript
      .toLowerCase()
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/[’‘]/g, "'")
      .match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []
  );
}

export function isFillerSound(word: string): boolean {
  return FILLER_SOUNDS.has(word);
}

/**
 * Fillers in a transcript: hesitation sounds, "you know", "I mean", and
 * "like" when set off by commas ("it was, like, huge").
 */
export function countFillers(transcript: string): FillerCount[] {
  const counts = new Map<string, number>();
  const add = (w: string, n = 1) => n && counts.set(w, (counts.get(w) ?? 0) + n);

  for (const w of tokenize(transcript)) if (isFillerSound(w)) add(w);
  const text = ` ${transcript.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')} `;
  for (const [phrase, re] of FILLER_PHRASES) add(phrase, text.match(re)?.length ?? 0);
  add('like', text.match(/,\s*like\s*,/g)?.length ?? 0);

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/**
 * Stammered repeats: the same word twice in a row ("the the") or the same two
 * words twice in a row ("I think I think"). Fillers in between are skipped.
 */
export function countRepeats(transcript: string): number {
  const words = tokenize(transcript).filter((w) => !isFillerSound(w));
  let repeats = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && !ALLOWED_DOUBLES.has(words[i])) {
      repeats++;
      continue;
    }
    if (i >= 3 && words[i] === words[i - 2] && words[i - 1] === words[i - 3] && words[i] !== words[i - 1]) {
      repeats++;
    }
  }
  return repeats;
}

/** Words that carry meaning: everything except hesitation sounds. */
export function contentWordCount(transcript: string): number {
  return tokenize(transcript).filter((w) => !isFillerSound(w)).length;
}

export function wordsPerMinute(words: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((words / seconds) * 60);
}

/** Root-mean-square level of each `frameMs` frame of mono samples. */
export function computeRms(samples: ArrayLike<number>, sampleRate: number, frameMs = FRAME_MS): number[] {
  const size = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const out: number[] = [];
  for (let start = 0; start < samples.length; start += size) {
    const end = Math.min(samples.length, start + size);
    let sum = 0;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    out.push(Math.sqrt(sum / (end - start)));
  }
  return out;
}

/**
 * Level below which a frame counts as silence. Relative to the loud end of
 * the recording so it works for quiet and loud microphones alike.
 */
export function silenceThreshold(rms: number[]): number {
  if (!rms.length) return 0;
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
  return Math.max(0.006, loud * 0.12);
}

export interface VoicedSpan {
  startMs: number;
  endMs: number;
}

/** From the first voiced frame to the end of the last one, or null when silent. */
export function voicedSpan(rms: number[], frameMs = FRAME_MS, threshold = silenceThreshold(rms)): VoicedSpan | null {
  const first = rms.findIndex((v) => v >= threshold);
  if (first < 0) return null;
  let last = rms.length - 1;
  while (last > first && rms[last] < threshold) last--;
  return { startMs: first * frameMs, endMs: (last + 1) * frameMs };
}

/**
 * Silences of at least `minPauseMs` between the first and last voiced frames.
 * Silence before the learner starts and after they finish does not count.
 */
export function detectPauses(
  rms: number[],
  frameMs = FRAME_MS,
  minPauseMs = LONG_PAUSE_MS,
  threshold = silenceThreshold(rms),
): { startMs: number; durationMs: number }[] {
  const span = voicedSpan(rms, frameMs, threshold);
  if (!span) return [];
  const first = span.startMs / frameMs;
  const last = span.endMs / frameMs - 1;
  const pauses: { startMs: number; durationMs: number }[] = [];
  let runStart = -1;
  for (let i = first; i <= last; i++) {
    if (rms[i] < threshold) {
      if (runStart < 0) runStart = i;
      continue;
    }
    if (runStart >= 0) {
      const durationMs = (i - runStart) * frameMs;
      if (durationMs >= minPauseMs) pauses.push({ startMs: runStart * frameMs, durationMs });
      runStart = -1;
    }
  }
  return pauses;
}

export function summarizePauses(pauses: { durationMs: number }[]): PauseInfo {
  return {
    count: pauses.length,
    longestMs: pauses.reduce((m, p) => Math.max(m, p.durationMs), 0),
    totalMs: pauses.reduce((s, p) => s + p.durationMs, 0),
  };
}

const perMinute = (n: number, seconds: number) => (seconds > 0 ? Math.round((n / seconds) * 600) / 10 : 0);

/**
 * All measures for one answer. With audio levels the rate uses the voiced
 * span, so a slow start or a gap before pressing stop does not lower it.
 */
export function fluencyMetrics(input: { transcript: string; durationSeconds: number; rms?: number[] | null; frameMs?: number }): FluencyMetrics {
  const frameMs = input.frameMs ?? FRAME_MS;
  const words = contentWordCount(input.transcript);
  const fillerList = countFillers(input.transcript);
  const fillerTotal = fillerList.reduce((s, f) => s + f.count, 0);
  let seconds = Math.max(0, input.durationSeconds);
  let pauses: FluencyMetrics['pauses'];

  if (input.rms && input.rms.length) {
    const threshold = silenceThreshold(input.rms);
    const span = voicedSpan(input.rms, frameMs, threshold);
    if (span) seconds = (span.endMs - span.startMs) / 1000;
    const info = summarizePauses(detectPauses(input.rms, frameMs, LONG_PAUSE_MS, threshold));
    pauses = { ...info, perMinute: perMinute(info.count, seconds) };
  }

  return {
    words,
    seconds: Math.round(seconds * 10) / 10,
    wpm: wordsPerMinute(words, seconds),
    fillers: { total: fillerTotal, perMinute: perMinute(fillerTotal, seconds), top: fillerList.slice(0, 3) },
    repeats: countRepeats(input.transcript),
    pauses,
  };
}

/** Several answers (a Part 3 set, a mock test) as one set of measures. */
export function combineFluency(list: FluencyMetrics[]): FluencyMetrics | null {
  if (!list.length) return null;
  const words = list.reduce((s, m) => s + m.words, 0);
  const seconds = list.reduce((s, m) => s + m.seconds, 0);
  const fillerTotal = list.reduce((s, m) => s + m.fillers.total, 0);
  const counts = new Map<string, number>();
  for (const m of list) for (const f of m.fillers.top) counts.set(f.word, (counts.get(f.word) ?? 0) + f.count);
  const withPauses = list.filter((m) => m.pauses);
  let pauses: FluencyMetrics['pauses'];
  if (withPauses.length === list.length) {
    const count = withPauses.reduce((s, m) => s + m.pauses!.count, 0);
    pauses = {
      count,
      longestMs: withPauses.reduce((x, m) => Math.max(x, m.pauses!.longestMs), 0),
      totalMs: withPauses.reduce((s, m) => s + m.pauses!.totalMs, 0),
      perMinute: perMinute(count, seconds),
    };
  }
  return {
    words,
    seconds: Math.round(seconds * 10) / 10,
    wpm: wordsPerMinute(words, seconds),
    fillers: {
      total: fillerTotal,
      perMinute: perMinute(fillerTotal, seconds),
      top: [...counts.entries()]
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
        .slice(0, 3),
    },
    repeats: list.reduce((s, m) => s + m.repeats, 0),
    pauses,
  };
}

// --- Band references ----------------------------------------------------------

export type FluencyMetricKey = 'wpm' | 'fillers' | 'pauses' | 'repeats';
export type FluencyLevel = 'strong' | 'ok' | 'weak' | 'low';

export interface FluencyRating {
  level: FluencyLevel;
  /** "≈ band 7+" */
  band: string;
  tipVi: string;
}

interface Step {
  upTo: number;
  level: FluencyLevel;
  band: string;
  tipVi: string;
}

/** Ordered by `upTo`; the first step with value <= upTo applies. */
export const FLUENCY_REFERENCE: Record<FluencyMetricKey, { labelVi: string; unitVi: string; steps: Step[] }> = {
  wpm: {
    labelVi: 'Tốc độ nói',
    unitVi: 'từ/phút',
    steps: [
      { upTo: 79, level: 'low', band: '≈ band 5 trở xuống', tipVi: 'Nói chậm, ngắt nhiều. Học sẵn cụm mở đầu để vào câu nhanh hơn.' },
      { upTo: 104, level: 'weak', band: '≈ band 5–5.5', tipVi: 'Hơi chậm. Luyện shadowing để quen nhịp nói liền mạch.' },
      { upTo: 124, level: 'ok', band: '≈ band 6', tipVi: 'Tốc độ ổn. Giữ nhịp đều, nối ý bằng linking words.' },
      { upTo: 170, level: 'strong', band: '≈ band 7+', tipVi: 'Tốc độ tự nhiên như người nói thành thạo.' },
      { upTo: Infinity, level: 'ok', band: 'Nhanh', tipVi: 'Nói khá nhanh. Kiểm tra âm cuối có bị nuốt không.' },
    ],
  },
  fillers: {
    labelVi: 'Từ đệm (um, uh…)',
    unitVi: 'lần/phút',
    steps: [
      { upTo: 2, level: 'strong', band: '≈ band 7+', tipVi: 'Rất ít từ đệm.' },
      { upTo: 4, level: 'ok', band: '≈ band 6', tipVi: 'Thay "um" bằng cụm câu giờ tự nhiên: "Let me think…", "Well,…".' },
      { upTo: 7, level: 'weak', band: '≈ band 5–5.5', tipVi: 'Nhiều từ đệm. Chuẩn bị ý theo khung trước khi nói.' },
      { upTo: Infinity, level: 'low', band: '≈ band 5 trở xuống', tipVi: 'Từ đệm làm đứt mạch nói. Luyện trả lời ngắn nhưng liền mạch trước.' },
    ],
  },
  pauses: {
    labelVi: 'Ngừng dài (trên 1,5 giây)',
    unitVi: 'lần/phút',
    steps: [
      { upTo: 1, level: 'strong', band: '≈ band 7+', tipVi: 'Hầu như không ngừng lâu để tìm từ.' },
      { upTo: 2, level: 'ok', band: '≈ band 6', tipVi: 'Đôi lúc ngừng tìm từ. Dùng từ đơn giản hơn thay vì dừng lại.' },
      { upTo: 4, level: 'weak', band: '≈ band 5–5.5', tipVi: 'Ngừng khá nhiều. Học sẵn từ vựng chủ đề để không bị bí.' },
      { upTo: Infinity, level: 'low', band: '≈ band 5 trở xuống', tipVi: 'Ngừng rất nhiều. Bắt đầu với Part 1, mỗi câu 2–3 ý ngắn.' },
    ],
  },
  repeats: {
    labelVi: 'Lặp từ',
    unitVi: 'lần/phút',
    steps: [
      { upTo: 1, level: 'strong', band: '≈ band 7+', tipVi: 'Hầu như không lặp lại từ.' },
      { upTo: 3, level: 'ok', band: '≈ band 6', tipVi: 'Đôi khi lặp lại khi tìm từ. Nghĩ trọn ý rồi mới nói.' },
      { upTo: Infinity, level: 'weak', band: '≈ band 5–5.5', tipVi: 'Lặp từ nhiều. Nói chậm lại một chút, ưu tiên câu ngắn hoàn chỉnh.' },
    ],
  },
};

export function rateFluency(key: FluencyMetricKey, value: number): FluencyRating {
  const step = FLUENCY_REFERENCE[key].steps.find((s) => value <= s.upTo)!;
  return { level: step.level, band: step.band, tipVi: step.tipVi };
}

/** The per-minute value each reference is keyed on. */
export function metricValue(m: FluencyMetrics, key: FluencyMetricKey): number | null {
  switch (key) {
    case 'wpm':
      return m.wpm;
    case 'fillers':
      return m.fillers.perMinute;
    case 'pauses':
      return m.pauses ? m.pauses.perMinute : null;
    case 'repeats':
      return perMinute(m.repeats, m.seconds);
  }
}

/** Under about 15 seconds of speech the rates say little. */
export function hasEnoughSpeech(m: FluencyMetrics): boolean {
  return m.seconds >= 15 && m.words >= 25;
}

/** One line for the grader, so the examiner model sees the measured numbers. */
export function fluencySummaryForGrader(m: FluencyMetrics): string {
  const parts = [`${m.wpm} words per minute over ${Math.round(m.seconds)} s of speech`];
  const fillers = m.fillers.top.map((f) => `${f.word} x${f.count}`).join(', ');
  parts.push(`${m.fillers.total} fillers (${m.fillers.perMinute} per minute${fillers ? `: ${fillers}` : ''})`);
  if (m.pauses) parts.push(`${m.pauses.count} pauses longer than 1.5 s (longest ${(m.pauses.longestMs / 1000).toFixed(1)} s)`);
  parts.push(`${m.repeats} stammered repeats`);
  return `Measured on the device: ${parts.join('; ')}.`;
}

/** Shape check for metrics read back from `ielts_attempts.details`. */
export function isFluencyMetrics(v: unknown): v is FluencyMetrics {
  const m = v as FluencyMetrics | null;
  return !!m && typeof m.wpm === 'number' && typeof m.words === 'number' && typeof m.seconds === 'number' && !!m.fillers && typeof m.fillers.total === 'number';
}

/** The reference as readable ranges: "80–104: ≈ band 5–5.5", "trên 2 đến 4: ≈ band 6". */
export function referenceRanges(key: FluencyMetricKey): string[] {
  const steps = FLUENCY_REFERENCE[key].steps;
  const whole = key === 'wpm';
  return steps.map((s, i) => {
    const prev = i > 0 ? steps[i - 1].upTo : null;
    let range: string;
    if (prev === null) range = whole ? `dưới ${s.upTo + 1}` : `đến ${s.upTo}`;
    else if (s.upTo === Infinity) range = `trên ${prev}`;
    else range = whole ? `${prev + 1}–${s.upTo}` : `trên ${prev} đến ${s.upTo}`;
    return `${range}: ${s.band}`;
  });
}
