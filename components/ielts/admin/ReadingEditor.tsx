/**
 * Edits one Reading library test in steps: info, passage text, questions,
 * then check and publish. Nothing is stored until "Lưu nháp" or "Xuất bản";
 * leaving with changes asks first.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CircleAlert, CircleCheck, Eye, Highlighter, Loader2, Save, Send, Undo2, Wand2, X } from 'lucide-react';
import { DIFFICULTY_LABELS } from '../../../data/ielts/reading';
import type { ReadingDifficulty, ReadingPassage } from '../../../data/ielts/reading/types';
import { aiErrorMessage } from '../../../services/aiClient';
import { STATUS_LABELS_VI } from '../../../services/listeningLibraryLogic';
import {
  glossaryText,
  PART_MINUTES,
  PASSAGE_WORDS,
  paragraphsText,
  parseGlossary,
  readingLibraryProblems,
  readingQuestionsMissingNotes,
  setPassage,
  setParagraphs,
  setPracticePart,
  splitParagraphs,
  type ReadingLibraryItem,
  type ReadingNotesOutcome,
  type ReadingPart,
} from '../../../services/readingLibraryLogic';
import { suggestReadingNotes as defaultSuggest } from '../../../services/readingLibraryService';
import { passageWordCount } from '../../../services/readingLogic';
import { Segmented } from '../../ui/Segmented';
import { Tabs } from '../../ui/Tabs';
import { BlurField, Field } from './fields';
import ReadingQuestionEditor, { type PassagePick } from './ReadingQuestionEditor';
import { dangerBtn, ghostBtn, hint, input, panel, primaryBtn, secondaryBtn, select, subPanel, tag, textarea } from './styles';

type Step = 'info' | 'text' | 'questions' | 'check';

const STEPS: { id: Step; label: string }[] = [
  { id: 'info', label: 'Thông tin' },
  { id: 'text', label: 'Bài đọc' },
  { id: 'questions', label: 'Câu hỏi' },
  { id: 'check', label: 'Kiểm tra' },
];

const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as ReadingDifficulty[];

interface Props {
  item: ReadingLibraryItem;
  /** What is stored now: null for a test never saved. Defaults to `item`. */
  saved?: ReadingLibraryItem | null;
  /** Stores the test; resolves with what was stored. */
  onSave: (item: ReadingLibraryItem) => Promise<ReadingLibraryItem>;
  onClose: () => void;
  /** Opens the draft on the practice screen without saving an attempt. */
  onPreview: (draft: ReadingLibraryItem, saved: ReadingLibraryItem | null) => void;
  suggest?: (passage: ReadingPassage) => Promise<ReadingNotesOutcome>;
}

function WordCount({ passage }: { passage: ReadingPassage }) {
  const words = passageWordCount(passage);
  const ok = words >= PASSAGE_WORDS.min && words <= PASSAGE_WORDS.max;
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-caption font-semibold tabular-nums ${ok ? 'bg-tone-mint text-tone-mint-fg' : 'bg-tone-butter text-tone-butter-fg'}`}>
      {words} từ{ok ? '' : ` · chuẩn ${PASSAGE_WORDS.min}–${PASSAGE_WORDS.max}`}
    </span>
  );
}

/**
 * The passage beside the questions. Selecting words inside one paragraph
 * reports them, so a question can take them as its evidence.
 */
function PassagePanel({ passage, pick, onPick }: { passage: ReadingPassage; pick: PassagePick | null; onPick: (p: PassagePick | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const read = () => {
      const sel = document.getSelection();
      const text = sel?.toString().trim();
      if (!sel || !text || !ref.current) return;
      const para = (n: Node | null) => (n instanceof Element ? n : n?.parentElement)?.closest<HTMLElement>('[data-para]');
      const a = para(sel.anchorNode);
      // Only words inside one paragraph of this panel count.
      if (!a || a !== para(sel.focusNode) || !ref.current.contains(a)) return;
      onPick({ label: a.dataset.para ?? '', text });
    };
    document.addEventListener('selectionchange', read);
    return () => document.removeEventListener('selectionchange', read);
  }, [onPick]);

  return (
    <div className={`${subPanel} flex max-h-[45vh] flex-col lg:max-h-[calc(100vh-6rem)]`}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <Highlighter className="h-4 w-4 flex-shrink-0 text-tone-mint-fg" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-caption text-slate-600 dark:text-slate-300">
          {pick ? (
            <>
              Đoạn {pick.label}: “{pick.text.length > 60 ? `${pick.text.slice(0, 60)}…` : pick.text}”
            </>
          ) : (
            'Bôi đen câu chứa đáp án, rồi bấm "Dùng chỗ bôi đen" ở câu hỏi'
          )}
        </p>
        {pick && (
          <button type="button" onClick={() => onPick(null)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Bỏ chọn">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div ref={ref} className="space-y-3 overflow-y-auto p-3 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
        {passage.paragraphs.length === 0 && <p className={hint}>Chưa có bài đọc: dán ở bước Bài đọc.</p>}
        {passage.paragraphs.map((p) => (
          <p key={p.label} data-para={p.label} className="selection:bg-tone-mint-soft">
            <b className="mr-1.5 select-none font-bold text-tone-periwinkle-fg">{p.label}</b>
            {p.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ReadingEditor({ item, saved: savedProp, onSave, onClose, onPreview, suggest = defaultSuggest }: Props) {
  const [draft, setDraft] = useState(item);
  const [saved, setSaved] = useState<ReadingLibraryItem | null>(savedProp === undefined ? item : savedProp);
  const [step, setStep] = useState<Step>('info');
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'unpublish' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesInfo, setNotesInfo] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pick, setPick] = useState<PassagePick | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirty = !saved || JSON.stringify(draft) !== JSON.stringify(saved);
  const at = Math.min(index, draft.passages.length - 1);
  const passage = draft.passages[at];
  const problems = useMemo(() => readingLibraryProblems(draft), [draft]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // A pick from another passage is no evidence for this one.
  useEffect(() => setPick(null), [passage.id]);

  const update = (p: ReadingPassage) => {
    setMessage(null);
    setDraft((d) => setPassage(d, at, p));
  };

  const save = async (status: ReadingLibraryItem['status'], kind: 'draft' | 'publish' | 'unpublish') => {
    const sent = draft;
    setSaving(kind);
    setMessage(null);
    try {
      const stored = await onSave({ ...sent, status });
      // Edits typed while saving stay, and show as unsaved.
      setDraft((d) => (d === sent ? stored : { ...d, status: stored.status, updatedAt: stored.updatedAt }));
      setSaved(stored);
      setMessage({
        kind: 'ok',
        text: kind === 'publish' ? 'Đã xuất bản. Học viên thấy đề trong mục "Đề luyện thêm".' : kind === 'unpublish' ? 'Đã chuyển về bản nháp.' : 'Đã lưu nháp.',
      });
    } catch (err) {
      setMessage({ kind: 'error', text: `Không lưu được: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSaving(null);
    }
  };

  const fillNotes = async () => {
    setNotesBusy(true);
    setNotesInfo('');
    try {
      const before = passage;
      const out = await suggest(before);
      // The notes were made for the passage as it was; never undo edits made meanwhile.
      if (draftRef.current.passages[at] !== before) {
        setNotesInfo('Bạn đã sửa passage này trong lúc chờ AI nên ghi chú chưa được điền. Bấm lại để thử lần nữa.');
        return;
      }
      setMessage(null);
      setDraft((d) => ({ ...d, passages: d.passages.map((x, i) => (i === at ? out.passage : x)) }));
      const parts = [out.filled.length ? `Đã điền ghi chú cho ${out.filled.length} câu.` : 'Không có ghi chú mới.'];
      if (out.rejected.length) parts.push(`Câu ${out.rejected.join(', ')}: AI trích câu không có trong bài đọc, bạn tự điền nhé.`);
      parts.push('Hãy đọc lại trước khi xuất bản.');
      setNotesInfo(parts.join(' '));
    } catch (err) {
      setNotesInfo(aiErrorMessage(err));
    } finally {
      setNotesBusy(false);
    }
  };

  const leave = () => (dirty ? setConfirmLeave(true) : onClose());
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const missingNotes = readingQuestionsMissingNotes(passage);
  const passageProblems = problems.filter((p) => p.passageId === passage.id).length;
  const patch = (p: Partial<ReadingPassage>) => update({ ...passage, ...p });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={leave} className={ghostBtn}>
          <ArrowLeft className="h-4 w-4" /> Danh sách
        </button>
        <span className={tag}>{STATUS_LABELS_VI[draft.status]}</span>
        {dirty && <span className="text-caption text-amber-700 dark:text-amber-400">Chưa lưu</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => onPreview(draft, saved)} className={secondaryBtn}>
            <Eye className="h-4 w-4" /> <span className="hidden sm:inline">Xem thử</span>
          </button>
          <button
            type="button"
            onClick={() => {
              // A published test is live: never push a broken version to learners.
              if (draft.status === 'published' && problems.length > 0) {
                setStep('check');
                setMessage({ kind: 'error', text: 'Đề đang xuất bản: sửa hết các chỗ dưới đây trước khi lưu, hoặc gỡ xuống bản nháp.' });
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
        <div role="alert" className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">Bạn có thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.</p>
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
          className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
            message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {message.kind === 'ok' ? <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />}
          {message.text}
        </p>
      )}

      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value.slice(0, 200) })}
        placeholder="Tên đề, ví dụ: Reading luyện 01 – Urban farming"
        aria-label="Tên đề"
        className="block w-full rounded-xl border border-transparent bg-transparent px-1 text-heading font-bold text-slate-900 placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600 dark:hover:border-slate-700"
      />

      {draft.kind === 'full' && (
        <Tabs<string>
          label="Passage"
          value={String(at)}
          onChange={(v) => setIndex(Number(v))}
          items={draft.passages.map((p, i) => ({
            id: String(i),
            label: `Passage ${p.part}`,
            count: problems.filter((x) => x.passageId === p.id).length || undefined,
          }))}
        />
      )}

      <nav aria-label="Các bước" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={step === s.id ? 'step' : undefined}
                className={`inline-flex min-h-touch items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  step === s.id ? 'bg-tone-periwinkle-soft text-tone-periwinkle-fg' : 'text-slate-600 hover:bg-tone-periwinkle dark:text-slate-300'
                }`}
              >
                <span className="tabular-nums opacity-60">{i + 1}</span> {s.label}
                {s.id === 'check' && problems.length > 0 && <span className="rounded-full bg-tone-butter-soft px-1.5 text-caption text-tone-butter-fg">{problems.length}</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className={`${panel} p-4 sm:p-5`} aria-label={STEPS[stepIndex]?.label}>
        {step === 'info' && (
          <div className="space-y-4">
            <Field title="Mô tả cho học viên (tuỳ chọn)">
              <textarea
                value={draft.descriptionVi}
                onChange={(e) => setDraft({ ...draft, descriptionVi: e.target.value })}
                rows={2}
                className={textarea}
                placeholder="Bài đọc về nông nghiệp đô thị, có TFNG và matching headings."
              />
            </Field>
            {draft.kind === 'practice' && (
              <Field title="Passage">
                <Segmented<ReadingPart>
                  label="Passage"
                  value={passage.part}
                  onChange={(p) => setDraft(setPracticePart(draft, p))}
                  options={([1, 2, 3] as ReadingPart[]).map((p) => ({ value: p, label: `Passage ${p}` }))}
                  className="mt-1.5"
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field title="Tiêu đề bài đọc (tiếng Anh)">
                <input value={passage.title} onChange={(e) => patch({ title: e.target.value.slice(0, 200) })} className={input} placeholder="The rise of urban farming" />
              </Field>
              <Field title="Dòng phụ đề (tuỳ chọn)">
                <input
                  value={passage.subtitle ?? ''}
                  onChange={(e) => patch({ subtitle: e.target.value.slice(0, 200) || undefined })}
                  className={input}
                  placeholder="How cities are learning to feed themselves"
                />
              </Field>
              <Field title="Chủ đề" help="Một hai từ: science, history, environment…">
                <input value={passage.topic} onChange={(e) => patch({ topic: e.target.value.slice(0, 40) })} className={input} placeholder="environment" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field title="Độ khó">
                  <select value={passage.difficulty} onChange={(e) => patch({ difficulty: e.target.value as ReadingDifficulty })} className={select}>
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field title="Phút gợi ý" help={`Chuẩn ${PART_MINUTES[passage.part]} phút`}>
                  <input
                    type="number"
                    min={5}
                    max={40}
                    value={passage.suggestedMinutes}
                    onChange={(e) => patch({ suggestedMinutes: Math.max(5, Math.min(40, Number(e.target.value) || PART_MINUTES[passage.part])) })}
                    className={input}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {step === 'text' && (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Bài đọc</span>
                <span className="flex items-center gap-2">
                  <span className={hint}>{passage.paragraphs.length} đoạn</span>
                  <WordCount passage={passage} />
                </span>
              </div>
              <BlurField
                multiline
                rows={14}
                value={paragraphsText(passage.paragraphs)}
                onCommit={(t) => patch(setParagraphs(passage, splitParagraphs(t)))}
                aria-label="Nội dung bài đọc"
                placeholder={'Dán bài đọc vào đây. Các đoạn cách nhau một dòng trống; chúng được đánh chữ A, B, C… theo thứ tự.'}
              />
              <p className={`mt-1 ${hint}`}>Chữ "A", "B." in sẵn ở đầu đoạn được bỏ đi. Tối đa 12 đoạn.</p>
            </div>
            {passage.paragraphs.length > 0 && (
              <ol className="space-y-2">
                {passage.paragraphs.map((p) => (
                  <li key={p.label} className={`${subPanel} flex gap-2 p-3 text-sm text-slate-700 dark:text-slate-200`}>
                    <span className="font-bold text-tone-periwinkle-fg">{p.label}</span>
                    <span className="line-clamp-2 min-w-0 flex-1">{p.text}</span>
                    <span className={`${hint} flex-shrink-0 tabular-nums`}>{p.text.split(/\s+/).filter(Boolean).length} từ</span>
                  </li>
                ))}
              </ol>
            )}
            <Field title="Từ khó (tuỳ chọn)" help={'Mỗi dòng "từ = nghĩa". Học viên bấm vào từ trong bài để xem.'}>
              <BlurField
                multiline
                rows={4}
                value={glossaryText(passage.glossary)}
                onCommit={(t) => patch({ glossary: parseGlossary(t) })}
                placeholder={'yield = sản lượng\nhydroponics = thuỷ canh'}
              />
            </Field>
          </div>
        )}

        {step === 'questions' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
            <div className="lg:sticky lg:top-4">
              <PassagePanel passage={passage} pick={pick} onPick={setPick} />
            </div>
            <div className="min-w-0 space-y-4">
              <div className={`${subPanel} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">AI điền ghi chú</p>
                  <p className={hint}>
                    Điền evidence, câu bẫy, paraphrase và giải thích cho các ô còn trống. Không sửa đáp án hay ô bạn đã viết.
                    {missingNotes.length ? ` Còn ${missingNotes.length} câu thiếu.` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillNotes}
                  disabled={notesBusy || !passage.groups.some((g) => g.questions.length) || !passage.paragraphs.length}
                  className={`${secondaryBtn} flex-shrink-0`}
                >
                  {notesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-tone-lavender-fg" />}
                  {notesBusy ? 'Đang điền…' : 'AI điền ghi chú'}
                </button>
              </div>
              {notesInfo && (
                <p role="status" className="text-sm text-slate-700 dark:text-slate-200">
                  {notesInfo}
                </p>
              )}
              <ReadingQuestionEditor passage={passage} onChange={update} pick={pick} />
            </div>
          </div>
        )}

        {step === 'check' && (
          <div className="space-y-4">
            {problems.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-tone-mint p-3 text-sm text-tone-mint-fg">
                <CircleCheck className="h-4 w-4 flex-shrink-0" /> Đề đã sẵn sàng. Hãy bấm Xem thử để làm thử một lượt trước khi xuất bản.
              </p>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cần sửa {problems.length} chỗ trước khi xuất bản</h3>
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {problems.map((p, i) => {
                    const target = p.passageId ? draft.passages.findIndex((x) => x.id === p.passageId) : -1;
                    return (
                      <li key={i} className="flex items-start gap-2 py-2 text-sm">
                        <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-tone-butter-fg" />
                        <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                          <b className="font-semibold text-slate-900 dark:text-white">{p.where}:</b> {p.message}
                        </span>
                        {target >= 0 && target !== at && (
                          <button type="button" onClick={() => setIndex(target)} className="flex-shrink-0 text-caption font-semibold text-tone-periwinkle-fg underline">
                            Mở Passage {draft.passages[target].part}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => onPreview(draft, saved)} className={secondaryBtn}>
                <Eye className="h-4 w-4" /> Xem thử như học viên
              </button>
              {draft.status === 'published' ? (
                <button type="button" onClick={() => save('draft', 'unpublish')} disabled={!!saving} className={secondaryBtn}>
                  {saving === 'unpublish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Gỡ xuống bản nháp
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => save('published', 'publish')}
                disabled={!!saving || problems.length > 0 || (draft.status === 'published' && !dirty)}
                className={primaryBtn}
              >
                {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {draft.status === 'published' ? 'Cập nhật bản đã xuất bản' : 'Xuất bản'}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setStep(STEPS[stepIndex - 1].id)} disabled={stepIndex <= 0} className={ghostBtn}>
          Bước trước
        </button>
        {passageProblems > 0 && step !== 'check' && <span className={hint}>Passage này còn {passageProblems} chỗ cần sửa</span>}
        <button type="button" onClick={() => setStep(STEPS[stepIndex + 1].id)} disabled={stepIndex >= STEPS.length - 1} className={secondaryBtn}>
          Bước tiếp
        </button>
      </div>
    </div>
  );
}
