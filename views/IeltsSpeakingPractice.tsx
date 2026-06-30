import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IeltsQuestion } from '../types';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { AudioRecorderButton, FrameworkCard } from '../components/IeltsCommon';
import { startRecording, stopRecording, cancelRecording, blobToBase64, createAudioUrl, revokeAudioUrl } from '../services/speechService';
import { transcribeAudioWithGemini, speakingPart1Questions } from '../data/ieltsSpeakingQuestions';
import { ArrowLeft, Send, Lightbulb, ChevronDown, ChevronUp, Loader2, Play, Pause, Mic, AlertCircle, Edit3, Clock, CheckCircle2, ChevronRight, PenTool } from 'lucide-react';

interface Props {
  question: IeltsQuestion;
  onSubmit: (transcript: string, audioBase64: string, audioMimeType: string, durationSeconds: number) => void;
  onBack: () => void;
  isGrading: boolean;
  isMockTest?: boolean;
}

type ModePhase = 'prep' | 'recording' | 'review';

export default function IeltsSpeakingPractice({ question, onSubmit, onBack, isGrading, isMockTest = false }: Props) {
  // Mock Test State Machine
  const [mockPart, setMockPart] = useState<1 | 2 | 3>(1);
  const [mockQuestionIdx, setMockQuestionIdx] = useState(0);

  // Active question being answered
  const [activeQuestion, setActiveQuestion] = useState<IeltsQuestion>(question);

  // Ghi âm State
  const [phase, setPhase] = useState<ModePhase>(activeQuestion.taskOrPart === 'part_2' ? 'prep' : 'recording');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(60);
  const [scratchpadText, setScratchpadText] = useState('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState('audio/webm');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [showFramework, setShowFramework] = useState(false);

  // Transcript accumulator for multi-step sections
  // Format: { [questionPrompt]: { transcript: string, base64: string, mime: string, duration: number } }
  const [answersAccumulator, setAnswersAccumulator] = useState<Record<string, {
    transcript: string;
    base64: string;
    mime: string;
    duration: number;
  }>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const framework = ieltsFrameworks.find(f => f.id === activeQuestion.frameworkId);

  // List of questions for current flow
  const currentQuestionsList = (() => {
    if (activeQuestion.taskOrPart === 'part_3' && activeQuestion.subQuestions) {
      return activeQuestion.subQuestions;
    }
    if (activeQuestion.taskOrPart === 'part_1') {
      return [activeQuestion.prompt];
    }
    return [activeQuestion.prompt]; // part 2
  })();

  const currentQuestionText = currentQuestionsList[mockQuestionIdx] || activeQuestion.prompt;

  // Cleanup audio URLs
  useEffect(() => {
    return () => {
      if (audioUrl) revokeAudioUrl(audioUrl);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [audioUrl]);

  // Handle Speaking Part 2 Preparation Timer
  useEffect(() => {
    if (phase === 'prep') {
      setPrepTimeRemaining(60);
      prepTimerRef.current = setInterval(() => {
        setPrepTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(prepTimerRef.current!);
            handleStartSpeaking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (prepTimerRef.current) {
        clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
      }
    };
  }, [phase]);

  const handleStartSpeaking = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setPhase('recording');
  };

  const handleStartRecording = useCallback(async () => {
    setError(null);
    if (audioUrl) {
      revokeAudioUrl(audioUrl);
      setAudioUrl(null);
    }
    setRecordedBlob(null);
    setTranscript('');
    setDuration(0);

    try {
      await startRecording((seconds) => setDuration(seconds));
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, [audioUrl]);

  const handleStopRecording = useCallback(async () => {
    try {
      const result = await stopRecording();
      setIsRecording(false);
      setRecordedBlob(result.blob);
      setRecordedMimeType(result.mimeType);
      setRecordedDuration(result.durationSeconds);

      const url = createAudioUrl(result.blob);
      setAudioUrl(url);

      // Transcribe via Gemini
      setIsTranscribing(true);
      try {
        const base64 = await blobToBase64(result.blob);
        const text = await transcribeAudioWithGemini(base64, result.mimeType);
        setTranscript(text);
      } catch (err: any) {
        console.error('Transcription failed:', err);
        setError('Không thể tự động dịch âm thanh. Vui lòng nhập bản transcript thủ công.');
      } finally {
        setIsTranscribing(false);
      }
    } catch (err: any) {
      setIsRecording(false);
      setError(err.message);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  // Handles moving to next question or part
  const handleNextStep = async () => {
    if (!transcript.trim()) {
      setError('Vui lòng ghi âm hoặc điền transcript trước khi tiếp tục.');
      return;
    }
    if (!recordedBlob) {
      setError('Chưa ghi nhận file âm thanh.');
      return;
    }

    const base64 = await blobToBase64(recordedBlob);
    
    // Save current step data
    const updatedAccumulator = {
      ...answersAccumulator,
      [currentQuestionText]: {
        transcript,
        base64,
        mime: recordedMimeType,
        duration: recordedDuration
      }
    };
    setAnswersAccumulator(updatedAccumulator);

    // Clear step states
    setTranscript('');
    setRecordedBlob(null);
    setAudioUrl(null);
    setDuration(0);

    // Check if there are more sub-questions in Part 3 / Part 1
    if (mockQuestionIdx < currentQuestionsList.length - 1) {
      setMockQuestionIdx(prev => prev + 1);
    } else {
      // Finished all sub-questions for current part
      if (isMockTest && mockPart === 1) {
        // Move Mock Test: Part 1 -> Part 2
        setMockPart(2);
        setMockQuestionIdx(0);
        // Load random Part 2 question
        const p2Questions = speakingPart1Questions.filter(q => q.taskOrPart === 'part_2');
        const p2Q = p2Questions[Math.floor(Math.random() * p2Questions.length)] || activeQuestion;
        setActiveQuestion(p2Q);
        setPhase('prep');
      } else if (isMockTest && mockPart === 2) {
        // Move Mock Test: Part 2 -> Part 3
        setMockPart(3);
        setMockQuestionIdx(0);
        // Load random Part 3 question
        const p3Questions = speakingPart1Questions.filter(q => q.taskOrPart === 'part_3');
        const p3Q = p3Questions[Math.floor(Math.random() * p3Questions.length)] || activeQuestion;
        setActiveQuestion(p3Q);
        setPhase('recording');
      } else {
        // All parts/sub-questions completed. Final Submit!
        submitFinalGrading(updatedAccumulator);
      }
    }
  };

  // Submit all accumulated results to grading
  const submitFinalGrading = async (accumulated: typeof answersAccumulator) => {
    // Bundle all answers transcripts into a single structured report
    let fullTranscriptText = '';
    let totalDuration = 0;
    let mainBase64 = '';
    let mainMime = 'audio/webm';

    Object.entries(accumulated).forEach(([qText, data], index) => {
      fullTranscriptText += `Question ${index + 1}: ${qText}\nAnswer: ${data.transcript}\n\n`;
      totalDuration += data.duration;
      if (!mainBase64) {
        mainBase64 = data.base64;
        mainMime = data.mime;
      }
    });

    onSubmit(fullTranscriptText, mainBase64, mainMime, totalDuration);
  };

  return (
    <div className="space-y-5 anim-fade-up max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { cancelRecording(); onBack(); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thoát</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300">
          <Mic className="w-3.5 h-3.5" />
          {isMockTest ? (
            <span>MOCK TEST — PART {mockPart}</span>
          ) : (
            <span>SPEAKING {activeQuestion.taskOrPart.toUpperCase().replace('_', ' ')}</span>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      {isMockTest ? (
        <div className="flex gap-2 items-center justify-center py-2 border-b dark:border-slate-700">
          {[1, 2, 3].map((p) => (
            <div key={p} className="flex items-center">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                mockPart === p ? 'bg-rose-500 text-white' : mockPart > p ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-750 text-slate-550'
              }`}>
                Part {p}
              </span>
              {p < 3 && <div className={`w-6 h-0.5 ${mockPart > p ? 'bg-emerald-300' : 'bg-slate-200 dark:bg-slate-750'}`} />}
            </div>
          ))}
        </div>
      ) : currentQuestionsList.length > 1 && (
        <div className="flex gap-1.5 items-center justify-center py-1">
          {currentQuestionsList.map((_, i) => (
            <div key={i} className={`w-12 h-1.5 rounded-full ${
              mockQuestionIdx === i ? 'bg-rose-500' : mockQuestionIdx > i ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-750'
            }`} />
          ))}
        </div>
      )}

      {/* Main UI Stage router */}
      {phase === 'prep' ? (
        /* speaking preparation timer (Part 2 cue card) */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-200 dark:border-amber-900/50 p-6 space-y-6 shadow-md text-center">
          <div className="space-y-1">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Giai đoạn chuẩn bị</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bạn có 60 giây để chuẩn bị dàn ý và nháp từ vựng.</p>
          </div>

          {/* Cue card display */}
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-left max-w-md mx-auto">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">📋 CUE CARD:</p>
            <p className="text-sm font-bold text-slate-850 dark:text-slate-100 whitespace-pre-line leading-relaxed">
              {activeQuestion.prompt}
            </p>
          </div>

          {/* Countdown display */}
          <div className="text-3xl font-black text-amber-600 tabular-nums">
            {prepTimeRemaining}s
          </div>

          {/* Notes scratchpad */}
          <div className="space-y-2 text-left max-w-md mx-auto">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5" /> Bảng nháp dàn bài (Scratchpad):
            </label>
            <textarea
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              placeholder="Gõ nháp ý tưởng, collocations, hoặc keywords cần dùng tại đây..."
              className="w-full h-24 p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none resize-none"
            />
          </div>

          <button
            onClick={handleStartSpeaking}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all"
          >
            Bỏ qua & Nói ngay lập tức
          </button>
        </div>
      ) : (
        /* Speaking/Recording UI Phase */
        <div className="space-y-5">
          {/* Question / Prompt Card */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 rounded-xl border border-rose-200 dark:border-rose-800/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-black">
                  {isMockTest ? `P${mockPart}` : activeQuestion.taskOrPart === 'part_1' ? 'P1' : activeQuestion.taskOrPart === 'part_2' ? 'P2' : 'P3'}
                </span>
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-xs font-bold text-rose-500 dark:text-rose-400">
                  CÂU HỎI {mockQuestionIdx + 1} / {currentQuestionsList.length}:
                </p>
                <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed font-bold whitespace-pre-line">
                  {currentQuestionText}
                </p>
              </div>
            </div>
          </div>

          {/* Display Scratchpad notes if filled earlier */}
          {activeQuestion.taskOrPart === 'part_2' && scratchpadText.trim() && (
            <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5">
              <p className="text-[11px] font-bold text-amber-850 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <PenTool className="w-3 h-3" /> Ghi chú nháp của bạn:
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-350 italic whitespace-pre-wrap">{scratchpadText}</p>
            </div>
          )}

          {/* Framework suggestion */}
          {framework && (
            <div>
              <button
                onClick={() => setShowFramework(!showFramework)}
                className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-450 hover:text-rose-700"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showFramework ? 'Ẩn framework gợi ý' : `Xem gợi ý framework ${framework.name}`}
                {showFramework ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showFramework && (
                <div className="mt-2">
                  <FrameworkCard framework={framework} />
                </div>
              )}
            </div>
          )}

          {/* Speaking prompts suggested vocabularies */}
          {activeQuestion.vocabulary && activeQuestion.vocabulary.length > 0 && (
            <div className="bg-sky-50 dark:bg-sky-900/15 rounded-lg border border-sky-200 dark:border-sky-850/50 px-4 py-2.5">
              <p className="text-xs text-sky-700 dark:text-sky-300">
                <span className="font-bold">💡 Từ vựng nên dùng: </span>
                {activeQuestion.vocabulary.join(', ')}
              </p>
            </div>
          )}

          {/* Error notifications */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Recorder module */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center shadow-sm">
            <AudioRecorderButton
              isRecording={isRecording}
              duration={duration}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>

          {/* Recorded Audio playback */}
          {audioUrl && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-md flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-750 dark:text-slate-205">Bản ghi âm hiện tại</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Thời lượng: {Math.floor(recordedDuration / 60)}:{(recordedDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Real-time transcript display */}
          {(isTranscribing || transcript || recordedBlob) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350">📝 Bản thảo Transcript</h3>
                {transcript && !isTranscribing && (
                  <button
                    onClick={() => setEditingTranscript(!editingTranscript)}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700"
                  >
                    <Edit3 className="w-3 h-3" />
                    {editingTranscript ? 'Hoàn thành' : 'Chỉnh sửa'}
                  </button>
                )}
              </div>

              {isTranscribing ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">AI đang phân dịch giọng nói của bạn...</span>
                </div>
              ) : editingTranscript ? (
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 dark:border-slate-650 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-200 leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nhập hoặc chỉnh sửa transcript tại đây..."
                />
              ) : transcript ? (
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                  {transcript}
                </p>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Transcript hiển thị ở đây (Có thể chỉnh sửa thoải mái trước khi gửi).
                  </p>
                  <button
                    onClick={() => setEditingTranscript(true)}
                    className="mt-2 text-xs text-blue-650 dark:text-blue-400 font-bold hover:underline"
                  >
                    Tự nhập transcript bằng tay
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          {recordedBlob && !isTranscribing && (
            <div className="pt-2">
              <button
                onClick={handleNextStep}
                disabled={isGrading || !transcript.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black shadow-lg hover:shadow-xl transition-all"
              >
                {mockQuestionIdx < currentQuestionsList.length - 1 || (isMockTest && mockPart < 3) ? (
                  <>
                    Tiếp tục câu tiếp theo <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Nộp bài cho AI chấm gộp
                  </>
                )}
              </button>
            </div>
          )}

          {/* Answer history review drawer */}
          {Object.keys(answersAccumulator).length > 0 && (
            <details className="group border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
              <summary className="px-4 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 list-none flex justify-between items-center">
                <span>📋 Xem câu trả lời đã ghi âm ({Object.keys(answersAccumulator).length})</span>
                <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                {Object.entries(answersAccumulator).map(([qText, data], index) => (
                  <div key={index} className="space-y-1 text-xs border-b border-slate-100 dark:border-slate-700/50 pb-2 last:border-b-0 last:pb-0">
                    <p className="font-bold text-slate-700 dark:text-slate-350">Q{index + 1}: {qText}</p>
                    <p className="text-slate-500 dark:text-slate-400 italic">Ans: {data.transcript}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
