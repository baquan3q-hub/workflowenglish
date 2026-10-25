import React, { useState } from 'react';
import { IeltsAiFeedback, IeltsQuestion } from '../types';
import { BandScoreDisplay, CriterionScoreBar, FeedbackList, NextActionsList } from '../components/IeltsCommon';
import { ArrowLeft, BarChart3, RotateCcw, ChevronDown, Sparkles, LayoutList } from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { toneClasses } from '../components/ui/palette';
import WordPicker from '../components/ielts/WordPicker';
import { CorrectionsByCategory, EssayByParagraph, RewriteComparison, Task1Checklist } from '../components/ielts/writing/FeedbackSections';
import { panel as sharedPanel, primaryBtn as sharedPrimary, secondaryBtn as sharedSecondary } from '../components/ui/styles';

interface Props {
  userId: string;
  question: IeltsQuestion;
  userAnswer: string;
  feedback: IeltsAiFeedback;
  /** The attempt before this one on the same prompt, when there is one. */
  previous?: { answer: string; feedback: IeltsAiFeedback } | null;
  onRewrite: () => void;
  onBackToHub: () => void;
}

const panel = `${sharedPanel} p-4 sm:p-5`;
const primaryBtn = `${sharedPrimary} flex-1`;
const secondaryBtn = `${sharedSecondary.replace('px-4', 'px-5')} flex-1`;

export default function IeltsWritingFeedback({ userId, question, userAnswer, feedback, previous, onRewrite, onBackToHub }: Props) {
  const [showImproved, setShowImproved] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-4 anim-fade-up">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToHub}
          className="inline-flex min-h-touch items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-tone-lavender-fg dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-lavender-soft px-2.5 py-1 text-caption font-semibold text-tone-lavender-fg">
          <Sparkles className="h-3.5 w-3.5" /> Nhận xét bởi AI
        </span>
      </div>

      <section className={`space-y-3 rounded-2xl border p-4 text-center sm:p-5 ${toneClasses('lavender').surface}`}>
        <p className="text-caption font-semibold uppercase tracking-wide text-tone-lavender-fg">Band ước lượng</p>
        <BandScoreDisplay score={feedback.estimatedBand} targetBand={question.targetBand} label="" />
        <p className="text-caption text-slate-600 dark:text-slate-300">Điểm do AI ước lượng, không phải điểm IELTS chính thức.</p>
      </section>

      {previous && (
        <section className={panel}>
          <RewriteComparison previous={previous} current={feedback} answer={userAnswer} />
        </section>
      )}

      <section className={`${panel} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <IconTile icon={BarChart3} tone="sky" size="sm" /> Điểm theo tiêu chí
        </h3>
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
          className="group flex min-h-touch w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <IconTile icon={LayoutList} tone="mint" size="sm" />
            Bài tham khảo (band {question.targetBand})
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${toneClasses('mint').text} ${showImproved ? 'rotate-180' : ''}`} />
        </button>
        {showImproved && (
          <>
            <p className="whitespace-pre-wrap rounded-xl border border-tone-mint-border bg-tone-mint p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {feedback.improvedVersion}
            </p>
            <WordPicker userId={userId} text={feedback.improvedVersion} />
          </>
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
