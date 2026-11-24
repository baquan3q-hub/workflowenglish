import React from 'react';
import { Volume2 } from 'lucide-react';
import type { ItemKind, Level, StageId } from '../../data/grammar/types';
import type { Tone } from '../ui/palette';
import { STATUS_LABEL, type Status } from '../../services/grammar/progress';
import { speakText } from '../../services/browserSpeech';

export const STAGE_TONE: Record<StageId, Tone> = {
  0: 'mint',
  1: 'sky',
  2: 'aqua',
  3: 'lavender',
  4: 'periwinkle',
  5: 'peach',
  6: 'butter',
};

/** Full class names so the Tailwind CDN sees them. */
export const TONE_CLASS: Record<Tone, { bg: string; soft: string; fg: string; border: string; accent: string }> = {
  sky: { bg: 'bg-tone-sky', soft: 'bg-tone-sky-soft', fg: 'text-tone-sky-fg', border: 'border-tone-sky-border', accent: 'bg-tone-sky-accent' },
  mint: { bg: 'bg-tone-mint', soft: 'bg-tone-mint-soft', fg: 'text-tone-mint-fg', border: 'border-tone-mint-border', accent: 'bg-tone-mint-accent' },
  lavender: { bg: 'bg-tone-lavender', soft: 'bg-tone-lavender-soft', fg: 'text-tone-lavender-fg', border: 'border-tone-lavender-border', accent: 'bg-tone-lavender-accent' },
  peach: { bg: 'bg-tone-peach', soft: 'bg-tone-peach-soft', fg: 'text-tone-peach-fg', border: 'border-tone-peach-border', accent: 'bg-tone-peach-accent' },
  butter: { bg: 'bg-tone-butter', soft: 'bg-tone-butter-soft', fg: 'text-tone-butter-fg', border: 'border-tone-butter-border', accent: 'bg-tone-butter-accent' },
  aqua: { bg: 'bg-tone-aqua', soft: 'bg-tone-aqua-soft', fg: 'text-tone-aqua-fg', border: 'border-tone-aqua-border', accent: 'bg-tone-aqua-accent' },
  blush: { bg: 'bg-tone-blush', soft: 'bg-tone-blush-soft', fg: 'text-tone-blush-fg', border: 'border-tone-blush-border', accent: 'bg-tone-blush-accent' },
  periwinkle: { bg: 'bg-tone-periwinkle', soft: 'bg-tone-periwinkle-soft', fg: 'text-tone-periwinkle-fg', border: 'border-tone-periwinkle-border', accent: 'bg-tone-periwinkle-accent' },
};
export const stageTone = (stage: StageId) => TONE_CLASS[STAGE_TONE[stage]];

export const KIND_LABEL: Record<ItemKind, string> = {
  choice: 'Chọn đáp án đúng',
  spot: 'Chọn câu đúng',
  fill: 'Điền vào chỗ trống',
  fix: 'Sửa lỗi trong câu',
  order: 'Sắp xếp thành câu',
  translate: 'Dịch sang tiếng Anh',
  write: 'Tự viết',
  speak: 'Tự nói',
};
export const LEVEL_LABEL: Record<Level, string> = {
  1: 'Nhận biết',
  2: 'Luyện có khung',
  3: 'Dịch',
  4: 'Tự viết',
  5: 'Tự nói',
};

export const ERROR_TAG_LABEL: Record<string, string> = {
  tense: 'Thì',
  agreement: 'Hòa hợp chủ ngữ – động từ',
  article: 'Mạo từ',
  word_order: 'Trật tự từ',
  preposition: 'Giới từ',
  word_form: 'Từ loại',
  verb_pattern: 'Dạng động từ (to V / V-ing)',
  clause: 'Mệnh đề, câu ghép',
  missing_word: 'Thiếu từ',
  meaning: 'Sai ý',
  other: 'Lỗi khác',
};

const STATUS_STYLE: Record<Status | 'known', string> = {
  new: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  learning: 'bg-tone-sky-soft text-tone-sky-fg',
  understood: 'bg-tone-aqua-soft text-tone-aqua-fg',
  applied: 'bg-tone-mint-soft text-tone-mint-fg',
  solid: 'bg-tone-mint-accent text-white dark:text-slate-950',
  known: 'bg-tone-butter-soft text-tone-butter-fg',
};
const STATUS_DOT: Record<Status | 'known', string> = {
  new: 'border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900',
  learning: 'bg-tone-sky-accent',
  understood: 'bg-tone-aqua-accent',
  applied: 'bg-tone-mint-accent',
  solid: 'bg-tone-mint-fg',
  known: 'bg-tone-butter-accent',
};
export function StatusPill({ status }: { status: Status | 'known' }) {
  return (
    <span className={'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ' + STATUS_STYLE[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}
export function StatusDot({ status }: { status: Status | 'known' }) {
  return <span aria-hidden="true" className={'inline-block h-3 w-3 shrink-0 rounded-full ' + STATUS_DOT[status]} />;
}

export const plain = (en: string) => en.replace(/[[\]]/g, '');

/** English text with [brackets] drawn as highlights. Tapping a highlight calls `onMark`. */
export function Marked({ text, onMark }: { text: string; onMark?: (part: string) => void }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith('[') ? (
          onMark ? (
            <button
              key={i}
              type="button"
              onClick={() => onMark(plain(part))}
              className="rounded bg-tone-butter-soft px-0.5 font-semibold text-tone-butter-fg underline decoration-dotted underline-offset-4"
            >
              {plain(part)}
            </button>
          ) : (
            <mark key={i} className="rounded bg-tone-butter-soft px-0.5 font-semibold text-tone-butter-fg">
              {plain(part)}
            </mark>
          )
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function Listen({ text, label }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label={'Nghe: ' + plain(text)}
      onClick={() => speakText(plain(text))}
      className="press inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-tone-sky-fg hover:bg-tone-sky"
    >
      <Volume2 className="h-5 w-5" aria-hidden="true" />
      {label && <span className="ml-1 text-sm font-semibold">{label}</span>}
    </button>
  );
}

export const LESSON_STEPS = ['Khi nào & vì sao', 'Công thức', 'Ví dụ', 'Đối chiếu & lỗi', 'Luyện tập', 'Tổng kết'];

export function StepDots({ step, onPick }: { step: number; onPick?: (step: number) => void }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={'Bước ' + (step + 1) + ' / ' + LESSON_STEPS.length + ': ' + LESSON_STEPS[step]}>
      {LESSON_STEPS.map((name, i) => (
        <li key={name} className="flex-1">
          <button
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(i)}
            aria-label={name}
            aria-current={i === step ? 'step' : undefined}
            className={
              'block h-1.5 w-full rounded-full transition-colors ' +
              (i < step ? 'bg-tone-periwinkle-accent' : i === step ? 'bg-tone-periwinkle-fg' : 'bg-slate-200 dark:bg-slate-700')
            }
          />
        </li>
      ))}
    </ol>
  );
}

export const card = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';
export const eyebrow = 'text-xs font-bold uppercase tracking-wide';
export const h2 = 'text-lg font-bold text-slate-900 dark:text-white';
export const muted = 'text-sm text-slate-600 dark:text-slate-300';
