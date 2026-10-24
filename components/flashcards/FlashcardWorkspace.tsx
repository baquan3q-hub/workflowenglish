import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Tabs } from '../ui/Tabs';
import { HandwritingPad } from './HandwritingPad';
import { RATING_META } from '../ui/srsTheme';
import {
  gradeTypedAnswer,
  spellingDiff,
  suggestedRatingForGrade,
  type AnswerGrade,
  type DiffChar,
} from '../../services/reviewLogic';
import { MAX_NOTE_LENGTH } from '../../services/noteService';

export type WorkspaceTab = 'spell' | 'write' | 'note';

interface FlashcardWorkspaceProps {
  /** The word being practised. Remount (key) the workspace per card. */
  word: string;
  /** The saved personal note, if any. */
  note: string | null;
  onSaveNote: (note: string) => Promise<void>;
  /** A spelling check finished (or was cleared with `null`). */
  onSpellingGrade: (grade: AnswerGrade | null) => void;
  /** The learner compared their handwriting with the word. */
  onHandwritingCompared: () => void;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

const VERDICT: Record<AnswerGrade, string> = {
  correct: 'Đúng',
  close: 'Gần đúng',
  wrong: 'Sai',
};

const VERDICT_TONE: Record<AnswerGrade, string> = {
  correct: 'text-rate-good-fg',
  close: 'text-rate-hard-fg',
  wrong: 'text-rate-again-fg',
};

const DiffLetters: React.FC<{ ops: DiffChar[] }> = ({ ops }) => (
  <p className="font-mono text-xl tracking-wide" aria-hidden="true">
    {ops.map((o, i) => {
      if (o.op === 'same') return <span key={i} className="text-slate-900 dark:text-white">{o.ch}</span>;
      if (o.op === 'sub') return <span key={i} className="text-rate-again-fg underline decoration-2 underline-offset-4">{o.ch}</span>;
      if (o.op === 'ins') return <span key={i} className="text-rate-again-fg line-through decoration-2">{o.ch}</span>;
      return <span key={i} className="mx-px rounded border border-dashed border-slate-300 px-0.5 text-slate-400 dark:border-slate-600 dark:text-slate-500">{o.ch}</span>;
    })}
  </p>
);

// --- Gõ từ -----------------------------------------------------------------

const SpellTab: React.FC<{ word: string; onGrade: (grade: AnswerGrade | null) => void }> = ({ word, onGrade }) => {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<{ grade: AnswerGrade; ops: DiffChar[] } | null>(null);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const { grade } = gradeTypedAnswer(value, word);
    setResult({ grade, ops: spellingDiff(value, word) });
    onGrade(grade);
  };

  const suggested = result ? RATING_META[suggestedRatingForGrade(result.grade)] : null;

  return (
    <div>
      <form onSubmit={check} className="flex gap-2">
        <label className="sr-only" htmlFor="spell-input">Gõ lại từ</label>
        <input
          id="spell-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (result) {
              setResult(null);
              onGrade(null);
            }
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Gõ lại từ này"
          className="min-h-touch w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="min-h-touch rounded-xl border border-tone-periwinkle-border bg-tone-periwinkle-soft px-4 text-sm font-semibold text-tone-periwinkle-fg transition-colors hover:bg-tone-periwinkle-border disabled:opacity-40"
        >
          Kiểm tra
        </button>
      </form>

      <div aria-live="polite" className="mt-3 min-h-[3.5rem]">
        {result && suggested && (
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              {result.grade === 'correct' ? (
                <p className="font-mono text-xl tracking-wide text-slate-900 dark:text-white">{word}</p>
              ) : (
                <>
                  <DiffLetters ops={result.ops} />
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Đáp án: <span className="font-mono text-slate-900 dark:text-white">{word}</span>
                  </p>
                </>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className={`font-semibold ${VERDICT_TONE[result.grade]}`}>{VERDICT[result.grade]}</span>
              {' · gợi ý chấm '}
              <span className="font-semibold text-slate-900 dark:text-white">{suggested.label}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Viết tay --------------------------------------------------------------

const WriteTab: React.FC<{ word: string; onCompared: () => void }> = ({ word, onCompared }) => {
  const [hasInk, setHasInk] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <div>
      <HandwritingPad onStroke={() => setHasInk(true)} />
      <div className="mt-3 flex min-h-touch items-center justify-between gap-3">
        {shown ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Từ đúng: <span className="font-serif text-2xl text-slate-900 dark:text-white">{word}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Viết từ ra bảng rồi so sánh.</p>
        )}
        {!shown && (
          <button
            type="button"
            disabled={!hasInk}
            onClick={() => {
              setShown(true);
              onCompared();
            }}
            className="min-h-touch shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            So sánh
          </button>
        )}
      </div>
    </div>
  );
};

// --- Ghi chú ---------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const NOTE_DEBOUNCE_MS = 800;

const NoteTab: React.FC<{ note: string | null; onSave: (note: string) => Promise<void> }> = ({ note, onSave }) => {
  const [value, setValue] = useState(note ?? '');
  const [state, setState] = useState<SaveState>('idle');
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const flush = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    const text = pendingRef.current;
    if (text === null) return;
    pendingRef.current = null;
    setState('saving');
    onSaveRef.current(text).then(
      () => setState((s) => (s === 'saving' ? 'saved' : s)),
      () => setState('error'),
    );
  };

  // Save whatever is pending when the card changes or the screen closes.
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (text: string) => {
    setValue(text);
    pendingRef.current = text;
    setState('idle');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, NOTE_DEBOUNCE_MS);
  };

  return (
    <div>
      <label className="sr-only" htmlFor="note-input">Ghi chú cá nhân</label>
      <textarea
        id="note-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={flush}
        maxLength={MAX_NOTE_LENGTH}
        rows={4}
        placeholder="Mẹo nhớ của riêng bạn, câu tự đặt…"
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
      />
      <p aria-live="polite" className="mt-1 flex h-5 items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
        {state === 'saving' && 'Đang lưu…'}
        {state === 'saved' && (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Đã lưu
          </>
        )}
        {state === 'error' && <span className="text-rate-again-fg">Chưa lưu được, thử gõ lại sau</span>}
        {state === 'idle' && 'Tự động lưu, hiện lại khi ôn tập'}
      </p>
    </div>
  );
};

// --- Workspace -------------------------------------------------------------

/** Practice beside the card: type the word, write it by hand, keep a note. */
export const FlashcardWorkspace: React.FC<FlashcardWorkspaceProps> = ({
  word,
  note,
  onSaveNote,
  onSpellingGrade,
  onHandwritingCompared,
  tab,
  onTabChange,
}) => (
  <section aria-label="Luyện tập với từ này" className="rounded-2xl border border-slate-200 bg-white px-4 pb-4 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
    <Tabs<WorkspaceTab>
      label="Cách luyện"
      value={tab}
      onChange={onTabChange}
      items={[
        { id: 'spell', label: 'Gõ từ' },
        { id: 'write', label: 'Viết tay' },
        { id: 'note', label: 'Ghi chú' },
      ]}
      className="mb-4"
    />
    {/* All three stay mounted so switching tabs keeps the typed word, the ink and a pending note. */}
    <div hidden={tab !== 'spell'}>
      <SpellTab word={word} onGrade={onSpellingGrade} />
    </div>
    <div hidden={tab !== 'write'}>
      <WriteTab word={word} onCompared={onHandwritingCompared} />
    </div>
    <div hidden={tab !== 'note'}>
      <NoteTab note={note} onSave={onSaveNote} />
    </div>
  </section>
);

export default FlashcardWorkspace;
