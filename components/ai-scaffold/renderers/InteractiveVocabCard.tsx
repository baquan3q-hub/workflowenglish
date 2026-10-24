import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2, Sparkles, Volume2 } from 'lucide-react';
import { ScaffoldVocabItem } from '../../../services/scaffoldActionTypes';
import { speakText } from '../../../services/browserSpeech';
import { addWordsToReview } from '../../../services/masteryService';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const toItem = (v: ScaffoldVocabItem) => ({ word: v.word, meaningVi: v.meaningVi, example: v.exampleSentence });

/** One word: meaning, example, collocations and a save-to-review button. */
export function InteractiveVocabCard({ vocab, state, onSave }: { vocab: ScaffoldVocabItem; state: SaveState; onSave?: () => void }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[14.5px] font-bold text-slate-900 dark:text-white">{vocab.word}</span>
            {vocab.ipa && <span className="font-mono text-[11.5px] text-slate-500 dark:text-slate-400">/{vocab.ipa.replace(/^\/|\/$/g, '')}/</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {vocab.partOfSpeech && <span className="rounded bg-slate-100 px-1.5 text-[10.5px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{vocab.partOfSpeech}</span>}
            {vocab.level && <span className="rounded bg-tone-lavender-soft px-1.5 text-[10.5px] font-semibold text-tone-lavender-fg">{vocab.level}</span>}
          </div>
        </div>
        <button type="button" onClick={() => speakText(vocab.word)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label={`Nghe ${vocab.word}`}>
          <Volume2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-1.5 text-[12.5px] font-medium text-slate-800 dark:text-slate-100">{vocab.meaningVi}</p>
      {vocab.exampleSentence && (
        <div className="mt-1.5 border-l-2 border-tone-butter-accent pl-2 text-[12px]">
          <p className="italic text-slate-700 dark:text-slate-200">{vocab.exampleSentence}</p>
          {vocab.exampleTranslationVi && <p className="text-[11.5px] text-slate-500 dark:text-slate-400">{vocab.exampleTranslationVi}</p>}
        </div>
      )}
      {vocab.collocations && vocab.collocations.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {vocab.collocations.map((c, i) => (
            <span key={i} className="rounded-md bg-tone-butter px-1.5 py-0.5 text-[11px] text-tone-butter-fg">{c}</span>
          ))}
        </div>
      )}

      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={state === 'saving' || state === 'saved'}
          className={`press mt-2.5 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
            state === 'saved'
              ? 'bg-tone-mint text-tone-mint-fg'
              : state === 'error'
                ? 'bg-tone-blush text-tone-blush-fg hover:bg-tone-blush-soft'
                : 'bg-tone-butter-soft text-tone-butter-fg hover:bg-tone-butter-border'
          }`}
        >
          {state === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === 'saved' ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {state === 'saving' ? 'Đang lưu…' : state === 'saved' ? 'Đã thêm vào ôn tập' : state === 'error' ? 'Lưu lỗi, thử lại' : 'Thêm vào ôn tập'}
        </button>
      )}
    </div>
  );
}

/** Word cards plus "save all" into the learner's spaced-repetition queue. */
export function InteractiveVocabGrid({ vocabulary, userId }: { vocabulary: ScaffoldVocabItem[]; userId?: string | null }) {
  const [states, setStates] = useState<Record<string, SaveState>>({});
  if (!vocabulary?.length) return null;

  const save = async (items: ScaffoldVocabItem[]) => {
    if (!userId) return;
    const todo = items.filter((v) => states[v.word] !== 'saved');
    if (!todo.length) return;
    setStates((s) => ({ ...s, ...Object.fromEntries(todo.map((v) => [v.word, 'saving' as const])) }));
    try {
      await addWordsToReview(userId, todo.map(toItem));
      setStates((s) => ({ ...s, ...Object.fromEntries(todo.map((v) => [v.word, 'saved' as const])) }));
    } catch (err) {
      console.error('[VocabCard] save failed', err);
      setStates((s) => ({ ...s, ...Object.fromEntries(todo.map((v) => [v.word, 'error' as const])) }));
    }
  };

  const allSaved = vocabulary.every((v) => states[v.word] === 'saved');

  return (
    <div className="my-2 w-full space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex flex-1 items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
          <Sparkles className="h-3.5 w-3.5 text-tone-butter-fg" aria-hidden /> {vocabulary.length} từ vựng đáng học
        </p>
        {userId && (
          <button
            type="button"
            onClick={() => void save(vocabulary)}
            disabled={allSaved}
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-tone-butter-fg hover:bg-tone-butter disabled:opacity-60"
          >
            <Bookmark className="h-3.5 w-3.5" /> {allSaved ? 'Đã lưu tất cả' : 'Lưu tất cả'}
          </button>
        )}
      </div>
      <div className="chat-wide-grid grid grid-cols-1 gap-2">
        {vocabulary.map((v, i) => (
          <InteractiveVocabCard key={v.id || i} vocab={v} state={states[v.word] ?? 'idle'} onSave={userId ? () => void save([v]) : undefined} />
        ))}
      </div>
    </div>
  );
}
