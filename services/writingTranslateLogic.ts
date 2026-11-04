/**
 * "Viết từng câu": the learner rebuilds an IELTS answer one sentence at a time
 * from its Vietnamese version, and the gradeTranslation op grades each one.
 *
 * Adaptive parts, all pure so they are tested:
 * - Level: the model band shown is one step above what the learner writes now
 *   (i+1). Three strong sentences in a row move it up, two weak ones move it
 *   down, between bands 6 and 8.
 * - Hints fade: each step of the ladder gives more help and caps the score.
 * - Upgrade mode from band 8 (or an estimate of 7+): rewrite the band 6
 *   English sentence instead of translating, since translation helps most
 *   below band 7.
 * - Review: weak sentences come back after 1, 3, 7 and 21 days.
 *
 * Progress is kept on the device per user; attempts are also logged to
 * `translation_attempts` (migration 017) when it exists.
 */
import { TRANSLATION_ERRORS } from '../supabase/functions/ai-proxy/ops/writingTranslate.ts';
import type { IeltsWritingTask } from '../types';

export type TranslationBand = 6 | 7 | 8;
export const TRANSLATION_BAND_LIST: readonly TranslationBand[] = [6, 7, 8];
export type TranslationMode = 'translate' | 'upgrade';
export type TranslationErrorCategory = (typeof TRANSLATION_ERRORS)[number];

export interface TranslationKey {
  en: string;
  vi: string;
}

export interface TranslationSentence {
  id: string;
  vi: string;
  band6: string;
  band7: string;
  band8: string;
  keys: TranslationKey[];
  /** Mistakes the Vietnamese invites; the first hint names them. */
  traps?: TranslationErrorCategory[];
}

export interface TranslationParagraph {
  label: string;
  sentences: TranslationSentence[];
}

export interface TranslationSet {
  id: string;
  source: 'bundled' | 'generated';
  task: IeltsWritingTask;
  title: string;
  prompt: string;
  /** Bank question with the same prompt, to write the full essay next. */
  questionId?: string;
  /** Band 6/7/8 sample essays of the same prompt. */
  sampleSetId?: string;
  /** Task 1: the chart numbers in words. */
  dataNote?: string;
  paragraphs: TranslationParagraph[];
  createdAt?: string;
}

export interface TranslationError {
  original: string;
  corrected: string;
  category: TranslationErrorCategory;
  explanationVi: string;
}

export interface TranslationGrade {
  verdict: 'correct' | 'acceptable' | 'incorrect';
  score: number | null;
  band: number | null;
  meaningKept: boolean;
  corrected: string;
  errors: TranslationError[];
  explanationVi: string;
  upgrade: string;
  upgradeNoteVi: string;
  revision: 'first' | 'better' | 'same' | 'worse';
}

export const ERROR_LABELS: Record<TranslationErrorCategory, string> = {
  meaning: 'Ý nghĩa',
  tense: 'Thì',
  article: 'Mạo từ',
  plural_agreement: 'Số nhiều · hoà hợp',
  preposition: 'Giới từ',
  word_choice: 'Chọn từ',
  collocation: 'Collocation',
  word_form: 'Dạng từ',
  word_order: 'Trật tự từ',
  sentence_structure: 'Cấu trúc câu',
  spelling_punctuation: 'Chính tả · dấu câu',
  register: 'Văn phong',
  other: 'Khác',
};

/** What to watch for, as the first hint. */
export const TRAP_TIPS: Record<TranslationErrorCategory, string> = {
  meaning: 'Dịch đủ mọi ý của câu tiếng Việt, không bỏ vế nào.',
  tense: 'Chọn thì cho đúng mốc thời gian (quá khứ, hiện tại hoàn thành, câu điều kiện…); tiếng Việt không chia thì nên rất dễ sót.',
  article: 'Danh từ đếm được số ít cần a/an/the; tiếng Việt không có mạo từ nên hay bị quên.',
  plural_agreement: 'Kiểm tra số nhiều (-s) và động từ hoà hợp với chủ ngữ (every + danh từ số ít + động từ -s).',
  preposition: 'Giới từ đi kèm cố định: by car, on foot, pay for, pressure on, rise from … to …',
  word_choice: 'Đừng dịch từng chữ: chọn từ tiếng Anh tự nhiên cho ý đó (ví dụ "chiếm" → account for).',
  collocation: 'Dùng cụm từ người bản xứ hay đi cùng nhau (make a difference, develop skills, offer benefits).',
  word_form: 'Đúng dạng từ sau giới từ và động từ: by + V-ing, danh từ / tính từ / trạng từ.',
  word_order: 'Trật tự tính từ – danh từ và vị trí trạng từ khác tiếng Việt.',
  sentence_structure: 'Nối ý bằng mệnh đề quan hệ, phân từ hoặc từ nối; "mặc dù … nhưng" chỉ giữ một vế (although, không có but).',
  spelling_punctuation: 'Kiểm tra chính tả và dấu phẩy sau từ nối đầu câu.',
  register: 'Văn viết học thuật: không viết tắt (don\'t), tránh "a lot of", "kids".',
  other: 'Đọc lại cả câu một lần trước khi gửi.',
};

// --- Models and level ----------------------------------------------------------

export const modelFor = (s: TranslationSentence, band: TranslationBand) => (band === 6 ? s.band6 : band === 7 ? s.band7 : s.band8);

/** Starting model band from the learner's IELTS goal: one step above where most learners at that goal write. */
export function startBand(target: number | null | undefined): TranslationBand {
  if (target == null || target <= 6) return 6;
  if (target <= 7.5) return 7;
  return 8;
}

export interface TranslateLevel {
  band: TranslationBand;
  /** Moving average of graded sentence bands; null before the first grade. */
  estimate: number | null;
  upStreak: number;
  downStreak: number;
}

export const levelFor = (target: number | null | undefined): TranslateLevel => ({ band: startBand(target), estimate: null, upStreak: 0, downStreak: 0 });

export const LEVEL_UP_AFTER = 3;
export const LEVEL_DOWN_AFTER = 2;
const STRONG_SCORE = 85;
const WEAK_SCORE = 55;

/** The level after one graded sentence. Strong means 85+ with at most one hint; weak means under 55. */
export function nextLevel(level: TranslateLevel, result: { score: number; band: number | null; hintsUsed: number }): TranslateLevel {
  const estimate = result.band == null ? level.estimate : level.estimate == null ? result.band : Math.round((level.estimate * 0.7 + result.band * 0.3) * 10) / 10;
  const strong = result.score >= STRONG_SCORE && result.hintsUsed <= 1;
  const weak = result.score < WEAK_SCORE;
  let { band, upStreak, downStreak } = level;
  if (strong) {
    upStreak += 1;
    downStreak = 0;
  } else if (weak) {
    downStreak += 1;
    upStreak = 0;
  } else {
    upStreak = 0;
    downStreak = 0;
  }
  if (upStreak >= LEVEL_UP_AFTER && band < 8) {
    band = (band + 1) as TranslationBand;
    upStreak = 0;
  } else if (downStreak >= LEVEL_DOWN_AFTER && band > 6) {
    band = (band - 1) as TranslationBand;
    downStreak = 0;
  }
  return { band, estimate, upStreak, downStreak };
}

/** Upgrade mode is offered once translating is no longer the right challenge. */
export const upgradeUnlocked = (level: TranslateLevel) => level.band === 8 || (level.estimate ?? 0) >= 7;

// --- Hint ladder --------------------------------------------------------------

export const HINT_STEPS = [
  { id: 'focus', label: 'Điểm cần chú ý' },
  { id: 'keys', label: 'Từ khoá' },
  { id: 'letters', label: 'Chữ cái đầu' },
  { id: 'frame', label: 'Khung câu' },
  { id: 'model', label: 'Câu mẫu' },
] as const;

/** Highest score after using `hints` steps of the ladder. */
export const HINT_CAPS = [100, 95, 90, 80, 70, 50] as const;
export const scoreCap = (hints: number) => HINT_CAPS[Math.max(0, Math.min(HINT_CAPS.length - 1, hints))];
export const cappedScore = (score: number | null, hints: number) => (score == null ? null : Math.min(score, scoreCap(hints)));

const WORD = /[A-Za-z][A-Za-z'’-]*/g;

/** "The bar chart shows" → "T__ b__ c____ s____". */
export function firstLetters(sentence: string): string {
  return sentence.replace(WORD, (w) => w[0] + w.slice(1).replace(/[A-Za-z]/g, '_'));
}

const FRAME_WORDS = new Set(
  (
    'a an the this that these those it its their there here and or but so because as since while whereas although though if when which who whom whose that ' +
    'of in on at by for from to with without into over under between about than also not no even more most less fewer both each every ' +
    'is are was were be been being has have had do does did can could will would should may might must'
  ).split(' '),
);

/** The model with its function words kept and the content words blanked. */
export function sentenceFrame(sentence: string): string {
  return sentence.replace(WORD, (w) => (FRAME_WORDS.has(w.toLowerCase()) ? w : '____'));
}

export const trapTips = (s: TranslationSentence) => (s.traps?.length ? s.traps : (['other'] as TranslationErrorCategory[])).map((t) => ({ category: t, tip: TRAP_TIPS[t] }));

// --- Answers -------------------------------------------------------------------

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

/** The learner pasted the model shown on screen. */
export const copiesModel = (answer: string, models: string[]) => models.some((m) => squash(m) === squash(answer));

/** Ready to send: a few English words, not just the Vietnamese pasted back. */
const VI_LETTER = /[ãĩõũăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

/** Words with a Vietnamese letter; a stray one (a name, a slip of the Telex keyboard) is not enough to refuse the answer. */
export const vietnameseWords = (text: string) => text.normalize('NFC').split(/\s+/).filter((w) => VI_LETTER.test(w));

export function answerProblem(answer: string, vi: string): string | null {
  const a = answer.normalize('NFC').trim();
  if (!a) return 'Viết câu tiếng Anh trước khi chấm.';
  const words = a.split(/\s+/);
  if (words.length < 3) return 'Câu quá ngắn, hãy viết đủ ý.';
  if (squash(a) === squash(vi)) return 'Câu trả lời cần viết bằng tiếng Anh.';
  const vietnamese = vietnameseWords(a);
  if (vietnamese.length >= Math.max(2, words.length * 0.3)) return `Câu trả lời cần viết bằng tiếng Anh (có chữ tiếng Việt: ${vietnamese.slice(0, 3).join(', ')}).`;
  return null;
}

/** "the **number** of tourists" → parts with the changed words marked. */
export function markedParts(corrected: string): { text: string; changed: boolean }[] {
  return corrected
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') && p.endsWith('**') ? { text: p.slice(2, -2), changed: true } : { text: p, changed: false }));
}

export const verdictTone = (v: TranslationGrade['verdict']) => (v === 'correct' ? 'mint' : v === 'acceptable' ? 'butter' : 'blush');
export const VERDICT_LABELS: Record<TranslationGrade['verdict'], string> = { correct: 'Chính xác', acceptable: 'Chấp nhận được', incorrect: 'Cần sửa' };

// --- Progress and review ----------------------------------------------------------

export const REVIEW_DAYS = [1, 3, 7, 21] as const;
const DAY = 86_400_000;

export interface SentenceRecord {
  best: number;
  last: number;
  tries: number;
  /** Step in REVIEW_DAYS; -1 when the sentence never needed review. */
  box: number;
  /** ISO time it is due for review; null when it does not need one. */
  due: string | null;
  lastAnswer: string;
}

export const sentenceKey = (setId: string, sentenceId: string) => `${setId}/${sentenceId}`;

/**
 * After a graded try: under 70 starts the review again tomorrow; 70-84 comes
 * back in 3 days; 85+ moves a sentence in review one step on and leaves it
 * when it passes the last step. A first try of 85+ never enters review.
 */
export function scheduleSentence(prev: SentenceRecord | undefined, score: number, answer: string, now: Date): SentenceRecord {
  const at = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  const base = { best: Math.max(prev?.best ?? 0, score), last: score, tries: (prev?.tries ?? 0) + 1, lastAnswer: answer };
  if (score < 70) return { ...base, box: 0, due: at(REVIEW_DAYS[0]) };
  if (score < STRONG_SCORE) return { ...base, box: Math.max(0, prev?.box ?? 0), due: at(REVIEW_DAYS[1]) };
  if (!prev || prev.box < 0 || prev.due === null) return { ...base, box: -1, due: null };
  const box = prev.box + 1;
  return box >= REVIEW_DAYS.length ? { ...base, box: -1, due: null } : { ...base, box, due: at(REVIEW_DAYS[box]) };
}

export interface TranslateState {
  level: TranslateLevel;
  sentences: Record<string, SentenceRecord>;
}

export const emptyTranslateState = (target: number | null | undefined): TranslateState => ({ level: levelFor(target), sentences: {} });

const isBand = (v: unknown): v is TranslationBand => v === 6 || v === 7 || v === 8;
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** A stored state, checked field by field; anything broken falls back to the default. */
export function sanitizeTranslateState(raw: unknown, target: number | null | undefined): TranslateState {
  const base = emptyTranslateState(target);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as { level?: Partial<TranslateLevel>; sentences?: Record<string, Partial<SentenceRecord>> };
  const l = r.level ?? {};
  const level: TranslateLevel = {
    band: isBand(l.band) ? l.band : base.level.band,
    estimate: typeof l.estimate === 'number' && Number.isFinite(l.estimate) ? l.estimate : null,
    upStreak: num(l.upStreak, 0),
    downStreak: num(l.downStreak, 0),
  };
  const sentences: Record<string, SentenceRecord> = {};
  for (const [k, v] of Object.entries(r.sentences && typeof r.sentences === 'object' ? r.sentences : {})) {
    if (!v || typeof v !== 'object') continue;
    sentences[k] = {
      best: num(v.best, 0),
      last: num(v.last, 0),
      tries: num(v.tries, 0),
      box: num(v.box, -1),
      due: typeof v.due === 'string' && !Number.isNaN(Date.parse(v.due)) ? v.due : null,
      lastAnswer: typeof v.lastAnswer === 'string' ? v.lastAnswer : '',
    };
  }
  return { level, sentences };
}

export const allSentences = (set: TranslationSet) => set.paragraphs.flatMap((p) => p.sentences.map((s) => ({ paragraph: p.label, sentence: s })));

export function setProgress(state: TranslateState, set: TranslationSet) {
  const list = allSentences(set);
  const recs = list.map(({ sentence }) => state.sentences[sentenceKey(set.id, sentence.id)]).filter((r): r is SentenceRecord => !!r);
  return {
    total: list.length,
    done: recs.length,
    average: recs.length ? Math.round(recs.reduce((s, r) => s + r.best, 0) / recs.length) : null,
  };
}

export interface DueSentence {
  set: TranslationSet;
  sentence: TranslationSentence;
  record: SentenceRecord;
}

/** Sentences due for review now, most overdue first. */
export function dueSentences(state: TranslateState, sets: readonly TranslationSet[], now: Date): DueSentence[] {
  const out: DueSentence[] = [];
  for (const set of sets) {
    for (const { sentence } of allSentences(set)) {
      const record = state.sentences[sentenceKey(set.id, sentence.id)];
      if (record?.due && Date.parse(record.due) <= now.getTime()) out.push({ set, sentence, record });
    }
  }
  return out.sort((a, b) => Date.parse(a.record.due!) - Date.parse(b.record.due!));
}

/** Error categories across the learner's graded sentences, most frequent first. */
export function errorTally(errors: TranslationError[]): { category: TranslationErrorCategory; count: number }[] {
  const counts = new Map<TranslationErrorCategory, number>();
  for (const e of errors) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

/** The sentence's text with the learner's answers in order, for "read the whole essay". */
export function assembledEssay(state: TranslateState, set: TranslationSet): { label: string; text: string }[] {
  return set.paragraphs.map((p) => ({
    label: p.label,
    text: p.sentences
      .map((s) => state.sentences[sentenceKey(set.id, s.id)]?.lastAnswer.trim())
      .filter(Boolean)
      .join(' '),
  }));
}
