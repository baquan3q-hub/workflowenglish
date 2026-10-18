import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Headphones,
  Loader2,
  PenTool,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import {
  MasteryLevel,
  type VocabTestConfig,
  type VocabTestQuestion,
  type VocabTestQuestionType,
  type VocabTestSummary,
  type WordMasteryRecord,
} from '../types';
import { getTestableWords } from '../services/masteryService';
import {
  generateVocabTestQuestions,
  getPerformanceRating,
  summarizeVocabTest,
} from '../services/vocabTestLogic';
import { speakText } from '../services/browserSpeech';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingRegion, Skeleton } from '../components/ui/States';

interface VocabTestViewProps {
  userId: string;
  onBack: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  /** Pre-filter to only reviewing or only mastered words if requested. */
  initialLevel?: MasteryLevel;
}

type TestPhase = 'setup' | 'testing' | 'summary';

const QUESTION_TYPE_LABELS: Record<VocabTestQuestionType, { label: string; icon: React.FC<{ className?: string }> }> = {
  word_to_meaning: { label: 'Từ → Nghĩa', icon: HelpCircle },
  meaning_to_word: { label: 'Nghĩa → Từ', icon: Sparkles },
  fill_blank: { label: 'Điền vào câu', icon: PenTool },
  listening: { label: 'Nghe phát âm', icon: Headphones },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export const VocabTestView: React.FC<VocabTestViewProps> = ({
  userId,
  onBack,
  onShowToast,
  initialLevel,
}) => {
  const [phase, setPhase] = useState<TestPhase>('setup');
  const [loadingWords, setLoadingWords] = useState(true);
  const [poolWords, setPoolWords] = useState<WordMasteryRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Setup configuration state
  const [selectedLevels, setSelectedLevels] = useState<MasteryLevel[]>(
    initialLevel ? [initialLevel] : [MasteryLevel.REVIEWING, MasteryLevel.MASTERED],
  );
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [enabledTypes, setEnabledTypes] = useState<VocabTestQuestionType[]>([
    'word_to_meaning',
    'meaning_to_word',
    'fill_blank',
    'listening',
  ]);

  // Test runner state
  const [questions, setQuestions] = useState<VocabTestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [testSummary, setTestSummary] = useState<VocabTestSummary | null>(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Load testable words from database
  const loadPool = useCallback(async () => {
    setLoadingWords(true);
    setLoadError(null);
    try {
      const words = await getTestableWords(userId, {
        levels: [MasteryLevel.REVIEWING, MasteryLevel.MASTERED],
      });
      setPoolWords(words);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách từ kiểm tra');
    } finally {
      setLoadingWords(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  // Filtered pool count based on selected levels
  const availableCount = useMemo(() => {
    return poolWords.filter((w) => selectedLevels.includes(w.mastery_level)).length;
  }, [poolWords, selectedLevels]);

  const reviewingCount = useMemo(
    () => poolWords.filter((w) => w.mastery_level === MasteryLevel.REVIEWING).length,
    [poolWords],
  );
  const masteredCount = useMemo(
    () => poolWords.filter((w) => w.mastery_level === MasteryLevel.MASTERED).length,
    [poolWords],
  );

  // Start test
  const handleStartTest = (customWords?: WordMasteryRecord[]) => {
    const sourceWords = customWords || poolWords;
    const config: VocabTestConfig = {
      sourceLevels: customWords ? [MasteryLevel.REVIEWING, MasteryLevel.MASTERED, MasteryLevel.LEARNING, MasteryLevel.LAPSED, MasteryLevel.NEW] : selectedLevels,
      questionCount,
      questionTypes: enabledTypes.length > 0 ? enabledTypes : ['word_to_meaning'],
    };

    const generated = generateVocabTestQuestions(sourceWords, config);
    if (generated.length === 0) {
      onShowToast?.('Không tìm thấy từ vựng phù hợp với cấu hình', 'info');
      return;
    }

    setQuestions(generated);
    setCurrentIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setTestSummary(null);
    setElapsedSeconds(0);
    setPhase('testing');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentQ = questions[currentIndex];

  // Auto-play audio when a listening question appears
  useEffect(() => {
    if (phase === 'testing' && currentQ?.type === 'listening' && currentQ.audioText && !selectedOption) {
      speakText(currentQ.audioText);
    }
  }, [phase, currentIndex, currentQ, selectedOption]);

  // Handle option click (instant feedback)
  const handleSelectOption = (opt: string) => {
    if (selectedOption || !currentQ) return;
    setSelectedOption(opt);
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt }));

    const isCorrect = opt === currentQ.correctAnswer;
    if (isCorrect) {
      const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    }

    // Always speak the target word so learner hears pronunciation
    if (currentQ.targetWord) {
      speakText(currentQ.targetWord);
    }
  };

  // Advance to next question or complete test
  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      // Completed test
      if (timerRef.current) clearInterval(timerRef.current);
      const summary = summarizeVocabTest(questions, userAnswers, elapsedSeconds);
      setTestSummary(summary);
      setPhase('summary');
    } else {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOption(null);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (phase !== 'testing' || !currentQ) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // 1-4 chooses options
      if (!selectedOption && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (currentQ.options[idx]) {
          e.preventDefault();
          handleSelectOption(currentQ.options[idx]);
        }
        return;
      }

      // Enter advances
      if (selectedOption && e.key === 'Enter') {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, currentQ, selectedOption, userAnswers, currentIndex, questions.length, elapsedSeconds]);

  // Retest wrong words
  const handleRetestWrong = () => {
    if (!testSummary || testSummary.wrongItems.length === 0) return;
    const wrongWordsMap = new Set(testSummary.wrongItems.map((w) => w.targetWord.toLowerCase()));
    const retestPool = poolWords.filter((w) => wrongWordsMap.has(w.word.toLowerCase()));

    if (retestPool.length > 0) {
      handleStartTest(retestPool);
    }
  };

  // Shell styling
  const shell = 'mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 sm:py-8';

  // ─── 1. Setup Phase ────────────────────────────────────────────────────────
  if (phase === 'setup') {
    if (loadingWords) {
      return (
        <div className={shell}>
          <LoadingRegion label="Đang tải dữ liệu từ vựng…" className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </LoadingRegion>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className={`${shell} text-center py-12`}>
          <p className="text-rose-600 dark:text-rose-400">{loadError}</p>
          <button
            type="button"
            onClick={loadPool}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      );
    }

    if (poolWords.length === 0) {
      return (
        <div className={`${shell} items-center py-12 text-center`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chưa có từ đủ điều kiện kiểm tra</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bài kiểm tra dành riêng cho các từ vựng bạn đã gắn nhãn hoặc đạt mốc <strong>"Ôn tập"</strong> hoặc <strong>"Thành thạo"</strong>.
              Hãy học các bài học và hoàn thành các phiên ôn tập trước nhé!
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 inline-flex min-h-touch items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Về trang chủ
          </button>
        </div>
      );
    }

    const maxCount = Math.min(availableCount, questionCount);

    return (
      <div className={shell}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kiểm tra từ vựng
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đánh giá năng lực các từ ở mức Ôn tập & Thành thạo
            </p>
          </div>
        </div>

        {/* Word Counts Summary Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Từ đủ điều kiện</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{poolWords.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Đang ôn tập</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-blue-900 dark:text-blue-100">{reviewingCount}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Đã thành thạo</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">{masteredCount}</p>
          </div>
        </div>

        {/* Setup Config Card */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          {/* Source level selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nguồn từ vựng kiểm tra
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `Tất cả (${poolWords.length})`, levels: [MasteryLevel.REVIEWING, MasteryLevel.MASTERED] },
                { label: `Chỉ Ôn tập (${reviewingCount})`, levels: [MasteryLevel.REVIEWING] },
                { label: `Chỉ Thành thạo (${masteredCount})`, levels: [MasteryLevel.MASTERED] },
              ].map((pill, i) => {
                const isSelected =
                  pill.levels.length === selectedLevels.length &&
                  pill.levels.every((l) => selectedLevels.includes(l));
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedLevels(pill.levels)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question count selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Số lượng câu hỏi
            </label>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold tabular-nums transition-all ${
                    questionCount === n
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {n} câu
                </button>
              ))}
            </div>
          </div>

          {/* Question formats */}
          <div className="space-y-2.5">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Hình thức kiểm tra kết hợp
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(QUESTION_TYPE_LABELS) as VocabTestQuestionType[]).map((t) => {
                const active = enabledTypes.includes(t);
                const meta = QUESTION_TYPE_LABELS[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (active && enabledTypes.length === 1) return; // Keep at least 1
                      setEnabledTypes((prev) =>
                        active ? prev.filter((x) => x !== t) : [...prev, t],
                      );
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-xs font-medium transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-200'
                        : 'border-slate-200 bg-slate-50/50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <Icon className="h-4 w-4" />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={availableCount === 0}
            onClick={() => handleStartTest()}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <span>Bắt đầu kiểm tra · {maxCount} câu</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Khoảng {Math.max(1, Math.round((maxCount * 12) / 60))} phút · Có phản hồi đáp án ngay sau mỗi câu
          </p>
        </div>
      </div>
    );
  }

  // ─── 2. Testing Phase ──────────────────────────────────────────────────────
  if (phase === 'testing' && currentQ) {
    const progressPercent = ((currentIndex) / questions.length) * 100;
    const isAnswered = selectedOption !== null;
    const isLastQuestion = currentIndex + 1 >= questions.length;
    const TypeIcon = QUESTION_TYPE_LABELS[currentQ.type]?.icon || HelpCircle;

    return (
      <div className={shell}>
        {/* Top bar: Back, Progress, Counter, Timer */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn dừng bài kiểm tra này?')) {
                setPhase('setup');
              }
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
            <span className="text-xs font-semibold">Dừng</span>
          </button>

          {/* Progress Bar */}
          <div className="flex-1 mx-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Counter and Timer */}
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            <span>
              {currentIndex + 1}/{questions.length}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {/* Question Type Badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <TypeIcon className="h-3.5 w-3.5" />
              {QUESTION_TYPE_LABELS[currentQ.type]?.label}
            </span>
            <span className="text-xs text-slate-400">Chọn 1 đáp án</span>
          </div>

          {/* Question Prompt Area */}
          <div className="my-6 flex flex-col items-center justify-center text-center">
            {currentQ.type === 'listening' ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => currentQ.audioText && speakText(currentQ.audioText)}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm hover:scale-105 active:scale-95 transition-all dark:bg-blue-950/60 dark:text-blue-400"
                  aria-label="Nghe lại phát âm"
                >
                  <Volume2 className="h-9 w-9" />
                </button>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {currentQ.prompt}
                </p>
                {currentQ.subPrompt && (
                  <span className="font-mono text-xs text-slate-400">{currentQ.subPrompt}</span>
                )}
              </div>
            ) : currentQ.type === 'fill_blank' ? (
              <div className="space-y-2 max-w-lg">
                <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-slate-900 dark:text-white">
                  {currentQ.prompt}
                </p>
                {currentQ.subPrompt && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    "{currentQ.subPrompt}"
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentQ.prompt}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  {currentQ.subPrompt && (
                    <span className="text-sm italic text-slate-500 dark:text-slate-400">{currentQ.subPrompt}</span>
                  )}
                  {currentQ.explanation.ipa && currentQ.type === 'word_to_meaning' && (
                    <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                      /{currentQ.explanation.ipa.replace(/^\/+|\/+$/g, '')}/
                    </span>
                  )}
                  {currentQ.targetWord && (
                    <button
                      type="button"
                      onClick={() => speakText(currentQ.targetWord)}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      title="Phát âm"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4 Interactive Options */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {currentQ.options.map((opt, idx) => {
              const isCorrectAnswer = opt === currentQ.correctAnswer;
              const isSelected = selectedOption === opt;
              let style =
                'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-500';
              let icon = null;

              if (isAnswered) {
                if (isCorrectAnswer) {
                  style =
                    'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200';
                  icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
                } else if (isSelected) {
                  style =
                    'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-200';
                  icon = <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />;
                } else {
                  style =
                    'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500';
                }
              }

              return (
                <button
                  key={`${opt}-${idx}`}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(opt)}
                  className={`flex min-h-[56px] items-center justify-between gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all ${style}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="truncate">{opt}</span>
                  </div>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Instant Feedback Details & Next Button */}
          {isAnswered && (
            <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800 animate-fadeIn">
              {/* Verdict header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${
                    selectedOption === currentQ.correctAnswer
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selectedOption === currentQ.correctAnswer
                    ? 'Chính xác! 🎉'
                    : `Chưa đúng! Đáp án đúng: ${currentQ.correctAnswer}`}
                </span>
                <span className="text-xs text-slate-400">Nhấn Enter để tiếp tục</span>
              </div>

              {/* Word Details Explanation */}
              <div className="rounded-xl bg-slate-50 p-4 text-left space-y-2 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {currentQ.targetWord}
                  </span>
                  {currentQ.explanation.ipa && (
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      /{currentQ.explanation.ipa.replace(/^\/+|\/+$/g, '')}/
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => speakText(currentQ.targetWord)}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {currentQ.explanation.meaningVi}
                </p>
                {currentQ.explanation.exampleSentence && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                    {currentQ.explanation.exampleSentence}
                    {currentQ.explanation.exampleSentenceVi && (
                      <span className="block mt-0.5 text-slate-500 dark:text-slate-500">
                        {currentQ.explanation.exampleSentenceVi}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Next Question CTA */}
              <button
                type="button"
                onClick={handleNextQuestion}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <span>{isLastQuestion ? 'Xem kết quả bài kiểm tra' : 'Câu tiếp theo'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── 3. Summary / Results Phase ────────────────────────────────────────────
  if (phase === 'summary' && testSummary) {
    const rating = getPerformanceRating(testSummary.scorePercentage);

    return (
      <div className={shell}>
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-950/40 dark:text-amber-400">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hoàn thành bài kiểm tra!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bạn đã hoàn thành trong {formatDuration(testSummary.durationSeconds)}
          </p>
        </div>

        {/* Score Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${rating.badgeTone}`}>
              {rating.title}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-5xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {testSummary.scorePercentage}%
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Đúng {testSummary.correctCount} trên {testSummary.totalQuestions} câu
            </p>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {rating.message}
          </p>
        </div>

        {/* Wrong Items Review List */}
        {testSummary.wrongItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Các từ cần ôn lại ({testSummary.wrongItems.length})
              </h2>
              <button
                type="button"
                onClick={handleRetestWrong}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Kiểm tra lại từ sai
              </button>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {testSummary.wrongItems.map((item, idx) => (
                <div key={`${item.targetWord}-${idx}`} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.targetWord}
                      </span>
                      {item.ipa && (
                        <span className="font-mono text-xs text-slate-400">
                          /{item.ipa.replace(/^\/+|\/+$/g, '')}/
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => speakText(item.targetWord)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">
                      {QUESTION_TYPE_LABELS[item.questionType]?.label}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Nghĩa: <strong>{item.meaningVi}</strong>
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-rose-500 line-through">Bạn chọn: {item.userAnswer}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đáp án: {item.correctAnswer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {testSummary.wrongItems.length > 0 && (
            <button
              type="button"
              onClick={handleRetestWrong}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Kiểm tra lại {testSummary.wrongItems.length} từ sai</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <span>Làm bài kiểm tra mới</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[46px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default VocabTestView;
