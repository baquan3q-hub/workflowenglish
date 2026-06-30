import React, { useState, useRef, useCallback } from 'react';
import { IeltsQuestion } from '../types';
import { ieltsFrameworks } from '../data/ieltsFrameworks';
import { WritingTimer, WordCountDisplay, FrameworkCard } from '../components/IeltsCommon';
import IeltsChartRenderer from '../components/IeltsChartRenderer';
import { ArrowLeft, Send, Lightbulb, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-black">{isTask1 ? 'T1' : 'T2'}</span>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
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

        {/* Framework Guide */}
        {framework && (
          <div>
            <button
              onClick={() => setShowFramework(!showFramework)}
              className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
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
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
            <button
              onClick={() => setShowPlanningPrompts(!showPlanningPrompts)}
              className="w-full px-4 py-2.5 flex items-center justify-between"
            >
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">💡 Gợi ý lập dàn ý</span>
              {showPlanningPrompts ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />}
            </button>
            {showPlanningPrompts && (
              <div className="px-4 pb-3 space-y-1.5">
                {question.planningPrompts.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <span className="font-bold text-amber-500">{i + 1}.</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 anim-fade-up">
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
            className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-850 rounded-lg px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/25 transition-colors"
          >
            {isSplit ? '🖥️ Chế độ tập trung' : '📖 Chia đôi màn hình'}
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
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                ${wordCount >= minWords ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-600'}
                ${isGrading ? 'opacity-60 cursor-not-allowed' : ''}
                transition-colors`}
            />
            {/* Submit bar */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {wordCount < minWords
                  ? `⚠️ Còn thiếu ${minWords - wordCount} từ (vẫn có thể gửi chấm)`
                  : `✅ Đạt yêu cầu tối thiểu (${wordCount} từ)`
                }
              </p>
              <button
                onClick={handleSubmit}
                disabled={isGrading || wordCount < 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg transition-all"
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
              <span>📖 Xem đề bài & Biểu đồ</span>
              <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
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
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              ${wordCount >= minWords ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-600'}
              ${isGrading ? 'opacity-60 cursor-not-allowed' : ''}
              transition-colors`}
          />
          {/* Submit bar */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {wordCount < minWords
                ? `⚠️ Còn thiếu ${minWords - wordCount} từ (vẫn có thể gửi chấm)`
                : `✅ Đạt yêu cầu tối thiểu (${wordCount} từ)`
              }
            </p>
            <button
              onClick={handleSubmit}
              disabled={isGrading || wordCount < 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg transition-all"
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
