import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ChevronLeft, ChevronRight, Settings2, StopCircle } from 'lucide-react';
import { FlashcardData } from '../types';
import { Button, Badge } from '../components/Common';

interface FlashcardsProps {
  cards: FlashcardData[];
  onNextPhase: () => void;
}

const Flashcards: React.FC<FlashcardsProps> = ({ cards, onNextPhase }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Audio state (browser SpeechSynthesis — free, no API cost)
  const [playingText, setPlayingText] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Word-level highlighting via onboundary event
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  const currentCard = cards[currentIndex];

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
        className="w-full perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ minHeight: '300px' }}
      >
        <div className={`relative w-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`} style={{ minHeight: '300px' }}>

          {/* FRONT */}
          <div className={`${isFlipped ? 'invisible' : ''} w-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-blue-100 dark:border-blue-900 flex flex-col items-center justify-center p-6 sm:p-8`}
            style={{ minHeight: '300px' }}
          >
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-3">Word</span>
            <h3 className="text-3xl sm:text-5xl font-bold text-slate-800 dark:text-white mb-3 text-center">{currentCard.word}</h3>
            <p className="text-slate-400 dark:text-slate-500 font-serif italic text-base">Tap to flip</p>
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
      </div>

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