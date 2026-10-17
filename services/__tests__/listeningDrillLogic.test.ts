import { describe, expect, it } from 'vitest';
import { compareDictation, dictationLines, gradeDrillAnswer, pickDrillItems, transcriptMarks, wordKey } from '../listeningDrillLogic';
import { DRILL_CATEGORIES, DRILL_ITEMS, DRILL_SIZE } from '../../data/ielts/listening/drills';
import { LISTENING_TESTS } from '../../data/ielts/listening';

describe('compareDictation', () => {
  it('accepts case, punctuation and number words', () => {
    const r = compareDictation("Well, it's twenty pounds a month.", 'well its 20 pounds a month');
    expect(r.accuracy).toBe(100);
    expect(r.tokens.every((t) => t.status === 'ok')).toBe(true);
  });

  it('marks missed, extra, wrong and close words', () => {
    const r = compareDictation('The museum opens at nine on Sundays', 'the musuem starts at nine on the Sundays');
    const by = Object.fromEntries(r.tokens.map((t) => [t.word, t.status]));
    expect(by.museum).toBe('close');
    expect(by.opens).toBe('wrong');
    expect(r.tokens.find((t) => t.status === 'extra')?.word).toBe('the');
    expect(r.total).toBe(7);
    expect(r.correct).toBe(5);
    expect(r.accuracy).toBe(79);
  });

  it('counts an empty answer as all missed', () => {
    const r = compareDictation('Bring a packed lunch.', '');
    expect(r.tokens.map((t) => t.status)).toEqual(['missed', 'missed', 'missed', 'missed']);
    expect(r.accuracy).toBe(0);
  });

  it('keys words loosely', () => {
    expect(wordKey('Sunday,')).toBe('sunday');
    expect(wordKey('£29.50.')).toBe('29.50');
    expect(wordKey('oh')).toBe('0');
  });
});

describe('transcriptMarks', () => {
  it('finds the evidence of every question in its segment', () => {
    for (const test of LISTENING_TESTS)
      for (const section of test.sections) {
        const segs = transcriptMarks(section);
        for (const g of section.groups)
          for (const q of g.questions) {
            const seg = segs.find((s) => s.id === q.segmentId)!;
            const marked = seg.lines.flatMap((l) => l.pieces).filter((p) => p.mark?.kind === 'evidence' && p.mark.numbers.includes(q.number));
            expect(marked.length, `${section.id} Q${q.number}`).toBeGreaterThan(0);
          }
      }
  });

  it('keeps the line text whole', () => {
    const section = LISTENING_TESTS[0].sections[0];
    const segs = transcriptMarks(section);
    segs.forEach((seg, i) =>
      seg.lines.forEach((l, k) => expect(l.pieces.map((p) => p.text).join('')).toBe(section.segments[i].lines[k].text)),
    );
  });
});

describe('numbers, names and dates drill', () => {
  it('grades with spacing in numbers and codes ignored', () => {
    expect(gradeDrillAnswer('0771 148 3926', ['07711483926'])).toBe('correct');
    expect(gradeDrillAnswer('bs94qt', ['BS9 4QT'])).toBe('correct');
    expect(gradeDrillAnswer('March 14th', ['14 March'])).toBe('correct');
    expect(gradeDrillAnswer('Tompson', ['Thompson'])).toBe('spelling');
    expect(gradeDrillAnswer('', ['Thompson'])).toBe('blank');
    expect(gradeDrillAnswer('15', ['14'])).toBe('wrong');
  });

  it('has a full drill in every category and unique ids', () => {
    for (const c of DRILL_CATEGORIES) expect(DRILL_ITEMS.filter((i) => i.category === c.id).length).toBeGreaterThanOrEqual(DRILL_SIZE);
    expect(new Set(DRILL_ITEMS.map((i) => i.id)).size).toBe(DRILL_ITEMS.length);
  });

  it('each answer grades as correct against itself and fits the TTS limit', () => {
    for (const item of DRILL_ITEMS) {
      for (const a of item.answers) expect(gradeDrillAnswer(a, item.answers), item.id).toBe('correct');
      expect(item.spoken.length).toBeLessThan(300);
    }
  });

  it('picks distinct items', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const picked = pickDrillItems(DRILL_ITEMS, 8, random);
    expect(picked).toHaveLength(8);
    expect(new Set(picked.map((p) => p.id)).size).toBe(8);
  });
});

describe('dictationLines', () => {
  it('gives every part lines to practise, each short enough for one clip', () => {
    for (const test of LISTENING_TESTS)
      for (const section of test.sections) {
        const lines = dictationLines(section);
        expect(lines.length, section.id).toBeGreaterThanOrEqual(5);
        expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
        for (const l of lines) expect(l.clip.text.length).toBeLessThanOrEqual(1500);
      }
  });
});
