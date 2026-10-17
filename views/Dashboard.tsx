import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  LayoutGrid,
  Plus,
  RefreshCw,
  Repeat,
  Sparkles,
  X,
} from 'lucide-react';
import { DifficultyLevel, UserGoals, UserSettings, VocabularyTemplate, WordRecommendation } from '../types';
import { getDueWordCount } from '../services/masteryService';
import { getOrCreateUserGoals, updateDailyGoal } from '../services/goalService';
import { supabase } from '../services/supabaseClient';
import {
  generateRecommendations,
  getCachedRecommendations,
  cacheRecommendations,
  clearRecommendationCache,
  getTopStudiedTopics,
  getMasteredWordsList,
} from '../services/recommendationService';
import { getLessonLists, getLibraryWords } from '../services/vocabLibraryService';
import { listProgress, matchesStatus, type LessonList, type LibraryWord } from '../services/vocabLibraryLogic';
import { countInputWords, lessonMinutes, pickPrimaryAction } from '../services/dashboardLogic';
import { Skeleton } from '../components/ui/States';
import TemplateLibraryModal from '../components/TemplateLibraryModal';
import { VOCABULARY_TEMPLATES } from '../data/vocabularyTemplates';

interface DashboardProps {
  onGenerate: (text: string, settings: UserSettings) => void;
  isLoading: boolean;
  userId: string;
  onStartReview: () => void;
  /** Lesson open in this session; the dashboard then leads with "Tiếp tục". */
  activeLesson?: { topic: string } | null;
  onContinueLesson?: () => void;
  /** Open a lesson's words in Sổ từ. */
  onOpenLesson?: (lessonListId: string) => void;
}

/** Sent to the AI as the lesson context; the label is what the learner sees. */
const TOPICS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'General Communication', label: 'Giao tiếp' },
  { value: 'Business & Office', label: 'Công việc' },
  { value: 'Travel & Tourism', label: 'Du lịch' },
  { value: 'Academic & IELTS', label: 'Học thuật & IELTS' },
  { value: 'Technology', label: 'Công nghệ' },
  { value: 'Food & Dining', label: 'Ẩm thực' },
  { value: 'Health & Lifestyle', label: 'Sức khoẻ' },
];

const LEVEL_DESC: Record<DifficultyLevel, string> = {
  [DifficultyLevel.A1]: 'Mới bắt đầu',
  [DifficultyLevel.A2]: 'Sơ cấp',
  [DifficultyLevel.B1]: 'Trung cấp',
  [DifficultyLevel.B2]: 'Trung cao cấp',
  [DifficultyLevel.C1]: 'Nâng cao',
  [DifficultyLevel.C2]: 'Thành thạo',
};

/** Minimum lessons completed before personalised recommendations appear (Req 5.1). */
const RECOMMENDATIONS_LESSON_THRESHOLD = 3;
/** Minimum distinct topics studied before showing personalised (vs. fallback) recs (Req 5.5). */
const PERSONALISED_TOPIC_THRESHOLD = 2;
const MAX_RECOMMENDATIONS_DISPLAYED = 10;
const RECENT_LESSONS = 4;

/** Shown when the user hasn't studied enough distinct topics for personalisation (Req 5.5). */
const FALLBACK_WORDS: ReadonlyArray<{ topic: string; words: string[] }> = [
  { topic: 'Du lịch', words: ['itinerary', 'destination', 'passport', 'reservation', 'sightseeing'] },
  { topic: 'Công việc', words: ['deadline', 'meeting', 'colleague', 'project', 'feedback'] },
  { topic: 'Đời sống', words: ['routine', 'neighbour', 'grocery', 'hobby', 'weekend'] },
];

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800';
const chipBase =
  'inline-flex min-h-touch flex-shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors';
const chipOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const sectionTitle = 'text-sm font-semibold text-slate-900 dark:text-white';

const relativeDay = (iso: string, now: Date): string => {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 30) return `${days} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
};

/** Daily goal ring: words reviewed today out of the goal. */
const GoalRing: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const met = value >= max;
  return (
    <div className="relative h-[72px] w-[72px] flex-shrink-0" role="img" aria-label={`Đã ôn ${value} trên ${max} từ hôm nay`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={met ? 'stroke-emerald-500' : 'stroke-slate-900 dark:stroke-white'}
          style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none" aria-hidden="true">
        <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
        <span className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">/{max}</span>
      </span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  onGenerate,
  isLoading,
  userId,
  onStartReview,
  activeLesson = null,
  onContinueLesson,
  onOpenLesson,
}) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ level: DifficultyLevel.B1, topic: TOPICS[0].value });
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Recent lessons with SRS progress (null while loading).
  const [recent, setRecent] = useState<{ lessons: LessonList[]; byWord: Map<string, LibraryWord> } | null>(null);

  // Personalised recommendations (Requirement 5).
  const [recsVisible, setRecsVisible] = useState<boolean | null>(null);
  const [recommendations, setRecommendations] = useState<WordRecommendation[] | null>(null);
  const [fallbackTopicsActive, setFallbackTopicsActive] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    getDueWordCount(userId)
      .then((count) => !cancelled && setDueCount(count))
      .catch((err) => {
        console.error('Failed to load due word count:', err);
        if (!cancelled) setDueCount(0);
      });

    getOrCreateUserGoals(userId)
      .then((goals) => !cancelled && setUserGoals(goals))
      .catch((err) => console.error('Failed to load user goals:', err));

    (async () => {
      try {
        const words = await getLibraryWords(userId);
        const byWord = new Map(words.map((w) => [w.word, w]));
        const lessons = await getLessonLists(userId, new Set(byWord.keys()));
        if (!cancelled) setRecent({ lessons: lessons.slice(0, RECENT_LESSONS), byWord });
      } catch (err) {
        console.error('Failed to load recent lessons:', err);
        if (!cancelled) setRecent({ lessons: [], byWord: new Map() });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Personalised recommendations. Skipped below 3 lessons (Req 5.1); popular
   * words when fewer than 2 topics were studied (Req 5.5); 24h cache (Req 5.4).
   */
  const loadRecommendations = useCallback(
    async (opts: { skipCache?: boolean } = {}) => {
      if (!userId) return;
      setRecsError(null);
      setRecsLoading(true);
      try {
        const { count, error: countError } = await supabase
          .from('learning_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (countError) throw countError;
        if ((count ?? 0) < RECOMMENDATIONS_LESSON_THRESHOLD) {
          setRecsVisible(false);
          setRecommendations(null);
          setFallbackTopicsActive(false);
          return;
        }
        setRecsVisible(true);

        if (!opts.skipCache) {
          const cached = getCachedRecommendations(userId);
          if (cached && cached.length > 0) {
            setRecommendations(cached);
            setFallbackTopicsActive(false);
            return;
          }
        }

        const topTopics = await getTopStudiedTopics(userId);
        if (topTopics.length < PERSONALISED_TOPIC_THRESHOLD) {
          setFallbackTopicsActive(true);
          setRecommendations(null);
          return;
        }

        const masteredWords = await getMasteredWordsList(userId);
        const currentLevel = userGoals?.preferred_level || DifficultyLevel.B1;
        const recs = await generateRecommendations(topTopics, currentLevel, masteredWords);
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
    if (userId) void loadRecommendations();
  }, [userId, loadRecommendations]);

  const handleRefreshRecommendations = () => {
    if (!userId) return;
    clearRecommendationCache(userId);
    void loadRecommendations({ skipCache: true });
  };

  /** Append words to the textarea, skipping ones already there. */
  const appendWords = (words: string[]) => {
    setInputText((prev) => {
      const existing = new Set(prev.split(/[,;\n]+/).map((w) => w.trim().toLowerCase()).filter(Boolean));
      const fresh = words.filter((w) => !existing.has(w.trim().toLowerCase()));
      if (fresh.length === 0) return prev;
      const trimmed = prev.trim().replace(/,$/, '');
      return trimmed ? `${trimmed}, ${fresh.join(', ')}` : fresh.join(', ');
    });
  };

  const handleGoalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGoal = parseInt(e.target.value, 10);
    if (!userId || Number.isNaN(newGoal) || !userGoals) return;
    const previous = userGoals;
    setUserGoals({ ...userGoals, daily_word_goal: newGoal });
    setIsUpdatingGoal(true);
    try {
      setUserGoals(await updateDailyGoal(userId, newGoal));
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
    if (!file) return;
    if (file.type !== 'text/plain') {
      setError('Chỉ nhận file .txt.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setInputText(String(event.target?.result ?? ''));
    reader.onerror = () => setError('Không đọc được file.');
    reader.readAsText(file);
    e.target.value = '';
  };

  /** Fill the form from a template; the learner still presses "Tạo bài học". */
  const applyTemplate = (template: VocabularyTemplate) => {
    setShowTemplateLibrary(false);
    setInputText(template.words.join(', '));
    setSettings({ level: template.cefrLevel, topic: template.topic });
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = () => {
    if (inputText.trim()) onGenerate(inputText, settings);
  };

  const action = pickPrimaryAction({ activeLesson, dueCount, wrongSentences: 0 });
  const wordCount = countInputWords(inputText);
  const minutes = lessonMinutes(wordCount);
  const now = useMemo(() => new Date(), [recent]);
  // Templates at the chosen level first, then the rest.
  const templates = useMemo(
    () => [...VOCABULARY_TEMPLATES].sort((a, b) => Number(b.cefrLevel === settings.level) - Number(a.cefrLevel === settings.level)),
    [settings.level],
  );
  const suggestions = !fallbackTopicsActive ? (recommendations ?? []).slice(0, MAX_RECOMMENDATIONS_DISPLAYED) : [];

  const runPrimary = () => {
    if (action.kind === 'continue') onContinueLesson?.();
    else if (action.kind === 'review') onStartReview();
    else inputRef.current?.focus();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Main card: the one thing to do now, with today's goal */}
      <section className={`${panel} p-5 sm:p-6`} aria-labelledby="dash-primary">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Hôm nay</p>
            <h1 id="dash-primary" className="mt-1 text-heading font-bold text-slate-900 dark:text-white">
              {action.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{action.detail}</p>
            {action.kind !== 'new' && (
              <button type="button" onClick={runPrimary} className={`${primaryBtn} mt-4 w-full sm:w-auto`}>
                {action.kind === 'continue' ? (
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                )}
                {action.kind === 'continue' ? 'Tiếp tục' : 'Bắt đầu ôn'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            {userGoals ? (
              <>
                <GoalRing value={userGoals.words_reviewed_today} max={userGoals.daily_word_goal} />
                <div className="space-y-1.5">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
                    {userGoals.current_streak} ngày liên tiếp
                  </p>
                  <label className="flex items-center gap-1.5 text-caption text-slate-500 dark:text-slate-400">
                    Mục tiêu
                    <select
                      value={userGoals.daily_word_goal}
                      onChange={handleGoalChange}
                      disabled={isUpdatingGoal}
                      className="min-h-touch rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {[5, 10, 15, 20, 30].map((n) => (
                        <option key={n} value={n}>
                          {n} từ/ngày
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <>
                <Skeleton circle className="h-[72px] w-[72px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </>
            )}
          </div>
        </div>
        {action.kind !== 'review' && (dueCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={onStartReview}
            className="mt-4 inline-flex min-h-touch items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Repeat className="h-4 w-4" aria-hidden="true" />
            Còn {dueCount} từ đến hạn ôn
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </section>

      {/* New lesson */}
      <section className={`${panel} space-y-5 p-5 sm:p-6`} aria-labelledby="dash-new">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dash-new" className="text-title font-semibold text-slate-900 dark:text-white">
            Tạo bài mới
          </h2>
          <button type="button" onClick={() => setShowTemplateLibrary(true)} className={ghostBtn}>
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Thư viện mẫu</span>
            <span className="sr-only sm:hidden">Thư viện mẫu</span>
          </button>
        </div>

        <div>
          <h3 className="sr-only">Mẫu bộ từ</h3>
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 scrollbar-none sm:-mx-6 sm:px-6">
            {templates.slice(0, 8).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className="w-44 flex-shrink-0 snap-start rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-800"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t.name}</span>
                  <span className="flex-shrink-0 text-caption font-medium text-slate-500 dark:text-slate-400">{t.cefrLevel}</span>
                </span>
                <span className="mt-1 block truncate text-caption text-slate-500 dark:text-slate-400">
                  {t.samplePreview.join(', ')}
                </span>
                <span className="mt-2 block text-caption tabular-nums text-slate-400 dark:text-slate-500">{t.words.length} từ</span>
              </button>
            ))}
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className="text-caption font-medium text-slate-500 dark:text-slate-400">Cấp độ</legend>
          <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {Object.values(DifficultyLevel).map((level) => {
              const on = settings.level === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={on}
                  title={LEVEL_DESC[level]}
                  onClick={() => setSettings((s) => ({ ...s, level }))}
                  className={`${chipBase} ${on ? chipOn : chipOff}`}
                >
                  {level}
                  {on && <span className="text-caption opacity-80">{LEVEL_DESC[level]}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="text-caption font-medium text-slate-500 dark:text-slate-400">Chủ đề</legend>
          <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {TOPICS.map((t) => {
              const on = settings.topic === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSettings((s) => ({ ...s, topic: t.value }))}
                  className={`${chipBase} ${on ? chipOn : chipOff}`}
                >
                  {t.label}
                </button>
              );
            })}
            {!TOPICS.some((t) => t.value === settings.topic) && (
              <span className={`${chipBase} ${chipOn}`}>
                {settings.topic}
              </span>
            )}
          </div>
        </fieldset>

        <div>
          <label htmlFor="lesson-words" className="flex items-baseline justify-between gap-2">
            <span className="text-caption font-medium text-slate-500 dark:text-slate-400">Từ cần học</span>
            <span className="text-caption text-slate-400 dark:text-slate-500">Cách nhau bằng dấu phẩy hoặc xuống dòng</span>
          </label>
          <div className="relative mt-2">
            <textarea
              id="lesson-words"
              ref={inputRef}
              className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus-visible:ring-slate-700"
              placeholder="resilient, allocate, itinerary…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            {inputText.trim() && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-1 top-1 inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Xoá danh sách từ"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-300" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        {recsVisible && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-caption font-medium text-slate-500 dark:text-slate-400">
                {fallbackTopicsActive ? 'Từ phổ biến' : 'Gợi ý cho bạn'}
              </h3>
              <button
                type="button"
                onClick={handleRefreshRecommendations}
                disabled={recsLoading}
                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-50 dark:hover:text-slate-200"
                aria-label="Làm mới gợi ý"
                title="Làm mới gợi ý"
              >
                <RefreshCw className={`h-4 w-4 ${recsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
            {recsError && <p className="text-sm text-rose-600 dark:text-rose-300">{recsError}</p>}
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" aria-busy={recsLoading}>
              {recsLoading
                ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-24 flex-shrink-0 rounded-xl" />)
                : fallbackTopicsActive
                  ? FALLBACK_WORDS.map((t) => (
                      <button key={t.topic} type="button" onClick={() => appendWords(t.words)} className={`${chipBase} ${chipOff}`}>
                        <Plus className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {t.topic}
                        <span className="text-caption text-slate-400">{t.words.length} từ</span>
                      </button>
                    ))
                  : suggestions.map((rec, i) => (
                      <button
                        key={`${rec.word}-${i}`}
                        type="button"
                        onClick={() => appendWords([rec.word])}
                        className={`${chipBase} ${chipOff}`}
                        aria-label={`Thêm ${rec.word}`}
                      >
                        <Plus className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {rec.word}
                        <span className="text-caption text-slate-400">{rec.cefrLevel}</span>
                      </button>
                    ))}
              {!recsLoading && !fallbackTopicsActive && suggestions.length > 1 && (
                <button type="button" onClick={() => appendWords(suggestions.map((r) => r.word))} className={ghostBtn}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Thêm tất cả
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <input type="file" id="file-upload" className="sr-only" onChange={handleFileUpload} accept=".txt" />
            <label htmlFor="file-upload" className={`${ghostBtn} cursor-pointer`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Nhập từ file .txt
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {wordCount > 0 && (
              <p className="inline-flex items-center justify-center gap-1.5 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {wordCount} từ · ~{minutes} phút
              </p>
            )}
            <button type="button" onClick={handleSubmit} disabled={!inputText.trim() || isLoading} className={primaryBtn}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              {isLoading ? 'Đang tạo bài…' : 'Tạo bài học'}
            </button>
          </div>
        </div>
      </section>

      {/* Recent lessons with SRS progress */}
      {(recent === null || recent.lessons.length > 0) && (
        <section aria-labelledby="dash-recent" className="space-y-3">
          <h2 id="dash-recent" className={sectionTitle}>
            Bài gần đây
          </h2>
          <ul className={`${panel} divide-y divide-slate-100 dark:divide-slate-800`}>
            {recent === null
              ? Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="space-y-2 p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-1.5 w-full" />
                  </li>
                ))
              : recent.lessons.map((l) => {
                  const p = listProgress(l.words, recent.byWord);
                  const due = l.words.filter((w) => {
                    const rec = recent.byWord.get(w);
                    return !!rec && matchesStatus(rec, 'due', now);
                  }).length;
                  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => onOpenLesson?.(l.id)}
                        className="flex min-h-touch w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{l.topic}</p>
                            <p className="flex-shrink-0 text-caption tabular-nums text-slate-500 dark:text-slate-400">
                              {p.done}/{p.total} đã nhớ
                            </p>
                          </div>
                          <div
                            className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Tiến độ ${l.topic}`}
                          >
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1.5 text-caption text-slate-500 dark:text-slate-400">
                            {relativeDay(l.lastAt, now)}
                            {l.lessonCount > 1 && ` · ${l.lessonCount} bài`}
                            {due > 0 && <span className="text-slate-700 dark:text-slate-200"> · {due} từ đến hạn</span>}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
          </ul>
        </section>
      )}

      <TemplateLibraryModal
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={applyTemplate}
      />
    </div>
  );
};

export default Dashboard;
