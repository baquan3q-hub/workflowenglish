import React from 'react';
import { ArrowRight, BookMarked, Check, Clock, X } from 'lucide-react';
import type { Item, Lesson, Level } from '../../data/grammar/types';
import { getMeta, stageLessons, stages } from '../../data/grammar/meta';
import { chronological, type Attempt, type Snapshot } from '../../services/grammar/progress';
import type { Session } from '../../services/grammar/session';
import { primaryBtn, secondaryBtn } from '../ui/styles';
import { MODE_LABEL } from './PracticeRunner';
import { LEVEL_LABEL, StatusPill, card, stageTone } from './shared';

interface Props {
  session: Session;
  attempts: Attempt[];
  lessons: Map<string, Lesson>;
  aiItems?: Map<string, Item>;
  snap: Snapshot;
  /** Lesson to suggest next. */
  next?: string;
  onOpenLesson: (id: string) => void;
  onBook: () => void;
  onHome: () => void;
}

/** Last answer per task in the session: a retry replaces the first try on screen, not in the record. */
function finalAnswers(all: Attempt[], session: string) {
  const mine = all.filter((a) => a.session === session && a.result !== 'finished').sort(chronological);
  const byItem = new Map<string, Attempt>();
  for (const a of mine) byItem.set(a.lesson + '/' + a.itemId, a);
  return { mine, last: [...byItem.values()] };
}

export default function SessionResult({ session, attempts, lessons, aiItems, snap, next, onOpenLesson, onBook, onHome }: Props) {
  const { mine, last } = finalAnswers(attempts, session.id);
  const firstTry = new Map<string, Attempt>();
  for (const a of mine) if (!firstTry.has(a.itemId)) firstTry.set(a.itemId, a);
  const own = [...firstTry.values()].filter((a) => a.result === 'correct' && !a.assisted).length;
  const pending = last.filter((a) => a.result === 'pending').length;
  const wrong = mine.filter((a) => a.result === 'incorrect');
  const nextMeta = next ? getMeta(next) : undefined;

  if (session.mode === 'diagnostic') return <Placement {...{ session, last, snap, onOpenLesson, onHome }} />;

  const byLevel = ([1, 2, 3, 4, 5] as Level[])
    .map((lv) => ({ lv, list: last.filter((a) => a.level === lv) }))
    .filter((x) => x.list.length);
  const itemOf = (a: Attempt) => session.extraItems?.[a.itemId] ?? aiItems?.get(a.itemId) ?? lessons.get(a.lesson)?.items.find((i) => i.id === a.itemId);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="gr-result">
      <div className={card}>
        <p className="text-xs font-bold uppercase tracking-wide text-tone-periwinkle-fg">{MODE_LABEL[session.mode]}</p>
        <h2 id="gr-result" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          {own === firstTry.size ? 'Làm tốt lắm!' : 'Đã xong phiên luyện'}
        </h2>
        <p className="mt-1 text-[15px] text-slate-700 dark:text-slate-200">
          Tự làm đúng ngay lần đầu <b>{own}</b>/{firstTry.size} câu
          {pending ? ' · ' + pending + ' câu chờ AI nhận xét' : ''}.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {byLevel.map(({ lv, list }) => (
            <div key={lv} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-sm text-slate-600 dark:text-slate-300">{LEVEL_LABEL[lv]}</span>
              <span className="flex flex-wrap gap-1">
                {list.map((a) => (
                  <span
                    key={a.id}
                    aria-label={a.result === 'correct' ? 'Đúng' : a.result === 'pending' ? 'Chờ nhận xét' : 'Sai'}
                    className={
                      'flex h-6 w-6 items-center justify-center rounded-full ' +
                      (a.result === 'correct'
                        ? 'bg-tone-mint-soft text-tone-mint-fg'
                        : a.result === 'pending'
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          : 'bg-tone-blush-soft text-tone-blush-fg')
                    }
                  >
                    {a.result === 'correct' ? <Check className="h-3.5 w-3.5" /> : a.result === 'pending' ? <Clock className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {session.mode === 'checkpoint' && session.stage != null && (
        <div className={card}>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Theo từng bài trong {stages[session.stage].title}</h3>
          <ul className="mt-2 flex flex-col gap-1">
            {stageLessons(session.stage).map((m) => {
              const a = last.find((x) => x.lesson === m.id);
              return (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <button type="button" className="min-h-touch text-left font-semibold text-slate-800 underline-offset-4 hover:underline dark:text-slate-100" onClick={() => onOpenLesson(m.id)}>
                    {m.title}
                  </button>
                  <span className={a?.result === 'correct' ? 'text-tone-mint-fg' : a?.result === 'incorrect' ? 'text-tone-blush-fg' : 'text-slate-500'}>
                    {a ? (a.result === 'correct' ? 'Đạt' : a.result === 'pending' ? 'Chờ nhận xét' : 'Cần ôn') : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {wrong.length > 0 && (
        <div className={card}>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <BookMarked className="h-4 w-4 text-tone-blush-fg" aria-hidden="true" /> {wrong.length} lỗi đã vào Sổ lỗi
          </h3>
          <ul className="mt-2 flex flex-col gap-3">
            {wrong.slice(0, 4).map((a) => {
              const item = itemOf(a);
              return (
                <li key={a.id} className="text-sm">
                  <p lang="en" className="text-tone-blush-fg">
                    <del>{a.answer}</del>
                  </p>
                  <p lang="en" className="font-semibold text-tone-mint-fg">
                    {a.feedback?.corrected || a.expected}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">{a.feedback?.explanationVi || (item && 'why' in item ? item.why : '') || a.note || ''}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Ngày mai bài sẽ nhắc bạn ôn lại các câu này bằng ngữ cảnh mới.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {nextMeta && (
          <button type="button" className={primaryBtn} onClick={() => onOpenLesson(nextMeta.id)}>
            Bài tiếp theo: {nextMeta.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {wrong.length > 0 && (
          <button type="button" className={secondaryBtn} onClick={onBook}>
            Xem Sổ lỗi
          </button>
        )}
        <button type="button" className={nextMeta ? secondaryBtn : primaryBtn} onClick={onHome}>
          Về Hôm nay
        </button>
      </div>
    </section>
  );
}

function Placement({
  last,
  snap,
  onOpenLesson,
  onHome,
}: {
  session: Session;
  last: Attempt[];
  snap: Snapshot;
  onOpenLesson: (id: string) => void;
  onHome: () => void;
}) {
  const p = snap.placement;
  if (!p) return null;
  const stage = stages[p.stage];
  const first = stageLessons(p.stage).find((l) => !snap.known.has(l.id)) ?? stageLessons(p.stage)[0];
  const tone = stageTone(p.stage);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="gr-place">
      <div className={'rounded-2xl border p-5 ' + tone.border + ' ' + tone.bg}>
        <p className={'text-xs font-bold uppercase tracking-wide ' + tone.fg}>Kết quả chẩn đoán</p>
        <h2 id="gr-place" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          Bắt đầu ở {stage.title}
        </h2>
        <p className="mt-1 text-[15px] text-slate-800 dark:text-slate-100">{stage.outcome}</p>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
          Bài đầu tiên: <b>{first.title}</b>
        </p>
      </div>
      <div className={card}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Bạn đã làm</h3>
        <ul className="mt-2 flex flex-col gap-1">
          {last.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-700 dark:text-slate-200">
                {stages[getMeta(a.lesson)!.stage].title} · {getMeta(a.lesson)!.title}
              </span>
              {a.result === 'correct' ? <StatusPill status="known" /> : <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-tone-blush-fg">Cần học</span>}
            </li>
          ))}
        </ul>
        {p.passedStages.length > 0 && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Các bài ở chặng trước được đánh dấu "Đã biết qua chẩn đoán": bạn có thể bỏ qua, nhưng chúng chưa tính là "Vững" cho đến khi bạn ôn.
          </p>
        )}
      </div>
      <button type="button" className={primaryBtn} onClick={() => onOpenLesson(first.id)}>
        Vào bài {first.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" className={secondaryBtn} onClick={onHome}>
        Về Hôm nay
      </button>
    </section>
  );
}
