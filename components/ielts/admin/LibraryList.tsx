import React, { useMemo, useState } from 'react';
import { Copy, FilePlus2, Headphones, Pencil, Search, Trash2, Youtube } from 'lucide-react';
import {
  filterLibrary,
  itemStats,
  STATUS_LABELS_VI,
  type LibraryItem,
  type LibraryKind,
  type StatusFilter,
} from '../../../services/listeningLibraryLogic';
import { formatTimestamp } from '../../../services/youtubeLogic';
import { Segmented } from '../../ui/Segmented';
import { dangerBtn, hint, iconBtn, input, panel, primaryBtn, secondaryBtn, tag } from './styles';
import { toneClasses } from '../../ui/palette';

const publishedTag = `inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-medium ${toneClasses('mint').tile}`;

interface Props {
  items: LibraryItem[];
  onNew: (kind: LibraryKind) => void;
  onEdit: (item: LibraryItem) => void;
  onDuplicate: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  busyId: string | null;
}

const shortDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export default function LibraryList({ items, onNew, onEdit, onDuplicate, onDelete, busyId }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const shown = useMemo(() => filterLibrary(items, query, status), [items, query, status]);
  const counts = { all: items.length, draft: items.filter((i) => i.status === 'draft').length, published: items.filter((i) => i.status === 'published').length };

  return (
    <section aria-labelledby="library-list" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="library-list" className="text-title font-semibold text-slate-900 dark:text-white">
            Đề Listening
          </h2>
          <p className={`mt-1 ${hint}`}>Đề đã xuất bản hiện ở mục "Đề luyện thêm" trong trang Listening của học viên.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => onNew('full')} className={primaryBtn}>
            <FilePlus2 className="h-4 w-4" /> Đề 4 part
          </button>
          <button type="button" onClick={() => onNew('practice')} className={secondaryBtn}>
            <FilePlus2 className="h-4 w-4" /> Đề 1 part
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Tìm đề</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc bối cảnh" className={`${input} pl-9`} />
        </label>
        <Segmented<StatusFilter>
          label="Lọc theo trạng thái"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: `Tất cả (${counts.all})` },
            { value: 'draft', label: `Nháp (${counts.draft})` },
            { value: 'published', label: `Xuất bản (${counts.published})` },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className={`${panel} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
          <Headphones className="h-6 w-6 text-slate-400" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{items.length ? 'Không có đề nào khớp.' : 'Chưa có đề nào.'}</p>
          {!items.length && <p className={hint}>Tạo đề từ video YouTube của bạn hoặc dùng giọng AI đọc lời thoại.</p>}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => {
            const stats = itemStats(item);
            const confirming = confirmId === item.id;
            return (
              <li key={item.id} className={`${panel} p-4`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={item.status === 'published' ? publishedTag : tag}
                      >
                        {STATUS_LABELS_VI[item.status]}
                      </span>
                      <span className={tag}>{item.kind === 'full' ? '4 part' : `Part ${stats.parts[0]}`}</span>
                      {stats.recorded && (
                        <span className={tag}>
                          <Youtube className="h-3 w-3" /> YouTube
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title || 'Đề chưa đặt tên'}</h3>
                    <p className={`mt-0.5 ${hint}`}>
                      {stats.questions} câu{stats.seconds ? ` · ${formatTimestamp(stats.seconds)} audio` : ''} · sửa {shortDate(item.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center">
                    <button type="button" onClick={() => onEdit(item)} className={iconBtn} aria-label={`Sửa ${item.title}`} title="Sửa">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicate(item)}
                      disabled={busyId === item.id}
                      className={iconBtn}
                      aria-label={`Nhân bản ${item.title}`}
                      title="Nhân bản"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(confirming ? null : item.id)}
                      className={iconBtn}
                      aria-label={`Xoá ${item.title}`}
                      aria-expanded={confirming}
                      title="Xoá"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {confirming && (
                  <div role="alert" className="mt-3 flex flex-col gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-950/40 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm text-red-800 dark:text-red-200">
                      Xoá hẳn đề này? Học viên sẽ không mở lại được các bài đã làm trên đề.
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmId(null)} className={secondaryBtn}>
                        Giữ lại
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmId(null);
                          onDelete(item);
                        }}
                        className={dangerBtn}
                      >
                        Xoá đề
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
