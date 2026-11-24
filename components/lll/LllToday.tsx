import React from 'react';
import { BookCheck } from 'lucide-react';
import { Segmented } from '../ui/Segmented';
import { panel } from '../ui/styles';
import {
  LLL_DIFFICULTY, LLL_TOPICS, type LllDifficulty, type LllLevel, type LllPick, type LllTopic,
} from '../../services/lllLogic';
import LllCard from './LllCard';
import type { LllOpen } from './shared';

export const LLL_MINUTES = [5, 10, 20, 30] as const;
export type LllMinutes = (typeof LLL_MINUTES)[number];

export interface TodayFilters {
  minutes: LllMinutes;
  difficulty: LllDifficulty;
  topic: LllTopic | 'all';
}

interface Props {
  picks: LllPick[];
  filters: TodayFilters;
  onFilters: (f: TodayFilters) => void;
  target: LllLevel;
  week: { read: number; words: number };
  onOpen: (item: LllOpen) => void;
}

const chip = (on: boolean) =>
  `press min-h-touch shrink-0 rounded-full border px-3.5 text-sm font-medium ${on
    ? 'border-tone-lavender-border bg-tone-lavender text-tone-lavender-fg'
    : 'border-slate-200 bg-white text-slate-700 hover:border-tone-lavender-border dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`;

export default function LllToday({ picks, filters, onFilters, target, week, onOpen }: Props) {
  return (
    <section className="space-y-4" role="tabpanel" aria-label="Hôm nay">
      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <BookCheck className="h-4 w-4 text-tone-mint-fg" aria-hidden="true" />
        Tuần này: <strong className="text-slate-900 dark:text-white">{week.read} bài</strong> đã đọc · <strong className="text-slate-900 dark:text-white">{week.words} từ mới</strong> đã lưu
      </p>
      <div className={`${panel} space-y-3 p-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Độ khó <span className="font-normal text-slate-500 dark:text-slate-400">(đang chọn bài mức {target})</span></p>
            <Segmented label="Độ khó" value={filters.difficulty} onChange={(difficulty) => onFilters({ ...filters, difficulty })}
              options={(Object.keys(LLL_DIFFICULTY) as LllDifficulty[]).map((value) => ({ value, label: LLL_DIFFICULTY[value] }))} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Bạn có bao lâu?</p>
            <Segmented label="Thời gian rảnh" value={filters.minutes} onChange={(minutes) => onFilters({ ...filters, minutes })}
              options={LLL_MINUTES.map((value) => ({ value, label: `${value} phút` }))} />
          </div>
        </div>
        <div role="group" aria-label="Chủ đề" className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1 pb-1">
          <button type="button" aria-pressed={filters.topic === 'all'} className={chip(filters.topic === 'all')} onClick={() => onFilters({ ...filters, topic: 'all' })}>Tất cả</button>
          {(Object.keys(LLL_TOPICS) as LllTopic[]).map((topic) => (
            <button key={topic} type="button" aria-pressed={filters.topic === topic} className={chip(filters.topic === topic)} onClick={() => onFilters({ ...filters, topic })}>
              {LLL_TOPICS[topic]}
            </button>
          ))}
        </div>
      </div>
      {picks.length ? (
        <ul className="grid gap-3 md:grid-cols-3">
          {picks.map(({ item, reason }) => (
            <li key={item.url}><LllCard item={item} reason={reason} onOpen={() => onOpen({ link: item, reason })} /></li>
          ))}
        </ul>
      ) : (
        <p className={`${panel} p-5 text-sm`}>Chưa có bài phù hợp. Hãy thử thêm thời gian, đổi chủ đề, hoặc nhờ AI tìm ở tab “Hỏi AI”.</p>
      )}
    </section>
  );
}
