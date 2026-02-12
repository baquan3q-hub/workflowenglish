import React, { useState } from 'react';
import { Check, X, AlertCircle, Award, RotateCcw, ListChecks, ArrowLeft, PenTool } from 'lucide-react';
import { QuizQuestion } from '../types';
import { Button, ProgressBar } from '../components/Common';

interface QuizModeProps {
  questions: QuizQuestion[];
  onRestart: () => void;
  onComplete?: (score: number, total: number) => void;
  onNextPhase?: () => void;
}

const QuizMode: React.FC<QuizModeProps> = ({ questions, onRestart, onComplete, onNextPhase }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completed, setCompleted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Track attempts for summary
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  const handleOptionClick = (option: string) => {
    if (status === 'correct') return; // Prevent changing after correct

    setSelectedOption(option);

    // Track attempts
    setAttempts(prev => ({
      ...prev,
      [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1
    }));

    if (option === currentQuestion.correctAnswer) {
      setStatus('correct');
      // Only count first-attempt correct
      if (!attempts[currentQuestion.id]) {
        setScore(prev => prev + 1);
      }
      const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => { });
    } else {
      setStatus('wrong');
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setStatus('idle');
    } else {
      setCompleted(true);
      // Calculate final score (current score + this last correct answer was already counted)
      const finalScore = score;
      onComplete?.(finalScore, questions.length);
    }
  };

  const handleReview = () => {
    setShowSummary(true);
  }

  const handleBackToResult = () => {
    setShowSummary(false);
  }

  if (completed) {
    if (showSummary) {
      return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <Button variant="ghost" onClick={handleBackToResult} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Result
          </Button>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Review Answers</h2>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                    {idx + 1}
                  </span>
                  <div className="space-y-2 w-full">
                    <h3 className="font-semibold text-slate-800">{q.question}</h3>
                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                      <span className="font-bold">Correct Answer:</span> {q.correctAnswer}
                    </div>
                    <p className="text-slate-500 text-sm italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-8 sm:pt-12 animate-fade-in px-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <Award className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Hoàn thành Quiz!</h2>
        <p className="text-slate-600 text-lg">
          Điểm: <span className="font-bold text-blue-600">{score}/{questions.length}</span> — {Math.round((score / questions.length) * 100)}% chính xác
        </p>

        <div className="flex flex-col gap-3">
          {onNextPhase && (
            <Button onClick={onNextPhase} className="w-full">
              <PenTool className="w-4 h-4 mr-2" /> Kiểm tra điền từ →
            </Button>
          )}
          <Button onClick={handleReview} variant="outline" className="w-full">
            <ListChecks className="w-4 h-4 mr-2" /> Xem lại đáp án
          </Button>
          <Button onClick={onRestart} variant="ghost" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" /> Bài học mới
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Hãy ôn lại trước khi bắt đầu bài mới nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-4">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium text-slate-500">
          <span>Câu {currentIndex + 1}/{questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <ProgressBar progress={progress} />
      </div>

      {/* Question Card */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wide">
            Word Meaning Check
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 sm:mb-8 leading-snug">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            let stateClass = "border-slate-200 hover:border-blue-400 hover:bg-slate-50";
            let icon = null;

            // Logic for visual states
            if (selectedOption === option) {
              if (status === 'correct') {
                stateClass = "border-green-500 bg-green-50 text-green-800";
                icon = <Check className="w-5 h-5 text-green-600" />;
              } else if (status === 'wrong') {
                stateClass = "border-red-300 bg-red-50 text-red-800";
                icon = <X className="w-5 h-5 text-red-500" />;
              }
            } else if (status === 'correct' && option === currentQuestion.correctAnswer) {
              stateClass = "border-green-500 bg-green-50 text-green-800";
              icon = <Check className="w-5 h-5 text-green-600" />;
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center font-medium ${stateClass}`}
                disabled={status === 'correct'}
              >
                <span>{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback & Navigation Area */}
      <div className="h-24">
        {status === 'correct' && (
          <div className="bg-green-100 border border-green-200 p-4 rounded-xl flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="bg-green-200 p-2 rounded-full">
                <Check className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="font-bold text-green-800">Correct!</p>
                <p className="text-sm text-green-700">{currentQuestion.explanation}</p>
              </div>
            </div>
            <Button onClick={handleNext}>
              {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
            </Button>
          </div>
        )}

        {status === 'wrong' && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 animate-shake">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-bold text-red-800">Not quite right.</p>
              <p className="text-sm text-red-600">Try again! Mastery requires getting it right.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizMode;
