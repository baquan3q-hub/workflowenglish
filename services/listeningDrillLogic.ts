/**
 * IELTS Listening skill work, done on the device: word-by-word dictation
 * checking, transcript highlights for the review, and grading for the
 * numbers / names / dates drill.
 */
import type { ListeningSection, ScriptLine } from '../data/ielts/listening/types';
import { classifyTextAnswer, levenshtein, type AnswerStatus } from './listeningLogic';
import type { AudioSegment } from './listeningAudioService';

// --- Dictation -----------------------------------------------------------------

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18',
  nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
};

/** What a word is compared by: lowercase letters and digits, small numbers as digits. */
export function wordKey(word: string): string {
  const k = word.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9.]/g, '').replace(/\.$/, '').replace(/^\./, '');
  return NUMBER_WORDS[k] ?? k;
}

/** Words as written (punctuation kept for display), hyphenated words split. */
export function splitWords(text: string): string[] {
  return text
    .replace(/[—–]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => wordKey(w) !== '');
}

export type DictationStatus = 'ok' | 'close' | 'wrong' | 'missed' | 'extra';

export interface DictationToken {
  /** The script word (or the typed word for `extra`). */
  word: string;
  status: DictationStatus;
  /** What the learner typed instead, for `close` and `wrong`. */
  typed?: string;
}

export interface DictationResult {
  tokens: DictationToken[];
  /** Script words heard right (a near miss counts half), 0–100. */
  accuracy: number;
  correct: number;
  total: number;
}

const isClose = (a: string, b: string) => a.length >= 4 && !/\d/.test(a) && levenshtein(a, b) <= (a.length >= 6 ? 2 : 1);

/**
 * Lines up what was typed against the script (longest common subsequence on
 * word keys). A missed word next to an extra one is shown as a replacement,
 * "close" when it is only a spelling slip.
 */
export function compareDictation(reference: string, typed: string): DictationResult {
  const ref = splitWords(reference);
  const got = splitWords(typed);
  const rk = ref.map(wordKey);
  const gk = got.map(wordKey);
  const n = rk.length;
  const m = gk.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) lcs[i][j] = rk[i] === gk[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const raw: DictationToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && rk[i] === gk[j]) {
      raw.push({ word: ref[i++], status: 'ok' });
      j++;
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      raw.push({ word: got[j++], status: 'extra' });
    } else {
      raw.push({ word: ref[i++], status: 'missed' });
    }
  }

  // Pair each run of missed words with the extra words beside it.
  const tokens: DictationToken[] = [];
  for (let k = 0; k < raw.length; ) {
    if (raw[k].status === 'ok') {
      tokens.push(raw[k++]);
      continue;
    }
    const missed: string[] = [];
    const extra: string[] = [];
    while (k < raw.length && raw[k].status !== 'ok') {
      (raw[k].status === 'missed' ? missed : extra).push(raw[k].word);
      k++;
    }
    missed.forEach((word, x) => {
      const t = extra[x];
      if (t === undefined) tokens.push({ word, status: 'missed' });
      else tokens.push({ word, typed: t, status: isClose(wordKey(word), wordKey(t)) ? 'close' : 'wrong' });
    });
    extra.slice(missed.length).forEach((word) => tokens.push({ word, status: 'extra' }));
  }

  const correct = tokens.filter((t) => t.status === 'ok').length;
  const close = tokens.filter((t) => t.status === 'close').length;
  return { tokens, correct, total: n, accuracy: n ? Math.round(((correct + close / 2) / n) * 100) : 0 };
}

// --- Transcript highlights -----------------------------------------------------------

export type MarkKind = 'evidence' | 'distractor';

export interface TranscriptPiece {
  text: string;
  mark?: { kind: MarkKind; numbers: number[] };
}

export interface TranscriptLine {
  speaker: string;
  pieces: TranscriptPiece[];
}

export interface TranscriptSegment {
  id: string;
  /** Question numbers answered in this segment. */
  numbers: number[];
  lines: TranscriptLine[];
}

interface Range {
  start: number;
  end: number;
  kind: MarkKind;
  number: number;
}

/** Finds `needle` in `hay` ignoring case and runs of spaces; returns the span in `hay`. */
function findLoose(hay: string, needle: string): [number, number] | null {
  const words = needle.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const esc = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const m = new RegExp(esc.join('\\s+'), 'i').exec(hay);
  return m ? [m.index, m.index + m[0].length] : null;
}

function splitLine(text: string, offset: number, ranges: Range[]): TranscriptPiece[] {
  const end = offset + text.length;
  const inLine = ranges
    .filter((r) => r.start < end && r.end > offset)
    .map((r) => ({ ...r, start: Math.max(r.start, offset) - offset, end: Math.min(r.end, end) - offset }));
  if (!inLine.length) return [{ text }];
  // Cut at every boundary; each piece takes the marks covering it (evidence wins).
  const cuts = [...new Set([0, text.length, ...inLine.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
  const pieces: TranscriptPiece[] = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    const covering = inLine.filter((r) => r.start <= a && r.end >= b);
    const kind: MarkKind | undefined = covering.some((r) => r.kind === 'evidence')
      ? 'evidence'
      : covering.length
        ? 'distractor'
        : undefined;
    const piece: TranscriptPiece = kind
      ? { text: text.slice(a, b), mark: { kind, numbers: [...new Set(covering.filter((r) => r.kind === kind).map((r) => r.number))] } }
      : { text: text.slice(a, b) };
    const prev = pieces[pieces.length - 1];
    if (prev && !prev.mark && !piece.mark) prev.text += piece.text;
    else pieces.push(piece);
  }
  return pieces;
}

/** The script of a part with the answer evidence and the distractors marked. */
export function transcriptMarks(section: ListeningSection): TranscriptSegment[] {
  const questions = section.groups.flatMap((g) => g.questions);
  return section.segments.map((seg) => {
    const offsets: number[] = [];
    let pos = 0;
    for (const l of seg.lines) {
      offsets.push(pos);
      pos += l.text.length + 1;
    }
    const flatText = seg.lines.map((l) => l.text).join(' ');
    const ranges: Range[] = [];
    const own = questions.filter((q) => q.segmentId === seg.id);
    for (const q of own) {
      const ev = findLoose(flatText, q.evidence);
      if (ev) ranges.push({ start: ev[0], end: ev[1], kind: 'evidence', number: q.number });
      const d = q.distractor ? findLoose(flatText, q.distractor) : null;
      if (d) ranges.push({ start: d[0], end: d[1], kind: 'distractor', number: q.number });
    }
    return {
      id: seg.id,
      numbers: own.map((q) => q.number),
      lines: seg.lines.map((l: ScriptLine, k) => ({ speaker: l.speaker, pieces: splitLine(l.text, offsets[k], ranges) })),
    };
  });
}

// --- Numbers, names and dates drill ----------------------------------------------------------

export function gradeDrillAnswer(raw: string, answers: readonly string[]): AnswerStatus {
  // Spacing inside numbers and codes does not matter ("07946 382115", "BS9 4QT" = "BS94QT").
  const isCode = (s: string) => s.trim().split(/\s+/).every((t) => /\d/.test(t) || /^[a-z]{1,2}$/i.test(t));
  const compact = (s: string) => (isCode(s) ? s.replace(/\s+/g, '') : s);
  return classifyTextAnswer(compact(raw), answers.map(compact), 10, false);
}

/** `count` items picked from `items` in a random order. `random` is swappable for tests. */
export function pickDrillItems<T>(items: readonly T[], count: number, random: () => number = Math.random): T[] {
  const pool = [...items];
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(random() * (k + 1));
    [pool[k], pool[r]] = [pool[r], pool[k]];
  }
  return pool.slice(0, count);
}

// --- Dictation lines -------------------------------------------------------------------

export interface DictationLine {
  id: string;
  segmentId: string;
  speaker: string;
  text: string;
  /** One line read by its speaker's voice. */
  clip: AudioSegment;
}

/** Lines of a part worth writing down: long enough to practise on (short replies are skipped). */
export function dictationLines(section: ListeningSection, minWords = 5): DictationLine[] {
  const voices = new Map(section.speakers.map((s) => [s.name, s.voice]));
  return section.segments.flatMap((seg) =>
    seg.lines.flatMap((l, k) => {
      const voice = voices.get(l.speaker);
      if (!voice || splitWords(l.text).length < minWords) return [];
      const id = `${seg.id}-l${k}`;
      return [{ id, segmentId: seg.id, speaker: l.speaker, text: l.text, clip: { id, style: section.style, voice, text: l.text } }];
    }),
  );
}
