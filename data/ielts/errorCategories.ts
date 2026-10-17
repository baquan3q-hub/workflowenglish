/**
 * Fixed error labels the Writing grader attaches to each sentence correction.
 * The same ids are listed in the ai-proxy op (WRITING_ERROR_CATEGORIES), and a
 * test keeps the two lists equal.
 */

export type WritingErrorCategory =
  | 'article'
  | 'tense'
  | 'agreement'
  | 'word_form'
  | 'collocation'
  | 'preposition'
  | 'punctuation'
  | 'run_on'
  | 'cohesion'
  | 'task_response';

export interface ErrorCategoryInfo {
  id: WritingErrorCategory;
  label: string;
  /** One line on what the mistake is, for Vietnamese learners. */
  hintVi: string;
  example: { wrong: string; right: string };
}

export const ERROR_CATEGORIES: ReadonlyArray<ErrorCategoryInfo> = [
  {
    id: 'article',
    label: 'Mạo từ',
    hintVi: 'Thiếu hoặc thừa a/an/the. Danh từ đếm được số ít luôn cần mạo từ; nói chung chung thì dùng số nhiều, không "the".',
    example: { wrong: 'Government should build hospital in every city.', right: 'The government should build a hospital in every city.' },
  },
  {
    id: 'tense',
    label: 'Thì động từ',
    hintVi: 'Sai thì, nhất là Task 1: số liệu quá khứ dùng quá khứ đơn, dự báo dùng "is expected to / will".',
    example: { wrong: 'The number of visitors increases sharply in 2010.', right: 'The number of visitors increased sharply in 2010.' },
  },
  {
    id: 'agreement',
    label: 'Hoà hợp chủ ngữ – động từ',
    hintVi: 'Động từ không khớp số ít / số nhiều với chủ ngữ thật, hay gặp khi chủ ngữ dài.',
    example: { wrong: 'The number of students have risen.', right: 'The number of students has risen.' },
  },
  {
    id: 'word_form',
    label: 'Từ loại',
    hintVi: 'Dùng sai dạng từ: danh từ thay cho tính từ, tính từ thay cho trạng từ…',
    example: { wrong: 'Technology has developed rapid.', right: 'Technology has developed rapidly.' },
  },
  {
    id: 'collocation',
    label: 'Kết hợp từ',
    hintVi: 'Ghép từ không tự nhiên trong tiếng Anh, thường do dịch từng chữ từ tiếng Việt.',
    example: { wrong: 'make a crime', right: 'commit a crime' },
  },
  {
    id: 'preposition',
    label: 'Giới từ',
    hintVi: 'Sai hoặc thiếu giới từ đi kèm động từ, tính từ, mốc thời gian.',
    example: { wrong: 'It depends of the government.', right: 'It depends on the government.' },
  },
  {
    id: 'punctuation',
    label: 'Dấu câu',
    hintVi: 'Thiếu dấu phẩy sau cụm mở đầu, dùng dấu phẩy nối hai mệnh đề độc lập.',
    example: { wrong: 'However this is not always true.', right: 'However, this is not always true.' },
  },
  {
    id: 'run_on',
    label: 'Câu sai cấu trúc',
    hintVi: 'Câu chạy dài không có liên từ, câu thiếu động từ chính, hoặc mệnh đề phụ đứng một mình.',
    example: { wrong: 'Because many people live in cities.', right: 'Traffic is heavy because many people live in cities.' },
  },
  {
    id: 'cohesion',
    label: 'Liên kết',
    hintVi: 'Từ nối sai nghĩa hoặc lặp lại máy móc, đại từ không rõ chỉ cái gì.',
    example: { wrong: 'Cars are convenient. Moreover, they cause pollution.', right: 'Cars are convenient. However, they cause pollution.' },
  },
  {
    id: 'task_response',
    label: 'Bám đề',
    hintVi: 'Câu lạc đề, ý kiến không rõ, Task 1 thiếu overview hoặc nêu ý kiến cá nhân.',
    example: { wrong: 'In my opinion, the chart is very interesting.', right: 'Overall, car use rose while bus use fell.' },
  },
];

const BY_ID = new Map(ERROR_CATEGORIES.map((c) => [c.id, c]));

export function errorCategory(id: string | undefined): ErrorCategoryInfo | undefined {
  return id ? BY_ID.get(id as WritingErrorCategory) : undefined;
}
