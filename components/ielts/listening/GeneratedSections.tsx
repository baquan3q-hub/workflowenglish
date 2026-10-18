import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleAlert, Loader2, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { GROUP_TYPE_LABELS, PART_DESCRIPTIONS_VI } from '../../../data/ielts/listening';
import { LISTENING_BLUEPRINTS } from '../../../supabase/functions/ai-proxy/ops/listeningGenerate.ts';
import { aiErrorMessage } from '../../../services/aiClient';
import {
  deleteGeneratedListening,
  DIFFICULTY_LABELS_VI,
  GeneratedCheckError,
  generatedTestId,
  generateListening,
  getGeneratedListening,
  TOPIC_IDEAS,
  type GenerateRequest,
  type GeneratedListening,
  type ListeningDifficulty,
  type ListeningPart,
} from '../../../services/listeningGenerationService';
import { Segmented } from '../../ui/Segmented';

/** Service calls, swappable for previews and tests. */
export interface GeneratedSectionsApi {
  list: (userId: string) => Promise<GeneratedListening[]>;
  generate: (userId: string, req: GenerateRequest) => Promise<GeneratedListening>;
  remove: (id: string) => Promise<boolean>;
}

const defaultApi: GeneratedSectionsApi = {
  list: (userId) => getGeneratedListening(userId),
  generate: generateListening,
  remove: deleteGeneratedListening,
};

interface Props {
  userId: string;
  onStart: (testId: string) => void;
  api?: GeneratedSectionsApi;
}

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const iconBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const tag = 'inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-caption font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300';
const label = 'text-caption font-semibold text-slate-700 dark:text-slate-200';

const DIFFICULTY_HINTS: Record<ListeningDifficulty, string> = {
  easy: 'Từ trong câu hỏi gần với từ trong bài nghe, ít câu bẫy. Hợp band 5–6.',
  medium: 'Câu hỏi diễn đạt lại ý trong bài (paraphrase), có vài câu bẫy. Hợp band 6–7.',
  hard: 'Paraphrase nhiều, người nói đổi ý và tự sửa lời. Hợp band 7–8.',
};

const partTypes = (part: ListeningPart) =>
  [...new Set(LISTENING_BLUEPRINTS[part].groups.map((g) => GROUP_TYPE_LABELS[g.type]))].join(', ');

const shortDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export default function GeneratedSections({ userId, onStart, api = defaultApi }: Props) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const [items, setItems] = useState<GeneratedListening[] | null>(null);
  const [part, setPart] = useState<ListeningPart>(1);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<ListeningDifficulty>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    apiRef.current
      .list(userId)
      .then((list) => live && setItems(list))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [userId]);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const item = await apiRef.current.generate(userId, { part, topic: topic.trim(), difficulty });
      setItems((prev) => [item, ...(prev ?? [])]);
      setTopic('');
    } catch (err) {
      setError(err instanceof GeneratedCheckError ? err.message : aiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setConfirmId(null);
    if (await apiRef.current.remove(id)) setItems((prev) => (prev ?? []).filter((g) => g.id !== id));
  };

  return (
    <section aria-labelledby="listening-ai">
      <h2 id="listening-ai" className="text-title font-semibold text-slate-900 dark:text-white">
        Đề do AI tạo
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Tạo thêm một part theo chủ đề và độ khó bạn chọn, đúng dạng câu hỏi của đề thật.
      </p>

      <div className={`${panel} mt-3 space-y-4 p-4 sm:p-5`}>
        <div>
          <p className={label}>
            Part
          </p>
          <Segmented<ListeningPart>
            className="mt-1.5"
            label="Part"
            value={part}
            onChange={(p) => setPart(p)}
            options={([1, 2, 3, 4] as const).map((p) => ({ value: p, label: `Part ${p}` }))}
          />
          <p className="mt-1.5 text-caption text-slate-500 dark:text-slate-400">
            {PART_DESCRIPTIONS_VI[part]}: {partTypes(part).toLowerCase()}. Câu {(part - 1) * 10 + 1}–{part * 10}.
          </p>
        </div>

        <div>
          <label htmlFor="gen-topic" className={label}>
            Chủ đề <span className="font-normal text-slate-500 dark:text-slate-400">(không bắt buộc)</span>
          </label>
          <input
            id="gen-topic"
            type="text"
            value={topic}
            maxLength={100}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Để trống để AI tự chọn"
            className="mt-1.5 block min-h-touch w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Gợi ý chủ đề">
            {TOPIC_IDEAS[part].map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setTopic(idea)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-caption text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>Độ khó</p>
          <Segmented<ListeningDifficulty>
            className="mt-1.5"
            label="Độ khó"
            value={difficulty}
            onChange={setDifficulty}
            options={(['easy', 'medium', 'hard'] as const).map((d) => ({ value: d, label: DIFFICULTY_LABELS_VI[d] }))}
          />
          <p className="mt-1.5 text-caption text-slate-500 dark:text-slate-400">{DIFFICULTY_HINTS[difficulty]}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={generate} disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? 'Đang tạo đề…' : 'Tạo đề'}
          </button>
          <p className="text-caption text-slate-500 dark:text-slate-400" aria-live="polite">
            {busy ? 'Thường mất 30–90 giây, kể cả bước kiểm tra.' : 'Tối đa 10 đề mỗi giờ.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        <p className="flex items-start gap-2 text-caption text-slate-500 dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          Mỗi đề được kiểm tra tự động trước khi hiện ra: đáp án có trong bài nghe, đúng giới hạn từ, có câu chứa đáp án và theo đúng thứ tự
          nghe.
        </p>
      </div>

      {items === null ? (
        <div className="mt-3 h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" aria-label="Đang tải đề đã tạo" />
      ) : items.length === 0 ? (
        <p className="mt-3 text-caption text-slate-500 dark:text-slate-400">Chưa có đề nào. Đề bạn tạo sẽ được lưu ở đây.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.id} className={`${panel} flex flex-col p-4`}>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-caption font-semibold text-slate-500 dark:text-slate-400">
                  Part {g.part} · {DIFFICULTY_LABELS_VI[g.difficulty]}
                  {shortDate(g.createdAt) && ` · ${shortDate(g.createdAt)}`}
                </p>
                {!g.saved && <span className={tag}>Chưa lưu</span>}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{g.section.title}</h3>
              <p className="mt-0.5 flex-1 text-caption text-slate-500 dark:text-slate-400">{g.section.contextVi}</p>
              {confirmId === g.id ? (
                <div className="mt-4 flex items-center gap-2">
                  <p className="flex-1 text-caption text-slate-600 dark:text-slate-300">Xoá đề này?</p>
                  <button type="button" onClick={() => setConfirmId(null)} className={`${secondaryBtn} px-3`}>
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g.id)}
                    className="inline-flex min-h-touch items-center justify-center rounded-xl bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Xoá
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <button type="button" onClick={() => onStart(generatedTestId(g.id))} className={`${secondaryBtn} flex-1`}>
                    Bắt đầu <ArrowRight className="h-4 w-4" />
                  </button>
                  {g.saved && (
                    <button type="button" onClick={() => setConfirmId(g.id)} className={iconBtn} aria-label={`Xoá đề ${g.section.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
