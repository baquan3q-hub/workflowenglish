import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelRecording,
  createAudioUrl,
  isRecordingSupported,
  revokeAudioUrl,
  startRecording,
  stopRecording,
} from '../../../services/speechService';
import { nextVoiceState, quietSeconds, type VoiceState } from '../../../services/speakingPracticeLogic';

export interface RecordedTake {
  blob: Blob;
  url: string;
  mimeType: string;
  durationSeconds: number;
}

export interface RecorderOptions {
  /** Called with every finished take, whether stopped by hand or by the time limit. */
  onTake?: (take: RecordedTake) => void;
}

/**
 * One microphone take at a time, kept as a playable object URL. Recording
 * stops by itself after `maxSeconds`; the URL is revoked when replaced.
 * While recording, `quiet` counts the seconds since the learner last spoke.
 */
export function useRecorder(maxSeconds = 60, options: RecorderOptions = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<RecordedTake | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(0);
  const [hasSpoken, setHasSpoken] = useState(false);
  const takeRef = useRef<RecordedTake | null>(null);
  const stopping = useRef(false);
  const active = useRef(false);
  const voice = useRef<VoiceState>({ startedAt: 0, lastVoiceAt: null });
  const onTake = useRef(options.onTake);
  onTake.current = options.onTake;
  // Read when the take starts, so a start queued from an earlier render uses the current limit.
  const limit = useRef(maxSeconds);
  limit.current = maxSeconds;

  const replaceTake = useCallback((next: RecordedTake | null) => {
    if (takeRef.current) revokeAudioUrl(takeRef.current.url);
    takeRef.current = next;
    setTake(next);
  }, []);

  const stop = useCallback(async (): Promise<RecordedTake | null> => {
    if (!active.current || stopping.current) return null;
    stopping.current = true;
    try {
      const r = await stopRecording();
      const next = { ...r, url: createAudioUrl(r.blob) };
      replaceTake(next);
      onTake.current?.(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không dừng được ghi âm.');
      return null;
    } finally {
      active.current = false;
      stopping.current = false;
      setRecording(false);
      setQuiet(0);
    }
  }, [replaceTake]);

  const onLevel = useCallback((rms: number) => {
    const now = Date.now();
    const next = nextVoiceState(voice.current, rms, now);
    if (next.lastVoiceAt !== null && voice.current.lastVoiceAt === null) setHasSpoken(true);
    voice.current = next;
    setQuiet(quietSeconds(next, now));
  }, []);

  const start = useCallback(async () => {
    if (active.current) return;
    setError(null);
    replaceTake(null);
    setSeconds(0);
    setQuiet(0);
    setHasSpoken(false);
    voice.current = { startedAt: Date.now(), lastVoiceAt: null };
    try {
      active.current = true;
      await startRecording((s) => {
        setSeconds(s);
        if (s >= limit.current) void stop();
      }, onLevel);
      setRecording(true);
    } catch (err) {
      active.current = false;
      setError(err instanceof Error ? err.message : 'Không bật được micro.');
    }
  }, [replaceTake, stop, onLevel]);

  const clear = useCallback(() => {
    if (active.current) {
      cancelRecording();
      active.current = false;
      setRecording(false);
    }
    replaceTake(null);
    setSeconds(0);
    setError(null);
  }, [replaceTake]);

  useEffect(
    () => () => {
      if (active.current) cancelRecording();
      if (takeRef.current) revokeAudioUrl(takeRef.current.url);
    },
    [],
  );

  return { supported: isRecordingSupported(), recording, seconds, take, error, quiet, hasSpoken, start, stop, clear };
}
