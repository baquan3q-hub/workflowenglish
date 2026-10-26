/**
 * Hồ sơ học tập (pure): what the learner tells the app about themself, checked
 * on every read, and the short English summary the AI ops receive.
 * services/learningProfileService.ts reads and writes `learning_profiles`.
 */

export const PROFILE_GOALS = ['ielts', 'work', 'travel', 'communication', 'academic'] as const;
export const PROFILE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const PROFILE_INTERESTS = [
  'technology',
  'business',
  'travel',
  'food',
  'health',
  'sports',
  'music',
  'film',
  'science',
  'environment',
  'education',
  'games',
] as const;
export const PROFILE_WEAK_AREAS = ['pronunciation', 'grammar', 'vocabulary', 'listening', 'writing', 'speaking'] as const;
export const PROFILE_MINUTES = [10, 15, 20, 30, 45, 60] as const;

export type ProfileGoal = (typeof PROFILE_GOALS)[number];
export type ProfileLevel = (typeof PROFILE_LEVELS)[number];
export type ProfileInterest = (typeof PROFILE_INTERESTS)[number];
export type ProfileWeakArea = (typeof PROFILE_WEAK_AREAS)[number];

export const NOTE_MAX = 300;
export const NAME_MAX = 40;
export const OCCUPATION_MAX = 60;
/** The most the AI ops accept; summaryLength keeps under it. */
export const SUMMARY_MAX = 600;

export interface LearningProfile {
  nickname: string;
  goal: ProfileGoal | null;
  level: ProfileLevel | null;
  occupation: string;
  interests: ProfileInterest[];
  weakAreas: ProfileWeakArea[];
  minutesPerDay: number | null;
  note: string;
}

export const EMPTY_PROFILE: Readonly<LearningProfile> = Object.freeze({
  nickname: '',
  goal: null,
  level: null,
  occupation: '',
  interests: [],
  weakAreas: [],
  minutesPerDay: null,
  note: '',
});

export const GOAL_LABELS: Record<ProfileGoal, string> = {
  ielts: 'Thi IELTS',
  work: 'Công việc',
  travel: 'Du lịch',
  communication: 'Giao tiếp hằng ngày',
  academic: 'Học thuật, du học',
};

export const INTEREST_LABELS: Record<ProfileInterest, string> = {
  technology: 'Công nghệ',
  business: 'Kinh doanh',
  travel: 'Du lịch',
  food: 'Ẩm thực',
  health: 'Sức khoẻ',
  sports: 'Thể thao',
  music: 'Âm nhạc',
  film: 'Phim ảnh',
  science: 'Khoa học',
  environment: 'Môi trường',
  education: 'Giáo dục',
  games: 'Trò chơi',
};

export const WEAK_AREA_LABELS: Record<ProfileWeakArea, string> = {
  pronunciation: 'Phát âm',
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  listening: 'Nghe',
  writing: 'Viết',
  speaking: 'Nói',
};

const oneOf = <T extends string | number>(list: readonly T[], v: unknown): T | null => ((list as readonly unknown[]).includes(v) ? (v as T) : null);
const someOf = <T extends string>(list: readonly T[], v: unknown): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => (list as readonly unknown[]).includes(x)))] : [];
/** One line, no control characters, at most `max` characters. */
const line = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Keep only known keys with valid values; everything else falls back to empty. */
export function sanitizeProfile(raw: unknown): LearningProfile {
  const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  return {
    nickname: line(src.nickname, NAME_MAX),
    goal: oneOf(PROFILE_GOALS, src.goal),
    level: oneOf(PROFILE_LEVELS, src.level),
    occupation: line(src.occupation, OCCUPATION_MAX),
    interests: someOf(PROFILE_INTERESTS, src.interests),
    weakAreas: someOf(PROFILE_WEAK_AREAS, src.weakAreas),
    minutesPerDay: oneOf(PROFILE_MINUTES, src.minutesPerDay),
    note: line(src.note, NOTE_MAX),
  };
}

/** Share of the profile filled in, 0–100, for the "Hồ sơ đã hoàn thiện" bar. */
export function profileCompletion(p: LearningProfile): number {
  const parts = [!!p.nickname, !!p.goal, !!p.level, !!p.occupation, p.interests.length > 0, p.weakAreas.length > 0, p.minutesPerDay != null, !!p.note];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}

export const isProfileEmpty = (p: LearningProfile) => profileCompletion(p) === 0;

const GOAL_EN: Record<ProfileGoal, string> = {
  ielts: 'pass the IELTS Academic exam',
  work: 'use English at work',
  travel: 'travel abroad',
  communication: 'communicate in everyday life',
  academic: 'study in English',
};

/**
 * A short English description of the learner for the AI ops, or '' when the
 * profile is empty. The ops treat it as data, never as instructions.
 */
export function profileSummary(p: LearningProfile): string {
  const parts: string[] = [];
  if (p.nickname) parts.push(`Name: ${p.nickname}.`);
  if (p.goal) parts.push(`Goal: ${GOAL_EN[p.goal]}.`);
  if (p.level) parts.push(`Self-assessed level: ${p.level}.`);
  if (p.occupation) parts.push(`Job or field: ${p.occupation}.`);
  if (p.interests.length) parts.push(`Interests: ${p.interests.join(', ')}.`);
  if (p.weakAreas.length) parts.push(`Wants to improve: ${p.weakAreas.join(', ')}.`);
  if (p.minutesPerDay != null) parts.push(`Studies about ${p.minutesPerDay} minutes a day.`);
  if (p.note) parts.push(`Note from the learner: ${p.note}`);
  return parts.join(' ').slice(0, SUMMARY_MAX);
}
