import React from 'react';
import { BarChart3, BookOpenCheck, ChevronRight, Compass, Database, FileEdit, Map, Mic, Puzzle, Rocket, Target, TriangleAlert } from 'lucide-react';
import { learnerFacts, type ChatSuggestion, type LearnerData, type SuggestionIcon } from '../../services/chatLogic';
import type { Tone } from '../ui/palette';
import { toneClasses } from '../ui/palette';

type Icon = React.ComponentType<{ className?: string }>;

const SUGGESTION_ICON: Record<SuggestionIcon, { icon: Icon; tone: Tone }> = {
  quiz: { icon: Puzzle, tone: 'aqua' },
  review: { icon: BookOpenCheck, tone: 'butter' },
  target: { icon: Target, tone: 'peach' },
  error: { icon: TriangleAlert, tone: 'blush' },
  plan: { icon: Map, tone: 'sky' },
  start: { icon: Rocket, tone: 'mint' },
};

export interface StarterAction {
  id: string;
  label: string;
  icon: Icon;
  tone: Tone;
  prompt: string;
}

export const STARTERS: StarterAction[] = [
  { id: 'writing', label: 'Chấm bài Writing', icon: FileEdit, tone: 'lavender', prompt: 'Mình muốn gửi bài Writing để bạn chấm. Hãy cho mình biết cần gửi kèm những gì (đề bài, Task 1 hay 2) rồi mình dán bài vào nhé.' },
  { id: 'speaking', label: 'Speaking Part 2', icon: Mic, tone: 'peach', prompt: 'Cho mình 1 đề Speaking Part 2 hay gặp, dàn ý 4 ý trong 1 phút chuẩn bị và câu trả lời mẫu band 7.' },
  { id: 'chart', label: 'Phân tích biểu đồ', icon: BarChart3, tone: 'sky', prompt: 'Hướng dẫn mình cách viết overview cho Writing Task 1 và các cụm từ mô tả xu hướng hay nhất.' },
  { id: 'roadmap', label: 'Lộ trình lên band', icon: Compass, tone: 'mint', prompt: 'Lên lộ trình 8 tuần giúp mình tăng 0.5–1.0 band, chia theo từng kỹ năng và mỗi tuần.' },
];

interface Props {
  name?: string;
  data: LearnerData | null;
  loading: boolean;
  useData: boolean;
  suggestions: ChatSuggestion[];
  onSuggestion: (s: ChatSuggestion) => void;
  onStarter: (s: StarterAction) => void;
  onToggleData: () => void;
}

/** First screen of a new chat: what the AI knows about you and what to do next. */
export function ChatEmptyState({ name, data, loading, useData, suggestions, onSuggestion, onStarter, onToggleData }: Props) {
  const facts = data ? learnerFacts(data) : [];
  return (
    <div className="anim-chat-msg-in space-y-4 pb-2">
      <div>
        <p className="text-[17px] font-bold text-slate-900 dark:text-white">Chào {name || 'bạn'} 👋</p>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Hỏi mình bất cứ điều gì về IELTS, gửi bài viết, ảnh biểu đồ hoặc ghi âm.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-tone-lavender-fg" aria-hidden />
          <p className="flex-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Dữ liệu học của bạn</p>
          <button
            type="button"
            role="switch"
            aria-checked={useData}
            onClick={onToggleData}
            className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${useData ? 'bg-tone-lavender-accent' : 'bg-slate-300 dark:bg-slate-600'}`}
            title={useData ? 'AI đang dùng dữ liệu học của bạn' : 'AI không đọc dữ liệu học của bạn'}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${useData ? 'left-[18px]' : 'left-0.5'}`} />
            <span className="sr-only">Cho AI đọc dữ liệu học</span>
          </button>
        </div>
        {!useData ? (
          <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Đang tắt. Bật để AI gợi ý theo từ bạn hay sai, band và lỗi lặp lại.</p>
        ) : loading && !data ? (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-white dark:bg-slate-800" />
            ))}
          </div>
        ) : facts.length ? (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {facts.map((f) => (
              <div key={f.label} className="rounded-xl bg-white px-2.5 py-1.5 dark:bg-slate-900">
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">{f.label}</p>
                <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{f.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Chưa có nhiều dữ liệu. Học vài bài là AI sẽ gợi ý sát hơn.</p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Gợi ý cho bạn</p>
          <div className="space-y-1.5">
            {suggestions.map((s) => {
              const { icon: SIcon, tone } = SUGGESTION_ICON[s.icon];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSuggestion(s)}
                  className="press group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-tone-lavender-border hover:bg-tone-lavender/50 dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${toneClasses(tone).tile}`}>
                    <SIcon className="icon-pop h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-900 dark:text-white">{s.title}</span>
                    <span className="block truncate text-[11.5px] text-slate-500 dark:text-slate-400">{s.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Bắt đầu nhanh</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STARTERS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onStarter(a)}
              className="press group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:border-tone-lavender-border dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${toneClasses(a.tone).tile}`}>
                <a.icon className="icon-pop h-3.5 w-3.5" />
              </span>
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatEmptyState;
