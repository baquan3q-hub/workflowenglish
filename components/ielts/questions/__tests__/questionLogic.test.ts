import { describe, expect, it } from 'vitest';
import type { ReadingGroup, ReadingQuestion } from '../../../../data/ielts/reading/types';
import {
  followsPassageOrder,
  nextBlank,
  questionRange,
  readingGroupKind,
  splitBlanks,
  tfngChoices,
  toggleChoice,
  usedBy,
} from '../questionLogic';

const q = (number: number): ReadingQuestion => ({ number, paragraph: 'A', answers: ['x'], evidence: 'x', explanationVi: '.', skill: 'detail' });
const base = { id: 'g', instruction: '.', questions: [q(1), q(2)] };
const opts = [
  { key: 'A', text: 'one' },
  { key: 'B', text: 'two' },
];

const GROUPS: Record<string, ReadingGroup> = {
  completion: { ...base, type: 'completion', wordLimit: 2, numberAllowed: false, lines: ['{{1}} and {{2}}'] },
  flowchart: { ...base, type: 'completion', wordLimit: 2, numberAllowed: false, lines: ['{{1}}', '{{2}}'], layout: 'flowchart' },
  summary_box: { ...base, type: 'completion', wordLimit: 1, numberAllowed: false, lines: ['{{1}} {{2}}'], wordBox: opts },
  short_answer: { ...base, type: 'short_answer', wordLimit: 3, numberAllowed: true },
  mcq: { ...base, type: 'mcq' },
  mcq_multi: { ...base, type: 'mcq_multi', prompt: 'Which TWO?', options: opts },
  tfng: { ...base, type: 'tfng', variant: 'tfng' },
  ynng: { ...base, type: 'tfng', variant: 'ynng' },
  headings: { ...base, type: 'headings', headings: [{ key: 'i', text: 'h' }] },
  matching_paragraph: { ...base, type: 'matching', target: 'paragraph', options: opts },
  matching_feature: { ...base, type: 'matching', target: 'feature', options: opts },
  matching_ending: { ...base, type: 'matching', target: 'ending', options: opts },
  diagram: { ...base, type: 'diagram', wordLimit: 1, numberAllowed: false, diagram: { title: 't', width: 10, height: 10, shapes: [] } },
};

describe('splitBlanks', () => {
  it('splits text and blank numbers in order', () => {
    expect(splitBlanks('The {{4}} of the {{5}}.')).toEqual([{ text: 'The ' }, { blank: 4 }, { text: ' of the ' }, { blank: 5 }, { text: '.' }]);
  });
  it('drops empty text at the edges', () => {
    expect(splitBlanks('{{12}} rises')).toEqual([{ blank: 12 }, { text: ' rises' }]);
    expect(splitBlanks('{{1}}{{2}}')).toEqual([{ blank: 1 }, { blank: 2 }]);
  });
  it('keeps a line without blanks whole', () => {
    expect(splitBlanks('Stage 1')).toEqual([{ text: 'Stage 1' }]);
  });
});

describe('questionRange', () => {
  it('names one question or a range', () => {
    expect(questionRange([q(7)])).toBe('Câu 7');
    expect(questionRange([q(7), q(8), q(9)])).toBe('Câu 7–9');
  });
});

describe('toggleChoice', () => {
  it('adds letters sorted and removes them again', () => {
    expect(toggleChoice(undefined, 'C', 2)).toBe('C');
    expect(toggleChoice('C', 'A', 2)).toBe('A,C');
    expect(toggleChoice('A,C', 'C', 2)).toBe('A');
    expect(toggleChoice('A', 'A', 2)).toBe('');
  });
  it('never goes past the number to choose', () => {
    expect(toggleChoice('A,C', 'B', 2)).toBe('A,C');
    expect(toggleChoice('A,C', 'A', 2)).toBe('C');
  });
});

describe('tfngChoices', () => {
  it('gives the three answers of each variant', () => {
    expect(tfngChoices('tfng')).toEqual(['TRUE', 'FALSE', 'NOT GIVEN']);
    expect(tfngChoices('ynng')).toEqual(['YES', 'NO', 'NOT GIVEN']);
  });
});

describe('readingGroupKind', () => {
  it('names every Reading question type', () => {
    for (const [kind, group] of Object.entries(GROUPS)) expect(readingGroupKind(group)).toBe(kind);
  });
});

describe('followsPassageOrder', () => {
  it('matches the exam: in order for TFNG, completion, short answer and choice', () => {
    expect(followsPassageOrder(GROUPS.tfng)).toBe(true);
    expect(followsPassageOrder(GROUPS.ynng)).toBe(true);
    expect(followsPassageOrder(GROUPS.completion)).toBe(true);
    expect(followsPassageOrder(GROUPS.flowchart)).toBe(true);
    expect(followsPassageOrder(GROUPS.short_answer)).toBe(true);
    expect(followsPassageOrder(GROUPS.mcq)).toBe(true);
  });
  it('out of order for headings and matching', () => {
    expect(followsPassageOrder(GROUPS.headings)).toBe(false);
    expect(followsPassageOrder(GROUPS.matching_paragraph)).toBe(false);
    expect(followsPassageOrder(GROUPS.matching_feature)).toBe(false);
    expect(followsPassageOrder(GROUPS.matching_ending)).toBe(false);
  });
  it('says nothing where it varies', () => {
    expect(followsPassageOrder(GROUPS.summary_box)).toBeNull();
    expect(followsPassageOrder(GROUPS.mcq_multi)).toBeNull();
    expect(followsPassageOrder(GROUPS.diagram)).toBeNull();
  });
});

describe('usedBy', () => {
  it('lists every question that chose a value, ignoring blanks', () => {
    const used = usedBy([q(1), q(2), q(3), q(4)], { 1: 'iv', 2: ' IV ', 3: '', 4: 'ii' }, (s) => s.trim().toLowerCase());
    expect([...used]).toEqual([
      ['iv', [1, 2]],
      ['ii', [4]],
    ]);
  });
});

describe('nextBlank', () => {
  const numbers = [5, 6, 7, 8];
  it('moves to the next empty blank after the current one', () => {
    expect(nextBlank(numbers, { 5: 'A' }, 5)).toBe(6);
    expect(nextBlank(numbers, { 5: 'A', 6: 'B' }, 5)).toBe(7);
  });
  it('wraps round to an earlier empty blank', () => {
    expect(nextBlank(numbers, { 6: 'A', 7: 'B', 8: 'C' }, 8)).toBe(5);
  });
  it('gives null once every blank is filled', () => {
    expect(nextBlank(numbers, { 5: 'A', 6: 'B', 7: 'C', 8: 'D' }, 6)).toBeNull();
  });
  it('starts from the first empty blank when there is no current one', () => {
    expect(nextBlank(numbers, { 5: 'A' }, 8)).toBe(6);
  });
});
