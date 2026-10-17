import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Loader2,
  Sparkles,
  Volume2,
  Keyboard,
  Lightbulb,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  type ConfidenceRating,
  MasteryLevel,
  type WordMasteryRecord,
} from '../types';
import { Button, ProgressBar } from '../components/Common';
import { formatIntervalDisplay } from '../services/srsService';
import {
  getDueWordCount,
  getDueWords,
  getNextDueAt,
} from '../services/masteryService';
import {
  computeReviewUpdate,
  findWordForm,
  formatIpa,
  gradeTypedAnswer,
  type GradeResult,
} from '../services/reviewLogic';
import { applyRating } from '../services/reviewService';
import { speakText } from '../services/browserSpeech';

interface ReviewSessionProps {
  userId: string;
  onComplete: () => void;
  onBack: () => void;
  /**
   * Optional callback to show a global toast (e.g. when the user reaches
   * their daily review goal). Wired up by App.tsx so the toast renders
   * above the header on any phase.
   */
  onShowToast?: (message: string, type?: 'success' | 'info') => void;

  dueWords: WordMasteryRecord[] | null;
  setDueWords: React.Dispatch<React.SetStateAction<WordMasteryRecord[] | null>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  ratings: ConfidenceRating[];
  setRatings: React.Dispatch<React.SetStateAction<ConfidenceRating[]>>;
  goalCelebrated: boolean;
  setGoalCelebrated: React.Dispatch<React.SetStateAction<boolean>>;
  nextReviewIso: string | null;
  setNextReviewIso: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Max words pulled into one session. A learner coming back after a break
 * gets a manageable batch (and can continue) instead of a wall of cards.
 */
export const REVIEW_BATCH_SIZE = 30;

/** A card answered "Again" comes back after this many other cards. */
const RELEARN_GAP = 3;

/** A word is shown at most this many times in one session. */
const MAX_APPEARANCES = 3;

interface RatingButtonConfig {
  rating: ConfidenceRating;
  label: string;
  className: string;
}

const RATING_BUTTONS: RatingButtonConfig[] = [
  {
    rating: 0,
    label: 'Lại',
    className:
      'bg-red-500 hover:bg-red-600 focus:ring-red-400 text-white shadow-sm',
  },
  {
    rating: 1,
    label: 'Khó',
    className:
      'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 text-white shadow-sm',
  },
  {
    rating: 2,
    label: 'Tốt',
    className:
      'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400 text-white shadow-sm',
  },
  {
    rating: 3,
    label: 'Dễ',
    className:
      'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400 text-white shadow-sm',
  },
];

/**
 * Words the learner has already met several times are reviewed by typing
 * the English word from its Vietnamese meaning (active recall) instead of
 * flipping a card (recognition). Needs the stored meaning to work.
 */
function usesTypingMode(record: WordMasteryRecord): boolean {
  if (!record.meaning_vi) return false;
  return (
    record.mastery_level === MasteryLevel.REVIEWING ||
    record.mastery_level === MasteryLevel.MASTERED ||
    record.mastery_level === MasteryLevel.LAPSED
  );
}

/** Example sentence with the word blanked out, or null if it can't be found. */
function blankExample(sentence: string | null | undefined, word: string): string | null {
  if (!sentence) return null;
  const match = findWordForm(sentence, word);
  if (!match) return null;
  return sentence.slice(0, match.index) + '_____' + sentence.slice(match.index + match.form.length);
}

/** "d _ _ _ _ _" — first letter plus one slot per remaining letter. */
function firstLetterHint(word: string): string {
  return word
    .split(' ')
    .map((w) => (w ? w[0] + ' _'.repeat(Math.max(0, w.length - 1)) : ''))
    .join('   ');
}

/**
 * Format the next-review date into a friendly Vietnamese string for the
 * empty-state message.
 */
function formatNextReviewDate(iso: string | null | undefined): string {
  if (!iso) return 'sớm thôi';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'sớm thôi';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const ReviewSession: React.FC<ReviewSessionProps> = ({
  userId,
  onComplete,
  onBack,
  onShowToast,
  dueWords: propDueWords,
  setDueWords,
  currentIndex,
  setCurrentIndex,
  ratings,
  setRatings,
  goalCelebrated,
  setGoalCelebrated,
  nextReviewIso,
  setNextReviewIso,
}) => {
  const [loading, setLoading] = useState(propDueWords === null);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remainingDue, setRemainingDue] = useState<number | null>(null);

  // Typing-mode state (reset for every card)
  const [typed, setTyped] = useState('');
  const [check, setCheck] = useState<GradeResult | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dueWords = propDueWords || [];

  // Initial fetch
  useEffect(() => {
    if (propDueWords !== null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const due = await getDueWords(userId, REVIEW_BATCH_SIZE);
        if (cancelled) return;
        setDueWords(due);
        if (due.length === 0) {
          const next = await getNextDueAt(userId).catch(() => null);
          if (!cancelled) setNextReviewIso(next);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Không thể tải danh sách ôn tập';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, propDueWords, setDueWords, setNextReviewIso]);

  const currentCard: WordMasteryRecord | undefined = dueWords[currentIndex];
  const typingMode = currentCard ? usesTypingMode(currentCard) : false;

  // Reset per-card UI whenever the card changes
  useEffect(() => {
    setIsFlipped(false);
    setTyped('');
    setCheck(null);
    setHintShown(false);
  }, [currentIndex, propDueWords === null]);

  useEffect(() => {
    if (typingMode && !check) inputRef.current?.focus();
  }, [typingMode, check, currentIndex]);

  // When the session ends, find out whether more words are still waiting.
  useEffect(() => {
    if (!finished) return;
    let cancelled = false;
    getDueWordCount(userId)
      .then((n) => !cancelled && setRemainingDue(n))
      .catch(() => !cancelled && setRemainingDue(null));
    return () => {
      cancelled = true;
    };
  }, [finished, userId]);

  // When the current card was shown, for the review log's thinking time.
  const cardShownAtRef = React.useRef(Date.now());
  useEffect(() => {
    cardShownAtRef.current = Date.now();
  }, [currentIndex]);

  /**
   * Highest rating the learner may pick. In typing mode the result of the
   * check caps it: a wrong answer can't be rated "Easy".
   */
  const maxRating: ConfidenceRating = useMemo(() => {
    if (!typingMode || !check) return 3;
    if (check.grade === 'wrong') return 0;
    if (check.grade === 'close' || hintShown) return 1;
    return 3;
  }, [typingMode, check, hintShown]);

  /** Rating pre-selected for Enter, derived from the typing check. */
  const suggestedRating: ConfidenceRating | null = useMemo(() => {
    if (!typingMode || !check) return null;
    if (check.grade === 'wrong') return 0;
    if (check.grade === 'close' || hintShown) return 1;
    return 2;
  }, [typingMode, check, hintShown]);

  /**
   * Predicted next-review label for each rating, using the same rules as
   * the real write (same-session guard included, fuzz excluded).
   */
  const predictedIntervals = useMemo(() => {
    if (!currentCard) return null;
    const now = new Date();
    return RATING_BUTTONS.map((btn) => {
      const u = computeReviewUpdate(currentCard, btn.rating, now, () => 0.5);
      if (!u.scheduleChanged) return 'giữ lịch';
      if (btn.rating === 0) return 'học lại';
      const days = (new Date(u.next_review_date).getTime() - now.getTime()) / 86_400_000;
      return formatIntervalDisplay(days);
    });
  }, [currentCard]);

  // Distinct words in this batch, and how many of them have been seen
  const uniqueTotal = useMemo(() => new Set(dueWords.map((w) => w.word)).size, [dueWords]);
  const uniqueDone = useMemo(
    () => new Set(dueWords.slice(0, currentIndex).map((w) => w.word)).size,
    [dueWords, currentIndex],
  );

  const handleCheck = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentCard || check) return;
    const result = typed.trim()
      ? gradeTypedAnswer(typed, currentCard.word)
      : { grade: 'wrong' as const };
    setCheck(result);
    setIsFlipped(true);
    speakText(currentCard.word);
  };

  const handleRate = useCallback(
    async (rating: ConfidenceRating) => {
      if (!currentCard || submitting) return;
      if (typingMode && !check) return;
      if (rating > maxRating) return;
      setSubmitting(true);
      try {
        const seenBefore = dueWords.slice(0, currentIndex).some((w) => w.word === currentCard.word);
        // applyRating credits successful recalls to the daily goal in the
        // background — here once per word per session.
        const { record: updated, goal } = await applyRating({
          userId,
          word: currentCard.word,
          current: currentCard,
          rating,
          source: 'review',
          durationMs: Date.now() - cardShownAtRef.current,
          creditGoal: !seenBefore,
        });

        setRatings((prev) => [...prev, rating]);

        // Celebrate only on the review that reached the goal.
        void goal.then((credit) => {
          if (credit?.justReached && !goalCelebrated) {
            setGoalCelebrated(true);
            const streak = credit.goalsUpdated.current_streak;
            onShowToast?.(`🎉 Hoàn thành mục tiêu hôm nay! Streak: ${streak} ngày`, 'success');
          }
        });

        // "Again" → the word comes back a few cards later in this session
        // (relearning step), using the freshly saved record.
        let nextQueue = dueWords.map((w, i) => (i === currentIndex ? updated : w));
        const appearances = dueWords.filter((w) => w.word === currentCard.word).length;
        if (rating === 0 && appearances < MAX_APPEARANCES) {
          const insertAt = Math.min(nextQueue.length, currentIndex + 1 + RELEARN_GAP);
          nextQueue = [...nextQueue.slice(0, insertAt), updated, ...nextQueue.slice(insertAt)];
        }
        setDueWords(nextQueue);

        if (currentIndex + 1 >= nextQueue.length) {
          setFinished(true);
        } else {
          setCurrentIndex((idx) => idx + 1);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể lưu kết quả ôn tập';
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, currentIndex, dueWords, submitting, typingMode, check, maxRating, userId, goalCelebrated, onShowToast, setDueWords, setRatings, setCurrentIndex, setGoalCelebrated],
  );

  // Keyboard: Space/Enter flip (or confirm), 1–4 rate
  useEffect(() => {
    if (finished || loading || !currentCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
      const answered = typingMode ? !!check : isFlipped;
      if ((e.key === ' ' || e.key === 'Enter') && !typingMode && !isFlipped) {
        e.preventDefault();
        setIsFlipped(true);
      } else if (e.key === 'Enter' && answered && suggestedRating !== null) {
        e.preventDefault();
        void handleRate(suggestedRating);
      } else if (answered && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        void handleRate((Number(e.key) - 1) as ConfidenceRating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, loading, currentCard, typingMode, check, isFlipped, suggestedRating, handleRate]);

  const continueReviewing = () => {
    setFinished(false);
    setRemainingDue(null);
    setRatings([]);
    setCurrentIndex(0);
    setDueWords(null); // triggers a fresh fetch
  };

  // --- Render: loading -----------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Đang tải danh sách ôn tập…
        </p>
      </div>
    );
  }

  // --- Render: error -------------------------------------------------------
  if (error && dueWords.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Dashboard
        </Button>
      </div>
    );
  }

  // --- Render: empty (no due words) ----------------------------------------
  if (dueWords.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-16 gap-5 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Tuyệt vời!
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Hôm nay bạn không có từ nào cần ôn tập.
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-sm">
            Buổi ôn tiếp theo: {formatNextReviewDate(nextReviewIso)}
          </p>
        </div>
        <Button variant="primary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Dashboard
        </Button>
      </div>
    );
  }

  // --- Render: completion summary ------------------------------------------
  if (finished) {
    // First answer per word = how well it was actually remembered
    const firstRatings: ConfidenceRating[] = [];
    const seen = new Set<string>();
    ratings.forEach((r, i) => {
      const w = dueWords[i]?.word;
      if (w && !seen.has(w)) {
        seen.add(w);
        firstRatings.push(r);
      }
    });
    const remembered = firstRatings.filter((r) => r >= 2).length;
    const relearned = firstRatings.length - remembered;
    const recallPercent = firstRatings.length > 0 ? Math.round((remembered / firstRatings.length) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-12 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-blue-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Hoàn thành buổi ôn tập!
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Bạn đã ôn lại{' '}
            <span className="font-semibold text-slate-800 dark:text-white">
              {firstRatings.length}
            </span>{' '}
            từ.
          </p>
        </div>

        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nhớ ngay lần đầu
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {recallPercent}%
            </span>
          </div>
          <ProgressBar progress={recallPercent} />
          <div className="flex justify-center gap-4 text-sm pt-1">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" /> {remembered} nhớ tốt
            </span>
            <span className="flex items-center gap-1 text-orange-500">
              <RotateCcw className="w-4 h-4" /> {relearned} cần củng cố
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {remainingDue !== null && remainingDue > 0 && (
            <Button variant="outline" onClick={continueReviewing}>
              <RotateCcw className="w-4 h-4 mr-2" /> Ôn tiếp {Math.min(remainingDue, REVIEW_BATCH_SIZE)} từ (còn {remainingDue})
            </Button>
          )}
          <Button variant="primary" onClick={onComplete}>
            <CheckCircle className="w-4 h-4 mr-2" /> Hoàn thành
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: active review ----------------------------------------------
  const progressPercent = uniqueTotal > 0 ? (uniqueDone / uniqueTotal) * 100 : 0;
  const isRelearn = !!currentCard && dueWords.slice(0, currentIndex).some((w) => w.word === currentCard.word);
  const answered = typingMode ? !!check : isFlipped;
  const blanked = currentCard ? blankExample(currentCard.example_sentence, currentCard.word) : null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
          Ôn tập SRS
        </h2>
        <div className="w-16" /> {/* Spacer to balance the back button */}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>
            {uniqueDone} / {uniqueTotal} từ đã ôn
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <ProgressBar progress={progressPercent} />
      </div>

      {/* Card */}
      <div
        className={`w-full perspective-1000 group ${typingMode ? '' : 'cursor-pointer'}`}
        onClick={() => {
          if (!typingMode) setIsFlipped((v) => !v);
        }}
        style={{ minHeight: '280px' }}
      >
        <div
          className={`relative w-full duration-500 transform-style-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ minHeight: '280px' }}
        >
          {/* FRONT */}
          <div
            className={`${
              isFlipped ? 'invisible absolute inset-0' : 'relative'
            } w-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-blue-100 dark:border-blue-900 flex flex-col items-center justify-center p-6 sm:p-8`}
            style={{ minHeight: '280px' }}
          >
            {isRelearn && (
              <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                Học lại
              </span>
            )}

            {typingMode && currentCard ? (
              <div className="w-full flex flex-col items-center text-center gap-3" onClick={(e) => e.stopPropagation()}>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-violet-500 uppercase">
                  <Keyboard className="w-3.5 h-3.5" /> Gõ từ tiếng Anh
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                  {currentCard.meaning_vi}
                </p>
                {currentCard.part_of_speech && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    {currentCard.part_of_speech}
                  </span>
                )}
                {blanked && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic max-w-md">"{blanked}"</p>
                )}
                {hintShown && (
                  <p className="font-mono text-lg tracking-wider text-amber-600 dark:text-amber-400">
                    {firstLetterHint(currentCard.word)}
                  </p>
                )}
                <form onSubmit={handleCheck} className="w-full max-w-sm flex flex-col gap-2 mt-1">
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="Gõ từ tiếng Anh…"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-center text-lg font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!typed.trim()}>
                      Kiểm tra
                    </Button>
                    {!hintShown && (
                      <Button type="button" variant="ghost" onClick={() => setHintShown(true)} title="Gợi ý chữ cái đầu (tối đa 'Khó')">
                        <Lightbulb className="w-4 h-4" />
                      </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={() => handleCheck()}>
                      Không nhớ
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-3">
                  Word
                </span>
                <h3 className="text-3xl sm:text-5xl font-bold text-slate-800 dark:text-white mb-3 text-center break-words">
                  {currentCard?.word}
                </h3>
                <div className="flex items-center gap-2">
                  {currentCard?.ipa && (
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">{formatIpa(currentCard.ipa)}</p>
                  )}
                  {currentCard && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(currentCard.word);
                      }}
                      className="p-1.5 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-4">
                  Chạm để lật<span className="hidden sm:inline"> · Space</span>
                </p>
              </>
            )}
          </div>

          {/* BACK */}
          <div
            className={`${
              !isFlipped ? 'invisible absolute inset-0 overflow-hidden' : 'relative'
            } w-full backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-emerald-100 dark:border-emerald-900 flex flex-col p-4 sm:p-6`}
            style={{ minHeight: '280px' }}
          >
            {typingMode && check && (
              <div
                className={`mb-3 flex items-start gap-2 rounded-xl p-3 text-sm ${
                  check.grade === 'correct'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : check.grade === 'close'
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                      : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}
              >
                {check.grade === 'correct' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : check.grade === 'close' ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold">
                    {check.grade === 'correct'
                      ? hintShown ? 'Chính xác (có dùng gợi ý)' : 'Chính xác!'
                      : check.grade === 'close'
                        ? 'Gần đúng — chú ý chính tả'
                        : typed.trim() ? 'Chưa đúng' : 'Không sao, xem lại nhé'}
                  </p>
                  {typed.trim() && check.grade !== 'correct' && (
                    <p className="text-xs mt-0.5">
                      Bạn gõ: <span className="line-through">{typed}</span> → <span className="font-bold">{currentCard?.word}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Rich back card with metadata */}
            {currentCard && (currentCard.meaning_vi || currentCard.definition_en) ? (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{currentCard.word}</h3>
                      {currentCard.part_of_speech && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {currentCard.part_of_speech}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(currentCard.word);
                        }}
                        className="p-1 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    {currentCard.ipa && (
                      <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">{formatIpa(currentCard.ipa)}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Ôn lần {currentCard.repetition_count}
                  </span>
                </div>

                <div className="space-y-3 text-left flex-1">
                  {currentCard.meaning_vi && (
                    <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
                      {currentCard.meaning_vi}
                    </p>
                  )}

                  {currentCard.definition_en && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-1">Definition</p>
                      <p className="text-slate-700 dark:text-slate-300 italic text-sm">{currentCard.definition_en}</p>
                    </div>
                  )}

                  {currentCard.example_sentence && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-blue-500 dark:text-blue-400 font-semibold mb-1">Example</p>
                      <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                        "{currentCard.example_sentence}"
                      </p>
                      {currentCard.example_sentence_vi && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{currentCard.example_sentence_vi}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Fallback minimal layout for legacy rows without metadata */
              <div className="flex flex-col items-center justify-center text-center flex-1">
                <span className="text-xs font-bold tracking-widest text-emerald-500 uppercase mb-3">
                  Recall
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-4 break-words">
                  {currentCard?.word}
                </h3>
                <div className="space-y-2 text-slate-600 dark:text-slate-300 max-w-sm">
                  <p className="text-sm">
                    Bạn nhớ nghĩa của từ này không? Hãy tự đánh giá mức độ tự tin
                    của mình bên dưới.
                  </p>
                  {currentCard && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Đã ôn {currentCard.repetition_count} lần · Cấp độ:{' '}
                      {MasteryLevel[currentCard.mastery_level] ?? 'NEW'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons — appear once the learner has answered */}
      {answered && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {RATING_BUTTONS.map((btn, i) => {
            const locked = btn.rating > maxRating;
            const suggested = suggestedRating === btn.rating;
            return (
              <button
                key={btn.rating}
                onClick={() => handleRate(btn.rating)}
                disabled={submitting || locked}
                title={locked ? 'Không khả dụng với kết quả vừa rồi' : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 sm:py-4 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed ${btn.className} ${suggested ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''}`}
              >
                <span className="text-base sm:text-lg">{btn.label}</span>
                <span className="text-[10px] sm:text-xs font-medium opacity-90">
                  {predictedIntervals?.[i] ?? '—'}
                </span>
                <kbd className="hidden sm:block text-[10px] opacity-70">{i + 1}</kbd>
              </button>
            );
          })}
        </div>
      )}

      {/* Helper row */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        {submitting ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu…
          </>
        ) : answered ? (
          <>Bạn nhớ từ này tốt đến mức nào?<span className="hidden sm:inline"> · phím 1–4{suggestedRating !== null ? ' · Enter = gợi ý' : ''}</span></>
        ) : typingMode ? (
          <>
            <Keyboard className="w-3 h-3" /> Nhớ lại từ tiếng Anh rồi gõ vào ô trên
          </>
        ) : (
          <>
            <RotateCcw className="w-3 h-3" /> Nhấn vào thẻ để lật
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  );
};

export default ReviewSession;
