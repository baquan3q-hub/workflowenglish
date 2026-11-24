import React, { useEffect, useState } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { getMeta } from '../../data/grammar/meta';
import type { Lesson } from '../../data/grammar/types';
import type { Attempt, Snapshot } from '../../services/grammar/progress';
import { primaryBtn, secondaryBtn } from '../ui/styles';
import { ERROR_TAG_LABEL, KIND_LABEL, card } from './shared';

interface Props {
  snap: Snapshot;
  pending: Attempt[];
  lessons: Map<string, Lesson>;
  ensure: (ids: string[]) => void;
  busy: boolean;
  onPractice: (lesson?: string) => void;
  onOpenLesson: (id: string) => void;
  onRegrade: (a: Attempt) => void;
}

export default function GrammarBook({ snap, pending, lessons, ensure, busy, onPractice, onOpenLesson, onRegrade }: Props) {
  const errors = [...snap.stats.values()].flatMap((s) => s.openErrors).sort((a, b) => b.at.localeCompare(a.at));
  const tags = [...new Set(errors.map((e) => e.feedback?.errorTag).filter((t): t is NonNullable<typeof t> => !!t))];
  const [tag, setTag] = useState<string | null>(null);
  const shown = tag ? errors.filter((e) => e.feedback?.errorTag === tag) : errors;
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
    const item = lessons.get(a.lesson)?.items.find((i) => i.id === a.itemId);
    return a.feedback?.explanationVi || (item && 'why' in item ? item.why : '');
  };
  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <section className={card}>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" /> {pending.length} câu chờ AI nhận xét
          </h2>
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
                <button type="button" className={secondaryBtn + ' self-start'} disabled={busy} onClick={() => onRegrade(a)}>
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
            <button type="button" className={primaryBtn} disabled={busy} onClick={() => onPractice(tag ? byLesson[0] : undefined)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Luyện lại
            </button>
          </div>
          {tags.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Lọc theo loại lỗi">
              {[null, ...tags].map((t) => (
                <button
                  key={t ?? 'all'}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(t)}
                  className={
                    'press min-h-touch shrink-0 rounded-xl border px-3 text-sm font-semibold ' +
                    (tag === t
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
            return (
              <section key={id} className={card}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="min-h-touch text-left text-base font-bold text-slate-900 underline-offset-4 hover:underline dark:text-white" onClick={() => onOpenLesson(id)}>
                    {meta.title}
                  </button>
                  <span className="mt-2 shrink-0 rounded-full bg-tone-blush-soft px-2 text-xs font-semibold text-tone-blush-fg">{list.length}</span>
                </div>
                <ul className="mt-1 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {list.map((a) => (
                    <li key={a.id} className="flex flex-col gap-1 py-3">
                      {a.prompt && a.kind !== 'fix' && <p className="text-sm text-slate-600 dark:text-slate-300">{a.prompt}</p>}
                      <p lang="en" className="text-[15px] text-tone-blush-fg">
                        <span aria-hidden="true">✗ </span>
                        <del>{a.answer}</del>
                      </p>
                      {(a.feedback?.corrected || a.expected) && (
                        <p lang="en" className="text-[15px] font-semibold text-tone-mint-fg">
                          <span aria-hidden="true">✓ </span>
                          {a.feedback?.corrected || a.expected}
                        </p>
                      )}
                      {why(a) && <p className="text-sm text-slate-700 dark:text-slate-200">{why(a)}</p>}
                      {a.feedback?.errorTag && a.feedback.errorTag !== 'other' && (
                        <span className="w-fit rounded-md bg-tone-blush px-1.5 text-xs font-semibold text-tone-blush-fg">{ERROR_TAG_LABEL[a.feedback.errorTag]}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <button type="button" className={secondaryBtn + ' mt-2 w-full'} disabled={busy} onClick={() => onPractice(id)}>
                  Luyện lại bằng câu mới
                </button>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
