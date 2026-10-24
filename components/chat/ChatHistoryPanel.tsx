import React, { useMemo, useState } from 'react';
import { Check, MessageSquare, Pencil, Search, SquarePen, Trash2, X } from 'lucide-react';
import { conversationPreview, groupConversations, searchConversations, type StoredConversation } from '../../services/chatLogic';

interface Props {
  conversations: StoredConversation[];
  activeId: string;
  onOpen: (c: StoredConversation) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  /** Sidebar in the wide layout: no close button. */
  onClose?: () => void;
}

const timeOf = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : `${d.getDate()}/${d.getMonth() + 1}`;
};

/** Saved conversations: search, reopen, rename, delete. */
export function ChatHistoryPanel({ conversations, activeId, onOpen, onNew, onRename, onDelete, onClearAll, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const groups = useMemo(() => groupConversations(searchConversations(conversations, query), new Date()), [conversations, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <p className="flex-1 text-[13px] font-semibold text-slate-900 dark:text-white">Lịch sử trò chuyện</p>
        <button type="button" onClick={onNew} className="press inline-flex h-8 items-center gap-1.5 rounded-lg bg-tone-lavender-soft px-2.5 text-[12px] font-semibold text-tone-lavender-fg hover:bg-tone-lavender-border">
          <SquarePen className="h-3.5 w-3.5" aria-hidden /> Mới
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="press flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Đóng lịch sử">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900">
          <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong lịch sử…"
            className="h-8 w-full bg-transparent text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:outline-none dark:text-slate-100"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 && (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <MessageSquare className="h-7 w-7 text-slate-300 dark:text-slate-600" aria-hidden />
            <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">
              {query ? 'Không tìm thấy cuộc trò chuyện nào.' : 'Chưa có cuộc trò chuyện nào. Các câu hỏi của bạn sẽ được lưu ở đây.'}
            </p>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-2">
            <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{g.label}</p>
            {g.items.map((c) => {
              const active = c.id === activeId;
              if (editing?.id === c.id) {
                return (
                  <form
                    key={c.id}
                    className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onRename(c.id, editing.title);
                      setEditing(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={editing.title}
                      onChange={(e) => setEditing({ id: c.id, title: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[12.5px] focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      aria-label="Tên cuộc trò chuyện"
                    />
                    <button type="submit" className="flex h-7 w-7 items-center justify-center rounded-md text-tone-mint-fg hover:bg-tone-mint" aria-label="Lưu tên">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </form>
                );
              }
              return (
                <div key={c.id} className={`group relative rounded-lg ${active ? 'bg-tone-lavender' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'}`}>
                  <button type="button" onClick={() => onOpen(c)} className="w-full px-2.5 py-2 pr-16 text-left">
                    <span className={`block truncate text-[12.5px] font-medium ${active ? 'text-tone-lavender-fg' : 'text-slate-800 dark:text-slate-100'}`}>{c.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {timeOf(c.updatedAt)} · {conversationPreview(c) || `${c.messages.length} tin nhắn`}
                    </span>
                  </button>
                  <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button type="button" onClick={() => setEditing({ id: c.id, title: c.title })} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-white" aria-label={`Đổi tên ${c.title}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onDelete(c.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-tone-blush hover:text-tone-blush-fg" aria-label={`Xoá ${c.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {conversations.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {confirmClear ? (
            <span className="flex items-center gap-2">
              Xoá toàn bộ {conversations.length} cuộc trò chuyện?
              <button type="button" onClick={() => { onClearAll(); setConfirmClear(false); }} className="font-semibold text-tone-blush-fg hover:underline">Xoá</button>
              <button type="button" onClick={() => setConfirmClear(false)} className="font-semibold hover:underline">Huỷ</button>
            </span>
          ) : (
            <span className="flex items-center justify-between gap-2">
              <span>Lưu trên trình duyệt này · {conversations.length} cuộc</span>
              <button type="button" onClick={() => setConfirmClear(true)} className="font-semibold hover:text-tone-blush-fg">Xoá tất cả</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatHistoryPanel;
