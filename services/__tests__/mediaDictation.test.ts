import { describe, expect, it } from 'vitest';
import {
  maskedCheck,
  emptyProgress,
  sanitizeExercise,
  sanitizeProgress,
  recordSentence,
  applyTapMarks,
  blankHint,
  cleanCaption,
  cuesToSentences,
  detectFormat,
  exerciseProblems,
  firstLetterHint,
  mediaFragment,
  nudgeSentence,
  parseAudioUrl,
  parseCues,
  revealNextWord,
  sentenceSource,
  splitPlainText,
  summarizeProgress,
  transcriptToSentences,
} from '../mediaDictationLogic';

const SRT = `1
00:00:01,000 --> 00:00:03,500
Welcome to the show.

2
00:00:03,600 --> 00:00:06,000
Today we're talking about

3
00:00:06,000 --> 00:00:08,000
sleep and memory.`;

const VTT = `WEBVTT
Kind: captions

00:00:00.500 --> 00:00:02.000 align:start position:0%
hello<00:00:00.900><c> everyone</c> and

00:00:02.000 --> 00:00:04.000 align:start position:0%
hello everyone and
welcome back to the channel

00:00:04.000 --> 00:00:06.000
[Music]`;

const YT_COPY = `0:00
so I moved to London in 2019
0:04
and honestly it was the best decision. I
0:08
never looked back
1:02
2 minutes, 5 seconds
1:02 That is the end.`;

describe('detectFormat', () => {
  it('tells the formats apart', () => {
    expect(detectFormat(SRT)).toBe('srt');
    expect(detectFormat(VTT)).toBe('vtt');
    expect(detectFormat(YT_COPY)).toBe('youtube');
    expect(detectFormat('Hello there. How are you today?')).toBe('plain');
  });
});

describe('cleanCaption', () => {
  it('drops markup and sound labels', () => {
    expect(cleanCaption('>> <i>Hi</i> [Music] there &amp; you ♪')).toBe('Hi there & you');
  });
});

describe('parseCues', () => {
  it('reads SRT', () => {
    const cues = parseCues(SRT);
    expect(cues).toHaveLength(3);
    expect(cues[0]).toEqual({ start: 1, end: 3.5, text: 'Welcome to the show.' });
  });

  it('removes rolling repeats and inline stamps from YouTube VTT', () => {
    const cues = parseCues(VTT);
    expect(cues.map((c) => c.text)).toEqual(['hello everyone and', 'welcome back to the channel']);
    expect(cues[1].start).toBe(2);
  });

  it('reads the YouTube transcript copy and skips duration labels', () => {
    const cues = parseCues(YT_COPY);
    expect(cues.map((c) => c.start)).toEqual([0, 4, 8, 62]);
    expect(cues[0].end).toBeNull();
    expect(cues[3].text).toBe('That is the end.');
  });
});

describe('cuesToSentences', () => {
  it('joins fragments into sentences with times', () => {
    const s = cuesToSentences(parseCues(SRT));
    expect(s.map((x) => x.text)).toEqual(['Welcome to the show.', "Today we're talking about sleep and memory."]);
    expect(s[0].start).toBe(1);
    expect(s[1].start).toBeCloseTo(3.6, 1);
    expect(s[1].end).toBe(8);
  });

  it('splits a cue that holds the end of one sentence and the start of the next', () => {
    const s = cuesToSentences(parseCues(YT_COPY));
    expect(s[0].text).toBe('So I moved to London in 2019 and honestly it was the best decision.');
    expect(s[1].text).toBe('I never looked back');
    expect(s[0].end!).toBeGreaterThan(4);
    expect(s[0].end!).toBeLessThan(8);
    // The long silence before 1:02 ends the sentence before it.
    expect(s[2].text).toBe('That is the end.');
    expect(s[2].start).toBe(62);
  });

  it('cuts long unpunctuated auto captions', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const s = cuesToSentences([{ start: 0, end: 20, text: words }], { maxWords: 10 });
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.every((x) => x.text.split(' ').length <= 16)).toBe(true);
  });

  it('keeps abbreviations inside a sentence', () => {
    const s = cuesToSentences([{ start: 0, end: 4, text: 'I met Dr. Smith yesterday.' }]);
    expect(s).toHaveLength(1);
  });
});

describe('plain text and tapping', () => {
  it('splits plain text into sentences', () => {
    const s = splitPlainText('First one here. Second, longer one!\nThird?');
    expect(s.map((x) => x.text)).toEqual(['First one here.', 'Second, longer one!', 'Third?']);
    expect(s.every((x) => x.start === null)).toBe(true);
  });

  it('times sentences from tap marks', () => {
    const s = applyTapMarks(splitPlainText('A b c. D e f. G h i.'), [2, 5], 0.5);
    expect(s[0]).toMatchObject({ start: 0.5, end: 2 });
    expect(s[1]).toMatchObject({ start: 2, end: 5 });
    expect(s[2].start).toBeNull();
  });

  it('transcriptToSentences picks the right path', () => {
    expect(transcriptToSentences('One. Two.').format).toBe('plain');
    expect(transcriptToSentences(SRT).sentences).toHaveLength(2);
  });
});

describe('nudge and sources', () => {
  const s = cuesToSentences(parseCues(SRT));

  it('nudges an edge but keeps a minimum length', () => {
    expect(nudgeSentence(s, 0, 'start', -0.5)[0].start).toBe(0.5);
    expect(nudgeSentence(s, 0, 'end', -10)[0].end).toBeCloseTo(1.3);
    expect(nudgeSentence(s, 0, 'start', -5)[0].start).toBe(0);
  });

  it('builds a YouTube clip or an audio fragment with padding', () => {
    expect(sentenceSource({ kind: 'youtube', videoId: 'M7lc1UVf-VE' }, s[0])).toBe('yt:M7lc1UVf-VE@0.75-3.9');
    const src = sentenceSource({ kind: 'audio', url: 'https://x.org/a.mp3#old' }, s[0])!;
    expect(src).toBe('https://x.org/a.mp3#t=0.75,3.9');
    expect(mediaFragment(src)).toEqual({ start: 0.75, end: 3.9 });
    expect(sentenceSource({ kind: 'audio', url: 'https://x.org/a.mp3' }, { id: 'a', text: 'x', start: null, end: null })).toBeNull();
  });

  it('accepts only http(s) audio links', () => {
    expect(parseAudioUrl('https://example.org/file.mp3')).toBe('https://example.org/file.mp3');
    expect(parseAudioUrl('javascript:alert(1)')).toBeNull();
    expect(parseAudioUrl('not a url')).toBeNull();
  });
});

describe('hints', () => {
  it('shows blanks and first letters', () => {
    expect(blankHint("It's fine.")).toBe('____ ____.');
    expect(firstLetterHint('The weather is fine.')).toBe('T__ w______ i_ f___.');
  });

  it('reveals the next word after the correct start', () => {
    expect(revealNextWord('The weather is fine today.', 'the weather')).toBe('The weather is ');
    expect(revealNextWord('The weather is fine.', 'the wether is')).toBe('The weather ');
    expect(revealNextWord('Hi.', '')).toBe('Hi.');
  });
});

describe('progress and checks', () => {
  it('summarises progress', () => {
    expect(summarizeProgress({ best: { a: 100, b: 80 }, revealed: [], index: 2, updatedAt: '' }, 4)).toEqual({
      done: 2,
      total: 4,
      average: 90,
      mastered: 1,
      percent: 50,
    });
  });

  it('lists problems before saving', () => {
    expect(exerciseProblems({ title: '', sentences: splitPlainText('One. Two.') })).toEqual([
      'Bài chưa có tên.',
      '2 câu chưa có mốc thời gian.',
    ]);
    expect(exerciseProblems({ title: 'X', sentences: cuesToSentences(parseCues(SRT)) })).toEqual([]);
  });
});

describe('masked check, stored rows and progress', () => {
  it('shows words up to the first mistake and stars after it', () => {
    const c = maskedCheck("Coffee isn't cheap, you know.", 'coffee isnt chip');
    expect(c.shown).toBe("Coffee isn't *****, *** ****.");
    expect(c).toMatchObject({ correct: 2, total: 5, complete: false });
    expect(maskedCheck('Hello there.', 'hello there').complete).toBe(true);
    expect(maskedCheck('Hello there.', 'hello there friend').complete).toBe(false);
  });

  it('reads back exercises and drops broken ones', () => {
    expect(sanitizeExercise({ id: 'a', source: { kind: 'youtube', videoId: 'bad' }, sentences: [{ text: 'x' }] })).toBeNull();
    const e = sanitizeExercise({ id: 'a', title: 'T', category: 'nope', level: 'C2', source: { kind: 'youtube', videoId: 'M7lc1UVf-VE' }, sentences: [{ text: 'Hi.', start: 1, end: 'x' }, 4] });
    expect(e).toMatchObject({ category: 'other', level: 'B1', sentences: [{ id: 's1', text: 'Hi.', start: 1, end: null }] });
  });

  it('keeps the best score and caps a revealed sentence', () => {
    const now = new Date('2026-11-04T08:00:00Z');
    let p = recordSentence(emptyProgress(), 's1', 70, false, 1, now);
    p = recordSentence(p, 's1', 40, false, 1, now);
    expect(p.best.s1).toBe(70);
    p = recordSentence(p, 's2', 100, true, 2, now);
    expect(p.best.s2).toBe(50);
    expect(p.revealed).toEqual(['s2']);
    expect(sanitizeProgress({ best: { a: 120, b: 80 }, index: -2, revealed: [1, 'b'] })).toMatchObject({ best: { b: 80 }, index: 0, revealed: ['b'] });
  });
});
