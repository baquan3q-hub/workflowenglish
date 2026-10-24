import React, { useState } from 'react';
import { IeltsAiFeedback, IeltsQuestion } from '../types';
import type { FluencyMetrics } from '../services/fluencyLogic';
import FluencyPanel from '../components/ielts/speaking/FluencyPanel';
import { BandScoreDisplay, CriterionScoreBar, FeedbackList, NextActionsList } from '../components/IeltsCommon';
import { CorrectionsByCategory } from '../components/ielts/writing/FeedbackSections';
import WordPicker from '../components/ielts/WordPicker';
import { ArrowLeft, RotateCcw, Save, ChevronDown, ChevronUp, FileText, Sparkles, Volume2, Mic, ListChecks, Layers } from 'lucide-react';

interface Props {
  userId: string;
  question: IeltsQuestion;
  userTranscript: string;
  feedback: IeltsAiFeedback;
  onRetry: () => void;
  onBackToHub: () => void;
  /** Measured on the device; absent for older attempts. */
  fluency?: FluencyMetrics | null;
}

const PART_TITLES: Record<number, string> = { 1: 'Part 1 · Phỏng vấn', 2: 'Part 2 · Nói một mình', 3: 'Part 3 · Thảo luận' };

export default function IeltsSpeakingFeedback({ userId, question, userTranscript, feedback, onRetry, onBackToHub, fluency }: Props) {
  const isMock = question.questionType === 'mock_test';
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
        <div className="flex items-center gap-1.5 px-3 py-1 bg-tone-blush-soft rounded-full">
          <Sparkles className="w-3 h-3 text-tone-blush-fg" />
          <span className="text-xs font-bold text-tone-blush-fg">AI Feedback</span>
        </div>
      </div>

      {/* Score Hero */}
      <div className="bg-tone-peach rounded-2xl border border-tone-peach-border p-6 text-center space-y-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {isMock ? 'Band Speaking cả bài thi thử' : 'Estimated Speaking Band'}
        </p>
        <BandScoreDisplay
          score={feedback.estimatedBand}
          targetBand={question.targetBand}
          label=""
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          Đây là điểm ước lượng bởi AI, không phải điểm IELTS chính thức
        </p>
      </div>

      {/* Band per part (mock test) */}
      {feedback.partBands && feedback.partBands.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" aria-hidden="true" />
            Band từng phần
          </h3>
          <ul className="grid gap-3 sm:grid-cols-3">
            {feedback.partBands.map((p) => (
              <li key={p.part} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{PART_TITLES[p.part] ?? `Part ${p.part}`}</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{p.band.toFixed(1)}</p>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{p.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top improvements (mock test) */}
      {feedback.topImprovements && feedback.topImprovements.length > 0 && (
        <div className="bg-tone-butter rounded-xl border border-tone-butter-border p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-bold text-tone-butter-fg flex items-center gap-2">
            <ListChecks className="w-4 h-4" aria-hidden="true" />
            3 việc cần cải thiện trước
          </h3>
          <ol className="space-y-2">
            {feedback.topImprovements.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-tone-butter-fg">
                <span className="font-bold tabular-nums">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Criterion Scores */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Điểm theo tiêu chí</h3>
        {feedback.criterionScores.map((c, i) => (
          <CriterionScoreBar key={i} criterion={c} skill="speaking" />
        ))}
      </div>

      {fluency && <FluencyPanel metrics={fluency} title={isMock ? 'Chỉ số trôi chảy cả bài' : undefined} />}

      {/* Strengths & Weaknesses */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-tone-mint rounded-xl border border-tone-mint-border p-4">
          <FeedbackList items={feedback.strengths} type="strength" />
        </div>
        <div className="bg-tone-butter rounded-xl border border-tone-butter-border p-4">
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
          {showOriginal ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
        </button>
        {showOriginal && (
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{userTranscript}</p>
          </div>
        )}
      </div>

      {/* Sentence Corrections */}
      {feedback.sentenceCorrections.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
          <CorrectionsByCategory corrections={feedback.sentenceCorrections} />
        </div>
      )}

      {/* Pronunciation Notes */}
      {feedback.pronunciationNotes && feedback.pronunciationNotes.length > 0 && (
        <div className="bg-tone-lavender rounded-xl border border-tone-lavender-border p-4 sm:p-5 space-y-3">
          <h4 className="text-sm font-bold text-tone-lavender-fg flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Luyện phát âm
          </h4>
          <ul className="space-y-2">
            {feedback.pronunciationNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-tone-lavender-fg leading-relaxed">
                <Volume2 aria-hidden="true" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-tone-lavender-fg" />
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
            <Sparkles className="w-4 h-4 text-tone-blush-fg" />
            <span className="text-sm font-bold text-tone-blush-fg">
              Câu trả lời cải thiện (Target Band {question.targetBand})
            </span>
          </div>
          {showImproved ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
        </button>
        {showImproved && (
          <div className="px-4 pb-4 border-t border-tone-blush-border pt-3">
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-tone-blush rounded-lg p-4">
              {feedback.improvedVersion}
            </p>
            <div className="mt-3">
              <WordPicker userId={userId} text={feedback.improvedVersion} />
            </div>
          </div>
        )}
      </div>

      {/* Follow-up Drill */}
      {feedback.followUpDrill && (
        <div className="bg-tone-sky rounded-xl border border-tone-sky-border p-4">
          <h4 className="text-sm font-bold text-tone-sky-fg mb-2">Bài luyện tiếp theo</h4>
          <p className="text-xs text-tone-sky-fg leading-relaxed">{feedback.followUpDrill}</p>
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
          className="press flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-tone-peach-border bg-tone-peach-soft text-tone-peach-fg hover:bg-tone-peach-border rounded-xl text-sm font-bold transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          {isMock ? 'Thi thử đề khác' : 'Nói lại để cải thiện'}
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
