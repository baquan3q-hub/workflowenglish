import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Check, Lightbulb, Loader2, Undo2, Volume2, X } from 'lucide-react';
import { type ConfidenceRating, type WordMasteryRecord } from '../types';
import { RatingButtons } from '../components/ui/RatingButtons';
import { Segmented } from '../components/ui/Segmented';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RATING_META } from '../components/ui/srsTheme';
import { ErrorState, LoadingRegion, Skeleton } from '../components/ui/States';
import { formatIntervalDisplay } from '../services/srsService';
import { getDueWordCount, getDueWords, getNextDueAt } from '../services/masteryService';
import {
  computeReviewUpdate,
  findWordForm,
  formatIpa,
  gradeTypedAnswer,
  type GradeResult,
} from '../services/reviewLogic';
import { applyRating, undoRating } from '../services/reviewService';
import {
  estimateMinutes,
  resolveCardMode,
  summarizeSession,
} from '../services/reviewSessionLogic';
import {
  getPreferences,
  setPreferences,
  REVIEW_SESSION_SIZES,
  type ReviewMode,
  type ReviewSessionSize,
} from '../services/preferencesService';
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

  /** `null` until a session is started from the start screen. */
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

/** A card answered "Again" comes back after this many other cards. */
const RELEARN_GAP = 3;

/** A word is shown at most this many times in one session. */
const MAX_APPEARANCES = 3;

/** Modes offered on the start screen (handwriting arrives with the handwriting pad). */
const MODE_OPTIONS: ReadonlyArray<{ value: ReviewMode; label: string; help: string }> = [
  { value: 'auto', label: 'Tự động', help: 'Từ mới lật thẻ, từ đã quen thì gõ lại từ nghĩa.' },
  { value: 'flip', label: 'Lật thẻ', help: 'Nhìn từ, nhớ nghĩa rồi tự chấm.' },
  { value: 'typing', label: 'Gõ từ', help: 'Nhìn nghĩa tiếng Việt, gõ lại từ tiếng Anh.' },
];

/** One applied rating, kept so it can be undone. */
interface UndoEntry {
  index: number;
  queue: WordMasteryRecord[];
  snapshot: WordMasteryRecord;
  reviewedAt: Date;
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

/** Friendly date for the "next review" line of the empty state. */
function formatNextReviewDate(iso: string | null | undefined): string {
  if (!iso) return 'sớm thôi';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'sớm thôi';
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

const SpeakButton: React.FC<{ word: string }> = ({ word }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      speakText(word);
    }}
    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    title="Nghe phát âm"
    aria-label={`Nghe phát âm ${word}`}
  >
    <Volume2 className="h-5 w-5" aria-hidden="true" />
  </button>
);

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
    {children}
  </kbd>
);

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
  const initialPrefs = useMemo(() => getPreferences(userId), [userId]);
  const [sessionSize, setSessionSize] = useState<ReviewSessionSize>(initialPrefs.reviewSessionSize);
  const [mode, setMode] = useState<ReviewMode>(
    initialPrefs.reviewMode === 'handwriting' ? 'auto' : initialPrefs.reviewMode,
  );

  // Start screen
  const [dueTotal, setDueTotal] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [countAttempt, setCountAttempt] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remainingDue, setRemainingDue] = useState<number | null>(null);
  const [history, setHistory] = useState<UndoEntry[]>([]);
  const [openForgotten, setOpenForgotten] = useState<string | null>(null);

  // Typing-mode state (reset for every card)
  const [typed, setTyped] = useState('');
  const [check, setCheck] = useState<GradeResult | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const started = propDueWords !== null;
  const dueWords = propDueWords || [];

  // Start screen: how many words are waiting (and when the next ones arrive).
  useEffect(() => {
    if (started) return;
    let cancelled = false;
    setCountError(null);
    getDueWordCount(userId)
      .then(async (n) => {
        if (cancelled) return;
        setDueTotal(n);
        if (n === 0) {
          const next = await getNextDueAt(userId).catch(() => null);
          if (!cancelled) setNextReviewIso(next);
        }
      })
      .catch((err) => {
        if (!cancelled) setCountError(err instanceof Error ? err.message : 'Không thể tải số từ đến hạn');
      });
    return () => {
      cancelled = true;
    };
  }, [started, userId, setNextReviewIso, countAttempt]);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFinished(false);
    setRemainingDue(null);
    setHistory([]);
    setRatings([]);
    setCurrentIndex(0);
    try {
      setDueWords(await getDueWords(userId, sessionSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách ôn tập');
    } finally {
      setLoading(false);
    }
  }, [userId, sessionSize, setDueWords, setRatings, setCurrentIndex]);

  const chooseSize = (size: ReviewSessionSize) => {
    setSessionSize(size);
    setPreferences(userId, { reviewSessionSize: size });
  };
  const chooseMode = (next: ReviewMode) => {
    setMode(next);
    setPreferences(userId, { reviewMode: next });
  };

  const currentCard: WordMasteryRecord | undefined = dueWords[currentIndex];
  const typingMode = currentCard ? resolveCardMode(currentCard, mode) === 'typing' : false;

  // Reset per-card UI whenever the card changes
  useEffect(() => {
    setRevealed(false);
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
  const cardShownAtRef = useRef(Date.now());
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
    return RATING_META.map((btn) => {
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
    setRevealed(true);
    speakText(currentCard.word);
  };

  const handleRate = useCallback(
    async (rating: ConfidenceRating) => {
      if (!currentCard || submitting) return;
      if (typingMode && !check) return;
      if (rating > maxRating) return;
      setSubmitting(true);
      const now = new Date();
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
          durationMs: now.getTime() - cardShownAtRef.current,
          creditGoal: !seenBefore,
          now,
        });

        setHistory((h) => [...h, { index: currentIndex, queue: dueWords, snapshot: currentCard, reviewedAt: now }]);
        setRatings((prev) => [...prev, rating]);

        // Celebrate only on the review that reached the goal.
        void goal.then((credit) => {
          if (credit?.justReached && !goalCelebrated) {
            setGoalCelebrated(true);
            const streak = credit.goalsUpdated.current_streak;
            onShowToast?.(`Hoàn thành mục tiêu hôm nay · chuỗi ${streak} ngày`, 'success');
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

  /** Revert the last rating: restore the word's previous state and go back to its card. */
  const handleUndo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || submitting) return;
    setSubmitting(true);
    try {
      await undoRating({ userId, word: last.snapshot.word, snapshot: last.snapshot, reviewedAt: last.reviewedAt });
      setHistory((h) => h.slice(0, -1));
      setRatings((prev) => prev.slice(0, -1));
      setDueWords(last.queue);
      setCurrentIndex(last.index);
      setFinished(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không hoàn tác được');
    } finally {
      setSubmitting(false);
    }
  }, [history, submitting, userId, setRatings, setDueWords, setCurrentIndex]);

  // Keyboard: Space/Enter reveal (or confirm), 1–4 rate, Z undo
  useEffect(() => {
    if (!started || loading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'z' || e.key === 'Z') && history.length > 0) {
        e.preventDefault();
        void handleUndo();
        return;
      }
      if (finished || !currentCard) return;
      if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
      const answered = typingMode ? !!check : revealed;
      if ((e.key === ' ' || e.key === 'Enter') && !typingMode && !revealed) {
        e.preventDefault();
        setRevealed(true);
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
  }, [started, finished, loading, currentCard, typingMode, check, revealed, suggestedRating, handleRate, handleUndo, history.length]);

  const shell = 'mx-auto flex w-full max-w-xl flex-col gap-6';

  // --- Render: loading -----------------------------------------------------
  if (loading) {
    return (
      <LoadingRegion label="Đang tải danh sách ôn tập…" className={shell}>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </LoadingRegion>
    );
  }

  // --- Render: error -------------------------------------------------------
  if (error && dueWords.length === 0) {
    return (
      <div className={`${shell} py-8`}>
        <ErrorState title="Không tải được danh sách ôn tập" message={error} onRetry={() => void startSession()} />
      </div>
    );
  }

  // --- Render: start screen ------------------------------------------------
  if (!started) {
    if (countError) {
      return (
        <div className={`${shell} py-8`}>
          <ErrorState title="Không tải được số từ đến hạn" message={countError} onRetry={() => setCountAttempt((n) => n + 1)} />
        </div>
      );
    }
    if (dueTotal === null) {
      return (
        <LoadingRegion label="Đang kiểm tra từ đến hạn…" className={`${shell} py-4`}>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </LoadingRegion>
      );
    }
    if (dueTotal === 0) {
      return (
        <div className={`${shell} items-center py-12 text-center`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-srs-mastered/10 text-srs-mastered-fg">
            <Check className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-title text-slate-900 dark:text-white">Không có từ nào đến hạn</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Lượt ôn tiếp theo: {formatNextReviewDate(nextReviewIso)}.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-touch items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Về trang chủ
          </button>
        </div>
      );
    }

    const count = Math.min(dueTotal, sessionSize);
    const modeHelp = MODE_OPTIONS.find((m) => m.value === mode)?.help;
    return (
      <div className={`${shell} py-2 sm:py-6`}>
        <header className="space-y-1">
          <h2 className="text-title text-slate-900 dark:text-white">Ôn tập</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{dueTotal}</span> từ đến hạn
          </p>
        </header>

        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Số từ mỗi phiên</p>
            <Segmented
              label="Số từ mỗi phiên"
              options={REVIEW_SESSION_SIZES.map((n) => ({ value: n, label: n }))}
              value={sessionSize}
              onChange={chooseSize}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Cách ôn</p>
            <Segmented
              label="Cách ôn"
              options={MODE_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
              value={mode}
              onChange={chooseMode}
            />
            <p className="text-sm text-slate-600 dark:text-slate-400">{modeHelp}</p>
          </div>
        </section>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void startSession()}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-base font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Bắt đầu · {count} từ
          </button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Khoảng {estimateMinutes(count)} phút
          </p>
        </div>
      </div>
    );
  }

  // --- Render: started but nothing was due ----------------------------------
  if (dueWords.length === 0) {
    return (
      <div className={`${shell} items-center py-12 text-center`}>
        <h2 className="text-title text-slate-900 dark:text-white">Không có từ nào đến hạn</h2>
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex min-h-touch items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  // --- Render: completion summary ------------------------------------------
  if (finished) {
    const summary = summarizeSession(dueWords, ratings);
    const byWord = new Map(dueWords.map((w) => [w.word, w]));
    const nextBatch = remainingDue !== null ? Math.min(remainingDue, sessionSize) : 0;

    return (
      <div className={`${shell} py-2 sm:py-6`}>
        <header className="space-y-1 text-center">
          <h2 className="text-title text-slate-900 dark:text-white">Xong phiên ôn tập</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {summary.dueByTomorrow > 0
              ? `${summary.dueByTomorrow} từ sẽ gặp lại trước hết ngày mai`
              : 'Các từ đã được xếp lịch ôn mới'}
          </p>
        </header>

        <dl className="grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white py-5 shadow-card dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {[
            { label: 'Đã ôn', value: summary.reviewed, tone: 'text-slate-900 dark:text-white' },
            { label: 'Nhớ', value: summary.remembered, tone: 'text-rate-easy-fg' },
            { label: 'Quên', value: summary.forgotten.length, tone: 'text-rate-again-fg' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</dt>
              <dd className={`text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</dd>
            </div>
          ))}
        </dl>

        {summary.forgotten.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Từ cần củng cố</h3>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {summary.forgotten.map((word) => {
                const rec = byWord.get(word);
                const open = openForgotten === word;
                return (
                  <li key={word}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenForgotten(open ? null : word)}
                      className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">{word}</span>
                      <span className={`truncate text-sm text-slate-600 dark:text-slate-400 ${open ? '' : 'sm:max-w-[60%]'}`}>
                        {open ? '' : rec?.meaning_vi ?? ''}
                      </span>
                    </button>
                    {open && rec && (
                      <div className="space-y-1 px-4 pb-3 text-sm">
                        {rec.meaning_vi && <p className="text-slate-800 dark:text-slate-200">{rec.meaning_vi}</p>}
                        {rec.example_sentence && <p className="text-slate-600 dark:text-slate-400">{rec.example_sentence}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Xong
          </button>
          {nextBatch > 0 && (
            <button
              type="button"
              onClick={() => void startSession()}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Ôn tiếp {nextBatch} từ
            </button>
          )}
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => void handleUndo()}
            disabled={submitting}
            className="mx-auto inline-flex min-h-touch items-center gap-1.5 px-3 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" /> Hoàn tác lần chấm cuối
          </button>
        )}
      </div>
    );
  }

  // --- Render: active review ----------------------------------------------
  const progressPercent = uniqueTotal > 0 ? (uniqueDone / uniqueTotal) * 100 : 0;
  const isRelearn = !!currentCard && dueWords.slice(0, currentIndex).some((w) => w.word === currentCard.word);
  const answered = typingMode ? !!check : revealed;
  const blanked = currentCard ? blankExample(currentCard.example_sentence, currentCard.word) : null;
  const iconButton =
    'inline-flex min-h-touch min-w-touch items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

  return (
    <div className={shell}>
      {/* Top bar: close · progress · undo */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className={iconButton} aria-label="Thoát phiên ôn tập" title="Thoát">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-label="Tiến độ phiên ôn"
          aria-valuemin={0}
          aria-valuemax={uniqueTotal}
          aria-valuenow={uniqueDone}
        >
          <div className="h-full rounded-full bg-slate-900 transition-[width] duration-300 dark:bg-white" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="min-w-[3.5rem] text-right text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400">
          {uniqueDone}/{uniqueTotal}
        </span>
        <button
          type="button"
          onClick={() => void handleUndo()}
          disabled={history.length === 0 || submitting}
          className={iconButton}
          aria-label="Hoàn tác lần chấm vừa rồi"
          aria-keyshortcuts="Z"
          title="Hoàn tác (Z)"
        >
          <Undo2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Card */}
      <article
        className={`relative flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-8 ${
          !typingMode && !revealed ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (!typingMode && !revealed) setRevealed(true);
        }}
        aria-live="polite"
      >
        {currentCard && (
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <StatusBadge level={currentCard.mastery_level} variant="label" />
            {isRelearn && <span>Học lại</span>}
          </div>
        )}

        {/* Prompt */}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          {typingMode && currentCard ? (
            <>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{currentCard.meaning_vi}</p>
              {currentCard.part_of_speech && (
                <p className="text-sm italic text-slate-500 dark:text-slate-400">{currentCard.part_of_speech}</p>
              )}
              {blanked && !check && (
                <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">{blanked}</p>
              )}
              {hintShown && !check && (
                <p className="mt-1 font-mono text-lg tracking-wider text-slate-700 dark:text-slate-300">
                  {firstLetterHint(currentCard.word)}
                </p>
              )}
            </>
          ) : (
            currentCard && (
              <>
                <h3 className="break-words text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                  {currentCard.word}
                </h3>
                <div className="flex items-center gap-1">
                  {currentCard.ipa && (
                    <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{formatIpa(currentCard.ipa)}</span>
                  )}
                  <SpeakButton word={currentCard.word} />
                </div>
              </>
            )
          )}
        </div>

        {/* Typing input */}
        {typingMode && !check && currentCard && (
          <form onSubmit={handleCheck} className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <label htmlFor="review-answer" className="sr-only">Từ tiếng Anh</label>
            <input
              id="review-answer"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Gõ từ tiếng Anh"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-lg font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/10"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCheck()}
                className="inline-flex min-h-touch items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Không nhớ
              </button>
              {!hintShown && (
                <button
                  type="button"
                  onClick={() => setHintShown(true)}
                  className="inline-flex min-h-touch items-center gap-1.5 px-3 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  title="Gợi ý chữ cái đầu (chấm tối đa Khó)"
                >
                  <Lightbulb className="h-4 w-4" aria-hidden="true" /> Gợi ý
                </button>
              )}
              <button
                type="submit"
                disabled={!typed.trim()}
                className="ml-auto inline-flex min-h-touch items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Kiểm tra
              </button>
            </div>
          </form>
        )}

        {/* Answer */}
        {answered && currentCard && (
          <div className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
            {typingMode && check && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={`text-sm font-semibold ${
                    check.grade === 'correct' ? 'text-rate-easy-fg' : check.grade === 'close' ? 'text-rate-hard-fg' : 'text-rate-again-fg'
                  }`}
                >
                  {check.grade === 'correct'
                    ? hintShown ? 'Đúng, có dùng gợi ý' : 'Đúng'
                    : check.grade === 'close'
                      ? 'Gần đúng, chú ý chính tả'
                      : typed.trim() ? 'Chưa đúng' : 'Chưa nhớ'}
                </span>
                {typed.trim() && check.grade !== 'correct' && (
                  <span className="text-sm text-slate-500 line-through dark:text-slate-400">{typed}</span>
                )}
              </div>
            )}

            {typingMode && (
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-2xl font-semibold text-slate-900 dark:text-white">{currentCard.word}</span>
                {currentCard.ipa && (
                  <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{formatIpa(currentCard.ipa)}</span>
                )}
                <SpeakButton word={currentCard.word} />
              </div>
            )}

            {currentCard.meaning_vi || currentCard.definition_en || currentCard.example_sentence ? (
              <dl className="space-y-3 text-left">
                {!typingMode && currentCard.meaning_vi && (
                  <div>
                    <dt className="sr-only">Nghĩa</dt>
                    <dd className="text-lg font-medium text-slate-900 dark:text-white">
                      {currentCard.meaning_vi}
                      {currentCard.part_of_speech && (
                        <span className="ml-2 text-sm font-normal italic text-slate-500 dark:text-slate-400">{currentCard.part_of_speech}</span>
                      )}
                    </dd>
                  </div>
                )}
                {currentCard.definition_en && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Định nghĩa</dt>
                    <dd className="text-sm text-slate-700 dark:text-slate-300">{currentCard.definition_en}</dd>
                  </div>
                )}
                {currentCard.example_sentence && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Ví dụ</dt>
                    <dd className="text-sm text-slate-800 dark:text-slate-200">
                      {currentCard.example_sentence}
                      {currentCard.example_sentence_vi && (
                        <span className="mt-0.5 block text-slate-500 dark:text-slate-400">{currentCard.example_sentence_vi}</span>
                      )}
                    </dd>
                  </div>
                )}
                {currentCard.personal_note && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Ghi chú của bạn</dt>
                    <dd className="whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">{currentCard.personal_note}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Từ này chưa có nghĩa lưu sẵn. Hãy tự đánh giá bạn nhớ nó tốt đến mức nào.
              </p>
            )}
          </div>
        )}
      </article>

      {/* Actions */}
      {answered ? (
        <RatingButtons
          onRate={(r) => void handleRate(r)}
          disabled={submitting}
          maxRating={maxRating}
          suggested={suggestedRating}
          hints={predictedIntervals ?? undefined}
        />
      ) : (
        !typingMode && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex min-h-[64px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-base font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Hiện đáp án
          </button>
        )
      )}

      {/* Status / shortcuts */}
      <div className="flex min-h-[20px] items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        {submitting ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Đang lưu…
          </span>
        ) : error ? (
          <span role="alert" className="text-rate-again-fg">{error}</span>
        ) : (
          <span className="hidden items-center gap-3 sm:inline-flex">
            {answered ? (
              <>
                <span><Kbd>1</Kbd>–<Kbd>4</Kbd> chấm</span>
                {suggestedRating !== null && <span><Kbd>Enter</Kbd> theo gợi ý</span>}
              </>
            ) : (
              !typingMode && <span><Kbd>Space</Kbd> hiện đáp án</span>
            )}
            {history.length > 0 && <span><Kbd>Z</Kbd> hoàn tác</span>}
          </span>
        )}
      </div>
    </div>
  );
};

export default ReviewSession;
