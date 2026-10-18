import { describe, expect, it, vi } from 'vitest';
import {
  formatTimestamp,
  isYouTubeSource,
  parseClipSource,
  parseTimestamp,
  parseYouTubeId,
  youtubeClipSource,
  youtubeWatchUrl,
} from '../youtubeLogic';
import { sectionAudioSegments, validateSection } from '../listeningLogic';
import { segmentAudioUrl } from '../listeningAudioService';
import { youtubeProblems } from '../../supabase/functions/ai-proxy/ops/listeningRules.ts';
import { LISTENING_FULL_TESTS, type ListeningSection } from '../../data/ielts/listening';

const LISTENING_TEST_1 = LISTENING_FULL_TESTS[0];

const ID = 'M7lc1UVf-VE';

/** A bundled part turned into a recorded one: back-to-back 30-second segments. */
function recorded(): ListeningSection {
  const base = structuredClone(LISTENING_TEST_1.sections[1]);
  return {
    ...base,
    youtube: { videoId: ID },
    segments: base.segments.map((s, i) => ({ ...s, start: 5 + i * 30, end: 5 + (i + 1) * 30 })),
  };
}

describe('parseYouTubeId', () => {
  it.each([
    [ID],
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?feature=share&v=${ID}&t=42s`],
    [`youtube.com/watch?v=${ID}`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://music.youtube.com/watch?v=${ID}&list=RD`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc&t=10`],
    [`https://www.youtube.com/embed/${ID}?start=3`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}?feature=share`],
    [`  ${ID}  `],
  ])('reads %s', (input) => {
    expect(parseYouTubeId(input)).toBe(ID);
  });

  it.each([
    [''],
    ['hello'],
    ['M7lc1UVf-V'],
    [`https://vimeo.com/${ID}`],
    [`https://www.youtube.com/channel/UC123`],
    [`https://www.youtube.com/watch?v=short`],
    [`https://evil.com/watch?v=${ID}`],
    [`https://youtube.com.evil.com/watch?v=${ID}`],
  ])('rejects %s', (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

describe('timestamps', () => {
  it('reads seconds, minutes and hours', () => {
    expect(parseTimestamp('83')).toBe(83);
    expect(parseTimestamp('83.25')).toBe(83.25);
    expect(parseTimestamp('1:23')).toBe(83);
    expect(parseTimestamp('01:23.5')).toBe(83.5);
    expect(parseTimestamp('1:23,5')).toBe(83.5);
    expect(parseTimestamp('1:02:03')).toBe(3723);
    expect(parseTimestamp(' 0:00 ')).toBe(0);
  });

  it('refuses what is not a time', () => {
    for (const bad of ['', 'abc', '1:75', '1:60:00', '-3', '1::2', '1:2:3:4']) expect(parseTimestamp(bad)).toBeNull();
  });

  it('formats with tenths only when needed and round-trips', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(83)).toBe('1:23');
    expect(formatTimestamp(83.46)).toBe('1:23.5');
    expect(formatTimestamp(3723)).toBe('1:02:03');
    expect(formatTimestamp(59.96)).toBe('1:00');
    for (const s of [0, 7.5, 61.2, 599.9, 3600]) expect(parseTimestamp(formatTimestamp(s))).toBe(s);
  });
});

describe('clip sources', () => {
  it('encodes and decodes a stretch of a video', () => {
    const src = youtubeClipSource(ID, 12.345, 40);
    expect(src).toBe(`yt:${ID}@12.35-40`);
    expect(isYouTubeSource(src)).toBe(true);
    expect(isYouTubeSource('https://x.supabase.co/a.wav')).toBe(false);
    expect(parseClipSource(src)).toEqual({ videoId: ID, start: 12.35, end: 40 });
    expect(parseClipSource(`yt:${ID}@40-12`)).toBeNull();
    expect(parseClipSource('yt:bad@1-2')).toBeNull();
    expect(parseClipSource(undefined)).toBeNull();
    expect(youtubeWatchUrl(ID, 75.8)).toBe(`https://www.youtube.com/watch?v=${ID}&t=75s`);
  });

  it('gives a recorded part YouTube sources and never calls TTS for them', async () => {
    const s = recorded();
    const clips = sectionAudioSegments(s);
    expect(clips.map((c) => c.source)).toEqual(s.segments.map((seg) => youtubeClipSource(ID, seg.start!, seg.end!)));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await segmentAudioUrl(clips[0])).toBe(clips[0].source);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    // A TTS part keeps its voices.
    expect(sectionAudioSegments(LISTENING_TEST_1.sections[0]).every((c) => c.source === undefined)).toBe(true);
  });
});

describe('recorded part checks', () => {
  it('accepts a well-timed recorded part', () => {
    expect(validateSection(recorded())).toEqual([]);
  });

  it('drops the TTS limits for recorded parts', () => {
    const s = recorded();
    // Three speakers in one segment and a long text are fine in a recording.
    s.speakers.push({ name: 'Zed', voice: 'Puck' });
    s.segments[0].lines.push({ speaker: 'Zed', text: 'word '.repeat(400) });
    expect(validateSection(s)).toEqual([]);
  });

  it('finds bad ids, missing, short, overlapping and huge timings', () => {
    const s = recorded();
    s.youtube = { videoId: 'nope' };
    s.segments[0].start = undefined;
    s.segments[1].end = s.segments[1].start! + 0.5;
    s.segments[2].start = s.segments[1].start! - 1;
    s.segments[3].end = 4 * 3600;
    const problems = youtubeProblems(s);
    expect(problems).toEqual([
      `${s.id}: invalid YouTube video id`,
      `${s.segments[0].id}: needs a start and an end time`,
      `${s.segments[1].id}: must be at least 1 second long`,
      `${s.segments[2].id}: starts before the previous segment ends`,
      `${s.segments[3].id}: ends after 3 hours`,
    ]);
    expect(validateSection(s)).toEqual(expect.arrayContaining(problems));
  });

  it('allows gaps between segments and ignores timings on TTS parts', () => {
    const s = recorded();
    s.segments[1].start = s.segments[0].end! + 20;
    s.segments[1].end = s.segments[1].start + 30;
    for (const seg of s.segments.slice(2)) {
      seg.start! += 50;
      seg.end! += 50;
    }
    expect(youtubeProblems(s)).toEqual([]);
    expect(youtubeProblems({ ...s, youtube: undefined })).toEqual([]);
  });
});
