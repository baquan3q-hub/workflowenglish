/**
 * The visible player of a media dictation: an embedded YouTube video (its own
 * controls on, as YouTube's terms ask for a visible player) or an <audio>
 * element. The page drives it through the handle: play one sentence's span,
 * play on from a time, read the clock.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { MediaSource } from '../../../services/mediaDictationLogic';
import { createYouTubePlayer, YT_STATE, youtubeErrorMessage, YOUTUBE_LOAD_ERROR, type CreatePlayer, type YTPlayerLike } from './youtubeMedia';

export interface MediaStageHandle {
  /** Plays from `start` and pauses at `end`; resolves once it has started. */
  playRange(start: number, end: number, rate?: number): Promise<void>;
  /** Plays on from `start` (or where it is) with no stop. */
  playFrom(start?: number): Promise<void>;
  pause(): void;
  time(): number;
  playing(): boolean;
}

interface Props {
  source: MediaSource;
  onPlayingChange?: (playing: boolean) => void;
  onError?: (message: string) => void;
  /** Swapped out in tests. */
  create?: CreatePlayer;
}

const PLAYER_VARS = { controls: 1, disablekb: 0, fs: 0, cc_load_policy: 0 };

const MediaStage = forwardRef<MediaStageHandle, Props>(function MediaStage({ source, onPlayingChange, onError, create = createYouTubePlayer }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const yt = useRef<YTPlayerLike | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number | null>(null);
  const [ready, setReady] = useState(source.kind === 'audio');
  const isPlaying = useRef(false);
  const cb = useRef({ onPlayingChange, onError });
  cb.current = { onPlayingChange, onError };

  const setPlaying = (v: boolean) => {
    if (isPlaying.current === v) return;
    isPlaying.current = v;
    cb.current.onPlayingChange?.(v);
  };

  const videoId = source.kind === 'youtube' ? source.videoId : '';
  useEffect(() => {
    if (!videoId || !host.current) return;
    let cancelled = false;
    const el = document.createElement('div');
    host.current.replaceChildren(el);
    setReady(false);
    create(
      el,
      videoId,
      0,
      {
        onStateChange: (s) => setPlaying(s === YT_STATE.PLAYING || s === YT_STATE.BUFFERING),
        onError: (code) => cb.current.onError?.(youtubeErrorMessage(code)),
      },
      PLAYER_VARS,
    ).then(
      (p) => {
        if (cancelled) return p.destroy();
        p.unloadModule?.('captions');
        yt.current = p;
        setReady(true);
      },
      () => !cancelled && cb.current.onError?.(YOUTUBE_LOAD_ERROR),
    );
    return () => {
      cancelled = true;
      yt.current?.destroy();
      yt.current = null;
    };
  }, [videoId, create]);

  // Stop at the end of the span being played.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      if (stopAt.current === null) return;
      const t = yt.current ? yt.current.getCurrentTime() : (audio.current?.currentTime ?? 0);
      if (t >= stopAt.current) {
        stopAt.current = null;
        yt.current?.pauseVideo();
        audio.current?.pause();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [ready]);

  useImperativeHandle(
    ref,
    () => ({
      async playRange(start, end, rate = 1) {
        stopAt.current = end;
        if (yt.current) {
          yt.current.setPlaybackRate(rate);
          yt.current.seekTo(start, true);
          yt.current.playVideo();
          return;
        }
        const a = audio.current;
        if (!a) return;
        a.playbackRate = rate;
        a.currentTime = start;
        await a.play();
      },
      async playFrom(start) {
        stopAt.current = null;
        if (yt.current) {
          yt.current.setPlaybackRate(1);
          if (start !== undefined) yt.current.seekTo(start, true);
          yt.current.playVideo();
          return;
        }
        const a = audio.current;
        if (!a) return;
        a.playbackRate = 1;
        if (start !== undefined) a.currentTime = start;
        await a.play();
      },
      pause() {
        stopAt.current = null;
        yt.current?.pauseVideo();
        audio.current?.pause();
      },
      time: () => (yt.current ? yt.current.getCurrentTime() : (audio.current?.currentTime ?? 0)),
      playing: () => isPlaying.current,
    }),
    [],
  );

  if (source.kind === 'audio') {
    return (
      <audio
        ref={audio}
        src={source.url}
        controls
        preload="metadata"
        className="w-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => cb.current.onError?.('Không phát được file audio này. Link cần trỏ thẳng tới file .mp3/.m4a và cho phép phát từ trang khác.')}
      />
    );
  }
  return (
    <div className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-2xl bg-black [&_iframe]:h-full [&_iframe]:w-full">
      <div ref={host} className="h-full w-full" />
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Đang tải video…</p>}
    </div>
  );
});

export default MediaStage;
