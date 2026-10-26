import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  LayoutGrid,
  PenLine,
  Plus,
  RefreshCw,
  Repeat,
  Sparkles,
  X,
} from 'lucide-react';
import { DifficultyLevel, SentenceItem, UserGoals, UserSettings, VocabularyTemplate, WordRecommendation } from '../types';
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
import { aiErrorMessage } from '../services/aiClient';
import { getWrongSentences } from '../services/sentenceService';
import { getLessonLists, getLibraryWords } from '../services/vocabLibraryService';
import { listProgress, matchesStatus, type LessonList, type LibraryWord } from '../services/vocabLibraryLogic';
import { countInputWords, greeting, heroCardText, lessonMinutes, pickPrimaryAction, streakWeek } from '../services/dashboardLogic';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { overallBand, PRACTISED_SKILLS, skillProgress } from '../services/ieltsProgressLogic';
import type { IeltsAttempt } from '../types';
import { Skeleton } from '../components/ui/States';
import { IconTile } from '../components/ui/IconTile';
import { TONE_HOVER, toneClasses, type Tone } from '../components/ui/palette';
import { ghostBtn, panel, primaryBtn } from '../components/ui/styles';
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
  /** Practise sentences answered "Cần sửa" earlier. */
  onPracticeSentences?: (items: SentenceItem[]) => void;
  onStartVocabTest?: () => void;
  /** Opens the IELTS roadmap. */
  onOpenIelts?: () => void;
  /** Opens Thống kê (streak and history). */
  onOpenStats?: () => void;
  /** Shown in the greeting. */
  displayName?: string;
}

/** Sent to the AI as the lesson context; the label is what the learner sees. */
const TOPICS: ReadonlyArray<{ value: string; label: string; tone: Tone }> = [
  { value: 'General Communication', label: 'Giao tiếp', tone: 'sky' },
  { value: 'Business & Office', label: 'Công việc', tone: 'periwinkle' },
  { value: 'Travel & Tourism', label: 'Du lịch', tone: 'aqua' },
  { value: 'Academic & IELTS', label: 'Học thuật & IELTS', tone: 'lavender' },
  { value: 'Technology', label: 'Công nghệ', tone: 'mint' },
  { value: 'Food & Dining', label: 'Ẩm thực', tone: 'peach' },
  { value: 'Health & Lifestyle', label: 'Sức khoẻ', tone: 'blush' },
];

/** CEFR levels from fresh mint to warm peach as they get harder. */
const LEVEL_TONE: Record<DifficultyLevel, Tone> = {
  [DifficultyLevel.A1]: 'mint',
  [DifficultyLevel.A2]: 'aqua',
  [DifficultyLevel.B1]: 'sky',
  [DifficultyLevel.B2]: 'periwinkle',
  [DifficultyLevel.C1]: 'lavender',
  [DifficultyLevel.C2]: 'peach',
};

/** Rotating tones for template cards and recent lessons, so neighbours never match. */
const CARD_TONES: readonly Tone[] = ['sky', 'mint', 'peach', 'lavender', 'butter', 'aqua', 'blush', 'periwinkle'];
const cardTone = (i: number) => CARD_TONES[i % CARD_TONES.length];

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

const chipBase =
  'press group inline-flex min-h-touch flex-shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all duration-200';
/**
 * Chip tone styling:
 * - Unselected: clean background with colored border only. On hover, fills with tone color and lifts cleanly.
 * - Selected: vibrant tone tile fill + tone border + font-semibold.
 */
const toneChip = (tone: Tone, on: boolean) => {
  const t = toneClasses(tone);
  const hoverBg = TONE_HOVER[tone];
  if (on) {
    return `${chipBase} ${t.border} ${t.tile} font-semibold shadow-xs`;
  }
  return `${chipBase} lift ${t.border} bg-white dark:bg-slate-900 ${hoverBg} text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shadow-xs`;
};

/** Icon and tone of the "Hôm nay" card for each kind of next step. */
const ACTION_TILE = {
  continue: { icon: BookOpen, tone: 'periwinkle' },
  review: { icon: Repeat, tone: 'butter' },
  sentences: { icon: PenLine, tone: 'blush' },
  new: { icon: Sparkles, tone: 'mint' },
} as const satisfies Record<string, { icon: typeof BookOpen; tone: Tone }>;
const sectionTitle = 'text-sm font-semibold text-slate-900 dark:text-white';

/** A recommended word's chip tone, from its CEFR level. */
const recTone = (level: string): Tone => LEVEL_TONE[level as DifficultyLevel] ?? 'sky';

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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-tone-aqua-soft" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={met ? 'stroke-tone-mint-accent' : 'stroke-tone-aqua-accent'}
          style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none" aria-hidden="true">
        <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
        <span className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">/{max}</span>
      </span>
      {met && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center drop-shadow-sm" aria-hidden="true">
          <img
            src="/learning-progress.png"
            alt=""
            className="h-full w-full object-contain select-none"
            draggable={false}
          />
        </span>
      )}
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
  onPracticeSentences,
  onStartVocabTest,
  onOpenIelts,
  onOpenStats,
  displayName,
}) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [wrongSentences, setWrongSentences] = useState<SentenceItem[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ level: DifficultyLevel.B1, topic: TOPICS[0].value });
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  /** Overall IELTS band from the latest attempts, for the hero card; null when there is none yet. */
  const [ieltsBand, setIeltsBand] = useState<number | null>(null);
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

    // Empty until migration 008 is applied; the dashboard just skips it then.
    getWrongSentences(userId)
      .then((items) => !cancelled && setWrongSentences(items))
      .catch((err) => console.warn('Could not load wrong sentences:', err?.message ?? err));

    // Only the band for the hero card: a failure just leaves "Bắt đầu lộ trình".
    Promise.all(PRACTISED_SKILLS.map((skill) => getIeltsAttempts(userId, skill, 3).catch(() => [] as IeltsAttempt[])))
      .then((lists) => {
        if (cancelled) return;
        const all = lists.flat();
        const bands = PRACTISED_SKILLS.map((skill) => skillProgress(skill, all).current).filter((b): b is number => b != null);
        setIeltsBand(overallBand(bands));
      })
      .catch(() => undefined);

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
        setRecsError(aiErrorMessage(err));
        setRecommendations(null);
        setFallbackTopicsActive(true);
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

  const action = pickPrimaryAction({
    activeLesson,
    dueCount,
    wrongSentences: onPracticeSentences ? wrongSentences.length : 0,
  });
  const wordCount = countInputWords(inputText);
  const minutes = lessonMinutes(wordCount);
  const now = useMemo(() => new Date(), [recent]);
  // Templates at the chosen level first, then the rest.
  const templates = useMemo(
    () => [...VOCABULARY_TEMPLATES].sort((a, b) => Number(b.cefrLevel === settings.level) - Number(a.cefrLevel === settings.level)),
    [settings.level],
  );
  const suggestions = !fallbackTopicsActive ? (recommendations ?? []).slice(0, MAX_RECOMMENDATIONS_DISPLAYED) : [];

  const heroData = {
    dueCount,
    band: ieltsBand,
    streak: userGoals ? userGoals.current_streak : null,
    longest: userGoals ? userGoals.longest_streak : null,
  };
  const heroCards: { id: 'review' | 'test' | 'ielts' | 'streak'; title: string; tone: Tone; image: string; onClick?: () => void; line: string }[] = [
    { id: 'review', title: 'Ôn tập', tone: 'butter', image: '/review-refresh.png', onClick: onStartReview, line: heroCardText('review', heroData) },
    { id: 'test', title: 'Kiểm tra từ vựng', tone: 'lavender', image: '/vocabulary-trophy.png', onClick: onStartVocabTest, line: heroCardText('test', heroData) },
    { id: 'ielts', title: 'Luyện IELTS', tone: 'sky', image: '/ielts-3d-target-dart.png', onClick: onOpenIelts, line: heroCardText('ielts', heroData) },
    { id: 'streak', title: 'Chuỗi ngày học', tone: 'peach', image: '/streak-flame.png', onClick: onOpenStats, line: heroCardText('streak', heroData) },
  ];
  const streakDays = userGoals ? streakWeek(now, userGoals.current_streak, userGoals.last_active_date) : [];

  const runPrimary = () => {
    if (action.kind === 'continue') onContinueLesson?.();
    else if (action.kind === 'review') onStartReview();
    else if (action.kind === 'sentences') onPracticeSentences?.(wrongSentences);
    else inputRef.current?.focus();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Hero: greeting, the one thing to do now, today's goal, and four ways in */}
      <section aria-labelledby="dash-primary" className={`${panel} overflow-hidden`}>
        <div className="relative p-5 sm:p-6">
          {/* Soft tone wash behind the greeting (plain fills, no blur). */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className={`absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-70 ${toneClasses(ACTION_TILE[action.kind].tone).bg}`} />
            <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-tone-periwinkle opacity-60" />
          </div>

          <div className="group relative flex flex-col gap-5 sm:flex-row sm:items-center">
            {action.kind === 'review' ? (
              <IconTile imageSrc="/review-refresh.png" tone={ACTION_TILE[action.kind].tone} size="lg" className="hidden sm:flex" />
            ) : (
              <IconTile icon={ACTION_TILE[action.kind].icon} tone={ACTION_TILE[action.kind].tone} size="lg" className="hidden sm:flex" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-caption font-semibold ${toneClasses(ACTION_TILE[action.kind].tone).text}`}>{greeting(now, displayName)}</p>
              <h1 id="dash-primary" className="mt-1 text-heading font-bold text-slate-900 dark:text-white">
                {action.title}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{action.detail}</p>
              {action.kind !== 'new' && (
                <button type="button" onClick={runPrimary} className={`${primaryBtn} mt-4 w-full sm:w-auto`}>
                  {action.kind === 'continue' ? (
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  ) : action.kind === 'sentences' ? (
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Repeat className="h-4 w-4" aria-hidden="true" />
                  )}
                  {action.kind === 'continue' ? 'Tiếp tục' : action.kind === 'sentences' ? 'Luyện câu' : 'Bắt đầu ôn'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              {userGoals ? (
                <>
                  <GoalRing value={userGoals.words_reviewed_today} max={userGoals.daily_word_goal} />
                  <label className="flex flex-col gap-1 text-caption text-slate-600 dark:text-slate-300">
                    Mục tiêu hôm nay
                    <select
                      value={userGoals.daily_word_goal}
                      onChange={handleGoalChange}
                      disabled={isUpdatingGoal}
                      className="min-h-touch rounded-lg border border-tone-aqua-border bg-tone-aqua px-2 text-sm font-medium text-tone-aqua-fg outline-none transition-colors hover:bg-tone-aqua-soft focus-visible:ring-2 focus-visible:ring-tone-aqua-accent disabled:opacity-60"
                    >
                      {[5, 10, 15, 20, 30].map((n) => (
                        <option key={n} value={n}>
                          {n} từ/ngày
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <Skeleton circle className="h-[72px] w-[72px]" />
                  <Skeleton className="h-11 w-32" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Four ways in */}
        <ul className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 lg:grid-cols-4">
          {heroCards.map((c) => (
            <li key={c.id} className="flex bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={c.onClick}
                disabled={!c.onClick}
                className={`press group flex w-full flex-col items-start gap-2 p-4 text-left transition-colors disabled:cursor-default disabled:opacity-60 sm:p-5 ${TONE_HOVER[c.tone]}`}
              >
                <IconTile imageSrc={c.image} tone={c.tone} size="lg" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.title}</span>
                <span className={`text-caption font-medium ${toneClasses(c.tone).text}`}>{c.line}</span>
                {c.id === 'streak' && userGoals && (
                  <span className="mt-1 flex gap-1" aria-label={`${streakDays.filter((d) => d.active).length} trên 7 ngày gần nhất có học`}>
                    {streakDays.map((d) => (
                      <span
                        key={d.date}
                        title={d.label}
                        className={`h-2.5 w-2.5 rounded-full ${d.active ? 'bg-tone-peach-accent' : 'bg-slate-200 dark:bg-slate-700'} ${d.today ? 'ring-2 ring-tone-peach-border ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                      />
                    ))}
                  </span>
                )}
                <ChevronRight className={`mt-auto h-4 w-4 self-end transition-transform group-hover:translate-x-0.5 ${toneClasses(c.tone).text}`} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* New lesson */}
      <section className={`${panel} space-y-5 p-5 sm:p-6`} aria-labelledby="dash-new">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dash-new" className="group/book-title flex items-center gap-3 text-title font-semibold text-slate-900 dark:text-white cursor-default select-none">
            <div className="relative flex items-center justify-center flex-shrink-0">
              {/* Soft purple ambient glow aura - loang màu tím nhẹ khi hover (giống chat box AI) */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/35 via-violet-400/30 to-fuchsia-400/25 blur-lg transform scale-100 opacity-0 group-hover/book-title:opacity-100 group-hover/book-title:scale-130 transition-all duration-300 ease-out pointer-events-none"
                aria-hidden="true"
              />
              <img
                src="/sach-mo-lap-lanh-pastel-3d.png"
                alt="Sách mở lấp lánh pastel 3D"
                className="relative h-[36.5px] w-[36.5px] sm:h-[42px] sm:w-[42px] object-contain flex-shrink-0 select-none transition-all duration-300 ease-out group-hover/book-title:scale-110 group-hover/book-title:drop-shadow-[0_8px_18px_rgba(168,85,247,0.45)]"
                draggable={false}
              />
            </div>
            <span>Tạo bài mới</span>
          </h2>
          <button type="button" onClick={() => setShowTemplateLibrary(true)} className={`${ghostBtn} group`}>
            <LayoutGrid className="icon-pop h-4 w-4 text-tone-sky-fg" aria-hidden="true" />
            <span className="hidden sm:inline">Thư viện mẫu</span>
            <span className="sr-only sm:hidden">Thư viện mẫu</span>
          </button>
        </div>

        <div className="min-w-0">
          <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Bộ từ mẫu có sẵn</p>
          <div className="-mx-5 -my-1.5 mt-2 flex snap-x gap-2.5 overflow-x-auto px-5 py-2 scrollbar-none sm:mx-0 sm:my-0 sm:mt-2 sm:px-0 sm:py-1">
            {templates.slice(0, 8).map((t, i) => {
              const tone = cardTone(i);
              const tClasses = toneClasses(tone);
              const hoverBg = TONE_HOVER[tone];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={`lift press group w-44 flex-shrink-0 snap-start rounded-xl border ${tClasses.border} bg-white dark:bg-slate-900 ${hoverBg} p-3 text-left transition-all duration-200 shadow-xs`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t.name}</span>
                    <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-caption font-semibold ${toneClasses(LEVEL_TONE[t.cefrLevel]).tile}`}>
                      {t.cefrLevel}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-caption text-slate-600 dark:text-slate-300">
                    {t.samplePreview.join(', ')}
                  </span>
                  <span className={`mt-2 block text-caption font-medium tabular-nums ${tClasses.text}`}>
                    {t.words.length} từ
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className="text-caption font-medium text-slate-500 dark:text-slate-400">Cấp độ</legend>
          <div className="-mx-5 -my-1.5 mt-1 flex gap-2 overflow-x-auto px-5 py-2 scrollbar-none sm:mx-0 sm:my-0 sm:mt-2 sm:flex-wrap sm:px-0 sm:py-1">
            {Object.values(DifficultyLevel).map((level) => {
              const on = settings.level === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={on}
                  title={LEVEL_DESC[level]}
                  onClick={() => setSettings((s) => ({ ...s, level }))}
                  className={toneChip(LEVEL_TONE[level], on)}
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
          <div className="-mx-5 -my-1.5 mt-1 flex gap-2 overflow-x-auto px-5 py-2 scrollbar-none sm:mx-0 sm:my-0 sm:mt-2 sm:flex-wrap sm:px-0 sm:py-1">
            {TOPICS.map((t) => {
              const on = settings.topic === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSettings((s) => ({ ...s, topic: t.value }))}
                  className={toneChip(t.tone, on)}
                >
                  {t.label}
                </button>
              );
            })}
            {!TOPICS.some((t) => t.value === settings.topic) && (
              <span className={toneChip('periwinkle', true)}>
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
              className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 pr-12 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-tone-periwinkle-border focus:border-tone-periwinkle-fg focus-visible:ring-2 focus-visible:ring-tone-periwinkle-border dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="resilient, allocate, itinerary…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            {inputText.trim() && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-1 top-1 inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-tone-blush hover:text-tone-blush-fg dark:text-slate-400"
                aria-label="Xoá danh sách từ"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-tone-blush-fg" role="alert">
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
                className="press inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-tone-sky-fg transition-colors hover:bg-tone-sky disabled:opacity-50"
                aria-label="Làm mới gợi ý"
                title="Làm mới gợi ý"
              >
                <RefreshCw className={`h-4 w-4 ${recsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
            {recsError && <p className="text-sm text-tone-blush-fg">{recsError}</p>}
            <div className="-mx-5 -my-1.5 mt-1 flex gap-2 overflow-x-auto px-5 py-2 scrollbar-none sm:mx-0 sm:my-0 sm:mt-2 sm:flex-wrap sm:px-0 sm:py-1" aria-busy={recsLoading}>
              {recsLoading
                ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-24 flex-shrink-0 rounded-xl" />)
                : fallbackTopicsActive
                  ? FALLBACK_WORDS.map((t, i) => (
                      <button key={t.topic} type="button" onClick={() => appendWords(t.words)} className={toneChip(cardTone(i), false)}>
                        <Plus className={`icon-pop h-4 w-4 ${toneClasses(cardTone(i)).text}`} aria-hidden="true" />
                        {t.topic}
                        <span className="text-caption text-slate-500 dark:text-slate-400">{t.words.length} từ</span>
                      </button>
                    ))
                  : suggestions.map((rec, i) => (
                      <button
                        key={`${rec.word}-${i}`}
                        type="button"
                        onClick={() => appendWords([rec.word])}
                        className={toneChip(recTone(rec.cefrLevel), false)}
                        aria-label={`Thêm ${rec.word}`}
                      >
                        <Plus className={`icon-pop h-4 w-4 ${toneClasses(recTone(rec.cefrLevel)).text}`} aria-hidden="true" />
                        {rec.word}
                        <span className="text-caption text-slate-500 dark:text-slate-400">{rec.cefrLevel}</span>
                      </button>
                    ))}
              {!recsLoading && !fallbackTopicsActive && suggestions.length > 1 && (
                <button type="button" onClick={() => appendWords(suggestions.map((r) => r.word))} className={`${ghostBtn} group`}>
                  <Sparkles className="icon-pop h-4 w-4 text-tone-butter-fg" aria-hidden="true" />
                  Thêm tất cả
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <input type="file" id="file-upload" className="sr-only" onChange={handleFileUpload} accept=".txt" />
            <label htmlFor="file-upload" className={`${ghostBtn} group cursor-pointer`}>
              <FileText className="icon-pop h-4 w-4 text-tone-aqua-fg" aria-hidden="true" />
              Nhập từ file .txt
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {wordCount > 0 && (
              <p className="inline-flex items-center justify-center gap-1.5 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4 text-tone-sky-fg" aria-hidden="true" />
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
          <h2 id="dash-recent" className={`flex items-center gap-2 ${sectionTitle}`}>
            <Clock className="h-4 w-4 text-tone-sky-fg" aria-hidden="true" />
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
              : recent.lessons.map((l, i) => {
                  const tone = cardTone(i);
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
                        className={`group flex min-h-touch w-full items-center gap-3 p-4 text-left transition-colors ${TONE_HOVER[tone]}`}
                      >
                        <IconTile icon={BookOpen} tone={tone} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{l.topic}</p>
                            <p className="flex-shrink-0 text-caption tabular-nums text-slate-500 dark:text-slate-400">
                              {p.done}/{p.total} đã nhớ
                            </p>
                          </div>
                          <div
                            className="mt-2 h-1.5 overflow-hidden rounded-full bg-tone-mint-soft"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Tiến độ ${l.topic}`}
                          >
                            <div className="h-full rounded-full bg-tone-mint-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1.5 text-caption text-slate-500 dark:text-slate-400">
                            {relativeDay(l.lastAt, now)}
                            {l.lessonCount > 1 && ` · ${l.lessonCount} bài`}
                            {due > 0 && <span className="font-medium text-tone-butter-fg"> · {due} từ đến hạn</span>}
                          </p>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${toneClasses(tone).text}`} aria-hidden="true" />
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
