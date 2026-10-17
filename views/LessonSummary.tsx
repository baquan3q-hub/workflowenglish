import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Home, RotateCcw } from 'lucide-react';
import type { GeneratedLesson, WordMasteryRecord } from '../types';
import { getWordsByWords } from '../services/vocabLibraryService';
import { nextReviewLabel, summarizeLesson, type StepResult } from '../services/lessonSummaryLogic';
import { Skeleton } from '../components/ui/States';

interface LessonSummaryProps {
  lesson: GeneratedLesson;
  userId: string;
  topic?: string;
  onHome: () => void;
  /** Start a review session made of these word_mastery ids. */
  onReviewWords: (ids: string[]) => void;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

const scoreText = (r: StepResult | null) => (r ? `${r.score}/${r.total}` : '—');

/**
 * End of a lesson: what stuck, what to review, and when the words come back.
 * Records are read fresh so ratings made during the lesson are counted.
 */
const LessonSummary: React.FC<LessonSummaryProps> = ({ lesson, userId, topic, onHome, onReviewWords }) => {
  const words = useMemo(() => lesson.flashcards.map((c) => c.word), [lesson.flashcards]);
  const [records, setRecords] = useState<WordMasteryRecord[] | null>(null);

  useEffect(() => {
    let alive = true;
    // Quiz and fill-blank ratings are written fire-and-forget; give them a moment.
    const t = setTimeout(() => {
      getWordsByWords(userId, words)
        .then((rows) => alive && setRecords(rows))
        .catch((err) => {
          console.warn('[LessonSummary] could not load word records:', err);
          if (alive) setRecords([]);
        });
    }, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [userId, words]);

  const summary = useMemo(
    () => summarizeLesson(words, records ?? [], lesson.progress, new Date()),
    [words, records, lesson.progress],
  );
  const reviewIds = useMemo(() => {
    const need = new Set(summary.needReview);
    return (records ?? []).filter((r) => need.has(r.word)).map((r) => r.id);
  }, [records, summary.needReview]);

  const loading = records === null;
  const stats = [
    { label: 'Đã nhớ', value: loading ? null : `${summary.remembered}/${summary.total}` },
    { label: 'Trắc nghiệm', value: scoreText(summary.quiz) },
    { label: 'Điền từ', value: scoreText(summary.fillBlank) },
    { label: 'Luyện câu', value: scoreText(summary.sentences) },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-fade-in">
      <header className="space-y-3 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-heading font-bold text-slate-900 dark:text-white">Hoàn thành bài học</h1>
          {topic && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{topic} · {summary.total} từ</p>}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-3 py-4 text-center dark:bg-slate-900">
            <dt className="text-caption text-slate-500 dark:text-slate-400">{s.label}</dt>
            <dd className="mt-1 text-title font-semibold tabular-nums text-slate-900 dark:text-white">
              {s.value ?? <Skeleton className="mx-auto h-6 w-12" />}
            </dd>
          </div>
        ))}
      </dl>

      {summary.mistakes.length > 0 && (
        <section className={`${panel} p-4`} aria-labelledby="summary-mistakes">
          <h2 id="summary-mistakes" className="text-sm font-semibold text-slate-900 dark:text-white">
            Hay nhầm nhất
          </h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {summary.mistakes.map((m) => (
              <li key={m.word} className="flex items-baseline justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">{m.word}</p>
                  {m.meaning && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{m.meaning}</p>}
                </div>
                <span className="flex-shrink-0 text-caption tabular-nums text-rose-600 dark:text-rose-300">
                  Sai {m.misses} lần
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.nextReview && (
        <p className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {nextReviewLabel(summary.nextReview)}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={onHome} className={secondaryBtn}>
          <Home className="h-4 w-4" aria-hidden="true" />
          Về trang chủ
        </button>
        {reviewIds.length > 0 && (
          <button type="button" onClick={() => onReviewWords(reviewIds)} className={primaryBtn}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Ôn ngay {reviewIds.length} từ sai
          </button>
        )}
      </div>
    </div>
  );
};

export default LessonSummary;
