import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelRecording,
  createAudioUrl,
  isRecordingSupported,
  revokeAudioUrl,
  startRecording,
  stopRecording,
} from '../../../services/speechService';

export interface RecordedTake {
  blob: Blob;
  url: string;
  mimeType: string;
  durationSeconds: number;
}

/**
 * One microphone take at a time, kept as a playable object URL. Recording
 * stops by itself after `maxSeconds`; the URL is revoked when replaced.
 */
export function useRecorder(maxSeconds = 60) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<RecordedTake | null>(null);
  const [error, setError] = useState<string | null>(null);
  const takeRef = useRef<RecordedTake | null>(null);
  const stopping = useRef(false);
  const active = useRef(false);

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
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không dừng được ghi âm.');
      return null;
    } finally {
      active.current = false;
      stopping.current = false;
      setRecording(false);
    }
  }, [replaceTake]);

  const start = useCallback(async () => {
    if (active.current) return;
    setError(null);
    replaceTake(null);
    setSeconds(0);
    try {
      active.current = true;
      await startRecording((s) => {
        setSeconds(s);
        if (s >= maxSeconds) void stop();
      });
      setRecording(true);
    } catch (err) {
      active.current = false;
      setError(err instanceof Error ? err.message : 'Không bật được micro.');
    }
  }, [maxSeconds, replaceTake, stop]);

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

  return { supported: isRecordingSupported(), recording, seconds, take, error, start, stop, clear };
}
