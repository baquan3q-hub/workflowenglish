import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Lightbulb, Loader2, Mic, MessageCircleQuestion, RotateCcw, Square, X } from 'lucide-react';
import type { Item, Lesson, OpenItem } from '../../data/grammar/types';
import { getMeta, stages } from '../../data/grammar/meta';
import { expectedOf, filled, gradeClosed, isOpen, promptOf, scrambled, shuffled } from '../../services/grammar/grade';
import type { Attempt } from '../../services/grammar/progress';
import type { Session } from '../../services/grammar/session';
import { gradeOpen, isRight, openTask } from '../../services/grammar/ai';
import { aiErrorMessage, isAbortError } from '../../services/aiClient';
import AiProgress from '../ui/AiProgress';
import { useRecorder } from '../ielts/speaking/useRecorder';
import { analyzeTake } from '../ielts/speaking/analyzeTake';
import { transcribeAudioWithGemini } from '../../services/ieltsSpeakingService';
import { field, ghostBtn, primaryBtn, secondaryBtn } from '../ui/styles';
import AiTutor from './AiTutor';
import { ERROR_TAG_LABEL, KIND_LABEL, LEVEL_LABEL, Listen, Marked, card, plain, stageTone } from './shared';

export const MODE_LABEL: Record<Session['mode'], string> = {
  learn: 'Luyện tập',
  review: 'Ôn lại',
  errors: 'Sửa lỗi',
  checkpoint: 'Kiểm tra cuối chặng',
  diagnostic: 'Chẩn đoán đầu vào',
};

interface Props {
  session: Session;
  lessons: Map<string, Lesson>;
  aiItems?: Map<string, Item>;
  attempts: Attempt[];
  theme: string;
  update: (s: Session) => void;
  onRecord: (a: Attempt) => void;
  onNext: () => void;
  onPause: () => void;
}

export default function PracticeRunner({ session: s, lessons, aiItems, attempts, theme, update, onRecord, onNext, onPause }: Props) {
  const task = s.tasks[s.index];
  const lesson = lessons.get(task.lesson)!;
  const item = s.extraItems?.[task.itemId] ?? aiItems?.get(task.itemId) ?? lesson.items.find((i) => i.id === task.itemId)!;
  const [busy, setBusy] = useState(false);
  const gradeAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    gradeAbortRef.current?.abort();
  }, []);
  const [error, setError] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const set = (patch: Partial<Session>) => update({ ...s, ...patch });
  const practice = s.mode === 'learn' || s.mode === 'review' || s.mode === 'errors';
  const result = attempts.find((a) => a.id === s.lastId);
  const open = isOpen(item);
  const meta = getMeta(lesson.id)!;
  const tone = stageTone(meta.stage);
  const seed = s.id + item.id;
  const choiceOptions = useMemo(
    () => (item.kind === 'choice' ? shuffled(item.options, seed) : item.kind === 'spot' ? shuffled(item.sentences, seed) : []),
    [item, seed]
  );

  // A fix item starts from the wrong sentence, so the learner edits instead of retyping.
  useEffect(() => {
    if (item.kind === 'fix' && !s.answer && !result) set({ answer: item.wrong });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  // Desktop shortcuts: 1-4 pick option, Enter checks or advances when graded.
  const submitRef = useRef<() => void>(() => {});
  const nextRef = useRef(onNext);
  nextRef.current = onNext;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (tutorOpen || busy) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) return;
      if (!result && choiceOptions.length > 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
          const idx = Number(e.key) - 1;
          if (e.key >= '1' && e.key <= '4' && idx >= 0 && idx < choiceOptions.length) {
            e.preventDefault();
            set({ answer: choiceOptions[idx] });
            return;
          }
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return;
        if (target instanceof HTMLButtonElement && !target.dataset.option) return;
        if (result) {
          e.preventDefault();
          nextRef.current();
        } else if (s.answer.trim()) {
          e.preventDefault();
          submitRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorOpen, busy, result, choiceOptions, s.answer]);

  async function submit() {
    const answer = s.answer.trim();
    if (!answer || busy || result) return;
    setError('');
    const attempt: Attempt = {
      version: 2,
      id: crypto.randomUUID(),
      session: s.id,
      at: new Date().toISOString(),
      mode: s.mode,
      lesson: lesson.id,
      itemId: item.id,
      kind: item.kind,
      level: item.level,
      prompt: item.kind === 'spot' ? item.sentences.join(' · ') : promptOf(item),
      expected: expectedOf(item),
      answer,
      result: 'pending',
      assisted: s.hinted,
      typedFallback: item.kind === 'speak' && !s.spoken,
      delayedReview: s.delayedReview,
      ...( (s.extraItems?.[item.id] || aiItems?.has(item.id)) && 'why' in item && item.why ? { note: item.why } : {}),
    };
    if (!open) {
      attempt.result = gradeClosed(item, answer) ? 'correct' : 'incorrect';
      onRecord(attempt);
      if (s.mode === 'diagnostic') onNext();
      else set({ lastId: attempt.id });
      return;
    }
    // Keep the answer even if the tab closes while the AI is grading.
    onRecord(attempt);
    set({ lastId: attempt.id });
    gradeAbortRef.current?.abort();
    const controller = new AbortController();
    gradeAbortRef.current = controller;
    setBusy(true);
    try {
      const feedback = await gradeOpen(lesson, openTask(item as OpenItem), answer, theme, controller.signal);
      if (controller.signal.aborted) return;
      onRecord({ ...attempt, feedback, result: isRight(feedback) ? 'correct' : 'incorrect' });
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) return;
      if (alive.current) setError(aiErrorMessage(e) + ' Câu trả lời đã được lưu; bạn có thể nhận xét lại trong Sổ lỗi.');
    } finally {
      if (gradeAbortRef.current === controller) gradeAbortRef.current = null;
      if (alive.current) setBusy(false);
    }
  }

  async function regradePending() {
    if (!result || result.result !== 'pending' || !open || busy) return;
    setError('');
    gradeAbortRef.current?.abort();
    const controller = new AbortController();
    gradeAbortRef.current = controller;
    setBusy(true);
    try {
      const feedback = await gradeOpen(lesson, openTask(item as OpenItem), result.answer, theme, controller.signal);
      if (controller.signal.aborted) return;
      onRecord({ ...result, feedback, result: isRight(feedback) ? 'correct' : 'incorrect' });
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) return;
      if (alive.current) setError(aiErrorMessage(e) + ' Câu trả lời đã được lưu; bạn có thể nhận xét lại trong Sổ lỗi.');
    } finally {
      if (gradeAbortRef.current === controller) gradeAbortRef.current = null;
      if (alive.current) setBusy(false);
    }
  }

  submitRef.current = () => void submit();

  const last = s.index + 1 >= s.tasks.length;
  const title = s.mode === 'diagnostic' ? stages[meta.stage].title : lesson.title;
  const tutorTask =
    item.kind === 'spot'
      ? 'Chọn câu đúng: ' + item.sentences.join(' / ')
      : item.kind === 'order'
        ? 'Sắp xếp các cụm: ' + item.chunks.join(' · ')
        : promptOf(item);
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-2xl flex-col gap-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-1 sm:pt-2">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={ghostBtn + ' -ml-3'} disabled={busy} onClick={onPause}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tạm dừng
          </button>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {MODE_LABEL[s.mode]} · Câu {s.index + 1}/{s.tasks.length}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-label="Tiến độ phiên"
          aria-valuemin={0}
          aria-valuemax={s.tasks.length}
          aria-valuenow={s.index}
        >
          <div className={'h-full rounded-full transition-all ' + tone.accent} style={{ width: (100 * s.index) / s.tasks.length + '%' }} />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {title} · {LEVEL_LABEL[item.level]}
        </p>
      </header>

      {s.scaffold && !result && (
        <aside className={'rounded-2xl border p-4 ' + tone.border + ' ' + tone.bg}>
          <p className={'text-sm font-bold ' + tone.fg}>Xem lại mẫu trước khi làm tiếp</p>
          <p className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">{lesson.forms[0].pattern}</p>
          <p lang="en" className="mt-1 text-sm text-slate-800 dark:text-slate-100">
            <Marked text={lesson.examples[0].en} />
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{lesson.examples[0].vi}</p>
        </aside>
      )}

      <section className={card + ' flex flex-col gap-4'}>
        <p className={'text-xs font-bold uppercase tracking-wide ' + tone.fg}>{KIND_LABEL[item.kind]}</p>
        <Question item={item} />
        <AnswerInput
          item={item}
          session={s}
          choiceOptions={choiceOptions}
          seed={seed}
          set={set}
          locked={!!result || busy}
          onSubmit={submit}
          setBusy={setBusy}
          setError={setError}
          alive={alive}
        />

        {practice && !result && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ghostBtn}
              onClick={() => {
                setHintOpen((v) => !v);
                set({ hinted: true });
              }}
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> Gợi ý
            </button>
            <button type="button" className={ghostBtn} onClick={() => setTutorOpen(true)}>
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" /> Hỏi trợ giảng AI
            </button>
          </div>
        )}
        {hintOpen && !result && (
          <aside className="rounded-xl bg-tone-butter p-3 text-sm text-slate-800 dark:text-slate-100">
            <p className="font-semibold text-tone-butter-fg">Công thức</p>
            {lesson.forms.slice(0, 2).map((f) => (
              <p key={f.label}>
                {f.label}: <span className="font-mono">{f.pattern}</span>
              </p>
            ))}
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Dùng gợi ý thì câu này được tính là có trợ giúp.</p>
          </aside>
        )}

        {error && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tone-blush-border bg-tone-blush px-3 py-2 text-sm text-tone-blush-fg">
            <span>{error}</span>
            {result?.result === 'pending' && open && (
              <button
                type="button"
                disabled={busy}
                onClick={regradePending}
                className="press min-h-touch rounded-lg bg-white px-3 text-xs font-semibold text-tone-blush-fg hover:bg-tone-blush-soft dark:bg-slate-900"
              >
                Thử lại ngay
              </button>
            )}
          </div>
        )}

        {!result ? (
          <button type="button" className={primaryBtn + ' w-full'} disabled={!s.answer.trim() || busy} onClick={submit}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Đang xử lý…' : item.kind === 'speak' && s.spoken ? 'Xác nhận lời nói và kiểm tra' : 'Kiểm tra'}
          </button>
        ) : (
          <Feedback item={item} result={result} busy={busy} onCancel={() => gradeAbortRef.current?.abort()} />
        )}
      </section>

      {result && (
        <div className="flex flex-col gap-2">
          {result.result === 'pending' && open && (
            <button type="button" className={secondaryBtn} disabled={busy} onClick={regradePending}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> {busy ? 'Đang nhận xét…' : 'Nhận xét lại'}
            </button>
          )}
          {result.result === 'incorrect' && practice && (
            <button type="button" className={secondaryBtn} onClick={() => set({ lastId: undefined, hinted: true })}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Sửa lại câu của mình
            </button>
          )}
          {practice && (
            <button type="button" className={ghostBtn} onClick={() => setTutorOpen(true)}>
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" /> Hỏi trợ giảng AI về câu này
            </button>
          )}
          <button type="button" className={primaryBtn} disabled={busy} onClick={onNext}>
            {last ? 'Xem kết quả' : 'Câu tiếp theo'}
          </button>
        </div>
      )}

      <AiTutor
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        lesson={lesson}
        theme={theme}
        task={tutorTask}
        answer={s.answer}
        feedback={result?.feedback}
        onAsk={() => {
          if (!result) set({ hinted: true });
        }}
      />
    </div>
  );
}

function Question({ item }: { item: Item }) {
  switch (item.kind) {
    case 'choice':
    case 'fill':
      return (
        <p lang="en" className="text-lg font-semibold leading-relaxed text-slate-900 dark:text-white">
          {item.prompt.split('___').map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span className="mx-1 inline-block min-w-[3.5rem] border-b-2 border-tone-periwinkle-fg align-baseline" aria-label="chỗ trống">
                  &nbsp;
                </span>
              )}
              {part}
            </React.Fragment>
          ))}
          {item.kind === 'fill' && item.cue && <span className="ml-1 text-slate-500">({item.cue})</span>}
        </p>
      );
    case 'spot':
      return <p className="text-lg font-semibold text-slate-900 dark:text-white">Câu nào đúng?</p>;
    case 'fix':
      return (
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">Câu dưới đây có một lỗi. Sửa trực tiếp trong ô trả lời.</p>
          <p lang="en" className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            {item.wrong}
          </p>
        </div>
      );
    case 'order':
      return <p className="text-lg font-semibold text-slate-900 dark:text-white">Chạm vào các cụm theo đúng thứ tự.</p>;
    default:
      return (
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold leading-relaxed text-slate-900 dark:text-white">{item.task}</p>
          {item.kind === 'speak' && (
            <p className="text-sm text-slate-600 dark:text-slate-300">Ghi âm câu trả lời (tối đa 45 giây), hoặc gõ nếu không dùng được micro.</p>
          )}
        </div>
      );
  }
}

interface InputProps {
  item: Item;
  session: Session;
  choiceOptions: string[];
  seed: string;
  set: (patch: Partial<Session>) => void;
  locked: boolean;
  onSubmit: () => void;
  setBusy: (b: boolean) => void;
  setError: (e: string) => void;
  alive: React.MutableRefObject<boolean>;
}

function AnswerInput({ item, session: s, choiceOptions: options, seed, set, locked, onSubmit, setBusy, setError, alive }: InputProps) {
  if (item.kind === 'choice' || item.kind === 'spot')
    return (
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Các lựa chọn">
        {options.map((o, idx) => {
          const on = s.answer === o;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              data-option="true"
              disabled={locked}
              lang="en"
              onClick={() => set({ answer: o })}
              className={
                'press flex min-h-touch items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-base transition-colors disabled:cursor-default ' +
                (on
                  ? 'border-tone-periwinkle-fg bg-tone-periwinkle-soft font-semibold text-tone-periwinkle-fg'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-tone-periwinkle-border dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100')
              }
            >
              <span className="hidden h-5 w-5 shrink-0 items-center justify-center rounded border border-current/25 text-xs font-semibold opacity-60 sm:inline-flex">
                {idx + 1}
              </span>
              <span className="flex-1">{o}</span>
            </button>
          );
        })}
      </div>
    );
  if (item.kind === 'order') return <OrderInput chunks={item.chunks} seed={seed} session={s} locked={locked} set={set} />;
  if (item.kind === 'fill')
    return (
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Từ cần điền
        <input
          lang="en"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          className={field + ' text-base'}
          value={s.answer}
          disabled={locked}
          onChange={(e) => set({ answer: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
        />
      </label>
    );
  return (
    <div className="flex flex-col gap-3">
      {item.kind === 'speak' && <Recorder spoken={s.spoken} set={set} locked={locked} setBusy={setBusy} setError={setError} alive={alive} />}
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {item.kind === 'speak' ? (s.spoken ? 'Bản chép lời (sửa nếu máy nghe nhầm)' : 'Hoặc gõ câu trả lời') : 'Câu trả lời của bạn'}
        <textarea
          lang="en"
          rows={item.kind === 'fix' ? 2 : 3}
          maxLength={1200}
          spellCheck={false}
          className={field + ' py-2 text-base'}
          value={s.answer}
          disabled={locked}
          onChange={(e) => set({ answer: e.target.value })}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <span className="hidden text-xs font-normal text-slate-400 sm:block">Mẹo: nhấn Ctrl+Enter (⌘+Enter) để nộp nhanh.</span>
      </label>
    </div>
  );
}

function OrderInput({
  chunks,
  seed,
  session: s,
  locked,
  set,
}: {
  chunks: string[];
  seed: string;
  session: Session;
  locked: boolean;
  set: (patch: Partial<Session>) => void;
}) {
  const pool = useMemo(() => scrambled(chunks, seed), [chunks, seed]);
  const validSaved = useMemo(() => {
    const raw = Array.isArray(s.orderPicked) ? s.orderPicked : [];
    const seen = new Set<number>();
    const out: number[] = [];
    for (const i of raw) {
      if (Number.isInteger(i) && i >= 0 && i < pool.length && !seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }
    return out;
  }, [s.orderPicked, pool.length]);
  // If coming back to an older draft saved before orderPicked existed, clear stale text once.
  useEffect(() => {
    if (s.answer && !validSaved.length) set({ answer: '', orderPicked: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (next: number[]) => {
    set({ orderPicked: next, answer: next.map((i) => pool[i]).join(' ') });
  };
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex min-h-[3.5rem] flex-wrap gap-2 rounded-xl border-2 border-dashed border-slate-300 p-2 dark:border-slate-700"
        aria-label="Câu của bạn"
      >
        {validSaved.length === 0 && <span className="self-center px-2 text-sm text-slate-500">Câu của bạn sẽ hiện ở đây</span>}
        {validSaved.map((i) => (
          <button
            key={i}
            type="button"
            lang="en"
            disabled={locked}
            onClick={() => choose(validSaved.filter((p) => p !== i))}
            className="press min-h-touch rounded-lg bg-tone-periwinkle-soft px-3 text-base font-semibold text-tone-periwinkle-fg"
          >
            {pool[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((chunk, i) =>
          validSaved.includes(i) ? null : (
            <button
              key={i}
              type="button"
              lang="en"
              disabled={locked}
              onClick={() => choose([...validSaved, i])}
              className="press min-h-touch rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-800 hover:border-tone-periwinkle-border dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {chunk}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Recorder({
  spoken,
  set,
  locked,
  setBusy,
  setError,
  alive,
}: {
  spoken: boolean;
  set: (patch: Partial<Session>) => void;
  locked: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string) => void;
  alive: React.MutableRefObject<boolean>;
}) {
  const recorder = useRecorder(45);
  const [working, setWorking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function transcribe() {
    if (!recorder.take) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setBusy(true);
    setError('');
    try {
      const r = await analyzeTake(recorder.take, transcribeAudioWithGemini, controller.signal);
      if (!alive.current || r.aborted || controller.signal.aborted) return;
      if (r.transcript) set({ answer: r.transcript, spoken: true });
      else setError(r.error || 'Chưa nghe được lời nói. Thử nói to hơn hoặc gõ câu trả lời.');
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) return;
      if (alive.current) setError(aiErrorMessage(e));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (alive.current) {
        setWorking(false);
        setBusy(false);
      }
    }
  }
  if (!recorder.supported)
    return <p className="text-sm text-slate-600 dark:text-slate-300">Trình duyệt này chưa ghi âm được. Hãy gõ câu trả lời, vẫn được nhận xét như bài nói.</p>;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-tone-peach p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={locked || working}
          className={secondaryBtn}
          onClick={() => {
            if (recorder.recording) void recorder.stop();
            else {
              set({ spoken: false });
              void recorder.start();
            }
          }}
        >
          {recorder.recording ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
          {recorder.recording ? 'Dừng · ' + recorder.seconds + ' giây' : recorder.take ? 'Ghi lại' : 'Ghi âm'}
        </button>
        {recorder.take && !recorder.recording && (
          <button type="button" className={primaryBtn} disabled={locked || working} onClick={transcribe}>
            {working ? 'Đang nghe…' : 'Chuyển thành chữ'}
          </button>
        )}
      </div>
      {working && (
        <AiProgress
          compact
          tone="sky"
          label="AI đang chuyển giọng nói thành chữ…"
          estimatedMs={7_000}
          onCancel={() => abortRef.current?.abort()}
        />
      )}
      {recorder.take && !recorder.recording && <audio controls src={recorder.take.url} className="w-full" />}
      <p className="text-xs text-tone-peach-fg">
        {recorder.error || (spoken ? 'Kiểm tra bản chép lời rồi bấm kiểm tra.' : 'Nói một đến ba câu, rõ ràng và không cần vội.')}
      </p>
    </div>
  );
}

function Feedback({ item, result, busy, onCancel }: { item: Item; result: Attempt; busy: boolean; onCancel?: () => void }) {
  const ok = result.result === 'correct';
  const pending = result.result === 'pending';
  const fb = result.feedback;
  const why = 'why' in item ? item.why : '';
  return (
    <div
      aria-live="polite"
      className={
        'flex flex-col gap-2 rounded-xl border p-4 ' +
        (pending
          ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'
          : ok
            ? 'border-tone-mint-border bg-tone-mint'
            : 'border-tone-blush-border bg-tone-blush')
      }
    >
      <p className={'flex items-center gap-2 text-base font-bold ' + (pending ? 'text-slate-700 dark:text-slate-200' : ok ? 'text-tone-mint-fg' : 'text-tone-blush-fg')}>
        {!pending && (ok ? <Check className="h-5 w-5" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />)}
        {pending ? (busy ? 'Trợ giảng đang đọc câu của bạn…' : 'Chờ nhận xét') : ok ? 'Chính xác' : 'Chưa đúng, xem lại nhé'}
      </p>
      {pending && busy && (
        <AiProgress
          compact
          tone="periwinkle"
          label="Trợ giảng AI đang chấm câu viết…"
          stages={['Đọc câu viết', 'So ngữ pháp & sửa lỗi']}
          estimatedMs={8_000}
          onCancel={onCancel}
        />
      )}
      {!isOpen(item) && !ok && (
        <div className="flex items-center gap-1">
          <p lang="en" className="flex-1 text-sm text-slate-800 dark:text-slate-100">
            Đáp án: <b>{item.kind === 'choice' || item.kind === 'fill' ? filled(item, item.answer) : expectedOf(item)}</b>
          </p>
          <Listen text={item.kind === 'choice' || item.kind === 'fill' ? filled(item, item.answer) : expectedOf(item)} />
        </div>
      )}
      {why && <p className="text-sm text-slate-700 dark:text-slate-200">{why}</p>}
      {fb && (
        <>
          <p className="text-sm text-slate-800 dark:text-slate-100">{fb.explanationVi}</p>
          {fb.errorTag && fb.errorTag !== 'other' && !ok && (
            <span className="w-fit rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-tone-blush-fg dark:bg-slate-900/60">
              Lỗi: {ERROR_TAG_LABEL[fb.errorTag]}
            </span>
          )}
          {fb.corrected && fb.corrected !== fb.original && (
            <p lang="en" className="text-sm text-slate-800 dark:text-slate-100">
              <del className="text-slate-500">{fb.original}</del> → <b>{fb.corrected}</b>
            </p>
          )}
          {fb.natural && (
            <p lang="en" className="text-sm text-slate-800 dark:text-slate-100">
              Tự nhiên hơn: <i>{fb.natural}</i>
            </p>
          )}
          {fb.retryVi && !ok && <p className="text-sm text-slate-700 dark:text-slate-200">{fb.retryVi}</p>}
        </>
      )}
      {isOpen(item) && !busy && (
        <div className="flex items-start gap-1 border-t border-black/5 pt-2 dark:border-white/10">
          <p lang="en" className="flex-1 text-sm text-slate-700 dark:text-slate-200">
            Câu mẫu: <i>{(item as OpenItem).model}</i>
          </p>
          <Listen text={plain((item as OpenItem).model)} />
        </div>
      )}
    </div>
  );
}
