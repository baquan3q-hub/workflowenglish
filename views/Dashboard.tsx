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
  Library,
  Sparkles,
  X,
} from 'lucide-react';
import { DifficultyLevel, UserGoals, UserSettings, VocabularyTemplate, WordRecommendation } from '../types';
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
import TemplateLibraryModal from '../components/TemplateLibraryModal';
import { VOCABULARY_TEMPLATES } from '../data/vocabularyTemplates';

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
const MAX_RECOMMENDATIONS_DISPLAYED = 10;

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

  // --- Template Library state ---
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [hasLearningHistory, setHasLearningHistory] = useState<boolean | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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

    // Check if user has any learning history (for onboarding)
    (async () => {
      try {
        const { count, error: countError } = await supabase
          .from('learning_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (!countError && !cancelled) {
          setHasLearningHistory((count ?? 0) > 0);
        }
      } catch (err) {
        console.error('Failed to check learning history:', err);
        if (!cancelled) setHasLearningHistory(true); // fail closed — hide onboarding
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

  const handleGenerateFromRecommendations = () => {
    if (!recommendations || recommendations.length === 0) return;
    const words = recommendations.slice(0, MAX_RECOMMENDATIONS_DISPLAYED).map(r => r.word).join(', ');
    onGenerate(words, {
      level: (recommendations[0].cefrLevel as DifficultyLevel) || settings.level,
      topic: recommendations[0].topic || settings.topic,
    });
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

  const handleSelectTemplate = (template: VocabularyTemplate) => {
    setShowTemplateLibrary(false);
    setOnboardingDismissed(true);
    const wordsText = template.words.join(', ');
    setInputText(wordsText);
    setSettings({ level: template.cefrLevel, topic: template.topic });
    // Auto-trigger generation
    onGenerate(wordsText, { level: template.cefrLevel, topic: template.topic });
  };

  const showOnboarding = hasLearningHistory === false && inputText.trim() === '' && !onboardingDismissed;
  const featuredTemplates = VOCABULARY_TEMPLATES.slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
      
      {/* Welcome Hero / Header */}
      <div className="text-center space-y-1 py-2">
        <div className="inline-flex items-center justify-center p-2.5 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl mb-1 shadow">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
          VocabMaster
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Biến danh sách từ vựng khô khan thành trải nghiệm học tập AI cá nhân hóa.
        </p>
      </div>

      {/* 1. TOP ROW: Goal Tracker & Personalized Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Personalized Recommendations (lg:col-span-2) */}
        {recsVisible && (
          <section
            aria-labelledby="recommendations-heading"
            className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400">
                  <Lightbulb className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="recommendations-heading"
                    className="text-sm font-bold text-slate-800 dark:text-slate-100"
                  >
                    Từ vựng gợi ý cho bạn
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {fallbackTopicsActive ? 'Chủ đề từ vựng phổ biến' : 'Từ vựng thích ứng theo tiến độ'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRefreshRecommendations}
                  disabled={recsLoading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                  title="Làm mới gợi ý"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {recsError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{recsError}</span>
              </div>
            )}

            {/* Loading skeleton */}
            {recsLoading && (
              <div
                className="flex gap-2.5 overflow-x-auto pb-1"
                aria-busy="true"
                aria-label="Đang tải gợi ý"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-32 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800"
                  />
                ))}
              </div>
            )}

            {/* Personalised word cards (Minimalist style) */}
            {!recsLoading &&
              !fallbackTopicsActive &&
              recommendations &&
              recommendations.length > 0 && (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x">
                    {recommendations
                      .slice(0, MAX_RECOMMENDATIONS_DISPLAYED)
                      .map((rec, idx) => (
                        <article
                          key={`${rec.word}-${idx}`}
                          className="flex-shrink-0 w-32 snap-start rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 p-3 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-xs font-extrabold text-slate-800 dark:text-white truncate" title={rec.word}>
                              {rec.word}
                            </h3>
                            <span className="flex-shrink-0 inline-flex items-center px-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-bold">
                              {rec.cefrLevel}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => appendWordToInput(rec.word)}
                            className="mt-3.5 inline-flex items-center justify-center p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                            title="Học từ này"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </article>
                      ))}
                  </div>

                  <div className="flex justify-end pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={handleGenerateFromRecommendations}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Học 10 từ gợi ý này</span>
                    </button>
                  </div>
                </div>
              )}

            {/* Empty personalised result */}
            {!recsLoading &&
              !fallbackTopicsActive &&
              recommendations &&
              recommendations.length === 0 &&
              !recsError && (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-4">
                  Chưa có gợi ý nào. Thử click icon “Làm mới”.
                </p>
              )}

            {/* Fallback topic suggestion cards */}
            {!recsLoading && fallbackTopicsActive && (
              <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x">
                {FALLBACK_TOPICS.map((t) => (
                  <article
                    key={t.topic}
                    className="flex-shrink-0 w-44 snap-start rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 p-3 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {t.topic}
                      </h3>
                      <div className="flex flex-wrap gap-0.5 mt-1.5">
                        {t.sampleWords.slice(0, 3).map((w) => (
                          <span
                            key={w}
                            className="inline-flex items-center px-1 rounded bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] font-medium"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
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
                      className="mt-3 inline-flex items-center justify-center p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                      title="Thêm từ mẫu vào danh sách"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Goal Tracker Card (lg:col-span-1) */}
        {userGoals && (
          <div className="lg:col-span-1 rounded-3xl border border-amber-200/50 dark:border-amber-500/10 bg-gradient-to-b from-amber-50/40 to-rose-50/10 dark:from-slate-800/50 dark:to-slate-800/70 p-4 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center pb-2 border-b border-amber-200/30 dark:border-slate-700/30">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mục tiêu hôm nay</span>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold text-xs bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full border border-orange-100/50 dark:border-orange-900/10">
                <Flame className="w-3.5 h-3.5" />
                <span>{userGoals.current_streak} ngày</span>
              </div>
            </div>

            <div className="flex items-center gap-4 py-1 justify-center sm:justify-start">
              <CircularProgress
                value={userGoals.words_reviewed_today}
                max={userGoals.daily_word_goal}
                size={68}
              />
              <div className="text-left">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Đã ôn luyện</p>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {userGoals.words_reviewed_today} / {userGoals.daily_word_goal} từ
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/30 dark:border-slate-700/30 flex items-center justify-between gap-2">
              <label htmlFor="daily-goal-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Mục tiêu:
              </label>
              <select
                id="daily-goal-select"
                value={userGoals.daily_word_goal}
                onChange={handleGoalChange}
                disabled={isUpdatingGoal}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 outline-none disabled:opacity-60 shadow-sm"
              >
                <option value={5}>5 từ / ngày</option>
                <option value={10}>10 từ / ngày</option>
                <option value={15}>15 từ / ngày</option>
                <option value={20}>20 từ / ngày</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. SECOND ROW: SRS Review & Compact Library Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SRS Review Card (Minimalist icon only, using custom mic SVG) */}
        {dueCount !== null && (
          <button
            onClick={onStartReview}
            className="relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-4 shadow-sm flex flex-col items-center justify-center text-center space-y-2 hover:border-blue-300 dark:hover:border-blue-700 w-full"
            title="Bắt đầu ôn tập từ vựng"
          >
            <img src="/icon-mic.svg" className="w-14 h-16 object-contain" alt="Spaced Repetition System" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Spaced Repetition System</span>
            {dueCount > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center shadow-sm">
                {dueCount}
              </span>
            )}
            {dueCount > 0 ? (
              <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                Có {dueCount} từ cần ôn tập
              </span>
            ) : (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Đã hoàn thành! 🎉
              </span>
            )}
          </button>
        )}

        {/* Quick Access to Vocabulary Templates Library (Minimalist icon only, using custom book SVG) */}
        {!showOnboarding ? (
          <button
            onClick={() => setShowTemplateLibrary(true)}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-4 shadow-sm flex flex-col items-center justify-center text-center space-y-2 hover:border-blue-300 dark:hover:border-blue-700"
            title="Mở thư viện từ vựng mẫu"
          >
            <BookIconSVG className="w-14 h-16" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Thư viện mẫu</span>
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-4 flex items-center justify-center text-center">
            <p className="text-xs text-slate-400">Sẵn sàng học bài mới</p>
          </div>
        )}
      </div>

      {/* 3. BOTTOM ROW: Magic AI Lesson Generator Panel */}
      <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 dark:border-slate-700/50 space-y-6">
        
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/50">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">AI Lesson Generator</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Tạo bài học thông minh từ danh sách từ vựng của bạn</p>
          </div>
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Target Level (Cấp độ mục tiêu)"
            value={settings.level}
            onChange={(e) => setSettings({ ...settings, level: e.target.value as DifficultyLevel })}
          >
            {Object.values(DifficultyLevel).map(level => (
              <option key={level} value={level}>{level} - {getLevelDesc(level)}</option>
            ))}
          </Select>

          <Select
            label="Topic Context (Chủ đề ngữ cảnh)"
            value={settings.topic}
            onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
          >
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        {/* Input Area */}
        <div className="space-y-2 relative">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex justify-between">
            <span>Danh sách từ vựng cần học</span>
            <span className="text-slate-400 font-normal text-[10px]">Phân cách bởi dấu phẩy</span>
          </label>
          
          <div className="relative">
            <textarea
              className="w-full h-36 p-3.5 pr-10 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none resize-none text-xs text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50"
              placeholder="Nhập các từ: Ephemeral, Serendipity, Luminous..."
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); if (e.target.value.trim()) setOnboardingDismissed(true); }}
            />
            
            {inputText.trim() && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-3 p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                title="Xóa văn bản"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          <div className="relative overflow-hidden w-full sm:w-auto">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".txt"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-900/40 border border-slate-200 dark:border-slate-700"
            >
              <FileText className="w-3.5 h-3.5" />
              Nhập từ file .txt
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!inputText.trim()}
            className="w-full sm:w-auto min-w-[180px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm text-xs"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            Tạo bài học ngay
          </Button>
        </div>
      </div>

      {/* Template Library Modal */}
      <TemplateLibraryModal
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleSelectTemplate}
      />
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

// Custom Premium Book SVG Icon Component replacing Lucide Library (from icon sách.svg)
const BookIconSVG: React.FC<{ className?: string }> = ({ className = "w-14 h-16" }) => (
  <svg className={className} viewBox="0 0 99 113" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_136_1211)">
      <rect x="9.7998" y="60.4429" width="79" height="39.3521" rx="4" fill="#9FB736"/>
    </g>
    <g filter="url(#filter1_d_136_1211)">
      <mask id="path-2-outside-1_136_1211" maskUnits="userSpaceOnUse" x="2.7998" y="4.7998" width="93" height="107" fill="black">
        <rect fill="white" x="2.7998" y="4.7998" width="93" height="107"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M45.9941 10.6294C47.8093 9.56063 50.0525 9.52216 51.9033 10.5278L87.5234 29.8852C89.4692 30.9426 90.6741 32.9863 90.6582 35.2007L90.333 80.103C90.3174 82.228 89.1788 84.1865 87.3398 85.2514L69.6533 95.4936L51.9395 105.751C50.1297 106.799 47.9048 106.83 46.0674 105.832L10.9346 86.7368C9.00289 85.6867 7.7998 83.664 7.7998 81.4653V36.5473C7.79998 34.4222 8.92455 32.4556 10.7559 31.3774L28.3672 21.0073L45.9941 10.6294ZM50.4707 13.1635C49.5454 12.6609 48.424 12.6802 47.5166 13.2143L29.8896 23.5923L12.2773 33.9624L12.1104 34.0688C11.2943 34.6249 10.8 35.5513 10.7998 36.5473V81.4653C10.7998 82.5646 11.4015 83.576 12.3672 84.101L47.5 103.196C48.4186 103.695 49.5308 103.68 50.4355 103.156L68.1494 92.8979L85.8369 82.6548C86.7562 82.1222 87.3253 81.1429 87.333 80.0805L87.6592 35.1792C87.667 34.0721 87.0636 33.0496 86.0908 32.521L50.4707 13.1635Z"/>
      </mask>
      <path fillRule="evenodd" clipRule="evenodd" d="M45.9941 10.6294C47.8093 9.56063 50.0525 9.52216 51.9033 10.5278L87.5234 29.8852C89.4692 30.9426 90.6741 32.9863 90.6582 35.2007L90.333 80.103C90.3174 82.228 89.1788 84.1865 87.3398 85.2514L69.6533 95.4936L51.9395 105.751C50.1297 106.799 47.9048 106.83 46.0674 105.832L10.9346 86.7368C9.00289 85.6867 7.7998 83.664 7.7998 81.4653V36.5473C7.79998 34.4222 8.92455 32.4556 10.7559 31.3774L28.3672 21.0073L45.9941 10.6294ZM50.4707 13.1635C49.5454 12.6609 48.424 12.6802 47.5166 13.2143L29.8896 23.5923L12.2773 33.9624L12.1104 34.0688C11.2943 34.6249 10.8 35.5513 10.7998 36.5473V81.4653C10.7998 82.5646 11.4015 83.576 12.3672 84.101L47.5 103.196C48.4186 103.695 49.5308 103.68 50.4355 103.156L68.1494 92.8979L85.8369 82.6548C86.7562 82.1222 87.3253 81.1429 87.333 80.0805L87.6592 35.1792C87.667 34.0721 87.0636 33.0496 86.0908 32.521L50.4707 13.1635Z" fill="url(#paint0_linear_136_1211)"/>
      <path d="M45.9941 10.6294L48.5309 14.9381L48.531 14.938L45.9941 10.6294ZM51.9033 10.5278L54.2908 6.13461L54.2904 6.13442L51.9033 10.5278ZM87.5234 29.8852L85.136 34.2784L85.136 34.2784L87.5234 29.8852ZM90.6582 35.2007L95.6581 35.2369V35.2365L90.6582 35.2007ZM90.333 80.103L95.3329 80.1397L95.3329 80.1392L90.333 80.103ZM87.3398 85.2514L89.8455 89.5783L89.8456 89.5783L87.3398 85.2514ZM69.6533 95.4936L72.1589 99.8205L72.159 99.8205L69.6533 95.4936ZM51.9395 105.751L49.4338 101.425L49.4338 101.425L51.9395 105.751ZM46.0674 105.832L43.6797 110.225L43.6798 110.225L46.0674 105.832ZM10.9346 86.7368L8.54648 91.1296L8.54693 91.1299L10.9346 86.7368ZM7.7998 36.5473L2.7998 36.5469V36.5473H7.7998ZM10.7559 31.3774L13.2927 35.6861L13.2929 35.686L10.7559 31.3774ZM28.3672 21.0073L25.8304 16.6986L25.8302 16.6987L28.3672 21.0073ZM50.4707 13.1635L52.8581 8.77035L52.8573 8.7699L50.4707 13.1635ZM47.5166 13.2143L44.9803 8.90539L44.9798 8.90563L47.5166 13.2143ZM29.8896 23.5923L27.3529 19.2836L27.3527 19.2836L29.8896 23.5923ZM12.2773 33.9624L9.74044 29.6538L9.66429 29.6986L9.58978 29.7461L12.2773 33.9624ZM12.1104 34.0688L9.42278 29.8525L9.35816 29.8937L9.29482 29.9369L12.1104 34.0688ZM10.7998 36.5473L5.7998 36.5465V36.5473H10.7998ZM12.3672 84.101L9.97876 88.4937L9.97954 88.4941L12.3672 84.101ZM47.5 103.196L45.1124 107.589L45.1125 107.589L47.5 103.196ZM50.4355 103.156L52.9407 107.483L52.9412 107.483L50.4355 103.156ZM68.1494 92.8979L70.655 97.2248L70.6552 97.2247L68.1494 92.8979ZM85.8369 82.6548L88.3427 86.9816L88.3434 86.9811L85.8369 82.6548ZM87.333 80.0805L82.3331 80.0442V80.0442L87.333 80.0805ZM87.6592 35.1792L92.659 35.2155V35.2147L87.6592 35.1792ZM86.0908 32.521L83.7034 36.9142L83.7034 36.9142L86.0908 32.521ZM45.9941 10.6294L48.531 14.938C48.8333 14.76 49.2076 14.7535 49.5162 14.9212L51.9033 10.5278L54.2904 6.13442C50.8974 4.29085 46.7853 4.36125 43.4573 6.32071L45.9941 10.6294ZM51.9033 10.5278L49.5159 14.921L85.136 34.2784L87.5234 29.8852L89.9109 25.492L54.2908 6.13461L51.9033 10.5278ZM87.5234 29.8852L85.136 34.2784C85.4596 34.4543 85.661 34.7949 85.6583 35.1648L90.6582 35.2007L95.6581 35.2365C95.6872 31.1776 93.4787 27.4309 89.9109 25.492L87.5234 29.8852ZM90.6582 35.2007L85.6583 35.1644L85.3331 80.0668L90.333 80.103L95.3329 80.1392L95.6581 35.2369L90.6582 35.2007ZM90.333 80.103L85.3331 80.0663C85.3305 80.4204 85.1407 80.7471 84.8341 80.9246L87.3398 85.2514L89.8456 89.5783C93.217 87.6258 95.3043 84.0355 95.3329 80.1397L90.333 80.103ZM87.3398 85.2514L84.8342 80.9246L67.1477 91.1668L69.6533 95.4936L72.159 99.8205L89.8455 89.5783L87.3398 85.2514ZM69.6533 95.4936L67.1477 91.1667L49.4338 101.425L51.9395 105.751L54.4451 110.078L72.1589 99.8205L69.6533 95.4936ZM51.9395 105.751L49.4338 101.425C49.1312 101.6 48.7603 101.604 48.455 101.438L46.0674 105.832L43.6798 110.225C47.0493 112.056 51.1283 111.999 54.4451 110.078L51.9395 105.751ZM46.0674 105.832L48.455 101.438L13.3222 82.3437L10.9346 86.7368L8.54693 91.1299L43.6797 110.225L46.0674 105.832ZM10.9346 86.7368L13.3227 82.3439C13.0001 82.1686 12.7998 81.8311 12.7998 81.4653H7.7998H2.7998C2.7998 85.4969 5.00565 89.2047 8.54648 91.1296L10.9346 86.7368ZM7.7998 81.4653H12.7998V36.5473H7.7998H2.7998V81.4653H7.7998ZM7.7998 36.5473L12.7998 36.5477C12.7998 36.194 12.9871 35.866 13.2927 35.6861L10.7559 31.3774L8.21901 27.0688C4.86196 29.0453 2.80012 32.6505 2.7998 36.5469L7.7998 36.5473ZM10.7559 31.3774L13.2929 35.686L30.9042 25.3158L28.3672 21.0073L25.8302 16.6987L8.21885 27.0689L10.7559 31.3774ZM28.3672 21.0073L30.9039 25.316L48.5309 14.9381L45.9941 10.6294L43.4574 6.32067L25.8304 16.6986L28.3672 21.0073ZM50.4707 13.1635L52.8573 8.7699C50.3901 7.42971 47.4003 7.48091 44.9803 8.90539L47.5166 13.2143L50.0529 17.5233C49.4478 17.8795 48.7008 17.8922 48.0841 17.5572L50.4707 13.1635ZM47.5166 13.2143L44.9798 8.90563L27.3529 19.2836L29.8896 23.5923L32.4264 27.901L50.0534 17.523L47.5166 13.2143ZM29.8896 23.5923L27.3527 19.2836L9.74044 29.6538L12.2773 33.9624L14.8143 38.271L32.4266 27.9009L29.8896 23.5923ZM12.2773 33.9624L9.58978 29.7461L9.42278 29.8525L12.1104 34.0688L14.7979 38.2851L14.9649 38.1786L12.2773 33.9624ZM12.1104 34.0688L9.29482 29.9369C7.11851 31.4199 5.80024 33.8894 5.7998 36.5465L10.7998 36.5473L15.7998 36.5481C15.7997 37.2132 15.47 37.83 14.9259 38.2007L12.1104 34.0688ZM10.7998 36.5473H5.7998V81.4653H10.7998H15.7998V36.5473H10.7998ZM10.7998 81.4653H5.7998C5.7998 84.3978 7.40448 87.094 9.97876 88.4937L12.3672 84.101L14.7556 79.7084C15.3985 80.0579 15.7998 80.7313 15.7998 81.4653H10.7998ZM12.3672 84.101L9.97954 88.4941L45.1124 107.589L47.5 103.196L49.8876 98.8027L14.7548 79.708L12.3672 84.101ZM47.5 103.196L45.1125 107.589C47.5635 108.921 50.5294 108.879 52.9407 107.483L50.4355 103.156L47.9304 98.8286C48.5322 98.4802 49.2737 98.469 49.8875 98.8026L47.5 103.196ZM50.4355 103.156L52.9412 107.483L70.655 97.2248L68.1494 92.8979L65.6438 88.571L47.9299 98.8289L50.4355 103.156ZM68.1494 92.8979L70.6552 97.2247L88.3427 86.9816L85.8369 82.6548L83.3312 78.3279L65.6437 88.5711L68.1494 92.8979ZM85.8369 82.6548L88.3434 86.9811C90.7949 85.5609 92.3123 82.9498 92.3329 80.1168L87.333 80.0805L82.3331 80.0442C82.3383 79.3361 82.7175 78.6835 83.3304 78.3284L85.8369 82.6548ZM87.333 80.0805L92.3329 80.1169L92.659 35.2155L87.6592 35.1792L82.6593 35.1428L82.3331 80.0442L87.333 80.0805ZM87.6592 35.1792L92.659 35.2147C92.68 32.2614 91.0715 29.537 88.4782 28.1278L86.0908 32.521L83.7034 36.9142C83.0557 36.5622 82.6541 35.8827 82.6593 35.1437L87.6592 35.1792ZM86.0908 32.521L88.4783 28.1278L52.8581 8.77035L50.4707 13.1635L48.0833 17.5567L83.7034 36.9142L86.0908 32.521ZM47.0791 13.3983C48.2533 12.7394 49.6803 12.7156 50.876 13.3348L86.4971 31.784C87.8338 32.4764 88.6695 33.8607 88.6582 35.3661L88.334 77.9139C88.323 79.3596 87.5323 80.687 86.2666 81.3856L68.6328 91.118L50.8672 100.924C49.697 101.569 48.2815 101.588 47.0947 100.973L11.96 82.7743C10.6331 82.0868 9.79981 80.7169 9.7998 79.2225V36.659C9.7999 35.2126 10.5814 33.8786 11.8428 33.1707L29.4004 23.3182L47.0791 13.3983ZM12.0039 34.2557L11.9941 34.2635C12.0473 34.2234 12.102 34.185 12.1582 34.1483C12.1056 34.1827 12.0539 34.2183 12.0039 34.2557Z" fill="url(#paint2_linear_136_1211)"/>
    </g>
    <g opacity="0.41">
      <path fillRule="evenodd" clipRule="evenodd" d="M40.5601 21.952C41.0862 21.8046 41.6243 21.8743 41.9383 21.9087L41.9394 21.9095L41.9504 21.9101L45.1218 22.2575C48.211 22.1836 48.9757 25.1296 46.1442 26.1501C42.1321 27.5955 37.5774 29.2833 33.7308 30.8269C31.8073 31.5989 30.0667 32.3323 28.6625 32.9801C27.2445 33.6343 26.2131 34.1816 25.6724 34.5795C23.682 36.0446 22.081 37.6581 20.9764 38.91C20.4252 39.5347 19.9992 40.0671 19.712 40.4421C19.5684 40.6296 19.46 40.7781 19.3875 40.8787C19.3514 40.9287 19.3238 40.9671 19.306 40.9926C19.2973 41.0049 19.2903 41.0146 19.286 41.0207C19.2842 41.0233 19.283 41.0257 19.282 41.0271L19.2803 41.0293C19.0995 41.352 18.6646 41.6469 18.1114 41.5764C17.507 41.4991 17.3623 41.0698 17.4922 40.7216C18.0962 39.1027 18.8849 37.2858 19.8554 35.6583C20.8179 34.0441 21.9916 32.5592 23.3989 31.6561C29.342 27.8427 33.2935 25.5148 35.9179 24.0947C38.5291 22.6817 39.8621 22.1477 40.5601 21.952Z" fill="url(#paint3_linear_136_1211)" style={{ mixBlendMode: 'luminosity' }}/>
    </g>
    <g filter="url(#filter3_d_136_1211)">
      <path d="M51.5474 78.2153C52.1963 78.1975 52.7509 78.1933 53.2056 78.2388C53.6701 78.2852 53.9566 78.3777 54.1206 78.4976C54.2475 78.5903 54.3412 78.7269 54.3413 79.0278C54.3413 79.6494 53.9066 80.3053 53.0034 80.8325C52.1124 81.3526 50.8483 81.6899 49.4253 81.6899C48.0024 81.6899 46.7382 81.3526 45.8472 80.8325C44.9439 80.3052 44.5083 79.6495 44.5083 79.0278C44.5084 78.7269 44.6021 78.5903 44.729 78.4976C44.8929 78.3777 45.1796 78.2852 45.644 78.2388C46.0988 78.1933 46.6541 78.1975 47.3032 78.2153C47.9418 78.2329 48.6684 78.2632 49.4253 78.2632C50.1822 78.2632 50.9087 78.2329 51.5474 78.2153Z" fill="#FF6D00" stroke="#FF6D00"/>
      <path d="M21.7998 75.7024V47.0098C21.7998 45.7599 22.9336 44.8162 24.1628 45.043L49.154 49.6554L74.6936 45.0333C75.9209 44.8112 77.0498 45.7542 77.0498 47.0014V60.8742V75.7024C77.0498 76.8069 76.1636 77.7024 75.059 77.7024H49.154H23.7907C22.6861 77.7024 21.7998 76.807 21.7998 75.7024Z" stroke="#FF6D00" strokeWidth="3"/>
      <path opacity="0.85" d="M25.5913 44.0459H26.6746H27.758V77.7023H25.5913V44.0459Z" fill="#DCD594"/>
      <rect x="24.5078" y="45.168" width="1.08333" height="32.5345" fill="#F6F2D1"/>
      <rect x="23.4248" y="46.2896" width="1.08333" height="31.4126" fill="#DCD594"/>
      <rect x="22.3413" y="47.4116" width="1.08333" height="30.2907" fill="#F6F2D1"/>
      <path d="M25.5913 77.7021H22.3413H27.758" stroke="#FF6D00"/>
      <path opacity="0.85" d="M73.2578 44.0459H72.1745H71.0911V77.7023H73.2578V44.0459Z" fill="#DCD594"/>
      <rect width="1.08333" height="32.5345" transform="matrix(-1 0 0 1 74.3408 45.168)" fill="#F6F2D1"/>
      <rect width="1.08333" height="31.4126" transform="matrix(-1 0 0 1 75.4243 46.2896)" fill="#DCD594"/>
      <rect width="1.08333" height="30.2907" transform="matrix(-1 0 0 1 76.5078 47.4116)" fill="#F6F2D1"/>
      <path d="M74.3413 77.7021H77.5913H72.1746" stroke="#FF6D00"/>
      <path d="M49.425 76.5805V48.4607C49.425 48.4607 44.425 43.5702 39.9805 42.3478C34.0869 40.7267 29.9471 43.1265 28.4141 44.2576C27.9783 44.5793 27.7583 45.0992 27.7583 45.6409V76.5805L49.425 76.5805Z" fill="#FCFAEE" stroke="#F6F2D1"/>
      <path d="M49.4246 76.5805V48.4607C49.4246 48.4607 54.4246 43.5702 58.8691 42.3478C64.7628 40.7267 68.9025 43.1265 70.4355 44.2576C70.8714 44.5793 71.0913 45.0992 71.0913 45.6409V76.5805L49.4246 76.5805Z" fill="#FCFAEE" stroke="#F6F2D1"/>
      <path d="M49.4248 48.5337V76.5807" stroke="#FBDEB1" strokeLinecap="round"/>
      <path d="M32.0913 47.9726C32.0913 47.9726 35.8414 47.4116 38.5913 47.4116C41.3412 47.4116 44.5496 49.6554 44.5496 49.6554" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M67.2998 47.9726C67.2998 47.9726 63.5497 47.4116 60.7998 47.4116C58.0499 47.4116 54.8415 49.6554 54.8415 49.6554" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M32.0913 56.9477C32.0913 56.9477 35.8414 56.3867 38.5913 56.3867C41.3412 56.3867 44.5496 58.6305 44.5496 58.6305" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M67.2998 56.9477C67.2998 56.9477 63.5497 56.3867 60.7998 56.3867C58.0499 56.3867 54.8415 58.6305 54.8415 58.6305" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M32.0913 52.46C32.0913 52.46 35.8414 52.46 38.5913 52.46C41.3412 52.46 44.5496 54.1428 44.5496 54.1428" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M67.2998 52.46C67.2998 52.46 64.0914 52.46 61.3415 52.46C58.5915 52.46 54.8415 54.1428 54.8415 54.1428" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M32.0913 61.435C32.0913 61.435 35.8414 60.874 38.5913 60.874C41.3412 60.874 44.5496 63.1178 44.5496 63.1178" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M67.2998 61.435C67.2998 61.435 63.5497 60.874 60.7998 60.874C58.0499 60.874 54.8415 63.1178 54.8415 63.1178" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M32.0913 67.0448C32.0913 67.0448 35.8414 66.4839 38.5913 66.4839C41.3412 66.4839 44.5496 68.7276 44.5496 68.7276" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M67.2998 67.0448C67.2998 67.0448 63.5497 66.4839 60.7998 66.4839C58.0499 66.4839 54.8415 68.7276 54.8415 68.7276" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M32.0913 71.5321C32.0913 71.5321 35.8414 70.9712 38.5913 70.9712C41.3412 70.9712 44.5496 73.215 44.5496 73.215" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M67.2998 71.5321C67.2998 71.5321 63.5497 70.9712 60.7998 70.9712C58.0499 70.9712 54.8415 73.215 54.8415 73.215" stroke="#F5C67D" strokeOpacity={0.66} style={{ mixBlendMode: 'darken' }} strokeLinecap="round"/>
      <path d="M50.707 77.0903C51.0971 77.0769 51.4111 77.0747 51.6611 77.106C51.9154 77.1377 52.0304 77.1957 52.082 77.2427C52.1145 77.2723 52.1748 77.344 52.1748 77.5747C52.1748 78.0309 51.922 78.4875 51.4277 78.8481C50.934 79.2083 50.2274 79.4458 49.4248 79.4458C48.6222 79.4458 47.9157 79.2083 47.4219 78.8481C46.9277 78.4875 46.6748 78.0309 46.6748 77.5747C46.6748 77.344 46.7351 77.2723 46.7676 77.2427C46.8192 77.1957 46.9342 77.1377 47.1885 77.106C47.4385 77.0747 47.7525 77.0769 48.1426 77.0903C48.5197 77.1033 48.9646 77.1265 49.4248 77.1265C49.885 77.1265 50.3299 77.1033 50.707 77.0903Z" fill="#FBDEB1" stroke="#FBDEB1"/>
    </g>
    <defs>
      <filter id="filter0_d_136_1211" x="6.6998" y="60.4429" width="85.2" height="48.4521" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="6"/>
        <feGaussianBlur stdDeviation="1.55"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_136_1211"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_136_1211" result="shape"/>
      </filter>
      <filter id="filter1_d_136_1211" x="-0.000195265" y="-0.000195265" width="98.4584" height="112.36" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="-2"/>
        <feGaussianBlur stdDeviation="1.4"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_136_1211"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_136_1211" result="shape"/>
      </filter>
      <filter id="filter2_i_136_1211" x="9.7998" y="12.8867" width="78.8584" height="89.0347" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="1"/>
        <feGaussianBlur stdDeviation="0.25"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow_136_1211"/>
      </filter>
      <filter id="filter3_d_136_1211" x="17.4998" y="41.3018" width="63.85" height="46.6882" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="3"/>
        <feGaussianBlur stdDeviation="1.4"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_136_1211"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_136_1211" result="shape"/>
      </filter>
      <linearGradient id="paint0_linear_136_1211" x1="49.7998" y1="5.68716" x2="49.2035" y2="109.896" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFDF3F"/>
        <stop offset="1" stopColor="#95B335"/>
      </linearGradient>
      <linearGradient id="paint1_linear_136_1211" x1="49.2291" y1="9.7998" x2="49.2291" y2="106.56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFDF3F"/>
        <stop offset="1" stopColor="#95B335"/>
      </linearGradient>
      <linearGradient id="paint2_linear_136_1211" x1="49.2291" y1="12.8867" x2="49.2291" y2="101.422" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7AC571" stopOpacity={0.82}/>
        <stop offset={0.548078} stopColor="#49953E"/>
      </linearGradient>
      <linearGradient id="paint3_linear_136_1211" x1="31.4293" y1="23.102" x2="33.5547" y2="39.6327" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF5F5"/>
        <stop offset="1" stopColor="#E0D7D7"/>
      </linearGradient>
    </defs>
  </svg>
);

export default Dashboard;
