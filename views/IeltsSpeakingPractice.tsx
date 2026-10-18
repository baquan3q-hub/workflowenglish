import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import type { IeltsQuestion, IeltsSpeakingPart } from '../types';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { FrameworkCard } from '../components/IeltsCommon';
import { transcribeAudioWithGemini } from '../services/ieltsSpeakingService';
import { cancelRecording } from '../services/speechService';
import { combineFluency, fluencyMetrics, type FluencyMetrics } from '../services/fluencyLogic';
import { cueBullets, cueTitle, joinAnswers, PART_GUIDES, practiceQuestions } from '../services/speakingPracticeLogic';
import { useRecorder, type RecordedTake } from '../components/ielts/speaking/useRecorder';
import { analyzeTake, type AnalyzedTake, type Transcribe } from '../components/ielts/speaking/analyzeTake';
import RecordControls from '../components/ielts/speaking/RecordControls';
import CuePrep from '../components/ielts/speaking/CuePrep';
import { FluencyChips } from '../components/ielts/speaking/FluencyPanel';
import { errorText, ghostBtn, label, muted, panel, primaryBtn } from '../components/ielts/speaking/styles';

export interface SpeakingSubmission {
  transcript: string;
  audioBase64: string;
  audioMimeType: string;
  durationSeconds: number;
  fluency: FluencyMetrics | null;
}

interface Props {
  question: IeltsQuestion;
  onSubmit: (submission: SpeakingSubmission) => void;
  onBack: () => void;
  isGrading: boolean;
  /** Swapped out in previews without the AI server. */
  transcribe?: Transcribe;
}

interface Answer {
  question: string;
  transcript: string;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  fluency: FluencyMetrics;
}

type Analysis = { status: 'idle' } | { status: 'working' } | ({ status: 'done' } & AnalyzedTake);

const PART_LABEL: Record<IeltsSpeakingPart, string> = { part_1: 'Part 1', part_2: 'Part 2', part_3: 'Part 3' };

export default function IeltsSpeakingPractice({ question, onSubmit, onBack, isGrading, transcribe = transcribeAudioWithGemini }: Props) {
  const part = question.taskOrPart as IeltsSpeakingPart;
  const guide = PART_GUIDES[part] ?? PART_GUIDES.part_1;
  const questions = useMemo(() => practiceQuestions(question), [question]);
  const framework = ieltsFrameworks.find((f) => f.id === question.frameworkId);
  const bullets = useMemo(() => cueBullets(question.prompt), [question.prompt]);

  const [stage, setStage] = useState<'prep' | 'answer'>(part === 'part_2' ? 'prep' : 'answer');
  const [notes, setNotes] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [analysis, setAnalysis] = useState<Analysis>({ status: 'idle' });
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  const handleTake = (take: RecordedTake) => {
    const id = ++run.current;
    setAnalysis({ status: 'working' });
    setTranscript('');
    setError(null);
    void analyzeTake(take, transcribe).then((r) => {
      if (id !== run.current) return;
      setAnalysis({ status: 'done', ...r });
      setTranscript(r.transcript ?? '');
    });
  };
  const rec = useRecorder(guide.maxSeconds, { onTake: handleTake });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage, index]);

  // A new recording replaces the previous take and its analysis.
  useEffect(() => {
    if (rec.recording) {
      run.current++;
      setAnalysis({ status: 'idle' });
    }
  }, [rec.recording]);

  const take = rec.take;
  const done = analysis.status === 'done' ? analysis : null;
  // Measured on what the AI heard, so tidying the text does not hide fillers.
  const metrics = useMemo(
    () =>
      take && done
        ? fluencyMetrics({ transcript: done.transcript ?? transcript, durationSeconds: take.durationSeconds, rms: done.rms })
        : null,
    [take, done, transcript],
  );
  const isLast = index === questions.length - 1;
  const current = questions[index];

  const resetTake = () => {
    run.current++;
    rec.clear();
    setAnalysis({ status: 'idle' });
    setTranscript('');
  };

  const next = () => {
    if (!take || !done || !metrics) return;
    if (!transcript.trim()) {
      setError('Chưa có nội dung. Ghi âm lại hoặc gõ lại câu trả lời.');
      return;
    }
    const answer: Answer = {
      question: current,
      transcript: transcript.trim(),
      base64: done.base64,
      mimeType: take.mimeType,
      durationSeconds: take.durationSeconds,
      fluency: metrics,
    };
    const all = [...answers, answer];
    if (!isLast) {
      setAnswers(all);
      setIndex(index + 1);
      resetTake();
      return;
    }
    // The longest answer carries the most evidence of pronunciation.
    const longest = all.reduce((a, b) => (b.durationSeconds > a.durationSeconds ? b : a));
    setAnswers(all);
    onSubmit({
      transcript: joinAnswers(all),
      audioBase64: longest.base64,
      audioMimeType: longest.mimeType,
      durationSeconds: all.reduce((s, a) => s + a.durationSeconds, 0),
      fluency: combineFluency(all.map((a) => a.fluency)),
    });
  };

  const exit = () => {
    cancelRecording();
    onBack();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={exit} className={ghostBtn}>
          <ArrowLeft className="h-4 w-4" /> Thoát
        </button>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-caption font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          Speaking {PART_LABEL[part] ?? part}
        </span>
      </div>

      {stage === 'prep' ? (
        <CuePrep prompt={question.prompt} notes={notes} setNotes={setNotes} onDone={() => setStage('answer')} />
      ) : (
        <>
          <section className={`${panel} space-y-3 p-4 sm:p-5`}>
            {questions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className={muted}>
                  Câu {index + 1}/{questions.length}
                </span>
                <div className="flex flex-1 gap-1" aria-hidden="true">
                  {questions.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-emerald-500' : i === index ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {part === 'part_2' ? (
              <>
                <p className="text-heading text-slate-900 dark:text-white">{cueTitle(question.prompt)}</p>
                {bullets.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                    {bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="whitespace-pre-line text-title text-slate-900 dark:text-white">{current}</p>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{guide.targetVi}.</span> {guide.tipVi}
            </p>
          </section>

          {part === 'part_2' && notes.some((n) => n?.trim()) && (
            <section className={`${panel} p-4`} aria-label="Ghi chú của bạn">
              <p className={label}>Ghi chú của bạn</p>
              <ol className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200">
                {(bullets.length ? bullets : notes).map((b, i) =>
                  notes[i]?.trim() ? (
                    <li key={i}>
                      <span className="font-semibold">{i + 1}.</span> {notes[i]}
                    </li>
                  ) : null,
                )}
              </ol>
            </section>
          )}

          {(framework || question.vocabulary?.length) && index === 0 && !take && (
            <div className="space-y-3">
              {framework && <FrameworkCard framework={framework} />}
              {question.vocabulary && question.vocabulary.length > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">Từ vựng nên dùng:</span> {question.vocabulary.join(', ')}
                </p>
              )}
            </div>
          )}

          <section className={`${panel} space-y-4 p-4 sm:p-5`}>
            <RecordControls rec={rec} part={part} maxSeconds={guide.maxSeconds} disabled={isGrading} />

            {take && !rec.recording && (
              <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <audio src={take.url} controls className="h-10 w-full" />
                {analysis.status === 'working' && (
                  <p className={`${muted} flex items-center gap-2`}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang chuyển giọng nói thành chữ…
                  </p>
                )}
                {done && (
                  <>
                    {done.error && <p className={errorText}>{done.error} Bạn cũng có thể tự gõ câu trả lời bên dưới.</p>}
                    {metrics && done.transcript && <FluencyChips metrics={metrics} />}
                    <label className="block space-y-1">
                      <span className="text-caption font-semibold text-slate-600 dark:text-slate-300">
                        Bản chép lời (sửa nếu AI nghe nhầm, giữ nguyên um/uh)
                      </span>
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        rows={5}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    {error && <p className={errorText}>{error}</p>}
                    <button type="button" onClick={next} disabled={isGrading || !transcript.trim()} className={`${primaryBtn} w-full sm:w-auto`}>
                      {isGrading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Đang chấm…
                        </>
                      ) : isLast ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Nộp để AI chấm
                        </>
                      ) : (
                        <>
                          Câu tiếp theo <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

          {answers.length > 0 && (
            <details className={`${panel} group p-4`}>
              <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                Câu đã trả lời ({answers.length})
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <ol className="mt-2 space-y-3">
                {answers.map((a, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">{a.question}</p>
                    <p className="text-slate-600 dark:text-slate-300">{a.transcript}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </div>
  );
}
