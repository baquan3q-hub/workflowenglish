/**
 * Reading result: band, score and time per passage, the kinds of mistakes,
 * then every question with its answer, the evidence and how it was paraphrased.
 */
import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock, Quote, RotateCcw, TriangleAlert, X } from 'lucide-react';
import type { ReadingAnswers, ReadingGroup, ReadingTest } from '../data/ielts/reading';
import {
  errorBreakdown,
  overTime,
  READING_STATUS_LABELS,
  readingAnswerLabel,
  readingQuestionContext,
  scorePassages,
  sessionPassages,
  type ReadingAnswerStatus,
  type ReadingMode,
  type ReadingQuestionResult,
} from '../services/readingLogic';
import { Segmented } from '../components/ui/Segmented';
import { toneClasses } from '../components/ui/palette';
import { ghostBtn, panel, primaryBtn, secondaryBtn } from '../components/ui/styles';
import { clock, READING_STATUS_TONE } from '../components/ielts/reading/readingStatus';

interface Props {
  test: ReadingTest;
  passageIds: string[];
  mode: ReadingMode;
  answers: ReadingAnswers;
  /** Seconds spent per passage id. */
  seconds: Record<string, number>;
  onRetry: () => void;
  onBack: () => void;
}

/** What a near miss means for the learner, shown under the answer. */
const STATUS_TIPS: Partial<Record<ReadingAnswerStatus, string>> = {
  spelling: 'Gần đúng nhưng sai chính tả. Chép đúng từ trong bài, vì bài thi thật tính câu này sai.',
  plural: 'Thiếu hoặc thừa -s. Chép đúng dạng từ như trong bài đọc.',
  over_limit: 'Đáp án vượt giới hạn từ của đề nên bị tính sai dù có chứa từ đúng.',
  ng_confusion: 'NOT GIVEN là khi bài không nói tới; FALSE/NO là khi bài nói ngược lại. Đọc kỹ câu bằng chứng bên dưới.',
};

const ERROR_ORDER: ReadingAnswerStatus[] = ['wrong', 'ng_confusion', 'spelling', 'plural', 'over_limit', 'blank'];

type Filter = 'wrong' | 'all';

function ResultCard({ r, group }: { r: ReadingQuestionResult; group: ReadingGroup }) {
  const ok = r.status === 'correct';
  const tone = toneClasses(READING_STATUS_TONE[r.status]);
  const context = readingQuestionContext(group, r.question);
  const tip = STATUS_TIPS[r.status];
  const p = r.question.paraphrase;
  return (
    <li className={`${panel} p-4`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-7 min-w-7 flex-shrink-0 items-center justify-center rounded-lg px-1 text-caption font-bold tabular-nums ${tone.tile}`}>
          {r.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-semibold ${tone.tile}`}>
              {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
              {READING_STATUS_LABELS[r.status]}
            </span>
            <span className="text-caption text-slate-600 dark:text-slate-400">
              Passage {r.part} · Đoạn {r.question.paragraph}
            </span>
          </div>
          {context && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{context}</p>}

          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-caption text-slate-600 dark:text-slate-400">Bạn trả lời</dt>
              <dd className={`font-medium ${ok ? 'text-tone-mint-fg' : 'text-slate-900 dark:text-white'}`}>
                {r.given ? readingAnswerLabel(group, r.question, r.given) : <span className="italic text-slate-500">Bỏ trống</span>}
              </dd>
            </div>
            {!ok && (
              <div>
                <dt className="text-caption text-slate-600 dark:text-slate-400">Đáp án</dt>
                <dd className="font-medium text-tone-mint-fg">{readingAnswerLabel(group, r.question, r.expected)}</dd>
              </div>
            )}
          </dl>
          {tip && <p className="mt-2 text-caption text-tone-butter-fg">{tip}</p>}

          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{r.question.explanationVi}</p>

          <blockquote className="mt-3 flex gap-2 rounded-xl bg-tone-mint p-3 text-sm text-slate-800 dark:text-slate-200">
            <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-mint-fg" aria-hidden />
            <span>{r.question.evidence}</span>
          </blockquote>
          {r.question.distractor && (
            <p className="mt-2 flex gap-2 text-sm text-slate-700 dark:text-slate-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-blush-fg" aria-hidden />
              <span>
                <span className="font-semibold">Bẫy: </span>
                {r.question.distractor}
              </span>
            </p>
          )}
          {p && (
            <p className="mt-2 text-caption text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Đề ↔ Bài đọc: </span>
              <span className="italic">{p.question}</span> ↔ <span className="italic">{p.passage}</span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function IeltsReadingResult({ test, passageIds, mode, answers, seconds, onRetry, onBack }: Props) {
  const passages = useMemo(() => sessionPassages(test, passageIds), [test, passageIds]);
  const score = useMemo(() => scorePassages(passages, answers), [passages, answers]);
  const groups = useMemo(() => new Map(passages.flatMap((p) => p.groups.map((g) => [g.id, g] as const))), [passages]);
  const errors = errorBreakdown(score.results);
  const wrongCount = score.total - score.score;
  const [filter, setFilter] = useState<Filter>(wrongCount > 0 ? 'wrong' : 'all');
  const shown = filter === 'wrong' ? score.results.filter((r) => r.status !== 'correct') : score.results;
  const title = passages.length === 1 && test.passages.length > 1 ? `${test.title} · Passage ${passages[0].part}` : test.title;
  const totalSeconds = passages.reduce((n, p) => n + (seconds[p.id] ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10 anim-fade-up">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Reading
      </button>

      <header>
        <p className="text-caption font-medium text-slate-600 dark:text-slate-400">Kết quả · {mode === 'exam' ? 'Thi thử' : 'Luyện tập'}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{title}</h1>
      </header>

      <section className={`${panel} p-4 sm:p-5`} aria-label="Điểm">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-caption font-medium text-slate-600 dark:text-slate-400">{score.estimated ? 'Band ước lượng' : 'Band'}</p>
            <p className="text-4xl font-bold tabular-nums text-tone-mint-fg">{score.band.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-caption font-medium text-slate-600 dark:text-slate-400">Số câu đúng</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {score.score}
              <span className="text-base font-semibold text-slate-500">/{score.total}</span>
            </p>
          </div>
          <div>
            <p className="text-caption font-medium text-slate-600 dark:text-slate-400">Thời gian</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{clock(totalSeconds)}</p>
          </div>
        </div>
        <p className="mt-2 text-caption text-slate-600 dark:text-slate-400">
          {score.estimated
            ? `Band ước lượng: quy từ ${score.total} câu sang thang 40 câu. Làm cả đề để có band chính xác hơn.`
            : 'Quy đổi theo bảng điểm Academic Reading 40 câu.'}
        </p>

        <ul className="mt-4 space-y-3">
          {score.byPassage.map((p) => {
            const passage = passages.find((x) => x.id === p.passageId)!;
            const spent = seconds[p.passageId] ?? 0;
            const over = overTime(spent, passage);
            return (
              <li key={p.passageId} className="text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-20 flex-shrink-0 font-medium text-slate-700 dark:text-slate-300">Passage {p.part}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className="block h-full rounded-full bg-tone-mint-fg" style={{ width: `${p.total ? (p.score / p.total) * 100 : 0}%` }} />
                  </span>
                  <span className="w-12 text-right tabular-nums text-slate-600 dark:text-slate-400">
                    {p.score}/{p.total}
                  </span>
                </div>
                <p className={`mt-1 flex items-center gap-1.5 pl-[5.75rem] text-caption ${over ? 'text-tone-butter-fg' : 'text-slate-600 dark:text-slate-400'}`}>
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {clock(spent)} / gợi ý {passage.suggestedMinutes} phút{over ? ` · quá ${clock(over)}` : ''}
                </p>
              </li>
            );
          })}
        </ul>

        {wrongCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {ERROR_ORDER.filter((s) => errors[s]).map((s) => (
              <span key={s} className={`inline-flex items-center rounded-md px-2 py-1 text-caption font-medium ${toneClasses(READING_STATUS_TONE[s]).tile}`}>
                {READING_STATUS_LABELS[s]}: {errors[s]}
              </span>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reading-review">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="reading-review" className="text-title font-semibold text-slate-900 dark:text-white">
            Xem lại từng câu
          </h2>
          <Segmented
            label="Lọc câu"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { value: 'wrong', label: `Câu sai (${wrongCount})` },
              { value: 'all', label: 'Tất cả' },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <p className={`${panel} mt-3 p-4 text-sm text-slate-600 dark:text-slate-400`}>Bạn đúng hết. Thử chế độ Thi thử hoặc một đề khác.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {shown.map((r) => {
              const g = groups.get(r.groupId);
              return g ? <ResultCard key={r.number} r={r} group={g} /> : null;
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onRetry} className={primaryBtn}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Làm lại
        </button>
        <button type="button" onClick={onBack} className={secondaryBtn}>
          Về Reading
        </button>
      </div>
    </div>
  );
}
