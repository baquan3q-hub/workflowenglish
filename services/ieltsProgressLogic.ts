/**
 * IELTS progress (pure): overall band with the official rounding, a band per
 * skill from recent attempts, criterion trends, weekly goals, days left to
 * the exam and the one thing to do next.
 */

import { AppPhase, type IeltsAttempt, type IeltsSkill } from '../types';
import { normalizeBand } from './ieltsAttemptService';
import { WRITING_ERRORS_LESSON_ID } from '../data/ielts/library';

/** Attempts averaged for a skill's current band. */
export const RECENT_ATTEMPTS = 3;

/**
 * Mean of the skill bands, rounded the IELTS way: below .25 rounds down,
 * .25 to below .75 becomes .5, .75 and above rounds up. Null when empty.
 */
export function overallBand(bands: ReadonlyArray<number>): number | null {
  const valid = bands.filter((b) => Number.isFinite(b));
  if (valid.length === 0) return null;
  const mean = valid.reduce((s, b) => s + b, 0) / valid.length;
  const whole = Math.floor(mean + 1e-9);
  const frac = mean - whole;
  if (frac < 0.25 - 1e-9) return whole;
  if (frac < 0.75 - 1e-9) return whole + 0.5;
  return whole + 1;
}

export interface SkillProgress {
  skill: IeltsSkill;
  attempts: number;
  /** Band of the newest graded attempt. */
  latest: number | null;
  /** Mean of the newest RECENT_ATTEMPTS bands, to the nearest 0.5. */
  current: number | null;
  lastAt: string | null;
}

/** Progress for one skill from its attempts, newest first. */
export function skillProgress(skill: IeltsSkill, attempts: ReadonlyArray<IeltsAttempt>): SkillProgress {
  const graded = attempts.filter((a) => a.skill === skill && typeof a.estimatedBand === 'number');
  const recent = graded.slice(0, RECENT_ATTEMPTS).map((a) => a.estimatedBand as number);
  return {
    skill,
    attempts: attempts.filter((a) => a.skill === skill).length,
    latest: graded[0]?.estimatedBand ?? null,
    current: recent.length ? normalizeBand(recent.reduce((s, b) => s + b, 0) / recent.length) ?? null : null,
    lastAt: attempts.find((a) => a.skill === skill)?.createdAt ?? null,
  };
}

/** Whole days from today to a YYYY-MM-DD exam date; negative once it has passed. */
export function daysUntil(examDate: string | null | undefined, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate ?? '');
  if (!m) return null;
  const exam = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exam.getTime() - today.getTime()) / 86_400_000);
}

/** Band still to gain to reach the target; 0 once reached, null if either is unknown. */
export function bandGap(current: number | null, target: number | null): number | null {
  if (current == null || target == null) return null;
  return Math.max(0, Math.round((target - current) * 2) / 2);
}

/**
 * Skills learners can practise now: these count towards the overall band,
 * weekly goals and the next action. Reading joins once its practice screen
 * ships (phase R3).
 */
export const PRACTISED_SKILLS: readonly IeltsSkill[] = ['listening', 'writing', 'speaking'];

/** Line under the overall band: how many skills it comes from, and whether Reading is still missing. */
export function overallNote(skillCount: number): string {
  if (skillCount === 0) return 'Làm một bài Listening, Writing hoặc Speaking để có band ước tính.';
  const from =
    skillCount === PRACTISED_SKILLS.length
      ? `từ ${skillCount} kỹ năng`
      : `từ ${skillCount}/${PRACTISED_SKILLS.length} kỹ năng đã luyện`;
  const missing = PRACTISED_SKILLS.includes('reading') ? '' : ' (chưa có Reading)';
  return `Ước tính ${from}${missing}, mỗi kỹ năng lấy ${RECENT_ATTEMPTS} bài gần nhất.`;
}

// ─── Criterion trends ───────────────────────────────────────────────

export type CriterionKey = 'task' | 'coherence' | 'fluency' | 'lexical' | 'grammar' | 'pronunciation';
export type GradedSkill = 'writing' | 'speaking';

interface CriterionDef {
  key: CriterionKey;
  nameVi: string;
  /** Lower-case fragments of the criterion name the grader returns. */
  match: string[];
}

/** Writing Task 1 (Achievement) and Task 2 (Response) count as one criterion. */
export const SKILL_CRITERIA: Record<GradedSkill, readonly CriterionDef[]> = {
  writing: [
    { key: 'task', nameVi: 'Đáp ứng đề bài', match: ['task'] },
    { key: 'coherence', nameVi: 'Mạch lạc, liên kết', match: ['coherence'] },
    { key: 'lexical', nameVi: 'Từ vựng', match: ['lexical'] },
    { key: 'grammar', nameVi: 'Ngữ pháp', match: ['grammatical', 'grammar'] },
  ],
  speaking: [
    { key: 'fluency', nameVi: 'Trôi chảy, mạch lạc', match: ['fluency'] },
    { key: 'lexical', nameVi: 'Từ vựng', match: ['lexical'] },
    { key: 'grammar', nameVi: 'Ngữ pháp', match: ['grammatical', 'grammar'] },
    { key: 'pronunciation', nameVi: 'Phát âm', match: ['pronunciation'] },
  ],
};

/** Change in the 3-attempt mean that counts as moving, not noise. */
export const CRITERION_TREND_STEP = 0.25;

export type BandTrend = 'up' | 'down' | 'flat';

export interface CriterionTrend {
  key: CriterionKey;
  nameVi: string;
  /** Mean of the newest RECENT_ATTEMPTS scores, to the nearest 0.5. */
  current: number;
  /** Mean of the RECENT_ATTEMPTS before those, to the nearest 0.5; null without them. */
  previous: number | null;
  /** Unrounded change between the two means. */
  delta: number | null;
  trend: BandTrend | null;
  samples: number;
}

/** Criterion scores of one attempt by key; reads the feedback list when the map is missing. */
export function criterionScoresOf(skill: GradedSkill, attempt: IeltsAttempt): Partial<Record<CriterionKey, number>> {
  const raw: [string, number][] = attempt.criterionScores
    ? Object.entries(attempt.criterionScores)
    : (attempt.aiFeedback?.criterionScores ?? []).map((c) => [c.name, c.score]);
  const out: Partial<Record<CriterionKey, number>> = {};
  for (const [name, score] of raw) {
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    const lower = name.toLowerCase();
    const def = SKILL_CRITERIA[skill].find((d) => d.match.some((m) => lower.includes(m)));
    if (def && out[def.key] === undefined) out[def.key] = score;
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Each criterion of a skill: newest three attempts against the three before (attempts newest first). */
export function criterionTrends(skill: GradedSkill, attempts: ReadonlyArray<IeltsAttempt>): CriterionTrend[] {
  const scored = attempts.filter((a) => a.skill === skill).map((a) => criterionScoresOf(skill, a));
  const out: CriterionTrend[] = [];
  for (const def of SKILL_CRITERIA[skill]) {
    const scores = scored.map((s) => s[def.key]).filter((x): x is number => x !== undefined);
    if (scores.length === 0) continue;
    const recent = mean(scores.slice(0, RECENT_ATTEMPTS));
    const older = scores.slice(RECENT_ATTEMPTS, RECENT_ATTEMPTS * 2);
    const previous = older.length ? mean(older) : null;
    const delta = previous == null ? null : Math.round((recent - previous) * 100) / 100;
    out.push({
      key: def.key,
      nameVi: def.nameVi,
      current: normalizeBand(recent) ?? recent,
      previous: previous == null ? null : normalizeBand(previous) ?? previous,
      delta,
      trend: delta == null ? null : delta >= CRITERION_TREND_STEP ? 'up' : delta <= -CRITERION_TREND_STEP ? 'down' : 'flat',
      samples: scores.length,
    });
  }
  return out;
}

/** Lowest current criterion; on a tie the one going down, then the skill's own order. */
export function weakestCriterion(trends: ReadonlyArray<CriterionTrend>): CriterionTrend | null {
  let best: CriterionTrend | null = null;
  for (const t of trends) {
    if (!best || t.current < best.current || (t.current === best.current && t.trend === 'down' && best.trend !== 'down')) best = t;
  }
  return best;
}

// ─── Weekly goals ───────────────────────────────────────────────────

/** Default weekly targets; Listening counts parts (a full test is four), Reading passages (a full test is three). */
export const WEEKLY_GOALS: Record<IeltsSkill, number> = { listening: 1, reading: 2, writing: 2, speaking: 3 };

/** What a weekly goal counts: Listening parts, Reading passages, otherwise whole attempts. */
export function goalUnit(skill: IeltsSkill): string {
  return skill === 'listening' ? 'part' : skill === 'reading' ? 'passage' : 'bài';
}

/** Monday 00:00 local time of the week containing `now`. */
export function weekStart(now: Date): Date {
  const sinceMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday);
}

/** How much one attempt counts towards its weekly goal: Listening counts its parts, Reading its passages. */
export function attemptUnits(attempt: IeltsAttempt): number {
  if (attempt.skill !== 'listening' && attempt.skill !== 'reading') return 1;
  return Math.max(1, Object.keys(attempt.criterionScores ?? {}).length);
}

export interface WeeklyGoal {
  skill: IeltsSkill;
  goal: number;
  done: number;
  remaining: number;
}

/** Progress on this week's goals (Monday to Sunday), from attempts in any order. */
export function weeklyProgress(attempts: ReadonlyArray<IeltsAttempt>, now: Date, goals = WEEKLY_GOALS): WeeklyGoal[] {
  const from = weekStart(now).getTime();
  const to = weekStart(new Date(from + 8 * 86_400_000)).getTime(); // next Monday, safe across DST
  return PRACTISED_SKILLS.map((skill) => {
    const done = attempts
      .filter((a) => {
        if (a.skill !== skill || !a.createdAt) return false;
        const t = new Date(a.createdAt).getTime();
        return t >= from && t < to;
      })
      .reduce((n, a) => n + attemptUnits(a), 0);
    return { skill, goal: goals[skill], done, remaining: Math.max(0, goals[skill] - done) };
  });
}

// ─── Next action ────────────────────────────────────────────────────

export type NextActionTarget =
  | { kind: 'phase'; phase: AppPhase }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'writingStudy'; tab: 'guides' | 'samples' | 'language' }
  | { kind: 'speakingStudy'; tab: 'part1' | 'part2' | 'part3' | 'pronunciation' | 'shadowing' };

export type NextActionRule = 'start' | 'untried' | 'exam_soon' | 'weak_criterion' | 'weekly' | 'mock';

export interface NextAction {
  rule: NextActionRule;
  title: string;
  reason: string;
  cta: string;
  target: NextActionTarget;
  skill: IeltsSkill;
}

export interface NextActionInput {
  progress: Record<IeltsSkill, SkillProgress>;
  /** Attempts newest first, all skills. */
  attempts: ReadonlyArray<IeltsAttempt>;
  weekly: ReadonlyArray<WeeklyGoal>;
  /** Most frequent labelled error, from the error log. */
  topError?: { label: string; total: number } | null;
  daysToExam?: number | null;
}

/** Days before the exam when timed mock tests come first. */
export const EXAM_SOON_DAYS = 14;
/** A criterion this far below its skill's band is a clear weakness worth a lesson. */
export const WEAK_CRITERION_GAP = 0.5;

export const SKILL_NAMES: Record<IeltsSkill, string> = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

const HUBS: Record<IeltsSkill, AppPhase> = {
  listening: AppPhase.IELTS_LISTENING_HUB,
  reading: AppPhase.IELTS_READING_HUB,
  writing: AppPhase.IELTS_WRITING_HUB,
  speaking: AppPhase.IELTS_SPEAKING_HUB,
};

const fmt = (b: number) => b.toFixed(1);

type ActionCopy = Pick<NextAction, 'title' | 'cta' | 'target'>;

/** Lesson for a skill's weak criterion. */
export function criterionAction(skill: GradedSkill, key: CriterionKey, topError?: NextActionInput['topError']): ActionCopy {
  if (key === 'grammar' && topError) {
    return { title: `Sửa lỗi ${topError.label.toLowerCase()} lặp lại`, cta: 'Mở sổ lỗi', target: { kind: 'phase', phase: AppPhase.IELTS_ERROR_LOG } };
  }
  if (skill === 'writing') {
    switch (key) {
      case 'task':
        return { title: 'Ôn cấu trúc từng dạng đề Writing', cta: 'Xem hướng dẫn', target: { kind: 'writingStudy', tab: 'guides' } };
      case 'coherence':
        return { title: 'Học từ nối và cách chia đoạn', cta: 'Mở ngân hàng ngôn ngữ', target: { kind: 'writingStudy', tab: 'language' } };
      case 'lexical':
        return { title: 'Học collocation theo chủ đề', cta: 'Mở ngân hàng ngôn ngữ', target: { kind: 'writingStudy', tab: 'language' } };
      default:
        return { title: 'Ôn các lỗi ngữ pháp hay gặp', cta: 'Đọc bài học', target: { kind: 'lesson', lessonId: WRITING_ERRORS_LESSON_ID } };
    }
  }
  switch (key) {
    case 'fluency':
      return { title: 'Luyện nói đủ 2 phút với cue card', cta: 'Mở Part 2', target: { kind: 'speakingStudy', tab: 'part2' } };
    case 'pronunciation':
      return { title: 'Luyện âm cuối và trọng âm', cta: 'Mở hướng dẫn phát âm', target: { kind: 'speakingStudy', tab: 'pronunciation' } };
    case 'lexical':
      return { title: 'Học từ vựng theo chủ đề Part 1', cta: 'Mở chủ đề', target: { kind: 'speakingStudy', tab: 'part1' } };
    default:
      return { title: 'Luyện câu phức khi mở rộng ý Part 3', cta: 'Mở Part 3', target: { kind: 'speakingStudy', tab: 'part3' } };
  }
}

/**
 * The one thing to do next; the first rule that applies wins:
 * 1. nothing done yet → Listening diagnostic;
 * 2. a skill never tried → try it (Listening, Writing, Speaking);
 * 3. exam within two weeks → timed mock of the weakest skill;
 * 4. a Writing/Speaking criterion clearly below its skill band, or the lowest one going down → its lesson;
 * 5. a weekly goal still open → practise that skill (largest share left first, then the weakest);
 * 6. otherwise → a full mock of the weakest skill.
 */
export function nextAction(input: NextActionInput): NextAction {
  const { progress, attempts, weekly, topError, daysToExam } = input;

  if (PRACTISED_SKILLS.every((s) => progress[s].attempts === 0)) {
    return {
      rule: 'start',
      title: 'Làm bài Listening chẩn đoán',
      reason: 'Một part Listening được chấm ngay trên máy, cho bạn band khởi điểm trong khoảng 10 phút.',
      cta: 'Bắt đầu',
      target: { kind: 'phase', phase: HUBS.listening },
      skill: 'listening',
    };
  }

  const untried = PRACTISED_SKILLS.find((s) => progress[s].attempts === 0);
  if (untried) {
    return {
      rule: 'untried',
      title: `Làm bài ${SKILL_NAMES[untried]} đầu tiên`,
      reason: `Chưa có band ${SKILL_NAMES[untried]}, nên band tổng mới chỉ ước tính từ các kỹ năng còn lại.`,
      cta: `Mở ${SKILL_NAMES[untried]}`,
      target: { kind: 'phase', phase: HUBS[untried] },
      skill: untried,
    };
  }

  const bandOf = (s: IeltsSkill) => progress[s].current ?? Infinity;
  const weakestSkill = [...PRACTISED_SKILLS].sort((a, b) => bandOf(a) - bandOf(b))[0];

  if (daysToExam != null && daysToExam >= 0 && daysToExam <= EXAM_SOON_DAYS) {
    return {
      rule: 'exam_soon',
      title: `Thi thử ${SKILL_NAMES[weakestSkill]} đúng giờ`,
      reason: `Còn ${daysToExam} ngày tới kỳ thi: làm đề trọn vẹn, bấm giờ như thi thật, ưu tiên kỹ năng thấp nhất.`,
      cta: 'Làm đề thi thử',
      target: { kind: 'phase', phase: HUBS[weakestSkill] },
      skill: weakestSkill,
    };
  }

  const graded = (['writing', 'speaking'] as const)
    .filter((s) => progress[s].current != null)
    .sort((a, b) => bandOf(a) - bandOf(b));
  for (const skill of graded) {
    const weak = weakestCriterion(criterionTrends(skill, attempts));
    if (!weak) continue;
    const band = progress[skill].current as number;
    const below = band - weak.current;
    if (below < WEAK_CRITERION_GAP && weak.trend !== 'down') continue;
    const why =
      below >= WEAK_CRITERION_GAP
        ? `${weak.nameVi} (${fmt(weak.current)}) đang thấp hơn band ${SKILL_NAMES[skill]} ${fmt(band)}.`
        : `${weak.nameVi} (${fmt(weak.current)}) đang đi xuống so với 3 bài trước.`;
    return {
      rule: 'weak_criterion',
      reason: `${why} Học phần này rồi làm một bài ${SKILL_NAMES[skill]} để áp dụng.`,
      skill,
      ...criterionAction(skill, weak.key, topError),
    };
  }

  const open = weekly.filter((w) => w.remaining > 0);
  if (open.length) {
    const share = (w: WeeklyGoal) => w.remaining / w.goal;
    const pick = [...open].sort((a, b) => share(b) - share(a) || bandOf(a.skill) - bandOf(b.skill))[0];
    const unit = goalUnit(pick.skill);
    return {
      rule: 'weekly',
      title: `Luyện ${SKILL_NAMES[pick.skill]}: còn ${pick.remaining} ${unit} tuần này`,
      reason: `Mục tiêu tuần là ${pick.goal} ${unit} ${SKILL_NAMES[pick.skill]}, bạn đã làm ${pick.done}. Luyện đều mỗi tuần hiệu quả hơn làm dồn.`,
      cta: 'Luyện ngay',
      target: { kind: 'phase', phase: HUBS[pick.skill] },
      skill: pick.skill,
    };
  }

  return {
    rule: 'mock',
    title: `Thi thử ${SKILL_NAMES[weakestSkill]} trọn bài`,
    reason: 'Bạn đã xong mục tiêu tuần. Một bài thi thử đầy đủ cho band sát thực tế nhất.',
    cta: 'Làm đề thi thử',
    target: { kind: 'phase', phase: HUBS[weakestSkill] },
    skill: weakestSkill,
  };
}
