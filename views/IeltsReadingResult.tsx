/**
 * Reading result: band, score and time per passage, accuracy by question type
 * and by skill, then every question with its answer, the evidence and how it
 * was paraphrased. Choosing a question marks its evidence (mint) and its trap
 * (blush) in the passage beside the list, or under the card on small screens.
 */
import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock, Quote, RotateCcw, ScanSearch, Target, TriangleAlert, X } from 'lucide-react';
import type { ReadingAnswers, ReadingGroup, ReadingPassage, ReadingTest } from '../data/ielts/reading';
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
import {
  accuracyBy,
  READING_SKILL_LABELS,
  reviewMarks,
  TFNG_VERDICT_LABELS,
  tfngVerdict,
  type AccuracyRow,
  type TfngVerdict,
} from '../services/readingReview';
import { GROUP_KINDS } from '../components/ielts/questions/parts';
import { readingGroupKind, type GroupKind } from '../components/ielts/questions/questionLogic';
import ReviewPassage, { MarkLegend } from '../components/ielts/reading/ReviewPassage';
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

/** A bar's tone for a share of correct answers. */
const shareTone = (share: number) => (share >= 0.8 ? 'mint' : share >= 0.5 ? 'butter' : 'blush');

function AccuracyList<K extends string>({ title, rows, label }: { title: string; rows: AccuracyRow<K>[]; label: (k: K) => string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => {
          const pct = Math.round((r.correct / r.total) * 100);
          return (
            <li key={r.key} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{label(r.key)}</span>
                <span className="flex-shrink-0 text-caption tabular-nums text-slate-600 dark:text-slate-400">
                  {r.correct}/{r.total} · {pct}%
                </span>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span className={`block h-full rounded-full ${toneClasses(shareTone(r.correct / r.total)).bar}`} style={{ width: `${pct}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Compared with the passage": what the right answer says, and what the learner's answer claimed. */
function TfngBox({ given, expected }: { given: string; expected: string }) {
  const right = tfngVerdict(expected);
  const chosen = given ? tfngVerdict(given) : null;
  if (!right) return null;
  return (
    <div className="mt-3 rounded-xl border border-tone-sky-border bg-tone-sky p-3">
      <p className="text-caption font-semibold text-tone-sky-fg">So với bài đọc</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {(Object.keys(TFNG_VERDICT_LABELS) as TfngVerdict[]).map((v) => {
          const cls =
            v === right
              ? 'border-tone-mint-border bg-tone-mint-soft font-semibold text-tone-mint-fg'
              : v === chosen
                ? 'border-tone-blush-border bg-tone-blush-soft text-tone-blush-fg line-through'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400';
          return (
            <li key={v} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-caption ${cls}`}>
              {v === right && <Check className="h-3.5 w-3.5" aria-hidden />}
              {TFNG_VERDICT_LABELS[v]}
              {v === right && <span className="sr-only"> (đáp án)</span>}
              {v !== right && v === chosen && <span className="sr-only"> (bạn chọn)</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface CardProps {
  r: ReadingQuestionResult;
  group: ReadingGroup;
  passage: ReadingPassage;
  selected: boolean;
  onSelect: () => void;
}

function ResultCard({ r, group, passage, selected, onSelect }: CardProps) {
  const ok = r.status === 'correct';
  const tone = toneClasses(READING_STATUS_TONE[r.status]);
  const context = readingQuestionContext(group, r.question);
  const tip = STATUS_TIPS[r.status];
  const p = r.question.paraphrase;
  const marks = useMemo(() => reviewMarks(passage, r.question), [passage, r.question]);
  const excerpt = useMemo(() => [...new Set([r.question.paragraph, ...Object.keys(marks)])], [r.question.paragraph, marks]);
  // Small screens show the excerpt inside the card, opened and closed by the button.
  const [open, setOpen] = useState(false);
  return (
    <li className={`${panel} p-4 transition-shadow ${selected ? 'ring-2 ring-tone-mint-border' : ''}`}>
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
          {group.type === 'tfng' && <TfngBox given={r.given} expected={r.expected} />}

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
            <div className="mt-3 rounded-xl border border-tone-lavender-border bg-tone-lavender p-3 text-sm">
              <p className="text-caption font-semibold text-tone-lavender-fg">Paraphrase</p>
              <p className="mt-1 text-slate-700 dark:text-slate-300">
                <span className="text-caption text-slate-600 dark:text-slate-400">Đề: </span>
                <span className="italic">{p.question}</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="text-caption text-slate-600 dark:text-slate-400">Bài đọc: </span>
                <span className="italic">{p.passage}</span>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onSelect();
              setOpen((o) => !o);
            }}
            aria-pressed={selected}
            className={`${ghostBtn} -ml-3 mt-2`}
          >
            <ScanSearch className="h-4 w-4 text-tone-mint-fg" aria-hidden /> Xem trong bài
          </button>
          {open && (
            <div className="mt-2 space-y-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800 lg:hidden">
              <MarkLegend />
              <ReviewPassage passage={passage} marks={marks} focus={r.question.paragraph} only={excerpt} />
            </div>
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
  const [picked, setPicked] = useState<number | null>(null);
  const selected = shown.find((r) => r.number === picked) ?? shown[0];
  const title = passages.length === 1 && test.passages.length > 1 ? `${test.title} · Passage ${passages[0].part}` : test.title;
  const totalSeconds = passages.reduce((n, p) => n + (seconds[p.id] ?? 0), 0);

  const byKind = useMemo(
    () => accuracyBy<GroupKind>(score.results, (r) => readingGroupKind(groups.get(r.groupId)!)),
    [score.results, groups],
  );
  const bySkill = useMemo(() => accuracyBy(score.results, (r) => r.question.skill), [score.results]);
  const tfngCount = score.results.filter((r) => r.groupType === 'tfng').length;
  const ngCount = errors.ng_confusion ?? 0;
  const weakest = byKind.find((r) => r.total >= 2 && r.correct / r.total < 0.6);

  const selectedPassage = selected && passages.find((p) => p.id === selected.passageId);
  const selectedMarks = useMemo(
    () => (selected && selectedPassage ? reviewMarks(selectedPassage, selected.question) : {}),
    [selected, selectedPassage],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10 anim-fade-up lg:max-w-6xl">
      <button type="button" onClick={onBack} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Reading
      </button>

      <header>
        <p className="text-caption font-medium text-slate-600 dark:text-slate-400">Kết quả · {mode === 'exam' ? 'Thi thử' : 'Luyện tập'}</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{title}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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

        <section className={`${panel} space-y-5 p-4 sm:p-5`} aria-labelledby="reading-analysis">
          <h2 id="reading-analysis" className="text-title font-semibold text-slate-900 dark:text-white">
            Phân tích
          </h2>
          <AccuracyList title="Theo dạng câu hỏi" rows={byKind} label={(k) => GROUP_KINDS[k].label} />
          <AccuracyList title="Theo kỹ năng" rows={bySkill} label={(k) => READING_SKILL_LABELS[k]} />
          {(tfngCount > 0 || weakest) && (
            <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              {tfngCount > 0 && (
                <li className="flex gap-2">
                  <TriangleAlert className={`mt-0.5 h-4 w-4 flex-shrink-0 ${ngCount ? 'text-tone-blush-fg' : 'text-tone-mint-fg'}`} aria-hidden />
                  <span>
                    Nhầm NOT GIVEN: <span className="font-semibold">{ngCount}</span> trong {tfngCount} câu TRUE/FALSE, YES/NO.
                  </span>
                </li>
              )}
              {weakest && (
                <li className="flex gap-2">
                  <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-butter-fg" aria-hidden />
                  <span>
                    Nên luyện thêm: <span className="font-semibold">{GROUP_KINDS[weakest.key].label}</span>
                  </span>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

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
          <div className="mt-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <ul className="space-y-3">
              {shown.map((r) => {
                const g = groups.get(r.groupId);
                const passage = passages.find((x) => x.id === r.passageId);
                return g && passage ? (
                  <ResultCard
                    key={r.number}
                    r={r}
                    group={g}
                    passage={passage}
                    selected={r.number === selected?.number}
                    onSelect={() => setPicked(r.number)}
                  />
                ) : null;
              })}
            </ul>
            {selected && selectedPassage && (
              <aside
                aria-label={`Bài đọc, câu ${selected.number}`}
                className={`${panel} hidden lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100dvh-6rem)] lg:flex-col`}
              >
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-caption font-medium text-slate-600 dark:text-slate-400">
                    Câu {selected.number} · Passage {selectedPassage.part} · Đoạn {selected.question.paragraph}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{selectedPassage.title}</h3>
                  <div className="mt-2">
                    <MarkLegend />
                  </div>
                </div>
                <ReviewPassage
                  passage={selectedPassage}
                  marks={selectedMarks}
                  focus={selected.question.paragraph}
                  focusKey={selected.number}
                  className="min-h-0 flex-1 overflow-y-auto p-3"
                />
              </aside>
            )}
          </div>
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
