/**
 * "Đề AI tạo" in the Reading hub: pick a part, topic, difficulty and up to
 * three question types, have the AI write a passage, then practise it. Each
 * passage is checked with the same rules as the hand-written ones before it
 * shows up, and kept for the learner (reading_generated).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CircleAlert, Loader2, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { DIFFICULTY_LABELS } from '../../../data/ielts/reading';
import { GENERATED_KINDS, MAX_WANTED_KINDS, readingPlan } from '../../../supabase/functions/ai-proxy/ops/readingGenerate.ts';
import { aiErrorMessage } from '../../../services/aiClient';
import {
  generatedReadingTestId,
  READING_DIFFICULTY_HINTS,
  READING_TOPIC_IDEAS,
  ReadingCheckError,
  type GeneratedKind,
  type GeneratedReadingItem,
  type GenerateReadingRequest,
  type ReadingDifficulty,
  type ReadingPart,
} from '../../../services/readingGenerationLogic';
import { deleteGeneratedReading, generateReading, getGeneratedReading } from '../../../services/readingGenerationService';
import { GROUP_KINDS } from '../questions/parts';
import { IconTile } from '../../ui/IconTile';
import { toneClasses } from '../../ui/palette';
import { Segmented } from '../../ui/Segmented';
import { field, ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../../ui/styles';

/** Service calls, swappable for previews and tests. */
export interface GeneratedPassagesApi {
  list: (userId: string) => Promise<GeneratedReadingItem[]>;
  generate: (userId: string, req: GenerateReadingRequest) => Promise<GeneratedReadingItem>;
  remove: (id: string) => Promise<boolean>;
}

const defaultApi: GeneratedPassagesApi = {
  list: (userId) => getGeneratedReading(userId),
  generate: generateReading,
  remove: deleteGeneratedReading,
};

interface Props {
  userId: string;
  onStart: (testId: string, passageId: string) => void;
  api?: GeneratedPassagesApi;
}

const label = 'text-caption font-semibold text-slate-700 dark:text-slate-200';
const hint = 'text-caption text-slate-600 dark:text-slate-400';
const compactBtn = secondaryBtn.replace('px-4', 'px-3');

const PART_HINTS: Record<ReadingPart, string> = {
  1: 'Bài mô tả, nhiều dữ kiện. Dễ nhất trong ba passage.',
  2: 'Bài giải thích, bàn luận, nhiều quan điểm.',
  3: 'Bài lập luận học thuật, khó nhất, có quan điểm tác giả.',
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export default function GeneratedPassages({ userId, onStart, api = defaultApi }: Props) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const [items, setItems] = useState<GeneratedReadingItem[] | null>(null);
  const [part, setPart] = useState<ReadingPart>(1);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<ReadingDifficulty>('medium');
  const [kinds, setKinds] = useState<GeneratedKind[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    apiRef.current
      .list(userId)
      // A passage generated while the list was loading stays on top.
      .then((list) => live && setItems((prev) => [...(prev ?? []), ...list.filter((g) => !prev?.some((p) => p.id === g.id))]))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [userId]);

  const plan = useMemo(() => readingPlan(part, kinds), [part, kinds]);
  const total = plan.reduce((n, g) => n + g.count, 0);
  const full = kinds.length >= MAX_WANTED_KINDS;

  const toggle = (k: GeneratedKind) =>
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : prev.length >= MAX_WANTED_KINDS ? prev : [...prev, k]));

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const item = await apiRef.current.generate(userId, { part, topic: topic.trim(), difficulty, kinds });
      setItems((prev) => [item, ...(prev ?? [])]);
      setTopic('');
    } catch (err) {
      setError(err instanceof ReadingCheckError ? err.message : aiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (g: GeneratedReadingItem) => {
    setConfirmId(null);
    // An unsaved passage has no row to delete (the table may be missing): just drop it from the list.
    if (!g.saved) void apiRef.current.remove(g.id).catch(() => false);
    else if (!(await apiRef.current.remove(g.id))) return;
    setItems((prev) => (prev ?? []).filter((x) => x.id !== g.id));
  };

  return (
    <section aria-labelledby="reading-ai">
      <h2 id="reading-ai" className="flex items-center gap-2 text-title font-semibold text-slate-900 dark:text-white">
        <Wand2 className="h-5 w-5 text-tone-periwinkle-fg" aria-hidden /> Đề AI tạo
      </h2>
      <p className="mt-1 text-caption text-slate-600 dark:text-slate-400">Tạo thêm một passage theo chủ đề, độ khó và dạng câu bạn muốn luyện.</p>

      <div className={`${panel} mt-3 space-y-4 p-4 sm:p-5`}>
        <div>
          <p className={label}>Passage</p>
          <Segmented<ReadingPart>
            className="mt-1.5"
            label="Passage"
            value={part}
            onChange={setPart}
            options={([1, 2, 3] as const).map((p) => ({ value: p, label: `Passage ${p}` }))}
          />
          <p className={`mt-1.5 ${hint}`}>{PART_HINTS[part]}</p>
        </div>

        <div>
          <label htmlFor="reading-gen-topic" className={label}>
            Chủ đề <span className="font-normal text-slate-500 dark:text-slate-400">(không bắt buộc)</span>
          </label>
          <input
            id="reading-gen-topic"
            type="text"
            value={topic}
            maxLength={100}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Để trống để AI tự chọn"
            className={`${field} mt-1.5 block`}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Gợi ý chủ đề">
            {READING_TOPIC_IDEAS[part].map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setTopic(idea)}
                className="press rounded-full border border-tone-sky-border bg-tone-sky px-2.5 py-1 text-caption text-tone-sky-fg transition-colors hover:bg-tone-sky-soft"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>Độ khó</p>
          <Segmented<ReadingDifficulty>
            className="mt-1.5"
            label="Độ khó"
            value={difficulty}
            onChange={setDifficulty}
            options={(['easy', 'medium', 'hard'] as const).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
          />
          <p className={`mt-1.5 ${hint}`}>{READING_DIFFICULTY_HINTS[difficulty]}</p>
        </div>

        <div>
          <p className={label}>
            Dạng câu hỏi <span className="font-normal text-slate-500 dark:text-slate-400">(tối đa {MAX_WANTED_KINDS}, không bắt buộc)</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="Dạng câu hỏi muốn luyện">
            {GENERATED_KINDS.map((k) => {
              const info = GROUP_KINDS[k];
              const on = kinds.includes(k);
              const t = toneClasses(info.tone);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => toggle(k)}
                  className={`press group inline-flex min-h-touch items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                    on ? `${t.border} ${t.tile}` : 'border-slate-200 bg-white text-slate-700 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  <info.icon className={`icon-pop h-4 w-4 ${on ? '' : t.text}`} aria-hidden />
                  {info.label}
                </button>
              );
            })}
          </div>
          <p className={`mt-2 ${hint}`} aria-live="polite">
            {total} câu: {plan.map((g) => `${GROUP_KINDS[g.kind].label} ×${g.count}`).join(', ')}
            {kinds.length > 0 && plan.length > kinds.length && '. Thêm một dạng cho đủ số câu.'}
          </p>
          {kinds.length > 0 && (
            <button type="button" onClick={() => setKinds([])} className={`${ghostBtn} -ml-3 mt-1`}>
              Bỏ chọn, dùng dạng thường gặp
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={generate} disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {busy ? 'Đang tạo đề…' : 'Tạo đề'}
          </button>
          <p className={hint} aria-live="polite">
            {busy ? 'Thường mất 40–120 giây, kể cả bước kiểm tra.' : 'Tối đa 10 đề mỗi giờ.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-tone-blush-border bg-tone-blush p-3 text-sm text-tone-blush-fg">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <p className={`flex items-start gap-2 ${hint}`}>
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-tone-mint-fg" aria-hidden />
          Mỗi đề được kiểm tra tự động trước khi hiện ra: độ dài bài, bằng chứng có trong đúng đoạn, đáp án lấy từ bài và đúng giới hạn từ, thứ tự câu hỏi.
        </p>
      </div>

      {items === null ? (
        <div className="mt-3 h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" aria-label="Đang tải đề đã tạo" />
      ) : items.length === 0 ? (
        <p className={`mt-3 ${hint}`}>Chưa có đề nào. Đề bạn tạo sẽ được lưu ở đây.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.id} className={`${panel} lift group flex flex-col p-4`}>
              <div className="flex items-start gap-3">
                <IconTile icon={Wand2} tone="periwinkle" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-semibold text-slate-600 dark:text-slate-400">
                    Passage {g.part} · {DIFFICULTY_LABELS[g.difficulty]}
                    {shortDate(g.createdAt) && ` · ${shortDate(g.createdAt)}`}
                    {!g.saved && <span className={tag}>Chưa lưu</span>}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{g.passage.title}</h3>
                  {g.summaryVi && <p className={`mt-0.5 ${hint}`}>{g.summaryVi}</p>}
                </div>
              </div>
              <ul className="mt-2 flex flex-1 flex-wrap content-start gap-1.5" aria-label="Dạng câu hỏi">
                {g.plan.map((p) => (
                  <li key={p.kind} className={`rounded-md px-1.5 py-0.5 text-caption font-medium ${toneClasses(GROUP_KINDS[p.kind].tone).tile}`}>
                    {GROUP_KINDS[p.kind].label} ×{p.count}
                  </li>
                ))}
              </ul>
              {confirmId === g.id ? (
                <div className="mt-4 flex items-center gap-2">
                  <p className="flex-1 text-caption text-slate-700 dark:text-slate-300">Xoá đề này?</p>
                  <button type="button" onClick={() => setConfirmId(null)} className={compactBtn}>
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g)}
                    className="press inline-flex min-h-touch items-center justify-center rounded-xl border border-tone-blush-border bg-tone-blush-soft px-3 text-sm font-semibold text-tone-blush-fg hover:bg-tone-blush-border"
                  >
                    Xoá
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <button type="button" onClick={() => onStart(generatedReadingTestId(g.id), g.passage.id)} className={`${compactBtn} flex-1`}>
                    Bắt đầu <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setConfirmId(g.id)} className={ghostBtn} aria-label={`Xoá đề ${g.passage.title}`}>
                    <Trash2 className="h-4 w-4 text-tone-blush-fg" aria-hidden />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
