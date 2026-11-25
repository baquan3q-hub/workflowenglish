import React, { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { getMeta, hubs, searchLessons, TENSE_GRID } from '../../data/grammar/meta';
import type { HubId } from '../../data/grammar/types';
import { atLeast, type Snapshot } from '../../services/grammar/progress';
import { field, ghostBtn } from '../ui/styles';
import { statusOf } from './GrammarPath';
import { StatusPill, card, stageTone } from './shared';

interface Props {
  snap: Snapshot;
  hub: HubId | null;
  setHub: (hub: HubId | null) => void;
  onOpenLesson: (id: string) => void;
}

const ROWS = ['Hiện tại', 'Quá khứ', 'Tương lai'];
const COLS = ['Đơn', 'Tiếp diễn', 'Hoàn thành', 'HT tiếp diễn'];

export default function GrammarTopics({ snap, hub, setHub, onOpenLesson }: Props) {
  const [query, setQuery] = useState('');
  const results = query.trim() ? searchLessons(query) : [];
  const current = hub ? hubs.find((h) => h.id === hub) : undefined;
  const progress = (ids: string[]) => ids.filter((id) => atLeast(snap.stats.get(id)!.status, 'understood')).length;

  const row = (id: string) => {
    const l = getMeta(id)!;
    return (
      <li key={id}>
        <button type="button" onClick={() => onOpenLesson(id)} className={'press flex w-full items-center gap-3 text-left ' + card}>
          <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ' + stageTone(l.stage).soft + ' ' + stageTone(l.stage).fg}>{l.cefr}</span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">{l.title}</span>
            <span className="block text-sm text-slate-600 dark:text-slate-300">{l.hook}</span>
          </span>
          <StatusPill status={statusOf(snap, id)} />
        </button>
      </li>
    );
  };

  if (current)
    return (
      <div className="flex flex-col gap-3">
        <button type="button" className={ghostBtn + ' -ml-3 self-start'} onClick={() => setHub(null)}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tất cả chuyên đề
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{current.title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{current.description}</p>
        </div>
        {current.id === 'tenses' && (
          <section className={card + ' overflow-x-auto'}>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Bảng 12 thì</h3>
            <table className="mt-2 w-full min-w-[20rem] border-separate border-spacing-1 text-center">
              <thead>
                <tr>
                  <th />
                  {COLS.map((c) => (
                    <th key={c} scope="col" className="text-[11px] font-semibold text-slate-500">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TENSE_GRID.map((ids, r) => (
                  <tr key={r}>
                    <th scope="row" className="pr-1 text-left text-[11px] font-semibold text-slate-500">
                      {ROWS[r]}
                    </th>
                    {ids.map((id) => {
                      const st = statusOf(snap, id);
                      const on = st !== 'new';
                      return (
                        <td key={id}>
                          <button
                            type="button"
                            onClick={() => onOpenLesson(id)}
                            aria-label={getMeta(id)!.title}
                            className={
                              'press flex min-h-touch w-full items-center justify-center rounded-lg px-1 text-[11px] font-semibold leading-tight ' +
                              (on ? 'bg-tone-mint-soft text-tone-mint-fg' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')
                            }
                          >
                            {getMeta(id)!.en.replace(/ tense$/i, '')}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">Ô màu xanh: bài bạn đã bắt đầu.</p>
          </section>
        )}
        <ul className="flex flex-col gap-2">{current.lessons.filter((id) => current.id !== 'tenses' || !TENSE_GRID.flat().includes(id)).map(row)}</ul>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">Tìm chuyên đề</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input className={field + ' pl-9'} enterKeyHint="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm: bị động, which, câu điều kiện…" />
      </label>
      {query.trim() ? (
        results.length ? (
          <ul className="flex flex-col gap-2">{results.map((l) => row(l.id))}</ul>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">Không thấy bài nào. Thử từ khóa khác, có dấu hoặc không dấu đều được.</p>
        )
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {hubs.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => setHub(h.id)} className={'press flex h-full w-full flex-col items-start gap-1 text-left ' + card}>
                <span className="text-base font-bold text-slate-900 dark:text-white">{h.title}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{h.description}</span>
                <span className="mt-1 text-xs font-semibold text-tone-periwinkle-fg">
                  {progress(h.lessons)}/{h.lessons.length} bài đã hiểu
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
