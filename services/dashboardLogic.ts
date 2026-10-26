/**
 * Dashboard (pure): time estimates, the greeting, the streak week and the hero card lines.
 */

/** About 20 seconds a card: "Ôn 12 từ (~4 phút)". */
export function reviewMinutes(count: number): number {
  return Math.max(1, Math.round((count * 20) / 60));
}

/** Rough length of a lesson: cards, story, quiz and fill-blank, ~1.5 minutes a word. */
export function lessonMinutes(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(5, Math.round(wordCount * 1.5));
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

// --- Hero ------------------------------------------------------------------------------

/** "Chào buổi sáng" before noon, "buổi chiều" until 18:00, then "buổi tối". */
export function greeting(now: Date, name?: string): string {
  const h = now.getHours();
  const part = h < 5 ? 'Chào buổi tối' : h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const who = name?.trim();
  return who ? `${part}, ${who}` : part;
}

/** YYYY-MM-DD in UTC: goalService stores last_active_date as a UTC day, so the week must count the same way. */
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

export interface StreakDay {
  /** YYYY-MM-DD, UTC (as goalService counts days). */
  date: string;
  /** Two-letter weekday, Monday first: T2 … CN. */
  label: string;
  active: boolean;
  today: boolean;
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * The last 7 days, oldest first. A day is active when it falls in the current
 * streak: the `streak` days ending at `lastActive`. Days before the streak are
 * shown inactive (a broken streak means they were missed, or not counted).
 */
export function streakWeek(now: Date, streak: number, lastActive: string | null): StreakDay[] {
  const today = isoDay(now);
  const days: StreakDay[] = [];
  const last = lastActive ? new Date(`${lastActive.slice(0, 10)}T00:00:00.000Z`) : null;
  // A streak only counts if it ended today or yesterday.
  const live = !!last && !Number.isNaN(last.getTime()) && (today === isoDay(last) || isoDay(new Date(now.getTime() - DAY_MS)) === isoDay(last));
  const todayStart = Date.parse(`${today}T00:00:00.000Z`);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart - i * DAY_MS);
    const date = isoDay(d);
    let active = false;
    if (live && last && streak > 0) {
      const ago = Math.round((last.getTime() - d.getTime()) / 86_400_000);
      active = ago >= 0 && ago < streak;
    }
    days.push({ date, label: WEEKDAYS[d.getUTCDay()], active, today: date === today });
  }
  return days;
}

/** The small line under each hero card. Zero gets a nudge, not a bare "0". */
export function heroCardText(
  card: 'review' | 'test' | 'ielts' | 'streak',
  data: { dueCount: number | null; band: number | null; streak: number | null; longest: number | null },
): string {
  switch (card) {
    case 'review':
      if (data.dueCount === null) return 'Đang tải…';
      return data.dueCount > 0 ? `${data.dueCount} từ đến hạn` : 'Không có từ đến hạn';
    case 'test':
      return 'Kiểm tra nhanh từ đã học';
    case 'ielts':
      return data.band != null ? `Band ước tính ${data.band.toFixed(1)}` : 'Bắt đầu lộ trình';
    case 'streak':
      if (data.streak === null) return 'Đang tải…';
      if (data.streak === 0) return 'Học hôm nay để bắt đầu chuỗi';
      return `${data.streak} ngày${data.longest && data.longest > data.streak ? ` · kỷ lục ${data.longest}` : ''}`;
  }
}
