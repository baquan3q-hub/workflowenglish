import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Upload,
  Wand2,
  FileText,
  AlertCircle,
  Repeat,
  Flame,
  Target,
  Lightbulb,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { DifficultyLevel, UserGoals, UserSettings, WordRecommendation } from '../types';
import { Button, Select } from '../components/Common';
import { getDueWordCount } from '../services/masteryService';
import { getOrCreateUserGoals, updateDailyGoal } from '../services/goalService';
import { CircularProgress } from '../components/SVGCharts';
import { supabase } from '../services/supabaseClient';
import {
  generateRecommendations,
  getCachedRecommendations,
  cacheRecommendations,
  clearRecommendationCache,
  getTopStudiedTopics,
  getMasteredWordsList,
} from '../services/recommendationService';

interface DashboardProps {
  onGenerate: (text: string, settings: UserSettings) => void;
  isLoading: boolean;
  userId: string;
  onStartReview: () => void;
}

const TOPICS = [
  "General Communication",
  "Business & Office",
  "Travel & Tourism",
  "Academic & IELTS",
  "Technology",
  "Food & Dining",
  "Health & Lifestyle"
];

/** Minimum lessons completed before personalised recommendations appear (Req 5.1). */
const RECOMMENDATIONS_LESSON_THRESHOLD = 3;

/** Minimum distinct topics studied before showing personalised (vs. fallback) recs (Req 5.5). */
const PERSONALISED_TOPIC_THRESHOLD = 2;

/** Maximum recommendations rendered horizontally. */
const MAX_RECOMMENDATIONS_DISPLAYED = 5;

/**
 * Fallback topic suggestion cards shown when the user hasn't studied
 * enough distinct topics for personalisation (Requirement 5.5).
 */
interface FallbackTopic {
  topic: string;
  description: string;
  sampleWords: string[];
}

const FALLBACK_TOPICS: FallbackTopic[] = [
  {
    topic: 'Du lịch',
    description: 'Từ vựng cho chuyến đi của bạn',
    sampleWords: ['itinerary', 'destination', 'passport', 'reservation', 'sightseeing'],
  },
  {
    topic: 'Công việc',
    description: 'Giao tiếp nơi công sở',
    sampleWords: ['deadline', 'meeting', 'colleague', 'project', 'feedback'],
  },
  {
    topic: 'Đời sống',
    description: 'Tiếng Anh hằng ngày',
    sampleWords: ['routine', 'neighbour', 'grocery', 'hobby', 'weekend'],
  },
];

const Dashboard: React.FC<DashboardProps> = ({ onGenerate, isLoading, userId, onStartReview }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    level: DifficultyLevel.B1,
    topic: TOPICS[0]
  });

  // --- Personalised recommendations state (Requirement 5) ---
  /** null until we know whether to show the section; false hides it entirely. */
  const [recsVisible, setRecsVisible] = useState<boolean | null>(null);
  const [recommendations, setRecommendations] = useState<WordRecommendation[] | null>(null);
  const [fallbackTopicsActive, setFallbackTopicsActive] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    (async () => {
      try {
        const count = await getDueWordCount(userId);
        if (!cancelled) setDueCount(count);
      } catch (err) {
        console.error('Failed to load due word count:', err);
        if (!cancelled) setDueCount(0);
      }
    })();

    (async () => {
      try {
        const goals = await getOrCreateUserGoals(userId);
        if (!cancelled) setUserGoals(goals);
      } catch (err) {
        console.error('Failed to load user goals:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Load personalised recommendations for the dashboard. Skips entirely
   * if the user has < 3 lessons (Req 5.1). Falls back to popular topic
   * suggestions when the user has studied < 2 distinct topics (Req 5.5).
   * Honours a 24h localStorage cache (Req 5.4).
   */
  const loadRecommendations = useCallback(
    async (opts: { skipCache?: boolean } = {}) => {
      if (!userId) return;
      const { skipCache = false } = opts;

      setRecsError(null);
      setRecsLoading(true);
      try {
        // Lessons gate (Req 5.1): only show after 3+ lessons.
        const { count, error: countError } = await supabase
          .from('learning_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (countError) throw countError;

        const lessonCount = count ?? 0;
        if (lessonCount < RECOMMENDATIONS_LESSON_THRESHOLD) {
          setRecsVisible(false);
          setRecommendations(null);
          setFallbackTopicsActive(false);
          return;
        }

        setRecsVisible(true);

        // Try cache first (Req 5.4).
        if (!skipCache) {
          const cached = getCachedRecommendations(userId);
          if (cached && cached.length > 0) {
            setRecommendations(cached);
            setFallbackTopicsActive(false);
            return;
          }
        }

        // Decide between personalised vs. fallback topic suggestions (Req 5.5).
        const topTopics = await getTopStudiedTopics(userId);
        if (topTopics.length < PERSONALISED_TOPIC_THRESHOLD) {
          setFallbackTopicsActive(true);
          setRecommendations(null);
          return;
        }

        // Personalised path.
        const masteredWords = await getMasteredWordsList(userId);
        const currentLevel = userGoals?.preferred_level || DifficultyLevel.B1;
        const recs = await generateRecommendations(
          topTopics,
          currentLevel,
          masteredWords,
        );
        setRecommendations(recs);
        setFallbackTopicsActive(false);
        if (recs.length > 0) cacheRecommendations(userId, recs);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
        setRecsError('Không thể tải gợi ý. Vui lòng thử lại sau.');
        setRecommendations(null);
        setFallbackTopicsActive(false);
      } finally {
        setRecsLoading(false);
      }
    },
    [userId, userGoals?.preferred_level],
  );

  useEffect(() => {
    if (!userId) return;
    void loadRecommendations();
  }, [userId, loadRecommendations]);

  const handleRefreshRecommendations = () => {
    if (!userId) return;
    clearRecommendationCache(userId);
    void loadRecommendations({ skipCache: true });
  };

  /** Append a word to the textarea (comma-separated if non-empty). */
  const appendWordToInput = (word: string) => {
    setInputText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return word;
      // Avoid duplicate appends if the user clicks twice.
      const existing = trimmed
        .split(/[,\n]+/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
      if (existing.includes(word.trim().toLowerCase())) return prev;
      const sep = trimmed.endsWith(',') ? ' ' : ', ';
      return `${trimmed}${sep}${word}`;
    });
  };

  const handleGoalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGoal = parseInt(e.target.value, 10);
    if (!userId || Number.isNaN(newGoal) || !userGoals) return;

    // Optimistic update so the dropdown feels instant.
    const previous = userGoals;
    setUserGoals({ ...userGoals, daily_word_goal: newGoal });
    setIsUpdatingGoal(true);
    try {
      const updated = await updateDailyGoal(userId, newGoal);
      setUserGoals(updated);
    } catch (err) {
      console.error('Failed to update daily goal:', err);
      setUserGoals(previous);
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (file) {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setInputText(content);
        };
        reader.onerror = () => {
          setError("Failed to read file.");
        };
        reader.readAsText(file);
      } else {
        setError("Please upload a valid .txt file. PDF parsing requires server-side processing.");
      }
    }
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      onGenerate(inputText, settings);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-fade-in px-4 sm:px-0">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-3 sm:mb-4">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">VocabMaster</h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
          Transform your vocabulary list into an immersive learning experience with AI.
        </p>
      </div>

      {/* Goal Progress + Streak Row */}
      {userGoals && (
        <div className="rounded-2xl border border-amber-200/70 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Left: Progress Circle */}
            <div className="flex items-center gap-3 justify-self-center sm:justify-self-start">
              <CircularProgress
                value={userGoals.words_reviewed_today}
                max={userGoals.daily_word_goal}
                size={64}
              />
              <div className="text-left">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mục tiêu hôm nay
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                  {userGoals.words_reviewed_today} / {userGoals.daily_word_goal} từ
                </p>
              </div>
            </div>

            {/* Center: Streak */}
            <div className="flex items-center gap-2 justify-center">
              <Flame
                className={`w-6 h-6 ${
                  userGoals.current_streak >= 3
                    ? 'text-orange-500'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
                aria-hidden="true"
              />
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Streak
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {userGoals.current_streak >= 3 ? '🔥 ' : ''}
                  {userGoals.current_streak} ngày liên tiếp
                </p>
              </div>
            </div>

            {/* Right: Daily Goal Selector */}
            <div className="flex items-center gap-2 justify-self-center sm:justify-self-end">
              <Target
                className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <label
                  htmlFor="daily-goal-select"
                  className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  Mục tiêu mỗi ngày
                </label>
                <select
                  id="daily-goal-select"
                  value={userGoals.daily_word_goal}
                  onChange={handleGoalChange}
                  disabled={isUpdatingGoal}
                  className="mt-0.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-60"
                >
                  <option value={5}>5 từ/ngày</option>
                  <option value={10}>10 từ/ngày</option>
                  <option value={15}>15 từ/ngày</option>
                  <option value={20}>20 từ/ngày</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SRS Review Card */}
      {dueCount !== null && dueCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="bg-white/20 backdrop-blur p-3 rounded-xl">
                  <Repeat className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-amber-400 text-amber-900 text-xs font-bold shadow-md animate-pulse">
                  {dueCount}
                </span>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold leading-tight">
                  📚 {dueCount} từ cần ôn tập
                </h2>
                <p className="text-sm text-blue-100 mt-0.5">
                  Ôn lại các từ đã học để ghi nhớ lâu dài.
                </p>
              </div>
            </div>
            <Button
              onClick={onStartReview}
              className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-blue-50 hover:text-indigo-800 shadow-md whitespace-nowrap"
            >
              <Repeat className="w-4 h-4 mr-2" />
              Bắt đầu ôn tập
            </Button>
          </div>
        </div>
      )}

      {dueCount === 0 && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          ✅ Không có từ cần ôn hôm nay
        </div>
      )}

      {/* Personalised Recommendations Section (Requirement 5) */}
      {recsVisible && (
        <section
          aria-labelledby="recommendations-heading"
          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                <Lightbulb className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="recommendations-heading"
                  className="text-lg font-bold text-slate-800 dark:text-slate-100"
                >
                  Gợi ý cho bạn
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fallbackTopicsActive
                    ? 'Khám phá các chủ đề phổ biến để mở rộng vốn từ.'
                    : 'Từ vựng phù hợp với trình độ và sở thích của bạn.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefreshRecommendations}
              disabled={recsLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Làm mới gợi ý"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Làm mới gợi ý</span>
            </button>
          </div>

          {recsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{recsError}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {recsLoading && (
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
              aria-busy="true"
              aria-label="Đang tải gợi ý"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-44 h-40 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Personalised word cards */}
          {!recsLoading &&
            !fallbackTopicsActive &&
            recommendations &&
            recommendations.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                {recommendations
                  .slice(0, MAX_RECOMMENDATIONS_DISPLAYED)
                  .map((rec, idx) => (
                    <article
                      key={`${rec.word}-${idx}`}
                      className="flex-shrink-0 w-52 snap-start rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight break-words">
                          {rec.word}
                        </h3>
                        <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-semibold tracking-wide">
                          {rec.cefrLevel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                        {rec.meaningVietnamese}
                      </p>
                      <span className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium">
                        {rec.topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => appendWordToInput(rec.word)}
                        className="mt-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        Học từ này
                      </button>
                    </article>
                  ))}
              </div>
            )}

          {/* Empty personalised result */}
          {!recsLoading &&
            !fallbackTopicsActive &&
            recommendations &&
            recommendations.length === 0 &&
            !recsError && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Chưa có gợi ý nào. Thử nhấn “Làm mới gợi ý”.
              </p>
            )}

          {/* Fallback topic suggestion cards (Req 5.5) */}
          {!recsLoading && fallbackTopicsActive && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {FALLBACK_TOPICS.map((t) => (
                <article
                  key={t.topic}
                  className="flex-shrink-0 w-60 snap-start rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-2"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t.topic}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {t.sampleWords.map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setInputText((prev) => {
                        const joined = t.sampleWords.join(', ');
                        const trimmed = prev.trim();
                        if (!trimmed) return joined;
                        const sep = trimmed.endsWith(',') ? ' ' : ', ';
                        return `${trimmed}${sep}${joined}`;
                      })
                    }
                    className="mt-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Thêm từ mẫu
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 space-y-5 sm:space-y-6">
        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Target Level"
            value={settings.level}
            onChange={(e) => setSettings({ ...settings, level: e.target.value as DifficultyLevel })}
          >
            {Object.values(DifficultyLevel).map(level => (
              <option key={level} value={level}>{level} - {getLevelDesc(level)}</option>
            ))}
          </Select>

          <Select
            label="Topic Context"
            value={settings.topic}
            onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
          >
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
            <span>Vocabulary List</span>
            <span className="text-slate-400 font-normal text-xs">Enter words, comma separated or pasted text</span>
          </label>
          <textarea
            className="w-full h-40 p-4 rounded-xl border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 transition-colors"
            placeholder="e.g. Serendipity, Ephemeral, Luminous..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="relative overflow-hidden">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".txt"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            >
              <FileText className="w-4 h-4" />
              Import from .txt
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!inputText.trim()}
            className="w-full md:w-auto min-w-[200px]"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Lesson
          </Button>
        </div>
      </div>
    </div>
  );
};

const getLevelDesc = (level: DifficultyLevel) => {
  switch (level) {
    case 'A1': return 'Beginner';
    case 'A2': return 'Elementary';
    case 'B1': return 'Intermediate';
    case 'B2': return 'Upper Intermediate';
    case 'C1': return 'Advanced';
    case 'C2': return 'Proficient';
    default: return '';
  }
}

export default Dashboard;
