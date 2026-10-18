/**
 * Short Vietnamese → English sentences for the error log, each built so the
 * literal translation falls into one error label. Graded with gradeSentence
 * (local match on a reference first). Punctuation and task_response have no
 * drills: they are practised by rewriting the learner's own sentences.
 */

import type { SentenceItem } from '../../types';
import type { WritingErrorCategory } from './errorCategories';

export type DrillCategory = Exclude<WritingErrorCategory, 'punctuation' | 'task_response'>;

const drill = (id: string, promptVi: string, targetWords: string[], references: string[]): SentenceItem => ({
  id: `drill_${id}`,
  promptVi,
  targetWords,
  references,
});

export const ERROR_DRILLS: Record<DrillCategory, readonly SentenceItem[]> = {
  article: [
    drill('article_1', 'Chính phủ nên xây một bệnh viện ở mỗi thành phố.', ['hospital'], [
      'The government should build a hospital in every city.',
      'The government should build a hospital in each city.',
    ]),
    drill('article_2', 'Internet đã thay đổi cách chúng ta làm việc.', ['internet'], [
      'The internet has changed the way we work.',
      'The internet has changed how we work.',
    ]),
    drill('article_3', 'Trẻ em cần được giáo dục tốt.', ['education'], [
      'Children need a good education.',
      'Children need good education.',
    ]),
    drill('article_4', 'Số lượng du khách tăng gấp đôi trong giai đoạn này.', ['double'], [
      'The number of tourists doubled over the period.',
      'The number of visitors doubled over the period.',
      'The number of tourists doubled during this period.',
    ]),
  ],
  tense: [
    drill('tense_1', 'Năm 2010, doanh số tăng mạnh.', ['increase'], [
      'In 2010, sales increased sharply.',
      'Sales increased sharply in 2010.',
    ]),
    drill('tense_2', 'Kể từ năm 2000, giá nhà đã tăng gấp ba.', ['triple'], [
      'Since 2000, house prices have tripled.',
      'House prices have tripled since 2000.',
    ]),
    drill('tense_3', 'Đến năm 2030, dân số dự kiến sẽ đạt 10 triệu người.', ['expect'], [
      'By 2030, the population is expected to reach 10 million.',
      'The population is expected to reach 10 million by 2030.',
    ]),
    drill('tense_4', 'Hồi nhỏ tôi sống với ông bà.', ['grandparents'], [
      'When I was a child, I lived with my grandparents.',
      'I lived with my grandparents when I was a child.',
      'When I was young, I lived with my grandparents.',
    ]),
  ],
  agreement: [
    drill('agreement_1', 'Số lượng sinh viên đã tăng lên.', ['number'], [
      'The number of students has increased.',
      'The number of students has risen.',
    ]),
    drill('agreement_2', 'Mỗi học sinh có một máy tính riêng.', ['each'], [
      'Each student has their own computer.',
      'Each student has his or her own computer.',
    ]),
    drill('agreement_3', 'Nhiều người trong số bạn bè của tôi thích đi du lịch.', ['many'], [
      'Many of my friends like travelling.',
      'Many of my friends like to travel.',
      'Many of my friends like traveling.',
    ]),
    drill('agreement_4', 'Thông tin trên mạng không phải lúc nào cũng đáng tin.', ['information'], [
      'Information on the internet is not always reliable.',
      'Online information is not always reliable.',
      'Information online is not always reliable.',
    ]),
  ],
  word_form: [
    drill('word_form_1', 'Công nghệ phát triển nhanh chóng.', ['rapidly'], [
      'Technology has developed rapidly.',
      'Technology is developing rapidly.',
      'Technology develops rapidly.',
    ]),
    drill('word_form_2', 'Ô nhiễm không khí có hại cho sức khoẻ.', ['harmful'], [
      'Air pollution is harmful to health.',
      'Air pollution is harmful to our health.',
    ]),
    drill('word_form_3', 'Việc học ngoại ngữ rất quan trọng.', ['important'], [
      'Learning a foreign language is very important.',
      'Learning foreign languages is very important.',
    ]),
    drill('word_form_4', 'Sự phát triển kinh tế mang lại nhiều lợi ích.', ['economic'], [
      'Economic development brings many benefits.',
      'Economic growth brings many benefits.',
    ]),
  ],
  collocation: [
    drill('collocation_1', 'Những người phạm tội nên bị phạt nặng.', ['commit'], [
      'People who commit crimes should be punished severely.',
      'People who commit crimes should be severely punished.',
    ]),
    drill('collocation_2', 'Chúng ta nên giải quyết vấn đề này ngay.', ['tackle'], [
      'We should tackle this problem immediately.',
      'We should tackle this problem now.',
      'We should tackle this issue immediately.',
    ]),
    drill('collocation_3', 'Tập thể dục giúp tôi giảm căng thẳng.', ['reduce'], [
      'Exercise helps me reduce stress.',
      'Exercising helps me reduce stress.',
      'Doing exercise helps me reduce stress.',
    ]),
    drill('collocation_4', 'Tôi luôn cố gắng đưa ra quyết định đúng.', ['decision'], [
      'I always try to make the right decision.',
      'I always try to make the right decisions.',
    ]),
  ],
  preposition: [
    drill('preposition_1', 'Điều đó phụ thuộc vào chính phủ.', ['depend'], [
      'It depends on the government.',
      'That depends on the government.',
    ]),
    drill('preposition_2', 'Tôi rất hứng thú với nhiếp ảnh.', ['interested'], [
      'I am very interested in photography.',
      "I'm very interested in photography.",
    ]),
    drill('preposition_3', 'Giá dầu giảm 20% trong năm 2015.', ['fall'], [
      'Oil prices fell by 20% in 2015.',
      'The price of oil fell by 20% in 2015.',
    ]),
    drill('preposition_4', 'Thanh thiếu niên dành quá nhiều thời gian cho mạng xã hội.', ['spend'], [
      'Teenagers spend too much time on social media.',
      'Young people spend too much time on social media.',
    ]),
  ],
  run_on: [
    drill('run_on_1', 'Giao thông đông đúc vì nhiều người sống ở thành phố.', ['because'], [
      'Traffic is heavy because many people live in cities.',
      'Traffic is heavy because many people live in the city.',
    ]),
    drill('run_on_2', 'Tôi thích đọc sách, nhưng tôi không có nhiều thời gian.', ['but'], [
      "I like reading, but I don't have much time.",
      'I like reading books, but I do not have much time.',
      "I like reading books, but I don't have much time.",
    ]),
    drill('run_on_3', 'Mặc dù làm việc tại nhà tiện lợi, nó có thể gây cô đơn.', ['although'], [
      'Although working from home is convenient, it can be lonely.',
      'Although working from home is convenient, it can make people lonely.',
    ]),
    drill('run_on_4', 'Nhiều sinh viên đi làm thêm, điều này giúp họ có kinh nghiệm.', ['which'], [
      'Many students work part-time, which helps them gain experience.',
      'Many students have part-time jobs, which helps them gain experience.',
    ]),
  ],
  cohesion: [
    drill('cohesion_1', 'Ô tô tiện lợi. Tuy nhiên, chúng gây ô nhiễm.', ['however'], [
      'Cars are convenient. However, they cause pollution.',
      'Cars are convenient. However, they cause air pollution.',
    ]),
    drill('cohesion_2', 'Ví dụ, nhiều công ty cho phép nhân viên làm việc tại nhà.', ['example'], [
      'For example, many companies allow employees to work from home.',
      'For example, many companies let their staff work from home.',
    ]),
    drill('cohesion_3', 'Do đó, chính phủ nên đầu tư vào giao thông công cộng.', ['therefore'], [
      'Therefore, the government should invest in public transport.',
      'Therefore, governments should invest in public transport.',
    ]),
    drill('cohesion_4', 'Ngược lại, số học sinh ở nông thôn giảm.', ['contrast'], [
      'In contrast, the number of students in rural areas fell.',
      'In contrast, the number of students in rural areas decreased.',
    ]),
  ],
};

export function drillsFor(category: string): readonly SentenceItem[] {
  return ERROR_DRILLS[category as DrillCategory] ?? [];
}
