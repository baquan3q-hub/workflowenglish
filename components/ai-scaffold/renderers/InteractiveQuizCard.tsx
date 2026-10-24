import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, Sparkles, RotateCcw, Lightbulb } from 'lucide-react';
import { InteractiveQuizItem } from '../../../services/scaffoldActionTypes';

interface InteractiveQuizCardProps {
  quiz: InteractiveQuizItem;
  index: number;
}

export function InteractiveQuizCard({ quiz, index }: InteractiveQuizCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(quiz.userSelectedOptionId || null);
  const [fillAnswer, setFillAnswer] = useState(quiz.userAnswerText || '');
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(quiz.isAnswered || false);

  const handleSelectOption = (optionId: string) => {
    if (submitted) return;
    setSelectedOptionId(optionId);
    setSubmitted(true);
  };

  const handleFillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fillAnswer.trim() || submitted) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedOptionId(null);
    setFillAnswer('');
    setSubmitted(false);
    setShowHint(false);
  };

  const isMultipleChoice = quiz.type === 'multiple_choice' || (quiz.options && quiz.options.length > 0);
  const isFillOrParaphrase = quiz.type === 'fill_blank' || quiz.type === 'paraphrase';

  // For multiple choice
  const selectedOption = quiz.options?.find((o) => o.id === selectedOptionId);
  const isCorrectChoice = selectedOption?.isCorrect ?? false;

  // For fill or paraphrase
  const isFillCorrect =
    isFillOrParaphrase &&
    quiz.correctAnswer &&
    fillAnswer.trim().toLowerCase() === quiz.correctAnswer.trim().toLowerCase();

  return (
    <div className="bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-4 shadow-sm text-slate-800 dark:text-slate-100 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center">
            Q{index + 1}
          </span>
          <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
            {quiz.type === 'multiple_choice'
              ? 'Trắc nghiệm nhanh'
              : quiz.type === 'fill_blank'
              ? 'Điền từ vào chỗ trống'
              : 'Thử thách Paraphrase'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {quiz.scaffoldHint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
              title="Xem gợi ý tư duy"
            >
              <Lightbulb className="w-3 h-3" />
              <span>Gợi ý</span>
            </button>
          )}

          {submitted && (
            <button
              onClick={handleReset}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Làm lại câu này"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scaffolding Hint */}
      {showHint && quiz.scaffoldHint && (
        <div className="mb-2.5 p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-[11px] text-amber-700 dark:text-amber-300">Gợi ý tư duy:</span>
            <span>{quiz.scaffoldHint}</span>
          </div>
        </div>
      )}

      {/* Context Sentence (if provided) */}
      {quiz.contextSentence && (
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 border-l-2 border-indigo-400 mb-2 italic">
          "{quiz.contextSentence}"
        </div>
      )}

      {/* Question Prompt */}
      <h5 className="font-semibold text-sm leading-snug mb-3 text-slate-900 dark:text-white">
        {quiz.question}
      </h5>

      {/* Multiple Choice Options */}
      {isMultipleChoice && quiz.options && (
        <div className="space-y-2 mb-3">
          {quiz.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            let btnClass = 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50';

            if (submitted) {
              if (option.isCorrect) {
                btnClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-medium';
              } else if (isSelected && !option.isCorrect) {
                btnClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-medium';
              } else {
                btnClass = 'opacity-50 border-slate-200 dark:border-slate-700';
              }
            } else if (isSelected) {
              btnClass = 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300';
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                disabled={submitted}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${btnClass}`}
              >
                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                  {option.id.toUpperCase()}
                </span>
                <span className="flex-1 leading-relaxed">{option.text}</span>
                {submitted && option.isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                )}
                {submitted && isSelected && !option.isCorrect && (
                  <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fill in the blank / Paraphrase input */}
      {isFillOrParaphrase && (
        <form onSubmit={handleFillSubmit} className="mb-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={fillAnswer}
              onChange={(e) => setFillAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Nhập câu trả lời của bạn..."
              className="flex-1 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {!submitted ? (
              <button
                type="submit"
                disabled={!fillAnswer.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Kiểm tra
              </button>
            ) : null}
          </div>

          {submitted && (
            <div
              className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                isFillCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              {isFillCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Chính xác! Đáp án: <strong>{quiz.correctAnswer}</strong></span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span>Chưa chính xác. Đáp án đúng: <strong>{quiz.correctAnswer}</strong></span>
                </>
              )}
            </div>
          )}
        </form>
      )}

      {/* Feedback / Scaffolding Explanation */}
      {submitted && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Giải thích chi tiết (Giàn giáo học tập):</span>
          </div>

          {selectedOption?.explanation && (
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
              {selectedOption.explanation}
            </p>
          )}

          {quiz.explanation && (
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
              {quiz.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function InteractiveQuizList({ quizzes }: { quizzes: InteractiveQuizItem[] }) {
  if (!quizzes || quizzes.length === 0) return null;
  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          Bài tập ôn tập tương tác ({quizzes.length} câu)
        </h4>
      </div>
      {quizzes.map((quiz, index) => (
        <InteractiveQuizCard key={quiz.id || index} quiz={quiz} index={index} />
      ))}
    </div>
  );
}
