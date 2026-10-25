import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IeltsQuestion } from '../types';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { WritingTimer, WordCountDisplay, FrameworkCard } from '../components/IeltsCommon';
import IeltsChartRenderer from '../components/IeltsChartRenderer';
import { ArrowLeft, Send, Lightbulb, ChevronDown, ChevronUp, Loader2, BookOpen, Columns2, Maximize2, TriangleAlert, CircleCheck, Save, Timer } from 'lucide-react';
import { guideForQuestionType } from '../data/ielts/writingGuides';
import GuideDrawer from '../components/ielts/writing/GuideDrawer';
import IdeasPanel from '../components/ielts/writing/IdeasPanel';
import { IconTile } from '../components/ui/IconTile';
import { toneClasses } from '../components/ui/palette';
import { panel, primaryBtn, secondaryBtn } from '../components/ui/styles';
import { countWords, examOutcome, readWritingDraft, saveWritingDraft, writingLimits, type WritingMode } from '../services/writingPracticeLogic';

const compactBtn = secondaryBtn.replace('px-4', 'px-3');
const SAVE_DELAY_MS = 800;

function WordStatus({ wordCount, minWords }: { wordCount: number; minWords: number }) {
  const ok = wordCount >= minWords;
  return (
    <p className={`flex items-center gap-1.5 text-xs ${ok ? 'text-tone-mint-fg' : 'text-slate-600 dark:text-slate-400'}`}>
      {ok ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5 text-tone-butter-fg" />}
      {ok ? `Đạt yêu cầu tối thiểu (${wordCount} từ)` : `Còn thiếu ${minWords - wordCount} từ (vẫn có thể gửi chấm)`}
    </p>
  );
}

interface Props {
  userId: string;
  question: IeltsQuestion;
  onSubmit: (answer: string, durationSeconds: number, meta: { mode: WritingMode; autoSubmitted: boolean }) => void;
  onBack: () => void;
  isGrading: boolean;
  /** Text to start from when rewriting; otherwise the draft kept on this device. */
  initialDraft?: string;
  /** Exam: countdown that sends the essay when it ends, no hints, no draft kept. */
  mode?: WritingMode;
}

export default function IeltsWritingPractice({ userId, question, onSubmit, onBack, isGrading, initialDraft, mode = 'practice' }: Props) {
  const isExam = mode === 'exam';
  const [restored] = useState(() => (initialDraft || isExam ? null : readWritingDraft(userId, question.id)));
  const [answer, setAnswer] = useState(initialDraft || restored?.text || '');
  const [showFramework, setShowFramework] = useState(false);
  const [showPlanningPrompts, setShowPlanningPrompts] = useState(true);
  // A resumed draft keeps the time it already took.
  const [startTime] = useState(() => Date.now() - (restored?.elapsedSeconds ?? 0) * 1000);
  const [isSplit, setIsSplit] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(restored ? Date.now() : null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [timeUpEmpty, setTimeUpEmpty] = useState(false);
  const sent = useRef(false);
  const guide = guideForQuestionType(question.questionType);
  const closeGuide = useCallback(() => setShowGuide(false), []);

  const isTask1 = question.taskOrPart === 'task_1';
  const framework = ieltsFrameworks.find((f) => f.id === question.frameworkId);
  const wordCount = countWords(answer);
  const { minWords, minutes: timeLimit } = writingLimits(question);

  // Keep what the learner has typed on this device, a moment after they stop typing.
  const latest = useRef(answer);
  latest.current = answer;
  const persist = useCallback(() => {
    if (isExam) return;
    const elapsed = (Date.now() - startTime) / 1000;
    if (saveWritingDraft(userId, question.id, latest.current, elapsed)) setSavedAt(Date.now());
  }, [userId, question.id, startTime, isExam]);

  useEffect(() => {
    if (isGrading || answer === (initialDraft || restored?.text || '')) return;
    const timer = setTimeout(persist, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [answer, isGrading, persist, initialDraft, restored]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [persist]);

  const goBack = () => {
    // An exam attempt is not kept: ask before throwing away what is written.
    if (isExam && !isGrading && !timeUpEmpty && countWords(latest.current) > 0 && !confirmExit) {
      setConfirmExit(true);
      return;
    }
    if (!isGrading) persist();
    onBack();
  };

  const send = useCallback(
    (auto: boolean) => {
      if (sent.current || isGrading || countWords(latest.current) < 1) return;
      sent.current = true;
      const spent = Math.floor((Date.now() - startTime) / 1000);
      onSubmit(latest.current, auto ? Math.min(spent, timeLimit * 60) : spent, { mode, autoSubmitted: auto });
    },
    [isGrading, startTime, timeLimit, onSubmit, mode],
  );

  // A failed grading lets the learner send again.
  useEffect(() => {
    if (!isGrading) sent.current = false;
  }, [isGrading]);

  const handleSubmit = useCallback(() => send(false), [send]);

  const handleExpire = useCallback(() => {
    if (!isExam) return;
    if (examOutcome(countWords(latest.current)) === 'submit') send(true);
    else setTimeUpEmpty(true);
  }, [isExam, send]);

  const editor = (
    <div className="space-y-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={isGrading || timeUpEmpty}
        aria-label={isTask1 ? 'Bài viết Task 1' : 'Bài viết Task 2'}
        placeholder={isTask1 ? 'Start writing your report here...' : 'Start writing your essay here...'}
        className={`w-full resize-y rounded-xl border-2 bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-tone-sky-border focus:ring-2 focus:ring-tone-sky-accent dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 sm:p-5 ${
          isSplit ? 'min-h-[350px] lg:min-h-[450px]' : 'min-h-[400px] sm:min-h-[500px]'
        } ${wordCount >= minWords ? 'border-tone-mint-border' : 'border-slate-200 dark:border-slate-600'} ${isGrading ? 'cursor-not-allowed opacity-60' : ''}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <WordStatus wordCount={wordCount} minWords={minWords} />
          {!isExam && savedAt !== null && (
            <p className={`flex items-center gap-1.5 text-caption ${toneClasses('sky').text}`} aria-live="polite">
              <Save className="h-3.5 w-3.5" aria-hidden /> Đã lưu nháp trên máy này
            </p>
          )}
        </div>
        <button type="button" onClick={handleSubmit} disabled={isGrading || wordCount < 1} className={primaryBtn}>
          {isGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isGrading ? 'AI đang chấm...' : 'Gửi bài chấm thật'}
        </button>
      </div>
    </div>
  );

  const renderLeftSection = () => (
    <div className="space-y-4">
      {/* Question details */}
      <div className={`rounded-xl border p-4 sm:p-5 ${toneClasses('lavender').surface}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-tone-lavender-soft text-xs font-black text-tone-lavender-fg">
            {isTask1 ? 'T1' : 'T2'}
          </span>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-tone-sky-soft px-2 py-0.5 text-[10px] font-bold text-tone-sky-fg">{question.questionType.replace(/_/g, ' ')}</span>
              <span className="rounded-full bg-tone-aqua-soft px-2 py-0.5 text-[10px] font-bold text-tone-aqua-fg">{question.topic}</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100 sm:text-base">{question.prompt}</p>
            <p className="text-xs italic text-slate-600 dark:text-slate-400">
              Write at least {minWords} words. You should spend about {timeLimit} minutes on this task.
            </p>
          </div>
        </div>
      </div>

      {isTask1 && question.chartData && <IeltsChartRenderer data={question.chartData} />}

      {!isExam && guide && (
        <button type="button" onClick={() => setShowGuide(true)} className={`${secondaryBtn} group`}>
          <BookOpen className="icon-pop h-4 w-4 text-tone-lavender-fg" /> Xem hướng dẫn dạng này
        </button>
      )}

      {!isExam && framework && (
        <div>
          <button onClick={() => setShowFramework(!showFramework)} className="flex min-h-touch items-center gap-2 text-sm font-bold text-tone-periwinkle-fg">
            <Lightbulb className="h-4 w-4" />
            {showFramework ? 'Ẩn framework hướng dẫn' : 'Xem framework gợi ý'}
            {showFramework ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showFramework && (
            <div className="mt-2">
              <FrameworkCard framework={framework} />
            </div>
          )}
        </div>
      )}

      {!isExam && question.planningPrompts && question.planningPrompts.length > 0 && (
        <div className={`overflow-hidden rounded-xl border ${toneClasses('butter').surface}`}>
          <button onClick={() => setShowPlanningPrompts(!showPlanningPrompts)} aria-expanded={showPlanningPrompts} className="flex min-h-touch w-full items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-tone-butter-fg">
              <Lightbulb className="h-3.5 w-3.5" /> Gợi ý lập dàn ý
            </span>
            {showPlanningPrompts ? <ChevronUp className="h-3 w-3 text-tone-butter-fg" /> : <ChevronDown className="h-3 w-3 text-tone-butter-fg" />}
          </button>
          {showPlanningPrompts && (
            <div className="space-y-1.5 px-4 pb-3">
              {question.planningPrompts.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <span className="font-bold text-tone-butter-fg">{i + 1}.</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isExam && !isTask1 && <IdeasPanel question={question} />}
    </div>
  );

  return (
    <div className="space-y-4 anim-fade-up">
      {showGuide && guide && <GuideDrawer guide={guide} onClose={closeGuide} />}

      {isExam && !timeUpEmpty && !confirmExit && (
        <p className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${toneClasses('sky').surface} ${toneClasses('sky').text}`} role="status">
          <Timer className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          Chế độ thi thử: hết {timeLimit} phút bài sẽ tự được gửi chấm, không có gợi ý và không lưu nháp.
        </p>
      )}
      {timeUpEmpty && (
        <p className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${toneClasses('blush').surface} ${toneClasses('blush').text}`} role="alert">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          Hết giờ nhưng chưa có bài viết nào để chấm.
        </p>
      )}
      {confirmExit && (
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${toneClasses('butter').surface}`} role="alert">
          <p className={`flex-1 ${toneClasses('butter').text}`}>Thoát bây giờ sẽ mất bài đang viết (chế độ thi thử không lưu nháp).</p>
          <button type="button" onClick={() => setConfirmExit(false)} className={compactBtn}>
            Viết tiếp
          </button>
          <button type="button" onClick={onBack} className={compactBtn}>
            Thoát
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button onClick={goBack} className="inline-flex min-h-touch items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-tone-lavender-fg dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsSplit(!isSplit)} className={`${compactBtn} hidden lg:inline-flex`}>
            {isSplit ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" /> Chế độ tập trung
              </>
            ) : (
              <>
                <Columns2 className="h-3.5 w-3.5" /> Chia đôi màn hình
              </>
            )}
          </button>
          <WritingTimer startTime={startTime} limitMinutes={timeLimit} onExpire={handleExpire} />
          <WordCountDisplay text={answer} minimum={minWords} />
        </div>
      </div>

      {isSplit ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {renderLeftSection()}
          {editor}
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <details className={`group overflow-hidden ${panel}`}>
            <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <IconTile icon={BookOpen} tone="lavender" size="sm" /> Xem đề bài và biểu đồ
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400" />
            </summary>
            <div className="border-t border-slate-200 p-4 dark:border-slate-700">{renderLeftSection()}</div>
          </details>
          {editor}
        </div>
      )}
    </div>
  );
}
