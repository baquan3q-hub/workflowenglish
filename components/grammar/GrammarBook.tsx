import React, { useEffect } from 'react';
import { Clock, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { getMeta } from '../../data/grammar/meta';
import type { Item, Lesson } from '../../data/grammar/types';
import type { Attempt, Snapshot } from '../../services/grammar/progress';
import type { GrammarErrorTag } from '../../supabase/functions/ai-proxy/ops/grammar';
import { primaryBtn, secondaryBtn } from '../ui/styles';
import AiProgress from '../ui/AiProgress';
import { ERROR_TAG_LABEL, KIND_LABEL, Listen, QuestionCountPicker, card } from './shared';

interface Props {
  snap: Snapshot;
  pending: Attempt[];
  lessons: Map<string, Lesson>;
  aiItems?: Map<string, Item>;
  ensure: (ids: string[]) => void;
  busy: boolean;
  aiBusy?: boolean;
  aiLabel?: string;
  onCancelAi?: () => void;
  questionCount: number;
  onChangeCount: (n: number) => void;
  tag: GrammarErrorTag | null;
  setTag: (tag: GrammarErrorTag | null) => void;
  onPractice: (lesson?: string) => void;
  onGenerateDrills?: (lesson: string, focusTag?: GrammarErrorTag) => void;
  onOpenLesson: (id: string) => void;
  onRegrade: (a: Attempt) => void;
  onRegradeAll?: () => void;
}

export default function GrammarBook({
  snap,
  pending,
  lessons,
  aiItems,
  ensure,
  busy,
  aiBusy,
  aiLabel,
  onCancelAi,
  questionCount,
  onChangeCount,
  tag,
  setTag,
  onPractice,
  onGenerateDrills,
  onOpenLesson,
  onRegrade,
  onRegradeAll,
}: Props) {
  const errors = [...snap.stats.values()].flatMap((s) => s.openErrors).sort((a, b) => b.at.localeCompare(a.at));
  const tags = [...new Set(errors.map((e) => e.feedback?.errorTag).filter((t): t is NonNullable<typeof t> => !!t))];
  const activeTag = tag && tags.includes(tag) ? tag : null;
  const shown = activeTag ? errors.filter((e) => e.feedback?.errorTag === activeTag) : errors;
  const byLesson = [...new Set(shown.map((e) => e.lesson))];
  const key = byLesson.join(',');
  useEffect(() => {
    if (byLesson.length) ensure(byLesson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!errors.length && !pending.length)
    return (
      <section className={card + ' text-center'}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sổ lỗi đang trống</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Câu bạn làm sai sẽ tự vào đây, kèm câu đúng và lời giải thích. Sửa đúng rồi thì lỗi tự rời sổ.
        </p>
      </section>
    );

  const why = (a: Attempt) => {
    const item = aiItems?.get(a.itemId) ?? lessons.get(a.lesson)?.items.find((i) => i.id === a.itemId);
    return a.feedback?.explanationVi || (item && 'why' in item ? item.why : '') || a.note || '';
  };
  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" /> {pending.length} câu chờ AI nhận xét
            </h2>
            {pending.length > 1 && onRegradeAll && (
              <button type="button" className={secondaryBtn} disabled={busy || aiBusy} onClick={onRegradeAll}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Nhận xét lại tất cả
              </button>
            )}
          </div>
          <ul className="mt-2 flex flex-col gap-3">
            {pending.map((a) => (
              <li key={a.id} className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-slate-500">
                  {getMeta(a.lesson)?.title} · {KIND_LABEL[a.kind]}
                </p>
                {a.prompt && <p className="text-sm text-slate-700 dark:text-slate-200">{a.prompt}</p>}
                <p lang="en" className="text-[15px] text-slate-900 dark:text-white">
                  {a.answer}
                </p>
                <button type="button" className={secondaryBtn + ' self-start'} disabled={busy || aiBusy} onClick={() => onRegrade(a)}>
                  Nhận xét lại
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {errors.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{errors.length} lỗi cần sửa</h2>
            <button type="button" className={primaryBtn} disabled={busy || aiBusy} onClick={() => onPractice(activeTag ? byLesson[0] : undefined)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Luyện lại ({questionCount} câu)
            </button>
          </div>
          <QuestionCountPicker count={questionCount} onChange={onChangeCount} disabled={busy || aiBusy} />
          {(aiBusy || (busy && !!onCancelAi)) && (
            <AiProgress
              tone="periwinkle"
              label={aiLabel || (aiBusy ? `AI đang tạo ${questionCount} câu luyện…` : 'AI đang chấm lại câu viết…')}
              stages={aiBusy ? ['Rà lỗi thường gặp', 'Soạn câu luyện mới'] : ['Đọc câu viết', 'Chấm & gợi ý sửa']}
              estimatedMs={aiBusy ? 12_000 : 10_000}
              onCancel={onCancelAi}
            />
          )}
          {tags.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Lọc theo loại lỗi">
              {[null, ...tags].map((t) => (
                <button
                  key={t ?? 'all'}
                  type="button"
                  aria-pressed={activeTag === t}
                  onClick={() => setTag(t)}
                  className={
                    'press min-h-touch shrink-0 rounded-xl border px-3 text-sm font-semibold ' +
                    (activeTag === t
                      ? 'border-tone-blush-border bg-tone-blush-soft text-tone-blush-fg'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')
                  }
                >
                  {t ? ERROR_TAG_LABEL[t] : 'Tất cả'}
                </button>
              ))}
            </div>
          )}
          {byLesson.map((id) => {
            const list = shown.filter((e) => e.lesson === id);
            const meta = getMeta(id)!;
            const lessonTag = activeTag ?? list.find((e) => e.feedback?.errorTag && e.feedback.errorTag !== 'other')?.feedback?.errorTag;
            return (
              <section key={id} className={card}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="min-h-touch text-left text-base font-bold text-slate-900 underline-offset-4 hover:underline dark:text-white" onClick={() => onOpenLesson(id)}>
                    {meta.title}
                  </button>
                  <span className="mt-2 shrink-0 rounded-full bg-tone-blush-soft px-2 text-xs font-semibold text-tone-blush-fg">{list.length}</span>
                </div>
                <ul className="mt-1 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {list.map((a) => {
                    const right = a.feedback?.corrected || a.expected;
                    return (
                      <li key={a.id} className="flex flex-col gap-1 py-3">
                        {a.prompt && a.kind !== 'fix' && <p className="text-sm text-slate-600 dark:text-slate-300">{a.prompt}</p>}
                        <p lang="en" className="text-[15px] text-tone-blush-fg">
                          <span aria-hidden="true">✗ </span>
                          <del>{a.answer}</del>
                        </p>
                        {right && (
                          <div className="flex items-center gap-1">
                            <p lang="en" className="flex-1 text-[15px] font-semibold text-tone-mint-fg">
                              <span aria-hidden="true">✓ </span>
                              {right}
                            </p>
                            <Listen text={right} />
                          </div>
                        )}
                        {why(a) && <p className="text-sm text-slate-700 dark:text-slate-200">{why(a)}</p>}
                        {a.feedback?.errorTag && a.feedback.errorTag !== 'other' && (
                          <span className="w-fit rounded-md bg-tone-blush px-1.5 text-xs font-semibold text-tone-blush-fg">{ERROR_TAG_LABEL[a.feedback.errorTag]}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <button type="button" className={secondaryBtn + ' flex-1'} disabled={busy || aiBusy} onClick={() => onPractice(id)}>
                    Luyện lại bằng câu mới
                  </button>
                  {onGenerateDrills && (
                    <button type="button" className={secondaryBtn + ' flex-1'} disabled={busy || aiBusy} onClick={() => onGenerateDrills(id, lessonTag)}>
                      {aiBusy ? <Loader2 className="h-4 w-4 animate-spin text-tone-periwinkle-fg" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-tone-periwinkle-fg" aria-hidden="true" />}
                      {aiBusy ? 'Đang tạo…' : `AI tạo ${questionCount} câu luyện lỗi này`}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
