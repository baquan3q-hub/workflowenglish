/**
 * "Mục tiêu hôm nay": the automatic goals (open their screen) and the learner's
 * own (tick, add, delete) as pastel pills with their progress.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { toneClasses } from '../ui/palette';
import { Skeleton } from '../ui/States';
import { GOAL_TITLE_MAX, GOAL_TONES, type GoalKind, type GoalSummary, type GoalTone, type TodayGoal } from '../../services/dailyGoalsLogic';

const TONE_LABEL: Record<GoalTone, string> = { sky: 'Xanh trời', mint: 'Xanh bạc hà', lavender: 'Tím oải hương', peach: 'Cam đào', butter: 'Vàng bơ', blush: 'Hồng phấn' };

interface Props {
  /** null while today's goals load. */
  goals: TodayGoal[] | null;
  summary: GoalSummary;
  /** An automatic goal was pressed: open its screen. */
  onOpen: (kind: Exclude<GoalKind, 'custom'>) => void;
  onToggle: (id: string, done: boolean) => void;
  onAdd: (title: string, tone: GoalTone) => Promise<boolean>;
  onRemove: (id: string) => void;
  /** The pill or button under the pointer, for the mascot to look at. */
  onHoverTarget?: (el: HTMLElement | null) => void;
  /** Goal that was just ticked: its check pops. */
  poppedId?: string | null;
  error?: string | null;
  /** Shown under the list (e.g. goals kept in this browser before migration 016). */
  note?: string | null;
  /** The daily word goal select, moved here from the old hero. */
  dailyGoal?: { value: number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; disabled: boolean } | null;
}

export default function TodayGoals({ goals, summary, onOpen, onToggle, onAdd, onRemove, onHoverTarget, poppedId, error, note, dailyGoal }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState<GoalTone>('lavender');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  // A delete waiting for its second press gives up after a few seconds.
  useEffect(() => {
    if (!confirmId) return;
    const t = window.setTimeout(() => setConfirmId(null), 4000);
    return () => window.clearTimeout(t);
  }, [confirmId]);

  const hover = (e: React.PointerEvent<HTMLElement>) => onHoverTarget?.(e.currentTarget);
  const unhover = () => onHoverTarget?.(null);

  const closeAdd = () => {
    setAdding(false);
    setTitle('');
    requestAnimationFrame(() => addBtnRef.current?.focus());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const ok = await onAdd(title, tone);
    setSaving(false);
    if (ok) {
      setTitle('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center gap-3 sm:gap-2">
        <img
          src="/Glossy Calendar Achievement Icon.png"
          alt=""
          aria-hidden="true"
          className="h-14 w-14 sm:h-14 sm:w-14 flex-shrink-0 object-contain drop-shadow-sm select-none"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <h1 id="dash-primary" className="truncate text-lg font-bold leading-tight text-[#17264B] dark:text-white sm:text-title">
            Mục tiêu hôm nay
          </h1>
          {goals && (
            <p className="text-caption text-slate-600 dark:text-slate-400">
              <span className="font-semibold tabular-nums text-tone-mint-fg">
                {summary.done}/{summary.total}
              </span>{' '}
              mục đã xong
            </p>
          )}
        </div>
        <button
          ref={addBtnRef}
          type="button"
          onClick={() => (adding ? closeAdd() : setAdding(true))}
          onPointerEnter={hover}
          onPointerLeave={unhover}
          aria-expanded={adding}
          className="press inline-flex min-h-touch items-center gap-1.5 rounded-full border border-tone-lavender-border bg-tone-lavender px-3 text-sm font-semibold sm:px-4 text-tone-lavender-fg transition-colors duration-200 hover:bg-tone-lavender-soft"
        >
          {adding ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {adding ? 'Đóng' : 'Thêm'}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              closeAdd();
            }
          }}
          className="anim-bubble-in mt-4 space-y-3 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <label className="block">
            <span className="sr-only">Tên mục tiêu</span>
            <input
              ref={inputRef}
              value={title}
              maxLength={GOAL_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Đọc bài viết EdTech"
              className="min-h-touch w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-colors hover:border-tone-lavender-border focus:border-tone-lavender-fg focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Màu" className="flex flex-1 items-center gap-1">
              {GOAL_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tone === t}
                  aria-label={TONE_LABEL[t]}
                  onClick={() => setTone(t)}
                  className="press flex min-h-touch w-9 items-center justify-center rounded-full"
                >
                  <span
                    className={`h-6 w-6 rounded-full border-2 transition-transform duration-150 ${toneClasses(t).bar} ${tone === t ? 'scale-110 border-[#17264B] dark:border-white' : 'border-white dark:border-slate-900'
                      }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={closeAdd} className="press min-h-touch rounded-full px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Huỷ
              </button>
              <button
                type="submit"
                disabled={!title.trim() || saving}
                className="press min-h-touch rounded-full border border-tone-periwinkle-border bg-tone-periwinkle-soft px-5 text-sm font-semibold text-tone-periwinkle-fg hover:bg-tone-periwinkle-border disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>
        </form>
      )}

      {goals ? (
        <ul className="mt-4 space-y-2" aria-label="Mục tiêu hôm nay">
          {goals.map((g) => {
            const t = toneClasses(g.tone);
            const own = g.kind === 'custom';
            const ratio = g.progress ? Math.min(1, g.progress.value / Math.max(1, g.progress.max)) : 0;
            const count = g.progress && g.progress.max > 1 ? `${g.progress.value}/${g.progress.max}` : g.progress ? `${g.progress.value}/1` : null;
            const check = (
              <span
                key={g.done ? 'done' : 'todo'}
                className={`relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${t.border} ${g.done ? `${t.tile} ${poppedId === g.id ? 'anim-goal-pop' : ''}` : 'bg-white dark:bg-slate-900'
                  }`}
                aria-hidden
              >
                {g.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            );
            const body = (
              <>
                {check}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${g.done ? 'text-slate-500 line-through decoration-2 dark:text-slate-400' : 'text-[#17264B] dark:text-white'}`}>
                    {g.title}
                  </span>
                  {g.progress && g.progress.max > 1 && (
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900/60" aria-hidden>
                      <span className={`block h-full rounded-full ${t.bar} transition-[width] duration-500`} style={{ width: `${ratio * 100}%` }} />
                    </span>
                  )}
                </span>
                {count && <span className={`flex-shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-caption font-semibold tabular-nums dark:bg-slate-900/60 ${t.text}`}>{count}</span>}
                {!g.progress && <Skeleton className="h-5 w-10 rounded-full" />}
              </>
            );
            return (
              <li key={g.id} className="group/goal relative">
                {own ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={g.done}
                    onClick={() => onToggle(g.id, !g.done)}
                    onPointerEnter={hover}
                    onPointerLeave={unhover}
                    className={`press flex min-h-touch w-full min-w-0 items-center gap-3 rounded-full border py-2 pl-3 pr-14 text-left transition-colors duration-200 ${t.surface} hover:shadow-sm`}
                  >
                    {body}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(g.kind as Exclude<GoalKind, 'custom'>)}
                    onPointerEnter={hover}
                    onPointerLeave={unhover}
                    aria-label={`${g.title}${count ? `, ${count}` : ''}${g.done ? ', đã xong' : ''}`}
                    className={`press flex min-h-touch w-full min-w-0 items-center gap-3 rounded-full border px-3 py-2 text-left transition-colors duration-200 ${t.surface} hover:shadow-sm`}
                  >
                    {body}
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover/goal:translate-x-0.5 ${t.text}`} aria-hidden />
                  </button>
                )}
                {own &&
                  (confirmId === g.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(null);
                        onRemove(g.id);
                      }}
                      onBlur={() => setConfirmId(null)}
                      autoFocus
                      className="press absolute right-1 top-1/2 min-h-[36px] -translate-y-1/2 rounded-full bg-tone-blush px-3 text-caption font-semibold text-tone-blush-fg hover:bg-tone-blush-soft"
                    >
                      Xoá?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(g.id)}
                      aria-label={`Xoá mục tiêu ${g.title}`}
                      className="press absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-opacity duration-150 hover:bg-tone-blush hover:text-tone-blush-fg focus-visible:opacity-100 sm:opacity-0 sm:group-hover/goal:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-tone-blush px-3 py-2 text-caption text-tone-blush-fg">
          {error}
        </p>
      )}
      {note && <p className="mt-3 text-caption text-slate-500 dark:text-slate-400">{note}</p>}

      {dailyGoal && (
        <label className="mt-4 flex flex-wrap items-center gap-2 text-caption text-slate-600 dark:text-slate-300">
          Mỗi ngày ôn ít nhất
          <select
            value={dailyGoal.value}
            onChange={dailyGoal.onChange}
            disabled={dailyGoal.disabled}
            className="min-h-touch rounded-full border border-tone-mint-border bg-tone-mint px-3 text-sm font-medium text-tone-mint-fg outline-none transition-colors hover:bg-tone-mint-soft focus-visible:ring-2 focus-visible:ring-tone-mint-accent disabled:opacity-60"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n} từ
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
