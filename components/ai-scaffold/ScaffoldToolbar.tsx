import React from 'react';
import { Bookmark, Languages, MessageSquare, Puzzle } from 'lucide-react';
import { ScaffoldActionType } from '../../services/scaffoldActionTypes';

type Icon = React.ComponentType<{ className?: string }>;

export interface ScaffoldMode {
  id: ScaffoldActionType;
  label: string;
  icon: Icon;
  /** Active tab colours (pastel tone tokens, written out for the Tailwind CDN). */
  active: string;
  /** What the tab does, shown under the tabs. */
  hint: string;
  placeholder: string;
}

export const SCAFFOLD_MODES: ScaffoldMode[] = [
  {
    id: 'chat',
    label: 'Hỏi đáp',
    icon: MessageSquare,
    active: 'bg-white text-tone-lavender-fg shadow-sm dark:bg-slate-800',
    hint: '',
    placeholder: 'Hỏi về IELTS, dán bài viết hoặc ảnh…',
  },
  {
    id: 'sentence_breakdown',
    label: 'Mổ xẻ câu',
    icon: Languages,
    active: 'bg-white text-tone-sky-fg shadow-sm dark:bg-slate-800',
    hint: 'Dán đoạn văn tiếng Anh: dịch, ngữ pháp và lưu ý cho từng câu.',
    placeholder: 'Dán đoạn văn tiếng Anh cần mổ xẻ…',
  },
  {
    id: 'vocab_extract',
    label: 'Từ vựng',
    icon: Bookmark,
    active: 'bg-white text-tone-butter-fg shadow-sm dark:bg-slate-800',
    hint: 'Dán bài đọc hoặc bài viết: lấy từ đáng học và thêm vào ôn tập.',
    placeholder: 'Dán nội dung để trích từ vựng…',
  },
  {
    id: 'quiz_generate',
    label: 'Quiz',
    icon: Puzzle,
    active: 'bg-white text-tone-aqua-fg shadow-sm dark:bg-slate-800',
    hint: 'Tạo quiz từ dữ liệu học của bạn, hoặc dán nội dung để tạo quiz từ đó.',
    placeholder: 'Dán nội dung để tạo quiz từ đó…',
  },
];

export const modeOf = (id: ScaffoldActionType) => SCAFFOLD_MODES.find((m) => m.id === id) ?? SCAFFOLD_MODES[0];

interface ScaffoldToolbarProps {
  activeMode: ScaffoldActionType;
  onSelectMode: (mode: ScaffoldActionType) => void;
}

/** Four equal tabs: the chat and its three study tools. */
export function ScaffoldToolbar({ activeMode, onSelectMode }: ScaffoldToolbarProps) {
  return (
    <div className="flex-shrink-0 px-3 pb-2 pt-2">
      <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800/70" role="tablist" aria-label="Chức năng">
        {SCAFFOLD_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectMode(mode.id)}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-[12px] font-semibold transition-colors ${
                isActive ? mode.active : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="hidden h-3.5 w-3.5 flex-shrink-0 min-[400px]:block" />
              <span className="truncate">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
