/**
 * "Kho câu trả lời" (Speaking answer bank): every topic question with a
 * default sample and an answer frame; the learner notes their own ideas in
 * the frame, the buildSpeakingAnswer op turns them into an answer, and it is
 * kept so they can practise it until they can say it without reading.
 *
 * Frames teach moves, not fixed sentences, so the starters rotate. The
 * practice ladder takes the text away step by step (read aloud, faded words,
 * keywords, the question alone, a reworded question). A spoken try is scored
 * on idea coverage, and a try that repeats the text word for word is flagged:
 * examiners mark memorised answers down.
 */
import { CUE_CARDS, PART1_PACKS, PART3_THEMES, type SpeakingVocab } from '../data/ielts/speakingTopics';
import type { BuiltSpeakingAnswer } from '../supabase/functions/ai-proxy/ops/speakingBank.ts';

export type SpeakingPartKey = 'part_1' | 'part_2' | 'part_3';
export const PART_LABELS: Record<SpeakingPartKey, string> = { part_1: 'Part 1', part_2: 'Part 2', part_3: 'Part 3' };

export interface FrameSlot {
  id: string;
  label: string;
  hintVi: string;
  /** English ways to open this move; the one shown rotates. */
  starters: string[];
}

export interface AnswerFrame {
  id: string;
  name: string;
  part: SpeakingPartKey;
  descriptionVi: string;
  slots: FrameSlot[];
}

export const FRAMES: readonly AnswerFrame[] = [
  {
    id: 'area',
    name: 'A.R.E.A',
    part: 'part_1',
    descriptionVi: 'Trả lời thẳng, nêu lý do, thêm ví dụ, rồi một ý mở rộng. 2-4 câu, khoảng 20 giây.',
    slots: [
      { id: 'answer', label: 'Trả lời thẳng', hintVi: 'Một câu trả lời đúng câu hỏi.', starters: ["Yes, definitely. I'd say…", 'To be honest, not really…', 'It depends, but mostly…'] },
      { id: 'reason', label: 'Lý do', hintVi: 'Vì sao?', starters: ['The main reason is that…', 'Mostly because…', "That's because…"] },
      { id: 'example', label: 'Ví dụ', hintVi: 'Một chi tiết của riêng bạn: khi nào, ở đâu, với ai.', starters: ['For instance, last weekend I…', 'Like when I…', 'Just the other day,…'] },
      { id: 'alternative', label: 'Mở rộng', hintVi: 'Một mặt khác, hoặc điều có thể thay đổi sau này.', starters: ['Having said that,…', 'Although maybe in the future…', 'But if I had more time,…'] },
    ],
  },
  {
    id: 'cue',
    name: 'Theo gợi ý thẻ',
    part: 'part_2',
    descriptionVi: 'Mỗi gạch đầu dòng của thẻ là một đoạn. Kể như một câu chuyện có chi tiết, kết bằng cảm nghĩ. 1.5-2 phút.',
    slots: [],
  },
  {
    id: 'ppf',
    name: 'Quá khứ · Hiện tại · Tương lai',
    part: 'part_2',
    descriptionVi: 'Hợp với thẻ về người, nơi chốn, thói quen: trước đây thế nào, bây giờ ra sao, sau này sẽ thế nào.',
    slots: [
      { id: 'intro', label: 'Giới thiệu', hintVi: 'Bạn sẽ kể về ai / cái gì.', starters: ["I'd like to talk about…", "I'm going to describe…", 'The one that comes to mind is…'] },
      { id: 'past', label: 'Quá khứ', hintVi: 'Lần đầu, bối cảnh, chuyện đã xảy ra.', starters: ['I first … when…', 'Back when I was…', 'It all started…'] },
      { id: 'present', label: 'Hiện tại', hintVi: 'Bây giờ nó / người đó thế nào với bạn.', starters: ['These days,…', 'Now,…', 'At the moment,…'] },
      { id: 'future', label: 'Tương lai', hintVi: 'Bạn mong / dự định gì.', starters: ["In the future, I'm hoping to…", "I'd love to…", 'Eventually,…'] },
      { id: 'feeling', label: 'Cảm nghĩ', hintVi: 'Vì sao nó quan trọng với bạn.', starters: ['The reason it means so much to me is…', 'Looking back,…', 'What I value most is…'] },
    ],
  },
  {
    id: 'oreo',
    name: 'O.R.E.O',
    part: 'part_3',
    descriptionVi: 'Quan điểm, lý do, ví dụ cụ thể, rồi hệ quả hoặc nhắc lại quan điểm có thêm sắc thái. 30-60 giây.',
    slots: [
      { id: 'opinion', label: 'Quan điểm', hintVi: 'Trả lời thẳng câu hỏi trong một câu.', starters: ["I'd say that…", 'Generally speaking, I think…', "I'm fairly convinced that…"] },
      { id: 'reason', label: 'Lý do', hintVi: 'Vì sao bạn nghĩ vậy.', starters: ['The main reason is…', 'This is largely because…', 'One explanation could be that…'] },
      { id: 'example', label: 'Ví dụ', hintVi: 'Số liệu, người quen, điều bạn thấy ở Việt Nam.', starters: ['Take … for example.', 'In Vietnam, for instance,…', 'A good example of this is…'] },
      { id: 'outcome', label: 'Hệ quả', hintVi: 'Điều gì sẽ xảy ra, hoặc khi nào thì khác.', starters: ['As a result,…', 'So in the long run,…', 'That said, it depends on…'] },
    ],
  },
  {
    id: 'prep',
    name: 'P.R.E.P',
    part: 'part_3',
    descriptionVi: 'Quan điểm, lý do, ví dụ, rồi khép lại bằng quan điểm. Hợp với câu hỏi "có nên…", "đồng ý không".',
    slots: [
      { id: 'point', label: 'Quan điểm', hintVi: 'Nói rõ bạn nghiêng về phía nào.', starters: ['In my view,…', 'I strongly believe…', 'On the whole, I agree that…'] },
      { id: 'reason', label: 'Lý do', hintVi: 'Lý do chính.', starters: ['Mainly because…', 'The key reason is…', 'What makes me think so is…'] },
      { id: 'example', label: 'Ví dụ', hintVi: 'Một ví dụ cụ thể.', starters: ['For example,…', 'I remember…', 'Look at…'] },
      { id: 'point2', label: 'Chốt lại', hintVi: 'Nhắc lại quan điểm bằng từ khác.', starters: ["So that's why I think…", 'All in all,…', 'Which is why…'] },
    ],
  },
];

export const framesFor = (part: SpeakingPartKey) => FRAMES.filter((f) => f.part === part);

/** The cue-card frame: one slot per bullet, then the feeling. */
export function cueFrame(bullets: string[]): AnswerFrame {
  const base = FRAMES.find((f) => f.id === 'cue')!;
  const slots: FrameSlot[] = bullets.map((b, i) => ({
    id: `b${i + 1}`,
    label: b.replace(/^and /, ''),
    hintVi: i === bullets.length - 1 ? 'Ý quan trọng nhất: giải thích, cảm xúc của bạn.' : 'Chi tiết cụ thể: tên, thời gian, nơi chốn.',
    starters: i === 0 ? ["I'd like to talk about…", "I'm going to describe…"] : i === bullets.length - 1 ? ['The reason … is…', 'What I really appreciate is…'] : ['As for…,', 'When it comes to…,', 'Well,…'],
  }));
  return { ...base, slots };
}

export const starterFor = (slot: FrameSlot, turn: number) => slot.starters[((turn % slot.starters.length) + slot.starters.length) % slot.starters.length];

// --- The questions -----------------------------------------------------------------

export interface BankQuestion {
  key: string;
  part: SpeakingPartKey;
  question: string;
  topicId: string;
  topicVi: string;
  bullets: string[];
  /** Default sample answer, when the topic has one for this question. */
  sample?: { text: string; label: string };
  /** What to talk about, in Vietnamese (Part 1 packs) or a one-minute note (Part 2). */
  ideasVi: string[];
  vocabulary: SpeakingVocab[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);

export function bankQuestions(): BankQuestion[] {
  const out: BankQuestion[] = [];
  for (const p of PART1_PACKS) {
    for (const q of p.questions) {
      out.push({
        key: `${p.id}:${slug(q)}`,
        part: 'part_1',
        question: q,
        topicId: p.id,
        topicVi: p.titleVi,
        bullets: [],
        sample: q === p.sample.question ? { text: p.sample.band7, label: 'Bài mẫu band 7' } : undefined,
        ideasVi: p.ideasVi,
        vocabulary: p.vocabulary,
      });
    }
    if (!p.questions.includes(p.sample.question)) {
      out.push({
        key: `${p.id}:${slug(p.sample.question)}`,
        part: 'part_1',
        question: p.sample.question,
        topicId: p.id,
        topicVi: p.titleVi,
        bullets: [],
        sample: { text: p.sample.band7, label: 'Bài mẫu band 7' },
        ideasVi: p.ideasVi,
        vocabulary: p.vocabulary,
      });
    }
  }
  for (const c of CUE_CARDS) {
    out.push({
      key: c.id,
      part: 'part_2',
      question: c.title,
      topicId: c.id,
      topicVi: 'Thẻ Part 2',
      bullets: c.bullets,
      sample: { text: c.sample, label: 'Bài mẫu' },
      ideasVi: c.notes,
      vocabulary: c.vocabulary,
    });
  }
  for (const t of PART3_THEMES) {
    const oreo = t.oreo;
    const questions = t.questions.includes(oreo.question) ? t.questions : [...t.questions, oreo.question];
    for (const q of questions) {
      out.push({
        key: `${t.id}:${slug(q)}`,
        part: 'part_3',
        question: q,
        topicId: t.id,
        topicVi: t.titleVi,
        bullets: [],
        sample: q === oreo.question ? { text: [oreo.opinion, oreo.reason, oreo.example, oreo.outcome].join(' '), label: 'Bài mẫu O.R.E.O' } : undefined,
        ideasVi: [],
        vocabulary: t.vocabulary,
      });
    }
  }
  return out;
}

/** A key for a question the learner typed in. */
export const customQuestionKey = (question: string) => `custom:${slug(question) || 'q'}`;

// --- Saved answers -----------------------------------------------------------------

export interface IdeaNote {
  slot: string;
  text: string;
}

export interface SavedAnswer {
  key: string;
  part: SpeakingPartKey;
  question: string;
  bullets: string[];
  frameId: string;
  ideas: IdeaNote[];
  notes: string;
  built: BuiltSpeakingAnswer | null;
  /** The answer as the learner keeps it (the AI's, edited, or their own). */
  answer: string;
  /** Earlier answers, newest first, at most 5. */
  versions: { at: string; answer: string }[];
  /** Step of PRACTICE_STAGES reached. */
  stage: number;
  practiceCount: number;
  dueAt: string | null;
  updatedAt: string;
}

export function newSavedAnswer(q: Pick<BankQuestion, 'key' | 'part' | 'question' | 'bullets'>, frameId: string, now: Date): SavedAnswer {
  return {
    key: q.key,
    part: q.part,
    question: q.question,
    bullets: q.bullets,
    frameId,
    ideas: [],
    notes: '',
    built: null,
    answer: '',
    versions: [],
    stage: 0,
    practiceCount: 0,
    dueAt: null,
    updatedAt: now.toISOString(),
  };
}

/** A new answer text, keeping the previous one as a version when it changed. */
export function withAnswer(saved: SavedAnswer, answer: string, now: Date): SavedAnswer {
  const clean = answer.trim();
  if (clean === saved.answer.trim()) return saved;
  const versions = saved.answer.trim() ? [{ at: saved.updatedAt, answer: saved.answer }, ...saved.versions].slice(0, 5) : saved.versions;
  return { ...saved, answer: clean, versions, updatedAt: now.toISOString() };
}

const PARTS: readonly SpeakingPartKey[] = ['part_1', 'part_2', 'part_3'];
const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : []);

/** A stored answer checked field by field; null when it is not usable. */
export function sanitizeSavedAnswer(raw: unknown): SavedAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.key !== 'string' || typeof r.question !== 'string' || !PARTS.includes(r.part as SpeakingPartKey)) return null;
  const built = r.built && typeof r.built === 'object' && typeof (r.built as BuiltSpeakingAnswer).answer === 'string' ? (r.built as BuiltSpeakingAnswer) : null;
  const time = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
  return {
    key: r.key,
    part: r.part as SpeakingPartKey,
    question: r.question,
    bullets: strings(r.bullets, 6),
    frameId: typeof r.frameId === 'string' ? r.frameId : '',
    ideas: Array.isArray(r.ideas)
      ? r.ideas.filter((i): i is IdeaNote => !!i && typeof i.slot === 'string' && typeof i.text === 'string').slice(0, 8)
      : [],
    notes: typeof r.notes === 'string' ? r.notes : '',
    built: built
      ? {
          answer: built.answer,
          answerVi: String(built.answerVi ?? ''),
          keywords: strings(built.keywords, 10),
          moves: Array.isArray(built.moves) ? built.moves.filter((m) => m && typeof m.text === 'string') : [],
          vocabulary: Array.isArray(built.vocabulary) ? built.vocabulary.filter((v) => v && typeof v.phrase === 'string') : [],
          followUps: strings(built.followUps, 4),
          tipVi: String(built.tipVi ?? ''),
        }
      : null,
    answer: typeof r.answer === 'string' ? r.answer : '',
    versions: Array.isArray(r.versions)
      ? r.versions.filter((v): v is { at: string; answer: string } => !!v && typeof v.answer === 'string' && typeof v.at === 'string').slice(0, 5)
      : [],
    stage: typeof r.stage === 'number' ? Math.max(0, Math.min(PRACTICE_STAGES.length - 1, Math.round(r.stage))) : 0,
    practiceCount: typeof r.practiceCount === 'number' ? Math.max(0, Math.round(r.practiceCount)) : 0,
    dueAt: time(r.dueAt),
    updatedAt: time(r.updatedAt) ?? new Date(0).toISOString(),
  };
}

// --- Practice ladder ------------------------------------------------------------------

export const PRACTICE_STAGES = [
  { id: 'read', label: 'Đọc to', hintVi: 'Đọc to cả câu trả lời, nhấn vào từ khoá. Bấm Nghe để nói theo (shadowing).' },
  { id: 'fade', label: 'Ẩn bớt chữ', hintVi: 'Một nửa từ đã được che. Nói cả câu, tự điền phần bị che.' },
  { id: 'keywords', label: 'Chỉ từ khoá', hintVi: 'Chỉ còn từ khoá theo thứ tự. Nói lại ý bằng lời của bạn, không cần đúng từng chữ.' },
  { id: 'question', label: 'Chỉ câu hỏi', hintVi: 'Nhìn câu hỏi và trả lời như trong phòng thi.' },
  { id: 'followup', label: 'Câu hỏi khác', hintVi: 'Câu hỏi tiếp theo giám khảo có thể hỏi. Dùng lại ý của bạn cho câu mới.' },
] as const;

const STOP = new Set(
  'a an the and or but so to of in on at for with by from as is are was were be been am i you he she it we they my your his her its our their me him us them this that these those do does did have has had not no very really just also there here than then if when which who what'.split(
    ' ',
  ),
);

const WORDS = /[A-Za-z][A-Za-z'’-]*/g;

/** Every other content word replaced by a blank of the same length; `seed` shifts which. */
export function fadeWords(text: string, seed = 0): string {
  let n = seed;
  return text.replace(WORDS, (w) => {
    if (STOP.has(w.toLowerCase()) || w.length < 3) return w;
    n += 1;
    return n % 2 === 0 ? w[0] + '_'.repeat(w.length - 1) : w;
  });
}

const tokens = (s: string) => (s.toLowerCase().match(/[a-z0-9']+/g) ?? []).map((w) => w.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, ''));

/** Which keywords the spoken answer covers: most of a keyword's content words were said. */
export function keywordCoverage(transcript: string, keywords: string[]) {
  const said = new Set(tokens(transcript));
  const hit: string[] = [];
  const missed: string[] = [];
  for (const k of keywords) {
    const words = tokens(k).filter((w) => !STOP.has(w));
    if (!words.length) continue;
    const found = words.filter((w) => said.has(w)).length;
    (found / words.length >= 0.5 ? hit : missed).push(k);
  }
  const total = hit.length + missed.length;
  return { hit, missed, ratio: total ? hit.length / total : 0 };
}

/** Share of the spoken answer's 5-word runs that are copied from the text. */
export function verbatimShare(transcript: string, text: string, n = 5): number {
  const t = tokens(transcript);
  const s = tokens(text);
  if (t.length < n || s.length < n) return 0;
  const runs = new Set<string>();
  for (let i = 0; i + n <= s.length; i++) runs.add(s.slice(i, i + n).join(' '));
  let copied = 0;
  for (let i = 0; i + n <= t.length; i++) if (runs.has(t.slice(i, i + n).join(' '))) copied += 1;
  return copied / (t.length - n + 1);
}

/** From the keyword stage on, saying the text word for word is a warning, not a win. */
export const MEMORISED_SHARE = 0.6;
export const soundsMemorised = (stage: number, share: number) => stage >= 2 && share >= MEMORISED_SHARE;

export type PracticeRating = 'again' | 'good' | 'easy';
export const REVIEW_INTERVALS = [1, 2, 4, 8, 16] as const;
const DAY = 86_400_000;

/**
 * After a practice try: "again" stays on the stage and comes back tomorrow;
 * "good" moves one stage on; "easy" moves two. The wait grows with the stage.
 */
export function afterPractice(saved: SavedAnswer, rating: PracticeRating, now: Date): SavedAnswer {
  const last = PRACTICE_STAGES.length - 1;
  const stage = rating === 'again' ? saved.stage : Math.min(last, saved.stage + (rating === 'easy' ? 2 : 1));
  const days = rating === 'again' ? 1 : REVIEW_INTERVALS[Math.min(REVIEW_INTERVALS.length - 1, stage)];
  return { ...saved, stage, practiceCount: saved.practiceCount + 1, dueAt: new Date(now.getTime() + days * DAY).toISOString(), updatedAt: now.toISOString() };
}

export const isDue = (saved: SavedAnswer, now: Date) => !!saved.answer.trim() && (!saved.dueAt || Date.parse(saved.dueAt) <= now.getTime());

/** Saved answers to practise first: due ones, oldest due first, then the rest by last change. */
export function practiceOrder(list: SavedAnswer[], now: Date): SavedAnswer[] {
  const due = list.filter((s) => isDue(s, now)).sort((a, b) => Date.parse(a.dueAt ?? a.updatedAt) - Date.parse(b.dueAt ?? b.updatedAt));
  const rest = list.filter((s) => !isDue(s, now)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return [...due, ...rest];
}

/**
 * Keywords for an answer the learner wrote without the AI: the longer content
 * words, in the order they come, at most `max`.
 */
export function fallbackKeywords(answer: string, max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of answer.match(WORDS) ?? []) {
    const k = w.toLowerCase();
    if (w.length < 5 || STOP.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/** The keywords to practise with: the AI's while the answer is the AI's or close to it, otherwise from the answer itself. */
export function keywordsFor(saved: Pick<SavedAnswer, 'answer' | 'built'>): string[] {
  const built = saved.built?.keywords ?? [];
  if (built.length && keywordCoverage(saved.answer, built).ratio >= 0.6) return built;
  return fallbackKeywords(saved.answer);
}

/** Ideas ready to send: at least one slot or the free notes filled. */
export const hasIdeas = (ideas: IdeaNote[], notes: string) => ideas.some((i) => i.text.trim()) || notes.trim().length > 0;
