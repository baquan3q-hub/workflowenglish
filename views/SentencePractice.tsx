import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, CircleAlert, CircleCheck, CircleX, PenLine, RotateCcw, Sparkles, X } from 'lucide-react';
import type { SentenceGrade, SentenceItem, StepResult } from '../types';
import { gradeSentence, recordSentenceAttempt } from '../services/sentenceService';
import { groupErrors, sentenceStepResult, splitBold, stripBold, VERDICT_LABELS } from '../services/sentenceLogic';
import { aiErrorMessage } from '../services/aiClient';
import { Skeleton, SkeletonText } from '../components/ui/States';
import { ghostBtn, panel, primaryBtn, secondaryBtn } from '../components/ui/styles';

interface SentencePracticeProps {
  /** Undefined while the lesson has none yet. */
  items: SentenceItem[] | undefined;
  level: string;
  userId: string;
  lessonRecordId: string | null;
  /** Sentences are being made in the background. */
  generating?: boolean;
  /** Older lessons: make sentences now. Omitted outside a lesson. */
  onGenerate?: () => void;
  onComplete: (result: StepResult) => void;
  completeLabel: string;
  title?: string;
  subtitle?: string;
}

const chip =
  'inline-flex items-center rounded-lg border border-slate-200 px-2 py-0.5 text-caption font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300';

const VERDICT_STYLE = {
  correct: { icon: CircleCheck, cls: 'bg-tone-mint text-tone-mint-fg' },
  acceptable: { icon: CircleAlert, cls: 'bg-tone-butter text-tone-butter-fg' },
  incorrect: { icon: CircleX, cls: 'bg-tone-blush text-tone-blush-fg' },
} as const;

const Bolded: React.FC<{ text: string }> = ({ text }) => (
  <>
    {splitBold(text).map((part, i) =>
      part.bold ? (
        <strong key={i} className="font-semibold text-slate-900 underline decoration-tone-mint-accent decoration-2 underline-offset-2 dark:text-white">
          {part.text}
        </strong>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);

interface CardProps {
  index: number;
  item: SentenceItem;
  level: string;
  answer: string;
  grade?: SentenceGrade;
  pending: boolean;
  error?: string;
  onAnswer: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
}

const SentenceCard: React.FC<CardProps> = ({ index, item, level, answer, grade, pending, error, onAnswer, onSubmit, onRetry }) => {
  const [showModel, setShowModel] = useState(false);
  const inputId = `sentence-${item.id}`;
  const locked = pending || !!grade;
  const style = grade ? VERDICT_STYLE[grade.verdict] : null;
  const changed = grade ? stripBold(grade.corrected).trim() !== answer.trim() : false;

  return (
    <li className={`${panel} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-caption font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <label htmlFor={inputId} className="block font-medium text-slate-900 dark:text-white">
              {item.promptVi}
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.targetWords.map((w) => (
                <span key={w} className={chip}>
                  {w}
                </span>
              ))}
              <span className="text-caption text-slate-400">{level}</span>
            </div>
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              if (!locked && answer.trim()) onSubmit();
            }}
          >
            <textarea
              id={inputId}
              rows={2}
              value={answer}
              readOnly={locked}
              onChange={(e) => onAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!locked && answer.trim()) onSubmit();
                }
              }}
              placeholder="Viết câu tiếng Anh…"
              autoCapitalize="sentences"
              spellCheck={false}
              className="min-h-touch w-full flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-700 dark:read-only:bg-slate-900"
            />
            {!grade && (
              <button type="submit" disabled={pending || !answer.trim()} className={`${primaryBtn} sm:w-24`}>
                {pending ? 'Đang chấm' : 'Chấm'}
              </button>
            )}
          </form>

          {pending && (
            <div role="status" aria-live="polite" className="space-y-2">
              <span className="sr-only">Đang chấm…</span>
              <Skeleton className="h-6 w-28" />
              <SkeletonText lines={2} />
            </div>
          )}

          {error && !pending && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-tone-blush px-3 py-2 text-sm text-tone-blush-fg">
              <span>{error}</span>
              <button type="button" onClick={onSubmit} className="inline-flex min-h-touch items-center gap-1.5 font-semibold">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Thử lại
              </button>
            </div>
          )}

          {grade && style && (
            <div className="space-y-3" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${style.cls}`}>
                  <style.icon className="h-4 w-4" aria-hidden="true" />
                  {VERDICT_LABELS[grade.verdict]}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-caption ${
                    grade.usedTargetWords ? 'text-tone-mint-fg' : 'text-tone-blush-fg'
                  }`}
                >
                  {grade.usedTargetWords ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                  {grade.usedTargetWords ? 'Dùng đúng' : 'Chưa dùng đúng'} {item.targetWords.join(', ')}
                </span>
              </div>

              {changed && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                  <Bolded text={grade.corrected} />
                </p>
              )}
              {grade.explanationVi && <p className="text-sm text-slate-600 dark:text-slate-300">{grade.explanationVi}</p>}

              {grade.errors.length > 0 && (
                <ul className="space-y-1.5 text-sm">
                  {grade.errors.map((e, i) => (
                    <li key={i} className="text-slate-600 dark:text-slate-300">
                      {e.original && <span className="text-tone-blush-fg line-through decoration-tone-blush-accent">{e.original}</span>}
                      {e.original && <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
                      <span className="font-medium text-slate-900 dark:text-white">{e.corrected}</span>
                      {e.explanationVi && <span className="text-slate-500 dark:text-slate-400"> · {e.explanationVi}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-1">
                {grade.natural && (
                  <button type="button" onClick={() => setShowModel((v) => !v)} aria-expanded={showModel} className={ghostBtn}>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showModel ? 'rotate-180' : ''}`} aria-hidden="true" />
                    Câu mẫu
                  </button>
                )}
                {grade.verdict !== 'correct' && (
                  <button type="button" onClick={onRetry} className={ghostBtn}>
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    Viết lại
                  </button>
                )}
              </div>
              {showModel && <p className="text-sm italic text-slate-600 dark:text-slate-300">{grade.natural}</p>}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

/**
 * Luyện câu: translate Vietnamese sentences using the lesson words. Each
 * card grades on its own, so the learner keeps writing while one is graded.
 */
const SentencePractice: React.FC<SentencePracticeProps> = ({
  items,
  level,
  userId,
  lessonRecordId,
  generating = false,
  onGenerate,
  onComplete,
  completeLabel,
  title = 'Luyện câu',
  subtitle = 'Dịch sang tiếng Anh, dùng từ được gợi ý.',
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, SentenceGrade>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // "Luyện lại câu sai" narrows the list to the sentences still marked Cần sửa.
  const [onlyIds, setOnlyIds] = useState<string[] | null>(null);

  const visible = useMemo(
    () => (items ?? []).filter((it) => !onlyIds || onlyIds.includes(it.id)),
    [items, onlyIds],
  );
  const gradedCount = visible.filter((it) => grades[it.id]).length;
  const allGraded = visible.length > 0 && gradedCount === visible.length;
  const wrongIds = visible.filter((it) => grades[it.id]?.verdict === 'incorrect').map((it) => it.id);
  const groups = useMemo(() => groupErrors(visible.map((it) => grades[it.id]).filter(Boolean)), [visible, grades]);

  const submit = async (item: SentenceItem) => {
    const answer = (answers[item.id] ?? '').trim();
    if (!answer || pending[item.id]) return;
    setPending((p) => ({ ...p, [item.id]: true }));
    setErrors(({ [item.id]: _, ...rest }) => rest);
    try {
      const grade = await gradeSentence(item, answer, level);
      setGrades((g) => ({ ...g, [item.id]: grade }));
      recordSentenceAttempt({ userId, lessonRecordId, item, answer, grade });
    } catch (err) {
      console.error('[Sentence] grading failed:', err);
      setErrors((e) => ({ ...e, [item.id]: aiErrorMessage(err) }));
    } finally {
      setPending(({ [item.id]: _, ...rest }) => rest);
    }
  };

  const clear = (ids: string[]) => {
    const drop = <T,>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).filter(([k]) => !ids.includes(k)));
    setGrades(drop);
    setAnswers(drop);
  };

  const finish = () => onComplete(sentenceStepResult(items ?? [], grades));

  const header = (
    <header className="space-y-1">
      <h1 className="text-heading font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </header>
  );

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        {header}
        {generating ? (
          <div role="status" aria-live="polite" className={`${panel} space-y-3 p-5`}>
            <span className="sr-only">Đang soạn câu luyện…</span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Đang soạn câu luyện…</p>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-11 w-full" />
            <div className="flex justify-end pt-1">
              <button type="button" onClick={finish} className={ghostBtn}>
                Bỏ qua
              </button>
            </div>
          </div>
        ) : (
          <div className={`${panel} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
            <Sparkles className="h-6 w-6 text-tone-mint-fg" aria-hidden="true" />
            <p className="font-semibold text-slate-900 dark:text-white">Bài này chưa có câu luyện</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Tạo 5–8 câu tiếng Việt dùng các từ trong bài để bạn dịch sang tiếng Anh.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={finish} className={secondaryBtn}>
                Bỏ qua
              </button>
              {onGenerate && (
                <button type="button" onClick={onGenerate} className={primaryBtn}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Tạo câu luyện
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-3">
        {header}
        <span className="flex-shrink-0 text-caption tabular-nums text-slate-500 dark:text-slate-400">
          {gradedCount}/{visible.length} câu
        </span>
      </div>

      <ol className="space-y-3">
        {visible.map((item, i) => (
          <SentenceCard
            key={item.id}
            index={i}
            item={item}
            level={level}
            answer={answers[item.id] ?? ''}
            grade={grades[item.id]}
            pending={!!pending[item.id]}
            error={errors[item.id]}
            onAnswer={(value) => setAnswers((a) => ({ ...a, [item.id]: value }))}
            onSubmit={() => void submit(item)}
            onRetry={() => clear([item.id])}
          />
        ))}
      </ol>

      {allGraded && (
        <section className={`${panel} space-y-3 p-4`} aria-labelledby="sentence-summary">
          <h2 id="sentence-summary" className="text-sm font-semibold text-slate-900 dark:text-white">
            {wrongIds.length === 0 ? 'Bạn đã viết đúng tất cả các câu' : `${wrongIds.length} câu cần sửa`}
          </h2>
          {groups.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <li key={g.category} className={chip}>
                  {g.label}
                  <span className="ml-1.5 tabular-nums text-slate-400">{g.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {allGraded && wrongIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clear(wrongIds);
              setOnlyIds(wrongIds);
            }}
            className={secondaryBtn}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Luyện lại câu sai
          </button>
        )}
        <button type="button" onClick={finish} className={allGraded ? primaryBtn : secondaryBtn}>
          {completeLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default SentencePractice;
