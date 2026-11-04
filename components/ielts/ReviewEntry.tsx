import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { IconTile } from '../ui/IconTile';
import { toneClasses, type Tone } from '../ui/palette';

interface Props {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  text: string;
  onClick: () => void;
  /** Short label on the right, e.g. "3 câu đến hạn". */
  badge?: string;
}

/** The "Ôn tập" entry at the top of a skill hub. */
export function ReviewEntry({ icon, tone, title, text, onClick, badge }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lift press group flex min-h-touch w-full items-center gap-3 rounded-2xl border p-4 text-left ${toneClasses(tone).surface}`}
    >
      <IconTile icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ôn tập</span>
          {badge && <span className={`rounded-md px-1.5 py-0.5 text-caption font-semibold ${toneClasses(tone).tile}`}>{badge}</span>}
        </span>
        <span className="block text-sm font-bold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-caption text-slate-600 dark:text-slate-300">{text}</span>
      </span>
      <ChevronRight className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${toneClasses(tone).text}`} aria-hidden />
    </button>
  );
}
