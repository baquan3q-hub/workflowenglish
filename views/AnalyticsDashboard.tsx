import React, { useEffect, useState, useCallback } from 'react';
import { withTimeout } from '../services/supabaseClient';
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
  getHardestWords,
  getAllTrackedWords,
  HeatmapEntry,
  QuizScorePoint,
  TotalStats,
} from '../services/analyticsService';
import { getOrCreateUserGoals } from '../services/goalService';
import {
  getWeaknessData,
  generateTargetedLesson,
  generateHardestWordsLesson,
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
  hardestWords: any[];
  allTrackedWords: any[];
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
  const [isGeneratingHardest, setIsGeneratingHardest] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'learning' | 'reviewing' | 'due' | 'lapsed' | 'mastered'>('all');
  const [visibleWordCount, setVisibleWordCount] = useState<number>(8);
  const [visibleQuizCount, setVisibleQuizCount] = useState<number>(3);

  useEffect(() => {
    setVisibleWordCount(8);
  }, [selectedFilter]);

  const allTrackedWords = data?.allTrackedWords ?? [];

  const counts = React.useMemo(() => {
    const now = new Date();
    return {
      all: allTrackedWords.length,
      new: allTrackedWords.filter(w => w.mastery_level === MasteryLevel.NEW).length,
      learning: allTrackedWords.filter(w => w.mastery_level === MasteryLevel.LEARNING).length,
      reviewing: allTrackedWords.filter(w => w.mastery_level === MasteryLevel.REVIEWING).length,
      due: allTrackedWords.filter(w => w.next_review_date && new Date(w.next_review_date) <= now).length,
      lapsed: allTrackedWords.filter(w => w.mastery_level === MasteryLevel.LAPSED).length,
      mastered: allTrackedWords.filter(w => w.mastery_level === MasteryLevel.MASTERED).length,
    };
  }, [allTrackedWords]);

  const filteredWordsList = React.useMemo(() => {
    const now = new Date();
    switch (selectedFilter) {
      case 'new':
        return allTrackedWords.filter(w => w.mastery_level === MasteryLevel.NEW);
      case 'learning':
        return allTrackedWords.filter(w => w.mastery_level === MasteryLevel.LEARNING);
      case 'reviewing':
        return allTrackedWords.filter(w => w.mastery_level === MasteryLevel.REVIEWING);
      case 'due':
        return allTrackedWords.filter(w => w.next_review_date && new Date(w.next_review_date) <= now);
      case 'lapsed':
        return allTrackedWords.filter(w => w.mastery_level === MasteryLevel.LAPSED);
      case 'mastered':
        return allTrackedWords.filter(w => w.mastery_level === MasteryLevel.MASTERED);
      case 'all':
      default:
        return allTrackedWords;
    }
  }, [allTrackedWords, selectedFilter]);

  const load = useCallback(async () => {
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
        hardestWords,
        allTrackedWords,
      ] = await withTimeout(
        Promise.all([
          getMasteryDistribution(userId),
          getActivityHeatmap(userId, 30),
          getQuizScoreTrend(userId, 10),
          getTotalStats(userId),
          getOrCreateUserGoals(userId),
          getWeaknessData(userId),
          getHardestWords(userId, 5),
          getAllTrackedWords(userId),
        ]),
        12000
      );

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
        hardestWords,
        allTrackedWords,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [load]);

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

  const handlePracticeHardestWords = async () => {
    if (!data || !data.hardestWords || data.hardestWords.length === 0 || isGeneratingHardest) return;
    setWeaknessError(null);
    setIsGeneratingHardest(true);
    try {
      const lesson = await generateHardestWordsLesson(
        data.hardestWords,
        data.goals.preferred_level || 'B1',
      );
      onStartTargetedLesson?.(lesson);
    } catch (err) {
      console.error('Failed to generate hardest words lesson:', err);
      setWeaknessError(
        'Không thể tạo bài luyện tập từ từ khó. Vui lòng thử lại sau ít phút.',
      );
    } finally {
      setIsGeneratingHardest(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <p className="font-semibold">{error ?? 'Đã xảy ra lỗi không xác định.'}</p>
          <Button onClick={load} className="shadow-md">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const { distribution, heatmap, quizTrend, totalStats, goals, weaknesses, totalIncorrect, hardestWords } = data;
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

      {/* Section 2 — 7-day study activity chart */}
      <SectionCard title="Hoạt động học tập (7 ngày qua)">
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Biểu đồ dưới đây thể hiện số lượng từ vựng bạn đã ôn tập và học tập mỗi ngày trong tuần qua. Hãy duy trì chuỗi học tập đều đặn nhé!
          </p>
          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-200 dark:border-slate-700">
            {heatmap.slice(-7).map((day, index) => {
              // Calculate height percent
              const maxCount = Math.max(...heatmap.slice(-7).map(d => d.count), 1);
              const percent = (day.count / maxCount) * 100;
              // Format date label (e.g., "Hôm nay" if today, or "DD/MM")
              const isToday = index === 6; // since slice(-7) takes the last 7 elements, index 6 is the today element
              const label = isToday ? 'Hôm nay' : formatShortDate(day.date);
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="relative w-full flex justify-center">
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none z-10">
                      {day.count} từ
                    </span>
                  </div>
                  
                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                      day.count > 0 
                        ? 'bg-gradient-to-t from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 hover:from-blue-600 hover:to-indigo-700 shadow-sm' 
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                    style={{ height: `${Math.max(day.count > 0 ? percent * 0.8 : 4, 4)}%` }}
                  />
                  
                  {/* Label */}
                  <span className={`text-[10px] font-bold tracking-tight truncate max-w-full ${isToday ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {label}
                  </span>
                  
                  {/* Count indicator below label */}
                  <span className={`text-[10px] font-extrabold tabular-nums ${day.count > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                    {day.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Section 3 — Mastery distribution */}
      <SectionCard title="Phân bố từ vựng">
        <BarChart data={masteryBars} />
      </SectionCard>

      {/* Section 3.5 — Top 5 Hardest Words */}
      {hardestWords && hardestWords.length > 0 && (
        <SectionCard title="Top 5 Từ Vựng Khó Nhất">
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Đây là những từ vựng bạn đã trả lời sai nhiều nhất trong các phiên học. Hãy luyện tập lại ngay để tăng khả năng ghi nhớ dài hạn!
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50/20 dark:bg-slate-900/10">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/40">
                    <th className="py-3 px-4">Từ vựng</th>
                    <th className="py-3 px-4">Phiên âm</th>
                    <th className="py-3 px-4">Nghĩa tiếng Việt</th>
                    <th className="py-3 px-4 text-center">Đúng / Sai</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {hardestWords.map((word) => (
                    <tr key={word.word} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-950 dark:text-white font-sans flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base">{word.word}</span>
                        {word.part_of_speech && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                            {word.part_of_speech}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {word.ipa ? `/${word.ipa}/` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {word.meaning_vi || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold tabular-nums text-xs sm:text-sm">
                        <span className="text-emerald-600 dark:text-emerald-500">{word.correct_count ?? 0}đ</span>
                        <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-red-500 dark:text-red-400">{word.incorrect_count ?? 0}s</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold
                          ${word.mastery_level === MasteryLevel.MASTERED ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                            word.mastery_level === MasteryLevel.REVIEWING ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                            word.mastery_level === MasteryLevel.LEARNING ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                            word.mastery_level === MasteryLevel.LAPSED ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
                            'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {word.mastery_level === MasteryLevel.MASTERED ? 'Thành thạo' :
                           word.mastery_level === MasteryLevel.REVIEWING ? 'Ôn tập' :
                           word.mastery_level === MasteryLevel.LEARNING ? 'Đang học' :
                           word.mastery_level === MasteryLevel.LAPSED ? 'Cần ôn lại' : 'Mới'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handlePracticeHardestWords}
                disabled={isGeneratingHardest}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingHardest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Đang thiết lập bài học...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-1" />
                    Luyện tập từ khó ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Section 3.6 — Sổ Tay Từ Vựng & Trạng Thái Ghi Nhớ */}
      <SectionCard title="Sổ Tay Từ Vựng & Trạng Thái Ghi Nhớ">
        <div className="space-y-6">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Dưới đây là danh sách toàn bộ từ vựng bạn đã tích lũy và học tập. Sử dụng bộ lọc dưới đây để theo dõi lộ trình giãn cách khoảng cách ôn tập (Spaced Repetition) và tối ưu hóa tiến trình ghi nhớ của bạn.
          </p>

          {/* Filter Tabs/Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-none sm:-mx-0 sm:px-0">
            {[
              { id: 'all', label: 'Tất cả', count: counts.all, color: 'border-slate-300 dark:border-slate-700 bg-slate-100/50 text-slate-700 dark:text-slate-300', activeColor: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' },
              { id: 'new', label: '🌱 Từ mới', count: counts.new, color: 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400', activeColor: 'bg-slate-400 text-white dark:bg-slate-500 dark:text-white' },
              { id: 'learning', label: '🚀 Đang học', count: counts.learning, color: 'border-yellow-200 dark:border-yellow-900/40 text-yellow-600 dark:text-yellow-400', activeColor: 'bg-yellow-500 text-white dark:bg-yellow-400 dark:text-slate-900' },
              { id: 'reviewing', label: '📚 Ôn tập', count: counts.reviewing, color: 'border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400', activeColor: 'bg-blue-500 text-white dark:bg-blue-400 dark:text-white' },
              { id: 'due', label: '⏰ Cần ôn tập', count: counts.due, color: 'border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400', activeColor: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-900 font-bold' },
              { id: 'lapsed', label: '⚠️ Đã quên', count: counts.lapsed, color: 'border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400', activeColor: 'bg-red-500 text-white dark:bg-red-400 dark:text-white' },
              { id: 'mastered', label: '🎉 Thành thạo', count: counts.mastered, color: 'border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400', activeColor: 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-white' },
            ].map((tab) => {
              const isActive = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id as any)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 active:scale-95 ${
                    isActive
                      ? `${tab.activeColor} border-transparent shadow-sm`
                      : `bg-white hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 ${tab.color}`
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-current'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards Grid or Empty State */}
          {filteredWordsList.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                {filteredWordsList.slice(0, visibleWordCount).map((word) => {
                  // Determine style based on mastery level
                  let cardStyle = 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10';
                  let badgeText = 'Mới';
                  let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                  let dotColor = 'bg-slate-400';

                  if (word.mastery_level === MasteryLevel.MASTERED) {
                    cardStyle = 'border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/20 to-teal-50/10 dark:from-emerald-950/10 dark:to-teal-950/10 shadow-sm';
                    badgeText = 'Thành thạo';
                    badgeColor = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
                    dotColor = 'bg-emerald-500';
                  } else if (word.mastery_level === MasteryLevel.REVIEWING) {
                    cardStyle = 'border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/20 to-indigo-50/10 dark:from-blue-950/10 dark:to-indigo-950/10';
                    badgeText = 'Ôn tập';
                    badgeColor = 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
                    dotColor = 'bg-blue-500';
                  } else if (word.mastery_level === MasteryLevel.LEARNING) {
                    cardStyle = 'border-yellow-100 dark:border-yellow-900/40 bg-gradient-to-br from-yellow-50/20 to-amber-50/10 dark:from-yellow-950/10 dark:to-amber-950/10';
                    badgeText = 'Đang học';
                    badgeColor = 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
                    dotColor = 'bg-yellow-500';
                  } else if (word.mastery_level === MasteryLevel.LAPSED) {
                    cardStyle = 'border-red-100 dark:border-red-900/40 bg-gradient-to-br from-red-50/20 to-rose-50/10 dark:from-red-950/10 dark:to-rose-950/10';
                    badgeText = 'Đã quên';
                    badgeColor = 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
                    dotColor = 'bg-red-500';
                  }

                  // Check if due for review
                  const isDue = word.next_review_date && new Date(word.next_review_date) <= new Date();

                  return (
                    <div
                      key={word.word}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 ${cardStyle}`}
                    >
                      <div>
                        {/* Top row: Word and Mastery Level */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                            <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg break-all whitespace-normal" title={word.word}>
                              {word.word}
                            </span>
                            {word.part_of_speech && (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                                {word.part_of_speech}
                              </span>
                            )}
                          </div>
                          {isDue && (
                            <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold shadow-sm animate-pulse">
                              ⏰ Cần ôn
                            </span>
                          )}
                        </div>

                        {/* IPA */}
                        {word.ipa && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-2">
                            /{word.ipa}/
                          </p>
                        )}

                        {/* Vietnamese Meaning */}
                        <p className="text-sm text-slate-800 dark:text-slate-200 font-bold mb-2 break-words">
                          {word.meaning_vi || '(Chưa cập nhật nghĩa)'}
                        </p>

                        {/* English Definition */}
                        {word.definition_en && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic whitespace-normal break-words mb-3 border-l-2 border-slate-200 dark:border-slate-700 pl-2" title={word.definition_en}>
                            {word.definition_en}
                          </p>
                        )}
                      </div>

                      {/* Footer badge */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {badgeText}
                        </span>
                        {word.correct_count !== undefined && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                            Tỷ lệ: {word.correct_count + word.incorrect_count > 0 
                              ? Math.round((word.correct_count / (word.correct_count + word.incorrect_count)) * 100) 
                              : 100}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredWordsList.length > 8 && (
                <div className="flex justify-center pt-4">
                  {visibleWordCount < filteredWordsList.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleWordCount(filteredWordsList.length)}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-extrabold shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                    >
                      <span>Xem thêm ({filteredWordsList.length - visibleWordCount} từ khác)</span>
                      <span className="text-xs">▼</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVisibleWordCount(8)}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-extrabold shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                    >
                      <span>Thu gọn danh sách</span>
                      <span className="text-xs">▲</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Premium Empty State */
            <div className="text-center py-12 px-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800/80 max-w-xl mx-auto animate-fade-in">
              {selectedFilter === 'all' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="sprout">🌱</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                    Chào mừng bạn đến với Sổ Tay Từ Vựng!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bạn chưa có từ vựng nào trong danh sách học tập. Hãy quay lại trang chủ và bắt đầu một bài học mới để lưu trữ những từ vựng đầu tiên nhé!
                  </p>
                </>
              )}
              {selectedFilter === 'new' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="shining-star">✨</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                    Không có từ mới nào!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tất cả các từ vựng đã được học ít nhất một lần. Từ mới sẽ tự động xuất hiện tại đây khi bạn khởi tạo và bắt đầu học một bài mới.
                  </p>
                </>
              )}
              {selectedFilter === 'learning' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="rocket">🚀</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                    Không có từ nào đang học!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bạn đã ôn tập hoặc thành thạo toàn bộ từ vựng hiện có. Hãy tích cực học thêm các từ mới từ gợi ý thông minh trên Dashboard nhé!
                  </p>
                </>
              )}
              {selectedFilter === 'reviewing' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="books">📚</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                    Trống lịch trình ôn tập!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Không có từ vựng nào đang ở trạng thái ôn tập định kỳ. Hãy kiên trì học và làm bài ôn để tích lũy và chuyển dịch trạng thái ghi nhớ của các từ.
                  </p>
                </>
              )}
              {selectedFilter === 'due' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="celebration">🎉</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">
                    Tuyệt vời! Đã hoàn thành ôn tập
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Chúc mừng! Bạn không còn từ vựng nào đến hạn cần ôn hôm nay. Trí nhớ dài hạn của bạn đang ở trạng thái cực kỳ tốt và được củng cố vững chắc!
                  </p>
                </>
              )}
              {selectedFilter === 'lapsed' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="strong-arm">💪</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                    Giữ vững phong độ tuyệt đỉnh!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Không có bất kỳ từ vựng nào bị quên (Lapsed). Khả năng phản xạ và ghi nhớ của bạn thực sự xuất sắc, hãy duy trì lịch ôn tập hàng ngày nhé!
                  </p>
                </>
              )}
              {selectedFilter === 'mastered' && (
                <>
                  <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-label="crown">👑</span>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                    Chinh phục Trí nhớ dài hạn!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Chưa có từ vựng nào đạt mốc <b>Thành thạo</b>. Để một từ đạt mốc này, hãy ôn tập chính xác và đều đặn để giãn khoảng cách ôn tập vượt mốc <b>21 ngày</b>! Bạn sẽ làm được thôi!
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 4 — Quiz score trend */}
      <SectionCard title="Điểm số Quiz gần đây">
        {quizTrend.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chưa có dữ liệu bài trắc nghiệm. Hãy hoàn thành một bài quiz sau bài học để theo dõi kết quả tại đây!
          </p>
        ) : (
          <div className="space-y-6">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Biểu đồ và bảng dưới đây theo dõi kết quả 10 bài kiểm tra trắc nghiệm (Quiz) gần nhất của bạn. Điểm số cao thể hiện khả năng ghi nhớ từ vựng tốt.
            </p>
            
            {/* SVG Line Chart */}
            <div className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <LineChart data={quizPoints} />
            </div>

            {/* List of quiz scores (Newest first) */}
            <div className="space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Chi tiết các bài Quiz đã làm
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/40">
                      <th className="py-2.5 px-4">Ngày làm</th>
                      <th className="py-2.5 px-4 text-center">Điểm số</th>
                      <th className="py-2.5 px-4">Thành tích</th>
                      <th className="py-2.5 px-4">Tỷ lệ chính xác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {quizTrend.slice().reverse().slice(0, visibleQuizCount).map((q, index) => {
                      const percent = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
                      
                      // Determine badge and color based on percentage
                      let gradeLabel = 'Cần cố gắng 💪';
                      let gradeClass = 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300';
                      let progressColor = 'bg-amber-500';

                      if (percent >= 90) {
                        gradeLabel = 'Xuất sắc 👑';
                        gradeClass = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-extrabold';
                        progressColor = 'bg-emerald-500';
                      } else if (percent >= 70) {
                        gradeLabel = 'Đạt 👍';
                        gradeClass = 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-bold';
                        progressColor = 'bg-blue-500';
                      }

                      return (
                        <tr key={`${q.date}-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 font-mono">
                            {formatShortDate(q.date)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                            {q.score} / {q.total}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${gradeClass}`}>
                              {gradeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-850">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-[10px] sm:text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300 w-8 text-right font-mono">
                                {percent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {quizTrend.length > 3 && (
                <div className="flex justify-center pt-2">
                  {visibleQuizCount < quizTrend.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleQuizCount(quizTrend.length)}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-extrabold shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                    >
                      <span>Xem thêm ({quizTrend.length - visibleQuizCount} bài kiểm tra khác)</span>
                      <span className="text-xs">▼</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVisibleQuizCount(3)}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-extrabold shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                    >
                      <span>Thu gọn lịch sử</span>
                      <span className="text-xs">▲</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
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
