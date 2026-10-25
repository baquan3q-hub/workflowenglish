/**
 * Edits one Writing library prompt: info, the prompt text, a chart for Task 1,
 * then check and publish. Nothing is stored until "Lưu nháp" or "Xuất bản";
 * leaving with changes asks first.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleAlert, CircleCheck, Loader2, Save, Send, Undo2, Wand2 } from 'lucide-react';
import IeltsChartRenderer from '../../IeltsChartRenderer';
import { aiErrorMessage } from '../../../services/aiClient';
import { STATUS_LABELS_VI } from '../../../services/listeningLibraryLogic';
import {
  chartLimitsText,
  parseSeriesText,
  QUESTION_TYPE_LABELS,
  seriesToText,
  setWritingType,
  splitList,
  TASK_LABELS,
  typesFor,
  writingItemProblems,
  type WritingLibraryItem,
  type WritingQuestionBody,
} from '../../../services/writingLibraryLogic';
import { WRITING_DIFFICULTIES, WRITING_TOPICS, type WritingChart } from '../../../supabase/functions/ai-proxy/ops/writingRules.ts';
import { Segmented } from '../../ui/Segmented';
import { BlurField, Field } from './fields';
import { dangerBtn, ghostBtn, hint, input, panel, primaryBtn, secondaryBtn, select, subPanel, tag } from './styles';

const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };

/** Asks the AI for a draft prompt to start from; resolves with the body to load. */
export type DraftWriter = (task: WritingLibraryItem['kind'], questionType: string) => Promise<WritingQuestionBody>;

interface Props {
  item: WritingLibraryItem;
  /** What is stored now: null for a prompt never saved. Defaults to `item`. */
  saved?: WritingLibraryItem | null;
  onSave: (item: WritingLibraryItem) => Promise<WritingLibraryItem>;
  onClose: () => void;
  /** Writes a draft with the AI; omitted when not available. */
  draftWithAi?: DraftWriter;
}

export default function WritingEditor({ item, saved: savedProp, onSave, onClose, draftWithAi }: Props) {
  const [draft, setDraft] = useState(item);
  const [saved, setSaved] = useState<WritingLibraryItem | null>(savedProp === undefined ? item : savedProp);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'unpublish' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const dirty = !saved || JSON.stringify(draft) !== JSON.stringify(saved);
  const problems = useMemo(() => writingItemProblems(draft), [draft]);
  const q = draft.question;
  const isTask1 = draft.kind === 'task_1';

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = (body: Partial<WritingQuestionBody>) => {
    setMessage(null);
    setDraft((d) => ({ ...d, question: { ...d.question, ...body } }));
  };
  const patchChart = (c: Partial<WritingChart>) => patch({ chartData: { ...(q.chartData as WritingChart), ...c } });

  const save = async (status: WritingLibraryItem['status'], kind: 'draft' | 'publish' | 'unpublish') => {
    const sent = draft;
    setSaving(kind);
    setMessage(null);
    try {
      const stored = await onSave({ ...sent, status });
      setDraft((d) => (d === sent ? stored : { ...d, status: stored.status, updatedAt: stored.updatedAt }));
      setSaved(stored);
      setMessage({
        kind: 'ok',
        text: kind === 'publish' ? 'Đã xuất bản. Học viên thấy đề trong danh sách đề Writing.' : kind === 'unpublish' ? 'Đã chuyển về bản nháp.' : 'Đã lưu nháp.',
      });
    } catch (err) {
      setMessage({ kind: 'error', text: `Không lưu được: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSaving(null);
    }
  };

  const writeWithAi = async () => {
    if (!draftWithAi) return;
    setAiBusy(true);
    setMessage(null);
    try {
      const body = await draftWithAi(draft.kind, q.questionType);
      setDraft((d) => ({ ...d, question: body }));
      setMessage({ kind: 'ok', text: 'AI đã soạn đề nháp. Hãy đọc lại và sửa trước khi xuất bản.' });
    } catch (err) {
      setMessage({ kind: 'error', text: aiErrorMessage(err) });
    } finally {
      setAiBusy(false);
    }
  };

  const leave = () => (dirty ? setConfirmLeave(true) : onClose());
  const types = typesFor(draft.kind);
  // The type the item has may be an older one (a bundled "positive_negative"); keep it selectable.
  const typeOptions = types.includes(q.questionType) ? types : [q.questionType, ...types];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={leave} className={ghostBtn}>
          <ArrowLeft className="h-4 w-4" /> Danh sách
        </button>
        <span className={tag}>{TASK_LABELS[draft.kind]}</span>
        <span className={tag}>{STATUS_LABELS_VI[draft.status]}</span>
        {dirty && <span className="text-caption text-tone-butter-fg">Chưa lưu</span>}
        <div className="ml-auto flex gap-2">
          {draftWithAi && (
            <button type="button" onClick={writeWithAi} disabled={aiBusy} className={secondaryBtn}>
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-tone-lavender-fg" />}
              <span className="hidden sm:inline">{aiBusy ? 'Đang soạn…' : 'AI soạn đề nháp'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              // A published prompt is live: never push a broken version to learners.
              if (draft.status === 'published' && problems.length > 0) {
                setMessage({ kind: 'error', text: 'Đề đang xuất bản: sửa hết các chỗ ở mục Kiểm tra trước khi lưu, hoặc gỡ xuống bản nháp.' });
                return;
              }
              void save(draft.status, 'draft');
            }}
            disabled={!!saving || !dirty}
            className={primaryBtn}
          >
            {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft.status === 'published' ? 'Lưu' : 'Lưu nháp'}
          </button>
        </div>
      </div>

      {confirmLeave && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl bg-tone-butter p-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-tone-butter-fg">Bạn có thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmLeave(false)} className={secondaryBtn}>
              Ở lại
            </button>
            <button type="button" onClick={onClose} className={dangerBtn}>
              Bỏ thay đổi
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-xl p-3 text-sm ${message.kind === 'ok' ? 'bg-tone-mint text-tone-mint-fg' : 'bg-tone-blush text-tone-blush-fg'}`}
        >
          {message.kind === 'ok' ? <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />}
          {message.text}
        </p>
      )}

      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 200) })}
        placeholder="Tên đề để tìm (bỏ trống thì lấy đầu đề bài)"
        aria-label="Tên đề"
        className="block w-full rounded-xl border border-transparent bg-transparent px-1 text-heading font-bold text-slate-900 placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600 dark:hover:border-slate-700"
      />

      <section className={`${panel} space-y-4 p-4 sm:p-5`} aria-label="Thông tin">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Dạng bài">
            <select value={q.questionType} onChange={(e) => setDraft(setWritingType(draft, e.target.value))} className={select}>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Chủ đề">
            <input list="writing-topics" value={q.topic} onChange={(e) => patch({ topic: e.target.value.slice(0, 40) })} placeholder="Technology" className={input} />
            <datalist id="writing-topics">
              {WRITING_TOPICS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <div>
            <span className="block text-caption font-semibold text-slate-700 dark:text-slate-200">Mức độ</span>
            <Segmented<string>
              label="Mức độ"
              className="mt-1.5"
              value={q.difficulty}
              onChange={(v) => patch({ difficulty: v as WritingQuestionBody['difficulty'] })}
              options={WRITING_DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
            />
          </div>
          <Field title="Band mục tiêu" help="Dạng 5.5-6.5">
            <input value={q.targetBand} onChange={(e) => patch({ targetBand: e.target.value.slice(0, 9) })} placeholder="6.0-7.0" className={input} />
          </Field>
        </div>

        <Field title="Đề bài" help={isTask1 ? 'Ví dụ: The line graph below shows… Summarise the information by selecting and reporting the main features.' : 'Kết thúc bằng yêu cầu rõ: Discuss both views and give your own opinion.'}>
          <BlurField multiline rows={isTask1 ? 4 : 5} value={q.prompt} onCommit={(t) => patch({ prompt: t.trim() })} aria-label="Đề bài" placeholder="The graph below shows…" />
        </Field>

        <Field title="Gợi ý lập dàn ý (tuỳ chọn)" help="Mỗi dòng một gợi ý, học viên thấy khi luyện tập.">
          <BlurField multiline rows={4} value={(q.planningPrompts ?? []).join('\n')} onCommit={(t) => patch({ planningPrompts: t.split('\n').map((s) => s.trim()).filter(Boolean) })} aria-label="Gợi ý dàn ý" />
        </Field>
        <Field title="Từ vựng gợi ý (tuỳ chọn)" help="Cách nhau bằng dấu phẩy.">
          <BlurField value={(q.vocabulary ?? []).join(', ')} onCommit={(t) => patch({ vocabulary: splitList(t) })} aria-label="Từ vựng gợi ý" />
        </Field>
      </section>

      {isTask1 && q.chartData && (
        <section className={`${panel} space-y-4 p-4 sm:p-5`} aria-label="Biểu đồ">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Số liệu biểu đồ</h3>
          <p className={hint}>Loại biểu đồ theo dạng bài ({q.chartData.type}). {chartLimitsText}. Dùng dấu chấm cho số thập phân.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Field title="Tiêu đề biểu đồ">
                <BlurField value={q.chartData.title} onCommit={(t) => patchChart({ title: t.trim() })} placeholder="Visitors to three museums (thousands)" aria-label="Tiêu đề biểu đồ" />
              </Field>
              <Field title="Nhãn" help="Năm, nhóm hoặc cột của bảng, cách nhau bằng dấu phẩy.">
                <BlurField value={q.chartData.labels.join(', ')} onCommit={(t) => patchChart({ labels: splitList(t) })} placeholder="2010, 2015, 2020" aria-label="Nhãn" />
              </Field>
              <Field title="Dãy số liệu" help={'Mỗi dòng một dãy: "Tên: số, số, số". Số lượng số bằng số nhãn.'}>
                <BlurField multiline rows={5} value={seriesToText(q.chartData)} onCommit={(t) => patchChart({ datasets: parseSeriesText(t) })} placeholder={'North: 12, 15, 21\nSouth: 8, 9, 14'} aria-label="Dãy số liệu" />
              </Field>
            </div>
            <div className={`${subPanel} p-3`}>
              <p className={`mb-2 ${hint}`}>Học viên sẽ thấy:</p>
              <IeltsChartRenderer data={q.chartData as never} />
            </div>
          </div>
        </section>
      )}

      <section className={`${panel} space-y-4 p-4 sm:p-5`} aria-label="Kiểm tra">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Kiểm tra và xuất bản</h3>
        {problems.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-tone-mint p-3 text-sm text-tone-mint-fg">
            <CircleCheck className="h-4 w-4 flex-shrink-0" /> Đề đã sẵn sàng để xuất bản.
          </p>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Cần sửa {problems.length} chỗ trước khi xuất bản</p>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {problems.map((p, i) => (
                <li key={i} className="flex items-start gap-2 py-2 text-sm">
                  <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-butter-fg" />
                  <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                    <b className="font-semibold text-slate-900 dark:text-white">{p.where}:</b> {p.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {draft.status === 'published' && (
            <button type="button" onClick={() => save('draft', 'unpublish')} disabled={!!saving} className={secondaryBtn}>
              {saving === 'unpublish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Gỡ xuống bản nháp
            </button>
          )}
          <button type="button" onClick={() => save('published', 'publish')} disabled={!!saving || problems.length > 0 || (draft.status === 'published' && !dirty)} className={primaryBtn}>
            {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {draft.status === 'published' ? 'Cập nhật bản đã xuất bản' : 'Xuất bản'}
          </button>
        </div>
      </section>
    </div>
  );
}
