import React, { useState, useRef, useCallback } from 'react';
import { IeltsQuestion } from '../types';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { WritingTimer, WordCountDisplay, FrameworkCard } from '../components/IeltsCommon';
import IeltsChartRenderer from '../components/IeltsChartRenderer';
import { ArrowLeft, Send, Lightbulb, ChevronDown, ChevronUp, Loader2, BookOpen, Columns2, Maximize2, TriangleAlert, CircleCheck } from 'lucide-react';
import { guideForQuestionType } from '../data/ielts/writingGuides';
import GuideDrawer from '../components/ielts/writing/GuideDrawer';
import IdeasPanel from '../components/ielts/writing/IdeasPanel';

function WordStatus({ wordCount, minWords }: { wordCount: number; minWords: number }) {
  const ok = wordCount >= minWords;
  return (
    <p className={`flex items-center gap-1.5 text-xs ${ok ? 'text-tone-mint-fg' : 'text-slate-500 dark:text-slate-400'}`}>
      {ok ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5 text-tone-butter-fg" />}
      {ok ? `Đạt yêu cầu tối thiểu (${wordCount} từ)` : `Còn thiếu ${minWords - wordCount} từ (vẫn có thể gửi chấm)`}
    </p>
  );
}

interface Props {
  question: IeltsQuestion;
  onSubmit: (answer: string, durationSeconds: number) => void;
  onBack: () => void;
  isGrading: boolean;
  initialDraft?: string;
}

export default function IeltsWritingPractice({ question, onSubmit, onBack, isGrading, initialDraft }: Props) {
  const [answer, setAnswer] = useState(initialDraft || '');
  const [showFramework, setShowFramework] = useState(false);
  const [showPlanningPrompts, setShowPlanningPrompts] = useState(true);
  const [startTime] = useState(Date.now());
  const [isSplit, setIsSplit] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const guide = guideForQuestionType(question.questionType);
  const closeGuide = useCallback(() => setShowGuide(false), []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isTask1 = question.taskOrPart === 'task_1';
  const framework = ieltsFrameworks.find(f => f.id === question.frameworkId);
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const minWords = isTask1 ? 150 : 250;
  const timeLimit = isTask1 ? 20 : 40;

  const handleSubmit = useCallback(() => {
    if (wordCount < 1) {
      alert('Vui lòng viết bài trước khi gửi chấm.');
      return;
    }
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    onSubmit(answer, durationSeconds);
  }, [answer, wordCount, startTime, onSubmit]);

  const renderLeftSection = () => {
    return (
      <div className="space-y-4">
        {/* Question Details Card */}
        <div className="bg-tone-lavender rounded-xl border border-tone-lavender-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-tone-lavender-soft flex items-center justify-center flex-shrink-0">
              <span className="text-tone-lavender-fg text-xs font-black">{isTask1 ? 'T1' : 'T2'}</span>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tone-sky-soft text-tone-sky-fg">
                  {question.questionType.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {question.topic}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                {question.prompt}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Write at least {minWords} words. You should spend about {timeLimit} minutes on this task.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Renderer for Task 1 */}
        {isTask1 && question.chartData && (
          <IeltsChartRenderer data={question.chartData} />
        )}

        {/* Question-type guide and framework */}
        {guide && (
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="press inline-flex min-h-touch items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <BookOpen className="h-4 w-4" /> Xem hướng dẫn dạng này
          </button>
        )}

        {framework && (
          <div>
            <button
              onClick={() => setShowFramework(!showFramework)}
              className="flex items-center gap-2 text-sm font-bold text-tone-periwinkle-fg hover:text-tone-periwinkle-fg"
            >
              <Lightbulb className="w-4 h-4" />
              {showFramework ? 'Ẩn framework hướng dẫn' : 'Xem framework gợi ý'}
              {showFramework ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showFramework && (
              <div className="mt-2">
                <FrameworkCard framework={framework} />
              </div>
            )}
          </div>
        )}

        {/* Planning Prompts */}
        {question.planningPrompts && question.planningPrompts.length > 0 && (
          <div className="bg-tone-butter rounded-xl border border-tone-butter-border overflow-hidden">
            <button
              onClick={() => setShowPlanningPrompts(!showPlanningPrompts)}
              className="w-full px-4 py-2.5 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-tone-butter-fg"><Lightbulb className="h-3.5 w-3.5" /> Gợi ý lập dàn ý</span>
              {showPlanningPrompts ? <ChevronUp className="w-3 h-3 text-tone-butter-fg" /> : <ChevronDown className="w-3 h-3 text-tone-butter-fg" />}
            </button>
            {showPlanningPrompts && (
              <div className="px-4 pb-3 space-y-1.5">
                {question.planningPrompts.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-tone-butter-fg">
                    <span className="font-bold text-tone-butter-fg">{i + 1}.</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isTask1 && <IdeasPanel question={question} />}
      </div>
    );
  };

  return (
    <div className="space-y-4 anim-fade-up">
      {showGuide && guide && <GuideDrawer guide={guide} onClose={closeGuide} />}

      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSplit(!isSplit)}
            className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-tone-periwinkle-fg border border-tone-periwinkle-border rounded-lg px-2.5 py-1.5 bg-tone-periwinkle-soft hover:bg-tone-periwinkle-soft transition-colors"
          >
            {isSplit ? <><Maximize2 className="h-3.5 w-3.5" /> Chế độ tập trung</> : <><Columns2 className="h-3.5 w-3.5" /> Chia đôi màn hình</>}
          </button>
          <WritingTimer startTime={startTime} limitMinutes={timeLimit} />
          <WordCountDisplay text={answer} minimum={minWords} />
        </div>
      </div>

      {isSplit ? (
        /* Split layout for Task 1 or Split view mode */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {renderLeftSection()}
          
          <div className="space-y-4">
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isGrading}
              placeholder={isTask1 ? "Start writing your report here..." : "Start writing your essay here..."}
              className={`w-full min-h-[350px] lg:min-h-[450px] p-4 sm:p-5 rounded-xl border-2 text-sm leading-relaxed resize-y
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                placeholder:text-slate-300 dark:placeholder:text-slate-600
                focus:ring-2 focus:ring-tone-sky-accent focus:border-tone-sky-border outline-none
                ${wordCount >= minWords ? 'border-tone-mint-border' : 'border-slate-200 dark:border-slate-600'}
                ${isGrading ? 'opacity-60 cursor-not-allowed' : ''}
                transition-colors`}
            />
            {/* Submit bar */}
            <div className="flex items-center justify-between gap-3">
              <WordStatus wordCount={wordCount} minWords={minWords} />
              <button
                onClick={handleSubmit}
                disabled={isGrading || wordCount < 1}
                className="press flex items-center gap-2 px-5 py-2.5 border border-tone-periwinkle-border bg-tone-periwinkle-soft text-tone-periwinkle-fg hover:bg-tone-periwinkle-border disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI đang chấm...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gửi bài chấm thật
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Centered focused layout */
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Collapsible info header */}
          <details className="group border border-slate-250 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
            <summary className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100/50 transition-colors list-none flex justify-between items-center">
              <span>Xem đề bài và biểu đồ</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400" />
            </summary>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {renderLeftSection()}
            </div>
          </details>

          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isGrading}
            placeholder="Start writing your response here..."
            className={`w-full min-h-[400px] sm:min-h-[500px] p-4 sm:p-5 rounded-xl border-2 text-sm leading-relaxed resize-y
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              placeholder:text-slate-300 dark:placeholder:text-slate-600
              focus:ring-2 focus:ring-tone-sky-accent focus:border-tone-sky-border outline-none
              ${wordCount >= minWords ? 'border-tone-mint-border' : 'border-slate-200 dark:border-slate-600'}
              ${isGrading ? 'opacity-60 cursor-not-allowed' : ''}
              transition-colors`}
          />
          {/* Submit bar */}
          <div className="flex items-center justify-between gap-3">
            <WordStatus wordCount={wordCount} minWords={minWords} />
            <button
              onClick={handleSubmit}
              disabled={isGrading || wordCount < 1}
              className="press flex items-center gap-2 px-5 py-2.5 border border-tone-periwinkle-border bg-tone-periwinkle-soft text-tone-periwinkle-fg hover:bg-tone-periwinkle-border disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all"
            >
              {isGrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI đang chấm...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gửi bài chấm thật
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
