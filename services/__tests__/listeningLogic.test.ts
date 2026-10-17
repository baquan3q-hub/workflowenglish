import { describe, it, expect } from 'vitest';
import { LISTENING_TESTS, type ListeningSection } from '../../data/ielts/listening';
import {
  classifyTextAnswer,
  countAnswerTokens,
  gradeGroup,
  normalizeAnswer,
  rawToBand,
  scoreSections,
  sectionAudioSegments,
  validateSection,
  validateTest,
  withinWordLimit,
} from '../listeningLogic';

describe('normalizeAnswer', () => {
  it('ignores case, spacing and final punctuation', () => {
    expect(normalizeAnswer('  The Beach. ')).toBe('the beach');
    expect(normalizeAnswer('off-peak')).toBe(normalizeAnswer('Off Peak'));
  });

  it('treats number words, ordinals and currency like digits', () => {
    expect(normalizeAnswer('twelve')).toBe('12');
    expect(normalizeAnswer('twenty-five')).toBe('25');
    expect(normalizeAnswer('one hundred and fifty')).toBe('150');
    expect(normalizeAnswer('£29.50')).toBe('29.50');
    expect(normalizeAnswer('1,500')).toBe('1500');
    expect(normalizeAnswer('7:30')).toBe('7.30');
  });

  it('reads dates in either order', () => {
    expect(normalizeAnswer('3rd June')).toBe('3 june');
    expect(normalizeAnswer('June 3')).toBe('3 june');
    expect(normalizeAnswer('3 Jun')).toBe('3 june');
  });
});

describe('word limits', () => {
  it('counts a phone number in groups as one number', () => {
    expect(countAnswerTokens('07946 382115')).toEqual({ words: 0, numbers: 1 });
    expect(countAnswerTokens('3rd June')).toEqual({ words: 1, numbers: 1 });
  });

  it('allows one extra number only with AND/OR A NUMBER', () => {
    expect(withinWordLimit('3rd June', 1, true)).toBe(true);
    expect(withinWordLimit('3rd June', 1, false)).toBe(false);
    expect(withinWordLimit('swimming pool', 1, true)).toBe(false);
  });
});

describe('classifyTextAnswer', () => {
  const pool = ['pool'];
  it('names the kind of mistake', () => {
    expect(classifyTextAnswer('Pool', pool, 1, true)).toBe('correct');
    expect(classifyTextAnswer('', pool, 1, true)).toBe('blank');
    expect(classifyTextAnswer('swimming pool', pool, 1, true)).toBe('over_limit');
    expect(classifyTextAnswer('roof', ['roofs'], 1, true)).toBe('plural');
    expect(classifyTextAnswer('factorys', ['factories'], 1, true)).toBe('spelling');
    expect(classifyTextAnswer('vegetasion', ['vegetation'], 1, true)).toBe('spelling');
    expect(classifyTextAnswer('garden', pool, 1, true)).toBe('wrong');
  });

  it('never calls a wrong number a spelling slip', () => {
    expect(classifyTextAnswer('29.60', ['29.50'], 1, true)).toBe('wrong');
  });
});

describe('rawToBand', () => {
  it('follows the Listening conversion table', () => {
    expect(rawToBand(40)).toBe(9);
    expect(rawToBand(39)).toBe(9);
    expect(rawToBand(37)).toBe(8.5);
    expect(rawToBand(30)).toBe(7);
    expect(rawToBand(29)).toBe(6.5);
    expect(rawToBand(23)).toBe(6);
    expect(rawToBand(18)).toBe(5.5);
    expect(rawToBand(16)).toBe(5);
    expect(rawToBand(10)).toBe(4);
    expect(rawToBand(0)).toBe(0);
  });
});

describe('grading', () => {
  const multi = LISTENING_TESTS.find((t) => t.id === 'practice-p2-museum')!.sections[0];
  const benefits = multi.groups[0];

  it('scores choose-two in any order and one mark per correct letter', () => {
    const one = gradeGroup(benefits, { 11: 'D,A' }, multi);
    expect(one.map((r) => r.status)).toEqual(['correct', 'correct']);
    const half = gradeGroup(benefits, { 11: 'A,B' }, multi);
    expect(half.map((r) => r.status)).toEqual(['correct', 'wrong']);
    const none = gradeGroup(benefits, {}, multi);
    expect(none.map((r) => r.status)).toEqual(['blank', 'blank']);
  });

  it('gives a full test a band from the raw score', () => {
    const test = LISTENING_TESTS.find((t) => t.kind === 'full')!;
    const all: Record<number, string> = {};
    for (const s of test.sections) {
      for (const g of s.groups) {
        if (g.type === 'mcq_multi') all[g.questions[0].number] = g.questions[0].answers.join(',');
        else for (const q of g.questions) all[q.number] = q.answers[0];
      }
    }
    const full = scoreSections(test.sections, all);
    expect(full).toMatchObject({ score: 40, total: 40, band: 9, estimated: false });
    const part = scoreSections([test.sections[0]], { 1: 'Hartley', 2: 'Fenwick' });
    expect(part).toMatchObject({ score: 2, total: 10, estimated: true, band: rawToBand(8) });
  });
});

describe('listening content', () => {
  for (const test of LISTENING_TESTS) {
    it(`${test.id} passes the data checks`, () => {
      expect(validateTest(test)).toEqual([]);
    });
  }

  it('has one full test and practice for every part', () => {
    expect(LISTENING_TESTS.filter((t) => t.kind === 'full').length).toBeGreaterThanOrEqual(1);
    const parts = LISTENING_TESTS.filter((t) => t.kind === 'practice').map((t) => t.sections[0].part);
    expect([...new Set(parts)].sort()).toEqual([1, 2, 3, 4]);
  });

  it('uses unique ids', () => {
    const ids = LISTENING_TESTS.flatMap((t) => [t.id, ...t.sections.flatMap((s) => [s.id, ...s.segments.map((g) => g.id)])]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validateSection', () => {
  const base: ListeningSection = {
    id: 'x',
    part: 1,
    title: 'x',
    contextVi: 'x',
    style: 'uk',
    prepSeconds: 30,
    speakers: [{ name: 'Ann', voice: 'Kore' }],
    segments: [{ id: 's1', lines: [{ speaker: 'Ann', text: 'The fee is £20 and the room is on the second floor.' }] }],
    groups: [
      {
        id: 'g1',
        type: 'completion',
        instruction: '',
        wordLimit: 1,
        numberAllowed: true,
        lines: ['Fee: £{{1}}'],
        questions: [{ number: 1, answers: ['25'], segmentId: 's1', evidence: 'The fee is £20', explanationVi: 'x' }],
      },
    ],
  };

  it('catches an answer missing from the script', () => {
    expect(validateSection(base).join()).toMatch(/answer is not in its segment/);
  });

  it('catches blanks that do not match the questions', () => {
    const bad = { ...base, groups: [{ ...base.groups[0], lines: ['Fee: £{{2}}'] }] } as ListeningSection;
    expect(validateSection(bad).join()).toMatch(/blanks 2 do not match/);
  });
});

describe('sectionAudioSegments', () => {
  it('sends a dialogue as two speakers with Name: lines, and a talk as one voice', () => {
    const full = LISTENING_TESTS.find((t) => t.kind === 'full')!;
    const [dialogue] = sectionAudioSegments(full.sections[0]);
    expect(dialogue.speakers).toEqual([
      { name: 'Sarah', voice: 'Kore' },
      { name: 'Daniel', voice: 'Puck' },
    ]);
    expect(dialogue.text.startsWith('Sarah: Good morning')).toBe(true);
    const [talk] = sectionAudioSegments(full.sections[1]);
    expect(talk.voice).toBe('Charon');
    expect(talk.speakers).toBeUndefined();
  });
});
