/**
 * Marks where each segment of a YouTube part starts and ends, while the
 * video plays: M marks a boundary (the current segment ends, the next one
 * starts), E ends the last segment, Space plays or pauses. Times can then be
 * nudged by half a second or typed, and each segment previewed on its own.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircleStop, Flag, Loader2, Minus, Pause, Play, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import type { ListeningSection } from '../../../data/ielts/listening/types';
import {
  addSegment,
  clearTimes,
  markBoundary,
  markEnd,
  nudgeTime,
  removeSegment,
  segmentSeconds,
  setTime,
} from '../../../services/listeningLibraryLogic';
import { formatTimestamp, parseTimestamp } from '../../../services/youtubeLogic';
import { createYouTubePlayer, YT_STATE, youtubeErrorMessage, type CreatePlayer, type YTPlayerLike } from '../listening/youtubeMedia';
import { dangerBtn, ghostBtn, hint, iconBtn, panel, primaryBtn, secondaryBtn, subPanel } from './styles';

interface Props {
  section: ListeningSection;
  onChange: (section: ListeningSection) => void;
  /** Swapped out in tests. */
  create?: CreatePlayer;
}

const EDITOR_VARS = { controls: 1, disablekb: 0, fs: 0 };

/** The first segment still missing an end: where marking carries on. */
const firstOpen = (s: ListeningSection) => {
  const i = s.segments.findIndex((x) => typeof x.end !== 'number');
  return i < 0 ? s.segments.length : i;
};

function TimeField({ value, onCommit, label }: { value: number | undefined; onCommit: (v: number | undefined) => void; label: string }) {
  const shown = typeof value === 'number' ? formatTimestamp(value) : '';
  const [text, setText] = useState(shown);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(shown);
    setBad(false);
  }, [shown]);
  const commit = () => {
    if (!text.trim()) {
      onCommit(undefined);
      return;
    }
    const t = parseTimestamp(text);
    if (t === null) setBad(true);
    else onCommit(t);
  };
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      aria-label={label}
      aria-invalid={bad}
      placeholder="–:––"
      inputMode="decimal"
      className={`h-9 w-[4.5rem] rounded-lg border bg-white px-2 text-center text-sm tabular-nums text-slate-900 focus:outline-none dark:bg-slate-950 dark:text-white ${
        bad ? 'border-red-400' : 'border-slate-200 focus:border-slate-400 dark:border-slate-700'
      }`}
    />
  );
}

export default function TimestampMarker({ section, onChange, create = createYouTubePlayer }: Props) {
  const videoId = section.youtube?.videoId ?? '';
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayerLike | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [cursor, setCursorState] = useState(() => firstOpen(section));
  /** Mirrors cursor, so fast key presses never mark from a stale one. */
  const cursorRef = useRef(cursor);
  const setCursor = (c: number) => {
    cursorRef.current = c;
    setCursorState(c);
  };
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const previewEnd = useRef<number | null>(null);
  /** The latest section, for key presses between renders. */
  const latest = useRef(section);
  latest.current = section;
  const history = useRef<ListeningSection[]>([]);

  useEffect(() => {
    if (!videoId || !host.current) return;
    let cancelled = false;
    const el = document.createElement('div');
    host.current.replaceChildren(el);
    setReady(false);
    setError('');
    create(
      el,
      videoId,
      0,
      {
        onStateChange: (s) => setPlaying(s === YT_STATE.PLAYING || s === YT_STATE.BUFFERING),
        onError: (code) => setError(youtubeErrorMessage(code)),
      },
      EDITOR_VARS,
    ).then(
      (p) => {
        if (cancelled) return p.destroy();
        player.current = p;
        setReady(true);
      },
      () => !cancelled && setError('Không tải được trình phát YouTube. Kiểm tra kết nối mạng rồi thử lại.'),
    );
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId, create]);

  // The clock, and the end of a segment preview.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = player.current;
      if (!p) return;
      const t = p.getCurrentTime();
      setNow(t);
      if (previewEnd.current !== null && t >= previewEnd.current) {
        previewEnd.current = null;
        setPreviewing(null);
        p.pauseVideo();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [ready]);

  const commit = useCallback(
    (next: ListeningSection) => {
      history.current = [...history.current.slice(-30), latest.current];
      latest.current = next;
      onChange(next);
    },
    [onChange],
  );

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p) return;
    previewEnd.current = null;
    setPreviewing(null);
    const s = p.getPlayerState();
    if (s === YT_STATE.PLAYING || s === YT_STATE.BUFFERING) p.pauseVideo();
    else p.playVideo();
  }, []);

  const mark = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const { section: next, cursor: nc } = markBoundary(latest.current, cursorRef.current, p.getCurrentTime());
    if (next !== latest.current) commit(next);
    cursorRef.current = nc;
    setCursor(nc);
  }, [commit]);

  const end = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const c = cursorRef.current;
    const next = markEnd(latest.current, c, p.getCurrentTime());
    if (next !== latest.current) {
      commit(next);
      setCursor(c + 1);
    }
  }, [commit]);

  const seekBy = (delta: number) => {
    const p = player.current;
    if (p) p.seekTo(Math.max(0, p.getCurrentTime() + delta), true);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    latest.current = prev;
    onChange(prev);
    setCursor(firstOpen(prev));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        mark();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        end();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, mark, end]);

  const preview = (i: number) => {
    const p = player.current;
    const seg = section.segments[i];
    if (!p || typeof seg?.start !== 'number') return;
    if (previewing === seg.id) {
      previewEnd.current = null;
      setPreviewing(null);
      p.pauseVideo();
      return;
    }
    p.seekTo(seg.start, true);
    previewEnd.current = typeof seg.end === 'number' ? seg.end : null;
    setPreviewing(seg.id);
    p.playVideo();
  };

  const nudgeBtn = `${iconBtn} !min-h-9 !min-w-9`;
  const total = section.segments.reduce((n, x) => n + segmentSeconds(x), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
          <div ref={host} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải video" />
            </div>
          )}
          {error && (
            <p role="alert" className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
        </div>

        <div className={`${subPanel} flex flex-col gap-3 p-4`}>
          <p className="text-center text-3xl font-semibold tabular-nums text-slate-900 dark:text-white" aria-live="off">
            {formatTimestamp(now)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => seekBy(-5)} disabled={!ready} className={secondaryBtn} aria-label="Lùi 5 giây" title="Lùi 5 giây">
              <RotateCcw className="h-4 w-4" />5
            </button>
            <button type="button" onClick={toggle} disabled={!ready} className={primaryBtn} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={undo} disabled={!history.current.length} className={secondaryBtn} aria-label="Hoàn tác" title="Hoàn tác">
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={mark} disabled={!ready} className={primaryBtn}>
            <Flag className="h-4 w-4" /> Đánh mốc đoạn {Math.min(cursor, section.segments.length) + 1}
            <kbd className="rounded bg-white/20 px-1.5 text-caption dark:bg-slate-900/20">M</kbd>
          </button>
          <button type="button" onClick={end} disabled={!ready || cursor >= section.segments.length} className={secondaryBtn}>
            <CircleStop className="h-4 w-4" /> Kết thúc đoạn cuối
            <kbd className="rounded bg-slate-100 px-1.5 text-caption dark:bg-slate-800">E</kbd>
          </button>
          <p className={hint}>
            Phát video, bấm <b>M</b> ngay khi một đoạn mới bắt đầu (mốc đầu tiên là lúc audio bắt đầu). Bấm <b>E</b> khi audio của part kết thúc.{' '}
            <b>Space</b> để phát/dừng.
          </p>
        </div>
      </div>

      <div className={`${panel} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {section.segments.length} đoạn · {formatTimestamp(total)}
          </h3>
          <div className="flex gap-1">
            <button type="button" onClick={() => commit(addSegment(section))} className={ghostBtn}>
              <Plus className="h-4 w-4" /> Thêm đoạn
            </button>
            <button type="button" onClick={() => setConfirmClear((v) => !v)} disabled={!section.segments.length} className={ghostBtn} aria-expanded={confirmClear}>
              Xoá mọi mốc
            </button>
          </div>
        </div>
        {confirmClear && (
          <div role="alert" className="mt-3 flex flex-col gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-950/40 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-red-800 dark:text-red-200">Xoá thời gian của mọi đoạn? Lời thoại và câu hỏi vẫn giữ nguyên.</p>
            <button
              type="button"
              onClick={() => {
                commit(clearTimes(section));
                setCursor(0);
                setConfirmClear(false);
              }}
              className={dangerBtn}
            >
              Xoá mốc
            </button>
          </div>
        )}

        {section.segments.length === 0 ? (
          <p className={`mt-3 ${hint}`}>Chưa có đoạn nào. Bấm M khi video phát để tạo đoạn đầu tiên.</p>
        ) : (
          <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {section.segments.map((seg, i) => {
              const first = seg.lines[0];
              const isCursor = i === cursor;
              return (
                <li key={seg.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center ${isCursor ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCursor(i)}
                      className={`inline-flex h-7 min-w-7 flex-shrink-0 items-center justify-center rounded-md px-1 text-caption font-bold tabular-nums ${
                        isCursor ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                      aria-label={`Đánh mốc tiếp từ đoạn ${i + 1}`}
                      title="Đánh mốc tiếp từ đoạn này"
                    >
                      {i + 1}
                    </button>
                    <p className="min-w-0 flex-1 truncate text-caption text-slate-500 dark:text-slate-400">
                      {first ? `${first.speaker}: ${first.text}` : 'Chưa có lời thoại'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(['start', 'end'] as const).map((field) => (
                      <span key={field} className="inline-flex items-center">
                        <button type="button" onClick={() => commit(nudgeTime(section, i, field, -0.5))} className={nudgeBtn} aria-label={`${field === 'start' ? 'Bắt đầu' : 'Kết thúc'} đoạn ${i + 1} sớm 0,5 giây`}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <TimeField
                          value={seg[field]}
                          label={`${field === 'start' ? 'Bắt đầu' : 'Kết thúc'} đoạn ${i + 1}`}
                          onCommit={(v) => commit(setTime(section, i, field, v))}
                        />
                        <button type="button" onClick={() => commit(nudgeTime(section, i, field, 0.5))} className={nudgeBtn} aria-label={`${field === 'start' ? 'Bắt đầu' : 'Kết thúc'} đoạn ${i + 1} muộn 0,5 giây`}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        {field === 'start' && <span className="px-0.5 text-slate-400">–</span>}
                      </span>
                    ))}
                    <span className="w-12 text-right text-caption tabular-nums text-slate-500">{segmentSeconds(seg) ? `${Math.round(segmentSeconds(seg))} giây` : ''}</span>
                    <button
                      type="button"
                      onClick={() => preview(i)}
                      disabled={!ready || typeof seg.start !== 'number'}
                      className={iconBtn}
                      aria-label={previewing === seg.id ? `Dừng nghe đoạn ${i + 1}` : `Nghe đoạn ${i + 1}`}
                      title="Nghe đoạn này"
                    >
                      {previewing === seg.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        commit(removeSegment(section, seg.id));
                        if (cursor > i) setCursor(cursor - 1);
                      }}
                      className={iconBtn}
                      aria-label={`Xoá đoạn ${i + 1}`}
                      title="Xoá đoạn"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
