import React from 'react';
import { Languages, Bookmark, HelpCircle, Lightbulb, MessageSquare } from 'lucide-react';
import { ScaffoldActionType } from '../../services/scaffoldActionTypes';

interface ScaffoldToolbarProps {
  activeMode: ScaffoldActionType;
  onSelectMode: (mode: ScaffoldActionType) => void;
  onQuickPrompt: (prompt: string) => void;
}

export function ScaffoldToolbar({ activeMode, onSelectMode, onQuickPrompt }: ScaffoldToolbarProps) {
  const modes: {
    id: ScaffoldActionType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    activeBg: string;
  }[] = [
    {
      id: 'chat',
      label: 'Hỏi đáp AI',
      icon: MessageSquare,
      accentColor: 'text-slate-600 dark:text-slate-300',
      activeBg: 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs border-rose-200 dark:border-rose-800/60',
    },
    {
      id: 'sentence_breakdown',
      label: 'Mổ xẻ câu',
      icon: Languages,
      accentColor: 'text-indigo-600 dark:text-indigo-400',
      activeBg: 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs border-indigo-200 dark:border-indigo-800/60',
    },
    {
      id: 'vocab_extract',
      label: 'Từ vựng SRS',
      icon: Bookmark,
      accentColor: 'text-violet-600 dark:text-violet-400',
      activeBg: 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs border-violet-200 dark:border-violet-800/60',
    },
    {
      id: 'quiz_generate',
      label: 'Luyện Quiz',
      icon: HelpCircle,
      accentColor: 'text-amber-600 dark:text-amber-400',
      activeBg: 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs border-amber-200 dark:border-amber-800/60',
    },
  ];

  return (
    <div className="flex-shrink-0 px-3 py-2 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md select-none">
      <div className="flex items-center justify-between gap-1.5">
        {/* Segmented Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-900/60 rounded-xl overflow-x-auto min-w-max flex-1">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap border
                  ${
                    isActive
                      ? mode.activeBg
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'scale-110' : ''}`} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scaffolding Hint quick button */}
        <button
          onClick={() =>
            onQuickPrompt(
              'Hãy gợi ý cho tôi định hướng tư duy từng bước cho nội dung này theo phương pháp sư phạm (chưa đưa ra ngay lời giải hoàn chỉnh).'
            )
          }
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-2xs active:scale-95"
          title="Gợi ý tư duy sư phạm từng bước"
        >
          <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Gợi ý</span>
        </button>
      </div>
    </div>
  );
}
