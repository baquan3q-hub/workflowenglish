/**
 * Plays a Listening part as a queue of segment clips, one after another.
 *
 * - exam: one play-through like the real test. Optional reading time first,
 *   then no pause, seek or speed change.
 * - practice: pause, replay a segment, jump between segments, 0.75–1.25×.
 *
 * The parent can jump to a segment through the ref (review: "Nghe lại đoạn này").
 *
 * Clips are TTS files played by an <audio> element, or, for a part recorded on
 * YouTube, `yt:` sources played by an embedded video (youtubeMedia.ts). One
 * recording plays straight through its segments, with no gap between them.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Headphones, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { AUDIO_ERROR, AudioClipMedia, type ClipEvents, type ClipMedia } from './listening/clipMedia';
import { YOUTUBE_TAP_HINT, YouTubeClipMedia, type CreatePlayer } from './listening/youtubeMedia';
import { isYouTubeSource } from '../../services/youtubeLogic';

export const PLAYBACK_RATES = [0.75, 1, 1.25] as const;
type Rate = (typeof PLAYBACK_RATES)[number];
/** Pause between segments, like a turn change in a recording. */
const SEGMENT_GAP_MS = 350;

export interface PlayerSegment {
  id: string;
  /** Shown as the tick's tooltip, e.g. the speaker. */
  label?: string;
}

export interface SegmentPlayerHandle {
  playSegment(id: string): void;
  pause(): void;
}

interface Props {
  segments: readonly PlayerSegment[];
  urls: Record<string, string>;
  mode: 'exam' | 'practice';
  /** Exam only: seconds to read the questions before the audio starts. */
  prepSeconds?: number;
  onSegmentChange?: (id: string | null) => void;
  onFinished?: () => void;
  /** YouTube player factory; swapped out in tests and previews. */
  createYouTubePlayer?: CreatePlayer;
}

type Phase = 'idle' | 'prep' | 'playing' | 'paused' | 'done' | 'error';

const primaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100';
const secondaryBtn =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const iconBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800';
const chipBase = 'inline-flex min-h-touch items-center rounded-xl border px-2.5 text-caption font-semibold tabular-nums transition-colors';
const chipOn = 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900';
const chipOff =
  'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

const SegmentPlayer = forwardRef<SegmentPlayerHandle, Props>(function SegmentPlayer(
  { segments, urls, mode, prepSeconds = 0, onSegmentChange, onFinished, createYouTubePlayer },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<ClipMedia | null>(null);
  const gapTimer = useRef<number | undefined>(undefined);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fraction, setFraction] = useState(0);
  const [rate, setRate] = useState<Rate>(1);
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const [errorText, setErrorText] = useState(AUDIO_ERROR);
  const [hint, setHint] = useState('');
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const exam = mode === 'exam';
  const effectiveRate: Rate = exam ? 1 : rate;
  const youtube = useMemo(() => segments.some((s) => isYouTubeSource(urls[s.id])), [segments, urls]);

  // Latest callbacks and segments without re-binding the media.
  const callbacks = useRef({ onSegmentChange, onFinished });
  callbacks.current = { onSegmentChange, onFinished };
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const endedRef = useRef<() => void>(() => undefined);
  const createRef = useRef(createYouTubePlayer);

  // One media per kind of source.
  useEffect(() => {
    const events: ClipEvents = {
      onProgress: setFraction,
      onEnded: () => endedRef.current(),
      onError: (message) => {
        window.clearTimeout(gapTimer.current);
        setErrorText(message);
        setPhase('error');
      },
      // Playback started or stopped by a tap on the YouTube video itself.
      onPlayingChange: (playing) => {
        const p = phaseRef.current;
        if (playing) {
          setHint('');
          if (p === 'idle' || p === 'prep') callbacks.current.onSegmentChange?.(segmentsRef.current[indexRef.current]?.id ?? null);
          if (p === 'idle' || p === 'prep' || p === 'paused') setPhase('playing');
        } else if (p === 'playing') {
          setPhase('paused');
        }
      },
    };
    const media: ClipMedia =
      youtube && videoRef.current
        ? new YouTubeClipMedia(videoRef.current, events, createRef.current)
        : new AudioClipMedia(audioRef.current!, events);
    mediaRef.current = media;
    return () => {
      media.destroy();
      if (mediaRef.current === media) mediaRef.current = null;
    };
  }, [youtube]);

  const startPlayback = useCallback((media: ClipMedia) => {
    setPhase('playing');
    // Blocked autoplay (no recent tap) leaves a play button to press.
    media.play().catch((err) => {
      if (err?.name === 'AbortError') return;
      setPhase((p) => (p === 'error' ? p : 'paused'));
      if (err?.name === 'NotAllowedError' && media.kind === 'youtube') setHint(YOUTUBE_TAP_HINT);
    });
  }, []);

  const load = useCallback(
    (i: number, autoplay: boolean) => {
      const media = mediaRef.current;
      const seg = segments[i];
      if (!media || !seg) return;
      window.clearTimeout(gapTimer.current);
      indexRef.current = i;
      setIndex(i);
      setFraction(0);
      media.load(urls[seg.id] ?? '');
      media.setRate(effectiveRate);
      callbacks.current.onSegmentChange?.(seg.id);
      if (!autoplay) {
        setPhase('paused');
        return;
      }
      startPlayback(media);
    },
    [segments, urls, effectiveRate, startPlayback],
  );

  // A new part: stop and start over.
  const signature = useMemo(() => segments.map((s) => `${s.id}=${urls[s.id] ?? ''}`).join('|'), [segments, urls]);
  useEffect(() => {
    window.clearTimeout(gapTimer.current);
    const media = mediaRef.current;
    media?.pause();
    indexRef.current = 0;
    setIndex(0);
    setFraction(0);
    setPhase('idle');
    setHint('');
    setPrepLeft(prepSeconds);
    const first = segments[0] ? urls[segments[0].id] : undefined;
    if (media && first) media.cue(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, prepSeconds, youtube]);

  useEffect(() => () => window.clearTimeout(gapTimer.current), []);

  useEffect(() => {
    mediaRef.current?.setRate(effectiveRate);
  }, [effectiveRate]);

  // Exam reading time.
  useEffect(() => {
    if (phase !== 'prep') return;
    if (prepLeft <= 0) {
      load(0, true);
      return;
    }
    const t = window.setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, prepLeft, load]);

  useImperativeHandle(
    ref,
    () => ({
      playSegment(id) {
        const i = segments.findIndex((s) => s.id === id);
        if (i >= 0) load(i, true);
      },
      pause() {
        mediaRef.current?.pause();
        setPhase((p) => (p === 'playing' ? 'paused' : p));
      },
    }),
    [segments, load],
  );

  const handleEnded = () => {
    const i = indexRef.current;
    setFraction(1);
    if (i < segments.length - 1) {
      // A recording has its own pauses: carry straight on.
      if (mediaRef.current?.kind === 'youtube') load(i + 1, true);
      else gapTimer.current = window.setTimeout(() => load(i + 1, true), SEGMENT_GAP_MS);
      return;
    }
    setPhase('done');
    callbacks.current.onSegmentChange?.(null);
    callbacks.current.onFinished?.();
  };
  endedRef.current = handleEnded;

  const startExam = () => {
    const media = mediaRef.current;
    if (prepSeconds > 0 && media) {
      // Unlock playback inside this tap so the clip can start after the countdown.
      media.unlock(urls[segments[0]?.id] ?? '', () => phaseRef.current === 'prep');
      setPrepLeft(prepSeconds);
      setPhase('prep');
    } else {
      load(0, true);
    }
  };

  const toggle = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (phase === 'playing') {
      window.clearTimeout(gapTimer.current);
      media.pause();
      setPhase('paused');
    } else if (phase === 'paused' && media.hasSource()) {
      startPlayback(media);
    } else {
      load(phase === 'done' ? 0 : indexRef.current, true);
    }
  };

  const total = segments.length;
  const status =
    phase === 'idle'
      ? `${total} đoạn`
      : phase === 'prep'
        ? 'Sắp phát'
        : phase === 'done'
        ? 'Đã nghe hết'
        : `Đoạn ${index + 1}/${total}`;

  return (
    <section aria-label="Trình phát bài nghe" className={`${panel} space-y-3 p-4`}>
      {youtube ? (
        // YouTube's terms: the player stays visible and at least 200 px tall.
        <div className="aspect-video min-h-[200px] w-full overflow-hidden rounded-xl bg-black [&_iframe]:h-full [&_iframe]:w-full">
          <div ref={videoRef} className="h-full w-full" />
        </div>
      ) : (
        <audio ref={audioRef} preload="auto" />
      )}

      <div className="flex items-center gap-2">
        <Headphones aria-hidden="true" className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{exam ? 'Chế độ thi' : 'Chế độ luyện'}</span>
        <span className="ml-auto text-caption tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
          {status}
        </span>
      </div>

      <div className="flex gap-1" role={exam ? undefined : 'group'} aria-label={exam ? undefined : 'Chọn đoạn'}>
        {segments.map((s, i) => {
          const fill = i < index || phase === 'done' ? 1 : i === index && phase !== 'idle' ? fraction : 0;
          const bar = (
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <span className="block h-full rounded-full bg-slate-900 dark:bg-white" style={{ width: `${Math.round(fill * 100)}%` }} />
            </span>
          );
          return exam ? (
            <span key={s.id} className="flex-1">
              {bar}
            </span>
          ) : (
            <button
              key={s.id}
              type="button"
              onClick={() => load(i, true)}
              title={s.label ? `Đoạn ${i + 1}: ${s.label}` : `Đoạn ${i + 1}`}
              aria-label={`Nghe đoạn ${i + 1}${s.label ? `, ${s.label}` : ''}`}
              aria-current={i === index && phase !== 'idle' ? 'true' : undefined}
              className="flex-1 py-2"
            >
              {bar}
            </button>
          );
        })}
      </div>

      {phase === 'error' ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex flex-1 items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
            {errorText}
          </p>
          <button type="button" onClick={() => load(indexRef.current, true)} className={secondaryBtn}>
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      ) : exam ? (
        <ExamControls phase={phase} prepLeft={prepLeft} onStart={startExam} onSkipPrep={() => setPrepLeft(0)} onResume={toggle} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => load(Math.max(0, index - 1), true)} disabled={index === 0} aria-label="Đoạn trước" className={iconBtn}>
              <SkipBack className="h-5 w-5" />
            </button>
            <button type="button" onClick={toggle} aria-label={phase === 'playing' ? 'Tạm dừng' : 'Phát'} className={`${primaryBtn} min-w-touch px-3`}>
              {phase === 'playing' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => load(Math.min(total - 1, index + 1), true)}
              disabled={index >= total - 1}
              aria-label="Đoạn sau"
              className={iconBtn}
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => load(index, true)} disabled={phase === 'idle'} aria-label="Nghe lại đoạn này" className={iconBtn}>
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Tốc độ">
            {PLAYBACK_RATES.map((r) => (
              <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r} className={`${chipBase} ${rate === r ? chipOn : chipOff}`}>
                {r}×
              </button>
            ))}
          </div>
        </div>
      )}

      {hint && phase !== 'error' && (
        <p role="status" className="text-caption text-amber-700 dark:text-amber-400">
          {hint}
        </p>
      )}
    </section>
  );
});

const ExamControls: React.FC<{
  phase: Phase;
  prepLeft: number;
  onStart: () => void;
  onSkipPrep: () => void;
  onResume: () => void;
}> = ({ phase, prepLeft, onStart, onSkipPrep, onResume }) => {
  if (phase === 'idle')
    return (
      <div className="space-y-2">
        <button type="button" onClick={onStart} className={`${primaryBtn} w-full sm:w-auto`}>
          <Play className="h-4 w-4" /> Bắt đầu nghe
        </button>
        <p className="text-caption text-slate-500 dark:text-slate-400">Chỉ nghe một lần, không dừng hay tua lại, giống bài thi thật.</p>
      </div>
    );
  if (phase === 'prep')
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
          Đọc câu hỏi trước: <span className="font-semibold tabular-nums">{clock(prepLeft)}</span>
        </p>
        <button type="button" onClick={onSkipPrep} className={secondaryBtn}>
          Nghe ngay
        </button>
      </div>
    );
  if (phase === 'paused')
    return (
      <button type="button" onClick={onResume} className={`${primaryBtn} w-full sm:w-auto`}>
        <Play className="h-4 w-4" /> Tiếp tục phát
      </button>
    );
  if (phase === 'done') return <p className="text-sm text-slate-600 dark:text-slate-400">Đã hết phần nghe. Kiểm tra lại đáp án rồi nộp bài.</p>;
  return (
    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      Đang phát
    </p>
  );
};

export default SegmentPlayer;
