import React from 'react';
import { Mic, Square } from 'lucide-react';
import type { IeltsSpeakingPart } from '../../../types';
import { formatDuration } from '../../../services/speechService';
import { answerNudge, silenceNudge } from '../../../services/speakingPracticeLogic';
import type { useRecorder } from './useRecorder';
import { errorText, muted, notice, recordBtn, secondaryBtn } from './styles';

type Recorder = ReturnType<typeof useRecorder>;

interface Props {
  rec: Recorder;
  part: IeltsSpeakingPart;
  maxSeconds: number;
  startLabel?: string;
  disabled?: boolean;
}

/** Record / stop, the running time against the limit, and live nudges. */
export default function RecordControls({ rec, part, maxSeconds, startLabel, disabled }: Props) {
  if (!rec.supported) {
    return <p className={notice}>Trình duyệt này không ghi âm được. Hãy mở bằng Chrome, Edge hoặc Safari mới.</p>;
  }

  const nudge = rec.recording ? silenceNudge(rec.quiet, rec.hasSpoken) ?? answerNudge(part, rec.seconds) : null;
  const progress = Math.min(100, (rec.seconds / maxSeconds) * 100);

  return (
    <div className="space-y-3">
      {rec.recording ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void rec.stop()} className={secondaryBtn}>
              <Square className="h-4 w-4 text-rose-600" /> Dừng
            </button>
            <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600" aria-hidden="true" />
              {formatDuration(rec.seconds)} / {formatDuration(maxSeconds)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div className="h-full rounded-full bg-rose-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => void rec.start()} disabled={disabled} className={recordBtn}>
          <Mic className="h-4 w-4" /> {startLabel ?? (rec.take ? 'Ghi âm lại' : 'Bắt đầu ghi âm')}
        </button>
      )}
      <p aria-live="polite" className={nudge ? notice : 'sr-only'}>
        {nudge ?? ''}
      </p>
      {!rec.recording && !nudge && rec.take === null && <p className={muted}>Tự dừng ở {formatDuration(maxSeconds)}.</p>}
      {rec.error && (
        <p role="alert" className={errorText}>
          {rec.error}
        </p>
      )}
    </div>
  );
}
