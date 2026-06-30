import React, { useState } from 'react';
import { IeltsAiFeedback, IeltsQuestion } from '../types';
import { BandScoreDisplay, CriterionScoreBar, FeedbackList, SentenceCorrectionList, NextActionsList } from '../components/IeltsCommon';
import { ArrowLeft, RotateCcw, Save, ChevronDown, ChevronUp, FileText, Sparkles, Volume2, Mic } from 'lucide-react';

interface Props {
  question: IeltsQuestion;
  userTranscript: string;
  feedback: IeltsAiFeedback;
  onRetry: () => void;
  onBackToHub: () => void;
}

export default function IeltsSpeakingFeedback({ question, userTranscript, feedback, onRetry, onBackToHub }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showImproved, setShowImproved] = useState(false);

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 rounded-full">
          <Sparkles className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">AI Feedback</span>
        </div>
      </div>

      {/* Score Hero */}
      <div className="bg-gradient-to-br from-slate-50 to-rose-50 dark:from-slate-800 dark:to-rose-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center space-y-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Estimated Speaking Band
        </p>
        <BandScoreDisplay
          score={feedback.estimatedBand}
          targetBand={question.targetBand}
          label=""
        />
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          ⚠️ Đây là điểm ước lượng bởi AI, không phải điểm IELTS chính thức
        </p>
      </div>

      {/* Criterion Scores */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">📊 Điểm theo tiêu chí</h3>
        {feedback.criterionScores.map((c, i) => (
          <CriterionScoreBar key={i} criterion={c} />
        ))}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/40 p-4">
          <FeedbackList items={feedback.strengths} type="strength" />
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/40 p-4">
          <FeedbackList items={feedback.weaknesses} type="weakness" />
        </div>
      </div>

      {/* Your Transcript */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Transcript của bạn</span>
          </div>
          {showOriginal ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showOriginal && (
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{userTranscript}</p>
          </div>
        )}
      </div>

      {/* Sentence Corrections */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
        <SentenceCorrectionList corrections={feedback.sentenceCorrections} />
      </div>

      {/* Pronunciation Notes */}
      {feedback.pronunciationNotes && feedback.pronunciationNotes.length > 0 && (
        <div className="bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-200 dark:border-violet-800/40 p-4 sm:p-5 space-y-3">
          <h4 className="text-sm font-bold text-violet-700 dark:text-violet-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            🎯 Luyện phát âm
          </h4>
          <ul className="space-y-2">
            {feedback.pronunciationNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                <span className="text-violet-400 mt-0.5">🔊</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improved Version */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowImproved(!showImproved)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
              ✨ Câu trả lời cải thiện (Target Band {question.targetBand})
            </span>
          </div>
          {showImproved ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showImproved && (
          <div className="px-4 pb-4 border-t border-rose-100 dark:border-rose-800/40 pt-3">
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4">
              {feedback.improvedVersion}
            </p>
          </div>
        )}
      </div>

      {/* Follow-up Drill */}
      {feedback.followUpDrill && (
        <div className="bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-200 dark:border-sky-800/40 p-4">
          <h4 className="text-sm font-bold text-sky-700 dark:text-sky-300 mb-2">🎯 Bài luyện tiếp theo</h4>
          <p className="text-xs text-sky-600 dark:text-sky-400 leading-relaxed">{feedback.followUpDrill}</p>
        </div>
      )}

      {/* Next Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
        <NextActionsList actions={feedback.nextActions} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Nói lại để cải thiện
        </button>
        <button
          onClick={onBackToHub}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all"
        >
          <Save className="w-4 h-4" />
          Lưu & Chọn câu khác
        </button>
      </div>
    </div>
  );
}
