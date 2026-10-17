import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  FolderMinus,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tags,
  Volume2,
  X,
} from 'lucide-react';
import { MasteryLevel } from '../types';
import type { ToastAction, ToastType } from '../components/Common';
import { Tabs } from '../components/ui/Tabs';
import { Segmented } from '../components/ui/Segmented';
import { Sheet } from '../components/ui/Sheet';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton, LoadingRegion, ErrorState } from '../components/ui/States';
import { RATING_META, SRS_LEVEL_META } from '../components/ui/srsTheme';
import {
  filterWords,
  relativeDue,
  searchWords,
  SORT_OPTIONS,
  STATUS_FILTERS,
  statusCounts,
  listProgress,
  type LessonList,
  type LibraryWord,
  type SortKey,
  type StatusFilter,
} from '../services/vocabLibraryLogic';
import { MANUAL_STATUS_LABEL, type ManualStatus } from '../services/srsStatusLogic';
import { getLessonLists, getLibraryWords, getWordTimeline, type TimelineEntry } from '../services/vocabLibraryService';
import {
  addWordsToList,
  createWordList,
  deleteWordList,
  getWordLists,
  LIST_COLORS,
  LIST_NAME_MAX,
  listColorDot,
  removeWordsFromList,
  updateWordList,
  validListName,
  type WordList,
} from '../services/wordListService';
import { applyManualStatus, undoManualStatus } from '../services/reviewService';
import { MAX_NOTE_LENGTH, savePersonalNote } from '../services/noteService';
import { speakText } from '../services/browserSpeech';

type ShowToast = (message: string, type?: ToastType, options?: { action?: ToastAction; durationMs?: number }) => void;

interface VocabLibraryProps {
  userId: string;
  onShowToast: ShowToast;
  /** Start a review of these word_mastery ids. */
  onReviewWords: (ids: string[]) => void;
  onStartLesson: () => void;
}

type Scope = 'all' | 'lessons' | 'lists';

const PAGE = 100;

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800';
const chipBase =
  'inline-flex min-h-touch flex-shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const chipOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';

const STATUS_CHOICES: ReadonlyArray<{ id: ManualStatus; hint: string }> = [
  { id: 'new', hint: 'Học lại từ đầu, chưa vào lịch ôn' },
  { id: 'learning', hint: 'Ôn lại ngay từ hôm nay' },
  { id: 'reviewing', hint: 'Ôn lại sau ít nhất 3 ngày' },
  { id: 'mastered', hint: 'Ôn lại sau ít nhất 22 ngày' },
  { id: 'suspended', hint: 'Không xuất hiện khi ôn tập' },
  { id: 'unsuspended', hint: 'Xuất hiện lại khi ôn tập' },
];

const LEVEL_OF: Partial<Record<ManualStatus, MasteryLevel>> = {
  new: MasteryLevel.NEW,
  learning: MasteryLevel.LEARNING,
  reviewing: MasteryLevel.REVIEWING,
  mastered: MasteryLevel.MASTERED,
};

const SOURCE_LABEL: Record<string, string> = {
  lesson_flashcard: 'Thẻ bài học',
  review: 'Ôn tập',
  quiz: 'Trắc nghiệm',
  fill_blank: 'Điền từ',
  spelling: 'Gõ từ',
  handwriting: 'Viết tay',
  sentence: 'Đặt câu',
  manual: 'Đổi tay',
};

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

// --- Small pieces ------------------------------------------------------------

const EmptyBlock: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
    <p className="text-heading text-slate-800 dark:text-slate-100">{title}</p>
    {description && <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

const Checkbox: React.FC<{ checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }> = ({
  checked,
  indeterminate = false,
  onChange,
  label,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="flex min-h-touch min-w-touch flex-shrink-0 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900 dark:border-slate-600 dark:accent-white"
      />
    </label>
  );
};

// --- List editor ---------------------------------------------------------------

const ListEditor: React.FC<{
  open: boolean;
  list: WordList | null;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
  onDelete: (list: WordList) => Promise<void>;
}> = ({ open, list, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(LIST_COLORS[1].id);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(list?.name ?? '');
    setColor(list?.color ?? LIST_COLORS[1].id);
    setConfirmDelete(false);
    setBusy(false);
  }, [open, list]);

  const valid = validListName(name);
  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSave(valid, color);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={list ? 'Sửa bộ từ' : 'Tạo bộ từ mới'}
      footer={
        <div className="flex gap-2">
          {list && (
            <button
              type="button"
              className={`${ghostBtn} text-rose-700 dark:text-rose-400`}
              disabled={busy}
              onClick={async () => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                setBusy(true);
                try {
                  await onDelete(list);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmDelete ? 'Xác nhận xoá' : 'Xoá bộ'}
            </button>
          )}
          <button type="button" className={`${primaryBtn} ml-auto`} disabled={!valid || busy} onClick={save}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {list ? 'Lưu' : 'Tạo bộ'}
          </button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Tên bộ</span>
          <input
            type="text"
            value={name}
            maxLength={LIST_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Từ IELTS Writing"
            className="mt-1.5 block min-h-touch w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            autoFocus
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Màu</legend>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {LIST_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={color === c.id}
                onClick={() => setColor(c.id)}
                className={`flex min-h-touch min-w-touch items-center justify-center rounded-xl ${color === c.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${c.dot}`}>
                  {color === c.id && <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        {confirmDelete ? (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            Xoá bộ “{list?.name}”? Từ và tiến độ học vẫn giữ nguyên.
          </p>
        ) : (
          list && <p className="text-xs text-slate-500 dark:text-slate-400">Xoá bộ chỉ bỏ nhóm; từ và tiến độ học vẫn giữ nguyên.</p>
        )}
      </form>
    </Sheet>
  );
};

// --- Pickers -------------------------------------------------------------------

const StatusPicker: React.FC<{
  open: boolean;
  count: number;
  onClose: () => void;
  onPick: (status: ManualStatus) => void;
}> = ({ open, count, onClose, onPick }) => (
  <Sheet open={open} onClose={onClose} title={`Đổi trạng thái ${count} từ`}>
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {STATUS_CHOICES.map((c) => {
        const level = LEVEL_OF[c.id];
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c.id)}
              className="flex min-h-touch w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {level !== undefined ? (
                <span aria-hidden="true" className={`h-2 w-2 flex-shrink-0 rounded-full ${SRS_LEVEL_META[level].dot}`} />
              ) : c.id === 'suspended' ? (
                <EyeOff className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{MANUAL_STATUS_LABEL[c.id]}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{c.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </Sheet>
);

const ListPicker: React.FC<{
  open: boolean;
  count: number;
  lists: WordList[];
  onClose: () => void;
  onPick: (list: WordList) => void;
  onCreate: () => void;
}> = ({ open, count, lists, onClose, onPick, onCreate }) => (
  <Sheet open={open} onClose={onClose} title={`Thêm ${count} từ vào bộ`}>
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {lists.map((l) => (
        <li key={l.id}>
          <button
            type="button"
            onClick={() => onPick(l)}
            className="flex min-h-touch w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true" className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${listColorDot(l.color)}`} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{l.name}</span>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{l.wordIds.length} từ</span>
          </button>
        </li>
      ))}
    </ul>
    <button type="button" onClick={onCreate} className={`${secondaryBtn} mt-3 w-full`}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Tạo bộ mới
    </button>
  </Sheet>
);

// --- Word detail -----------------------------------------------------------------

const WordDetail: React.FC<{
  userId: string;
  word: LibraryWord | null;
  lists: WordList[];
  listsAvailable: boolean;
  now: Date;
  onClose: () => void;
  onStatus: (status: ManualStatus) => void;
  onToggleList: (list: WordList, member: boolean) => void;
  onNoteSaved: (note: string | null) => void;
  onReview: () => void;
}> = ({ userId, word, lists, listsAvailable, now, onClose, onStatus, onToggleList, onNoteSaved, onReview }) => {
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const wordKey = word?.word ?? null;

  useEffect(() => {
    setNote(word?.personal_note ?? '');
    setNoteState('idle');
    setTimeline(null);
    if (!wordKey) return;
    let cancelled = false;
    getWordTimeline(userId, wordKey).then((t) => {
      if (!cancelled) setTimeline(t);
    });
    return () => {
      cancelled = true;
    };
    // Reload only when another word opens, not when its row updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, wordKey]);

  const saveNote = async () => {
    if (!word || note.trim() === (word.personal_note ?? '').trim()) return;
    setNoteState('saving');
    try {
      const saved = await savePersonalNote(userId, word.word, note);
      onNoteSaved(saved.personal_note ?? null);
      setNoteState('saved');
    } catch {
      setNoteState('error');
    }
  };

  const due = word ? relativeDue(word, now) : null;
  const level = word?.mastery_level ?? MasteryLevel.NEW;
  const answered = (word?.correct_count ?? 0) + (word?.incorrect_count ?? 0);

  return (
    <Sheet
      open={!!word}
      onClose={onClose}
      title={word?.word ?? ''}
      footer={
        <button type="button" className={`${primaryBtn} w-full`} onClick={onReview}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Ôn từ này
        </button>
      }
    >
      {word && (
        <div className="space-y-6">
          <section>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  {word.ipa && <span className="font-mono text-sm text-slate-500 dark:text-slate-400">/{word.ipa.replace(/^\/|\/$/g, '')}/</span>}
                  {word.part_of_speech && <span className="text-sm text-slate-400 dark:text-slate-500">{word.part_of_speech}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => speakText(word.word)}
                aria-label={`Nghe phát âm ${word.word}`}
                className="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 text-base text-slate-900 dark:text-white">
              {word.meaning_vi || <span className="text-slate-400 dark:text-slate-500">Chưa có nghĩa</span>}
            </p>
            {word.definition_en && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{word.definition_en}</p>}
            {word.example_sentence && (
              <blockquote className="mt-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                <p className="text-sm italic text-slate-700 dark:text-slate-300">{word.example_sentence}</p>
                {word.example_sentence_vi && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{word.example_sentence_vi}</p>}
              </blockquote>
            )}
          </section>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
            {[
              { k: 'Trạng thái', v: <StatusBadge level={word.mastery_level} suspended={!!word.is_suspended} variant="label" className="!text-sm" /> },
              {
                k: 'Ôn tiếp',
                v: due ? (
                  <span>
                    {due}
                    {word.next_review_date && due !== 'Đến hạn' && (
                      <span className="text-slate-500 dark:text-slate-400"> · {fullDate(word.next_review_date)}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Chưa xếp lịch</span>
                ),
              },
              { k: 'Khoảng ôn', v: `${word.interval_days ?? 0} ngày` },
              { k: 'Đúng / sai', v: answered ? `${word.correct_count ?? 0} / ${word.incorrect_count ?? 0}` : 'Chưa trả lời' },
            ].map((row) => (
              <div key={row.k} className="bg-white px-3 py-2.5 dark:bg-slate-900">
                <dt className="text-xs text-slate-500 dark:text-slate-400">{row.k}</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-slate-900 dark:text-white">{row.v}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="detail-status">
            <h3 id="detail-status" className="text-sm font-semibold text-slate-900 dark:text-white">Đổi trạng thái</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['new', 'learning', 'reviewing', 'mastered'] as const).map((s) => {
                const current = !word.is_suspended && level === LEVEL_OF[s];
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={current}
                    disabled={current}
                    onClick={() => onStatus(s)}
                    className={`${chipBase} ${current ? chipOn : chipOff} disabled:cursor-default`}
                  >
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${SRS_LEVEL_META[LEVEL_OF[s]!].dot}`} />
                    {MANUAL_STATUS_LABEL[s]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onStatus(word.is_suspended ? 'unsuspended' : 'suspended')}
                className={`${chipBase} ${chipOff}`}
              >
                {word.is_suspended ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                {word.is_suspended ? 'Bỏ ẩn' : 'Tạm ẩn'}
              </button>
            </div>
          </section>

          {listsAvailable && lists.length > 0 && (
            <section aria-labelledby="detail-lists">
              <h3 id="detail-lists" className="text-sm font-semibold text-slate-900 dark:text-white">Bộ từ</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {lists.map((l) => {
                  const member = l.wordIds.includes(word.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      aria-pressed={member}
                      onClick={() => onToggleList(l, member)}
                      className={`${chipBase} ${member ? chipOn : chipOff}`}
                    >
                      {member ? <Check className="h-4 w-4" aria-hidden="true" /> : <span aria-hidden="true" className={`h-2 w-2 rounded-full ${listColorDot(l.color)}`} />}
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <label htmlFor="detail-note" className="flex items-baseline justify-between text-sm font-semibold text-slate-900 dark:text-white">
              Ghi chú
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400" aria-live="polite">
                {noteState === 'saving' ? 'Đang lưu…' : noteState === 'saved' ? 'Đã lưu' : noteState === 'error' ? 'Chưa lưu được' : ''}
              </span>
            </label>
            <textarea
              id="detail-note"
              rows={3}
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteState !== 'saving') setNoteState('idle');
              }}
              onBlur={saveNote}
              placeholder="Mẹo nhớ, câu ví dụ của bạn…"
              className="mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </section>

          <section aria-labelledby="detail-history">
            <h3 id="detail-history" className="text-sm font-semibold text-slate-900 dark:text-white">Lịch sử ôn</h3>
            {timeline === null ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chưa có lượt ôn nào được ghi lại.</p>
            ) : (
              <ol className="mt-2 space-y-0">
                {timeline.map((t, i) => {
                  const meta = t.rating !== null ? RATING_META[t.rating] : null;
                  const changed = t.level_before !== null && t.level_after !== null && t.level_before !== t.level_after;
                  return (
                    <li key={`${t.reviewed_at}-${i}`} className="flex items-center gap-3 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
                      <span aria-hidden="true" className={`h-2 w-2 flex-shrink-0 rounded-full ${meta ? meta.dot : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className="w-24 flex-shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{shortDateTime(t.reviewed_at)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-200">
                        {meta ? meta.label : SOURCE_LABEL.manual}
                        <span className="text-slate-500 dark:text-slate-400"> · {SOURCE_LABEL[t.source] ?? t.source}</span>
                      </span>
                      {changed && (
                        <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          → {SRS_LEVEL_META[t.level_after as MasteryLevel]?.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
};

// --- Screen ------------------------------------------------------------------------

const LoadingSkeleton: React.FC = () => (
  <LoadingRegion label="Đang tải sổ từ…" className="mx-auto max-w-3xl space-y-4">
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-11 w-full rounded-xl" />
    <Skeleton className="h-11 w-full rounded-xl" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} className="h-14 w-full rounded-xl" />
    ))}
  </LoadingRegion>
);

const VocabLibrary: React.FC<VocabLibraryProps> = ({ userId, onShowToast, onReviewWords, onStartLesson }) => {
  const [words, setWords] = useState<LibraryWord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lessonLists, setLessonLists] = useState<LessonList[]>([]);
  const [lists, setLists] = useState<WordList[]>([]);
  const [listsAvailable, setListsAvailable] = useState(true);

  const [scope, setScope] = useState<Scope>('all');
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('due');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [editor, setEditor] = useState<{ list: WordList | null; addAfter: string[] | null } | null>(null);

  const now = useMemo(() => new Date(), [words]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const loaded = await getLibraryWords(userId);
        if (cancelled) return;
        setWords(loaded);
        const tracked = new Set(loaded.map((w) => w.word));
        const [lessons, mine] = await Promise.all([
          getLessonLists(userId, tracked).catch(() => [] as LessonList[]),
          getWordLists(userId).catch(() => ({ lists: [] as WordList[], available: true })),
        ]);
        if (cancelled) return;
        setLessonLists(lessons);
        setLists(mine.lists);
        setListsAvailable(mine.available);
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err, 'Không tải được sổ từ'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const byId = useMemo(() => new Map((words ?? []).map((w) => [w.id, w])), [words]);
  const byWord = useMemo(() => new Map((words ?? []).map((w) => [w.word, w])), [words]);

  const only = useMemo<ReadonlySet<string> | null>(() => {
    if (scope === 'lessons' && scopeId) return new Set(lessonLists.find((l) => l.id === scopeId)?.words ?? []);
    if (scope === 'lists' && scopeId) {
      const list = lists.find((l) => l.id === scopeId);
      return new Set((list?.wordIds ?? []).map((id) => byId.get(id)?.word).filter((w): w is string => !!w));
    }
    return null;
  }, [scope, scopeId, lessonLists, lists, byId]);

  const scoped = useMemo(() => {
    const all = words ?? [];
    return searchWords(only ? all.filter((w) => only.has(w.word)) : all, search);
  }, [words, only, search]);
  const counts = useMemo(() => statusCounts(scoped, now), [scoped, now]);
  const visible = useMemo(
    () => filterWords(words ?? [], { status, search, sort, only }, now),
    [words, status, search, sort, only, now],
  );

  // Reset paging and selection when the filter changes.
  useEffect(() => {
    setLimit(PAGE);
    setSelected(new Set());
  }, [scope, scopeId, status, search, sort]);

  // Progressive rendering: show the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || limit >= visible.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + PAGE);
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [limit, visible.length]);

  const selectedWords = useMemo(
    () => [...selected].map((id) => byId.get(id)).filter((w): w is LibraryWord => !!w),
    [selected, byId],
  );
  const allVisibleSelected = visible.length > 0 && visible.every((w) => selected.has(w.id));
  const someVisibleSelected = !allVisibleSelected && visible.some((w) => selected.has(w.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const mergeRecords = useCallback((records: ReadonlyArray<Partial<LibraryWord> & { word: string }>) => {
    const updates = new Map(records.map((r) => [r.word, r]));
    setWords((prev) => prev?.map((w) => (updates.has(w.word) ? { ...w, ...updates.get(w.word) } : w)) ?? prev);
  }, []);

  // --- Mutations ---

  const changeStatus = async (targets: LibraryWord[], next: ManualStatus) => {
    setStatusPickerOpen(false);
    if (targets.length === 0 || busy) return;
    setBusy(true);
    try {
      const { records, undo } = await applyManualStatus(userId, targets, next);
      mergeRecords(records);
      setSelected(new Set());
      const label = MANUAL_STATUS_LABEL[next];
      const what = targets.length === 1 ? `“${targets[0].word}”` : `${targets.length} từ`;
      const message = next === 'suspended' ? `Đã ẩn ${what}` : next === 'unsuspended' ? `Đã bỏ ẩn ${what}` : `Đã chuyển ${what} sang ${label}`;
      onShowToast(message, 'success', {
        action: {
          label: 'Hoàn tác',
          onClick: async () => {
            try {
              mergeRecords(await undoManualStatus(undo));
            } catch (err) {
              onShowToast(errorText(err, 'Không hoàn tác được'), 'error');
            }
          },
        },
      });
    } catch (err) {
      onShowToast(errorText(err, 'Không đổi được trạng thái'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addToList = async (list: WordList, ids: string[]) => {
    setListPickerOpen(false);
    const added = ids.filter((id) => !list.wordIds.includes(id));
    if (added.length === 0) {
      onShowToast(`Các từ đã có trong “${list.name}”`, 'info');
      return;
    }
    try {
      await addWordsToList(list.id, added);
      setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, wordIds: [...l.wordIds, ...added] } : l)));
      setSelected(new Set());
      onShowToast(`Đã thêm ${added.length} từ vào “${list.name}”`, 'success', {
        action: {
          label: 'Hoàn tác',
          onClick: async () => {
            try {
              await removeWordsFromList(list.id, added);
              setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, wordIds: l.wordIds.filter((id) => !added.includes(id)) } : l)));
            } catch (err) {
              onShowToast(errorText(err, 'Không hoàn tác được'), 'error');
            }
          },
        },
      });
    } catch (err) {
      onShowToast(errorText(err, 'Không thêm được vào bộ'), 'error');
    }
  };

  const removeFromList = async (list: WordList, ids: string[]) => {
    try {
      await removeWordsFromList(list.id, ids);
      setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, wordIds: l.wordIds.filter((id) => !ids.includes(id)) } : l)));
      onShowToast(`Đã bỏ khỏi “${list.name}”`, 'success', {
        action: {
          label: 'Hoàn tác',
          onClick: () => addWordsToList(list.id, ids).then(() =>
            setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, wordIds: [...new Set([...l.wordIds, ...ids])] } : l))),
          ),
        },
      });
    } catch (err) {
      onShowToast(errorText(err, 'Không bỏ được khỏi bộ'), 'error');
    }
  };

  const saveList = async (name: string, color: string) => {
    if (!editor) return;
    try {
      if (editor.list) {
        await updateWordList(editor.list.id, { name, color });
        setLists((prev) => prev.map((l) => (l.id === editor.list!.id ? { ...l, name, color } : l)));
        setEditor(null);
        onShowToast('Đã lưu bộ từ', 'success');
        return;
      }
      const created = await createWordList(userId, name, color);
      setLists((prev) => [...prev, created]);
      const addAfter = editor.addAfter;
      setEditor(null);
      if (addAfter && addAfter.length > 0) {
        await addToList(created, addAfter);
      } else {
        setScope('lists');
        setScopeId(created.id);
        onShowToast(`Đã tạo “${created.name}”`, 'success');
      }
    } catch (err) {
      onShowToast(errorText(err, 'Không lưu được bộ từ'), 'error');
    }
  };

  const removeList = async (list: WordList) => {
    try {
      await deleteWordList(list.id);
      setLists((prev) => prev.filter((l) => l.id !== list.id));
      if (scopeId === list.id) setScopeId(null);
      setEditor(null);
      onShowToast(`Đã xoá bộ “${list.name}”`, 'success');
    } catch (err) {
      onShowToast(errorText(err, 'Không xoá được bộ từ'), 'error');
    }
  };

  // --- Render ---

  if (loadError && !words) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  }
  if (!words) return <LoadingSkeleton />;

  const detail = detailId ? byId.get(detailId) ?? null : null;
  const dueVisible = visible.filter((w) => relativeDue(w, now) === 'Đến hạn');
  const allSuspended = selectedWords.length > 0 && selectedWords.every((w) => w.is_suspended);
  const activeList = scope === 'lists' && scopeId ? lists.find((l) => l.id === scopeId) ?? null : null;
  const filtersActive = status !== 'all' || search.trim() !== '' || scopeId !== null;

  if (words.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-display text-slate-900 dark:text-white">Sổ từ</h1>
        <EmptyBlock
          title="Sổ từ đang trống"
          description="Từ bạn học trong mỗi bài sẽ được lưu ở đây cùng lịch ôn."
          action={
            <button type="button" className={primaryBtn} onClick={onStartLesson}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Tạo bài học đầu tiên
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display text-slate-900 dark:text-white">Sổ từ</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="tabular-nums">{words.length}</span> từ ·{' '}
            <span className="tabular-nums">{statusCounts(words, now).due}</span> từ đến hạn ôn
          </p>
        </div>
      </header>

      <Segmented<Scope>
        label="Phạm vi"
        value={scope}
        onChange={(s) => {
          setScope(s);
          setScopeId(null);
        }}
        options={[
          { value: 'all', label: 'Tất cả' },
          { value: 'lessons', label: 'Theo bài học' },
          { value: 'lists', label: 'Bộ của tôi' },
        ]}
        className="mt-5"
      />

      {scope === 'lessons' && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none" role="group" aria-label="Chọn bài học">
          {lessonLists.length === 0 ? (
            <p className="py-2 text-sm text-slate-500 dark:text-slate-400">Chưa có bài học nào đã lưu.</p>
          ) : (
            lessonLists.map((l) => {
              const p = listProgress(l.words, byWord);
              const on = scopeId === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setScopeId(on ? null : l.id)}
                  className={`${chipBase} ${on ? chipOn : chipOff}`}
                >
                  <span className="max-w-[12rem] truncate">{l.topic}</span>
                  <span className={`text-xs tabular-nums ${on ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {p.done}/{p.total}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {scope === 'lists' && (
        <div className="mt-3">
          {!listsAvailable ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Bộ từ chưa được bật. Cần chạy docs/migrations/006_word_lists.sql trong Supabase.
            </p>
          ) : (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none" role="group" aria-label="Chọn bộ từ">
              {lists.map((l) => {
                const on = scopeId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setScopeId(on ? null : l.id)}
                    className={`${chipBase} ${on ? chipOn : chipOff}`}
                  >
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${listColorDot(l.color)}`} />
                    <span className="max-w-[12rem] truncate">{l.name}</span>
                    <span className={`text-xs tabular-nums ${on ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>{l.wordIds.length}</span>
                  </button>
                );
              })}
              <button type="button" onClick={() => setEditor({ list: null, addAfter: null })} className={`${chipBase} border-dashed ${chipOff}`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tạo bộ mới
              </button>
              {activeList && (
                <button
                  type="button"
                  onClick={() => setEditor({ list: activeList, addAfter: null })}
                  aria-label={`Sửa bộ ${activeList.name}`}
                  className={`${chipBase} ${chipOff} justify-center`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Sửa
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm từ hoặc nghĩa</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm từ hoặc nghĩa"
            className="block min-h-touch w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Xoá tìm kiếm"
              className="absolute right-0 top-0 flex min-h-touch min-w-touch items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <label className="relative flex-shrink-0">
          <span className="sr-only">Sắp xếp</span>
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="block min-h-touch appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Tabs<StatusFilter>
        variant="pill"
        label="Lọc theo trạng thái"
        value={status}
        onChange={setStatus}
        items={STATUS_FILTERS.map((f) => ({ id: f.id, label: f.label, count: counts[f.id] }))}
        className="mt-3"
      />

      {visible.length === 0 ? (
        <div className="mt-4">
          {scope === 'lists' && listsAvailable && lists.length === 0 ? (
            <EmptyBlock
              title="Chưa có bộ từ nào"
              description="Gom các từ cùng chủ đề để ôn riêng."
              action={
                <button type="button" className={primaryBtn} onClick={() => setEditor({ list: null, addAfter: null })}>
                  <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  Tạo bộ mới
                </button>
              }
            />
          ) : activeList && activeList.wordIds.length === 0 ? (
            <EmptyBlock title="Bộ này chưa có từ" description="Chọn từ ở mục Tất cả rồi bấm “Thêm vào bộ”." />
          ) : (
            <EmptyBlock
              title="Không có từ phù hợp"
              action={
                filtersActive && (
                  <button
                    type="button"
                    className={secondaryBtn}
                    onClick={() => {
                      setStatus('all');
                      setSearch('');
                      setScopeId(null);
                    }}
                  >
                    Xoá bộ lọc
                  </button>
                )
              }
            />
          )}
        </div>
      ) : (
        <section aria-label="Danh sách từ" className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1 border-b border-slate-100 pr-3 dark:border-slate-800">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((w) => w.id)))}
              label="Chọn tất cả từ đang hiện"
            />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {selected.size > 0 ? `Đã chọn ${selected.size}` : `${visible.length} từ`}
            </span>
            {dueVisible.length > 1 && dueVisible.length < visible.length && selected.size === 0 && (
              <button
                type="button"
                className="ml-auto inline-flex min-h-touch items-center gap-1.5 px-1 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                onClick={() => setSelected(new Set(dueVisible.map((w) => w.id)))}
              >
                Chọn {dueVisible.length} từ đến hạn
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.slice(0, limit).map((w) => {
              const due = relativeDue(w, now);
              const checked = selected.has(w.id);
              return (
                <li key={w.id} className={`flex items-center gap-1 pr-2 ${checked ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                  <Checkbox checked={checked} onChange={() => toggle(w.id)} label={`Chọn ${w.word}`} />
                  <button
                    type="button"
                    onClick={() => setDetailId(w.id)}
                    className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 pr-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`truncate font-semibold ${w.is_suspended ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{w.word}</span>
                        {w.ipa && <span className="hidden truncate font-mono text-xs text-slate-500 dark:text-slate-400 sm:inline">/{w.ipa.replace(/^\/|\/$/g, '')}/</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-slate-600 dark:text-slate-400">
                        {w.meaning_vi || <span className="text-slate-400 dark:text-slate-500">Chưa có nghĩa</span>}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 flex-col items-end gap-1">
                      <StatusBadge level={w.mastery_level} suspended={!!w.is_suspended} variant="label" />
                      {due && (
                        <span className={`text-xs tabular-nums ${due === 'Đến hạn' ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {due}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {limit < visible.length && (
            <div ref={sentinelRef} className="flex justify-center border-t border-slate-100 p-3 dark:border-slate-800">
              <button type="button" className={ghostBtn} onClick={() => setLimit((n) => n + PAGE)}>
                Xem thêm {Math.min(PAGE, visible.length - limit)} từ
              </button>
            </div>
          )}
        </section>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mt-4 md:bottom-4">
          <div
            role="toolbar"
            aria-label={`Thao tác với ${selected.size} từ đã chọn`}
            className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur scrollbar-none dark:border-slate-700 dark:bg-slate-900/95"
          >
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Bỏ chọn"
              className="flex min-h-touch min-w-touch flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="flex-shrink-0 pr-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{selected.size}</span>
            <button type="button" className={`${primaryBtn} ml-auto flex-shrink-0 px-4`} disabled={busy} onClick={() => onReviewWords(selectedWords.map((w) => w.id))}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Ôn ngay
            </button>
            <button type="button" className={`${ghostBtn} flex-shrink-0`} aria-label="Đổi trạng thái" disabled={busy} onClick={() => setStatusPickerOpen(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Tags className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">Trạng thái</span>
            </button>
            {listsAvailable && (
              <button
                type="button"
                className={`${ghostBtn} flex-shrink-0`}
                aria-label="Thêm vào bộ"
                disabled={busy}
                onClick={() => (lists.length === 0 ? setEditor({ list: null, addAfter: [...selected] }) : setListPickerOpen(true))}
              >
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Thêm vào bộ</span>
              </button>
            )}
            {activeList && (
              <button type="button" className={`${ghostBtn} flex-shrink-0`} aria-label="Bỏ khỏi bộ" disabled={busy} onClick={() => removeFromList(activeList, [...selected]).then(() => setSelected(new Set()))}>
                <FolderMinus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Bỏ khỏi bộ</span>
              </button>
            )}
            <button
              type="button"
              className={`${ghostBtn} flex-shrink-0`}
              aria-label={allSuspended ? 'Bỏ ẩn' : 'Ẩn khỏi ôn tập'}
              disabled={busy}
              onClick={() => changeStatus(selectedWords, allSuspended ? 'unsuspended' : 'suspended')}
            >
              {allSuspended ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{allSuspended ? 'Bỏ ẩn' : 'Ẩn'}</span>
            </button>
          </div>
        </div>
      )}

      <WordDetail
        userId={userId}
        word={detail}
        lists={lists}
        listsAvailable={listsAvailable}
        now={now}
        onClose={() => setDetailId(null)}
        onStatus={(s) => detail && changeStatus([detail], s)}
        onToggleList={(l, member) => (detail ? (member ? removeFromList(l, [detail.id]) : addToList(l, [detail.id])) : undefined)}
        onNoteSaved={(note) => detail && mergeRecords([{ word: detail.word, personal_note: note }])}
        onReview={() => detail && onReviewWords([detail.id])}
      />
      <StatusPicker
        open={statusPickerOpen}
        count={selected.size}
        onClose={() => setStatusPickerOpen(false)}
        onPick={(s) => changeStatus(selectedWords, s)}
      />
      <ListPicker
        open={listPickerOpen}
        count={selected.size}
        lists={lists}
        onClose={() => setListPickerOpen(false)}
        onPick={(l) => addToList(l, [...selected])}
        onCreate={() => {
          setListPickerOpen(false);
          setEditor({ list: null, addAfter: [...selected] });
        }}
      />
      <ListEditor
        open={!!editor}
        list={editor?.list ?? null}
        onClose={() => setEditor(null)}
        onSave={saveList}
        onDelete={removeList}
      />
    </div>
  );
};

export default VocabLibrary;
