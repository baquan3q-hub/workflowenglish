import { AppPhase, type IeltsAttempt, type UserGoals } from '../types';
import { RETENTION_TARGET, type DayCount, type RetentionResult } from './analyticsLogic';
import {
  bandGap, criterionAction, criterionTrends, daysUntil, EXAM_SOON_DAYS, goalUnit,
  overallBand, PRACTISED_SKILLS, RECENT_ATTEMPTS, SKILL_NAMES, skillProgress,
  weakestCriterion, weeklyProgress, type NextActionTarget,
} from './ieltsProgressLogic';
import type { UserPreferences } from './preferencesService';
import { estimateMinutes } from './reviewSessionLogic';

export interface ReportFinding<T> {
  id: string;
  tone: 'warning' | 'focus' | 'positive';
  title: string;
  evidence: string;
  advice: string;
  label: string;
  target: T;
}

export type StudyTarget = 'review' | 'lesson' | 'vocab' | 'skills';

/** The persisted daily counter rolls over at midnight UTC. */
export function dailyReviewProgress(goals: UserGoals, now: Date) {
  const reviewed = goals.last_review_reset_date === now.toISOString().slice(0, 10) ? goals.words_reviewed_today : 0;
  return { reviewed, goal: goals.daily_word_goal, remaining: Math.max(0, goals.daily_word_goal - reviewed) };
}

export function reviewFindings(input: {
  due: number;
  daily: ReturnType<typeof dailyReviewProgress>;
  retention: RetentionResult;
  activity: ReadonlyArray<DayCount>;
  hasLogs: boolean;
  repeatedWords: number;
  sessionSize: number;
  hasWords: boolean;
}): ReportFinding<StudyTarget>[] {
  const { due, daily, retention, activity, hasLogs, repeatedWords, sessionSize, hasWords } = input;
  const findings: ReportFinding<StudyTarget>[] = [];
  if (due > 0) {
    const first = Math.min(due, sessionSize);
    findings.push({
      id: 'due', tone: due > sessionSize ? 'warning' : 'focus',
      title: due > sessionSize ? 'Lịch ôn đang dồn lại' : 'Ôn những từ đã đến hạn',
      evidence: `${due} từ đã đến hạn. ${daily.remaining > 0 ? `Bạn còn ${daily.remaining} lượt để đạt mục tiêu ngày.` : 'Bạn đã đạt mục tiêu ngày.'}`,
      advice: `Bắt đầu với ${first} từ, khoảng ${estimateMinutes(first)} phút.${due > first ? ` Chia ${due - first} từ còn lại sang các phiên ngắn tiếp theo.` : ''}`,
      label: 'Mở phiên ôn', target: 'review',
    });
  }
  if (retention.rate != null && retention.rate < RETENTION_TARGET.min) {
    const pct = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(retention.rate);
    findings.push({
      id: 'retention', tone: 'warning', title: 'Tỷ lệ nhớ dưới ngưỡng 85%',
      evidence: `Bạn nhớ ${pct} trong ${retention.samples} lượt ôn có đánh giá của 30 ngày qua.`,
      advice: repeatedWords > 0 ? 'Luyện lại nhóm từ sai nhiều lần và thử tự nhớ nghĩa trước khi lật thẻ.' : 'Trong phiên ôn kế tiếp, thử tự nhớ nghĩa trước khi lật thẻ và đánh giá theo mức độ nhớ thực tế.',
      label: 'Xem báo cáo từ vựng', target: 'vocab',
    });
  } else if (repeatedWords > 0) {
    findings.push({
      id: 'repeated', tone: 'focus', title: 'Luyện lại nhóm từ hay nhầm',
      evidence: `Có ${repeatedWords} từ bạn đã trả lời sai ít nhất 3 lần.`,
      advice: 'Chọn nhóm từ hay quên để luyện trong câu mới, rồi kiểm tra lại sau lần ôn kế tiếp.',
      label: 'Mở báo cáo từ vựng', target: 'vocab',
    });
  }
  const completed = activity.slice(0, -1);
  const active = (days: ReadonlyArray<DayCount>) => days.filter((d) => d.count > 0).length;
  const recent = active(completed.slice(-7));
  const prior = active(completed.slice(-14, -7));
  if (hasLogs && prior >= 3 && prior - recent >= 2) {
    findings.push({
      id: 'rhythm', tone: 'warning', title: 'Nhịp ôn đang giảm',
      evidence: `Bạn ôn trong ${recent}/7 ngày vừa qua, so với ${prior}/7 ngày ở giai đoạn trước đó. Hai giai đoạn đều tính ngày đã kết thúc.`,
      advice: 'Chọn một khung giờ cố định trong 3 ngày tới để mở lịch ôn và xử lý từ đến hạn.',
      label: 'Xem lịch ôn', target: 'vocab',
    });
  }
  if (findings.length === 0) {
    findings.push({
      id: 'lesson', tone: daily.remaining > 0 ? 'focus' : 'positive',
      title: !hasWords ? 'Bắt đầu tích lũy từ vựng' : daily.remaining > 0 ? 'Hiện chưa có từ đến hạn' : 'Đã đạt mục tiêu ôn hôm nay',
      evidence: !hasWords ? 'Từ trong bài học sẽ tạo dữ liệu cho báo cáo ghi nhớ.' : daily.remaining > 0
        ? `Bạn còn ${daily.remaining} lượt so với mục tiêu ngày. Lịch ôn hiện chưa có thẻ để thực hiện các lượt đó.`
        : `Bạn đã ôn ${daily.reviewed}/${daily.goal} lượt theo mục tiêu ngày.`,
      advice: 'Học một bài ngắn và hoàn thành phần kiểm tra để có thêm từ đưa vào lịch ôn.',
      label: 'Mở trang học', target: 'lesson',
    });
  }
  return findings;
}

const SKILL_HUB = {
  listening: AppPhase.IELTS_LISTENING_HUB, reading: AppPhase.IELTS_READING_HUB,
  writing: AppPhase.IELTS_WRITING_HUB, speaking: AppPhase.IELTS_SPEAKING_HUB,
} as const;

export function ieltsReport(attempts: readonly IeltsAttempt[], prefs: UserPreferences, now: Date) {
  const sorted = [...attempts].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const skills = weeklyProgress(sorted, now).map((weekly) => {
    const { skill } = weekly;
    const graded = sorted.filter((a) => a.skill === skill && a.estimatedBand != null);
    const { current } = skillProgress(skill, graded);
    const previous = graded.length >= 2 * RECENT_ATTEMPTS ? skillProgress(skill, graded.slice(RECENT_ATTEMPTS)).current : null;
    return { skill, current, previous, weekly, samples: Math.min(RECENT_ATTEMPTS, graded.length) };
  });
  const measured = skills.flatMap((s) => s.current == null ? [] : [s.current]);
  const band = measured.length === PRACTISED_SKILLS.length ? overallBand(measured) : null;
  const targetBand = prefs.ieltsTargetBand;
  const gap = bandGap(band, targetBand);
  const days = daysUntil(prefs.ieltsExamDate, now);
  const soon = days != null && days >= 0 && days <= EXAM_SOON_DAYS;
  const complete = skills.every((s) => s.samples === RECENT_ATTEMPTS);
  const engaged = attempts.length > 0 || targetBand != null || days != null;
  const weakest = [...skills].sort((a, b) => (a.current ?? Infinity) - (b.current ?? Infinity))[0];
  const missing = skills.find((s) => s.current == null);
  const drop = (s: typeof skills[number]) => s.current == null || s.previous == null ? 0 : s.previous - s.current;
  const declining = [...skills].filter((s) => drop(s) >= 0.5).sort((a, b) => drop(b) - drop(a))[0];
  const mostBehind = [...skills].sort((a, b) => b.weekly.remaining / b.weekly.goal - a.weekly.remaining / a.weekly.goal)[0];
  const pick = missing ?? ((gap ?? 0) > 0 || soon ? weakest : declining ?? mostBehind);
  const name = SKILL_NAMES[pick.skill];
  const deadline = days === 0 ? 'Hôm nay là ngày thi.' : `Còn ${days} ngày đến kỳ thi.`;
  const scoreNote = band != null ? `Band tổng luyện tập ước tính ${band.toFixed(1)}.` : `Đã có điểm ở ${measured.length}/4 kỹ năng.`;
  const gapNote = gap && targetBand != null ? ` Còn ${gap.toFixed(1)} band so với mục tiêu ${targetBand.toFixed(1)}.` : '';
  const hub: NextActionTarget = { kind: 'phase', phase: SKILL_HUB[pick.skill] };
  let focusDetail = '';
  const finding: ReportFinding<NextActionTarget> = {
    id: 'ielts', tone: soon || (complete && !!gap) ? 'warning' : 'focus',
    title: missing ? `Lấy điểm khởi đầu cho ${name}` : `Ưu tiên luyện ${name}`,
    evidence: `${soon ? `${deadline} ` : ''}${scoreNote}${gapNote}`,
    advice: days === 0 ? 'Ôn lỗi hay gặp và cách chia thời gian.'
      : missing ? 'Làm một bài có chấm điểm để lấy band khởi đầu.'
      : soon ? 'Làm một đề bấm giờ rồi sửa lỗi lặp lại.'
        : 'Làm một bài mới rồi xem lại lỗi và phản hồi.',
    label: `Mở ${name}`, target: hub,
  };
  if (!missing && !soon) {
    const skill = pick.skill;
    const weak = skill === 'writing' || skill === 'speaking' ? weakestCriterion(criterionTrends(skill, sorted)) : null;
    if (weak && weak.samples >= RECENT_ATTEMPTS && pick.current != null && pick.current - weak.current >= 0.5 && (skill === 'writing' || skill === 'speaking')) {
      const action = criterionAction(skill, weak.key);
      finding.title = action.title;
      focusDetail = `${weak.nameVi} ${weak.current.toFixed(1)} · band ${name} ${pick.current.toFixed(1)}`;
      finding.advice = `Áp dụng vào bài ${name} mới rồi so điểm tiêu chí.`;
      finding.label = action.cta;
      finding.target = action.target;
    } else if (drop(pick) >= 0.5) {
      finding.title = `Band luyện tập ${name} giảm`;
      finding.tone = 'warning';
      focusDetail = `Band ${pick.previous?.toFixed(1)} → ${pick.current?.toFixed(1)} qua hai nhóm 3 bài`;
      finding.advice = 'Làm một đề tương đương rồi so các lỗi lặp lại.';
    } else if (!gap && pick.weekly.remaining > 0) {
      finding.title = `Bù ${pick.weekly.remaining} ${goalUnit(skill)} ${name} tuần này`;
      finding.evidence += ` Đã hoàn thành ${pick.weekly.goal - pick.weekly.remaining}/${pick.weekly.goal} ${goalUnit(skill)} ${name} trong tuần.`;
    } else if (!gap) {
      finding.title = 'Giữ nhịp luyện IELTS';
      finding.tone = 'positive';
      finding.advice = 'Các mục luyện tuần đã hoàn thành. Làm một đề có bấm giờ để cập nhật mốc tiến độ.';
    }
  }
  if (focusDetail) finding.evidence += ` ${focusDetail}.`;
  return { skills, measured: measured.length, band, targetBand, gap, days, soon, complete, engaged, focusSkill: pick.skill, focusDetail, finding };
}
