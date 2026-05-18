import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Clock,
  BarChart3,
  Flame,
  Target,
  Loader2,
  AlertTriangle,
  BookX,
  Type as TypeIcon,
  Shuffle as ShuffleIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { GeneratedLesson, MasteryLevel, UserGoals, WeaknessPattern } from '../types';
import {
  getMasteryDistribution,
  getActivityHeatmap,
  getQuizScoreTrend,
  getTotalStats,
  HeatmapEntry,
  QuizScorePoint,
  TotalStats,
} from '../services/analyticsService';
import { getOrCreateUserGoals } from '../services/goalService';
import {
  getWeaknessData,
  generateTargetedLesson,
} from '../services/weaknessService';
import {
  HeatmapGrid,
  BarChart,
  LineChart,
  CircularProgress,
  type BarChartDataPoint,
  type LineChartDataPoint,
} from '../components/SVGCharts';
import { Button } from '../components/Common';

interface AnalyticsDashboardProps {
  userId: string;
  onBack: () => void;
  onStartLesson: () => void;
  /**
   * Called when a targeted weakness mini-lesson has been generated.
   * Wired in App.tsx to set the lesson data and switch to FLASHCARDS phase.
   */
  onStartTargetedLesson?: (lesson: GeneratedLesson) => void;
}

interface AnalyticsData {
  distribution: Record<MasteryLevel, number>;
  heatmap: HeatmapEntry[];
  quizTrend: QuizScorePoint[];
  totalStats: TotalStats;
  goals: UserGoals;
  weaknesses: WeaknessPattern[];
  totalIncorrect: number;
}

/**
 * Minimum total incorrect answers required before the weakness section
 * is surfaced (per requirement 7.1 and task 3.5).
 */
const WEAKNESS_THRESHOLD = 10;

/**
 * Pick a Lucide icon for each weakness category. Falls back to
 * AlertTriangle for any unrecognised category id.
 */
const WEAKNESS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  vocabulary_gap: BookX,
  grammar_confusion: TypeIcon,
  spelling_similarity: ShuffleIcon,
  meaning_overlap: AlertTriangle,
};

// --- Mastery distribution config (color + Vietnamese label per level) ---
const MASTERY_BAR_CONFIG: Array<{
  level: MasteryLevel;
  label: string;
  color: string;
}> = [
  { level: MasteryLevel.NEW, label: 'Mới', color: 'bg-gray-400 dark:bg-gray-500' },
  { level: MasteryLevel.LEARNING, label: 'Đang học', color: 'bg-yellow-500 dark:bg-yellow-400' },
  { level: MasteryLevel.REVIEWING, label: 'Ôn tập', color: 'bg-blue-500 dark:bg-blue-400' },
  { level: MasteryLevel.MASTERED, label: 'Thành thạo', color: 'bg-emerald-500 dark:bg-emerald-400' },
  { level: MasteryLevel.LAPSED, label: 'Đã quên', color: 'bg-red-500 dark:bg-red-400' },
];

/**
 * Format a `YYYY-MM-DD` string as `DD/MM` for compact x-axis labels.
 */
function formatShortDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

// --- Section components ---

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
}> = ({ icon, label, value, accent }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
    <div className={`inline-flex items-center justify-center p-2 rounded-xl ${accent}`}>
      {icon}
    </div>
    <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
      {value}
    </div>
    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
      {label}
    </div>
  </div>
);

const SectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <section
    className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 ${className}`}
  >
    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-4">
      {title}
    </h3>
    {children}
  </section>
);

const LoadingSkeleton: React.FC = () => (
  <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-sm">Đang tải thống kê...</p>
    </div>
  </div>
);

const OnboardingCard: React.FC<{ onStartLesson: () => void }> = ({
  onStartLesson,
}) => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-900 p-8 sm:p-10 text-center">
    <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mb-4">
      <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-300" />
    </div>
    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
      Bắt đầu học để xem thống kê!
    </h3>
    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mb-6 max-w-md mx-auto">
      Hoàn thành ít nhất 3 từ vựng để Kiro có thể phân tích tiến độ và đưa ra
      gợi ý phù hợp với bạn.
    </p>
    <Button onClick={onStartLesson} className="shadow-lg">
      <BookOpen className="w-4 h-4 mr-2" />
      Bắt đầu bài học
    </Button>
  </div>
);

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  onBack,
  onStartLesson,
  onStartTargetedLesson,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tracks which weakness category is currently generating a targeted lesson.
  const [generatingCategory, setGeneratingCategory] = useState<string | null>(
    null,
  );
  const [weaknessError, setWeaknessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [
          distribution,
          heatmap,
          quizTrend,
          totalStats,
          goals,
          weaknesses,
        ] = await Promise.all([
          getMasteryDistribution(userId),
          getActivityHeatmap(userId, 30),
          getQuizScoreTrend(userId, 10),
          getTotalStats(userId),
          getOrCreateUserGoals(userId),
          getWeaknessData(userId),
        ]);

        if (cancelled) return;

        // Total incorrect across all weakness patterns is a reasonable
        // proxy for "total incorrect answers" — analyzeWeaknesses only
        // pulls rows that have incorrect_count > 0, so summing
        // errorCount captures the same magnitude needed for the 10+
        // gating per requirement 7.1.
        const totalIncorrect = weaknesses.reduce(
          (sum, w) => sum + w.errorCount,
          0,
        );

        setData({
          distribution,
          heatmap,
          quizTrend,
          totalStats,
          goals,
          weaknesses,
          totalIncorrect,
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
        if (!cancelled) {
          setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handlePracticeWeakness = async (weakness: WeaknessPattern) => {
    if (!data || generatingCategory) return;
    setWeaknessError(null);
    setGeneratingCategory(weakness.category);
    try {
      const lesson = await generateTargetedLesson(
        weakness,
        data.goals.preferred_level,
      );
      onStartTargetedLesson?.(lesson);
    } catch (err) {
      console.error('Failed to generate targeted lesson:', err);
      setWeaknessError(
        'Không thể tạo bài luyện tập. Vui lòng thử lại sau ít phút.',
      );
    } finally {
      setGeneratingCategory(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl p-6 text-center">
          {error ?? 'Đã xảy ra lỗi không xác định.'}
        </div>
      </div>
    );
  }

  const { distribution, heatmap, quizTrend, totalStats, goals, weaknesses, totalIncorrect } = data;
  const { totalWords, masteredWords, dueToday, currentLevel } = totalStats;

  // Onboarding gate — too few words to render meaningful analytics.
  if (totalWords < 3) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            Thống kê
          </h2>
          <div className="w-16" />
        </div>
        <OnboardingCard onStartLesson={onStartLesson} />
      </div>
    );
  }

  // Build chart inputs.
  const masteryBars: BarChartDataPoint[] = MASTERY_BAR_CONFIG.map((cfg) => ({
    label: cfg.label,
    value: distribution[cfg.level] ?? 0,
    color: cfg.color,
  }));

  const quizPoints: LineChartDataPoint[] = quizTrend.map((q) => ({
    label: formatShortDate(q.date),
    value: q.total > 0 ? Math.round((q.score / q.total) * 100) : 0,
  }));

  const showStreakFlame = goals.current_streak >= 3;
  const showWeaknessSection = totalIncorrect >= WEAKNESS_THRESHOLD;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          Phân tích học tập
        </h2>
        <div className="hidden sm:block w-16" />
      </div>

      {/* Section 1 — Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={<BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-300" />}
          label="Tổng số từ"
          value={totalWords}
          accent="bg-blue-100 dark:bg-blue-900/40"
        />
        <SummaryCard
          icon={<Award className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />}
          label="Đã thành thạo"
          value={masteredWords}
          accent="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-300" />}
          label="Cần ôn hôm nay"
          value={dueToday}
          accent="bg-amber-100 dark:bg-amber-900/40"
        />
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />}
          label="Cấp độ hiện tại"
          value={currentLevel}
          accent="bg-indigo-100 dark:bg-indigo-900/40"
        />
      </div>

      {/* Section 2 — 30-day activity heatmap */}
      <SectionCard title="Hoạt động 30 ngày qua">
        <HeatmapGrid data={heatmap} />
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Ít</span>
          <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-700" />
          <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900" />
          <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-700" />
          <div className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
          <span>Nhiều</span>
        </div>
      </SectionCard>

      {/* Section 3 — Mastery distribution */}
      <SectionCard title="Phân bố từ vựng">
        <BarChart data={masteryBars} />
      </SectionCard>

      {/* Section 4 — Quiz score trend */}
      <SectionCard title="Điểm quiz gần đây">
        {quizPoints.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chưa có dữ liệu quiz. Hoàn thành một bài quiz để xem xu hướng.
          </p>
        ) : (
          <LineChart data={quizPoints} />
        )}
      </SectionCard>

      {/* Section 5 — Streak & daily goal */}
      <SectionCard title="Chuỗi học tập & mục tiêu">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Current streak */}
          <div className="flex flex-col items-center justify-center text-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-900/40">
            <div className="flex items-center gap-2 text-3xl sm:text-4xl font-bold text-orange-600 dark:text-orange-300 tabular-nums">
              {showStreakFlame ? <span aria-hidden="true">🔥</span> : <Flame className="w-7 h-7" />}
              <span>{goals.current_streak}</span>
            </div>
            <div className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Ngày liên tiếp
            </div>
          </div>

          {/* Longest streak */}
          <div className="flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-3xl sm:text-4xl font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              <Award className="w-7 h-7 text-amber-500" />
              <span>{goals.longest_streak}</span>
            </div>
            <div className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Kỷ lục dài nhất
            </div>
          </div>

          {/* Daily goal progress */}
          <div className="flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/40">
            <CircularProgress
              value={goals.words_reviewed_today}
              max={goals.daily_word_goal}
              size={80}
            />
            <div className="mt-2 flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <Target className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                {goals.words_reviewed_today}/{goals.daily_word_goal} từ hôm nay
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 6 — Weakness detection */}
      {showWeaknessSection && (
        <SectionCard title="Điểm yếu cần cải thiện">
          {weaknessError && (
            <div className="mb-3 text-sm rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2">
              {weaknessError}
            </div>
          )}
          {weaknesses.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>Tuyệt vời! Không phát hiện điểm yếu nào.</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {weaknesses.map((w) => {
                const Icon = WEAKNESS_ICONS[w.category] ?? AlertTriangle;
                const isImproving = w.status === 'improving';
                const isGenerating = generatingCategory === w.category;
                const exampleWords = Array.from(
                  new Set(w.examples.map((e) => e.word).filter(Boolean)),
                ).slice(0, 3);

                return (
                  <li
                    key={w.category}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="inline-flex items-center justify-center p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                        <Icon className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {w.categoryVi}
                          </h4>
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 tabular-nums">
                            {w.errorCount} lỗi
                          </span>
                          {isImproving && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                              <TrendingUp className="w-3 h-3" />
                              Đang cải thiện
                            </span>
                          )}
                        </div>
                        {exampleWords.length > 0 && (
                          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                            Ví dụ:{' '}
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              {exampleWords.join(', ')}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="sm:flex-shrink-0">
                      <Button
                        onClick={() => handlePracticeWeakness(w)}
                        disabled={isGenerating || generatingCategory !== null}
                        className="w-full sm:w-auto"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          'Luyện tập'
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
