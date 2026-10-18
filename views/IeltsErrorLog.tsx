import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CircleAlert,
  CircleCheck,
  CircleX,
  Dumbbell,
  Info,
  Minus,
  NotebookPen,
  PenLine,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { IeltsAttempt, SentenceGrade, SentenceItem } from '../types';
import { getIeltsAttempts } from '../services/ieltsAttemptService';
import { gradeSentence } from '../services/sentenceService';
import { aiErrorMessage } from '../services/aiClient';
import { splitBold, VERDICT_LABELS } from '../services/sentenceLogic';
import { diffWords } from '../services/writingFeedbackLogic';
import {
  isCorrectionFixed,
  lessonFor,
  summarizeErrors,
  type ErrorSkill,
  type ErrorSummary,
  type LoggedError,
} from '../services/ieltsErrorLogic';
import { drillsFor } from '../data/ielts/errorDrills';
import { Segmented } from '../components/ui/Segmented';
import { ErrorState, Skeleton } from '../components/ui/States';

interface Props {
  userId: string;
  onBack: () => void;
  onOpenLibrary: (lessonId: string) => void;
  /** Swapped out in previews. */
  loadAttempts?: (userId: string) => Promise<IeltsAttempt[]>;
  grade?: typeof gradeSentence;
}

type Filter = 'all' | ErrorSkill;

/** Recent attempts read per skill. */
const ATTEMPT_LIMIT = 30;
const DRILL_LEVEL = 'B2';

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const field =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const SKILL_LABEL: Record<ErrorSkill, string> = { writing: 'Writing', speaking: 'Speaking' };
const OTHER_HINT = 'Lỗi trong các bài chấm trước khi có nhãn, hoặc chưa xếp được vào nhóm nào.';

const VERDICT_STYLE = {
  correct: { icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  acceptable: { icon: CircleAlert, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  incorrect: { icon: CircleX, cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
} as const;

async function loadRecent(userId: string): Promise<IeltsAttempt[]> {
  const lists = await Promise.all((['writing', 'speaking'] as const).map((s) => getIeltsAttempts(userId, s, ATTEMPT_LIMIT)));
  return lists.flat();
}

function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()}/${d.getMonth() + 1}`;
}

const TrendBadge: React.FC<{ trend: ErrorSummary['trend'] }> = ({ trend }) => {
  if (!trend) return null;
  const view = {
    up: { icon: TrendingUp, text: 'Gặp nhiều hơn gần đây', cls: 'text-rose-700 dark:text-rose-300' },
    down: { icon: TrendingDown, text: 'Đang giảm', cls: 'text-emerald-700 dark:text-emerald-300' },
    flat: { icon: Minus, text: 'Chưa đổi', cls: 'text-slate-500 dark:text-slate-400' },
  }[trend];
  const Icon = view.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-caption font-medium ${view.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {view.text}
    </span>
  );
};

const Example: React.FC<{ e: LoggedError }> = ({ e }) => (
  <li className="space-y-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
    <p className="text-sm text-rose-700 line-through decoration-rose-300 dark:text-rose-300 dark:decoration-rose-700">{e.original}</p>
    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{e.corrected}</p>
    <p className="text-caption text-slate-500 dark:text-slate-400">
      {SKILL_LABEL[e.skill]}
      {shortDate(e.createdAt) && ` · ${shortDate(e.createdAt)}`}
    </p>
  </li>
);

const CategoryCard: React.FC<{ summary: ErrorSummary; onLesson: () => void; onPractice: () => void }> = ({ summary, onLesson, onPractice }) => {
  const s = summary;
  const split = (['writing', 'speaking'] as const).filter((k) => s.bySkill[k] > 0).map((k) => `${SKILL_LABEL[k]} ${s.bySkill[k]}`);
  return (
    <li className={`${panel} space-y-3 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</h3>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            {split.join(' · ')} · {s.perAttempt.toLocaleString('vi-VN')} lỗi/bài
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-title font-bold tabular-nums text-slate-900 dark:text-white">{s.total}</p>
          <TrendBadge trend={s.trend} />
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{s.info?.hintVi ?? OTHER_HINT}</p>
      <ul className="space-y-2">
        {s.examples.map((e, i) => (
          <Example key={i} e={e} />
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onPractice} className={primaryBtn}>
          <Dumbbell className="h-4 w-4" /> Luyện lỗi này
        </button>
        <button type="button" onClick={onLesson} className={secondaryBtn}>
          <BookOpen className="h-4 w-4" /> Xem bài học
        </button>
      </div>
    </li>
  );
};

// ─── Practice ───────────────────────────────────────────────────────

const Diff: React.FC<{ before: string; after: string }> = ({ before, after }) => (
  <p className="text-sm leading-relaxed">
    {diffWords(before, after).map((t, i) => (
      <React.Fragment key={i}>
        {i > 0 && ' '}
        <span
          className={
            t.kind === 'added'
              ? 'rounded bg-emerald-100 px-0.5 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
              : t.kind === 'removed'
                ? 'rounded bg-rose-100 px-0.5 text-rose-700 line-through dark:bg-rose-500/20 dark:text-rose-300'
                : 'text-slate-700 dark:text-slate-200'
          }
        >
          {t.text}
        </span>
      </React.Fragment>
    ))}
  </p>
);

/** Rewrite one of the learner's own sentences, checked locally against the examiner's correction. */
const RewriteCard: React.FC<{ e: LoggedError; index: number }> = ({ e, index }) => {
  const [answer, setAnswer] = useState(e.original);
  const [checked, setChecked] = useState<string | null>(null);
  const fixed = checked != null && isCorrectionFixed(checked, e.corrected);
  const id = `rewrite-${index}`;
  return (
    <li className={`${panel} space-y-3 p-4`}>
      <label htmlFor={id} className="block text-caption font-medium text-slate-500 dark:text-slate-400">
        Câu {index + 1} · {SKILL_LABEL[e.skill]}
      </label>
      <textarea
        id={id}
        rows={2}
        value={answer}
        onChange={(ev) => {
          setAnswer(ev.target.value);
          setChecked(null);
        }}
        className={`${field} resize-y`}
      />
      {checked == null ? (
        <button type="button" onClick={() => setChecked(answer)} disabled={!answer.trim()} className={secondaryBtn}>
          Kiểm tra
        </button>
      ) : (
        <div className="space-y-2" role="status">
          <p
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-semibold ${
              fixed ? VERDICT_STYLE.correct.cls : VERDICT_STYLE.acceptable.cls
            }`}
          >
            {fixed ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
            {fixed ? 'Khớp với bản sửa' : 'Khác bản sửa, đối chiếu bên dưới'}
          </p>
          {!fixed && <Diff before={checked} after={e.corrected} />}
          {e.explanation && <p className="text-sm text-slate-600 dark:text-slate-300">{e.explanation}</p>}
        </div>
      )}
    </li>
  );
};

type DrillState = { kind: 'idle' } | { kind: 'grading' } | { kind: 'done'; grade: SentenceGrade } | { kind: 'error'; message: string };

const Bolded: React.FC<{ text: string }> = ({ text }) => (
  <>
    {splitBold(text).map((p, i) =>
      p.bold ? (
        <strong key={i} className="font-semibold text-slate-900 underline decoration-emerald-400 decoration-2 underline-offset-2 dark:text-white">
          {p.text}
        </strong>
      ) : (
        <React.Fragment key={i}>{p.text}</React.Fragment>
      ),
    )}
  </>
);

const DrillCard: React.FC<{ item: SentenceItem; index: number; grade: typeof gradeSentence }> = ({ item, index, grade }) => {
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState<DrillState>({ kind: 'idle' });
  const id = `drill-${item.id}`;

  const submit = async () => {
    setState({ kind: 'grading' });
    try {
      setState({ kind: 'done', grade: await grade(item, answer, DRILL_LEVEL) });
    } catch (err) {
      setState({ kind: 'error', message: aiErrorMessage(err) });
    }
  };

  const g = state.kind === 'done' ? state.grade : null;
  const style = g ? VERDICT_STYLE[g.verdict] : null;
  return (
    <li className={`${panel} space-y-3 p-4`}>
      <div>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Câu {index + 1}</p>
        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{item.promptVi}</p>
        <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">Dùng từ: {item.targetWords.join(', ')}</p>
      </div>
      <label htmlFor={id} className="sr-only">
        Câu tiếng Anh của bạn
      </label>
      <textarea
        id={id}
        rows={2}
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          if (state.kind !== 'grading') setState({ kind: 'idle' });
        }}
        disabled={state.kind === 'grading'}
        placeholder="Viết câu tiếng Anh…"
        className={`${field} resize-y`}
      />
      {(state.kind === 'idle' || state.kind === 'grading') && (
        <button type="button" onClick={() => void submit()} disabled={!answer.trim() || state.kind === 'grading'} className={secondaryBtn}>
          {state.kind === 'grading' ? 'Đang chấm…' : 'Chấm câu này'}
        </button>
      )}
      {state.kind === 'error' && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {state.message}{' '}
          <button type="button" onClick={() => void submit()} className="font-semibold underline underline-offset-2">
            Thử lại
          </button>
        </p>
      )}
      {g && style && (
        <div className="space-y-2" role="status">
          <p className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-semibold ${style.cls}`}>
            <style.icon className="h-3.5 w-3.5" /> {VERDICT_LABELS[g.verdict]}
          </p>
          {g.verdict !== 'correct' && (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              <Bolded text={g.corrected} />
            </p>
          )}
          {g.explanationVi && <p className="text-sm text-slate-600 dark:text-slate-300">{g.explanationVi}</p>}
          {g.natural && g.natural !== answer.trim() && (
            <p className="text-sm italic text-slate-600 dark:text-slate-400">Câu tự nhiên: {g.natural}</p>
          )}
        </div>
      )}
    </li>
  );
};

const Practice: React.FC<{ summary: ErrorSummary; grade: typeof gradeSentence; onLesson: () => void }> = ({ summary, grade, onLesson }) => {
  const drills = drillsFor(summary.category);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Luyện lỗi</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">{summary.label}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{summary.info?.hintVi ?? OTHER_HINT}</p>
      </header>

      {summary.info && (
        <div className={`${panel} space-y-1 p-4`}>
          <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Ví dụ</p>
          <p className="text-sm text-rose-700 line-through decoration-rose-300 dark:text-rose-300">{summary.info.example.wrong}</p>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{summary.info.example.right}</p>
          <button type="button" onClick={onLesson} className={`${ghostBtn} -ml-3 mt-1`}>
            <BookOpen className="h-4 w-4" /> Đọc bài học
          </button>
        </div>
      )}

      <section aria-labelledby="rewrite-own" className="space-y-3">
        <div>
          <h2 id="rewrite-own" className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <PenLine className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Sửa lại câu của bạn
          </h2>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">Câu gốc trong bài của bạn. Sửa trực tiếp rồi kiểm tra.</p>
        </div>
        <ul className="space-y-3">
          {summary.examples.map((e, i) => (
            <RewriteCard key={`${summary.category}-${i}`} e={e} index={i} />
          ))}
        </ul>
      </section>

      {drills.length > 0 && (
        <section aria-labelledby="new-drills" className="space-y-3">
          <div>
            <h2 id="new-drills" className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Dumbbell className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Luyện câu mới
            </h2>
            <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
              Dịch sang tiếng Anh. Mỗi câu được soạn để dễ mắc đúng lỗi này.
            </p>
          </div>
          <ul className="space-y-3">
            {drills.map((d, i) => (
              <DrillCard key={d.id} item={d} index={i} grade={grade} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

// ─── Screen ─────────────────────────────────────────────────────────

export default function IeltsErrorLog({ userId, onBack, onOpenLibrary, loadAttempts = loadRecent, grade = gradeSentence }: Props) {
  const [attempts, setAttempts] = useState<IeltsAttempt[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [practice, setPractice] = useState<string | null>(null);
  const loader = useRef(loadAttempts);
  loader.current = loadAttempts;

  const load = useCallback(async () => {
    if (!userId) {
      setAttempts([]);
      return;
    }
    setFailed(false);
    setAttempts(null);
    try {
      setAttempts(await loader.current(userId));
    } catch (err) {
      console.warn('[Error log] attempts failed:', err);
      setFailed(true);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const log = useMemo(() => (attempts ? summarizeErrors(attempts, filter === 'all' ? undefined : filter) : null), [attempts, filter]);
  const current = practice ? log?.categories.find((c) => c.category === practice) : undefined;

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [practice]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 anim-fade-up">
      <button type="button" onClick={() => (current ? setPractice(null) : onBack())} className={`${ghostBtn} -ml-3`}>
        <ArrowLeft className="h-4 w-4" /> {current ? 'Sổ lỗi' : 'IELTS'}
      </button>

      {current ? (
        <Practice summary={current} grade={grade} onLesson={() => onOpenLibrary(lessonFor(current.category))} />
      ) : (
        <>
          <header>
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Writing và Speaking</p>
            <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Sổ lỗi</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Lỗi được gom từ phần sửa câu của các bài đã chấm. Sửa dứt điểm lỗi lặp lại nhiều nhất trước.
            </p>
          </header>

          <Segmented
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'writing', label: 'Writing' },
              { value: 'speaking', label: 'Speaking' },
            ]}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            label="Kỹ năng"
          />

          {failed ? (
            <ErrorState message="Chưa tải được các bài đã chấm. Kiểm tra mạng rồi thử lại." onRetry={() => void load()} />
          ) : !log ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : log.categories.length === 0 ? (
            <div className={`${panel} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <NotebookPen className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {log.attempts === 0 ? 'Chưa có bài nào được chấm' : 'Không có lỗi nào được ghi lại'}
              </p>
              <p className="max-w-sm text-caption text-slate-500 dark:text-slate-400">
                {log.attempts === 0
                  ? 'Nộp một bài Writing hoặc Speaking để AI chấm. Các câu được sửa sẽ tự vào sổ này.'
                  : `${log.attempts} bài đã chấm chưa có câu nào cần sửa.`}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">{log.total} lỗi</span> trong {log.attempts} bài
                {log.categories[0].info && (
                  <>
                    {' '}
                    · gặp nhiều nhất: <span className="font-semibold text-slate-900 dark:text-white">{log.categories[0].label}</span>
                  </>
                )}
              </p>
              <ul className="space-y-3">
                {log.categories.map((s) => (
                  <CategoryCard
                    key={s.category}
                    summary={s}
                    onLesson={() => onOpenLibrary(lessonFor(s.category))}
                    onPractice={() => setPractice(s.category)}
                  />
                ))}
              </ul>
              <p className="flex items-center gap-1.5 text-caption text-slate-500 dark:text-slate-400">
                <Info className="h-3.5 w-3.5" /> Xu hướng so sánh nửa số bài gần đây với nửa trước, cần ít nhất 4 bài.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
