import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YT_STATE, YOUTUBE_LOAD_ERROR, YouTubeClipMedia, youtubeErrorMessage, type CreatePlayer, type PlayerCallbacks, type YTPlayerLike } from '../youtubeMedia';
import type { ClipEvents } from '../clipMedia';
import { youtubeClipSource } from '../../../../services/youtubeLogic';

const A = 'aaaaaaaaaaa';
const B = 'bbbbbbbbbbb';
const clip = (start: number, end: number, id = A) => youtubeClipSource(id, start, end);

/** A YouTube player whose clock moves only when the test says so. */
class FakePlayer implements YTPlayerLike {
  state: number = YT_STATE.CUED;
  time: number;
  rate = 1;
  videoId: string;
  calls: string[] = [];
  /** When false, playVideo() leaves the video stuck (blocked autoplay). */
  starts = true;
  constructor(
    private cb: PlayerCallbacks,
    videoId: string,
    start: number,
  ) {
    this.videoId = videoId;
    this.time = start;
  }
  private set(state: number) {
    this.state = state;
    this.cb.onStateChange(state);
  }
  playVideo() {
    this.calls.push('play');
    if (this.starts) this.set(YT_STATE.PLAYING);
  }
  pauseVideo() {
    this.calls.push('pause');
    this.set(YT_STATE.PAUSED);
  }
  seekTo(s: number) {
    this.calls.push(`seek ${s}`);
    this.time = s;
  }
  getCurrentTime() {
    return this.time;
  }
  getPlayerState() {
    return this.state;
  }
  setPlaybackRate(r: number) {
    this.rate = r;
  }
  cueVideoById(o: { videoId: string; startSeconds?: number }) {
    this.calls.push(`cue ${o.videoId}`);
    this.videoId = o.videoId;
    this.time = o.startSeconds ?? 0;
    this.set(YT_STATE.CUED);
  }
  destroy() {
    this.calls.push('destroy');
  }
  unloaded: string[] = [];
  unloadModule(name: string) {
    this.unloaded.push(name);
  }
  /** The viewer taps the video. */
  userPause() {
    this.set(YT_STATE.PAUSED);
  }
  userPlay() {
    this.set(YT_STATE.PLAYING);
  }
  fail(code: number) {
    this.cb.onError(code);
  }
}

const host = () => ({ appendChild: vi.fn(), replaceChildren: vi.fn() }) as unknown as HTMLElement;

function setup(opts: { failCreate?: boolean } = {}) {
  const players: FakePlayer[] = [];
  const create: CreatePlayer = vi.fn(async (_el, videoId, start, cb) => {
    if (opts.failCreate) throw new Error('api blocked');
    const p = new FakePlayer(cb, videoId, start);
    players.push(p);
    return p;
  });
  const ev = {
    onProgress: vi.fn(),
    onEnded: vi.fn(),
    onError: vi.fn(),
    onPlayingChange: vi.fn(),
  } satisfies ClipEvents;
  const h = host();
  const media = new YouTubeClipMedia(h, ev, create, { pollMs: 100, playTimeoutMs: 1000 });
  return { media, ev, create, players, h, player: () => players[0] };
}

/** Moves the fake clock and lets the poll see it. */
async function advance(p: FakePlayer, seconds: number) {
  p.time += seconds;
  await vi.advanceTimersByTimeAsync(100);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('document', { createElement: () => ({}) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('YouTubeClipMedia', () => {
  it('builds one player, seeks to the clip and stops at its end', async () => {
    const { media, ev, create, player } = setup();
    media.setRate(1.25);
    media.load(clip(10, 20));
    await media.play();
    const p = player();
    expect(create).toHaveBeenCalledTimes(1);
    expect(p.calls).toEqual(['seek 10', 'play']);
    expect(p.rate).toBe(1.25);
    expect(p.unloaded).toContain('captions');

    await advance(p, 5);
    expect(ev.onProgress).toHaveBeenLastCalledWith(0.5);
    expect(ev.onEnded).not.toHaveBeenCalled();

    await advance(p, 5);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
    expect(p.calls.at(-1)).toBe('pause');
    // Our own pause is not reported as the viewer's.
    expect(ev.onPlayingChange).not.toHaveBeenCalledWith(false);
    await advance(p, 1);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
  });

  it('carries straight on into a segment that starts where this one ends', async () => {
    const { media, ev, player } = setup();
    ev.onEnded.mockImplementation(() => {
      media.load(clip(20, 30));
      void media.play();
    });
    media.load(clip(10, 20));
    await media.play();
    const p = player();
    await advance(p, 10);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
    // No pause and no seek between the two segments.
    expect(p.calls).toEqual(['seek 10', 'play']);
    expect(p.state).toBe(YT_STATE.PLAYING);

    ev.onEnded.mockReset();
    await advance(p, 10);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
    expect(p.calls.at(-1)).toBe('pause');
  });

  it('seeks for a segment further on, and back to the start on a replay', async () => {
    const { media, player } = setup();
    media.load(clip(10, 20));
    await media.play();
    const p = player();
    await advance(p, 4);

    media.load(clip(10, 20));
    await media.play();
    expect(p.calls.slice(-3)).toEqual(['pause', 'seek 10', 'play']);

    media.load(clip(60, 70));
    await media.play();
    expect(p.calls.slice(-3)).toEqual(['pause', 'seek 60', 'play']);
  });

  it('resumes where it paused without seeking', async () => {
    const { media, player } = setup();
    media.load(clip(10, 20));
    await media.play();
    const p = player();
    await advance(p, 3);
    media.pause();
    expect(p.state).toBe(YT_STATE.PAUSED);
    await media.play();
    expect(p.calls).toEqual(['seek 10', 'play', 'pause', 'play']);
    expect(p.time).toBe(13);
  });

  it('cues another video when the clip is from a different one', async () => {
    const { media, player } = setup();
    media.load(clip(10, 20));
    await media.play();
    media.load(clip(5, 9, B));
    await media.play();
    expect(player().calls.slice(-4)).toEqual(['pause', `cue ${B}`, 'seek 5', 'play']);
  });

  it('reports taps on the video itself', async () => {
    const { media, ev, player } = setup();
    media.load(clip(10, 20));
    await media.play();
    const p = player();
    expect(ev.onPlayingChange).toHaveBeenLastCalledWith(true);
    p.userPause();
    expect(ev.onPlayingChange).toHaveBeenLastCalledWith(false);
    p.userPlay();
    expect(ev.onPlayingChange).toHaveBeenLastCalledWith(true);
  });

  it('rejects with NotAllowedError when the video does not start', async () => {
    const { media, player } = setup();
    media.load(clip(10, 20));
    // Build the player first, then make it refuse to start.
    await vi.advanceTimersByTimeAsync(0);
    player().starts = false;
    const result = media.play().catch((e: DOMException) => e.name);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBe('NotAllowedError');
  });

  it('rejects a pending play with AbortError when another clip is loaded', async () => {
    const { media, player } = setup();
    media.load(clip(10, 20));
    await vi.advanceTimersByTimeAsync(0);
    player().starts = false;
    const result = media.play().catch((e: DOMException) => e.name);
    media.load(clip(30, 40));
    expect(await result).toBe('AbortError');
  });

  it('turns YouTube errors into messages and fails the pending play', async () => {
    const { media, ev, player } = setup();
    media.load(clip(10, 20));
    await vi.advanceTimersByTimeAsync(0);
    player().starts = false;
    const result = media.play().catch((e: Error) => e.message);
    player().fail(150);
    expect(ev.onError).toHaveBeenCalledWith(youtubeErrorMessage(150));
    expect(await result).toBe(youtubeErrorMessage(150));
    expect(youtubeErrorMessage(100)).toMatch(/xoá|riêng tư/);
    expect(youtubeErrorMessage(2)).toMatch(/không hợp lệ/);
  });

  it('reports when the YouTube player cannot load', async () => {
    const { media, ev } = setup({ failCreate: true });
    media.load(clip(10, 20));
    await expect(media.play()).rejects.toThrow('api blocked');
    expect(ev.onError).toHaveBeenCalledWith(YOUTUBE_LOAD_ERROR);
  });

  it('ends the clip when the video itself ends early', async () => {
    const { media, ev, player } = setup();
    media.load(clip(10, 999));
    await media.play();
    player().state = YT_STATE.ENDED;
    (player() as unknown as { cb: PlayerCallbacks }).cb.onStateChange(YT_STATE.ENDED);
    expect(ev.onEnded).toHaveBeenCalledTimes(1);
  });

  it('refuses a bad source and cleans up on destroy', async () => {
    const { media, ev, h, players } = setup();
    media.load('https://example.com/a.wav');
    expect(ev.onError).toHaveBeenCalledWith('Nguồn audio không hợp lệ.');
    expect(media.hasSource()).toBe(false);

    media.load(clip(1, 5));
    expect(media.hasSource()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    media.destroy();
    expect(players[0].calls).toContain('destroy');
    expect(h.replaceChildren).toHaveBeenCalled();
  });

  it('destroys a player that finishes building after destroy', async () => {
    const { media, players } = setup();
    media.load(clip(1, 5));
    media.destroy();
    await vi.advanceTimersByTimeAsync(0);
    expect(players[0].calls).toEqual(['destroy']);
  });
});
