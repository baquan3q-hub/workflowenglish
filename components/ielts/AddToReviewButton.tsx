import React, { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { addWordsToReview, type ReviewWordInput } from '../../services/masteryService';

interface Props {
  userId: string;
  words: ReviewWordInput[];
  label?: string;
  /** Swapped out in previews and tests. */
  save?: typeof addWordsToReview;
}

type State = { kind: 'idle' } | { kind: 'saving' } | { kind: 'done'; message: string } | { kind: 'error' };

const btn =
  'press inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-tone-periwinkle-border hover:bg-tone-periwinkle hover:text-tone-periwinkle-fg disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function reviewMessage(added: number, alreadyThere: number): string {
  if (!added) return alreadyThere === 1 ? 'Từ này đã có trong ôn tập.' : 'Các từ này đã có trong ôn tập.';
  return alreadyThere ? `Đã thêm ${added} từ, ${alreadyThere} từ đã có sẵn.` : `Đã thêm ${added} từ vào ôn tập.`;
}

/** Puts words in the SRS queue, due now. */
export default function AddToReviewButton({ userId, words, label = 'Thêm vào ôn tập', save = addWordsToReview }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  if (!userId || !words.length) return null;

  const run = async () => {
    setState({ kind: 'saving' });
    try {
      const r = await save(userId, words);
      setState({ kind: 'done', message: reviewMessage(r.added, r.alreadyThere) });
    } catch (err) {
      console.warn('addWordsToReview failed', err);
      setState({ kind: 'error' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" onClick={run} disabled={state.kind === 'saving' || state.kind === 'done'} className={btn}>
        {state.kind === 'saving' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state.kind === 'done' ? (
          <Check className="h-4 w-4 text-tone-mint-fg" />
        ) : (
          <BookmarkPlus className="h-4 w-4" />
        )}
        {state.kind === 'done' ? 'Đã thêm' : label}
      </button>
      <span role="status" className="text-caption text-slate-500 dark:text-slate-400">
        {state.kind === 'done' && state.message}
        {state.kind === 'error' && <span className="text-tone-blush-fg">Chưa thêm được. Kiểm tra mạng rồi thử lại.</span>}
      </span>
    </div>
  );
}
