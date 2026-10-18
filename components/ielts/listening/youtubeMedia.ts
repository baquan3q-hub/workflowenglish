/**
 * Plays stretches of a YouTube video as Listening clips, through the official
 * IFrame Player API (youtube-nocookie host, no YouTube controls: the app's
 * own buttons drive it). The video stays visible, as YouTube's terms ask.
 *
 * YouTube has no "stop at" option, so the current time is polled and the clip
 * ends at its `end`. When the next clip starts where this one stopped, it just
 * keeps playing: no pause or seek between segments of one recording.
 */
import { parseClipSource, type YouTubeClip } from '../../../services/youtubeLogic';
import type { ClipEvents, ClipMedia } from './clipMedia';

/** YT.PlayerState values. */
export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

/** The part of YT.Player this file uses. */
export interface YTPlayerLike {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
  /** Undocumented but long-standing: unloading 'captions' hides subtitles. */
  unloadModule?(name: string): void;
}

export interface PlayerCallbacks {
  onStateChange(state: number): void;
  onError(code: number): void;
}

/** Builds a player inside `el` and resolves once it is ready. */
export type CreatePlayer = (el: HTMLElement, videoId: string, startSeconds: number, cb: PlayerCallbacks) => Promise<YTPlayerLike>;

/** What a learner can do about each YouTube error code. */
export function youtubeErrorMessage(code: number): string {
  if (code === 2) return 'Link video YouTube không hợp lệ.';
  if (code === 5) return 'Trình duyệt này không phát được video. Hãy thử trình duyệt khác.';
  if (code === 100) return 'Video YouTube đã bị xoá hoặc đang để riêng tư.';
  if (code === 101 || code === 150) return 'Video không cho phép phát nhúng. Chủ video cần bật "Cho phép nhúng" trong YouTube Studio.';
  return 'Không phát được video YouTube.';
}

export const YOUTUBE_LOAD_ERROR = 'Không tải được trình phát YouTube. Kiểm tra kết nối mạng rồi thử lại.';
export const YOUTUBE_TAP_HINT = 'Trình duyệt chặn tự phát. Hãy bấm trực tiếp vào video để bắt đầu.';

// --- IFrame API loading --------------------------------------------------------

interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayerLike;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      script.remove();
      reject(new Error('YouTube IFrame API failed to load'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const READY_TIMEOUT_MS = 20_000;

export const createYouTubePlayer: CreatePlayer = async (el, videoId, startSeconds, cb) => {
  const YT = await loadYouTubeApi();
  return new Promise<YTPlayerLike>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('YouTube player not ready')), READY_TIMEOUT_MS);
    const player = new YT.Player(el, {
      host: 'https://www.youtube-nocookie.com',
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        playsinline: 1,
        rel: 0,
        start: Math.floor(startSeconds),
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          window.clearTimeout(timer);
          resolve(player);
        },
        onStateChange: (e: { data: number }) => cb.onStateChange(e.data),
        onError: (e: { data: number }) => cb.onError(e.data),
      },
    });
  });
};

// --- The clip player -------------------------------------------------------------

/** Seconds of slack: a clip "starts here" when the video is this close to its start. */
const NEAR = 0.75;
/** The clip ends this much before its end time, to absorb the poll interval. */
const END_EARLY = 0.05;

const abortError = () => new DOMException('Replaced by another clip', 'AbortError');
const notAllowed = () => new DOMException('YouTube did not start', 'NotAllowedError');

export interface YouTubeTiming {
  pollMs: number;
  /** How long play() waits for the video to start before reporting it blocked. */
  playTimeoutMs: number;
}

export class YouTubeClipMedia implements ClipMedia {
  readonly kind = 'youtube' as const;
  private player: YTPlayerLike | null = null;
  private creating: Promise<YTPlayerLike> | null = null;
  /** Video loaded in the player. */
  private videoId = '';
  private clip: YouTubeClip | null = null;
  /** Bumped by every load(); a clip's end and a pending play() belong to one token. */
  private token = 0;
  private endedToken = -1;
  private seekPending = false;
  private rate = 1;
  private poll: ReturnType<typeof setInterval> | undefined;
  private selfPause = false;
  private waiting: { resolve: () => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private destroyed = false;
  /** The last error, and the load it belongs to: a play() that comes after it fails at once. */
  private failure: { token: number; message: string } | null = null;
  private readonly el: HTMLElement;

  constructor(
    private readonly host: HTMLElement,
    private readonly events: ClipEvents,
    private readonly create: CreatePlayer = createYouTubePlayer,
    private readonly timing: YouTubeTiming = { pollMs: 100, playTimeoutMs: 6000 },
  ) {
    // The API replaces this element with its iframe.
    this.el = document.createElement('div');
    host.appendChild(this.el);
  }

  private ensurePlayer(videoId: string, start: number): Promise<YTPlayerLike> {
    if (this.player) return Promise.resolve(this.player);
    this.creating ??= this.create(this.el, videoId, start, {
      onStateChange: (s) => this.handleState(s),
      onError: (code) => this.handleError(youtubeErrorMessage(code)),
    }).then(
      (p) => {
        if (this.destroyed) {
          p.destroy();
          throw abortError();
        }
        this.player = p;
        this.videoId = videoId;
        p.setPlaybackRate(this.rate);
        return p;
      },
      (err) => {
        this.creating = null;
        if (!this.destroyed) this.handleError(YOUTUBE_LOAD_ERROR);
        throw err;
      },
    );
    return this.creating;
  }

  private isPlaying(p: YTPlayerLike) {
    const s = p.getPlayerState();
    return s === YT_STATE.PLAYING || s === YT_STATE.BUFFERING;
  }

  private pauseSelf() {
    const p = this.player;
    if (p && this.isPlaying(p)) {
      this.selfPause = true;
      p.pauseVideo();
    }
    this.stopPoll();
  }

  load(src: string) {
    const clip = parseClipSource(src);
    this.token++;
    this.cancelWaiting();
    if (!clip) {
      this.clip = null;
      this.handleError('Nguồn audio không hợp lệ.');
      return;
    }
    this.clip = clip;
    const p = this.player;
    if (!p) {
      this.seekPending = true;
      this.ensurePlayer(clip.videoId, clip.start).catch(() => undefined);
      return;
    }
    if (clip.videoId !== this.videoId) {
      this.pauseSelf();
      p.cueVideoById({ videoId: clip.videoId, startSeconds: clip.start });
      this.videoId = clip.videoId;
      this.seekPending = true;
      return;
    }
    // The next segment of one recording: keep playing, no seek.
    if (this.isPlaying(p) && Math.abs(p.getCurrentTime() - clip.start) < NEAR) {
      this.seekPending = false;
      return;
    }
    this.pauseSelf();
    this.seekPending = true;
  }

  async play(): Promise<void> {
    const clip = this.clip;
    if (!clip) throw new Error('No clip loaded');
    const token = this.token;
    const p = await this.ensurePlayer(clip.videoId, clip.start);
    if (token !== this.token || this.destroyed) throw abortError();
    if (this.failure?.token === token) throw new Error(this.failure.message);
    p.setPlaybackRate(this.rate);
    const t = p.getCurrentTime();
    const inside = t >= clip.start - NEAR && t < clip.end - END_EARLY;
    if (!this.seekPending && inside && this.isPlaying(p)) {
      this.startPoll();
      return;
    }
    if (this.seekPending || !inside) p.seekTo(clip.start, true);
    this.seekPending = false;
    this.endedToken = -1;
    p.playVideo();
    if (p.getPlayerState() === YT_STATE.PLAYING) {
      this.startPoll();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.cancelWaiting();
      const timer = setTimeout(() => {
        this.waiting = null;
        reject(notAllowed());
      }, this.timing.playTimeoutMs);
      this.waiting = { resolve, reject, timer };
    });
  }

  pause() {
    this.cancelWaiting();
    this.pauseSelf();
  }

  setRate(rate: number) {
    this.rate = rate;
    this.player?.setPlaybackRate(rate);
  }

  hasSource() {
    return this.clip !== null;
  }

  cue(src: string) {
    this.load(src);
  }

  unlock(src: string) {
    // The embed allows autoplay once the page has had a tap; loading early is enough.
    this.load(src);
  }

  destroy() {
    this.destroyed = true;
    this.stopPoll();
    this.cancelWaiting();
    this.player?.destroy();
    this.player = null;
    this.host.replaceChildren();
  }

  // --- internals ---

  private cancelWaiting() {
    if (!this.waiting) return;
    clearTimeout(this.waiting.timer);
    this.waiting.reject(abortError());
    this.waiting = null;
  }

  private startPoll() {
    if (this.poll !== undefined) return;
    this.poll = setInterval(() => this.tick(), this.timing.pollMs);
  }

  private stopPoll() {
    if (this.poll === undefined) return;
    clearInterval(this.poll);
    this.poll = undefined;
  }

  private tick() {
    const p = this.player;
    const clip = this.clip;
    if (!p || !clip) return;
    const t = p.getCurrentTime();
    const length = Math.max(0.1, clip.end - clip.start);
    this.events.onProgress(Math.min(1, Math.max(0, (t - clip.start) / length)));
    if (t >= clip.end - END_EARLY) this.finishClip();
  }

  private finishClip() {
    if (this.endedToken === this.token) return;
    const token = this.token;
    this.endedToken = token;
    this.events.onProgress(1);
    this.events.onEnded();
    // Nobody loaded a next clip that carries on: stop here.
    if (this.token === token) this.pauseSelf();
  }

  private handleState(state: number) {
    if (this.destroyed) return;
    if (state === YT_STATE.PLAYING) {
      this.selfPause = false;
      // Subtitles would give the answers away; the viewer's YouTube settings can turn them on.
      this.hideCaptions();
      this.startPoll();
      if (this.waiting) {
        clearTimeout(this.waiting.timer);
        this.waiting.resolve();
        this.waiting = null;
      }
      this.events.onPlayingChange?.(true);
    } else if (state === YT_STATE.PAUSED) {
      this.stopPoll();
      if (this.selfPause) this.selfPause = false;
      else this.events.onPlayingChange?.(false);
    } else if (state === YT_STATE.ENDED) {
      this.stopPoll();
      this.selfPause = false;
      if (this.clip) this.finishClip();
    } else if (state === YT_STATE.CUED) {
      this.stopPoll();
    }
  }

  private hideCaptions() {
    try {
      this.player?.unloadModule?.('captions');
      this.player?.unloadModule?.('cc');
    } catch {
      // Not every player build has the module API.
    }
  }

  private handleError(message: string) {
    this.stopPoll();
    this.failure = { token: this.token, message };
    if (this.waiting) {
      clearTimeout(this.waiting.timer);
      this.waiting.reject(new Error(message));
      this.waiting = null;
    }
    this.events.onError(message);
  }
}
