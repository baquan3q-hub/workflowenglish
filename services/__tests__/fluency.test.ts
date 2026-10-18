import { describe, it, expect } from 'vitest';
import {
  combineFluency,
  computeRms,
  contentWordCount,
  countFillers,
  countRepeats,
  detectPauses,
  FLUENCY_REFERENCE,
  fluencyMetrics,
  fluencySummaryForGrader,
  hasEnoughSpeech,
  isFluencyMetrics,
  metricValue,
  rateFluency,
  referenceRanges,
  silenceThreshold,
  tokenize,
  voicedSpan,
  wordsPerMinute,
  type FluencyMetricKey,
} from '../fluencyLogic';

const fillerMap = (t: string) => Object.fromEntries(countFillers(t).map((f) => [f.word, f.count]));

/** Fake 50 ms levels: [level, frames] runs. */
const levels = (...runs: [number, number][]) => runs.flatMap(([v, n]) => Array<number>(n).fill(v));

describe('fillers', () => {
  it('counts hesitation sounds, sorted by count', () => {
    expect(countFillers('Um, I think, uh, it is um good. Erm… hmm.')).toEqual([
      { word: 'um', count: 2 },
      { word: 'erm', count: 1 },
      { word: 'hmm', count: 1 },
      { word: 'uh', count: 1 },
    ]);
  });

  it('counts "you know" only as a filler', () => {
    expect(fillerMap('It was, you know, really big.')).toEqual({ 'you know': 1 });
    expect(fillerMap('Do you know the answer?')).toEqual({});
    expect(fillerMap('If you know the way, tell me.')).toEqual({});
    expect(fillerMap('You know what, I agree.')).toEqual({});
    expect(fillerMap('you know how it is')).toEqual({});
    expect(fillerMap('It is, you know, you know, hard.')).toEqual({ 'you know': 2 });
  });

  it('counts "I mean" but not the rephrasing "what I mean is"', () => {
    expect(fillerMap('I mean, it is fine.')).toEqual({ 'i mean': 1 });
    expect(fillerMap('What I mean is that cities grow.')).toEqual({});
    expect(fillerMap('I mean that seriously.')).toEqual({});
  });

  it('counts "like" only between commas', () => {
    expect(fillerMap('It was, like, huge.')).toEqual({ like: 1 });
    expect(fillerMap('I like it, and like my friends do too.')).toEqual({});
  });

  it('handles curly apostrophes and bracketed notes', () => {
    expect(tokenize('I don’t know [laughs] UM')).toEqual(['i', "don't", 'know', 'um']);
    expect(contentWordCount('Um, I uh like tea.')).toBe(3);
  });
});

describe('repeats', () => {
  it('counts stammered words and pairs, skipping fillers', () => {
    expect(countRepeats('I I think the the city is big.')).toBe(2);
    expect(countRepeats('I think I think it is fine.')).toBe(1);
    expect(countRepeats('The um the bus was late.')).toBe(1);
  });

  it('allows natural doubles', () => {
    expect(countRepeats('She had had enough. I know that that is true.')).toBe(0);
    expect(countRepeats('It is very, very good.')).toBe(1);
  });
});

describe('audio levels', () => {
  it('computes RMS per frame', () => {
    expect(computeRms([1, -1, 1, -1, 0.5, 0.5], 1000, 2)).toEqual([1, 1, 0.5]);
    expect(computeRms([], 16000)).toEqual([]);
  });

  it('sets the silence threshold from the loud end, with a floor', () => {
    expect(silenceThreshold(levels([0, 10], [0.2, 90]))).toBeCloseTo(0.024);
    expect(silenceThreshold(levels([0.01, 100]))).toBe(0.006);
    expect(silenceThreshold([])).toBe(0);
  });

  it('finds the voiced span and long pauses inside it only', () => {
    const rms = levels([0, 40], [0.2, 20], [0, 40], [0.2, 20], [0, 20], [0.2, 10], [0, 60]);
    expect(voicedSpan(rms)).toEqual({ startMs: 2000, endMs: 7500 });
    // 2 s gap counts; 1 s gap is too short; leading and trailing silence ignored.
    expect(detectPauses(rms)).toEqual([{ startMs: 3000, durationMs: 2000 }]);
    expect(voicedSpan(levels([0, 30]))).toBeNull();
    expect(detectPauses(levels([0, 30]))).toEqual([]);
  });
});

describe('fluencyMetrics', () => {
  const transcript = 'Um, I usually go to the park, you know, near my house every weekend with my sister.';

  it('measures rate, fillers and repeats from the transcript', () => {
    const m = fluencyMetrics({ transcript, durationSeconds: 6 });
    expect(m.words).toBe(16);
    expect(m.wpm).toBe(160);
    expect(m.fillers.total).toBe(2);
    expect(m.fillers.perMinute).toBe(20);
    expect(m.pauses).toBeUndefined();
    expect(wordsPerMinute(10, 0)).toBe(0);
  });

  it('uses the voiced span when audio levels are given', () => {
    const rms = levels([0, 20], [0.2, 40], [0, 40], [0.2, 40], [0, 60]);
    const m = fluencyMetrics({ transcript, durationSeconds: 10, rms });
    expect(m.seconds).toBe(6);
    expect(m.wpm).toBe(160);
    expect(m.pauses).toEqual({ count: 1, longestMs: 2000, totalMs: 2000, perMinute: 10 });
  });

  it('combines several answers', () => {
    const a = fluencyMetrics({ transcript: 'Um, I like it a lot.', durationSeconds: 3, rms: levels([0.2, 60]) });
    const b = fluencyMetrics({ transcript: 'Uh, um, it is the the best.', durationSeconds: 3, rms: levels([0.2, 60]) });
    const c = combineFluency([a, b])!;
    expect(c.words).toBe(a.words + b.words);
    expect(c.seconds).toBe(6);
    expect(c.fillers.total).toBe(3);
    expect(c.fillers.top[0]).toEqual({ word: 'um', count: 2 });
    expect(c.repeats).toBe(1);
    expect(c.pauses?.count).toBe(0);
    // Pauses are dropped when one answer could not be measured.
    expect(combineFluency([a, fluencyMetrics({ transcript: 'Yes.', durationSeconds: 1 })])!.pauses).toBeUndefined();
    expect(combineFluency([])).toBeNull();
  });
});

describe('band references', () => {
  const keys: FluencyMetricKey[] = ['wpm', 'fillers', 'pauses', 'repeats'];

  it('has ordered steps that end at Infinity', () => {
    for (const key of keys) {
      const steps = FLUENCY_REFERENCE[key].steps;
      for (let i = 1; i < steps.length; i++) expect(steps[i].upTo).toBeGreaterThan(steps[i - 1].upTo);
      expect(steps[steps.length - 1].upTo).toBe(Infinity);
    }
  });

  it('rates values against the steps', () => {
    expect(rateFluency('wpm', 60).level).toBe('low');
    expect(rateFluency('wpm', 110).level).toBe('ok');
    expect(rateFluency('wpm', 140).level).toBe('strong');
    expect(rateFluency('fillers', 0).level).toBe('strong');
    expect(rateFluency('fillers', 8).level).toBe('low');
    expect(rateFluency('pauses', 3).level).toBe('weak');
    expect(rateFluency('repeats', 1).level).toBe('strong');
  });

  it('reads the per-minute value of each measure', () => {
    const m = fluencyMetrics({ transcript: 'I I went to to school', durationSeconds: 30 });
    expect(metricValue(m, 'wpm')).toBe(m.wpm);
    expect(metricValue(m, 'repeats')).toBe(4);
    expect(metricValue(m, 'pauses')).toBeNull();
  });

  it('prints readable ranges', () => {
    expect(referenceRanges('wpm')).toEqual([
      'dưới 80: ≈ band 5 trở xuống',
      '80–104: ≈ band 5–5.5',
      '105–124: ≈ band 6',
      '125–170: ≈ band 7+',
      'trên 170: Nhanh',
    ]);
    expect(referenceRanges('fillers')[0]).toBe('đến 2: ≈ band 7+');
    expect(referenceRanges('fillers')[1]).toBe('trên 2 đến 4: ≈ band 6');
    expect(referenceRanges('fillers')[3]).toBe('trên 7: ≈ band 5 trở xuống');
  });

  it('flags answers too short to judge', () => {
    expect(hasEnoughSpeech(fluencyMetrics({ transcript: 'Yes I do.', durationSeconds: 3 }))).toBe(false);
    const long = Array(40).fill('word').join(' ');
    expect(hasEnoughSpeech(fluencyMetrics({ transcript: long, durationSeconds: 20 }))).toBe(true);
  });
});

describe('grader summary and stored shape', () => {
  it('summarises the numbers within the op limit', () => {
    const rms = levels([0.2, 40], [0, 40], [0.2, 40]);
    const m = fluencyMetrics({ transcript: 'Um, uh, er, you know, I mean, it is, like, the the best best.', durationSeconds: 6, rms });
    const s = fluencySummaryForGrader(m);
    expect(s).toMatch(/^Measured on the device: \d+ words per minute/);
    expect(s).toContain('pauses longer than 1.5 s (longest 2.0 s)');
    expect(s).toContain('stammered repeats');
    expect(s.length).toBeLessThanOrEqual(600);
    expect(fluencySummaryForGrader(fluencyMetrics({ transcript: 'Fine.', durationSeconds: 2 }))).not.toContain('pauses');
  });

  it('recognises metrics read back from the database', () => {
    const m = fluencyMetrics({ transcript: 'Hello there.', durationSeconds: 2 });
    expect(isFluencyMetrics(JSON.parse(JSON.stringify(m)))).toBe(true);
    expect(isFluencyMetrics(null)).toBe(false);
    expect(isFluencyMetrics({})).toBe(false);
    expect(isFluencyMetrics({ wpm: '100', words: 1, seconds: 1, fillers: { total: 0 } })).toBe(false);
  });
});
