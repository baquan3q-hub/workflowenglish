/**
 * Academic vocabulary for Reading, grouped by the sublists of the Academic
 * Word List (Coxhead, 2000): sublist 1 holds the most frequent word families.
 * Only headwords come from the list; meanings and examples are written for
 * the app. Each lesson's words can go straight into SRS review.
 */

import type { LessonQuiz, LessonWord, LibraryLesson } from './library';

interface Sublist {
  n: number;
  theme: string;
  words: LessonWord[];
  quiz: LessonQuiz[];
}

const SUBLISTS: Sublist[] = [
  {
    n: 1,
    theme: 'nghiên cứu và lập luận',
    words: [
      { word: 'analyse', meaningVi: 'phân tích', example: 'The team analysed water samples from twelve rivers.' },
      { word: 'approach', meaningVi: 'cách tiếp cận', example: 'A new approach to teaching reading was tested in five schools.' },
      { word: 'assess', meaningVi: 'đánh giá', example: 'Doctors assessed the patients before and after treatment.' },
      { word: 'assume', meaningVi: 'cho rằng, giả định', example: 'Early scientists assumed that the Earth was only a few thousand years old.' },
      { word: 'concept', meaningVi: 'khái niệm', example: 'The concept of zero reached Europe much later than India.' },
      { word: 'consist', meaningVi: 'gồm có (consist of)', example: 'The diet consisted mainly of rice and fish.' },
      { word: 'derive', meaningVi: 'bắt nguồn từ (derive from)', example: 'Many English words are derived from Latin.' },
      { word: 'establish', meaningVi: 'thành lập; xác lập', example: 'The museum was established in 1902.' },
      { word: 'estimate', meaningVi: 'ước tính', example: 'It is estimated that the forest loses 2% of its area each year.' },
      { word: 'evident', meaningVi: 'rõ ràng', example: 'The benefits of the scheme were evident within months.' },
      { word: 'indicate', meaningVi: 'cho thấy', example: 'The results indicate a link between sleep and memory.' },
      { word: 'significant', meaningVi: 'đáng kể, quan trọng', example: 'There was a significant fall in crime after the change.' },
    ],
    quiz: [
      {
        passage: 'The figures suggest a clear connection between diet and health.',
        question: 'Từ AWL nào thay được "suggest" trong câu này?',
        options: ['indicate', 'assume', 'establish'],
        answer: 0,
        explanationVi: '"The figures indicate a connection" giữ nguyên nghĩa. Assume là tự cho rằng, establish là thành lập hoặc chứng minh chắc chắn.',
      },
    ],
  },
  {
    n: 2,
    theme: 'kết quả và tác động',
    words: [
      { word: 'achieve', meaningVi: 'đạt được', example: 'Only a third of the students achieved the target score.' },
      { word: 'acquire', meaningVi: 'tiếp thu, có được', example: 'Children acquire language by listening long before they speak.' },
      { word: 'affect', meaningVi: 'ảnh hưởng tới', example: 'Noise can affect the way birds communicate.' },
      { word: 'aspect', meaningVi: 'khía cạnh', example: 'Cost is only one aspect of the problem.' },
      { word: 'conclude', meaningVi: 'kết luận', example: 'The authors concluded that more data was needed.' },
      { word: 'consequent', meaningVi: 'là hệ quả (consequently: do đó)', example: 'Prices rose and, consequently, demand fell.' },
      { word: 'distinct', meaningVi: 'khác biệt rõ', example: 'The two species have distinct songs.' },
      { word: 'evaluate', meaningVi: 'đánh giá', example: 'The programme was evaluated after its first year.' },
      { word: 'impact', meaningVi: 'tác động', example: 'Tourism has had a major impact on the island.' },
      { word: 'perceive', meaningVi: 'nhận thức, cảm nhận', example: 'Colour is perceived differently in low light.' },
      { word: 'potential', meaningVi: 'tiềm năng', example: 'Seaweed has potential as a source of fuel.' },
      { word: 'previous', meaningVi: 'trước đó', example: 'Previous studies had ignored this group.' },
    ],
    quiz: [
      {
        passage: 'Because of the new law, factories reduced their waste.',
        question: 'Câu nào diễn đạt lại đúng, dùng từ AWL?',
        options: [
          'The law had an impact on how much waste factories produced.',
          'Factories perceived the law as distinct.',
          'The law was a previous aspect of waste.',
        ],
        answer: 0,
        explanationVi: '"Because of … reduced" là quan hệ nhân quả, được nói lại bằng "had an impact on". Hai câu còn lại không giữ nghĩa.',
      },
    ],
  },
  {
    n: 3,
    theme: 'chứng minh và giới hạn',
    words: [
      { word: 'alternative', meaningVi: 'lựa chọn thay thế', example: 'Solar power offers an alternative to coal.' },
      { word: 'component', meaningVi: 'thành phần', example: 'Each component of the engine was tested separately.' },
      { word: 'considerable', meaningVi: 'đáng kể', example: 'The project needed a considerable amount of money.' },
      { word: 'constrain', meaningVi: 'hạn chế, kìm hãm', example: 'Growth was constrained by a lack of water.' },
      { word: 'contribute', meaningVi: 'góp phần (contribute to)', example: 'Several factors contributed to the decline.' },
      { word: 'demonstrate', meaningVi: 'chứng minh, cho thấy', example: 'The experiment demonstrated that plants respond to sound.' },
      { word: 'emphasis', meaningVi: 'sự nhấn mạnh', example: 'The new course places more emphasis on speaking.' },
      { word: 'imply', meaningVi: 'ngụ ý', example: 'The writer implies that the policy failed.' },
      { word: 'initial', meaningVi: 'ban đầu (initially)', example: 'Initially, the idea was rejected by most experts.' },
      { word: 'rely', meaningVi: 'dựa vào (rely on)', example: 'The town relies on fishing for most of its income.' },
      { word: 'sufficient', meaningVi: 'đủ', example: 'There was not sufficient evidence to support the claim.' },
      { word: 'valid', meaningVi: 'có giá trị, hợp lệ', example: 'The sample was too small for the results to be valid.' },
    ],
    quiz: [
      {
        passage: 'At first, the public did not trust the vaccine.',
        question: 'Từ AWL nào thay được "At first"?',
        options: ['Initially', 'Consequently', 'Sufficiently'],
        answer: 0,
        explanationVi: '"At first" = "Initially". Đây là cặp paraphrase rất hay gặp trong câu TFNG về mốc thời gian.',
      },
      {
        passage: 'The writer never says directly that the plan failed, but…',
        question: 'Động từ nào mô tả việc "nói gián tiếp"?',
        options: ['demonstrate', 'imply', 'rely'],
        answer: 1,
        explanationVi: 'Imply là ngụ ý, không nói thẳng. Câu hỏi YES/NO/NOT GIVEN hay xét điều tác giả ngụ ý.',
      },
    ],
  },
  {
    n: 4,
    theme: 'giả thuyết và quá trình',
    words: [
      { word: 'adequate', meaningVi: 'đủ, thoả đáng', example: 'Many homes lacked adequate heating.' },
      { word: 'apparent', meaningVi: 'rõ ràng (apparently: dường như)', example: 'The cause of the fire is still not apparent.' },
      { word: 'approximate', meaningVi: 'xấp xỉ (approximately)', example: 'The wall is approximately 2,000 years old.' },
      { word: 'attribute', meaningVi: 'cho là do (attribute to)', example: 'The rise in sales was attributed to the warm weather.' },
      { word: 'concentrate', meaningVi: 'tập trung', example: 'Most of the population is concentrated along the coast.' },
      { word: 'emerge', meaningVi: 'xuất hiện, nổi lên', example: 'A new pattern emerged when the data was mapped.' },
      { word: 'hypothesis', meaningVi: 'giả thuyết', example: 'The hypothesis was tested on two groups of mice.' },
      { word: 'implement', meaningVi: 'thực hiện, triển khai', example: 'The plan was never fully implemented.' },
      { word: 'investigate', meaningVi: 'điều tra, nghiên cứu', example: 'Researchers investigated why some bees stayed healthy.' },
      { word: 'mechanism', meaningVi: 'cơ chế', example: 'The mechanism behind the effect is still unclear.' },
      { word: 'predict', meaningVi: 'dự đoán', example: 'Few economists predicted the crisis.' },
      { word: 'subsequent', meaningVi: 'sau đó (subsequently)', example: 'The bridge was damaged and subsequently closed.' },
    ],
    quiz: [
      {
        passage: 'Scientists believe the drop in fish numbers was caused by warmer water.',
        question: 'Câu nào cùng nghĩa?',
        options: [
          'Scientists attribute the drop in fish numbers to warmer water.',
          'Scientists predicted warmer water before the drop.',
          'Warmer water emerged after the fish disappeared.',
        ],
        answer: 0,
        explanationVi: '"X was caused by Y" = "attribute X to Y". Lưu ý thứ tự: kết quả đứng sau attribute, nguyên nhân sau "to".',
      },
    ],
  },
  {
    n: 5,
    theme: 'thay đổi và phát triển',
    words: [
      { word: 'adjust', meaningVi: 'điều chỉnh', example: 'The eye takes time to adjust to darkness.' },
      { word: 'alter', meaningVi: 'thay đổi', example: 'The river altered its course after the flood.' },
      { word: 'challenge', meaningVi: 'thách thức; phản bác', example: 'Her findings challenged the accepted view.' },
      { word: 'conflict', meaningVi: 'mâu thuẫn, xung đột', example: 'The two reports give conflicting figures.' },
      { word: 'decline', meaningVi: 'suy giảm', example: 'The number of farms declined sharply after 1950.' },
      { word: 'enable', meaningVi: 'giúp cho có thể', example: 'Satellites enable scientists to track storms.' },
      { word: 'evolve', meaningVi: 'tiến hoá, phát triển dần', example: 'The city evolved from a small fishing village.' },
      { word: 'expand', meaningVi: 'mở rộng', example: 'The company expanded into Asian markets.' },
      { word: 'facilitate', meaningVi: 'tạo điều kiện thuận lợi', example: 'Good lighting facilitates reading.' },
      { word: 'fundamental', meaningVi: 'cơ bản, nền tảng', example: 'Water is fundamental to all life.' },
      { word: 'generate', meaningVi: 'tạo ra', example: 'The dam generates power for the whole region.' },
      { word: 'sustain', meaningVi: 'duy trì', example: 'The soil could not sustain crops for long.' },
    ],
    quiz: [
      {
        passage: 'New research questions the idea that dinosaurs were cold-blooded.',
        question: 'Từ AWL nào thay được "questions" trong câu này?',
        options: ['challenges', 'enables', 'sustains'],
        answer: 0,
        explanationVi: '"challenge an idea" là nghi ngờ hoặc phản bác nó. Gặp động từ này trong TFNG thì để ý: bài đang nói ý đó có thể sai.',
      },
    ],
  },
];

export const AWL_LESSON_PREFIX = 'rd_awl_';

export const AWL_LESSONS: LibraryLesson[] = SUBLISTS.map((s) => ({
  id: `${AWL_LESSON_PREFIX}${s.n}`,
  skill: 'reading',
  title: `Từ vựng học thuật · Sublist ${s.n}`,
  summary: `${s.words.length} từ AWL về ${s.theme}, kèm câu ví dụ và bài tập paraphrase.`,
  minutes: 5,
  tags: ['awl', 'academic word list', 'từ vựng', 'vocabulary', 'paraphrase', `sublist ${s.n}`],
  sections: [
    {
      text: [
        `Academic Word List gồm 570 họ từ hay gặp trong văn bản học thuật, chia 10 sublist theo độ phổ biến. Sublist ${s.n}${s.n === 1 ? ' gặp nhiều nhất' : ''}. Học cả họ từ: biết "analyse" thì nhận ra "analysis", "analytical".`,
      ],
    },
    { heading: 'Danh sách từ', words: s.words },
    { heading: 'Thử làm', quiz: s.quiz },
  ],
}));
