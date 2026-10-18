/**
 * Taking a Reading test or passage.
 *
 * Desktop: the passage and the questions side by side, each scrolling on its
 * own, with a divider that can be dragged (or moved with the arrow keys).
 * Mobile: two sticky tabs, "Bài đọc" and "Câu hỏi".
 *
 * Exam mode runs one countdown for the session and submits when it ends.
 * Practice mode times each passage against its suggested minutes and lets the
 * learner check a question group on the spot.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Grid3x3, ListChecks, Send } from 'lucide-react';
import type { ReadingAnswers, ReadingTest } from '../data/ielts/reading';
import { answeredNumbers, passageBudget, passageQuestions, sessionPassages, type ReadingMode } from '../services/readingLogic';
import ReadingGroupView from '../components/ielts/questions/ReadingGroupView';
import PassageView, { type Highlights } from '../components/ielts/reading/PassageView';
import ReadingTimer from '../components/ielts/reading/ReadingTimer';
import QuestionMap from '../components/ielts/reading/QuestionMap';
import GroupCheck from '../components/ielts/reading/GroupCheck';
import { ghostBtn, panel, primaryBtn, secondaryBtn } from '../components/ui/styles';

interface Props {
  userId: string;
  test: ReadingTest;
  /** Passages to take; empty means the whole test. */
  passageIds: string[];
  mode: ReadingMode;
  /** `seconds` is time spent per passage id. */
  onSubmit: (answers: ReadingAnswers, seconds: Record<string, number>) => void;
  onExit: () => void;
}

interface Draft {
  answers: ReadingAnswers;
  index: number;
  seconds: Record<string, number>;
  highlights: Highlights;
  flags: number[];
  checked: string[];
}

const draftKey = (userId: string, testId: string, passageIds: string[], mode: ReadingMode) =>
  `ielts-reading-draft:${userId}:${testId}:${passageIds.join('+') || 'all'}:${mode}`;

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    const d = raw ? (JSON.parse(raw) as Partial<Draft>) : null;
    if (!d || typeof d.answers !== 'object' || d.answers === null) return null;
    return {
      answers: d.answers,
      index: Number(d.index) || 0,
      seconds: d.seconds && typeof d.seconds === 'object' ? d.seconds : {},
      highlights: d.highlights && typeof d.highlights === 'object' ? d.highlights : {},
      flags: Array.isArray(d.flags) ? d.flags : [],
      checked: Array.isArray(d.checked) ? d.checked : [],
    };
  } catch {
    return null;
  }
}

export function clearReadingDraft(userId: string, testId: string, passageIds: string[], mode: ReadingMode) {
  try {
    localStorage.removeItem(draftKey(userId, testId, passageIds, mode));
  } catch {
    /* nothing saved */
  }
}

const SPLIT_KEY = 'ielts-reading-split';
const SPLIT_MIN = 30;
const SPLIT_MAX = 70;
const clampSplit = (n: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(n)));

function readSplit(): number {
  try {
    const n = Number(localStorage.getItem(SPLIT_KEY));
    return n ? clampSplit(n) : 50;
  } catch {
    return 50;
  }
}

type Tab = 'passage' | 'questions';

/** The secondary button with less side padding, for the crowded top bar. */
const compactBtn = secondaryBtn.replace('px-4', 'px-3');

const FOCUSABLE = 'input, select, textarea, button';

const tabBase = 'press flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors';

export default function IeltsReadingPractice({ userId, test, passageIds, mode, onSubmit, onExit }: Props) {
  const passages = useMemo(() => sessionPassages(test, passageIds), [test, passageIds]);
  const key = draftKey(userId, test.id, passageIds, mode);
  const [draft] = useState(() => readDraft(key));
  const [answers, setAnswers] = useState<ReadingAnswers>(draft?.answers ?? {});
  const [index, setIndex] = useState(() => Math.min(Math.max(draft?.index ?? 0, 0), passages.length - 1));
  const [highlights, setHighlights] = useState<Highlights>(draft?.highlights ?? {});
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set(draft?.flags));
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(draft?.checked));
  const [tab, setTab] = useState<Tab>('passage');
  const [mapOpen, setMapOpen] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [split, setSplit] = useState(readSplit);
  const secondsRef = useRef<Record<string, number>>({ ...draft?.seconds });
  const splitRef = useRef<HTMLDivElement>(null);
  const passageCol = useRef<HTMLDivElement>(null);
  const questionCol = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);

  const passage = passages[index];
  const exam = mode === 'exam';
  const last = index === passages.length - 1;
  const limitSeconds = passages.reduce((n, p) => n + passageBudget(p), 0);

  // The timer saves through this, so it always writes the latest state.
  const latest = useRef<Omit<Draft, 'seconds'>>({ answers, index, highlights, flags: [], checked: [] });
  latest.current = { answers, index, highlights, flags: [...flags], checked: [...checked] };
  const persist = useCallback(() => {
    if (submitted.current) return;
    try {
      localStorage.setItem(key, JSON.stringify({ ...latest.current, seconds: secondsRef.current } satisfies Draft));
    } catch {
      /* private mode: no draft */
    }
  }, [key]);
  useEffect(persist, [persist, answers, index, highlights, flags, checked]);

  const answered = useMemo(() => answeredNumbers(passages, answers), [passages, answers]);
  const total = passages.reduce((n, p) => n + passageQuestions(p).length, 0);
  const missing = total - answered.size;

  const setAnswer = (n: number, v: string) => setAnswers((a) => ({ ...a, [n]: v }));

  const goTo = (i: number) => {
    setIndex(i);
    setConfirming(false);
    passageCol.current?.scrollTo({ top: 0 });
    questionCol.current?.scrollTo({ top: 0 });
    splitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Open a question: its passage, the questions tab, then focus its control. */
  const jump = (n: number) => {
    const i = passages.findIndex((p) => passageQuestions(p).some((q) => q.number === n));
    if (i < 0) return;
    if (i !== index) goTo(i);
    setTab('questions');
    setMapOpen(false);
    requestAnimationFrame(() => {
      // A choose-two group only puts the id on its first question.
      for (let m = n; m > 0; m--) {
        const el = document.getElementById(`q-${m}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Choice groups put the id on a wrapper; focus its first control.
          const control = el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE);
          control?.focus({ preventScroll: true });
          return;
        }
      }
    });
  };

  const showParagraph = (label: string) => {
    setTab('passage');
    requestAnimationFrame(() =>
      document.getElementById(`para-${passage.id}-${label}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const toggle = <T,>(set: ReadonlySet<T>, v: T) => {
    const next = new Set(set);
    if (!next.delete(v)) next.add(v);
    return next;
  };

  const finish = () => {
    if (submitted.current) return;
    submitted.current = true;
    clearReadingDraft(userId, test.id, passageIds, mode);
    const seconds = Object.fromEntries(passages.map((p) => [p.id, Math.round(secondsRef.current[p.id] ?? 0)]));
    onSubmit(answers, seconds);
  };

  const submit = () => {
    if ((missing > 0 || flags.size > 0) && !confirming) {
      setConfirming(true);
      return;
    }
    finish();
  };

  // Answers can change after the timer was set up, so expiry reads them at the time.
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const onExpire = useCallback(() => finishRef.current(), []);

  // --- Divider ---------------------------------------------------------------
  const saveSplit = (n: number) => {
    try {
      localStorage.setItem(SPLIT_KEY, String(n));
    } catch {
      /* not kept */
    }
  };
  const dragTo = (clientX: number) => {
    const r = splitRef.current?.getBoundingClientRect();
    if (r && r.width) setSplit(clampSplit(((clientX - r.left) / r.width) * 100));
  };
  const onDividerKey = (e: React.KeyboardEvent) => {
    const next =
      e.key === 'ArrowLeft' ? split - 5 : e.key === 'ArrowRight' ? split + 5 : e.key === 'Home' ? SPLIT_MIN : e.key === 'End' ? SPLIT_MAX : null;
    if (next === null) return;
    e.preventDefault();
    const n = clampSplit(next);
    setSplit(n);
    saveSplit(n);
  };

  const leftIn = (i: number) => passageQuestions(passages[i]).filter((q) => !answered.has(q.number)).length;

  return (
    <div className="space-y-3 pb-10 anim-fade-up">
      <div className="sticky top-14 z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:top-16 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onExit} className={`${ghostBtn} -ml-3`}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Thoát</span>
          </button>
          <ReadingTimer
            exam={exam}
            limitSeconds={limitSeconds}
            budgetSeconds={passageBudget(passage)}
            passageId={passage.id}
            secondsRef={secondsRef}
            onExpire={onExpire}
            onPersist={persist}
          />
          <p className="hidden text-caption font-medium tabular-nums text-slate-600 sm:block dark:text-slate-400">
            Đã làm {answered.size}/{total}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMapOpen((o) => !o)}
              aria-expanded={mapOpen}
              aria-label={`Bảng câu, đã làm ${answered.size}/${total}`}
              className={compactBtn}
            >
              <Grid3x3 className="h-4 w-4 text-tone-aqua-fg" aria-hidden />
              <span className="hidden sm:inline">Bảng câu</span>
              <span className="tabular-nums sm:hidden">
                {answered.size}/{total}
              </span>
            </button>
            <button type="button" onClick={submit} className={primaryBtn}>
              <Send className="h-4 w-4" aria-hidden /> Nộp bài
            </button>
          </div>
        </div>
      </div>

      {confirming && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-tone-butter-border bg-tone-butter p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-slate-800 dark:text-slate-200">
            {missing > 0 && `Còn ${missing} câu chưa trả lời. Trong bài thi thật nên đoán thay vì bỏ trống, vì sai không bị trừ điểm. `}
            {flags.size > 0 && `Còn ${flags.size} câu đánh dấu xem lại.`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={secondaryBtn}>
              Làm tiếp
            </button>
            <button type="button" onClick={finish} className={primaryBtn}>
              Vẫn nộp
            </button>
          </div>
        </div>
      )}

      {mapOpen && (
        <QuestionMap
          passages={passages}
          answered={answered}
          flags={flags}
          flagMode={flagMode}
          onFlagModeChange={setFlagMode}
          onJump={jump}
          onToggleFlag={(n) => setFlags((f) => toggle(f, n))}
        />
      )}

      <header className="flex flex-wrap items-center gap-2">
        <p className="text-caption font-medium text-slate-600 dark:text-slate-400">
          {test.title} · {exam ? 'Thi thử' : 'Luyện tập'}
        </p>
        {passages.length > 1 && (
          <nav aria-label="Các passage" className="flex gap-1.5 overflow-x-auto sm:ml-auto">
            {passages.map((p, i) => {
              const left = leftIn(i);
              const on = i === index;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={on ? 'step' : undefined}
                  className={`press inline-flex min-h-touch flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    on
                      ? 'border-tone-mint-fg bg-tone-mint-soft text-tone-mint-fg'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-tone-mint-border hover:bg-tone-mint dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  Passage {p.part}
                  <span className="text-caption font-medium tabular-nums opacity-80">{left === 0 ? 'xong' : `còn ${left}`}</span>
                </button>
              );
            })}
          </nav>
        )}
      </header>

      <div role="tablist" aria-label="Bài đọc hoặc câu hỏi" className="sticky top-[7.25rem] z-20 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 sm:top-[8.25rem] lg:hidden dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            ['passage', 'Bài đọc', BookOpen],
            ['questions', 'Câu hỏi', ListChecks],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`reading-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`reading-panel-${id}`}
            onClick={() => {
              setTab(id);
              splitRef.current?.scrollIntoView({ block: 'start' });
            }}
            className={`${tabBase} ${tab === id ? 'bg-tone-mint-soft text-tone-mint-fg' : 'text-slate-600 hover:bg-tone-mint dark:text-slate-300'}`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div
        ref={splitRef}
        style={{ '--split': `${split}%` } as React.CSSProperties}
        className="scroll-mt-44 lg:flex lg:h-[calc(100dvh-14rem)] lg:min-h-[28rem] lg:scroll-mt-32"
      >
        <div
          ref={passageCol}
          id="reading-panel-passage"
          role="tabpanel"
          aria-labelledby="reading-tab-passage"
          className={`${tab === 'passage' ? 'block' : 'hidden'} ${panel} p-4 sm:p-6 lg:block lg:w-[var(--split)] lg:flex-shrink-0 lg:overflow-y-auto`}
        >
          <PassageView passage={passage} highlights={highlights} onHighlightsChange={setHighlights} />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Độ rộng bài đọc"
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          aria-valuenow={split}
          tabIndex={0}
          onKeyDown={onDividerKey}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && dragTo(e.clientX)}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            saveSplit(split);
          }}
          className="group hidden w-4 flex-shrink-0 cursor-col-resize touch-none items-center justify-center rounded-full focus-visible:outline-none lg:flex"
        >
          <span className="h-16 w-1.5 rounded-full bg-slate-200 transition-colors group-hover:bg-tone-mint-border group-focus-visible:bg-tone-mint-fg dark:bg-slate-700" />
        </div>

        <div
          ref={questionCol}
          id="reading-panel-questions"
          role="tabpanel"
          aria-labelledby="reading-tab-questions"
          className={`${tab === 'questions' ? 'block' : 'hidden'} min-w-0 space-y-4 lg:block lg:flex-1 lg:overflow-y-auto lg:pr-1`}
        >
          {passage.groups.map((g) => (
            <div key={g.id}>
              <ReadingGroupView group={g} answers={answers} onChange={setAnswer} />
              {!exam && (
                <GroupCheck
                  group={g}
                  passage={passage}
                  answers={answers}
                  checked={checked.has(g.id)}
                  onCheckedChange={(on) => setChecked((c) => (c.has(g.id) === on ? c : toggle(c, g.id)))}
                  onShowParagraph={showParagraph}
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-between gap-2 pt-2">
            {index > 0 ? (
              <button type="button" onClick={() => goTo(index - 1)} className={secondaryBtn}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Passage {passages[index - 1].part}
              </button>
            ) : (
              <span />
            )}
            {last ? (
              <button type="button" onClick={submit} className={primaryBtn}>
                <Send className="h-4 w-4" aria-hidden /> Nộp bài
              </button>
            ) : (
              <button type="button" onClick={() => goTo(index + 1)} className={primaryBtn}>
                Passage {passages[index + 1].part} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
