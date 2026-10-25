/**
 * "Đề AI tạo" in the Writing hub: pick a task, type, topic and level, have the
 * AI write a prompt (with chart data for Task 1), then practise it. Each prompt
 * is checked with the same rules as the admin's before it shows up, and kept
 * for the learner (writing_generated).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleAlert, Loader2, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { IeltsQuestion } from '../../../types';
import { aiErrorMessage } from '../../../services/aiClient';
import {
  WRITING_DIFFICULTY_HINTS,
  WRITING_TOPIC_IDEAS,
  WritingCheckError,
  type GeneratedWritingItem,
  type GenerateWritingRequest,
  type WritingDifficultyId,
  type WritingTaskId,
} from '../../../services/writingGenerationLogic';
import { deleteGeneratedWriting, generateWriting, getGeneratedWriting } from '../../../services/writingGenerationService';
import { QUESTION_TYPE_LABELS, TASK_LABELS, typesFor } from '../../../services/writingLibraryLogic';
import { IconTile } from '../../ui/IconTile';
import { toneClasses } from '../../ui/palette';
import { Segmented } from '../../ui/Segmented';
import { field, ghostBtn, panel, primaryBtn, secondaryBtn, tag } from '../../ui/styles';

/** Service calls, swappable for previews and tests. */
export interface GeneratedPromptsApi {
  list: (userId: string) => Promise<GeneratedWritingItem[]>;
  generate: (userId: string, req: GenerateWritingRequest) => Promise<GeneratedWritingItem>;
  remove: (id: string) => Promise<boolean>;
}

const defaultApi: GeneratedPromptsApi = { list: getGeneratedWriting, generate: generateWriting, remove: deleteGeneratedWriting };

interface Props {
  userId: string;
  onStart: (question: IeltsQuestion) => void;
  api?: GeneratedPromptsApi;
  /** Called when the saved prompts have loaded (and are available to the hub). */
  onListed?: () => void;
}

const label = 'text-caption font-semibold text-slate-700 dark:text-slate-200';
const hint = 'text-caption text-slate-600 dark:text-slate-400';
const compactBtn = secondaryBtn.replace('px-4', 'px-3');
const DIFFICULTY_LABELS: Record<WritingDifficultyId, string> = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };
const TYPE_TONE = ['sky', 'lavender', 'mint', 'peach', 'butter', 'aqua'] as const;

const shortDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export default function GeneratedPrompts({ userId, onStart, api = defaultApi, onListed }: Props) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const listedRef = useRef(onListed);
  listedRef.current = onListed;
  const [items, setItems] = useState<GeneratedWritingItem[] | null>(null);
  const [task, setTask] = useState<WritingTaskId>('task_2');
  const [questionType, setQuestionType] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<WritingDifficultyId>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    apiRef.current
      .list(userId)
      // A prompt generated while the list was loading stays on top.
      .then((list) => {
        if (!live) return;
        setItems((prev) => [...(prev ?? []), ...list.filter((g) => !prev?.some((p) => p.id === g.id))]);
        listedRef.current?.();
      })
      .catch(() => live && setItems((prev) => prev ?? []));
    return () => {
      live = false;
    };
  }, [userId]);

  const changeTask = (t: WritingTaskId) => {
    setTask(t);
    setQuestionType('');
  };

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const item = await apiRef.current.generate(userId, { task, questionType, topic: topic.trim(), difficulty });
      setItems((prev) => [item, ...(prev ?? [])]);
      setTopic('');
    } catch (err) {
      setError(err instanceof WritingCheckError ? err.message : aiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (g: GeneratedWritingItem) => {
    setConfirmId(null);
    // An unsaved prompt has no row to delete (the table may be missing): just drop it from the list.
    if (!g.saved) void apiRef.current.remove(g.id).catch(() => false);
    else if (!(await apiRef.current.remove(g.id))) return;
    setItems((prev) => (prev ?? []).filter((x) => x.id !== g.id));
  };

  return (
    <section aria-labelledby="writing-ai">
      <h2 id="writing-ai" className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
        <Wand2 className="h-4 w-4 text-tone-lavender-fg" aria-hidden /> Đề AI tạo
      </h2>
      <p className={`mt-1 ${hint}`}>Tạo thêm một đề Writing theo dạng bài, chủ đề và độ khó bạn muốn luyện.</p>

      <div className={`${panel} mt-3 space-y-4 p-4 sm:p-5`}>
        <div>
          <p className={label}>Task</p>
          <Segmented<WritingTaskId>
            className="mt-1.5"
            label="Task"
            value={task}
            onChange={changeTask}
            options={[
              { value: 'task_1', label: 'Task 1 · Biểu đồ' },
              { value: 'task_2', label: 'Task 2 · Luận' },
            ]}
          />
        </div>

        <div>
          <p className={label}>
            Dạng đề <span className="font-normal text-slate-500 dark:text-slate-400">(không bắt buộc)</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="Dạng đề">
            {[''].concat(typesFor(task) as string[]).map((t, i) => {
              const on = questionType === t;
              const tone = toneClasses(TYPE_TONE[(i + 5) % TYPE_TONE.length]);
              return (
                <button
                  key={t || 'auto'}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setQuestionType(t)}
                  className={`press inline-flex min-h-touch items-center rounded-xl border px-3 text-sm font-medium transition-colors ${
                    on ? `${tone.border} ${tone.tile} font-semibold` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {t ? QUESTION_TYPE_LABELS[t] : 'AI tự chọn'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="writing-gen-topic" className={label}>
            Chủ đề <span className="font-normal text-slate-500 dark:text-slate-400">(không bắt buộc)</span>
          </label>
          <input id="writing-gen-topic" type="text" value={topic} maxLength={100} onChange={(e) => setTopic(e.target.value)} placeholder="Để trống để AI tự chọn" className={`${field} mt-1.5 block`} />
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Gợi ý chủ đề">
            {WRITING_TOPIC_IDEAS[task].map((idea) => (
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
          <Segmented<WritingDifficultyId>
            className="mt-1.5"
            label="Độ khó"
            value={difficulty}
            onChange={setDifficulty}
            options={(['easy', 'medium', 'hard'] as const).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
          />
          <p className={`mt-1.5 ${hint}`}>{WRITING_DIFFICULTY_HINTS[difficulty]}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={generate} disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {busy ? 'Đang tạo đề…' : 'Tạo đề'}
          </button>
          <p className={hint} aria-live="polite">
            {busy ? 'Thường mất 10–40 giây, kể cả bước kiểm tra.' : 'Tối đa 15 đề mỗi giờ.'}
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
          Mỗi đề được kiểm tra tự động: độ dài, câu yêu cầu cuối đề, số liệu biểu đồ khớp số nhãn và cộng đủ 100% với biểu đồ tròn.
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
                <IconTile icon={Wand2} tone="lavender" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-semibold text-slate-600 dark:text-slate-400">
                    {TASK_LABELS[g.task]} · {QUESTION_TYPE_LABELS[g.question.questionType] ?? g.question.questionType} · {DIFFICULTY_LABELS[g.difficulty]}
                    {shortDate(g.createdAt) && ` · ${shortDate(g.createdAt)}`}
                    {!g.saved && <span className={tag}>Chưa lưu</span>}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-sm font-medium text-slate-900 dark:text-white">{g.question.prompt}</p>
                  {g.summaryVi && <p className={`mt-1 ${hint}`}>{g.summaryVi}</p>}
                </div>
              </div>
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
                  <button type="button" onClick={() => onStart(g.question)} className={`${compactBtn} flex-1`}>
                    Bắt đầu <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setConfirmId(g.id)} className={ghostBtn} aria-label={`Xoá đề ${g.question.topic}`}>
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
