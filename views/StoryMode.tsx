import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Languages, Highlighter, ArrowRight, Loader2, Settings2, Volume2, SkipBack, SkipForward, Download, X, AlertCircle } from 'lucide-react';
import { StoryData, FlashcardData } from '../types';
import { Button } from '../components/Common';
import { generateTTS, createAudioBufferFromBase64, AudioPlayerController } from '../services/geminiService';
import { aiErrorMessage } from '../services/aiClient';
import { buildWordFormIndex, formatIpa } from '../services/reviewLogic';
import { speakText } from '../services/browserSpeech';

interface StoryModeProps {
  story: StoryData;
  vocabList: FlashcardData[];
  onNextPhase: () => void;
  onAudioGenerated?: (base64: string) => void;
}

// Utilities for word timing
interface WordTiming {
  globalWordIdx: number;       // index across entire story
  sentenceIdx: number;
  wordInSentenceIdx: number;
  start: number;               // seconds (in raw buffer time)
  end: number;
}

const StoryMode: React.FC<StoryModeProps> = ({ story, vocabList, onNextPhase, onAudioGenerated }) => {
  // Audio state
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // UI state
  const [showTranslation, setShowTranslation] = useState(false);
  const [highlightMode, setHighlightMode] = useState(true);
  // Vocabulary card opened by tapping a highlighted word in the story
  const [selectedVocab, setSelectedVocab] = useState<FlashcardData | null>(null);

  // Every inflected form of each (single-word) vocab item → its flashcard,
  // so "decided" in the story is recognised as "decide".
  const vocabByForm = useMemo(() => {
    const singleWord = vocabList.filter((v) => !/\s/.test(v.word.trim()));
    const formIndex = buildWordFormIndex(singleWord.map((v) => v.word));
    const byWord = new Map(singleWord.map((v) => [v.word, v]));
    const out = new Map<string, FlashcardData>();
    formIndex.forEach((word, form) => {
      const card = byWord.get(word);
      if (card) out.set(form, card);
    });
    return out;
  }, [vocabList]);


  // Highlight state
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null); // "sentIdx-wordIdx"

  // Refs
  const playerRef = useRef<AudioPlayerController | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const wordTimingsRef = useRef<WordTiming[]>([]);

  // Split story into sentences and strip any markdown formatting (AI sometimes
  // returns **word** bold markers in the story content). Computed during
  // render (not in an effect) so the text shows on first paint — writing a
  // ref inside an effect doesn't trigger a re-render.
  const sentences = useMemo(() => {
    // Strip markdown bold/italic markers from the raw content
    const cleanContent = story.content.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

    if (typeof window !== 'undefined' && 'Intl' in window && 'Segmenter' in Intl) {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'sentence' });
      const segments = Array.from(segmenter.segment(cleanContent)) as { segment: string }[];
      return segments.map(s => s.segment);
    }
    return cleanContent.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [cleanContent];
  }, [story.content]);
  sentencesRef.current = sentences;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  // Build word timings for the entire story based on audio duration.
  // Uses word-count-based estimation (each word takes roughly equal time
  // when spoken) which is more accurate than character-based for English TTS.
  const buildWordTimings = useCallback((totalDuration: number) => {
    const sentences = sentencesRef.current;
    const allWords: { sentIdx: number; wordIdx: number; word: string }[] = [];

    sentences.forEach((sent, sentIdx) => {
      const words = sent.split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, wordIdx) => {
        allWords.push({ sentIdx, wordIdx, word });
      });
    });

    if (allWords.length === 0) return;

    // Each word gets roughly equal time (simple but more accurate than char-based)
    const wordDuration = totalDuration / allWords.length;
    let cursor = 0;

    wordTimingsRef.current = allWords.map((w, globalIdx) => {
      const timing: WordTiming = {
        globalWordIdx: globalIdx,
        sentenceIdx: w.sentIdx,
        wordInSentenceIdx: w.wordIdx,
        start: cursor,
        end: cursor + wordDuration,
      };
      cursor += wordDuration;
      return timing;
    });
  }, []);

  // Handle time update from player (called via requestAnimationFrame)
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);

    // Find active word
    const timings = wordTimingsRef.current;
    const active = timings.find(t => time >= t.start && time < t.end);

    if (active) {
      setActiveSentenceIndex(active.sentenceIdx);
      setActiveWordKey(`${active.sentenceIdx}-${active.wordInSentenceIdx}`);
    }
  }, []);

  // Generate audio (single API call)
  // Generate audio (single API call)
  const handleGenerateAudio = async () => {
    // Destroy old player
    playerRef.current?.destroy();
    playerRef.current = null;
    setAudioError(null);
    setAudioState('loading');

    try {
      let buffer: AudioBuffer;

      if (story.audioBase64) {
        // Use cached audio
        console.log("Using cached audio...");
        buffer = await createAudioBufferFromBase64(story.audioBase64);
      } else {
        // Generate new audio
        console.log("Generating new audio via API...");
        const result = await generateTTS(story.content);
        buffer = result.buffer;
        // Notify parent to save the base64
        onAudioGenerated?.(result.base64);
      }

      const player = new AudioPlayerController(buffer, playbackSpeed);

      player.onTimeUpdate = handleTimeUpdate;
      player.onEnded = () => {
        setIsPlaying(false);
        setActiveSentenceIndex(null);
        setActiveWordKey(null);
        setCurrentTime(0);
      };

      playerRef.current = player;
      setDuration(buffer.duration);
      buildWordTimings(buffer.duration);
      setAudioState('ready');
    } catch (err) {
      console.error('Generate audio error:', err);
      setAudioError(`Không tạo được âm thanh. ${aiErrorMessage(err)}`);
      setAudioState('idle');
    }
  };

  // Playback controls
  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    player.togglePlayPause();
    setIsPlaying(player.isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.seekByFraction(fraction);
    setCurrentTime(fraction * duration);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    playerRef.current?.setSpeed(newSpeed);
  };

  // Click on a sentence to seek and play from that sentence's start
  const handleSentenceClick = (sentIdx: number) => {
    const player = playerRef.current;
    if (!player || audioState !== 'ready') return;

    // Find first word of this sentence
    const firstWord = wordTimingsRef.current.find(t => t.sentenceIdx === sentIdx);
    if (firstWord) {
      // Always seek and play from this sentence (even if already playing)
      player.play(firstWord.start);
      setIsPlaying(true);
      setCurrentTime(firstWord.start);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Render story content with highlighting
  const renderContent = () => {
    return (
      <div className="leading-relaxed text-slate-800 dark:text-slate-200 text-lg">
        {sentencesRef.current.map((sentence, sentIdx) => {
          const isSentActive = sentIdx === activeSentenceIndex;
          const parts = sentence.split(/(\s+)/);
          let timingWordCounter = 0;

          return (
            <span
              key={sentIdx}
              className={`transition-colors duration-300 rounded px-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${isSentActive ? 'bg-tone-butter' : ''}`}
              onClick={() => handleSentenceClick(sentIdx)}
            >
              {parts.map((part, pIdx) => {
                const isWhitespace = /^\s+$/.test(part);
                const currentTimingIdx = isWhitespace ? -1 : timingWordCounter++;
                const isWordActive = isSentActive && `${sentIdx}-${currentTimingIdx}` === activeWordKey;

                const cleanPart = part.replace(/[.,!?;:"'()*_~`\[\]#“”‘’]/g, "").toLowerCase();
                const vocabCard = isWhitespace ? undefined : vocabByForm.get(cleanPart);
                const isVocab = !!vocabCard;

                let textColorClass = "text-slate-800 dark:text-slate-200";
                if (isVocab && highlightMode) textColorClass = "text-tone-sky-fg font-bold";
                if (isWordActive) textColorClass = "text-tone-sky-fg font-semibold";

                return (
                  <span
                    key={pIdx}
                    onClick={vocabCard ? (e) => { e.stopPropagation(); setSelectedVocab(vocabCard); } : undefined}
                    title={vocabCard ? 'Chạm để xem nghĩa' : undefined}
                    className={`
                      transition-all duration-150 rounded px-0.5
                      ${textColorClass}
                      ${isVocab ? 'underline decoration-dotted decoration-tone-sky-accent underline-offset-4 cursor-help' : ''}
                      ${isWordActive ? 'bg-tone-sky-soft ring-1 ring-tone-sky-border shadow-sm transform scale-105 inline-block' : ''}
                    `}
                  >
                    {part}
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
    );
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 h-full">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{story.title}</h2>
          <p className="text-slate-500 dark:text-slate-400">Đọc và nghe. Chạm vào câu để phát từ câu đó · chạm vào <span className="text-tone-sky-fg font-semibold">từ in xanh</span> để xem nghĩa.</p>
        </div>
        <Button onClick={() => { playerRef.current?.destroy(); onNextPhase(); }} variant="secondary" className="shadow-lg hover:shadow-emerald-200">
          Làm trắc nghiệm <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Text Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 relative">

          {/* Audio Player Bar */}
          <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
            {/* Top row: controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {audioState === 'idle' && (
                  <button
                    onClick={handleGenerateAudio}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-tone-sky-soft text-tone-sky-fg hover:bg-tone-sky-soft transition-all"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Tạo âm thanh</span>
                  </button>
                )}

                {audioState === 'loading' && (
                  <button disabled className="flex items-center gap-2 px-4 py-2 rounded-full bg-tone-sky-soft text-tone-sky-fg cursor-wait">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Đang tạo…</span>
                  </button>
                )}

                {audioState === 'ready' && (
                  <>
                    {/* Skip Back 5s */}
                    <button
                      onClick={() => { playerRef.current?.skipBackward(5); setCurrentTime(playerRef.current?.currentTime ?? 0); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      title="Lùi 5 giây"
                      aria-label="Lùi 5 giây"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    {/* Play / Pause */}
                    <button
                      onClick={togglePlay}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all min-w-[100px] justify-center ${isPlaying ? 'bg-tone-blush-soft text-tone-blush-fg' : 'bg-tone-sky-soft text-tone-blush-fg hover:bg-tone-sky-soft'}`}
                    >
                      {isPlaying ? (
                        <><Pause className="w-4 h-4" /> <span className="text-sm font-medium">Tạm dừng</span></>
                      ) : (
                        <><Play className="w-4 h-4" /> <span className="text-sm font-medium">Phát</span></>
                      )}
                    </button>

                    {/* Skip Forward 5s */}
                    <button
                      onClick={() => { playerRef.current?.skipForward(5); setCurrentTime(playerRef.current?.currentTime ?? 0); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      title="Tiến 5 giây"
                      aria-label="Tiến 5 giây"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => {
                        const player = playerRef.current;
                        if (!player) return;
                        const blob = player.getWavBlob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${story.title.replace(/\s+/g, '_')}.wav`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      title="Tải âm thanh"
                      aria-label="Tải âm thanh"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Speed Control */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/50 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                  <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                  <select
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={0.9}>0.9x</option>
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHighlightMode(!highlightMode)}
                  className={`p-2 rounded-lg transition-colors ${highlightMode ? 'bg-tone-sky-soft text-tone-sky-fg' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  title="Tô sáng từ vựng"
                  aria-label="Tô sáng từ vựng"
                >
                  <Highlighter className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={`p-2 rounded-lg transition-colors ${showTranslation ? 'bg-tone-mint-soft text-tone-mint-fg' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  title="Hiện bản dịch"
                  aria-label="Hiện bản dịch"
                >
                  <Languages className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress bar (only when audio is ready) */}
            {audioState === 'ready' && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-10 text-right">{formatTime(currentTime)}</span>
                <div
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer group relative"
                  onClick={handleSeek}
                >
                  <div
                    className="h-2 bg-tone-sky-accent rounded-full transition-[width] duration-75 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-tone-sky-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-10">{formatTime(duration)}</span>
              </div>
            )}

            {/* Error message */}
            {audioError && (
              <p className="text-sm text-tone-blush-fg flex items-center gap-1">
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {audioError}
              </p>
            )}
          </div>

          {/* Story text */}
          <div>
            {renderContent()}
          </div>

          {showTranslation && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bản dịch tiếng Việt</h4>
              <p className="text-tone-mint-fg leading-relaxed bg-tone-mint p-4 rounded-xl">
                {story.translation}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Vocab List Mini */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 h-fit">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Từ vựng chính</h3>
          <ul className="space-y-3">
            {vocabList.map((v) => (
              <li
                key={v.id}
                onClick={() => setSelectedVocab(v)}
                className={`bg-white dark:bg-slate-800 p-3 rounded-lg border shadow-sm flex flex-col cursor-pointer transition-colors ${selectedVocab?.id === v.id ? 'border-tone-sky-border ring-2 ring-tone-sky-border' : 'border-slate-100 dark:border-slate-700 hover:border-tone-sky-border'}`}
              >
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{v.word}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 rounded">{v.partOfSpeech}</span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{v.meaningVietnamese}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tap-to-define card */}
      {selectedVocab && (
        <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-tone-sky-border dark:border-slate-700 p-4 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{selectedVocab.word}</span>
                  {selectedVocab.partOfSpeech && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-tone-sky-soft text-tone-sky-fg">{selectedVocab.partOfSpeech}</span>
                  )}
                  <button
                    onClick={() => speakText(selectedVocab.word)}
                    className="p-1.5 rounded-full text-tone-sky-fg hover:bg-tone-sky dark:hover:bg-slate-700"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                {selectedVocab.ipa && <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{formatIpa(selectedVocab.ipa)}</p>}
              </div>
              <button onClick={() => setSelectedVocab(null)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-600" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-base font-medium text-tone-mint-fg">{selectedVocab.meaningVietnamese}</p>
            {selectedVocab.definitionEnglish && (
              <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-300">{selectedVocab.definitionEnglish}</p>
            )}
          </div>
        </div>
      )}
    </div >
  );
};

export default StoryMode;