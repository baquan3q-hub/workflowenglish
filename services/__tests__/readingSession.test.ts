import { describe, expect, it } from 'vitest';
import { READING_PRACTICE_SEEDS, READING_PRACTICE_WINDCATCHERS } from '../../data/ielts/reading/practice';
import { READING_TEST_1 } from '../../data/ielts/reading/test1';
import {
  addRange,
  answeredNumbers,
  highlightSegments,
  overTime,
  readingAnswerLabel,
  readingAttemptLabels,
  readingQuestionContext,
  removeRangeAt,
  sessionPassages,
} from '../readingLogic';

const [p1, p2, p3] = READING_TEST_1.passages;
const group = (id: string) => READING_TEST_1.passages.flatMap((p) => p.groups).find((g) => g.id === id)!;

describe('sessionPassages and labels', () => {
  it('takes the picked passages, or all when none are picked', () => {
    expect(sessionPassages(READING_TEST_1, [p2.id])).toEqual([p2]);
    expect(sessionPassages(READING_TEST_1, [])).toEqual([p1, p2, p3]);
    expect(sessionPassages(READING_TEST_1, ['missing'])).toHaveLength(3);
  });
  it('labels a full test, one passage, and a practice passage', () => {
    expect(readingAttemptLabels(READING_TEST_1, [p1, p2, p3])).toEqual({ title: 'Reading Test 1', topic: '', taskOrPart: 'full_test' });
    expect(readingAttemptLabels(READING_TEST_1, [p3])).toEqual({ title: 'Reading Test 1', topic: p3.title, taskOrPart: 'passage_3' });
    expect(readingAttemptLabels(READING_PRACTICE_SEEDS, READING_PRACTICE_SEEDS.passages).taskOrPart).toBe('passage_1');
  });
});

describe('overTime', () => {
  it('counts only the seconds past the suggested minutes', () => {
    expect(overTime(17 * 60 - 5, p1)).toBe(0);
    expect(overTime(17 * 60 + 90, p1)).toBe(90);
  });
});

describe('answeredNumbers', () => {
  it('ignores blanks and counts each chosen letter of a choose-two group', () => {
    const wind = READING_PRACTICE_WINDCATCHERS.passages;
    expect([...answeredNumbers(wind, { 1: 'F', 2: ' ', 12: 'A' })].sort((a, b) => a - b)).toEqual([1, 12]);
    expect([...answeredNumbers(wind, { 12: 'A,D' })].sort((a, b) => a - b)).toEqual([12, 13]);
  });
});

describe('readingQuestionContext', () => {
  it('shows the blank in its table row, the paragraph for headings, the statement otherwise', () => {
    expect(readingQuestionContext(group('rt1-p1-g2'), group('rt1-p1-g2').questions[0])).toBe('Low floors · Passengers board straight from the _____ · Easy access for wheelchairs and pushchairs');
    expect(readingQuestionContext(group('rt1-p2-g1'), group('rt1-p2-g1').questions[0])).toBe('Đoạn B');
    expect(readingQuestionContext(group('rt1-p1-g1'), group('rt1-p1-g1').questions[0])).toMatch(/^Early trams/);
  });
  it('puts other blanks of the line as "…"', () => {
    const summary = group('rt1-p2-g3');
    expect(readingQuestionContext(summary, summary.questions[1])).toContain('become …, allowing fluid to carry away _____');
  });
  it('reads a diagram label on one line', () => {
    const diagram = READING_PRACTICE_WINDCATCHERS.passages[0].groups[1];
    expect(readingQuestionContext(diagram, diagram.questions[0])).toBe('Opening facing the _____');
  });
});

describe('readingAnswerLabel', () => {
  it('names headings, word-box words, options and paragraphs', () => {
    expect(readingAnswerLabel(group('rt1-p2-g1'), group('rt1-p2-g1').questions[0], 'I')).toBe('i. A modest saving of fuel');
    expect(readingAnswerLabel(group('rt1-p2-g3'), group('rt1-p2-g3').questions[0], 'a')).toBe('A. wider');
    expect(readingAnswerLabel(group('rt1-p3-g1'), group('rt1-p3-g1').questions[0], 'B')).toMatch(/^B\. many people/);
    const matchPara = READING_PRACTICE_WINDCATCHERS.passages[0].groups[0];
    expect(readingAnswerLabel(matchPara, matchPara.questions[0], 'f')).toBe('Đoạn F');
  });
  it('keeps typed words and joins chosen letters', () => {
    expect(readingAnswerLabel(group('rt1-p1-g3'), group('rt1-p1-g3').questions[0], 'a quarter')).toBe('a quarter');
    const multi = READING_PRACTICE_WINDCATCHERS.passages[0].groups[3];
    expect(readingAnswerLabel(multi, multi.questions[0], 'A,D')).toBe('A. They do not use electricity.; D. They can make a house much cooler than the street.');
    expect(readingAnswerLabel(multi, multi.questions[0], '')).toBe('');
  });
});

describe('highlight ranges', () => {
  it('merges overlapping and touching ranges and keeps them sorted', () => {
    expect(addRange([[10, 20]], [30, 40])).toEqual([[10, 20], [30, 40]]);
    expect(addRange([[10, 20], [30, 40]], [15, 30])).toEqual([[10, 40]]);
    expect(addRange([[10, 20]], [25, 5])).toEqual([[5, 25]]);
    expect(addRange([[10, 20]], [3, 3])).toEqual([[10, 20]]);
  });
  it('removes the range under an offset', () => {
    expect(removeRangeAt([[0, 5], [10, 20]], 12)).toEqual([[0, 5]]);
    expect(removeRangeAt([[0, 5]], 5)).toEqual([[0, 5]]);
  });
  it('cuts text into plain and marked pieces, clipped to the text', () => {
    expect(highlightSegments('abcdefghij', [[2, 4], [6, 50]])).toEqual([
      { text: 'ab', start: 0, marked: false },
      { text: 'cd', start: 2, marked: true },
      { text: 'ef', start: 4, marked: false },
      { text: 'ghij', start: 6, marked: true },
    ]);
    expect(highlightSegments('abc', [])).toEqual([{ text: 'abc', start: 0, marked: false }]);
  });
});
