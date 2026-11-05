/**
 * "Săn lỗi" starter mistakes: errors Vietnamese learners make often in IELTS
 * Writing, for learners who have not made three of their own yet. Each has a
 * sentence with exactly one mistake (`original`, found word for word in the
 * sentence), its fix, and why, in Vietnamese.
 */
import type { TranslationErrorCategory } from '../../services/writingTranslateLogic';

export interface StarterError {
  id: string;
  sentence: string;
  original: string;
  corrected: string;
  category: TranslationErrorCategory;
  explanationVi: string;
}

export const STARTER_ERRORS: readonly StarterError[] = [
  {
    id: 'st-1',
    sentence: 'Nowadays, more and more people use internet to study online.',
    original: 'use internet',
    corrected: 'use the internet',
    category: 'article',
    explanationVi: '"the internet" luôn đi với "the", vì chỉ có một mạng internet chung.',
  },
  {
    id: 'st-2',
    sentence: 'Many student think that university education should be free.',
    original: 'Many student',
    corrected: 'Many students',
    category: 'plural_agreement',
    explanationVi: 'Sau "many" là danh từ số nhiều: "many students".',
  },
  {
    id: 'st-3',
    sentence: 'The government should invest more money on public transport.',
    original: 'invest more money on',
    corrected: 'invest more money in',
    category: 'preposition',
    explanationVi: 'Cụm cố định là "invest in something", không dùng "on".',
  },
  {
    id: 'st-4',
    sentence: 'In recent years, the number of tourists increase significantly.',
    original: 'increase significantly',
    corrected: 'has increased significantly',
    category: 'tense',
    explanationVi: '"In recent years" nói về thay đổi kéo dài tới nay: dùng hiện tại hoàn thành "has increased".',
  },
  {
    id: 'st-5',
    sentence: 'Children who play video games too much can become addicted and lazy to study.',
    original: 'lazy to study',
    corrected: 'unwilling to study',
    category: 'collocation',
    explanationVi: '"lười học" không dịch là "lazy to study"; dùng "unwilling to study" hoặc "lose interest in studying".',
  },
  {
    id: 'st-6',
    sentence: 'This policy has a lot of benefits for the develop of the country.',
    original: 'the develop',
    corrected: 'the development',
    category: 'word_form',
    explanationVi: 'Sau "the" cần danh từ: "development", không phải động từ "develop".',
  },
  {
    id: 'st-7',
    sentence: 'Although public transport is cheap, but many people still prefer cars.',
    original: 'but many people',
    corrected: 'many people',
    category: 'sentence_structure',
    explanationVi: 'Tiếng Việt nói "Mặc dù… nhưng…", tiếng Anh chỉ dùng một trong hai: "Although…, many people…".',
  },
  {
    id: 'st-8',
    sentence: 'People living in cities have to face with many problems such as pollution.',
    original: 'face with',
    corrected: 'face',
    category: 'preposition',
    explanationVi: '"face" là ngoại động từ: "face many problems" (hoặc "be faced with"), không có "with".',
  },
  {
    id: 'st-9',
    sentence: 'Working from home helps employees save time and they can spend it for their family.',
    original: 'spend it for',
    corrected: 'spend it on',
    category: 'preposition',
    explanationVi: 'Cụm đúng là "spend time on something / with someone".',
  },
  {
    id: 'st-10',
    sentence: 'The information about climate change are often difficult to understand.',
    original: 'are often',
    corrected: 'is often',
    category: 'plural_agreement',
    explanationVi: '"information" là danh từ không đếm được, đi với động từ số ít "is".',
  },
  {
    id: 'st-11',
    sentence: 'In my opinion, I think that the advantages outweigh the disadvantages.',
    original: 'In my opinion, I think that',
    corrected: 'In my opinion,',
    category: 'register',
    explanationVi: '"In my opinion" và "I think" cùng nghĩa: dùng cả hai là lặp ý. Giữ một cách thôi.',
  },
  {
    id: 'st-12',
    sentence: 'Young people nowadays are very interesting in social media.',
    original: 'interesting in',
    corrected: 'interested in',
    category: 'word_form',
    explanationVi: 'Người cảm thấy hứng thú là "interested"; "interesting" là thứ gây hứng thú.',
  },
  {
    id: 'st-13',
    sentence: 'If the government will reduce taxes, people will spend more.',
    original: 'will reduce',
    corrected: 'reduces',
    category: 'tense',
    explanationVi: 'Câu điều kiện loại 1: mệnh đề "if" dùng hiện tại đơn, không dùng "will".',
  },
  {
    id: 'st-14',
    sentence: 'Living in the countryside makes people feel more relax.',
    original: 'more relax',
    corrected: 'more relaxed',
    category: 'word_form',
    explanationVi: 'Sau "feel" cần tính từ: "relaxed". "relax" là động từ.',
  },
  {
    id: 'st-15',
    sentence: 'There are many reasons explain why people move to big cities.',
    original: 'many reasons explain',
    corrected: 'many reasons that explain',
    category: 'sentence_structure',
    explanationVi: 'Câu đã có "There are" làm động từ chính; "explain" cần "that" để thành mệnh đề quan hệ.',
  },
  {
    id: 'st-16',
    sentence: 'Students can gain a lot of knowledges from reading books.',
    original: 'knowledges',
    corrected: 'knowledge',
    category: 'plural_agreement',
    explanationVi: '"knowledge" không đếm được, không thêm "s".',
  },
];
