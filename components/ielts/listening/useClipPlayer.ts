import { useCallback, useEffect, useRef, useState } from 'react';
import { aiErrorMessage } from '../../../services/aiClient';
import { segmentAudioUrl, type AudioSegment } from '../../../services/listeningAudioService';

export type ResolveClip = (seg: AudioSegment, signal?: AbortSignal) => Promise<string>;

/**
 * Plays one clip at a time on demand (review, dictation, drills). The clip is
 * fetched, or generated, only when asked for. `resolve` can be swapped out in
 * previews without the AI server.
 */
export function useClipPlayer(resolve: ResolveClip = segmentAudioUrl) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;
    audio.current?.pause();
    audio.current = null;
    setActiveId(null);
    setLoadingId(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (seg: AudioSegment, rate = 1) => {
      stop();
      setError(null);
      const c = new AbortController();
      ctrl.current = c;
      setLoadingId(seg.id);
      try {
        const url = await resolve(seg, c.signal);
        if (c.signal.aborted) return;
        const a = new Audio(url);
        a.playbackRate = rate;
        a.onended = () => audio.current === a && setActiveId(null);
        a.onerror = () => {
          if (audio.current !== a) return;
          setActiveId(null);
          setError('Không phát được audio. Hãy thử lại.');
        };
        audio.current = a;
        setLoadingId(null);
        setActiveId(seg.id);
        await a.play();
      } catch (err) {
        if (c.signal.aborted) return;
        setLoadingId(null);
        setActiveId(null);
        setError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Trình duyệt chặn phát tự động. Hãy bấm lại.' : aiErrorMessage(err));
      }
    },
    [resolve, stop],
  );

  /** Play, or stop when this clip is already playing or loading. */
  const toggle = useCallback(
    (seg: AudioSegment, rate = 1) => (activeId === seg.id || loadingId === seg.id ? stop() : void play(seg, rate)),
    [activeId, loadingId, play, stop],
  );

  return { activeId, loadingId, error, play, stop, toggle };
}
