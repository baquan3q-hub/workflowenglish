/**
 * Dashboard (pure): the one action the home screen leads with, and the
 * time estimates shown next to it.
 */

export interface DashboardState {
  /** Lesson open in this session, if any. */
  activeLesson: { topic: string } | null;
  /** Words due now; null while loading. */
  dueCount: number | null;
  /** Sentences answered "Cần sửa" and not written correctly since. */
  wrongSentences: number;
}

export type PrimaryAction =
  | { kind: 'continue'; title: string; detail: string }
  | { kind: 'review'; title: string; detail: string; count: number }
  | { kind: 'sentences'; title: string; detail: string; count: number }
  | { kind: 'new'; title: string; detail: string };

/** About 20 seconds a card: "Ôn 12 từ (~4 phút)". */
export function reviewMinutes(count: number): number {
  return Math.max(1, Math.round((count * 20) / 60));
}

/** Rough length of a lesson: cards, story, quiz and fill-blank, ~1.5 minutes a word. */
export function lessonMinutes(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(5, Math.round(wordCount * 1.5));
}

/** Continue a lesson → due review → wrong sentences → a new lesson. */
export function pickPrimaryAction(state: DashboardState): PrimaryAction {
  if (state.activeLesson) {
    return {
      kind: 'continue',
      title: `Tiếp tục bài ${state.activeLesson.topic}`,
      detail: 'Bạn đang học dở bài này.',
    };
  }
  const due = state.dueCount ?? 0;
  if (due > 0) {
    return {
      kind: 'review',
      title: `Ôn ${due} từ (~${reviewMinutes(due)} phút)`,
      detail: 'Các từ này đã đến hạn ôn.',
      count: due,
    };
  }
  if (state.wrongSentences > 0) {
    return {
      kind: 'sentences',
      title: `Luyện ${state.wrongSentences} câu sai`,
      detail: 'Viết lại các câu bạn làm sai lần trước.',
      count: state.wrongSentences,
    };
  }
  return {
    kind: 'new',
    title: 'Học bài mới',
    detail: state.dueCount === null ? 'Chọn chủ đề và nhập từ bên dưới.' : 'Không còn từ nào đến hạn. Chọn chủ đề và nhập từ bên dưới.',
  };
}

/** Words in the lesson input ("a, b\nc"), deduplicated case-insensitively. */
export function countInputWords(text: string): number {
  return new Set(
    text
      .split(/[,;\n]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
  ).size;
}
