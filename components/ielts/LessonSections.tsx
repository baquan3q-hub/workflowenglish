import React, { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import type { LessonQuiz, LessonWord, LibrarySection } from '../../data/ielts/library';
import AddToReviewButton from './AddToReviewButton';
import { ghostBtn } from '../ui/styles';

/** One worked-example question: pick an option, then see whether it was right and why. */
function QuizItem({ quiz, index }: { quiz: LessonQuiz; index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const right = picked === quiz.answer;
  const name = `quiz-${index}`;

  return (
    <div className="space-y-3 rounded-2xl border border-tone-lavender-border bg-tone-lavender/40 p-4">
      {quiz.passage && (
        <blockquote className="border-l-2 border-tone-mint-border pl-3 text-sm italic leading-relaxed text-slate-700 dark:text-slate-300">
          {quiz.passage}
        </blockquote>
      )}
      <p id={`${name}-q`} className="text-sm font-semibold text-slate-900 dark:text-white">
        {quiz.question}
      </p>
      <div role="radiogroup" aria-labelledby={`${name}-q`} className="grid gap-2 sm:grid-cols-2">
        {quiz.options.map((o, i) => {
          const isAnswer = done && i === quiz.answer;
          const isWrongPick = done && i === picked && !right;
          const look = isAnswer
            ? 'border-tone-mint-border bg-tone-mint-soft text-tone-mint-fg'
            : isWrongPick
              ? 'border-tone-blush-border bg-tone-blush-soft text-tone-blush-fg'
              : 'border-slate-200 bg-white text-slate-800 hover:border-tone-lavender-border hover:bg-tone-lavender dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={done}
              onClick={() => setPicked(i)}
              className={`press flex min-h-touch items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-default ${look}`}
            >
              {isAnswer ? (
                <Check className="h-4 w-4 flex-shrink-0" aria-hidden />
              ) : isWrongPick ? (
                <X className="h-4 w-4 flex-shrink-0" aria-hidden />
              ) : (
                <span className="h-4 w-4 flex-shrink-0 rounded-full border border-slate-300 dark:border-slate-600" aria-hidden />
              )}
              {o}
            </button>
          );
        })}
      </div>
      <div role="status">
        {done && (
          <div className="space-y-2">
            <p className={`text-sm font-semibold ${right ? 'text-tone-mint-fg' : 'text-tone-blush-fg'}`}>
              {right ? 'Chính xác.' : `Chưa đúng. Đáp án: ${quiz.options[quiz.answer]}.`}
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{quiz.explanationVi}</p>
            <button type="button" onClick={() => setPicked(null)} className={`${ghostBtn} -ml-3`}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Làm lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WordList({ words, userId }: { words: LessonWord[]; userId?: string }) {
  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {words.map((w) => (
          <li key={w.word} className="rounded-xl border border-tone-butter-border bg-tone-butter/50 p-3">
            <p className="text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">{w.word}</span>
              <span className="text-slate-600 dark:text-slate-400"> · {w.meaningVi}</span>
            </p>
            <p className="mt-1 text-caption italic leading-relaxed text-slate-600 dark:text-slate-400">{w.example}</p>
          </li>
        ))}
      </ul>
      {userId && <AddToReviewButton userId={userId} words={words} label={`Thêm ${words.length} từ vào ôn tập`} />}
    </div>
  );
}

/** Body of a Library lesson: headings, paragraphs, bullets, examples, worked questions and word lists. */
export default function LessonSections({ sections, userId }: { sections: ReadonlyArray<LibrarySection>; userId?: string }) {
  return (
    <>
      {sections.map((s, i) => (
        <section key={i} className="space-y-2">
          {s.heading && <h2 className="text-title font-semibold text-slate-900 dark:text-white">{s.heading}</h2>}
          {s.text?.map((t, j) => (
            <p key={j} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {t}
            </p>
          ))}
          {s.bullets && (
            <ul className="space-y-1.5">
              {s.bullets.map((b, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.example && (
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
              {s.example}
            </pre>
          )}
          {s.quiz && (
            <div className="space-y-3">
              {s.quiz.map((q, j) => (
                <QuizItem key={`${i}-${j}`} quiz={q} index={i * 100 + j} />
              ))}
            </div>
          )}
          {s.words && <WordList words={s.words} userId={userId} />}
        </section>
      ))}
    </>
  );
}
