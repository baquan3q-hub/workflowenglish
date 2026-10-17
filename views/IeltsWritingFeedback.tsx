import React, { useState } from 'react';
import { IeltsAiFeedback, IeltsQuestion } from '../types';
import { BandScoreDisplay, CriterionScoreBar, FeedbackList, NextActionsList } from '../components/IeltsCommon';
import { ArrowLeft, RotateCcw, ChevronDown, Sparkles, LayoutList } from 'lucide-react';
import { CorrectionsByCategory, EssayByParagraph, RewriteComparison, Task1Checklist } from '../components/ielts/writing/FeedbackSections';

interface Props {
  question: IeltsQuestion;
  userAnswer: string;
  feedback: IeltsAiFeedback;
  /** The attempt before this one on the same prompt, when there is one. */
  previous?: { answer: string; feedback: IeltsAiFeedback } | null;
  onRewrite: () => void;
  onBackToHub: () => void;
}

const panel = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5';
const primaryBtn =
  'inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

export default function IeltsWritingFeedback({ question, userAnswer, feedback, previous, onRewrite, onBackToHub }: Props) {
  const [showImproved, setShowImproved] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-4 anim-fade-up">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToHub}
          className="inline-flex min-h-touch items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
        <span className="inline-flex items-center gap-1.5 text-caption font-medium text-slate-500 dark:text-slate-400">
          <Sparkles className="h-3.5 w-3.5" /> Nhận xét bởi AI
        </span>
      </div>

      <section className={`${panel} space-y-3 text-center`}>
        <p className="text-caption font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Band ước lượng</p>
        <BandScoreDisplay score={feedback.estimatedBand} targetBand={question.targetBand} label="" />
        <p className="text-caption text-slate-500 dark:text-slate-400">Điểm do AI ước lượng, không phải điểm IELTS chính thức.</p>
      </section>

      {previous && (
        <section className={panel}>
          <RewriteComparison previous={previous} current={feedback} answer={userAnswer} />
        </section>
      )}

      <section className={`${panel} space-y-4`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Điểm theo tiêu chí</h3>
        {feedback.criterionScores.map((c, i) => (
          <CriterionScoreBar key={i} criterion={c} skill="writing" />
        ))}
      </section>

      {feedback.task1Checklist?.length ? (
        <section className={panel}>
          <Task1Checklist feedback={feedback} />
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className={panel}>
          <FeedbackList items={feedback.strengths} type="strength" />
        </section>
        <section className={panel}>
          <FeedbackList items={feedback.weaknesses} type="weakness" />
        </section>
      </div>

      <section className={panel}>
        <EssayByParagraph answer={userAnswer} feedback={feedback} />
      </section>

      {feedback.sentenceCorrections.length > 0 && (
        <section className={panel}>
          <CorrectionsByCategory corrections={feedback.sentenceCorrections} />
        </section>
      )}

      <section className={`${panel} space-y-3`}>
        <button
          type="button"
          onClick={() => setShowImproved(!showImproved)}
          aria-expanded={showImproved}
          className="flex min-h-touch w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LayoutList className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Bài tham khảo (band {question.targetBand})
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-400 ${showImproved ? 'rotate-180' : ''}`} />
        </button>
        {showImproved && (
          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
            {feedback.improvedVersion}
          </p>
        )}
      </section>

      <section className={panel}>
        <NextActionsList actions={feedback.nextActions} />
      </section>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button type="button" onClick={onRewrite} className={primaryBtn}>
          <RotateCcw className="h-4 w-4" />
          Viết lại bài này
        </button>
        <button type="button" onClick={onBackToHub} className={secondaryBtn}>
          Chọn đề khác
        </button>
      </div>
    </div>
  );
}
