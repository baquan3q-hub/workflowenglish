import React from 'react';
import { ArrowRight, BookMarked, CalendarClock, Compass, Play, Sprout } from 'lucide-react';
import { getMeta, hubs, lessons, QUICK_HUBS, stages } from '../../data/grammar/meta';
import type { HubId } from '../../data/grammar/types';
import { isDone, type Recommendation, type Snapshot } from '../../services/grammar/progress';
import type { Session } from '../../services/grammar/session';
import type { ModuleState } from '../../services/grammar/store';
import type { GrammarErrorTag } from '../../supabase/functions/ai-proxy/ops/grammar';
import { primaryBtn, secondaryBtn } from '../ui/styles';
import { MODE_LABEL } from './PracticeRunner';
import { ERROR_TAG_LABEL, LESSON_STEPS, card, stageTone } from './shared';

interface Props {
  snap: Snapshot;
  state: ModuleState;
  draft: Session | null;
  rec: Recommendation;
  current?: string;
  firstVisit: boolean;
  stats: { applied: number; solid: number; studied: number; total: number; independentRate: number | null; delayedRate: number | null };
  dueCount: number;
  errorCount: number;
  pendingCount: number;
  topErrors: { tag: GrammarErrorTag; count: number }[];
  goalLabel?: string;
  busy: boolean;
  onOpenLesson: (id: string) => void;
  onPlacement: () => void;
  onZero: () => void;
  onRecommended: () => void;
  onResume: () => void;
  onBook: () => void;
  onErrorTag: (tag: GrammarErrorTag) => void;
  onHub: (hub: HubId) => void;
}

export default function GrammarToday(p: Props) {
  if (p.firstVisit) return <FirstVisit {...p} />;
  const currentMeta = p.current ? getMeta(p.current) : undefined;
  const step = p.current && p.state.current?.lesson === p.current ? p.state.current.step : 0;
  const afterCurrent = currentMeta ? lessons.slice(lessons.indexOf(currentMeta) + 1) : lessons;
  const upNext = afterCurrent.filter((l) => !isDone(p.snap, l.id)).slice(0, 2);
  const urgent = p.rec.mode === 'review' || p.rec.mode === 'errors' ? p.rec : null;
  const urgentMeta = urgent ? getMeta(urgent.lesson) : undefined;
  return (
    <div className="flex flex-col gap-4">
      {p.draft && (
        <button type="button" onClick={p.onResume} disabled={p.busy} className={'press flex items-center gap-3 text-left ' + card + ' border-tone-periwinkle-border'}>
          <Play className="h-5 w-5 shrink-0 text-tone-periwinkle-fg" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Phiên đang dở: {MODE_LABEL[p.draft.mode]}</span>
            <span className="block text-sm text-slate-600 dark:text-slate-300">
              {getMeta(p.draft.tasks[p.draft.index].lesson)?.title} · làm tiếp từ câu {p.draft.index + 1}/{p.draft.tasks.length}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-tone-periwinkle-fg" aria-hidden="true" />
        </button>
      )}

      {urgent && urgentMeta && (
        <section className="rounded-2xl border border-tone-butter-border bg-tone-butter p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-tone-butter-fg">
            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Làm trước 5 phút
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {urgent.mode === 'review' ? 'Ôn' : 'Sửa lỗi'}: {urgentMeta.title}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-200">{urgent.reason}</p>
          <button type="button" className={primaryBtn + ' mt-3 w-full'} disabled={p.busy} onClick={p.onRecommended}>
            {urgent.mode === 'review' ? 'Ôn ngay' : 'Sửa ngay'}
          </button>
        </section>
      )}

      {currentMeta && (
        <section className={'rounded-2xl border p-4 ' + stageTone(currentMeta.stage).border + ' ' + stageTone(currentMeta.stage).bg}>
          <p className={'text-xs font-bold uppercase tracking-wide ' + stageTone(currentMeta.stage).fg}>
            Đang học · {stages[currentMeta.stage].title}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{currentMeta.title}</h2>
          <p className="text-sm text-slate-700 dark:text-slate-200">{currentMeta.hook}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/70 dark:bg-slate-900/50">
              <div className={'h-full rounded-full ' + stageTone(currentMeta.stage).accent} style={{ width: (100 * step) / LESSON_STEPS.length + '%' }} />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Bước {step + 1}/{LESSON_STEPS.length}
            </span>
          </div>
          <button type="button" className={(urgent ? secondaryBtn : primaryBtn) + ' mt-3 w-full'} disabled={p.busy} onClick={() => p.onOpenLesson(currentMeta.id)}>
            {step > 0 ? 'Học tiếp: ' + LESSON_STEPS[step] : 'Vào bài'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      )}

      {upNext.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Tiếp theo</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {upNext.map((l) => (
              <button key={l.id} type="button" onClick={() => p.onOpenLesson(l.id)} className={'press flex items-center gap-3 text-left ' + card}>
                <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ' + stageTone(l.stage).soft + ' ' + stageTone(l.stage).fg}>{l.cefr}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">{l.title}</span>
                  <span className="block truncate text-sm text-slate-600 dark:text-slate-300">{l.hook}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <button type="button" onClick={p.onRecommended} disabled={!p.dueCount || p.busy} className={'press text-left disabled:opacity-60 ' + card}>
          <CalendarClock className="h-5 w-5 text-tone-butter-fg" aria-hidden="true" />
          <span className="mt-1 block text-2xl font-bold text-slate-900 dark:text-white">{p.dueCount}</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">bài đến hạn ôn</span>
        </button>
        <button type="button" onClick={p.onBook} className={'press text-left ' + card}>
          <BookMarked className="h-5 w-5 text-tone-blush-fg" aria-hidden="true" />
          <span className="mt-1 block text-2xl font-bold text-slate-900 dark:text-white">{p.errorCount}</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">
            lỗi cần sửa{p.pendingCount ? ' · ' + p.pendingCount + ' chờ AI' : ''}
          </span>
        </button>
      </section>

      <section className={card}>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Tiến độ</h2>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Bài vận dụng được" value={p.stats.applied + '/' + p.stats.total} />
          <Stat label="Tự làm đúng" value={p.stats.independentRate == null ? '—' : p.stats.independentRate + '%'} />
          <Stat label="Đúng khi ôn trễ" value={p.stats.delayedRate == null ? '—' : p.stats.delayedRate + '%'} />
        </dl>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
          <div className="bg-tone-mint-fg" style={{ width: (100 * p.stats.solid) / p.stats.total + '%' }} />
          <div className="bg-tone-mint-accent" style={{ width: (100 * (p.stats.applied - p.stats.solid)) / p.stats.total + '%' }} />
          <div className="bg-tone-sky-accent" style={{ width: (100 * (p.stats.studied - p.stats.applied)) / p.stats.total + '%' }} />
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {p.stats.studied} bài đã bắt đầu · {p.stats.solid} bài vững (đúng cả khi ôn trễ)
        </p>
      </section>

      {p.topErrors.length > 0 && (
        <section className={card}>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Lỗi hay gặp cần chú ý</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.topErrors.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() => p.onErrorTag(tag)}
                className="press min-h-touch rounded-xl border border-tone-blush-border bg-tone-blush-soft px-3 text-sm font-semibold text-tone-blush-fg hover:bg-tone-blush"
              >
                {ERROR_TAG_LABEL[tag]} · {count}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={card + ' flex items-center gap-3'}>
        <Compass className="h-5 w-5 shrink-0 text-tone-periwinkle-fg" aria-hidden="true" />
        <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
          {p.snap.placement ? 'Chẩn đoán: bắt đầu ở ' + stages[p.snap.placement.stage].title + '.' : 'Chưa làm chẩn đoán đầu vào.'}
        </p>
        <button type="button" className={secondaryBtn + ' shrink-0'} disabled={p.busy} onClick={p.onPlacement}>
          {p.snap.placement ? 'Làm lại' : 'Làm (7 phút)'}
        </button>
      </section>

      <HubChips onHub={p.onHub} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-lg font-bold text-slate-900 dark:text-white">{value}</dd>
      <dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt>
    </div>
  );
}

function FirstVisit(p: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-tone-periwinkle-border bg-tone-periwinkle p-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bạn muốn bắt đầu thế nào?</h2>
        <p className="mt-1 text-[15px] text-slate-700 dark:text-slate-200">
          Lộ trình có 7 chặng, {lessons.length} bài: từ câu đơn giản nhất đến cấu trúc học thuật cho IELTS
          {p.goalLabel ? '. Mục tiêu của bạn: ' + p.goalLabel : ''}.
        </p>
      </section>
      <button type="button" disabled={p.busy} onClick={p.onPlacement} className={'press flex items-start gap-3 text-left ' + card + ' border-tone-periwinkle-border'}>
        <Compass className="mt-0.5 h-6 w-6 shrink-0 text-tone-periwinkle-fg" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-base font-bold text-slate-900 dark:text-white">Làm bài chẩn đoán (≈7 phút)</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">
            Tối đa 14 câu, từ dễ đến khó. Dừng ngay ở chặng bạn còn hổng và gợi ý bài đầu tiên.
          </span>
        </span>
        <ArrowRight className="mt-1 h-4 w-4 text-tone-periwinkle-fg" aria-hidden="true" />
      </button>
      <button type="button" disabled={p.busy} onClick={p.onZero} className={'press flex items-start gap-3 text-left ' + card}>
        <Sprout className="mt-0.5 h-6 w-6 shrink-0 text-tone-mint-fg" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-base font-bold text-slate-900 dark:text-white">Bắt đầu từ con số 0</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">
            Mất gốc hoặc lâu không học: đi từ bài đầu tiên "{lessons[0].title}", giải thích bằng tiếng Việt từng bước.
          </span>
        </span>
        <ArrowRight className="mt-1 h-4 w-4 text-slate-400" aria-hidden="true" />
      </button>
      <HubChips onHub={p.onHub} />
    </div>
  );
}

function HubChips({ onHub }: { onHub: (hub: HubId) => void }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Hoặc mở thẳng chuyên đề</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_HUBS.map((id) => {
          const h = hubs.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onHub(id)}
              className="press min-h-touch rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {h.title}
            </button>
          );
        })}
      </div>
    </section>
  );
}

