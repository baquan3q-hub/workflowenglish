import { useCallback, useEffect, useRef, useState } from 'react';
import { aiErrorMessage } from '../../../services/aiClient';
import { segmentAudioUrl, type AudioSegment } from '../../../services/listeningAudioService';
import { isYouTubeSource } from '../../../services/youtubeLogic';
import { YOUTUBE_TAP_HINT, YouTubeClipMedia, type CreatePlayer } from './youtubeMedia';

export type ResolveClip = (seg: AudioSegment, signal?: AbortSignal) => Promise<string>;

/** The floating video a YouTube clip plays in (see YouTubeDock). */
export interface ClipDockState {
  /** Where the YouTube player goes; render it with YouTubeDock. */
  hostRef: (el: HTMLDivElement | null) => void;
  open: boolean;
}

/**
 * Plays one clip at a time on demand (review, dictation, drills). The clip is
 * fetched, or generated, only when asked for. `resolve` can be swapped out in
 * previews without the AI server.
 *
 * A `yt:` source (a part recorded on YouTube) plays in an embedded video
 * instead of an <audio> element; the page renders it with YouTubeDock.
 */
export function useClipPlayer(resolve: ResolveClip = segmentAudioUrl, createYouTubePlayer?: CreatePlayer) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const ytHost = useRef<HTMLDivElement | null>(null);
  const yt = useRef<YouTubeClipMedia | null>(null);
  const ytEnded = useRef<(() => void) | undefined>(undefined);
  const createRef = useRef(createYouTubePlayer);

  const stop = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;
    audio.current?.pause();
    audio.current = null;
    yt.current?.pause();
    ytEnded.current = undefined;
    setDockOpen(false);
    setActiveId(null);
    setLoadingId(null);
  }, []);

  useEffect(
    () => () => {
      stop();
      yt.current?.destroy();
      yt.current = null;
    },
    [stop],
  );

  const youtube = useCallback((): YouTubeClipMedia | null => {
    if (yt.current || !ytHost.current) return yt.current;
    yt.current = new YouTubeClipMedia(
      ytHost.current,
      {
        onProgress: () => undefined,
        onEnded: () => {
          const done = ytEnded.current;
          ytEnded.current = undefined;
          setActiveId(null);
          setDockOpen(false);
          done?.();
        },
        onError: (message) => {
          ytEnded.current = undefined;
          setActiveId(null);
          setLoadingId(null);
          setError(message);
        },
        onPlayingChange: (playing) => {
          if (playing) setError(null);
          else {
            // Paused on the video itself.
            ytEnded.current = undefined;
            setActiveId(null);
          }
        },
      },
      createRef.current,
    );
    return yt.current;
  }, []);

  const hostRef = useCallback((el: HTMLDivElement | null) => {
    ytHost.current = el;
  }, []);

  /** `onEnded` runs only when the clip plays to the end, not when it is stopped. */
  const play = useCallback(
    async (seg: AudioSegment, rate = 1, onEnded?: () => void) => {
      stop();
      setError(null);
      const c = new AbortController();
      ctrl.current = c;
      setLoadingId(seg.id);
      try {
        const url = await resolve(seg, c.signal);
        if (c.signal.aborted) return;

        if (isYouTubeSource(url)) {
          const media = youtube();
          if (!media) throw new Error('No place for the YouTube player');
          setDockOpen(true);
          ytEnded.current = onEnded;
          media.load(url);
          media.setRate(rate);
          setLoadingId(null);
          setActiveId(seg.id);
          try {
            await media.play();
          } catch (err) {
            if (c.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
            // Blocked autoplay: a tap on the video starts it; keep it open.
            if (err instanceof DOMException && err.name === 'NotAllowedError') setError(YOUTUBE_TAP_HINT);
          }
          return;
        }

        const a = new Audio(url);
        a.playbackRate = rate;
        a.onended = () => {
          if (audio.current !== a) return;
          setActiveId(null);
          onEnded?.();
        };
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
    [resolve, stop, youtube],
  );

  /** Play, or stop when this clip is already playing or loading. */
  const toggle = useCallback(
    (seg: AudioSegment, rate = 1) => (activeId === seg.id || loadingId === seg.id ? stop() : void play(seg, rate)),
    [activeId, loadingId, play, stop],
  );

  const dock: ClipDockState = { hostRef, open: dockOpen };
  return { activeId, loadingId, error, play, stop, toggle, dock };
}
