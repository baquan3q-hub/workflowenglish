import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Lightbulb, Puzzle, RotateCcw, Sparkles, X } from 'lucide-react';
import type { ChatQuiz, QuizResult } from '../../services/chatLogic';

interface Props {
  quiz: ChatQuiz;
  /** Saved result, when the quiz was finished before (e.g. reopened from history). */
  result?: QuizResult;
  onFinish: (result: QuizResult) => void;
  /** Ask the mentor to explain the missed questions. */
  onReviewMistakes?: (summary: string) => void;
  onAnother?: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** A quick quiz the mentor wrote: one question at a time, instant feedback, score at the end. */
export function QuizCard({ quiz, result, onFinish, onReviewMistakes, onAnother }: Props) {
  const total = quiz.questions.length;
  const [answers, setAnswers] = useState<(number | null)[]>(() => result?.answers ?? Array(total).fill(null));
  const [index, setIndex] = useState(() => (result ? total : 0));
  const [hintOpen, setHintOpen] = useState(false);
  const finished = index >= total;
  const score = useMemo(() => answers.reduce<number>((s, a, i) => s + (a === quiz.questions[i].answer ? 1 : 0), 0), [answers, quiz]);

  const pick = (choice: number) => {
    if (answers[index] != null) return;
    setAnswers((prev) => prev.map((a, i) => (i === index ? choice : a)));
  };

  const next = () => {
    setHintOpen(false);
    const n = index + 1;
    setIndex(n);
    if (n >= total) onFinish({ answers, score, total });
  };

  const restart = () => {
    setAnswers(Array(total).fill(null));
    setIndex(0);
  };

  const missed = quiz.questions
    .map((q, i) => ({ q, a: answers[i] }))
    .filter(({ q, a }) => a !== q.answer);

  const header = (
    <div className="flex items-center gap-2 border-b border-tone-aqua-border px-3.5 py-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-tone-aqua-soft text-tone-aqua-fg">
        <Puzzle className="h-4 w-4" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900 dark:text-white">{quiz.title}</p>
      <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{finished ? `${total} câu` : `${index + 1}/${total}`}</span>
    </div>
  );

  if (finished) {
    const pct = Math.round((score / total) * 100);
    const verdict = pct >= 80 ? 'Xuất sắc! 🎉' : pct >= 50 ? 'Khá tốt, cố thêm chút nữa 💪' : 'Cần ôn lại, bạn làm được mà 🌱';
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-tone-aqua-border bg-white dark:bg-slate-900">
        {header}
        <div className="px-3.5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-tone-aqua-soft text-tone-aqua-fg">
              <span className="text-lg font-bold leading-none">{score}/{total}</span>
              <span className="text-[10px]">{pct}%</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{verdict}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">{missed.length ? `Sai ${missed.length} câu` : 'Không sai câu nào'}</p>
            </div>
          </div>
          {missed.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {missed.slice(0, 5).map(({ q, a }, i) => (
                <li key={i} className="rounded-lg bg-tone-blush/70 px-2.5 py-1.5 text-[12px] text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{q.q}</span>
                  <br />
                  <span className="text-tone-mint-fg">✓ {q.options[q.answer]}</span>
                  {a != null && <span className="text-tone-blush-fg"> · bạn chọn {q.options[a]}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={restart} className="press inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Làm lại
            </button>
            {missed.length > 0 && onReviewMistakes && (
              <button
                type="button"
                onClick={() => onReviewMistakes(missed.map(({ q, a }) => `- ${q.q} → đúng: ${q.options[q.answer]}${a != null ? `; mình chọn: ${q.options[a]}` : ''}`).join('\n'))}
                className="press inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-tone-lavender-soft px-3 text-[12px] font-semibold text-tone-lavender-fg hover:bg-tone-lavender-border"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Giải thích câu sai
              </button>
            )}
            {onAnother && (
              <button type="button" onClick={onAnother} className="press inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-tone-aqua-soft px-3 text-[12px] font-semibold text-tone-aqua-fg hover:bg-tone-aqua-border">
                <Puzzle className="h-3.5 w-3.5" aria-hidden /> Quiz mới
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const q = quiz.questions[index];
  const chosen = answers[index];
  const answered = chosen != null;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-tone-aqua-border bg-white dark:bg-slate-900">
      {header}
      <div className="h-1 bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-tone-aqua-accent transition-[width] duration-300" style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>
      <div className="px-3.5 py-3">
        {q.context && (
          <p className="mb-2 border-l-2 border-tone-aqua-accent pl-2.5 text-[12px] italic leading-relaxed text-slate-600 dark:text-slate-300">“{q.context}”</p>
        )}
        <p className="text-[13.5px] font-medium leading-relaxed text-slate-900 dark:text-white">{q.q}</p>
        {q.hint && !answered && (
          hintOpen ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-tone-butter px-2.5 py-1.5 text-[12px] text-tone-butter-fg">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden /> {q.hint}
            </p>
          ) : (
            <button type="button" onClick={() => setHintOpen(true)} className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-tone-butter-fg hover:underline">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Xem gợi ý
            </button>
          )
        )}
        <div className="mt-2.5 space-y-1.5" role="radiogroup" aria-label="Các lựa chọn">
          {q.options.map((opt, i) => {
            const isRight = i === q.answer;
            const isChosen = i === chosen;
            const state = !answered
              ? 'border-slate-200 hover:border-tone-aqua-border hover:bg-tone-aqua dark:border-slate-700'
              : isRight
                ? 'border-tone-mint-border bg-tone-mint text-tone-mint-fg'
                : isChosen
                  ? 'border-tone-blush-border bg-tone-blush text-tone-blush-fg'
                  : 'border-slate-200 opacity-60 dark:border-slate-700';
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={answered}
                onClick={() => pick(i)}
                className={`press flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${state}`}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {answered && isRight ? <Check className="h-3.5 w-3.5 text-tone-mint-fg" /> : answered && isChosen ? <X className="h-3.5 w-3.5 text-tone-blush-fg" /> : LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="anim-chat-msg-in mt-2.5 flex items-start gap-2">
            <p className={`flex-1 rounded-lg px-2.5 py-2 text-[12px] leading-relaxed ${chosen === q.answer ? 'bg-tone-mint text-tone-mint-fg' : 'bg-tone-butter text-tone-butter-fg'}`}>
              <strong>{chosen === q.answer ? 'Chính xác!' : 'Chưa đúng.'}</strong> {q.explain}
            </p>
            <button type="button" onClick={next} autoFocus className="press inline-flex min-h-[36px] flex-shrink-0 items-center gap-1 rounded-lg bg-tone-aqua-soft px-3 text-[12px] font-semibold text-tone-aqua-fg hover:bg-tone-aqua-border">
              {index + 1 < total ? 'Tiếp' : 'Xem điểm'} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizCard;
