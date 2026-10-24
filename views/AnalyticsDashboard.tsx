import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, BookMarked, Brain, ChevronRight, Flame, Loader2, Repeat, Target } from 'lucide-react';
import { toneClasses, type Tone } from '../components/ui/palette';
import { withTimeout } from '../services/supabaseClient';
import { getAnalyticsSnapshot, type AnalyticsSnapshot } from '../services/analyticsService';
import {
  activityTimestamps,
  dailyCounts,
  dueForecast,
  dueNow,
  lapseRate,
  levelFunnel,
  localDateKey,
  mostForgotten,
  periodOverPeriod,
  retention,
  retentionStatus,
  RETENTION_TARGET,
  weeklyNewWords,
  type RetentionResult,
} from '../services/analyticsLogic';
import { estimateMinutes } from '../services/reviewSessionLogic';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { aiErrorMessage } from '../services/aiClient';
import { analyzeWeaknesses, generateHardestWordsLesson, generateTargetedLesson } from '../services/weaknessService';
import { GeneratedLesson, IeltsAttempt, WeaknessPattern } from '../types';
import { ActivityHeatmap, ColumnChart, HeatmapLegend, ScoreLine, StackedBar, shortDate, weekdayLabel } from '../components/analytics/AnalyticsCharts';
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
const HEATMAP_DAYS = 84;
/** Total wrong answers before weakness patterns mean anything. */
const WEAKNESS_THRESHOLD = 10;
/** Quiz results needed to draw a trend. */
const QUIZ_MIN_POINTS = 2;

// --- Building blocks -------------------------------------------------------

const Panel: React.FC<{
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ title, aside, children, className = '', id }) => (
  <section
    id={id}
    className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${className}`}
  >
    <div className="mb-4 flex min-h-touch items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
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

const Metric: React.FC<{ label: string; value: React.ReactNode; foot?: React.ReactNode; tone: Tone; icon: React.ComponentType<{ className?: string }> }> = ({
  label,
  value,
  foot,
  tone,
  icon: Icon,
}) => (
  <div className={`lift group rounded-2xl border p-4 sm:p-5 ${toneClasses(tone).surface}`}>
    <dt className={`flex items-center gap-1.5 text-xs font-semibold ${toneClasses(tone).text}`}>
      <Icon className="icon-pop h-4 w-4" />
      {label}
    </dt>
    <dd className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
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
  low: 'Dưới mục tiêu: ôn đúng hạn hơn và học lại những từ hay quên.',
  'on-target': 'Trong khoảng mục tiêu. Cứ giữ nhịp này.',
  high: 'Cao hơn mục tiêu: bạn có thể học thêm từ mới mỗi ngày.',
} as const;

const RetentionGauge: React.FC<{ result: RetentionResult; hasLogs: boolean }> = ({ result, hasLogs }) => {
  if (!hasLogs) return <Placeholder>Chưa có nhật ký ôn tập để tính tỷ lệ nhớ.</Placeholder>;
  if (result.rate === null) return <Placeholder>Cần thêm {result.needed} lần ôn để tính.</Placeholder>;
  // Track spans 50–100%; anything lower pins to the left edge.
  const pos = (v: number) => Math.max(0, Math.min(1, (v - 0.5) / 0.5)) * 100;
  const pct = Math.round(result.rate * 100);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-display font-semibold tabular-nums text-slate-900 dark:text-white">{pct}%</span>
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

// --- Word notebook ---------------------------------------------------------

// --- Screen ----------------------------------------------------------------

interface IeltsSummary {
  writing: IeltsAttempt[];
  speaking: IeltsAttempt[];
}

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

/** Loads the snapshot (and IELTS results on demand) and renders `AnalyticsView`. */
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  focusSection = 'overview',
  onOpenLibrary,
  onBack,
  onStartLesson,
  onStartReview,
  onStartTargetedLesson,
}) => {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ielts, setIelts] = useState<IeltsResults>(null);
  const ieltsRequested = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSnapshot(await withTimeout(getAnalyticsSnapshot(userId), 12000));
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // IELTS results are only needed on the Kỹ năng tab: fetched the first time it opens.
  const requestIelts = useCallback(() => {
    if (ieltsRequested.current) return;
    ieltsRequested.current = true;
    Promise.all([getIeltsAttempts(userId, 'writing', 10), getIeltsAttempts(userId, 'speaking', 10)])
      .then(([writing, speaking]) => setIelts({ writing, speaking }))
      .catch((err) => {
        console.warn('[Analytics] IELTS attempts failed:', err);
        setIelts('error');
      });
  }, [userId]);

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
      onRequestIelts={requestIelts}
      onStartLesson={onStartLesson}
      onStartReview={onStartReview}
      onStartTargetedLesson={onStartTargetedLesson}
    />
  );
};

type IeltsResults = IeltsSummary | 'error' | null;

interface AnalyticsViewProps {
  snapshot: AnalyticsSnapshot;
  focusSection?: 'overview' | 'vocab';
  onOpenLibrary?: () => void;
  /** null while not loaded yet. */
  ielts: IeltsResults;
  /** Called when the Kỹ năng tab opens; the container fetches IELTS results once. */
  onRequestIelts: () => void;
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
  onRequestIelts,
  onStartLesson,
  onStartReview,
  onStartTargetedLesson,
}) => {
  const [tab, setTab] = useState<TabId>(focusSection === 'vocab' ? 'vocab' : 'overview');
  const [forecastDays, setForecastDays] = useState<7 | 30>(7);
  const [generating, setGenerating] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  useEffect(() => {
    setTab(focusSection === 'vocab' ? 'vocab' : 'overview');
    window.scrollTo({ top: 0 });
  }, [focusSection]);

  useEffect(() => {
    if (tab === 'skills') onRequestIelts();
  }, [tab, onRequestIelts]);

  const now = useMemo(() => new Date(), [snapshot]);

  const stats = useMemo(() => {
    if (!snapshot) return null;
    const { words, logs, goals } = snapshot;
    const activity = dailyCounts(activityTimestamps(logs, words), HEATMAP_DAYS, now);
    const withErrors = words.filter((w) => (w.incorrect_count ?? 0) > 0);
    const weaknesses = analyzeWeaknesses(withErrors);
    return {
      activity,
      week: periodOverPeriod(activity, 7),
      retention30: retention(logs ?? [], 30, now),
      forecast30: dueForecast(words, 30, now),
      due: dueNow(words, now),
      funnel: levelFunnel(words),
      newPerWeek: weeklyNewWords(words, 8, now),
      forgotten: mostForgotten(words, 5),
      weaknesses,
      totalErrors: withErrors.reduce((a, w) => a + (w.incorrect_count ?? 0), 0),
      reviewedToday: goals.last_review_reset_date === localDateKey(now) ? goals.words_reviewed_today : 0,
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

  if (!stats) return null;

  const { words, logs, goals, quizTrend } = snapshot;
  const level = goals.preferred_level || 'B1';

  if (words.length < 3) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <h2 className="text-title text-slate-900 dark:text-white">Thống kê</h2>
        <EmptyState
          icon={<BarChart3 className="mx-auto h-8 w-8 text-slate-400" />}
          title="Chưa đủ dữ liệu"
          description="Học ít nhất 3 từ để xem tiến độ và lịch ôn của bạn."
          action={{ label: 'Bắt đầu bài học', onClick: onStartLesson }}
        />
      </div>
    );
  }

  const todayActivity = stats.activity[stats.activity.length - 1]?.count ?? 0;
  const nextDue = stats.forecast30.find((d, i) => i > 0 && d.count > 0);
  const forecast = stats.forecast30.slice(0, forecastDays);
  const forecastTotal = forecast.reduce((a, d) => a + d.count, 0);
  const heatTotal = stats.activity.reduce((a, d) => a + d.count, 0);
  const activeDays = stats.activity.filter((d) => d.count > 0).length;
  const goalPct = goals.daily_word_goal > 0 ? Math.min(100, (stats.reviewedToday / goals.daily_word_goal) * 100) : 0;

  const quizPoints = quizTrend
    .filter((q) => q.total > 0)
    .map((q) => ({ label: shortDate(q.date), value: Math.round((q.score / q.total) * 100) }));
  const quizAvg = quizPoints.length ? Math.round(quizPoints.reduce((a, p) => a + p.value, 0) / quizPoints.length) : 0;

  // --- Overview: one next step ---
  let action: { title: string; body: string; label: string; onClick: () => void; primary: boolean };
  if (stats.due > 0 && onStartReview) {
    action = {
      title: `${stats.due} từ đến hạn ôn`,
      body:
        stats.due > 20
          ? `Khoảng ${estimateMinutes(20)} phút cho 20 từ đầu tiên.`
          : `Khoảng ${estimateMinutes(stats.due)} phút.`,
      label: 'Ôn ngay',
      onClick: onStartReview,
      primary: true,
    };
  } else if (todayActivity === 0) {
    action = {
      title: 'Hôm nay chưa học',
      body: 'Không có từ nào đến hạn. Học một bài mới để thêm từ vào lịch ôn.',
      label: 'Học bài mới',
      onClick: onStartLesson,
      primary: true,
    };
  } else {
    action = {
      title: 'Xong việc hôm nay',
      body: nextDue
        ? `Lượt ôn tiếp theo: ${weekdayLabel(nextDue.date)} ${shortDate(nextDue.date)}, ${nextDue.count} từ.`
        : 'Không có từ nào đến hạn trong 30 ngày tới.',
      label: 'Học thêm bài mới',
      onClick: onStartLesson,
      primary: false,
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h2 className="text-title text-slate-900 dark:text-white">Thống kê</h2>

      <Tabs<TabId> label="Mục thống kê" value={tab} onChange={setTab} items={TABS} />

      {practiceError && (
        <p role="alert" className="rounded-xl border border-tone-blush-border bg-tone-blush px-4 py-3 text-sm text-tone-blush-fg">
          {practiceError}
        </p>
      )}

      {tab === 'overview' && (
        <div role="tabpanel" aria-label="Tổng quan" className="space-y-6">
          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-heading text-slate-900 dark:text-white">{action.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{action.body}</p>
            </div>
            <button type="button" onClick={action.onClick} className={`${action.primary ? primaryBtn : secondaryBtn} sm:flex-shrink-0`}>
              {action.label}
            </button>
          </section>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric tone="butter" icon={Repeat} label="Lượt ôn 7 ngày" value={stats.week.current} foot={<Delta delta={stats.week.delta} previous={stats.week.previous} />} />
            <Metric
              tone="mint"
              icon={Brain}
              label="Tỷ lệ nhớ 30 ngày"
              value={stats.retention30.rate === null ? '—' : `${Math.round(stats.retention30.rate * 100)}%`}
              foot={
                !logs
                  ? 'Chưa có nhật ký ôn tập'
                  : stats.retention30.rate === null
                    ? `Cần thêm ${stats.retention30.needed} lần ôn để tính`
                    : 'Mục tiêu 85–90%'
              }
            />
            <Metric tone="peach" icon={Flame} label="Chuỗi ngày" value={goals.current_streak} foot={`Kỷ lục ${goals.longest_streak} ngày`} />
            <Metric
              tone="aqua"
              icon={Target}
              label="Mục tiêu hôm nay"
              value={
                <>
                  {stats.reviewedToday}
                  <span className="text-base font-medium text-slate-400 dark:text-slate-500">/{goals.daily_word_goal}</span>
                </>
              }
              foot={
                <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-tone-aqua-soft" aria-hidden="true">
                  <span className="block h-full rounded-full bg-tone-aqua-accent" style={{ width: `${goalPct}%` }} />
                </span>
              }
            />
          </dl>

          <Panel title="Hoạt động 12 tuần" aside={<HeatmapLegend />}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <ActivityHeatmap days={stats.activity} />
              <dl className="grid grid-cols-3 gap-4 sm:w-56 sm:grid-cols-1">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Lượt ôn</dt>
                  <dd className="text-heading tabular-nums text-slate-900 dark:text-white">{heatTotal}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Ngày có học</dt>
                  <dd className="text-heading tabular-nums text-slate-900 dark:text-white">
                    {activeDays}
                    <span className="text-sm font-medium text-slate-400 dark:text-slate-500">/{HEATMAP_DAYS}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">TB mỗi ngày</dt>
                  <dd className="text-heading tabular-nums text-slate-900 dark:text-white">{activeDays ? Math.round(heatTotal / activeDays) : 0}</dd>
                </div>
              </dl>
            </div>
            {!logs && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Chỉ tính lần ôn gần nhất của mỗi từ.</p>
            )}
          </Panel>
        </div>
      )}

      {tab === 'vocab' && (
        <div role="tabpanel" aria-label="Từ vựng" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Tỷ lệ nhớ · 30 ngày">
              <RetentionGauge result={stats.retention30} hasLogs={!!logs} />
            </Panel>
            <Panel
              title="Lịch ôn sắp tới"
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
            <Panel title="Trạng thái từ">
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
            <Panel title="Từ mới mỗi tuần">
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
            aside={
              stats.forgotten.length > 0 && onStartTargetedLesson ? (
                <button
                  type="button"
                  className={secondaryBtn}
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
        <div role="tabpanel" aria-label="Kỹ năng" className="space-y-6">
          <Panel
            title="Bài kiểm tra cuối bài học"
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

          <Panel title="Lỗi thường gặp">
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

          <Panel title="IELTS">
            {ielts === null ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : ielts === 'error' ? (
              <Placeholder>Không tải được kết quả IELTS.</Placeholder>
            ) : (
              <dl className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                {(
                  [
                    ['Writing', ielts.writing],
                    ['Speaking', ielts.speaking],
                  ] as const
                ).map(([name, attempts]) => {
                  const bands = attempts.map((a) => a.estimatedBand).filter((b): b is number => typeof b === 'number');
                  const recent = bands.slice(0, 5);
                  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
                  return (
                    <div key={name} className="px-4 first:pl-0 last:pr-0">
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{name}</dt>
                      <dd className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                        {bands.length ? bands[0].toFixed(1) : '—'}
                      </dd>
                      <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {avg === null ? 'Chưa có bài nào' : `TB ${recent.length} bài gần nhất: ${avg.toFixed(1)}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
