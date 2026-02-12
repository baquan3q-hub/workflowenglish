import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Languages, Highlighter, ArrowRight, Loader2, Settings2, Volume2, SkipBack, SkipForward, Download } from 'lucide-react';
import { StoryData, FlashcardData } from '../types';
import { Button } from '../components/Common';
import { generateTTS, createAudioBufferFromBase64, AudioPlayerController } from '../services/geminiService';

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

  // Highlight state
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null); // "sentIdx-wordIdx"

  // Refs
  const playerRef = useRef<AudioPlayerController | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const wordTimingsRef = useRef<WordTiming[]>([]);

  // Split story into sentences
  useEffect(() => {
    if ('Intl' in window && 'Segmenter' in Intl) {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'sentence' });
      const segments = Array.from(segmenter.segment(story.content)) as { segment: string }[];
      sentencesRef.current = segments.map(s => s.segment);
    } else {
      sentencesRef.current = story.content.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [story.content];
    }
  }, [story.content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  // Build word timings for the entire story based on audio duration
  const buildWordTimings = useCallback((totalDuration: number) => {
    const sentences = sentencesRef.current;
    const allWords: { sentIdx: number; wordIdx: number; word: string }[] = [];

    sentences.forEach((sent, sentIdx) => {
      const words = sent.split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, wordIdx) => {
        allWords.push({ sentIdx, wordIdx, word });
      });
    });

    const totalChars = allWords.reduce((acc, w) => acc + w.word.length, 0);
    let cursor = 0;

    wordTimingsRef.current = allWords.map((w, globalIdx) => {
      const weight = w.word.length / totalChars;
      const wordDur = weight * totalDuration;
      const timing: WordTiming = {
        globalWordIdx: globalIdx,
        sentenceIdx: w.sentIdx,
        wordInSentenceIdx: w.wordIdx,
        start: cursor,
        end: cursor + wordDur,
      };
      cursor += wordDur;
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
    } catch (err: any) {
      console.error('Generate audio error:', err);
      setAudioError(err.message || 'Failed to generate audio');
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

  // Click on a sentence to seek there
  const handleSentenceClick = (sentIdx: number) => {
    const player = playerRef.current;
    if (!player || audioState !== 'ready') return;

    // Find first word of this sentence
    const firstWord = wordTimingsRef.current.find(t => t.sentenceIdx === sentIdx);
    if (firstWord) {
      player.seek(firstWord.start);
      if (!player.isPlaying) {
        player.play(firstWord.start);
        setIsPlaying(true);
      }
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
              className={`transition-colors duration-300 rounded px-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${isSentActive ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}`}
              onClick={() => handleSentenceClick(sentIdx)}
            >
              {parts.map((part, pIdx) => {
                const isWhitespace = /^\s+$/.test(part);
                const currentTimingIdx = isWhitespace ? -1 : timingWordCounter++;
                const isWordActive = isSentActive && `${sentIdx}-${currentTimingIdx}` === activeWordKey;

                const cleanPart = part.replace(/[.,!?;:"'()]/g, "").toLowerCase();
                const isVocab = vocabList.some(v => v.word.toLowerCase() === cleanPart);

                let textColorClass = "text-slate-800 dark:text-slate-200";
                if (isVocab && highlightMode) textColorClass = "text-blue-600 dark:text-blue-400 font-bold";
                if (isWordActive) textColorClass = "text-white";

                return (
                  <span
                    key={pIdx}
                    className={`
                      transition-all duration-150 rounded px-0.5
                      ${textColorClass}
                      ${isWordActive ? 'bg-blue-500 shadow-sm transform scale-105 inline-block' : ''}
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
          <p className="text-slate-500 dark:text-slate-400">Read and listen. Click on any sentence to jump there.</p>
        </div>
        <Button onClick={() => { playerRef.current?.destroy(); onNextPhase(); }} variant="secondary" className="shadow-lg hover:shadow-emerald-200">
          Take the Quiz <ArrowRight className="w-4 h-4 ml-2" />
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
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Generate Audio</span>
                  </button>
                )}

                {audioState === 'loading' && (
                  <button disabled className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-600 cursor-wait">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Generating...</span>
                  </button>
                )}

                {audioState === 'ready' && (
                  <>
                    {/* Skip Back 5s */}
                    <button
                      onClick={() => { playerRef.current?.skipBackward(5); setCurrentTime(playerRef.current?.currentTime ?? 0); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      title="Back 5s"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    {/* Play / Pause */}
                    <button
                      onClick={togglePlay}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all min-w-[100px] justify-center ${isPlaying ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {isPlaying ? (
                        <><Pause className="w-4 h-4" /> <span className="text-sm font-medium">Pause</span></>
                      ) : (
                        <><Play className="w-4 h-4" /> <span className="text-sm font-medium">Play</span></>
                      )}
                    </button>

                    {/* Skip Forward 5s */}
                    <button
                      onClick={() => { playerRef.current?.skipForward(5); setCurrentTime(playerRef.current?.currentTime ?? 0); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      title="Forward 5s"
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
                      title="Download Audio"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Speed Control */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/50 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                  <Settings2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300" />
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
                  className={`p-2 rounded-lg transition-colors ${highlightMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  title="Highlight Vocabulary"
                >
                  <Highlighter className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={`p-2 rounded-lg transition-colors ${showTranslation ? 'bg-green-100 text-green-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  title="Show Translation"
                >
                  <Languages className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress bar (only when audio is ready) */}
            {audioState === 'ready' && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 w-10 text-right">{formatTime(currentTime)}</span>
                <div
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer group relative"
                  onClick={handleSeek}
                >
                  <div
                    className="h-2 bg-blue-500 rounded-full transition-[width] duration-75 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 w-10">{formatTime(duration)}</span>
              </div>
            )}

            {/* Error message */}
            {audioError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                ⚠️ {audioError}
              </p>
            )}
          </div>

          {/* Story text */}
          <div>
            {renderContent()}
          </div>

          {showTranslation && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Vietnamese Translation</h4>
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
                {story.translation}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Vocab List Mini */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 h-fit">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Key Vocabulary</h3>
          <ul className="space-y-3">
            {vocabList.map((v) => (
              <li key={v.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{v.word}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 rounded">{v.partOfSpeech}</span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{v.meaningVietnamese}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div >
  );
};

export default StoryMode;