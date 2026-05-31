import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Volume2, ChevronLeft, ChevronRight, Settings2, StopCircle } from 'lucide-react';
import { FlashcardData, MasteryLevel, ConfidenceRating, WordMasteryRecord } from '../types';
import { Button, Badge } from '../components/Common';
import { MasteryBadge } from '../components/MasteryBadge';
import {
  bulkEnsureWordsWithMetadata,
  getWordMastery,
  upsertWordMastery,
  determineMasteryTransition,
  normalizeWord,
} from '../services/masteryService';
import { calculateSRS, type SRSCard } from '../services/srsService';

interface FlashcardsProps {
  cards: FlashcardData[];
  userId: string;
  onNextPhase: () => void;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  masteryMap?: Record<string, WordMasteryRecord | null>;
  onMasteryMapChange?: (map: Record<string, WordMasteryRecord | null>) => void;
}

// 4-button rating config (matches ReviewSession styling)
const RATING_BUTTONS: {
  rating: ConfidenceRating;
  label: string;
  color: string;
  hoverColor: string;
}[] = [
  { rating: 0, label: 'Lại', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
  { rating: 1, label: 'Khó', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600' },
  { rating: 2, label: 'Tốt', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { rating: 3, label: 'Dễ', color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600' },
];

const Flashcards: React.FC<FlashcardsProps> = ({
  cards,
  userId,
  onNextPhase,
  initialIndex = 0,
  onIndexChange,
  masteryMap: parentMasteryMap,
  onMasteryMapChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);

  // Swipe gesture states
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [flyOutDirection, setFlyOutDirection] = useState<'left' | 'right' | null>(null);
  const hasDraggedRef = React.useRef(false);

  // Audio state (browser SpeechSynthesis — free, no API cost)
  const [playingText, setPlayingText] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Word-level highlighting via onboundary event
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  // Mastery tracking — keyed by normalized word
  const [masteryMap, setMasteryMap] = useState<Record<string, WordMasteryRecord | null>>(parentMasteryMap ?? {});

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);
  const [masteryLoaded, setMasteryLoaded] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  // Compute swipe styles dynamically
  const cardStyle = useMemo(() => {
    if (flyOutDirection === 'right') {
      return {
        transform: 'translateX(150%) rotate(15deg)',
        opacity: 0,
        transition: 'all 300ms ease-in-out',
      };
    }
    if (flyOutDirection === 'left') {
      return {
        transform: 'translateX(-150%) rotate(-15deg)',
        opacity: 0,
        transition: 'all 300ms ease-in-out',
      };
    }
    if (isDragging) {
      const rotation = dragOffset * 0.05; // 0.05 deg per pixel
      return {
        transform: `translateX(${dragOffset}px) rotate(${rotation}deg)`,
        transition: 'none',
      };
    }
    return {
      transform: 'none',
      transition: 'all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    };
  }, [isDragging, dragOffset, flyOutDirection]);

  // --- Swipe event handlers ------------------------------------------------
  const handleDragStart = (clientX: number) => {
    if (!isFlipped || savingRating) return; // Only drag when flipped and not saving
    setDragStartX(clientX);
    setIsDragging(true);
    hasDraggedRef.current = false;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || dragStartX === null) return;
    const offset = clientX - dragStartX;
    setDragOffset(offset);

    if (Math.abs(offset) > 5) {
      hasDraggedRef.current = true;
    }

    if (offset > 80) {
      setSwipeDirection('right');
    } else if (offset < -80) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragStartX(null);

    const threshold = 80;
    if (dragOffset > threshold) {
      triggerSwipeOut('right');
    } else if (dragOffset < -threshold) {
      triggerSwipeOut('left');
    } else {
      setDragOffset(0);
      setSwipeDirection(null);
    }
  };

  const triggerSwipeOut = (dir: 'left' | 'right') => {
    setFlyOutDirection(dir);
    const rating: ConfidenceRating = dir === 'right' ? 2 : 0;
    
    const dummyEvent = {
      stopPropagation: () => {},
      preventDefault: () => {}
    } as React.MouseEvent;

    setTimeout(() => {
      handleRating(rating, dummyEvent);
      setDragOffset(0);
      setSwipeDirection(null);
      setFlyOutDirection(null);
    }, 300);
  };

  const currentCard = cards[currentIndex];
  const currentNormalizedWord = useMemo(
    () => (currentCard ? normalizeWord(currentCard.word) : ''),
    [currentCard],
  );
  const currentMastery = masteryMap[currentNormalizedWord] ?? null;
  const currentLevel: MasteryLevel = currentMastery?.mastery_level ?? MasteryLevel.NEW;

  // Show quick-mark buttons when card is flipped (for ALL mastery levels)
  const shouldShowQuickMark = masteryLoaded && isFlipped;

  // --- Mastery bootstrap on mount / cards change ---------------------------
  useEffect(() => {
    let cancelled = false;

    // Use cached/parent mastery mapping if already loaded to avoid N+1 queries
    if (parentMasteryMap && Object.keys(parentMasteryMap).length > 0) {
      setMasteryMap(parentMasteryMap);
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
        onMasteryMapChange?.(next);
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
  }, [userId, cards, parentMasteryMap, onMasteryMapChange]);

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

  const handleNext = () => {
    cleanupAudio();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 200);
  };

  const handlePrev = () => {
    cleanupAudio();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 200);
  };

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
    utterance.rate = playbackSpeed;

    // Try to pick a better voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;

    // Word-level highlighting via boundary events
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let charCursor = 0;
    const wordBoundaries = words.map(word => {
      // Find this word's starting char index in the original text
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

  // --- Rating handler ------------------------------------------------------
  const handleRating = async (rating: ConfidenceRating, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savingRating) return;

    setSavingRating(true);
    try {
      // If no mastery record exists yet (migration not applied or first time),
      // create a fresh one with default SRS values
      const existing = currentMastery || {
        user_id: userId,
        word: normalizeWord(currentCard.word),
        mastery_level: MasteryLevel.NEW,
        easiness_factor: 2.5,
        interval_days: 0,
        repetition_count: 0,
        correct_count: 0,
        incorrect_count: 0,
      };

      const srsCard: SRSCard = {
        easinessFactor: existing.easiness_factor,
        intervalDays: existing.interval_days,
        repetitionCount: existing.repetition_count,
      };
      const srs = calculateSRS(srsCard, rating);
      const newLevel = determineMasteryTransition(
        existing.mastery_level,
        rating,
        srs.repetitionCount,
        srs.intervalDays,
      );

      const updated = await upsertWordMastery({
        user_id: userId,
        word: normalizeWord(currentCard.word),
        mastery_level: newLevel,
        easiness_factor: srs.easinessFactor,
        interval_days: srs.intervalDays,
        repetition_count: srs.repetitionCount,
        next_review_date: srs.nextReviewDate.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        correct_count: (existing.correct_count ?? 0) + (rating >= 2 ? 1 : 0),
        incorrect_count: (existing.incorrect_count ?? 0) + (rating < 2 ? 1 : 0),
      });

      const nextMap = {
        ...masteryMap,
        [currentNormalizedWord]: updated,
      };
      setMasteryMap(nextMap);
      onMasteryMapChange?.(nextMap);

      // Auto-advance to next card after rating
      cleanupAudio();
      setIsFlipped(false);
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 300);
    } catch (err) {
      console.error('Failed to save rating:', err);
    } finally {
      setSavingRating(false);
    }
  };

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
              className={`
                transition-all duration-150 rounded px-0.5
                ${isWordActive ? 'bg-blue-500 text-white shadow-sm transform scale-105 inline-block' : 'text-slate-800 dark:text-slate-200'}
              `}
            >
              {part}
            </span>
          );
        })}
      </>
    );
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-3 sm:gap-6">
      {/* Header row */}
      <div className="flex w-full justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">Smart Flashcards</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Tap to flip to show mean vocab</p>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-transparent outline-none cursor-pointer"
          >
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.25}>1.25x</option>
          </select>
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="w-full perspective-1000 cursor-pointer group touch-none select-none relative"
        style={{ minHeight: '300px', ...cardStyle }}
        onClick={(e) => {
          if (hasDraggedRef.current) {
            e.stopPropagation();
            hasDraggedRef.current = false;
            return;
          }
          setIsFlipped(!isFlipped);
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          handleDragStart(e.clientX);
        }}
        onMouseMove={(e) => {
          handleDragMove(e.clientX);
        }}
        onMouseUp={() => {
          handleDragEnd();
        }}
        onMouseLeave={() => {
          if (isDragging) {
            handleDragEnd();
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handleDragStart(e.touches[0].clientX);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            handleDragMove(e.touches[0].clientX);
          }
        }}
        onTouchEnd={() => {
          handleDragEnd();
        }}
      >
        <div className={`relative w-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`} style={{ minHeight: '300px' }}>

          {/* FRONT */}
          <div className={`${isFlipped ? 'invisible' : ''} relative w-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-blue-100 dark:border-blue-900 flex flex-col items-center justify-center p-6 sm:p-8`}
            style={{ minHeight: '300px' }}
          >
            {/* Mastery badge — top-right corner */}
            {masteryLoaded && (
              <div className="absolute top-3 right-3">
                <MasteryBadge level={currentLevel} size="md" />
              </div>
            )}
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-2">Word</span>
            <h3 className="text-3xl sm:text-5xl font-bold text-slate-800 dark:text-white mb-4 text-center">{currentCard.word}</h3>
            
            {/* English Definition for Guessing */}
            {currentCard.definitionEnglish && (
              <div 
                className="w-full max-w-md p-3 sm:p-4 mb-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
              >
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Đoán nghĩa tiếng Việt qua định nghĩa:
                </p>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">
                  "{currentCard.definitionEnglish}"
                </p>
              </div>
            )}

            <p className="text-slate-400 dark:text-slate-500 font-serif italic text-xs sm:text-sm mt-2">Tap card to see Vietnamese meaning</p>
          </div>

          {/* BACK */}
          <div
            className={`${!isFlipped ? 'invisible' : ''} absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-emerald-100 dark:border-emerald-900 flex flex-col p-4 sm:p-6 overflow-y-auto`}
            style={{ minHeight: '300px' }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{currentCard.word}</h3>
                  <Badge color="blue">{currentCard.partOfSpeech}</Badge>
                  {masteryLoaded && <MasteryBadge level={currentLevel} size="md" />}
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-sm">
                  <span>/{currentCard.ipa}/</span>
                  <button
                    onClick={(e) => handlePlayAudio(currentCard.word, e)}
                    className={`p-1.5 rounded-full transition-colors ${isTextPlaying(currentCard.word) ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-500'}`}
                  >
                    {isTextPlaying(currentCard.word) ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Badge color="green">Vietnamese</Badge>
            </div>

            <div className="space-y-3 text-left flex-1">
              <div>
                <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">{currentCard.meaningVietnamese}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-1">Definition</p>
                <p className="text-slate-700 dark:text-slate-300 italic">{currentCard.definitionEnglish}</p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-blue-500 dark:text-blue-400 font-semibold">Example</p>
                  <button
                    onClick={(e) => handlePlayAudio(currentCard.exampleSentence, e)}
                    className={`transition-colors ${isTextPlaying(currentCard.exampleSentence) ? 'text-red-500' : 'text-blue-400 hover:text-blue-600'}`}
                    title="Listen to sentence"
                  >
                    {isTextPlaying(currentCard.exampleSentence) ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-800 dark:text-slate-200 mb-1 leading-relaxed text-sm sm:text-base">
                  "{renderHighlightedText(currentCard.exampleSentence, isTextPlaying(currentCard.exampleSentence))}"
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{currentCard.exampleSentenceVietnamese}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Swipe Overlays */}
        {isFlipped && (isDragging || flyOutDirection) && (
          <>
            {/* Right Swipe Overlay (Remembered) */}
            <div 
              className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/30 rounded-2xl sm:rounded-3xl border-4 border-emerald-500 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-150 z-50"
              style={{
                opacity: dragOffset > 0 ? Math.min(dragOffset / 80, 1) : flyOutDirection === 'right' ? 1 : 0
              }}
            >
              <div className="bg-emerald-500 text-white font-bold text-xl sm:text-2xl px-6 py-3 rounded-2xl shadow-lg transform rotate-[-12deg] flex items-center gap-2">
                <span>✅</span> ĐÃ NHỚ
              </div>
            </div>

            {/* Left Swipe Overlay (Forgot) */}
            <div 
              className="absolute inset-0 bg-orange-500/20 dark:bg-orange-500/30 rounded-2xl sm:rounded-3xl border-4 border-orange-500 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-150 z-50"
              style={{
                opacity: dragOffset < 0 ? Math.min(-dragOffset / 80, 1) : flyOutDirection === 'left' ? 1 : 0
              }}
            >
              <div className="bg-orange-500 text-white font-bold text-xl sm:text-2xl px-6 py-3 rounded-2xl shadow-lg transform rotate-[12deg] flex items-center gap-2">
                <span>↻</span> CHƯA NHỚ
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick-Mark buttons — shown after flip for ALL mastery levels */}
      {shouldShowQuickMark && (
        <div
          className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
            Bạn nhớ từ này không?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={(e) => handleRating(2 as ConfidenceRating, e)}
              disabled={savingRating}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95"
            >
              <span>✓</span> Đã nhớ
            </button>
            <button
              onClick={(e) => handleRating(0 as ConfidenceRating, e)}
              disabled={savingRating}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95"
            >
              <span>↻</span> Cần ôn lại
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 w-full justify-between">
        <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Prev
        </Button>

        <span className="text-slate-400 dark:text-slate-500 font-medium font-mono">
          {currentIndex + 1} / {cards.length}
        </span>

        {isLastCard ? (
          <Button variant="secondary" onClick={() => { cleanupAudio(); onNextPhase(); }}>
            Start Reading <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        ) : (
          <Button variant="outline" onClick={handleNext}>
            Next <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
