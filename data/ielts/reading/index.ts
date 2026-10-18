import { READING_PRACTICE_MUSEUMS, READING_PRACTICE_SEEDS, READING_PRACTICE_WINDCATCHERS } from './practice';
import { READING_PRACTICE_FUNGI, READING_PRACTICE_HEAT, READING_PRACTICE_LANGUAGE, READING_PRACTICE_LIGHT, READING_PRACTICE_ROBOTS, READING_PRACTICE_WAYFINDING } from './practice2';
import { READING_TEST_1 } from './test1';
import { READING_TEST_2 } from './test2';
import type { ReadingDifficulty, ReadingTest } from './types';

export * from './types';

export const READING_FULL_TESTS: ReadingTest[] = [READING_TEST_1, READING_TEST_2];
export const READING_PRACTICE_TESTS: ReadingTest[] = [
  READING_PRACTICE_SEEDS,
  READING_PRACTICE_WINDCATCHERS,
  READING_PRACTICE_MUSEUMS,
  READING_PRACTICE_LIGHT,
  READING_PRACTICE_WAYFINDING,
  READING_PRACTICE_FUNGI,
  READING_PRACTICE_HEAT,
  READING_PRACTICE_LANGUAGE,
  READING_PRACTICE_ROBOTS,
];
export const READING_TESTS: ReadingTest[] = [...READING_FULL_TESTS, ...READING_PRACTICE_TESTS];

export const getReadingTest = (id: string): ReadingTest | undefined => READING_TESTS.find((t) => t.id === id);

export const DIFFICULTY_LABELS: Record<ReadingDifficulty, string> = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
};

/** The exam's 60 minutes, with no extra time to copy answers. */
export const READING_EXAM_MINUTES = 60;
