/**
 * The list of library tests on the admin page, for Listening and Reading:
 * search, status filter, new, edit, duplicate and delete.
 */
import React, { useMemo, useState } from 'react';
import { BookOpenText, Copy, FilePlus2, Headphones, Pencil, Search, Trash2, Youtube } from 'lucide-react';
import { filterLibrary, itemStats, STATUS_LABELS_VI, type LibraryItem, type LibraryKind, type StatusFilter } from '../../../services/listeningLibraryLogic';
import { filterReadingLibrary, readingItemStats, type ReadingLibraryItem } from '../../../services/readingLibraryLogic';
import { formatTimestamp } from '../../../services/youtubeLogic';
import { Segmented } from '../../ui/Segmented';
import { dangerBtn, hint, iconBtn, input, panel, primaryBtn, secondaryBtn, tag } from './styles';
import { toneClasses } from '../../ui/palette';

const publishedTag = `inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-medium ${toneClasses('mint').tile}`;

/** What a list item needs; each skill's item has more. */
interface ListItem {
  id: string;
  title: string;
  kind: LibraryKind;
  status: LibraryItem['status'];
  updatedAt: string;
}

/** The words and parts that differ between the Listening and Reading lists. */
export interface ListConfig<T extends ListItem> {
  heading: string;
  description: string;
  newFull: string;
  newPractice: string;
  searchPlaceholder: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyHint: string;
  filter: (items: readonly T[], query: string, status: StatusFilter) => T[];
  /** Tags after the status, and the line under the title. */
  meta: (item: T) => { tags: React.ReactNode[]; line: string };
}

interface Props<T extends ListItem> {
  config: ListConfig<T>;
  items: T[];
  onNew: (kind: LibraryKind) => void;
  onEdit: (item: T) => void;
  onDuplicate: (item: T) => void;
  onDelete: (item: T) => void;
  busyId: string | null;
}

const shortDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const LISTENING_LIST: ListConfig<LibraryItem> = {
  heading: 'Đề Listening',
  description: 'Đề đã xuất bản hiện ở mục "Đề luyện thêm" trong trang Listening của học viên.',
  newFull: 'Đề 4 part',
  newPractice: 'Đề 1 part',
  searchPlaceholder: 'Tìm theo tên hoặc bối cảnh',
  emptyIcon: Headphones,
  emptyHint: 'Tạo đề từ video YouTube của bạn hoặc dùng giọng AI đọc lời thoại.',
  filter: (items, query, status) => filterLibrary([...items], query, status),
  meta: (item) => {
    const stats = itemStats(item);
    return {
      tags: [
        <span key="kind" className={tag}>
          {item.kind === 'full' ? '4 part' : `Part ${stats.parts[0]}`}
        </span>,
        stats.recorded && (
          <span key="yt" className={tag}>
            <Youtube className="h-3 w-3" /> YouTube
          </span>
        ),
      ],
      line: `${stats.questions} câu${stats.seconds ? ` · ${formatTimestamp(stats.seconds)} audio` : ''}`,
    };
  },
};

export const READING_LIST: ListConfig<ReadingLibraryItem> = {
  heading: 'Đề Reading',
  description: 'Đề đã xuất bản hiện ở mục "Đề luyện thêm" trong trang Reading của học viên.',
  newFull: 'Đề 3 passage',
  newPractice: 'Đề 1 passage',
  searchPlaceholder: 'Tìm theo tên, tiêu đề bài đọc hoặc chủ đề',
  emptyIcon: BookOpenText,
  emptyHint: 'Dán một bài đọc học thuật, chia đoạn tự động rồi thêm câu hỏi.',
  filter: filterReadingLibrary,
  meta: (item) => {
    const stats = readingItemStats(item);
    return {
      tags: [
        <span key="kind" className={tag}>
          {item.kind === 'full' ? '3 passage' : `Passage ${stats.parts[0]}`}
        </span>,
      ],
      line: `${stats.questions} câu · ${stats.words} từ`,
    };
  },
};

export default function LibraryList<T extends ListItem>({ config, items, onNew, onEdit, onDuplicate, onDelete, busyId }: Props<T>) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const shown = useMemo(() => config.filter(items, query, status), [config, items, query, status]);
  const counts = { all: items.length, draft: items.filter((i) => i.status === 'draft').length, published: items.filter((i) => i.status === 'published').length };

  return (
    <section aria-labelledby="library-list" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="library-list" className="text-title font-semibold text-slate-900 dark:text-white">
            {config.heading}
          </h2>
          <p className={`mt-1 ${hint}`}>{config.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => onNew('full')} className={primaryBtn}>
            <FilePlus2 className="h-4 w-4" /> {config.newFull}
          </button>
          <button type="button" onClick={() => onNew('practice')} className={secondaryBtn}>
            <FilePlus2 className="h-4 w-4" /> {config.newPractice}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Tìm đề</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={config.searchPlaceholder} className={`${input} pl-9`} />
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
          <config.emptyIcon className="h-6 w-6 text-tone-sky-fg" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{items.length ? 'Không có đề nào khớp.' : 'Chưa có đề nào.'}</p>
          {!items.length && <p className={hint}>{config.emptyHint}</p>}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => {
            const meta = config.meta(item);
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
                      {meta.tags}
                    </div>
                    <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title || 'Đề chưa đặt tên'}</h3>
                    <p className={`mt-0.5 ${hint}`}>
                      {meta.line} · sửa {shortDate(item.updatedAt)}
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
                  <div role="alert" className="mt-3 flex flex-col gap-2 rounded-xl bg-tone-blush p-3 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm text-tone-blush-fg">
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
