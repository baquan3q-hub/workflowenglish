import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowLeft, RotateCcw, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import {
  type ConfidenceRating,
  MasteryLevel,
  type WordMasteryRecord,
} from '../types';
import { Button, ProgressBar } from '../components/Common';
import {
  calculateSRS,
  formatIntervalDisplay,
  type SRSCard,
} from '../services/srsService';
import {
  determineMasteryTransition,
  getDueWords,
  upsertWordMastery,
} from '../services/masteryService';
import { recordWordReview } from '../services/goalService';

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
 * Build the SRS card snapshot from a mastery record. Brand-new words have
 * `interval_days = 0`, but the SRS algorithm expects values that produce
 * meaningful predicted intervals — the calculation handles this on its
 * own (rep=0 cases short-circuit).
 */
function toSRSCard(record: WordMasteryRecord): SRSCard {
  return {
    easinessFactor: record.easiness_factor,
    intervalDays: record.interval_days,
    repetitionCount: record.repetition_count,
  };
}

/**
 * Format the next-review date returned by `getDueWords` into a friendly
 * Vietnamese string for the empty-state message.
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
  setDueWords: propSetDueWords,
  currentIndex: propCurrentIndex,
  setCurrentIndex: propSetCurrentIndex,
  ratings: propRatings,
  setRatings: propSetRatings,
  goalCelebrated: propGoalCelebrated,
  setGoalCelebrated: propSetGoalCelebrated,
  nextReviewIso: propNextReviewIso,
  setNextReviewIso: propSetNextReviewIso,
}) => {
  const [loading, setLoading] = useState(propDueWords === null);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  // Local wrappers or references to the prop states
  const dueWords = propDueWords || [];
  const setDueWords = propSetDueWords;
  const currentIndex = propCurrentIndex;
  const setCurrentIndex = propSetCurrentIndex;
  const ratings = propRatings;
  const setRatings = propSetRatings;
  const goalCelebrated = propGoalCelebrated;
  const setGoalCelebrated = propSetGoalCelebrated;
  const nextReviewIso = propNextReviewIso;
  const setNextReviewIso = propSetNextReviewIso;

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
        const due = await getDueWords(userId);
        if (cancelled) return;
        setDueWords(due);
        // If empty, we don't strictly need a next date — design.md just
        // mentions a congratulatory empty state. Leave hook for later.
        setNextReviewIso(null);
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

  const currentCard = dueWords[currentIndex];

  /**
   * Predicted intervals for each rating, computed from the *current* card's
   * SRS state. Used to label the rating buttons (e.g. "3 ngày" under "Tốt").
   * Memoized so we don't re-run SM-2 on every render.
   */
  const predictedIntervals = useMemo(() => {
    if (!currentCard) return null;
    const card = toSRSCard(currentCard);
    return RATING_BUTTONS.map((btn) => {
      const result = calculateSRS(card, btn.rating);
      return formatIntervalDisplay(result.intervalDays);
    });
  }, [currentCard]);

  const handleRate = useCallback(
    async (rating: ConfidenceRating) => {
      if (!currentCard || submitting) return;
      setSubmitting(true);
      try {
        const card = toSRSCard(currentCard);
        const srs = calculateSRS(card, rating);
        const newLevel = determineMasteryTransition(
          currentCard.mastery_level,
          rating,
          srs.repetitionCount,
          srs.intervalDays,
        );
        const reviewedAt = new Date().toISOString();
        const successful = rating >= 2;
        await upsertWordMastery({
          user_id: userId,
          word: currentCard.word,
          mastery_level: newLevel,
          easiness_factor: srs.easinessFactor,
          interval_days: srs.intervalDays,
          repetition_count: srs.repetitionCount,
          next_review_date: srs.nextReviewDate.toISOString(),
          last_reviewed_at: reviewedAt,
          correct_count:
            (currentCard.correct_count ?? 0) + (successful ? 1 : 0),
          incorrect_count:
            (currentCard.incorrect_count ?? 0) + (successful ? 0 : 1),
        });

        setRatings((prev) => [...prev, rating]);

        // Count the review against the user's daily goal. We only credit
        // successful recalls (rating >= Good) and we don't block on it —
        // any failure is logged but does not interrupt the session.
        if (successful) {
          try {
            const result = await recordWordReview(userId);
            if (result.goalReached && !goalCelebrated) {
              setGoalCelebrated(true);
              const streak = result.goalsUpdated.current_streak;
              onShowToast?.(
                `🎉 Hoàn thành mục tiêu hôm nay! Streak: ${streak} ngày`,
                'success',
              );
            }
          } catch (goalErr) {
            // Non-fatal — goal tracking shouldn't break the review flow.
            console.warn('recordWordReview failed:', goalErr);
          }
        }

        // Advance to the next word, or end the session.
        if (currentIndex + 1 >= dueWords.length) {
          setFinished(true);
        } else {
          setCurrentIndex((idx) => idx + 1);
          setIsFlipped(false);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể lưu kết quả ôn tập';
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, currentIndex, dueWords.length, submitting, userId, goalCelebrated, onShowToast],
  );

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
    const total = ratings.length;
    const sum = ratings.reduce((a, r) => a + r, 0);
    const avg = total > 0 ? sum / total : 0;
    // 0..3 -> 0..100% for a friendly display
    const avgPercent = Math.round((avg / 3) * 100);

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
              {total}
            </span>{' '}
            từ.
          </p>
        </div>

        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Mức độ tự tin trung bình
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {avgPercent}%
            </span>
          </div>
          <ProgressBar progress={avgPercent} />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Trung bình {avg.toFixed(2)} / 3
          </p>
        </div>

        <Button variant="primary" onClick={onComplete}>
          <CheckCircle className="w-4 h-4 mr-2" /> Hoàn thành
        </Button>
      </div>
    );
  }

  // --- Render: active review ----------------------------------------------
  const total = dueWords.length;
  const reviewedCount = ratings.length;
  const progressPercent = total > 0 ? (reviewedCount / total) * 100 : 0;

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
            {reviewedCount} / {total} từ đã ôn
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <ProgressBar progress={progressPercent} />
      </div>

      {/* Flashcard */}
      <div
        className="w-full perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped((v) => !v)}
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
              isFlipped ? 'invisible' : ''
            } w-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-blue-100 dark:border-blue-900 flex flex-col items-center justify-center p-6 sm:p-8`}
            style={{ minHeight: '280px' }}
          >
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-3">
              Word
            </span>
            <h3 className="text-3xl sm:text-5xl font-bold text-slate-800 dark:text-white mb-3 text-center break-words">
              {currentCard?.word}
            </h3>
            <p className="text-slate-400 dark:text-slate-500 italic text-sm">
              — {/* IPA placeholder — schema doesn't store IPA */}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-4">
              Tap to flip
            </p>
          </div>

          {/* BACK */}
          <div
            className={`${
              !isFlipped ? 'invisible' : ''
            } absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-emerald-100 dark:border-emerald-900 flex flex-col p-4 sm:p-6 overflow-y-auto`}
            style={{ minHeight: '280px' }}
          >
            {/* Rich back card with metadata */}
            {currentCard && (currentCard.meaning_vi || currentCard.definition_en) ? (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{currentCard.word}</h3>
                      {currentCard.part_of_speech && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {currentCard.part_of_speech}
                        </span>
                      )}
                    </div>
                    {currentCard.ipa && (
                      <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">/{currentCard.ipa}/</p>
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
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {RATING_BUTTONS.map((btn, i) => (
          <button
            key={btn.rating}
            onClick={() => handleRate(btn.rating)}
            disabled={submitting}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 sm:py-4 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${btn.className}`}
          >
            <span className="text-base sm:text-lg">{btn.label}</span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90">
              {predictedIntervals?.[i] ?? '—'}
            </span>
          </button>
        ))}
      </div>

      {/* Helper row */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        {submitting ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu…
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
