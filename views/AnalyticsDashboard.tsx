import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, BookMarked, Brain, CalendarDays, ChevronRight, GraduationCap, Layers3, Loader2, Sparkles, type LucideIcon } from 'lucide-react';
import { toneClasses, type Tone } from '../components/ui/palette';
import { withTimeout } from '../services/supabaseClient';
import { ANALYTICS_LOG_DAYS, getAnalyticsSnapshot, type AnalyticsSnapshot } from '../services/analyticsService';
import {
  activityTimestamps,
  dailyCounts,
  dueForecast,
  dueNow,
  lapseRate,
  levelFunnel,
  mostForgotten,
  periodOverPeriod,
  retention,
  retentionStatus,
  RETENTION_TARGET,
  weeklyNewWords,
  type RetentionResult,
} from '../services/analyticsLogic';
import { dailyReviewProgress, ieltsReport, reviewFindings, type ReportFinding, type StudyTarget } from '../services/analyticsReportLogic';
import { streakWeek } from '../services/dashboardLogic';
import { PRACTISED_SKILLS, type NextActionTarget } from '../services/ieltsProgressLogic';
import { getPreferences, type UserPreferences } from '../services/preferencesService';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { aiErrorMessage } from '../services/aiClient';
import { analyzeWeaknesses, generateHardestWordsLesson, generateTargetedLesson } from '../services/weaknessService';
import { AppPhase, type GeneratedLesson, type IeltsAttempt, type WeaknessPattern } from '../types';
import { ActivityHeatmap, ColumnChart, ScoreLine, StackedBar, shortDate, weekdayLabel } from '../components/analytics/AnalyticsCharts';
import { FindingCard, IeltsProgressReport, ProgressTrack } from '../components/analytics/ReportCards';
import { Tabs } from '../components/ui/Tabs';
import { Segmented } from '../components/ui/Segmented';
import { SRS_LEVEL_META, SRS_LEVEL_ORDER } from '../components/ui/srsTheme';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../components/ui/States';
import { primaryBtn, secondaryBtn } from '../components/ui/styles';

interface AnalyticsDashboardProps {
  userId: string;
  /** Which tab opens first. */
  focusSection?: 'overview' | 'vocab';
  /** Opens the word library (Sổ từ). */
  onOpenLibrary?: () => void;
  onBack: () => void;
  onStartLesson: () => void;
  /** Opens the SRS review session. Without it the overview suggests a lesson instead. */
  onStartReview?: () => void;
  onOpenIelts: (target: NextActionTarget) => void;
  /** Called with a generated practice lesson (weak words / weakness pattern). */
  onStartTargetedLesson?: (lesson: GeneratedLesson) => void;
}

type TabId = 'overview' | 'vocab' | 'skills';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'vocab', label: 'Từ vựng' },
  { id: 'skills', label: 'Kỹ năng' },
];

/** Heatmap span, in days (12 weeks). */
const HEATMAP_DAYS = ANALYTICS_LOG_DAYS;
/** Total wrong answers before weakness patterns mean anything. */
const WEAKNESS_THRESHOLD = 10;
/** Quiz results needed to draw a trend. */
const QUIZ_MIN_POINTS = 2;
const reportDate = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
const retentionPercent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 });
const overviewArt = {
  goal: '/analytics-ielts/band.webp',
  review: '/analytics-overview/review.webp',
  memory: '/analytics-overview/memory.webp',
  streak: '/analytics-overview/streak.webp',
  calendar: '/analytics-overview/calendar.webp',
};
const findingArt: Record<StudyTarget, string> = {
  review: overviewArt.review, lesson: overviewArt.memory, vocab: overviewArt.memory, skills: overviewArt.goal,
};

// --- Building blocks -------------------------------------------------------

const Panel: React.FC<{
  title: string;
  icon?: LucideIcon;
  art?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ title, icon: Icon, art, aside, children, className = '', id }) => (
  <section
    id={id}
    className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${className}`}
  >
    <div className="mb-3 flex min-h-touch flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-tone-lavender-fg" aria-hidden="true" />}
        {art && <img src={art} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />}
        {title}
      </h3>
      {aside}
    </div>
    {children}
  </section>
);

/** Muted line used wherever there is not enough data for a number. */
const Placeholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
    {children}
  </p>
);

const Metric: React.FC<{ label: string; value: React.ReactNode; foot?: React.ReactNode; tone: Tone; art: string }> = ({
  label,
  value,
  foot,
  tone,
  art,
}) => (
  <div className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${toneClasses(tone).surface}`}>
    <dt className={`flex min-h-9 items-center justify-between gap-1.5 text-xs font-semibold ${toneClasses(tone).text}`}>
      {label}
      <img src={art} alt="" width={44} height={44} className="h-8 w-8 shrink-0 object-contain drop-shadow-sm sm:h-11 sm:w-11" />
    </dt>
    <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</dd>
    {foot && <dd className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{foot}</dd>}
  </div>
);


const Delta: React.FC<{ delta: number; previous: number }> = ({ delta, previous }) => {
  if (previous === 0 && delta === 0) return <>Chưa có tuần trước để so sánh</>;
  if (delta === 0) return <>Bằng tuần trước</>;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span>
      <Icon
        className={`-mt-0.5 mr-0.5 inline h-3.5 w-3.5 ${delta > 0 ? 'text-tone-mint-fg' : 'text-slate-400'}`}
        aria-hidden="true"
      />
      <span className="tabular-nums">{delta > 0 ? `+${delta}` : delta}</span> so với tuần trước
    </span>
  );
};

const RETENTION_COPY = {
  low: 'Dưới mục tiêu. Thử tự nhớ nghĩa trước khi lật thẻ và luyện lại những từ hay quên.',
  'on-target': 'Trong khoảng mục tiêu. Cứ giữ nhịp này.',
  high: 'Cao hơn mục tiêu. Nếu lịch ôn còn nhẹ, bạn có thể thêm một nhóm từ mới.',
} as const;

const RetentionGauge: React.FC<{ result: RetentionResult; hasLogs: boolean }> = ({ result, hasLogs }) => {
  if (!hasLogs) return <Placeholder>Chưa có nhật ký ôn tập để tính tỷ lệ nhớ.</Placeholder>;
  if (result.rate === null) return <Placeholder>Cần thêm {result.needed} lần ôn để tính.</Placeholder>;
  // Track spans 50–100%; anything lower pins to the left edge.
  const pos = (v: number) => Math.max(0, Math.min(1, (v - 0.5) / 0.5)) * 100;
  const pct = retentionPercent.format(result.rate);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-display font-semibold tabular-nums text-slate-900 dark:text-white">{pct}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">trên {result.samples} lần ôn</span>
      </div>
      <div className="relative mt-5 h-2 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div
          className="absolute inset-y-0 rounded-full bg-tone-mint-border"
          style={{ left: `${pos(RETENTION_TARGET.min)}%`, width: `${pos(RETENTION_TARGET.max) - pos(RETENTION_TARGET.min)}%` }}
        />
        <div
          className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-tone-periwinkle-fg"
          style={{ left: `${pos(result.rate)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 dark:text-slate-500" aria-hidden="true">
        <span>50%</span>
        <span>Mục tiêu 85–90%</span>
        <span>100%</span>
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{RETENTION_COPY[retentionStatus(result.rate)]}</p>
    </div>
  );
};

// --- Screen ----------------------------------------------------------------

const LoadingSkeleton: React.FC = () => (
  <LoadingRegion label="Đang tải thống kê…" className="mx-auto max-w-5xl space-y-6">
    <Skeleton className="h-8 w-40" />
    <Skeleton className="h-11 w-72" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-56 w-full rounded-2xl" />
  </LoadingRegion>
);

/** IELTS loads independently so a slow or unavailable history leaves vocabulary usable. */
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  focusSection = 'overview',
  onOpenLibrary,
  onBack,
  onStartLesson,
  onStartReview,
  onOpenIelts,
  onStartTargetedLesson,
}) => {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ielts, setIelts] = useState<IeltsResults>(null);
  const [ieltsRetry, setIeltsRetry] = useState(0);
  const requestId = useRef(0);
  const preferences = useMemo(() => getPreferences(userId), [userId]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await withTimeout(getAnalyticsSnapshot(userId), 12000);
      if (requestId.current === id) setSnapshot(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      if (requestId.current === id) setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      if (requestId.current === id) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    return () => { requestId.current++; };
  }, [load]);

  useEffect(() => {
    let active = true;
    setIelts(null);
    Promise.all(PRACTISED_SKILLS.map((skill) => getIeltsAttempts(userId, skill, 10)))
      .then((attempts) => { if (active) setIelts(attempts.flat()); })
      .catch((err) => {
        console.warn('[Analytics] IELTS attempts failed:', err);
        if (active) setIelts('error');
      });
    return () => { active = false; };
  }, [userId, ieltsRetry]);

  if (isLoading) return <LoadingSkeleton />;

  if (error || !snapshot) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState title="Không tải được thống kê" message={error ?? 'Đã xảy ra lỗi không xác định.'} onRetry={load} />
        <div className="mt-4 flex justify-center">
          <button type="button" className={secondaryBtn} onClick={onBack}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsView
      snapshot={snapshot}
      focusSection={focusSection}
      onOpenLibrary={onOpenLibrary}
      ielts={ielts}
      preferences={preferences}
      onRetryIelts={() => setIeltsRetry((n) => n + 1)}
      onOpenIelts={onOpenIelts}
      onStartLesson={onStartLesson}
      onStartReview={onStartReview}
      onStartTargetedLesson={onStartTargetedLesson}
    />
  );
};

type IeltsResults = IeltsAttempt[] | 'error' | null;

interface AnalyticsViewProps {
  snapshot: AnalyticsSnapshot;
  focusSection?: 'overview' | 'vocab';
  onOpenLibrary?: () => void;
  /** null while not loaded yet. */
  ielts: IeltsResults;
  preferences: UserPreferences;
  onRetryIelts: () => void;
  onOpenIelts: (target: NextActionTarget) => void;
  onStartLesson: () => void;
  onStartReview?: () => void;
  onStartTargetedLesson?: (lesson: GeneratedLesson) => void;
}

/** The analytics screen for a loaded snapshot: three tabs, no fetching of its own. */
export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  snapshot,
  focusSection = 'overview',
  onOpenLibrary,
  ielts,
  preferences,
  onRetryIelts,
  onOpenIelts,
  onStartLesson,
  onStartReview,
  onStartTargetedLesson,
}) => {
  const [tab, setTab] = useState<TabId>(focusSection === 'vocab' ? 'vocab' : 'overview');
  const [forecastDays, setForecastDays] = useState<7 | 30>(7);
  const [activityWeeks, setActivityWeeks] = useState<4 | 12>(12);
  const [generating, setGenerating] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useEffect(() => {
    setTab(focusSection === 'vocab' ? 'vocab' : 'overview');
    window.scrollTo({ top: 0 });
  }, [focusSection]);

  const now = useMemo(() => new Date(), [snapshot]);
  const ieltsProgress = useMemo(() => Array.isArray(ielts) ? ieltsReport(ielts, preferences, now) : null, [ielts, preferences, now]);

  const stats = useMemo(() => {
    const { words, logs, goals } = snapshot;
    const activity = dailyCounts(activityTimestamps(logs, words), HEATMAP_DAYS, now);
    const withErrors = words.filter((w) => (w.incorrect_count ?? 0) > 0);
    const weaknesses = analyzeWeaknesses(withErrors);
    return {
      activity,
      week: periodOverPeriod(activity.slice(0, -1), 7),
      retention30: retention(logs ?? [], 30, now),
      forecast30: dueForecast(words, 30, now),
      due: dueNow(words, now),
      funnel: levelFunnel(words),
      newPerWeek: weeklyNewWords(words, 8, now),
      forgotten: mostForgotten(words, 5),
      weaknesses,
      totalErrors: withErrors.reduce((a, w) => a + (w.incorrect_count ?? 0), 0),
      repeatedWords: withErrors.filter((w) => (w.incorrect_count ?? 0) >= 3).length,
      daily: dailyReviewProgress(goals, now),
      streak: streakWeek(now, goals.current_streak, goals.last_active_date).some((day) => day.active) ? goals.current_streak : 0,
    };
  }, [snapshot, now]);

  const practice = async (key: string, make: () => Promise<GeneratedLesson>) => {
    if (generating) return;
    setPracticeError(null);
    setGenerating(key);
    try {
      onStartTargetedLesson?.(await make());
    } catch (err) {
      console.error('Failed to generate practice lesson:', err);
      setPracticeError(aiErrorMessage(err));
    } finally {
      setGenerating(null);
    }
  };

  const { words, logs, goals, quizTrend } = snapshot;
  const level = goals.preferred_level || 'B1';

  const forecast = stats.forecast30.slice(0, forecastDays);
  const forecastTotal = forecast.reduce((a, d) => a + d.count, 0);
  const visibleActivity = stats.activity.slice(-activityWeeks * 7);
  const heatTotal = visibleActivity.reduce((a, d) => a + d.count, 0);
  const activeDays = visibleActivity.filter((d) => d.count > 0).length;

  const quizPoints = quizTrend
    .filter((q) => q.total > 0)
    .map((q) => ({ label: shortDate(q.date), value: Math.round((q.score / q.total) * 100) }));
  const quizAvg = quizPoints.length ? Math.round(quizPoints.reduce((a, p) => a + p.value, 0) / quizPoints.length) : 0;

  const openTab = (next: TabId) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };
  const followFinding = (target: StudyTarget) => {
    if (target === 'lesson') onStartLesson();
    else if (target === 'review') (onStartReview ?? onStartLesson)();
    else openTab(target);
  };
  const findings = reviewFindings({
    due: stats.due, daily: stats.daily, retention: stats.retention30, activity: stats.activity,
    hasLogs: logs !== null, repeatedWords: stats.repeatedWords, sessionSize: preferences.reviewSessionSize,
    hasWords: words.length > 0,
  });
  const ieltsFinding: ReportFinding<StudyTarget> | null = ieltsProgress?.engaged ? {
    ...ieltsProgress.finding, label: 'Xem kế hoạch IELTS', target: 'skills',
  } : null;
  if (ieltsFinding) {
    if (ieltsProgress?.soon || findings[0].id === 'lesson') findings.unshift(ieltsFinding);
    else findings.push(ieltsFinding);
  }
  const [priority, ...otherFindings] = findings;
  const openIeltsGoals = () => onOpenIelts({ kind: 'phase', phase: AppPhase.IELTS_HOME });

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tone-lavender-fg">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Báo cáo học tập
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Tiến độ học tập</h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">Xem bạn đang ở đâu và nên làm gì tiếp theo.</p>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />{reportDate.format(now)}
        </span>
      </header>

      <Tabs<TabId> label="Mục thống kê" value={tab} onChange={openTab} items={TABS} variant="pill" className="w-fit max-w-full" />

      {practiceError && (
        <p role="alert" className="rounded-xl border border-tone-blush-border bg-tone-blush px-4 py-3 text-sm text-tone-blush-fg">
          {practiceError}
        </p>
      )}

      {tab === 'overview' && (
        <div role="tabpanel" aria-label="Tổng quan" className="space-y-4 sm:space-y-5">
          <section aria-label="Đề xuất học tập" className="space-y-2">
            <FindingCard finding={priority} onClick={followFinding} variant="priority" />
            {ielts === 'error' && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Chưa tải được lịch sử IELTS.{' '}
                <button type="button" className="font-medium text-tone-periwinkle-fg underline" onClick={onRetryIelts}>Thử tải lại</button>
              </p>
            )}
          </section>

          <section aria-labelledby="review-progress-title">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
              <h3 id="review-progress-title" className="text-heading text-slate-900 dark:text-white">Tiến độ ôn từ</h3>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
              <Metric
                tone="aqua"
                art={overviewArt.goal}
                label="Mục tiêu hôm nay"
                value={
                  <>
                    {stats.daily.reviewed}
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300"> / {stats.daily.goal} lượt</span>
                  </>
                }
                foot={
                  <div className="space-y-1.5 font-semibold text-tone-aqua-fg">
                    {stats.daily.goal > 0 && <ProgressTrack value={stats.daily.reviewed} goal={stats.daily.goal} label="Mục tiêu ôn hôm nay" />}
                    <span>{stats.daily.remaining > 0 ? `Còn ${stats.daily.remaining} lượt` : 'Đã hoàn thành'}</span>
                  </div>
                }
              />
              <Metric tone="sky" art={overviewArt.review} label="Lượt ôn 7 ngày qua" value={stats.week.current}
                foot={logs ? <Delta delta={stats.week.delta} previous={stats.week.previous} /> : 'Tính từ lần ôn gần nhất của mỗi từ'} />
              <Metric
                tone="lavender"
                art={overviewArt.memory}
                label="Tỷ lệ nhớ · 30 ngày"
                value={stats.retention30.rate === null ? '—' : retentionPercent.format(stats.retention30.rate)}
                foot={
                  !logs
                    ? 'Chưa có nhật ký ôn tập'
                    : stats.retention30.rate === null
                      ? `Cần thêm ${stats.retention30.needed} lần ôn để tính`
                      : 'Mục tiêu 85–90%'
                }
              />
              <Metric tone="peach" art={overviewArt.streak} label="Chuỗi đạt mục tiêu" value={
                <>{stats.streak}<span className="text-sm font-medium text-slate-600 dark:text-slate-300"> ngày</span></>
              } foot={`Kỷ lục ${goals.longest_streak} ngày`} />
            </dl>
          </section>

          {otherFindings.length > 0 && (
            <section aria-labelledby="other-findings-title">
              <h3 id="other-findings-title" className="mb-2 text-heading text-slate-900 dark:text-white">Gợi ý thêm</h3>
              <ul className={`grid gap-2 sm:gap-3 ${otherFindings.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {otherFindings.map((finding) => (
                  <li key={finding.id}>
                    <FindingCard finding={finding} onClick={followFinding} variant="summary" art={findingArt[finding.target]} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Panel title="Nhịp ôn tập" art={overviewArt.calendar} aside={
            <Segmented<4 | 12>
              label="Khoảng hoạt động ôn tập"
              value={activityWeeks}
              onChange={setActivityWeeks}
              options={[{ value: 4, label: '4 tuần' }, { value: 12, label: '12 tuần' }]}
              className="w-40"
            />
          }>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">Chọn một ô để xem lượt ôn trong ngày.</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-5">
              <div className="min-w-0">
                <ActivityHeatmap days={visibleActivity} />
              </div>
              <dl aria-label="Tóm tắt khoảng đã chọn" aria-live="polite" className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Lượt ôn</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{heatTotal}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Ngày có ôn</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {activeDays}
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">/{visibleActivity.length}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">TB mỗi ngày có ôn</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{activeDays ? Math.round(heatTotal / activeDays) : 0}</dd>
                </div>
              </dl>
            </div>
            {!logs && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Chỉ tính lần ôn gần nhất của mỗi từ.</p>
            )}
          </Panel>
        </div>
      )}

      {tab === 'vocab' && words.length === 0 && (
        <div role="tabpanel" aria-label="Từ vựng">
          <EmptyState title="Chưa có từ trong báo cáo" description="Hoàn thành một bài học để bắt đầu theo dõi ghi nhớ và lịch ôn." action={{ label: 'Mở trang học', onClick: onStartLesson }} />
        </div>
      )}

      {tab === 'vocab' && words.length > 0 && (
        <div role="tabpanel" aria-label="Từ vựng" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Tỷ lệ nhớ · 30 ngày" icon={Brain}>
              <RetentionGauge result={stats.retention30} hasLogs={!!logs} />
            </Panel>
            <Panel
              title="Lịch ôn sắp tới"
              icon={CalendarDays}
              aside={
                <Segmented<7 | 30>
                  label="Khoảng dự báo"
                  value={forecastDays}
                  onChange={setForecastDays}
                  options={[
                    { value: 7, label: '7 ngày' },
                    { value: 30, label: '30 ngày' },
                  ]}
                  className="w-40"
                />
              }
            >
              <ColumnChart
                data={forecast}
                highlight={0}
                unit="từ"
                label={`Số từ đến hạn ôn mỗi ngày trong ${forecastDays} ngày tới`}
                labelFor={(d, i) => (i === 0 ? 'Nay' : forecastDays === 7 ? weekdayLabel(d.date) : i % 7 === 0 ? shortDate(d.date) : '')}
              />
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="tabular-nums">{forecastTotal}</span> lượt ôn trong {forecastDays} ngày tới, tính cả từ quá hạn
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Trạng thái từ" icon={Layers3}>
              <StackedBar
                label="Phân bố từ theo trạng thái ghi nhớ"
                segments={SRS_LEVEL_ORDER.map((lv) => ({
                  key: lv,
                  label: SRS_LEVEL_META[lv].label,
                  value: stats.funnel[lv],
                  color: SRS_LEVEL_META[lv].dot,
                }))}
              />
            </Panel>
            <Panel title="Từ mới mỗi tuần" icon={BarChart3}>
              <ColumnChart
                data={stats.newPerWeek}
                highlight={stats.newPerWeek.length - 1}
                unit="từ mới"
                label="Số từ mới mỗi tuần trong 8 tuần qua"
                labelFor={(d, i) => (i === stats.newPerWeek.length - 1 ? 'Tuần này' : i % 2 === 0 ? shortDate(d.date) : '')}
              />
            </Panel>
          </div>

          <Panel
            title="Từ hay quên"
            icon={BookMarked}
            aside={
              stats.forgotten.length > 0 && onStartTargetedLesson ? (
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={generating !== null}
                  onClick={() => practice('forgotten', () => generateHardestWordsLesson(stats.forgotten, level))}
                >
                  {generating === 'forgotten' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Luyện các từ này
                </button>
              ) : undefined
            }
          >
            {stats.forgotten.length === 0 ? (
              <Placeholder>Chưa có từ nào bị trả lời sai.</Placeholder>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.forgotten.map((w) => (
                  <li key={w.word} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{w.word}</p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-400">{w.meaning_vi || '—'}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        Sai {w.incorrect_count}/{(w.correct_count ?? 0) + (w.incorrect_count ?? 0)}
                      </p>
                      <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{Math.round(lapseRate(w) * 100)}% trả lời sai</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="lift press group flex min-h-touch w-full items-center gap-3 rounded-2xl border border-tone-mint-border bg-tone-mint px-5 py-4 text-left"
            >
              <BookMarked className="icon-pop h-5 w-5 flex-shrink-0 text-tone-mint-fg" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Sổ từ</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">
                  <span className="tabular-nums">{words.length}</span> từ · tìm, lọc, đổi trạng thái và gom thành bộ
                </span>
              </span>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-tone-mint-fg" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {tab === 'skills' && (
        <div role="tabpanel" aria-label="Kỹ năng" className="space-y-4 sm:space-y-5">
          <Panel title="Tiến độ IELTS" icon={GraduationCap}>
            {ieltsProgress ? (
              <IeltsProgressReport report={ieltsProgress} now={now} onOpenGoals={openIeltsGoals} onAction={onOpenIelts} />
            ) : ielts === 'error' ? (
              <ErrorState title="Không tải được kết quả IELTS" onRetry={onRetryIelts} />
            ) : (
              <LoadingRegion label="Đang tải lịch sử IELTS…"><Skeleton className="h-40 w-full rounded-xl" /></LoadingRegion>
            )}
          </Panel>

          <Panel
            title="Điểm kiểm tra cuối bài"
            icon={BarChart3}
            aside={
              quizPoints.length >= QUIZ_MIN_POINTS ? (
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">Trung bình {quizAvg}%</span>
              ) : undefined
            }
          >
            {quizPoints.length < QUIZ_MIN_POINTS ? (
              <Placeholder>Cần thêm {QUIZ_MIN_POINTS - quizPoints.length} bài kiểm tra để vẽ xu hướng.</Placeholder>
            ) : (
              <ScoreLine points={quizPoints} />
            )}
          </Panel>

          <Panel title="Lỗi thường gặp" icon={Brain}>
            {stats.totalErrors < WEAKNESS_THRESHOLD ? (
              <Placeholder>Cần thêm {WEAKNESS_THRESHOLD - stats.totalErrors} câu trả lời sai để nhận ra quy luật lỗi.</Placeholder>
            ) : stats.weaknesses.length === 0 ? (
              <Placeholder>Không thấy quy luật lỗi nào lặp lại.</Placeholder>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.weaknesses.map((w: WeaknessPattern) => {
                  const examples = Array.from(new Set(w.examples.map((e) => e.word).filter(Boolean))).slice(0, 3);
                  return (
                    <li key={w.category} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{w.categoryVi}</span>
                          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{w.errorCount} lỗi</span>
                        </p>
                        {examples.length > 0 && (
                          <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">{examples.join(', ')}</p>
                        )}
                      </div>
                      {onStartTargetedLesson && (
                        <button
                          type="button"
                          className={`${secondaryBtn} sm:flex-shrink-0`}
                          disabled={generating !== null}
                          onClick={() => practice(w.category, () => generateTargetedLesson(w, level))}
                        >
                          {generating === w.category && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                          Luyện tập
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
