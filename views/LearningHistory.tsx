import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, CircleDashed, History, Loader2, Plus, Repeat, Search, Trash2, X } from 'lucide-react';
import { deleteLearningRecord, type LearningRecord } from '../services/supabaseClient';
import { getHistoryPage, HISTORY_PAGE_SIZE } from '../services/historyService';
import { getLibraryWords } from '../services/vocabLibraryService';
import type { LibraryWord } from '../services/vocabLibraryLogic';
import { normalizeWord } from '../services/masteryService';
import {
  entryTime,
  groupByDay,
  matchesHistory,
  toHistoryEntry,
  trackedIds,
  type HistoryEntry,
  type HistoryRow,
} from '../services/historyLogic';
import { getLevelMeta } from '../components/ui/srsTheme';
import { ErrorState, Skeleton } from '../components/ui/States';

interface LearningHistoryProps {
  userId: string;
  onStartLesson: () => void;
  onOpenLesson?: (record: LearningRecord) => void;
  /** Review the given word_mastery ids now. */
  onReviewWords?: (ids: string[]) => void;
  isLoadingLesson?: boolean;
}

/** Words shown before "Xem tất cả". */
const PREVIEW_WORDS = 6;

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
const ghostBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

interface CardProps {
  entry: HistoryEntry;
  now: Date;
  byWord: ReadonlyMap<string, LibraryWord>;
  reviewIds: string[];
  onOpen: () => void;
  onReview?: () => void;
  onDelete: () => Promise<void>;
}

const HistoryCard: React.FC<CardProps> = ({ entry, now, byWord, reviewIds, onOpen, onReview, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shown = expanded ? entry.words : entry.words.slice(0, PREVIEW_WORDS);
  const hidden = entry.words.length - PREVIEW_WORDS;
  const titleId = `history-${entry.id}`;

  return (
    <li className={`${panel} p-4 sm:p-5`} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="truncate font-semibold text-slate-900 dark:text-white">
            {entry.topic}
          </h3>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            {entry.level} · {entry.words.length} từ · {entryTime(entry.completedAt, now)}
          </p>
        </div>
        {entry.finished ? (
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-caption font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Hoàn thành
          </span>
        ) : (
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-caption font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
            Chưa xong
          </span>
        )}
      </div>

      {entry.scores.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption">
          {entry.scores.map((s) => (
            <div key={s.label} className="flex gap-1">
              <dt className="text-slate-500 dark:text-slate-400">{s.label}</dt>
              <dd className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {s.result.score}/{s.result.total}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {entry.words.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-x-6 border-t border-slate-100 pt-2 dark:border-slate-800 sm:grid-cols-2">
          {shown.map((w) => {
            const tracked = byWord.get(normalizeWord(w.word));
            const meta = tracked ? getLevelMeta(tracked.mastery_level, !!tracked.is_suspended) : null;
            return (
              <li key={w.word} className="flex min-w-0 items-baseline gap-2 py-1.5">
                <span
                  className={`h-2 w-2 flex-shrink-0 translate-y-[-1px] rounded-full ${meta ? meta.dot : 'bg-slate-200 dark:bg-slate-700'}`}
                  title={meta ? meta.label : 'Chưa vào lịch ôn'}
                  aria-hidden="true"
                />
                <span className="flex-shrink-0 font-medium text-slate-900 dark:text-white">{w.word}</span>
                {w.partOfSpeech && <span className="flex-shrink-0 text-caption text-slate-400">{w.partOfSpeech}</span>}
                <span className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400" title={w.meaning ?? undefined}>
                  {w.meaning ?? ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className={`${ghostBtn} -ml-3 mt-1`}>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          {expanded ? 'Thu gọn' : `Xem tất cả ${entry.words.length} từ`}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        {confirming ? (
          <>
            <span className="mr-auto text-sm text-slate-700 dark:text-slate-200">Xoá bài học này khỏi lịch sử?</span>
            <button type="button" onClick={() => setConfirming(false)} className={ghostBtn} disabled={deleting}>
              Huỷ
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                  setConfirming(false);
                }
              }}
              className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? 'Đang xoá' : 'Xoá'}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onOpen} className={secondaryBtn}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Mở bài
            </button>
            {onReview && reviewIds.length > 0 && (
              <button type="button" onClick={onReview} className={ghostBtn}>
                <Repeat className="h-4 w-4" aria-hidden="true" />
                Ôn {reviewIds.length} từ
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${ghostBtn} ml-auto text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400`}
              aria-label={`Xoá bài ${entry.topic}`}
              title="Xoá bài học"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
};

const CardSkeleton: React.FC = () => (
  <div className={`${panel} space-y-3 p-5`}>
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-3 w-1/3" />
    <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  </div>
);

/**
 * Lịch sử học: lessons by day, each showing its words and meanings, so the
 * learner can find a lesson (or a word) without opening it.
 */
const LearningHistory: React.FC<LearningHistoryProps> = ({ userId, onStartLesson, onOpenLesson, onReviewWords, isLoadingLesson }) => {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryWord[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    setError(null);
    try {
      const page = await getHistoryPage(userId, 0);
      setRows(page);
      setHasMore(page.length === HISTORY_PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Vui lòng kiểm tra kết nối mạng rồi thử lại.');
    }
  }, [userId]);

  useEffect(() => {
    void load();
    // SRS state and meanings for older lessons; the list works without it.
    getLibraryWords(userId)
      .then(setLibrary)
      .catch((err) => console.warn('History: could not load word library:', err));
  }, [load, userId]);

  const loadMore = async () => {
    if (!rows) return;
    setLoadingMore(true);
    try {
      const page = await getHistoryPage(userId, rows.length);
      setRows([...rows, ...page]);
      setHasMore(page.length === HISTORY_PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch more history:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const byWord = useMemo(() => new Map(library.map((w) => [normalizeWord(w.word), w])), [library]);
  const idByWord = useMemo(() => new Map(library.map((w) => [normalizeWord(w.word), w.id])), [library]);
  const meanings = useMemo(() => new Map(library.map((w) => [normalizeWord(w.word), w.meaning_vi ?? null])), [library]);
  const entries = useMemo(() => (rows ?? []).map((r) => toHistoryEntry(r, meanings)), [rows, meanings]);
  const visible = useMemo(() => entries.filter((e) => matchesHistory(e, query)), [entries, query]);
  const now = useMemo(() => new Date(), [rows]);
  const groups = useMemo(() => groupByDay(visible, now), [visible, now]);

  const open = (e: HistoryEntry) =>
    onOpenLesson?.({
      id: e.id,
      user_id: userId,
      topic: e.topic,
      level: e.level,
      words: e.rawWords,
      quiz_score: null,
      quiz_total: null,
      lesson_data: null,
      completed_at: e.completedAt,
    });

  const remove = async (id: string) => {
    try {
      await deleteLearningRecord(id);
      setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-heading font-bold text-slate-900 dark:text-white">Lịch sử học</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {rows === null ? 'Đang tải…' : rows.length > 0 ? `${rows.length}${hasMore ? '+' : ''} bài học` : 'Chưa có bài học nào'}
          </p>
        </div>
        <button type="button" onClick={onStartLesson} className={`${primaryBtn} w-full sm:w-auto`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Bài học mới
        </button>
      </header>

      {isLoadingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm" role="status" aria-live="polite">
          <div className={`${panel} flex items-center gap-3 px-6 py-4 shadow-xl`}>
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Đang mở bài học…</p>
          </div>
        </div>
      )}

      {error ? (
        <ErrorState title="Không tải được lịch sử" message={error} onRetry={() => void load()} />
      ) : rows === null ? (
        <div className="space-y-3" role="status" aria-label="Đang tải lịch sử">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : rows.length === 0 ? (
        <div className={`${panel} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
          <History className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <p className="font-semibold text-slate-900 dark:text-white">Chưa có lịch sử</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">Học xong bài đầu tiên, bài học và từ vựng sẽ hiện ở đây.</p>
          <button type="button" onClick={onStartLesson} className={primaryBtn}>
            Bắt đầu học
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm chủ đề, từ hoặc nghĩa"
              aria-label="Tìm trong lịch sử"
              className="min-h-touch w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Xoá tìm kiếm"
                className="absolute right-1 top-1/2 inline-flex min-h-touch min-w-touch -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Không có bài nào khớp “{query.trim()}”{hasMore ? '. Tải thêm để tìm trong bài cũ hơn.' : '.'}
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.label} aria-label={g.label} className="space-y-3">
                <h2 className="flex items-baseline gap-2 text-caption font-semibold text-slate-500 dark:text-slate-400">
                  {g.label}
                  <span className="font-normal tabular-nums text-slate-400">{g.entries.length}</span>
                </h2>
                <ul className="space-y-3">
                  {g.entries.map((e) => {
                    const ids = trackedIds(e, idByWord);
                    return (
                      <HistoryCard
                        key={e.id}
                        entry={e}
                        now={now}
                        byWord={byWord}
                        reviewIds={ids}
                        onOpen={() => open(e)}
                        onReview={onReviewWords ? () => onReviewWords(ids) : undefined}
                        onDelete={() => remove(e.id)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))
          )}

          {hasMore && (
            <div className="flex justify-center">
              <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className={secondaryBtn}>
                {loadingMore ? 'Đang tải…' : 'Tải thêm'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LearningHistory;
