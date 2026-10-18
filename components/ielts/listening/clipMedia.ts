/**
 * What the Listening players drive: an <audio> element for TTS clips, or an
 * embedded YouTube player for parts recorded on YouTube (youtubeMedia.ts).
 * Both play one clip at a time and report progress within that clip.
 */

export interface ClipEvents {
  /** 0–1 through the current clip. */
  onProgress(fraction: number): void;
  onEnded(): void;
  onError(message: string): void;
  /** Playback started or stopped from the media itself (a tap on the YouTube video). */
  onPlayingChange?(playing: boolean): void;
}

export interface ClipMedia {
  readonly kind: 'audio' | 'youtube';
  load(src: string): void;
  /** Rejects with a NotAllowedError when the browser blocks playback, AbortError when replaced. */
  play(): Promise<void>;
  pause(): void;
  setRate(rate: number): void;
  hasSource(): boolean;
  /** Shows the first clip ready to play (YouTube: the video's frame). */
  cue(src: string): void;
  /** Called inside a tap before a countdown, so play() is allowed when it ends. */
  unlock(src: string, stillWaiting: () => boolean): void;
  destroy(): void;
}

export const AUDIO_ERROR = 'Không phát được đoạn này.';

export class AudioClipMedia implements ClipMedia {
  readonly kind = 'audio' as const;

  constructor(
    private readonly audio: HTMLAudioElement,
    events: ClipEvents,
  ) {
    audio.onended = () => events.onEnded();
    audio.ontimeupdate = () => {
      if (audio.duration > 0) events.onProgress(audio.currentTime / audio.duration);
    };
    // An emptied src (reset) also fires error; only report real failures.
    audio.onerror = () => {
      if (audio.getAttribute('src')) events.onError(AUDIO_ERROR);
    };
  }

  load(src: string) {
    this.audio.src = src;
  }

  play() {
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  setRate(rate: number) {
    this.audio.defaultPlaybackRate = rate;
    this.audio.playbackRate = rate;
  }

  hasSource() {
    return !!this.audio.getAttribute('src');
  }

  cue() {
    /* Clips load when they play. */
  }

  unlock(src: string, stillWaiting: () => boolean) {
    const a = this.audio;
    a.src = src;
    a.muted = true;
    a.play()
      .then(() => {
        // Skipped the countdown already: the real clip is playing now.
        if (stillWaiting()) a.pause();
      })
      .catch(() => undefined)
      .finally(() => {
        a.muted = false;
      });
  }

  destroy() {
    const a = this.audio;
    a.pause();
    a.onended = null;
    a.ontimeupdate = null;
    a.onerror = null;
  }
}
