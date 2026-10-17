import { LISTENING_PRACTICE_TESTS } from './practice';
import { LISTENING_TEST_1 } from './test1';
import type { ListeningGroup, ListeningTest } from './types';

export * from './types';

export const LISTENING_FULL_TESTS: ListeningTest[] = [LISTENING_TEST_1];
export { LISTENING_PRACTICE_TESTS };
export const LISTENING_TESTS: ListeningTest[] = [...LISTENING_FULL_TESTS, ...LISTENING_PRACTICE_TESTS];

export const getListeningTest = (id: string): ListeningTest | undefined => LISTENING_TESTS.find((t) => t.id === id);

export const GROUP_TYPE_LABELS: Record<ListeningGroup['type'], string> = {
  completion: 'Điền từ',
  short_answer: 'Trả lời ngắn',
  mcq: 'Trắc nghiệm',
  mcq_multi: 'Chọn 2 đáp án',
  matching: 'Nối thông tin',
  map: 'Bản đồ',
};

export const PART_DESCRIPTIONS_VI: Record<number, string> = {
  1: 'Hội thoại đời sống',
  2: 'Độc thoại đời sống',
  3: 'Thảo luận học thuật',
  4: 'Bài giảng',
};
