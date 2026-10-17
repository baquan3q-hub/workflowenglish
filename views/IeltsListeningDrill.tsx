import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Play, RotateCcw, Shuffle, Square, X } from 'lucide-react';
import { DRILL_CATEGORIES, DRILL_ITEMS, DRILL_SIZE, type DrillCategory, type DrillItem } from '../data/ielts/listening/drills';
import { gradeDrillAnswer, pickDrillItems } from '../services/listeningDrillLogic';
import { ANSWER_STATUS_LABELS, type AnswerStatus } from '../services/listeningLogic';
import { useClipPlayer, type ResolveClip } from '../components/ielts/listening/useClipPlayer';

interface Props {
  onBack: () => void;
  resolveClip?: ResolveClip;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

type Pick = DrillCategory | 'mixed';

interface Answered {
  item: DrillItem;
  given: string;
  status: AnswerStatus;
}

const clipOf = (item: DrillItem) => ({ id: `drill-${item.id}`, style: item.style, voice: item.voice, text: item.spoken });

export default function IeltsListeningDrill({ onBack, resolveClip }: Props) {
  const [category, setCategory] = useState<Pick | null>(null);
  const [items, setItems] = useState<DrillItem[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState<Answered[]>([]);
  const clip = useClipPlayer(resolveClip);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = items[index];
  const current = answered[index];
  const finished = category !== null && index >= items.length;
  const score = answered.filter((a) => a.status === 'correct').length;

  const start = (c: Pick) => {
    clip.stop();
    const pool = c === 'mixed' ? DRILL_ITEMS : DRILL_ITEMS.filter((i) => i.category === c);
    setCategory(c);
    setItems(pickDrillItems(pool, DRILL_SIZE));
    setIndex(0);
    setTyped('');
    setAnswered([]);
  };

  const check = () => {
    if (!item || current) return;
    setAnswered((a) => [...a, { item, given: typed.trim(), status: gradeDrillAnswer(typed, item.answers) }]);
  };

  const next = () => {
    clip.stop();
    setIndex((i) => i + 1);
    setTyped('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const playing = item && clip.activeId === `drill-${item.id}`;
  const loading = item && clip.loadingId === `drill-${item.id}`;
  const title = category === 'mixed' ? 'Trộn tất cả' : DRILL_CATEGORIES.find((c) => c.id === category)?.title;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10 anim-fade-up">
      <button
        type="button"
        onClick={() => {
          clip.stop();
          if (category) setCategory(null);
          else onBack();
        }}
        className={`${ghostBtn} -ml-3`}
      >
        <ArrowLeft className="h-4 w-4" /> {category ? 'Chọn dạng' : 'Quay lại'}
      </button>

      <header>
        <p className="text-caption font-medium text-slate-500 dark:text-slate-400">IELTS Listening · Luyện kỹ năng</p>
        <h1 className="mt-1 text-heading font-bold text-slate-900 dark:text-white">Số, tên và ngày</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {category
            ? `${title} · ${DRILL_SIZE} câu`
            : 'Phần lớn điểm Part 1 mất vì nghe nhầm số hoặc viết sai chính tả tên riêng. Mỗi lượt 8 câu ngắn, chấm như bài thi thật.'}
        </p>
      </header>

      {!category && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {DRILL_CATEGORIES.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => start(c.id)} className={`${panel} flex h-full w-full flex-col p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.title}</span>
                <span className="mt-0.5 flex-1 text-caption text-slate-500 dark:text-slate-400">{c.descriptionVi}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => start('mixed')} className={`${panel} flex h-full w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
              <Shuffle className="h-5 w-5 flex-shrink-0 text-slate-500" />
              <span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Trộn tất cả</span>
                <span className="block text-caption text-slate-500 dark:text-slate-400">Giống Part 1 thật: các dạng xen kẽ.</span>
              </span>
            </button>
          </li>
        </ul>
      )}

      {item && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="block h-full rounded-full bg-slate-900 transition-all dark:bg-white" style={{ width: `${(index / items.length) * 100}%` }} />
            </span>
            <span className="text-caption tabular-nums text-slate-500 dark:text-slate-400">
              {index + 1}/{items.length}
            </span>
          </div>

          <section className={`${panel} space-y-4 p-4 sm:p-5`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => clip.toggle(clipOf(item))} className={primaryBtn}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {loading ? 'Đang tải' : playing ? 'Dừng' : 'Nghe'}
              </button>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.promptVi}</p>
            </div>
            {clip.error && (
              <p role="alert" className="text-caption text-rose-600 dark:text-rose-400">
                {clip.error}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (current) next();
                else check();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                readOnly={!!current}
                aria-label={item.promptVi}
                placeholder="Đáp án"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-h-touch min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 read-only:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:read-only:bg-slate-900"
              />
              {current ? (
                <button type="submit" className={primaryBtn}>
                  {index + 1 < items.length ? 'Tiếp' : 'Kết quả'} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={!typed.trim()} className={primaryBtn}>
                  <Check className="h-4 w-4" /> Kiểm tra
                </button>
              )}
            </form>

            {current && (
              <div
                role="status"
                className={`rounded-xl p-3 text-sm ${
                  current.status === 'correct'
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100'
                    : 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100'
                }`}
              >
                <p className="flex items-center gap-1.5 font-semibold">
                  {current.status === 'correct' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {ANSWER_STATUS_LABELS[current.status]}
                  {current.status !== 'correct' && <span className="font-normal">· Đáp án: {item.answers[0]}</span>}
                </p>
                <p className="mt-1.5 text-caption opacity-90">"{item.spoken}"</p>
                {item.tipVi && <p className="mt-1 text-caption opacity-90">{item.tipVi}</p>}
              </div>
            )}
          </section>
        </>
      )}

      {finished && (
        <section className={`${panel} space-y-4 p-4 sm:p-5`}>
          <div>
            <p className="text-caption font-medium text-slate-500 dark:text-slate-400">Kết quả</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {score}
              <span className="text-lg text-slate-400">/{answered.length}</span>
            </p>
          </div>
          {answered.some((a) => a.status !== 'correct') && (
            <ul className="space-y-2">
              {answered
                .filter((a) => a.status !== 'correct')
                .map((a) => (
                  <li key={a.item.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                    <p className="font-medium text-slate-900 dark:text-white">{a.item.promptVi}</p>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300">
                      <span className="line-through opacity-70">{a.given || 'Bỏ trống'}</span>
                      {' → '}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">{a.item.answers[0]}</span>
                      <span className="ml-2 text-caption text-slate-500 dark:text-slate-400">{ANSWER_STATUS_LABELS[a.status]}</span>
                    </p>
                  </li>
                ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => start(category ?? 'mixed')} className={primaryBtn}>
              <RotateCcw className="h-4 w-4" /> Lượt mới
            </button>
            <button type="button" onClick={() => setCategory(null)} className={secondaryBtn}>
              Dạng khác
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
