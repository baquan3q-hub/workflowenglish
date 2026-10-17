import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Volume2, ChevronLeft, ChevronRight, StopCircle } from 'lucide-react';
import { FlashcardData, MasteryLevel, ConfidenceRating, WordMasteryRecord } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Segmented } from '../components/ui/Segmented';
import { RatingButtons } from '../components/ui/RatingButtons';
import { RATING_META } from '../components/ui/srsTheme';
import { FlashcardWorkspace, type WorkspaceTab } from '../components/flashcards/FlashcardWorkspace';
import {
  bulkEnsureWordsWithMetadata,
  getWordMastery,
  normalizeWord,
} from '../services/masteryService';
import { applyRating } from '../services/reviewService';
import { savePersonalNote } from '../services/noteService';
import { formatIpa, suggestedRatingForGrade, type AnswerGrade } from '../services/reviewLogic';
import type { ReviewSource } from '../types';

interface FlashcardsProps {
  cards: FlashcardData[];
  userId: string;
  onNextPhase: () => void;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  masteryMap?: Record<string, WordMasteryRecord | null>;
  onMasteryMapChange?: (map: Record<string, WordMasteryRecord | null>) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
}

type Speed = '0.75' | '1' | '1.25';

const SWIPE_THRESHOLD = 80;

/** Whether `iso` falls on today's local calendar day. */
function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</p>
);

const iconButton =
  'inline-flex min-h-touch min-w-touch items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

const Flashcards: React.FC<FlashcardsProps> = ({
  cards,
  userId,
  onNextPhase,
  initialIndex = 0,
  onIndexChange,
  masteryMap: parentMasteryMap,
  onMasteryMapChange,
  onShowToast,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  // When the current card was shown, for the review log's thinking time.
  const cardShownAtRef = useRef(Date.now());

  // Practice on the current card; reset when the card changes.
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('spell');
  const [spellingGrade, setSpellingGrade] = useState<AnswerGrade | null>(null);
  const [handwritingCompared, setHandwritingCompared] = useState(false);
  useEffect(() => {
    cardShownAtRef.current = Date.now();
    setSpellingGrade(null);
    setHandwritingCompared(false);
  }, [currentIndex]);

  // Ratings given on this screen, by normalized word.
  const [ratings, setRatings] = useState<Record<string, ConfidenceRating>>({});
  const [remindShown, setRemindShown] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const remindRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (remindOpen) remindRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [remindOpen]);

  // Swipe gesture states
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [flyOutDirection, setFlyOutDirection] = useState<'left' | 'right' | null>(null);
  const hasDraggedRef = useRef(false);

  // Audio state (browser SpeechSynthesis — free, no API cost)
  const [playingText, setPlayingText] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<Speed>('1');

  // Word-level highlighting via onboundary event
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  // Mastery tracking — keyed by normalized word. The ref lets async saves
  // merge into the latest map.
  const [masteryMap, setMasteryMapState] = useState<Record<string, WordMasteryRecord | null>>(parentMasteryMap ?? {});
  const masteryMapRef = useRef(masteryMap);
  const setMasteryMap = useCallback(
    (next: Record<string, WordMasteryRecord | null>) => {
      masteryMapRef.current = next;
      setMasteryMapState(next);
      onMasteryMapChange?.(next);
    },
    [onMasteryMapChange],
  );

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);
  const [masteryLoaded, setMasteryLoaded] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  const currentCard = cards[currentIndex];
  const currentNormalizedWord = useMemo(
    () => (currentCard ? normalizeWord(currentCard.word) : ''),
    [currentCard],
  );
  const currentMastery = masteryMap[currentNormalizedWord] ?? null;
  const currentLevel: MasteryLevel = currentMastery?.mastery_level ?? MasteryLevel.NEW;

  const isRated = useCallback(
    (word: string) => {
      const key = normalizeWord(word);
      return ratings[key] !== undefined || isToday(masteryMap[key]?.last_reviewed_at);
    },
    [ratings, masteryMap],
  );
  const ratedCount = useMemo(() => cards.filter((c) => isRated(c.word)).length, [cards, isRated]);
  const unratedCount = cards.length - ratedCount;

  // Ratings open once the answer is seen: flipped, spelled or compared.
  const canRate = masteryLoaded && (isFlipped || spellingGrade !== null || handwritingCompared);
  const suggested = spellingGrade !== null ? suggestedRatingForGrade(spellingGrade) : null;
  const currentRating = ratings[currentNormalizedWord];

  // Compute swipe styles dynamically
  const cardStyle = useMemo(() => {
    if (flyOutDirection) {
      const sign = flyOutDirection === 'right' ? 1 : -1;
      return {
        transform: `translateX(${sign * 150}%) rotate(${sign * 15}deg)`,
        opacity: 0,
        transition: 'all 300ms ease-in-out',
      };
    }
    if (isDragging) {
      return {
        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
        transition: 'none',
      };
    }
    return {
      transform: 'none',
      transition: 'all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    };
  }, [isDragging, dragOffset, flyOutDirection]);

  // --- Mastery bootstrap on mount / cards change ---------------------------
  useEffect(() => {
    let cancelled = false;

    // Use cached/parent mastery mapping if already loaded to avoid N+1 queries
    if (parentMasteryMap && Object.keys(parentMasteryMap).length > 0) {
      masteryMapRef.current = parentMasteryMap;
      setMasteryMapState(parentMasteryMap);
      setMasteryLoaded(true);
      return;
    }

    setMasteryLoaded(false);

    const words = cards.map((c) => c.word);
    if (words.length === 0) {
      setMasteryLoaded(true);
      return;
    }

    (async () => {
      try {
        // Ensure rows exist for every word in this lesson with full metadata.
        await bulkEnsureWordsWithMetadata(userId, cards);
        const records = await Promise.all(
          words.map((w) => getWordMastery(userId, w).catch(() => null)),
        );
        if (cancelled) return;

        const next: Record<string, WordMasteryRecord | null> = {};
        words.forEach((w, i) => {
          next[normalizeWord(w)] = records[i];
        });
        setMasteryMap(next);
      } catch (err) {
        // Don't block the card display on a network error.
        console.error('Failed to load word mastery for flashcards:', err);
      } finally {
        if (!cancelled) setMasteryLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, cards, parentMasteryMap, setMasteryMap]);

  const cleanupAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlayingText(null);
    setActiveWordIndex(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [currentIndex, cleanupAudio]);

  const goTo = (index: number) => {
    cleanupAudio();
    setIsFlipped(false);
    setRemindOpen(false);
    setTimeout(() => setCurrentIndex(index), 200);
  };
  const handleNext = () => goTo((currentIndex + 1) % cards.length);
  const handlePrev = () => goTo((currentIndex - 1 + cards.length) % cards.length);

  const handlePlayAudio = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle off if same text
    if (playingText === text) {
      cleanupAudio();
      return;
    }

    cleanupAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = parseFloat(playbackSpeed);

    // Try to pick a better voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;

    // Word-level highlighting via boundary events
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let charCursor = 0;
    const wordBoundaries = words.map(word => {
      const idx = text.indexOf(word, charCursor);
      const boundary = { start: idx, end: idx + word.length };
      charCursor = idx + word.length;
      return boundary;
    });

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        const wordIdx = wordBoundaries.findIndex(b => charIdx >= b.start && charIdx < b.end);
        if (wordIdx !== -1) {
          setActiveWordIndex(wordIdx);
        }
      }
    };

    utterance.onstart = () => setPlayingText(text);
    utterance.onend = () => { setPlayingText(null); setActiveWordIndex(null); };
    utterance.onerror = () => { setPlayingText(null); setActiveWordIndex(null); };

    window.speechSynthesis.speak(utterance);
  };

  // --- Rating ----------------------------------------------------------------
  const handleRating = async (rating: ConfidenceRating) => {
    if (savingRating || !currentCard) return;

    const source: ReviewSource =
      spellingGrade !== null ? 'spelling' : handwritingCompared ? 'handwriting' : 'lesson_flashcard';
    const alreadyRated = isRated(currentCard.word);
    const word = currentNormalizedWord;

    setSavingRating(true);
    try {
      // Shared write path: applies SM-2 plus the same-session guard, so
      // rating a card here and then answering the quiz doesn't double-advance it.
      // currentMastery is null when the row couldn't be loaded; applyRating
      // then starts from a brand-new word's SRS state.
      const { record: updated, goal } = await applyRating({
        userId,
        word: currentCard.word,
        current: currentMastery,
        rating,
        source,
        durationMs: Date.now() - cardShownAtRef.current,
        // A second rating of the same card today shouldn't count twice.
        creditGoal: !alreadyRated,
      });

      void goal.then((credit) => {
        if (credit?.justReached) {
          onShowToast?.(`Hoàn thành mục tiêu hôm nay. Chuỗi ${credit.goalsUpdated.current_streak} ngày`, 'success');
        }
      });

      setMasteryMap({ ...masteryMapRef.current, [word]: updated });
      setRatings((prev) => ({ ...prev, [word]: rating }));

      // Auto-advance to the next card after rating
      if (currentIndex < cards.length - 1) goTo(currentIndex + 1);
      else {
        cleanupAudio();
        setIsFlipped(false);
      }
    } catch (err) {
      console.error('Failed to save rating:', err);
      onShowToast?.('Chưa lưu được đánh giá, thử lại nhé', 'info');
    } finally {
      setSavingRating(false);
    }
  };

  const handleSaveNote = useCallback(
    async (word: string, note: string) => {
      const saved = await savePersonalNote(userId, word, note);
      const key = normalizeWord(word);
      const prev = masteryMapRef.current[key];
      setMasteryMap({ ...masteryMapRef.current, [key]: prev ? { ...prev, personal_note: saved.personal_note } : saved });
    },
    [userId, setMasteryMap],
  );

  // --- Swipe: right = Tốt, left = Lại ----------------------------------------
  const triggerSwipeOut = (dir: 'left' | 'right') => {
    setFlyOutDirection(dir);
    setTimeout(() => {
      void handleRating(dir === 'right' ? 2 : 0);
      setDragOffset(0);
      setFlyOutDirection(null);
    }, 300);
  };

  const handleDragStart = (clientX: number) => {
    if (!isFlipped || !canRate || savingRating) return;
    setDragStartX(clientX);
    setIsDragging(true);
    hasDraggedRef.current = false;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || dragStartX === null) return;
    const offset = clientX - dragStartX;
    setDragOffset(offset);
    if (Math.abs(offset) > 5) hasDraggedRef.current = true;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragStartX(null);
    if (dragOffset > SWIPE_THRESHOLD) triggerSwipeOut('right');
    else if (dragOffset < -SWIPE_THRESHOLD) triggerSwipeOut('left');
    else setDragOffset(0);
  };

  // --- Keyboard: space/enter flip · 1–4 rate · ←/→ browse --------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (e.target instanceof HTMLButtonElement) return; // let the focused button handle it
        e.preventDefault();
        setIsFlipped((v) => !v);
      } else if (e.key >= '1' && e.key <= '4') {
        if (!canRate || savingRating) return;
        e.preventDefault();
        void handleRating((Number(e.key) - 1) as ConfidenceRating);
      } else if (e.key === 'ArrowRight' && currentIndex < cards.length - 1) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const finish = () => {
    if (unratedCount > 0 && !remindShown) {
      setRemindShown(true);
      setRemindOpen(true);
      return;
    }
    cleanupAudio();
    onNextPhase();
  };

  if (!currentCard) return null;

  const isLastCard = currentIndex === cards.length - 1;
  const isTextPlaying = (text: string) => playingText === text;

  // Render text with word-level highlighting
  const renderHighlightedText = (text: string, isActive: boolean) => {
    if (!isActive) return <span>{text}</span>;

    const parts = text.split(/(\s+)/);
    let timingWordCounter = 0;

    return (
      <>
        {parts.map((part, pIdx) => {
          const isWhitespace = /^\s+$/.test(part);
          const currentTimingIdx = isWhitespace ? -1 : timingWordCounter++;
          const isWordActive = currentTimingIdx === activeWordIndex;
          return (
            <span
              key={pIdx}
              className={`rounded px-0.5 transition-colors duration-150 ${isWordActive ? 'bg-blue-500 text-white' : ''}`}
            >
              {part}
            </span>
          );
        })}
      </>
    );
  };

  const audioButton = (text: string, label: string) => (
    <button
      type="button"
      onClick={(e) => handlePlayAudio(text, e)}
      aria-label={isTextPlaying(text) ? 'Dừng' : label}
      title={label}
      className={`${iconButton} ${isTextPlaying(text) ? 'text-blue-600 dark:text-blue-400' : ''}`}
    >
      {isTextPlaying(text) ? <StopCircle className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
    </button>
  );

  const swipeOpacity = (dir: 1 | -1) =>
    flyOutDirection ? (flyOutDirection === (dir === 1 ? 'right' : 'left') ? 1 : 0) : Math.max(0, Math.min((dir * dragOffset) / SWIPE_THRESHOLD, 1));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-heading font-semibold text-slate-900 dark:text-white">Thẻ từ vựng</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
            Đã chấm <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{ratedCount}/{cards.length}</span> thẻ
          </p>
        </div>
        <Segmented<Speed>
          label="Tốc độ đọc"
          value={playbackSpeed}
          onChange={setPlaybackSpeed}
          options={[
            { value: '0.75', label: '0.75×' },
            { value: '1', label: '1×' },
            { value: '1.25', label: '1.25×' },
          ]}
        />
      </div>

      {/* Progress: one segment per card, filled once rated */}
      <div className="flex gap-1" aria-hidden="true">
        {cards.map((c, i) => (
          <span
            key={c.word + i}
            className={`h-1 flex-1 rounded-full ${
              isRated(c.word) ? 'bg-slate-900 dark:bg-white' : i === currentIndex ? 'bg-slate-400 dark:bg-slate-500' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="perspective-1000 relative w-full cursor-pointer touch-pan-y select-none"
        style={{ minHeight: '300px', ...cardStyle }}
        onClick={() => {
          if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            return;
          }
          setIsFlipped((v) => !v);
        }}
        onMouseDown={(e) => {
          if (e.button === 0) handleDragStart(e.clientX);
        }}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => isDragging && handleDragEnd()}
        onTouchStart={(e) => e.touches.length > 0 && handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => e.touches.length > 0 && handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div className={`transform-style-3d relative w-full transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`} style={{ minHeight: '300px' }}>
          {/* FRONT */}
          <div
            className={`${isFlipped ? 'invisible absolute inset-0' : 'relative'} backface-hidden flex w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8`}
            style={{ minHeight: '300px' }}
          >
            {masteryLoaded && (
              <div className="absolute right-4 top-4">
                <StatusBadge level={currentLevel} variant="dot" size="md" />
              </div>
            )}
            <h3 className="break-words text-center text-display font-semibold text-slate-900 dark:text-white">{currentCard.word}</h3>
            {currentCard.definitionEnglish && (
              <p className="mt-4 max-w-md text-center text-base italic leading-relaxed text-slate-500 dark:text-slate-400">
                “{currentCard.definitionEnglish}”
              </p>
            )}
            <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
              Chạm để xem nghĩa<span className="hidden sm:inline"> · phím cách</span>
            </p>
          </div>

          {/* BACK */}
          <div
            className={`${!isFlipped ? 'invisible absolute inset-0 overflow-hidden' : 'relative'} backface-hidden rotate-y-180 flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6`}
            style={{ minHeight: '300px' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-title font-semibold text-slate-900 dark:text-white">{currentCard.word}</h3>
                  {currentCard.partOfSpeech && (
                    <span className="text-sm italic text-slate-500 dark:text-slate-400">{currentCard.partOfSpeech}</span>
                  )}
                </div>
                <div className="-ml-2 flex items-center font-mono text-sm text-slate-500 dark:text-slate-400">
                  {audioButton(currentCard.word, `Nghe phát âm ${currentCard.word}`)}
                  <span>{formatIpa(currentCard.ipa)}</span>
                </div>
              </div>
              {masteryLoaded && <StatusBadge level={currentLevel} />}
            </div>

            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{currentCard.meaningVietnamese}</p>
            {currentCard.definitionEnglish && (
              <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">{currentCard.definitionEnglish}</p>
            )}

            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <div className="flex items-center justify-between">
                  <SectionLabel>Ví dụ</SectionLabel>
                  <div className="-my-2 -mr-2">{audioButton(currentCard.exampleSentence, 'Nghe câu ví dụ')}</div>
                </div>
                <p className="leading-relaxed text-slate-800 dark:text-slate-200">
                  {renderHighlightedText(currentCard.exampleSentence, isTextPlaying(currentCard.exampleSentence))}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{currentCard.exampleSentenceVietnamese}</p>
              </div>

              {currentCard.collocations && currentCard.collocations.length > 0 && (
                <div>
                  <SectionLabel>Cụm từ hay đi kèm</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {currentCard.collocations.map((c) => (
                      <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentCard.memoryTip && (
                <div>
                  <SectionLabel>Mẹo nhớ</SectionLabel>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{currentCard.memoryTip}</p>
                </div>
              )}

              {currentMastery?.personal_note && (
                <div>
                  <SectionLabel>Ghi chú của bạn</SectionLabel>
                  <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{currentMastery.personal_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swipe hints */}
        {isFlipped && (isDragging || flyOutDirection) && (
          <>
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start rounded-2xl border-2 border-rate-good p-5"
              style={{ opacity: swipeOpacity(1) }}
            >
              <span className="rounded-lg bg-rate-good-solid px-3 py-1 text-sm font-semibold text-white">Tốt</span>
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-2xl border-2 border-rate-again p-5"
              style={{ opacity: swipeOpacity(-1) }}
            >
              <span className="rounded-lg bg-rate-again-solid px-3 py-1 text-sm font-semibold text-white">Lại</span>
            </div>
          </>
        )}
      </div>

      {/* Rating */}
      <div className="min-h-[64px]">
        {canRate ? (
          <div>
            <RatingButtons onRate={(r) => void handleRating(r)} disabled={savingRating} suggested={suggested} />
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              {currentRating !== undefined
                ? `Đã chấm ${RATING_META[currentRating].label} · chấm lại nếu muốn`
                : 'Vuốt thẻ phải: Tốt · trái: Lại'}
              <span className="hidden sm:inline"> · phím 1–4</span>
            </p>
          </div>
        ) : (
          <p className="flex min-h-[64px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Lật thẻ, gõ hoặc viết từ để tự chấm
          </p>
        )}
      </div>

      {/* Practice */}
      <FlashcardWorkspace
        key={currentNormalizedWord}
        word={currentCard.word}
        note={currentMastery?.personal_note ?? null}
        onSaveNote={(note) => handleSaveNote(currentCard.word, note)}
        onSpellingGrade={setSpellingGrade}
        onHandwritingCompared={() => setHandwritingCompared(true)}
        tab={workspaceTab}
        onTabChange={setWorkspaceTab}
      />

      {/* Reminder before leaving with unrated cards */}
      {remindOpen && (
        <div ref={remindRef} role="status" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="font-semibold text-slate-900 dark:text-white">Còn {unratedCount} thẻ chưa chấm</p>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Chấm xong, lịch ôn tập sẽ khớp với mức nhớ của bạn hơn.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const first = cards.findIndex((c) => !isRated(c.word));
                if (first >= 0) goTo(first);
              }}
              className="min-h-touch rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Chấm thẻ còn lại
            </button>
            <button
              type="button"
              onClick={() => {
                cleanupAudio();
                onNextPhase();
              }}
              className="min-h-touch rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Vẫn sang phần đọc
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex min-h-touch items-center gap-1 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Trước
        </button>
        <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
          {currentIndex + 1} / {cards.length}
        </span>
        {isLastCard ? (
          <button
            type="button"
            onClick={finish}
            className="inline-flex min-h-touch items-center gap-1 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Sang phần đọc <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex min-h-touch items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Tiếp <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
