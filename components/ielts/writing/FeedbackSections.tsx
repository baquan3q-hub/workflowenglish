/**
 * Writing feedback 2.0 blocks: the essay by paragraph, the Task 1 checklist,
 * corrections grouped by error label and the comparison with the last try.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Minus, X } from 'lucide-react';
import type { IeltsAiFeedback, IeltsSentenceCorrection } from '../../../types';
import {
  compareBands,
  diffStats,
  diffWords,
  formatDelta,
  groupCorrections,
  paragraphNotes,
  splitEssayParagraphs,
  task1Checks,
} from '../../../services/writingFeedbackLogic';

const heading = 'text-sm font-semibold text-slate-900 dark:text-white';

/** The submitted essay; paragraphs with a note open it on tap. */
export function EssayByParagraph({ answer, feedback }: { answer: string; feedback: IeltsAiFeedback }) {
  const paragraphs = useMemo(() => splitEssayParagraphs(answer), [answer]);
  const notes = useMemo(() => paragraphNotes(feedback, paragraphs.length), [feedback, paragraphs.length]);
  const [open, setOpen] = useState<number | null>(notes.size ? 0 : null);

  return (
    <div className="space-y-3">
      <div>
        <h3 className={heading}>Bài viết của bạn</h3>
        {notes.size > 0 && <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">Bấm vào một đoạn để xem nhận xét cho đoạn đó.</p>}
      </div>
      <ol className="space-y-2">
        {paragraphs.map((text, i) => {
          const note = notes.get(i);
          if (!note) {
            return (
              <li key={i} className="px-3 py-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {text}
              </li>
            );
          }
          const isOpen = open === i;
          return (
            <li key={i} className={`rounded-xl border ${isOpen ? 'border-slate-300 dark:border-slate-600' : 'border-transparent'}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="mb-1 flex items-center gap-2 text-caption font-semibold text-slate-500 dark:text-slate-400">
                  {note.role}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </span>
                <span className="block text-sm leading-relaxed text-slate-700 dark:text-slate-300">{text}</span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-slate-200 px-3 py-3 text-sm leading-relaxed dark:border-slate-700">
                  <p className="text-slate-700 dark:text-slate-300">{note.comment}</p>
                  {note.suggestion && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                      <span className="font-semibold">Sửa thế này: </span>
                      {note.suggestion}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Task1Checklist({ feedback }: { feedback: IeltsAiFeedback }) {
  const checks = task1Checks(feedback);
  if (!checks.length) return null;
  const passed = checks.filter((c) => c.passed).length;
  return (
    <div className="space-y-3">
      <h3 className={heading}>
        Checklist Task 1 <span className="font-normal tabular-nums text-slate-500 dark:text-slate-400">· {passed}/{checks.length}</span>
      </h3>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2.5 text-sm leading-relaxed">
            <span
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                c.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
              }`}
            >
              {c.passed ? <Check className="h-3.5 w-3.5" aria-label="Đạt" /> : <X className="h-3.5 w-3.5" aria-label="Chưa đạt" />}
            </span>
            <span>
              <span className="font-medium text-slate-900 dark:text-white">{c.label}</span>
              {c.note && <span className="block text-caption text-slate-600 dark:text-slate-400">{c.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CorrectionCard({ c }: { c: IeltsSentenceCorrection }) {
  return (
    <li className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800/60">
      <p className="flex gap-2 text-rose-700 dark:text-rose-300">
        <X className="mt-1 h-3.5 w-3.5 flex-shrink-0" aria-label="Câu gốc" />
        <span className="line-through decoration-rose-400/70">{c.original}</span>
      </p>
      <p className="flex gap-2 font-medium text-emerald-700 dark:text-emerald-300">
        <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0" aria-label="Câu sửa" />
        <span>{c.corrected}</span>
      </p>
      <p className="pl-5 text-caption text-slate-600 dark:text-slate-400">{c.explanation}</p>
    </li>
  );
}

/** Corrections by error label, with a count summary on top. */
export function CorrectionsByCategory({ corrections }: { corrections: IeltsSentenceCorrection[] }) {
  const groups = useMemo(() => groupCorrections(corrections), [corrections]);
  if (!corrections.length) return null;
  const labelled = groups.some((g) => g.category);

  return (
    <div className="space-y-4">
      <h3 className={heading}>Sửa lỗi câu ({corrections.length})</h3>
      {labelled && (
        <ul className="flex flex-wrap gap-2" aria-label="Lỗi theo loại">
          {groups.map((g) => (
            <li key={g.label} className="rounded-full border border-slate-200 px-3 py-1 text-caption font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
              {g.label} <span className="tabular-nums text-slate-500 dark:text-slate-400">{g.corrections.length}</span>
            </li>
          ))}
        </ul>
      )}
      {labelled ? (
        groups.map((g) => (
          <div key={g.label} className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{g.label}</p>
              {g.category && <p className="text-caption text-slate-500 dark:text-slate-400">{g.category.hintVi}</p>}
            </div>
            <ul className="space-y-2">
              {g.corrections.map((c, i) => (
                <CorrectionCard key={i} c={c} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul className="space-y-2">
          {corrections.map((c, i) => (
            <CorrectionCard key={i} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Delta({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-slate-400">–</span>;
  const tone =
    value > 0 ? 'text-emerald-700 dark:text-emerald-300' : value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400';
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {formatDelta(value)}
    </span>
  );
}

/** Band changes against the previous attempt and a word diff of the two essays. */
export function RewriteComparison({
  previous,
  current,
  answer,
}: {
  previous: { answer: string; feedback: IeltsAiFeedback };
  current: IeltsAiFeedback;
  answer: string;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const bands = compareBands(previous.feedback, current);
  const diff = useMemo(() => (showDiff ? diffWords(previous.answer, answer) : []), [showDiff, previous.answer, answer]);
  const stats = diffStats(diff);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={heading}>So với lần viết trước</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Band {previous.feedback.estimatedBand.toFixed(1)} → {current.estimatedBand.toFixed(1)} <Delta value={bands.overall} />
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption">
        {current.criterionScores.map((c, i) => (
          <div key={c.name} className="min-w-0">
            <dt className="truncate text-slate-500 dark:text-slate-400" title={c.name}>
              {c.nameVi || c.name}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{c.score.toFixed(1)}</span>
              <Delta value={bands.criteria[i]} />
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => setShowDiff(!showDiff)}
        aria-expanded={showDiff}
        className="inline-flex min-h-touch items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showDiff ? 'rotate-180' : ''}`} aria-hidden="true" />
        {showDiff ? 'Ẩn thay đổi' : 'Xem bạn đã sửa gì'}
      </button>
      {showDiff && (
        <div className="space-y-2">
          <p className="flex flex-wrap gap-3 text-caption text-slate-600 dark:text-slate-400">
            <span>
              <span className="rounded bg-emerald-100 px-1 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100">Thêm</span>{' '}
              <span className="tabular-nums">{stats.added} từ</span>
            </span>
            <span>
              <span className="rounded bg-rose-100 px-1 text-rose-900 line-through dark:bg-rose-500/20 dark:text-rose-100">Bỏ</span>{' '}
              <span className="tabular-nums">{stats.removed} từ</span>
            </span>
          </p>
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            {diff.map((t, i) =>
              t.text === '\n' ? (
                <span key={i} className="block h-3" aria-hidden="true" />
              ) : t.kind === 'same' ? (
                <span key={i}>{t.text} </span>
              ) : t.kind === 'added' ? (
                <React.Fragment key={i}>
                  <ins className="rounded bg-emerald-100 px-0.5 text-emerald-900 no-underline dark:bg-emerald-500/20 dark:text-emerald-100">{t.text}</ins>{' '}
                </React.Fragment>
              ) : (
                <React.Fragment key={i}>
                  <del className="rounded bg-rose-100 px-0.5 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100">{t.text}</del>{' '}
                </React.Fragment>
              ),
            )}
          </p>
        </div>
      )}
    </div>
  );
}
