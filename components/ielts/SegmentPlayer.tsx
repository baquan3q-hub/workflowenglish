/**
 * Plays a Listening part as a queue of segment clips, one after another.
 *
 * - exam: one play-through like the real test. Optional reading time first,
 *   then no pause, seek or speed change.
 * - practice: pause, replay a segment, jump between segments, 0.75–1.25×.
 *
 * The parent can jump to a segment through the ref (review: "Nghe lại đoạn này").
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Headphones, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

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
  { segments, urls, mode, prepSeconds = 0, onSegmentChange, onFinished },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const gapTimer = useRef<number | undefined>(undefined);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fraction, setFraction] = useState(0);
  const [rate, setRate] = useState<Rate>(1);
  const [prepLeft, setPrepLeft] = useState(prepSeconds);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const exam = mode === 'exam';
  const effectiveRate: Rate = exam ? 1 : rate;

  // Latest callbacks without re-binding the audio handlers.
  const callbacks = useRef({ onSegmentChange, onFinished });
  callbacks.current = { onSegmentChange, onFinished };

  const load = useCallback(
    (i: number, autoplay: boolean) => {
      const audio = audioRef.current;
      const seg = segments[i];
      if (!audio || !seg) return;
      window.clearTimeout(gapTimer.current);
      indexRef.current = i;
      setIndex(i);
      setFraction(0);
      audio.src = urls[seg.id] ?? '';
      audio.defaultPlaybackRate = effectiveRate;
      audio.playbackRate = effectiveRate;
      callbacks.current.onSegmentChange?.(seg.id);
      if (!autoplay) {
        setPhase('paused');
        return;
      }
      setPhase('playing');
      // Blocked autoplay (no recent tap) leaves a play button to press.
      audio.play().catch((err) => {
        if (err?.name !== 'AbortError') setPhase('paused');
      });
    },
    [segments, urls, effectiveRate],
  );

  // A new part: stop and start over.
  const signature = useMemo(() => segments.map((s) => `${s.id}=${urls[s.id] ?? ''}`).join('|'), [segments, urls]);
  useEffect(() => {
    window.clearTimeout(gapTimer.current);
    audioRef.current?.pause();
    indexRef.current = 0;
    setIndex(0);
    setFraction(0);
    setPhase('idle');
    setPrepLeft(prepSeconds);
  }, [signature, prepSeconds]);

  useEffect(() => () => window.clearTimeout(gapTimer.current), []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = effectiveRate;
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
        audioRef.current?.pause();
        setPhase((p) => (p === 'playing' ? 'paused' : p));
      },
    }),
    [segments, load],
  );

  const handleEnded = () => {
    const i = indexRef.current;
    setFraction(1);
    if (i < segments.length - 1) {
      gapTimer.current = window.setTimeout(() => load(i + 1, true), SEGMENT_GAP_MS);
      return;
    }
    setPhase('done');
    callbacks.current.onSegmentChange?.(null);
    callbacks.current.onFinished?.();
  };

  const startExam = () => {
    const audio = audioRef.current;
    if (prepSeconds > 0 && audio) {
      // Unlock playback inside this tap so the clip can start after the countdown.
      audio.src = urls[segments[0]?.id] ?? '';
      audio.muted = true;
      audio
        .play()
        .then(() => {
          // Skipped the countdown already: the real clip is playing now.
          if (phaseRef.current === 'prep') audio.pause();
        })
        .catch(() => undefined)
        .finally(() => {
          audio.muted = false;
        });
      setPrepLeft(prepSeconds);
      setPhase('prep');
    } else {
      load(0, true);
    }
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase === 'playing') {
      window.clearTimeout(gapTimer.current);
      audio.pause();
      setPhase('paused');
    } else if (phase === 'paused' && audio.src) {
      setPhase('playing');
      audio.play().catch(() => setPhase('paused'));
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
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={handleEnded}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration > 0) setFraction(a.currentTime / a.duration);
        }}
        onError={() => {
          // An emptied src (reset) also fires error; only report real failures.
          if (audioRef.current?.getAttribute('src')) setPhase('error');
        }}
      />

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
            Không phát được đoạn này.
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
