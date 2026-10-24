/**
 * Pure logic behind the IELTS Mentor chat: which model tier a question gets,
 * the learner snapshot sent with it, quick quizzes, the progress bar and the
 * saved conversations. No browser or network APIs, so vitest covers it.
 */

// ─── Messages ───────────────────────────────────────────────────

export interface ChatAttachment {
  type: 'image' | 'audio';
  /** Base64. Empty once the message comes back from saved history. */
  data: string;
  mimeType: string;
  fileName?: string;
}

/** How hard the AI works on a message; mirrors CHAT_MODES in the ai-proxy op. */
export type ChatMode = 'quick' | 'standard' | 'deep';
/** What the learner picked in the composer. */
export type ModePref = 'auto' | ChatMode;

export interface ChatMeta {
  mode: ChatMode;
  /** Why auto picked this mode (shown on hover). */
  reason?: string;
  model?: string;
  /** Send → first character. */
  firstTokenMs?: number;
  /** Send → last character. */
  totalMs?: number;
  /** The learner snapshot went with the question. */
  usedData?: boolean;
  stopped?: boolean;
}

export interface QuizResult {
  answers: (number | null)[];
  score: number;
  total: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** What the AI sees. */
  content: string;
  /** What the bubble shows instead, for requests built by the app (quizzes, suggestions). */
  display?: string;
  timestamp: number;
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
  /** The reply failed; content holds the error line. Never sent back to the AI. */
  error?: boolean;
  meta?: ChatMeta;
  quizResult?: QuizResult;
  /** Tool the learner used (sentence_breakdown, vocab_extract, quiz_generate), shown on the bubble. */
  action?: string;
}

// ─── Model routing ──────────────────────────────────────────────

export interface ModeInfo {
  label: string;
  hint: string;
  /** Typical wait before the first character, for the progress bar. */
  expectedFirstMs: number;
  /** Typical answer length in characters, for the progress bar. */
  expectedChars: number;
}

export const MODE_INFO: Record<ChatMode, ModeInfo> = {
  quick: { label: 'Nhanh', hint: 'Mô hình nhẹ, trả lời ngắn trong vài giây', expectedFirstMs: 1500, expectedChars: 700 },
  standard: { label: 'Chuẩn', hint: 'Cân bằng tốc độ và độ chi tiết', expectedFirstMs: 2500, expectedChars: 1600 },
  deep: { label: 'Chuyên sâu', hint: 'Suy nghĩ trước khi trả lời: chấm bài, ảnh, lộ trình', expectedFirstMs: 5000, expectedChars: 2800 },
};

export const MODE_PREF_LABEL: Record<ModePref, string> = {
  auto: 'Tự động',
  quick: MODE_INFO.quick.label,
  standard: MODE_INFO.standard.label,
  deep: MODE_INFO.deep.label,
};

export interface RouteDecision {
  mode: ChatMode;
  reason: string;
}

/** Work that needs the model to think: reviewing, planning, analysing. */
const DEEP_WORDS = /(chấm|sửa bài|sửa giúp|nhận xét bài|đánh giá bài|essay|\bgrade\b|lộ trình|kế hoạch|roadmap|phân tích|so sánh)/i;
const QUIZ_WORDS = /(quiz|trắc nghiệm)/i;
const SHORT_CHARS = 140;
const LONG_CHARS = 700;
const LONG_WORDS = 120;

/** Picks the model tier for a question. A manual choice always wins. */
export function routeQuestion(text: string, attachmentCount: number, pref: ModePref = 'auto'): RouteDecision {
  if (pref !== 'auto') return { mode: pref, reason: 'Bạn đã chọn chế độ này' };
  const t = text.trim();
  if (attachmentCount > 0) return { mode: 'deep', reason: 'Có ảnh hoặc ghi âm cần phân tích' };
  const words = t ? t.split(/\s+/).length : 0;
  if (t.length > LONG_CHARS || words > LONG_WORDS) return { mode: 'deep', reason: 'Nội dung dài, cần đọc kỹ' };
  if (QUIZ_WORDS.test(t)) return { mode: 'standard', reason: 'Tạo quiz' };
  if (DEEP_WORDS.test(t)) return { mode: 'deep', reason: 'Câu hỏi cần phân tích' };
  if (t.length <= SHORT_CHARS && !t.includes('\n')) return { mode: 'quick', reason: 'Câu hỏi ngắn' };
  return { mode: 'standard', reason: 'Câu hỏi thông thường' };
}

/** "gemini-3.5-flash-lite" → "Gemini 3.5 Flash-Lite". */
export function modelLabel(model?: string | null): string {
  if (!model) return '';
  const words = model
    .replace(/^gemini-/, '')
    .replace(/flash-lite/, 'flash_lite')
    .split('-')
    .map((w) => (/^\d/.test(w) ? w : w.split('_').map((p) => p[0].toUpperCase() + p.slice(1)).join('-')));
  return `Gemini ${words.join(' ')}`;
}

/** "850 ms" / "2.4 s". */
export function formatMs(ms?: number): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

// ─── Progress bar ───────────────────────────────────────────────

export type ChatPhase = 'context' | 'sending' | 'thinking' | 'writing';

export const PHASE_LABEL: Record<ChatPhase, string> = {
  context: 'Đang đọc dữ liệu học của bạn',
  sending: 'Đang gửi câu hỏi',
  thinking: 'AI đang phân tích',
  writing: 'Đang viết câu trả lời',
};

/**
 * 0–100 for the progress bar. Real progress is unknown, so waiting and
 * writing ease towards a ceiling instead of stopping at a fake 100.
 */
export function progressPercent(
  phase: ChatPhase,
  mode: ChatMode,
  elapsedMs: number,
  chars: number,
  quiz?: { done: number; total: number },
): number {
  const info = MODE_INFO[mode];
  switch (phase) {
    case 'context':
      return 6;
    case 'sending':
      return 12;
    case 'thinking':
      return Math.round(15 + 30 * (1 - Math.exp(-Math.max(0, elapsedMs) / info.expectedFirstMs)));
    case 'writing':
      if (quiz && quiz.total > 0) return Math.round(50 + 45 * Math.min(1, quiz.done / quiz.total));
      return Math.round(50 + 45 * (1 - Math.exp(-Math.max(0, chars) / info.expectedChars)));
  }
}

// ─── Learner snapshot ───────────────────────────────────────────

export interface LearnerData {
  name?: string;
  level?: string;
  streak?: number;
  longestStreak?: number;
  dailyGoal?: number;
  reviewedToday?: number;
  dueCount?: number;
  words?: { total: number; mastered: number; learning: number; lapsed: number };
  /** Most missed first. */
  weakWords: { word: string; meaning?: string; misses: number }[];
  dueWords: string[];
  skills: { skill: string; attempts: number; current: number | null }[];
  weakest?: { skill: string; nameVi: string; current: number };
  topErrors: { label: string; total: number }[];
}

export const EMPTY_LEARNER: LearnerData = { weakWords: [], dueWords: [], skills: [], topErrors: [] };

const SKILL_VI: Record<string, string> = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

/** True when there is anything worth sending. */
export function hasLearnerData(d: LearnerData | null | undefined): d is LearnerData {
  if (!d) return false;
  return Boolean(
    d.weakWords.length || d.dueWords.length || d.skills.some((s) => s.attempts > 0) || d.topErrors.length || (d.words?.total ?? 0) > 0 || d.streak,
  );
}

/** The snapshot as a compact text block for the prompt (kept well under the 4000-char limit). */
export function formatLearnerContext(d: LearnerData): string {
  const lines: string[] = [];
  const head = [d.name && `Tên: ${d.name}`, d.level && `Trình độ từ vựng: ${d.level}`, d.streak != null && `Chuỗi ngày học: ${d.streak}${d.longestStreak ? ` (dài nhất ${d.longestStreak})` : ''}`].filter(Boolean);
  if (head.length) lines.push(head.join(' | '));
  const today = [
    d.dailyGoal ? `Mục tiêu hôm nay: ${d.reviewedToday ?? 0}/${d.dailyGoal} từ` : '',
    d.dueCount != null ? `Từ đến hạn ôn: ${d.dueCount}` : '',
  ].filter(Boolean);
  if (today.length) lines.push(today.join(' | '));
  if (d.words && d.words.total > 0) {
    lines.push(`Kho từ: ${d.words.total} từ (${d.words.mastered} đã thuộc, ${d.words.learning} đang học, ${d.words.lapsed} hay quên)`);
  }
  if (d.weakWords.length) {
    lines.push(`Từ hay sai: ${d.weakWords.slice(0, 8).map((w) => `${w.word}${w.meaning ? ` (${w.meaning})` : ''} – sai ${w.misses} lần`).join('; ')}`);
  }
  if (d.dueWords.length) lines.push(`Từ đến hạn: ${d.dueWords.slice(0, 10).join(', ')}`);
  const practised = d.skills.filter((s) => s.attempts > 0);
  if (practised.length) {
    lines.push(
      `IELTS (band gần đây): ${d.skills
        .map((s) => `${SKILL_VI[s.skill] ?? s.skill} ${s.attempts === 0 ? 'chưa luyện' : `${s.current ?? '?'} (${s.attempts} bài)`}`)
        .join(', ')}`,
    );
  } else {
    lines.push('IELTS: chưa làm bài luyện nào trong ứng dụng.');
  }
  if (d.weakest) lines.push(`Tiêu chí yếu nhất: ${SKILL_VI[d.weakest.skill] ?? d.weakest.skill} – ${d.weakest.nameVi} ${d.weakest.current}`);
  if (d.topErrors.length) lines.push(`Lỗi lặp lại nhiều: ${d.topErrors.slice(0, 4).map((e) => `${e.label} (${e.total})`).join(', ')}`);
  return lines.join('\n').slice(0, 3800);
}

/** Short facts for the snapshot card. */
export function learnerFacts(d: LearnerData): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (d.streak != null) facts.push({ label: 'Chuỗi ngày', value: `${d.streak} 🔥` });
  if (d.dueCount != null) facts.push({ label: 'Đến hạn ôn', value: `${d.dueCount} từ` });
  const banded = d.skills.filter((s) => s.current != null);
  if (banded.length) {
    const best = banded.reduce((a, b) => ((b.current ?? 0) > (a.current ?? 0) ? b : a));
    facts.push({ label: `Band ${SKILL_VI[best.skill] ?? best.skill}`, value: String(best.current) });
  } else if (d.words && d.words.total > 0) {
    facts.push({ label: 'Đã thuộc', value: `${d.words.mastered}/${d.words.total}` });
  }
  if (d.weakest) facts.push({ label: 'Cần cải thiện', value: d.weakest.nameVi });
  return facts.slice(0, 4);
}

export type SuggestionIcon = 'quiz' | 'review' | 'target' | 'error' | 'plan' | 'start';

export interface ChatSuggestion {
  id: string;
  icon: SuggestionIcon;
  title: string;
  desc: string;
  /** Sent to the AI; `display` is what the bubble shows. */
  prompt?: string;
  display?: string;
  /** Opens a quiz of this source instead of sending a prompt. */
  quiz?: QuizSource;
}

/** Up to three next steps built from the learner's data, no AI call needed. */
export function suggestionsFor(d: LearnerData | null): ChatSuggestion[] {
  const out: ChatSuggestion[] = [];
  if (d && d.weakWords.length >= 2) {
    out.push({
      id: 'quiz-weak',
      icon: 'quiz',
      title: 'Quiz 5 câu từ bạn hay sai',
      desc: d.weakWords.slice(0, 3).map((w) => w.word).join(', '),
      quiz: 'weak',
    });
  }
  if (d && d.dueWords.length > 0) {
    const words = d.dueWords.slice(0, 8);
    out.push({
      id: 'due',
      icon: 'review',
      title: `Ôn nhanh ${d.dueCount ?? words.length} từ đến hạn`,
      desc: words.slice(0, 4).join(', '),
      display: `Giúp mình ôn nhanh các từ đến hạn`,
      prompt: `Mình có các từ đến hạn ôn: ${words.join(', ')}. Với mỗi từ: nghĩa tiếng Việt, 1 câu ví dụ IELTS và 1 mẹo nhớ ngắn. Trình bày dạng bảng gọn.`,
    });
  }
  if (d?.weakest) {
    const skill = SKILL_VI[d.weakest.skill] ?? d.weakest.skill;
    out.push({
      id: 'weakest',
      icon: 'target',
      title: `Cải thiện ${d.weakest.nameVi}`,
      desc: `${skill} · đang ở band ${d.weakest.current}`,
      display: `Làm sao cải thiện ${d.weakest.nameVi} trong ${skill}?`,
      prompt: `Tiêu chí ${d.weakest.nameVi} trong ${skill} của mình đang khoảng band ${d.weakest.current}. Phân tích vì sao người ở mức này hay mất điểm, cho 3 cách cải thiện cụ thể và 1 bài tập ngắn làm ngay.`,
    });
  }
  if (d && d.topErrors.length && out.length < 3) {
    const e = d.topErrors[0];
    out.push({
      id: 'error',
      icon: 'error',
      title: `Sửa lỗi ${e.label.toLowerCase()}`,
      desc: `Lặp lại ${e.total} lần trong bài của bạn`,
      display: `Giúp mình hết mắc lỗi ${e.label.toLowerCase()}`,
      prompt: `Lỗi "${e.label}" xuất hiện ${e.total} lần trong các bài Writing/Speaking của mình. Giải thích quy tắc ngắn gọn, các bẫy hay gặp, rồi cho 5 câu để mình tự sửa (đáp án để cuối).`,
    });
  }
  if (!d || !d.skills.some((s) => s.attempts > 0)) {
    out.push({
      id: 'start',
      icon: 'start',
      title: 'Đoán trình độ & gợi ý lộ trình',
      desc: 'Trả lời 3 câu hỏi ngắn',
      display: 'Giúp mình đoán trình độ IELTS và gợi ý lộ trình',
      prompt: 'Mình mới bắt đầu luyện IELTS. Hãy hỏi mình lần lượt 3 câu ngắn (mỗi lần một câu) để đoán trình độ, sau đó gợi ý lộ trình 4 tuần.',
    });
  } else if (out.length < 3) {
    out.push({
      id: 'plan',
      icon: 'plan',
      title: 'Kế hoạch học tuần này',
      desc: 'Dựa trên band và lỗi của bạn',
      display: 'Lên kế hoạch học tuần này cho mình',
      prompt: 'Dựa trên dữ liệu học của mình, lên kế hoạch 7 ngày (mỗi ngày 30–45 phút) tập trung vào điểm yếu nhất. Trình bày dạng bảng.',
    });
  }
  return out.slice(0, 3);
}

// ─── Quick quizzes ──────────────────────────────────────────────

export type QuizSource = 'weak' | 'due' | 'topic' | 'conversation';

export const QUIZ_SOURCE_LABEL: Record<QuizSource, string> = {
  weak: 'Từ tôi hay sai',
  due: 'Từ đến hạn ôn',
  topic: 'Chủ đề IELTS',
  conversation: 'Nội dung cuộc trò chuyện',
};

/** Which sources make sense for this learner and chat. */
export function quizSources(d: LearnerData | null, hasConversation: boolean): QuizSource[] {
  const out: QuizSource[] = [];
  if (d && d.weakWords.length >= 2) out.push('weak');
  if (d && d.dueWords.length >= 2) out.push('due');
  out.push('topic');
  if (hasConversation) out.push('conversation');
  return out;
}

export const QUIZ_FORMAT = `Chỉ trả lời DUY NHẤT một khối mã \`\`\`quiz chứa JSON hợp lệ, không viết gì ngoài khối, dạng:
{"title":"...","questions":[{"q":"câu hỏi","options":["A","B","C","D"],"answer":0,"explain":"giải thích ngắn","hint":"gợi ý tư duy, không lộ đáp án"}]}
Mỗi câu 4 lựa chọn, đúng 1 đáp án ("answer" là vị trí 0–3, rải đều vị trí), câu hỏi tiếng Anh, "explain" tiếng Việt tối đa 25 từ.`;

/** The quiz request: a short line for the bubble and the full instruction for the AI. */
export function quizRequest(source: QuizSource, count: number, d: LearnerData | null, topic = ''): { display: string; prompt: string } {
  const n = Math.max(3, Math.min(10, Math.round(count)));
  let what: string;
  let display: string;
  switch (source) {
    case 'weak': {
      const words = (d?.weakWords ?? []).slice(0, Math.max(n, 6)).map((w) => w.word);
      what = `kiểm tra các từ tôi hay sai: ${words.join(', ')}. Hỏi nghĩa, cách dùng, collocation và điền từ vào câu`;
      display = `Tạo quiz ${n} câu từ các từ tôi hay sai`;
      break;
    }
    case 'due': {
      const words = (d?.dueWords ?? []).slice(0, Math.max(n, 6));
      what = `ôn các từ đến hạn của tôi: ${words.join(', ')}. Hỏi nghĩa và cách dùng trong câu`;
      display = `Tạo quiz ${n} câu ôn từ đến hạn`;
      break;
    }
    case 'conversation':
      what = 'kiểm tra những kiến thức chính vừa trao đổi trong cuộc trò chuyện này';
      display = `Tạo quiz ${n} câu từ cuộc trò chuyện này`;
      break;
    default: {
      const t = topic.trim() || 'từ vựng học thuật và collocation hay gặp trong IELTS Writing Task 2';
      what = `về chủ đề: ${t}${d?.level ? `, phù hợp trình độ ${d.level}` : ''}`;
      display = `Tạo quiz ${n} câu: ${topic.trim() || 'từ vựng IELTS Writing Task 2'}`;
    }
  }
  return { display, prompt: `Tạo một quiz trắc nghiệm ${n} câu ${what}.\n${QUIZ_FORMAT}` };
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  /** A nudge shown before answering (scaffolding), optional. */
  hint?: string;
  /** A sentence the question is about, optional. */
  context?: string;
}

export interface ChatQuiz {
  title: string;
  questions: QuizQuestion[];
}

export interface ParsedQuiz {
  /** Text before the quiz block. */
  before: string;
  /** Text after it. */
  after: string;
  quiz: ChatQuiz | null;
  /** The block has started but not finished (still streaming). */
  pending: boolean;
  /** Questions written so far, for the progress bar. */
  written: number;
}

// Not ```json:scaffold_* — those are sentence/vocab cards, see pendingBlock.
const QUIZ_OPEN = /```(?:quiz|json)(?![:\w])\s*\n?/i;

function validQuestion(v: unknown): QuizQuestion | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const q = typeof o.q === 'string' ? o.q : typeof o.question === 'string' ? o.question : '';
  const options = Array.isArray(o.options) ? o.options.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  let answer = typeof o.answer === 'number' ? o.answer : Number.NaN;
  if (typeof o.answer === 'string') answer = options.indexOf(o.answer);
  if (!q.trim() || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  const text = (k: string) => (typeof o[k] === 'string' && (o[k] as string).trim() ? (o[k] as string).trim() : undefined);
  return {
    q: q.trim(),
    options: options.slice(0, 6),
    answer,
    explain: text('explain') ?? text('explanation') ?? '',
    hint: text('hint') ?? text('scaffoldHint'),
    context: text('context') ?? text('contextSentence'),
  };
}

/** Older quiz blocks (```json:scaffold_quiz, options with isCorrect) as a quiz. */
export function scaffoldQuizToQuiz(items: unknown): ChatQuiz | null {
  if (!Array.isArray(items)) return null;
  const questions = items
    .map((it) => {
      if (!it || typeof it !== 'object') return null;
      const o = it as Record<string, unknown>;
      const opts = Array.isArray(o.options) ? (o.options as Record<string, unknown>[]) : [];
      return validQuestion({
        q: o.question,
        options: opts.map((x) => x?.text),
        answer: opts.findIndex((x) => x?.isCorrect === true),
        explain: o.explanation,
        hint: o.scaffoldHint,
        context: o.contextSentence,
      });
    })
    .filter((x): x is QuizQuestion => x !== null);
  return questions.length ? { title: 'Câu hỏi ôn tập', questions } : null;
}

export type StructuredKind = 'sentences' | 'vocab' | 'quiz';

/** A structured block (```json:scaffold_* or ```quiz) that has opened but not closed yet, with items written so far. */
export function pendingBlock(content: string): { kind: StructuredKind; written: number } | null {
  const open = /```(?:json:)?(scaffold_sentences|scaffold_vocab|scaffold_quiz|quiz)\b/g;
  let m: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((m = open.exec(content))) last = m;
  if (!last) return null;
  const body = content.slice(last.index + last[0].length);
  if (body.includes('```')) return null;
  const kind: StructuredKind = last[1] === 'scaffold_sentences' ? 'sentences' : last[1] === 'scaffold_vocab' ? 'vocab' : 'quiz';
  const key = kind === 'sentences' ? /"original"\s*:/g : kind === 'vocab' ? /"word"\s*:/g : /"q(?:uestion)?"\s*:/g;
  return { kind, written: (body.match(key) ?? []).length };
}

/** Turns parsed JSON into a quiz, dropping broken questions. Null when none survive. */
export function toQuiz(v: unknown): ChatQuiz | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const raw = Array.isArray(o.questions) ? o.questions : Array.isArray(v) ? (v as unknown[]) : [];
  const questions = raw.map(validQuestion).filter((x): x is QuizQuestion => x !== null).slice(0, 15);
  if (!questions.length) return null;
  return { title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Quiz nhanh', questions };
}

/** Finds a ```quiz block in a reply, finished or still streaming. */
export function parseQuiz(content: string): ParsedQuiz | null {
  const open = QUIZ_OPEN.exec(content);
  if (!open) return null;
  const start = open.index + open[0].length;
  const isQuizFence = /quiz/i.test(open[0]);
  const close = content.indexOf('```', start);
  const body = close === -1 ? content.slice(start) : content.slice(start, close);
  // A plain json block only counts when it looks like a quiz.
  if (!isQuizFence && !/"questions"\s*:/.test(body)) return null;
  const before = content.slice(0, open.index).trim();
  const written = (body.match(/"q(?:uestion)?"\s*:/g) ?? []).length;
  if (close === -1) return { before, after: '', quiz: null, pending: true, written };
  let quiz: ChatQuiz | null = null;
  try {
    quiz = toQuiz(JSON.parse(body));
  } catch {
    quiz = null;
  }
  return { before, after: content.slice(close + 3).trim(), quiz, pending: false, written };
}

/** How many questions the quiz request asked for ("quiz 5 câu"). */
export function requestedQuizSize(prompt: string): number | null {
  const m = /quiz[^\d]{0,20}(\d{1,2})\s*câu/i.exec(prompt) ?? /(\d{1,2})\s*câu/i.exec(prompt);
  return m ? Number(m[1]) : null;
}

// ─── What goes to the AI ────────────────────────────────────────

export interface WireMessage {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { mimeType: string; data: string }[];
}

/**
 * Earlier turns for the proxy. Failed replies are left out, and files from
 * earlier turns become a short note: resending every image each turn made
 * requests slow and heavy.
 */
export function historyForAi(messages: ReadonlyArray<ChatMessage>, max = 20): WireMessage[] {
  const out: WireMessage[] = [];
  for (const m of messages) {
    if (m.error || m.isStreaming) continue;
    let text = m.content;
    const files = m.attachments?.length ?? 0;
    if (files) {
      const kinds = m.attachments!.map((a) => (a.type === 'image' ? 'ảnh' : 'ghi âm'));
      text = `${text}${text ? '\n' : ''}[Đã gửi kèm ${files} tệp: ${[...new Set(kinds)].join(', ')}]`;
    }
    if (!text.trim()) continue;
    out.push({ role: m.role, text: text.slice(0, 12_000) });
  }
  return out.slice(-max);
}

// ─── Saved conversations ────────────────────────────────────────

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export const MAX_CONVERSATIONS = 40;
export const MAX_SAVED_MESSAGES = 120;

/** First thing the learner asked, trimmed to a title. */
export function titleFrom(messages: ReadonlyArray<ChatMessage>): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'Cuộc trò chuyện mới';
  const raw = (first.display ?? first.content).replace(/\s+/g, ' ').trim();
  if (!raw) return first.attachments?.some((a) => a.type === 'image') ? 'Phân tích ảnh' : 'Ghi âm Speaking';
  return raw.length > 60 ? `${raw.slice(0, 57).trimEnd()}…` : raw;
}

/** What is kept on disk: no file data (too big for storage), no half-written replies. */
export function messagesForStorage(messages: ReadonlyArray<ChatMessage>): ChatMessage[] {
  return messages
    .filter((m) => !(m.role === 'assistant' && m.isStreaming && !m.content))
    .slice(-MAX_SAVED_MESSAGES)
    .map((m) => ({
      ...m,
      isStreaming: undefined,
      attachments: m.attachments?.map((a) => ({ type: a.type, mimeType: a.mimeType, fileName: a.fileName, data: '' })),
    }));
}

/** Adds or replaces a conversation; newest first, capped. */
export function upsertConversation(
  list: ReadonlyArray<StoredConversation>,
  conv: StoredConversation,
  max = MAX_CONVERSATIONS,
): StoredConversation[] {
  const rest = list.filter((c) => c.id !== conv.id);
  return [conv, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, max);
}

export interface ConversationGroup {
  label: string;
  items: StoredConversation[];
}

/** Today / Yesterday / Last 7 days / Older, by last update. */
export function groupConversations(list: ReadonlyArray<StoredConversation>, now: Date): ConversationGroup[] {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86_400_000;
  const buckets: ConversationGroup[] = [
    { label: 'Hôm nay', items: [] },
    { label: 'Hôm qua', items: [] },
    { label: '7 ngày qua', items: [] },
    { label: 'Cũ hơn', items: [] },
  ];
  for (const c of [...list].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const i = c.updatedAt >= startOfDay ? 0 : c.updatedAt >= startOfDay - DAY ? 1 : c.updatedAt >= startOfDay - 7 * DAY ? 2 : 3;
    buckets[i].items.push(c);
  }
  return buckets.filter((b) => b.items.length > 0);
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Matches the title or any message, ignoring Vietnamese accents. */
export function searchConversations(list: ReadonlyArray<StoredConversation>, query: string): StoredConversation[] {
  const q = fold(query.trim());
  if (!q) return [...list];
  return list.filter((c) => fold(c.title).includes(q) || c.messages.some((m) => fold(m.display ?? m.content).includes(q)));
}

/** One-line preview of the last reply. */
export function conversationPreview(c: StoredConversation): string {
  const last = [...c.messages].reverse().find((m) => m.role === 'assistant' && !m.error && m.content);
  if (!last) return '';
  const quiz = parseQuiz(last.content);
  if (quiz?.quiz) return `🧩 ${quiz.quiz.title} · ${quiz.quiz.questions.length} câu`;
  const count = (key: RegExp) => (last.content.match(key) ?? []).length;
  if (/```json:scaffold_sentences/.test(last.content)) return `🔍 Mổ xẻ ${count(/"original"\s*:/g)} câu`;
  if (/```json:scaffold_vocab/.test(last.content)) return `⭐ ${count(/"word"\s*:/g)} từ vựng`;
  if (/```json:scaffold_quiz/.test(last.content)) return `🧩 ${count(/"question"\s*:/g)} câu hỏi ôn tập`;
  return last.content.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/[#*`>|_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
}
