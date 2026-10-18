import React, { useMemo, useState } from 'react';
import { BookmarkPlus, ChevronDown } from 'lucide-react';
import AddToReviewButton from './AddToReviewButton';
import type { addWordsToReview } from '../../services/masteryService';
import { pickableWords, sentenceWith } from '../../services/ieltsErrorLogic';

interface Props {
  userId: string;
  /** Model answer or sample essay to pick words from. */
  text: string;
  /** Swapped out in previews and tests. */
  save?: typeof addWordsToReview;
}

const chip = 'inline-flex min-h-touch items-center rounded-xl border px-3 text-sm font-medium transition-colors';
const chipOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';
const chipOff =
  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

/** Pick words from a model text and send them to the review queue, each with its sentence as the example. */
export default function WordPicker({ userId, text, save }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const words = useMemo(() => pickableWords(text), [text]);
  if (!userId || words.length === 0) return null;

  const toggle = (w: string) => setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]));

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-touch items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
      >
        <BookmarkPlus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        Chọn từ để ôn tập
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-400 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3">
          <p className="text-caption text-slate-500 dark:text-slate-400">
            Chạm vào những từ bạn muốn dùng được. Mỗi từ được lưu kèm câu chứa nó làm ví dụ.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Từ trong bài">
            {words.map((w) => {
              const on = picked.includes(w);
              return (
                <li key={w}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(w)} className={`${chip} ${on ? chipOn : chipOff}`}>
                    {w}
                  </button>
                </li>
              );
            })}
          </ul>
          {picked.length > 0 ? (
            <AddToReviewButton
              key={picked.join('|')}
              userId={userId}
              words={picked.map((word) => ({ word, example: sentenceWith(text, word) }))}
              label={`Thêm ${picked.length} từ vào ôn tập`}
              save={save}
            />
          ) : (
            <p className="text-caption text-slate-500 dark:text-slate-400">Chưa chọn từ nào.</p>
          )}
        </div>
      )}
    </div>
  );
}
