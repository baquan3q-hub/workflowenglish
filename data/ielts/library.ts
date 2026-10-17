/**
 * Thư viện IELTS: short lessons to read before and after practice. Written
 * for this app (no textbook content is copied). Frameworks and band
 * descriptors already in the app are turned into lessons here so there is
 * one place to look things up.
 */

import type { IeltsFramework, IeltsSkill } from '../../types';
import { ieltsFrameworks } from '../ieltsFrameworks';
import { foldText } from '../../services/vocabLibraryLogic';
import { CRITERION_DESCRIPTORS, DESCRIPTOR_BANDS, type DescriptorSkill } from './bandDescriptors';

export type LibrarySkill = 'general' | IeltsSkill;

export interface LibrarySection {
  heading?: string;
  text?: string[];
  bullets?: string[];
  /** Shown as a pre-formatted example block. */
  example?: string;
}

export interface LibraryLesson {
  id: string;
  skill: LibrarySkill;
  title: string;
  summary: string;
  minutes: number;
  tags: string[];
  sections: LibrarySection[];
}

export const LIBRARY_SKILL_LABELS: Record<LibrarySkill, string> = {
  general: 'Tổng quan',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

const WRITTEN_LESSONS: LibraryLesson[] = [
  {
    id: 'gen_exam_structure',
    skill: 'general',
    title: 'Cấu trúc bài thi IELTS Academic',
    summary: 'Bốn kỹ năng, thời gian, số câu và điều cần biết trước ngày thi.',
    minutes: 4,
    tags: ['format', 'đề thi', 'academic', 'thời gian'],
    sections: [
      {
        text: [
          'IELTS Academic gồm 4 phần. Listening, Reading và Writing thi liền nhau trong cùng một buổi; Speaking có thể cùng ngày hoặc cách vài ngày.',
        ],
      },
      {
        heading: 'Từng kỹ năng',
        bullets: [
          'Listening: 4 part, 40 câu, khoảng 30 phút. Mỗi đoạn chỉ nghe một lần. Thi giấy có thêm 10 phút chép đáp án, thi máy có 2 phút soát lại.',
          'Reading: 3 bài đọc dài, 40 câu, 60 phút, không có thời gian chép đáp án riêng.',
          'Writing: 60 phút cho 2 task. Task 1 tối thiểu 150 từ (khoảng 20 phút), Task 2 tối thiểu 250 từ (khoảng 40 phút). Task 2 chiếm trọng số gấp đôi Task 1.',
          'Speaking: 11–14 phút nói chuyện trực tiếp với giám khảo, gồm Part 1 (hỏi đáp quen thuộc), Part 2 (nói 1–2 phút theo cue card, có 1 phút chuẩn bị) và Part 3 (thảo luận mở rộng).',
        ],
      },
      {
        heading: 'Điều nên biết',
        bullets: [
          'Không trừ điểm khi sai, nên đừng bỏ trống câu nào ở Listening và Reading.',
          'Viết thiếu số từ tối thiểu ở Writing sẽ bị trừ điểm tiêu chí Task.',
          'Ở Speaking, giám khảo chấm cách bạn nói, không chấm ý kiến của bạn đúng hay sai.',
        ],
      },
    ],
  },
  {
    id: 'gen_band_score',
    skill: 'general',
    title: 'Cách tính band tổng',
    summary: 'Band tổng là trung bình 4 kỹ năng, làm tròn theo quy tắc .25 và .75.',
    minutes: 3,
    tags: ['band', 'điểm', 'overall', 'làm tròn'],
    sections: [
      {
        text: [
          'Mỗi kỹ năng có band từ 0 đến 9, bước 0.5. Band tổng (Overall) là trung bình cộng của 4 kỹ năng, sau đó làm tròn:',
        ],
        bullets: [
          'Phần lẻ dưới .25 thì làm tròn xuống số nguyên (6.125 → 6.0).',
          'Phần lẻ từ .25 đến dưới .75 thì thành .5 (6.25 → 6.5; 6.625 → 6.5).',
          'Phần lẻ từ .75 trở lên thì làm tròn lên số nguyên kế tiếp (6.75 → 7.0).',
        ],
      },
      {
        heading: 'Ví dụ',
        example: 'Listening 6.5 + Reading 6.0 + Writing 5.5 + Speaking 6.0 = 24.0\n24.0 / 4 = 6.0  →  Overall 6.0\n\nListening 7.0 + Reading 6.5 + Writing 6.0 + Speaking 6.0 = 25.5\n25.5 / 4 = 6.375  →  Overall 6.5',
      },
      {
        heading: 'Listening và Reading',
        text: [
          'Hai kỹ năng này quy đổi từ số câu đúng trên 40 sang band. Writing và Speaking là trung bình 4 tiêu chí do giám khảo chấm. Điểm trong app là điểm ước lượng để luyện tập, không phải điểm chính thức.',
        ],
      },
    ],
  },
  {
    id: 'gen_how_to_study',
    skill: 'general',
    title: 'Học IELTS hiệu quả với app',
    summary: 'Vòng học 5 bước: học, luyện, xem phản hồi, sửa lỗi, theo dõi tiến bộ.',
    minutes: 3,
    tags: ['lộ trình', 'phương pháp', 'kế hoạch'],
    sections: [
      {
        bullets: [
          'Học: đọc bài trong Thư viện về dạng đề bạn sắp luyện (cấu trúc, framework, tiêu chí chấm).',
          'Luyện: làm một đề, có tính giờ như thi thật.',
          'Phản hồi: đọc điểm từng tiêu chí và dòng "Để lên band tiếp theo".',
          'Sửa lỗi: viết lại hoặc nói lại chính đề đó, tập trung vào 1–2 lỗi lớn nhất. Lần làm lại thường tiến bộ nhiều hơn làm đề mới.',
          'Theo dõi: xem band qua các lần làm trên trang IELTS để biết tiêu chí nào cần ưu tiên.',
        ],
      },
      {
        heading: 'Gợi ý một tuần',
        bullets: [
          '2 bài Writing (1 Task 1, 1 Task 2), mỗi bài viết lại một lần.',
          '3 buổi Speaking ngắn (một part mỗi buổi) và 1 buổi thi thử cả 3 part.',
          'Ôn từ vựng IELTS hằng ngày trong mục Ôn tập.',
        ],
      },
    ],
  },
  {
    id: 'lis_overview',
    skill: 'listening',
    title: 'Tổng quan bài thi Listening',
    summary: '4 part, các dạng câu hỏi và bảng quy đổi số câu đúng sang band.',
    minutes: 5,
    tags: ['format', 'part', 'dạng câu hỏi', 'band', 'quy đổi'],
    sections: [
      {
        heading: 'Bốn part',
        bullets: [
          'Part 1: hội thoại 2 người về tình huống đời sống (đặt chỗ, đăng ký, hỏi thông tin). Hay gặp điền form, ghi chú.',
          'Part 2: một người nói về chủ đề đời sống (giới thiệu địa điểm, sự kiện). Hay gặp trắc nghiệm, bản đồ.',
          'Part 3: 2–4 người thảo luận chủ đề học tập (bài tập nhóm, dự án). Hay gặp trắc nghiệm, nối thông tin.',
          'Part 4: bài giảng học thuật một người nói. Hay gặp điền ghi chú, khó nhất vì không có quãng nghỉ giữa bài.',
        ],
      },
      {
        heading: 'Dạng câu hỏi',
        bullets: [
          'Điền vào chỗ trống: form, note, table, flow-chart, summary, sentence completion.',
          'Trắc nghiệm: chọn 1 đáp án, hoặc chọn 2–3 đáp án trong danh sách.',
          'Nối thông tin (matching) và gắn nhãn bản đồ, sơ đồ (map / plan / diagram labelling).',
          'Trả lời ngắn (short answer).',
        ],
      },
      {
        heading: 'Quy tắc dễ mất điểm',
        bullets: [
          'Đọc kỹ giới hạn từ: "NO MORE THAN TWO WORDS AND/OR A NUMBER" mà viết 3 từ là sai cả câu.',
          'Sai chính tả là sai. Danh từ số nhiều thiếu -s cũng là sai.',
          'Mỗi đoạn chỉ nghe một lần, nên đọc trước câu hỏi và gạch từ khoá trong thời gian chờ.',
        ],
      },
      {
        heading: 'Quy đổi điểm (tham khảo)',
        text: ['Số câu đúng trên 40 → band. Mỗi đề có thể chênh khoảng một câu.'],
        bullets: [
          '39–40 → 9.0',
          '37–38 → 8.5',
          '35–36 → 8.0',
          '32–34 → 7.5',
          '30–31 → 7.0',
          '26–29 → 6.5',
          '23–25 → 6.0',
          '18–22 → 5.5',
          '16–17 → 5.0',
          '13–15 → 4.5',
          '10–12 → 4.0',
        ],
      },
    ],
  },
  {
    id: 'lis_traps',
    skill: 'listening',
    title: 'Các bẫy thường gặp trong Listening',
    summary: 'Người nói đổi ý, liệt kê rồi loại trừ, paraphrase và lỗi chính tả.',
    minutes: 4,
    tags: ['bẫy', 'distractor', 'paraphrase', 'chính tả'],
    sections: [
      {
        heading: 'Người nói đổi ý',
        text: ['Đáp án đầu tiên bạn nghe chưa chắc là đáp án cuối. Chú ý các từ báo hiệu thay đổi: actually, sorry, I mean, no wait, in fact, however.'],
        example: '"The meeting is on Tuesday… oh, actually, they moved it to Thursday."\nĐáp án: Thursday',
      },
      {
        heading: 'Liệt kê rồi loại trừ',
        text: ['Ở câu trắc nghiệm, người nói thường nhắc cả 3 phương án, nhưng loại bỏ hai trong số đó. Hãy nghe lý do họ từ chối từng phương án.'],
      },
      {
        heading: 'Paraphrase',
        text: ['Câu hỏi hiếm khi dùng đúng từ trong bài nghe. Khi đọc trước câu hỏi, hãy đoán cách nói khác của từ khoá.'],
        example: 'Đề: "inexpensive"  ↔  Audio: "it won\'t cost you much"\nĐề: "the most popular"  ↔  Audio: "the one most people go for"',
      },
      {
        heading: 'Đánh vần và con số',
        bullets: [
          'Tên riêng thường được đánh vần từng chữ: phân biệt A/E/I, G/J, B/V.',
          'Số điện thoại: "double five" là 55; "oh" là 0.',
          '13 (thirteen) và 30 (thirty) khác nhau ở trọng âm: thir-TEEN và THIR-ty.',
          'Ngày tháng chấp nhận nhiều cách viết (12 March, March 12), nhưng phải đúng chính tả tên tháng.',
        ],
      },
    ],
  },
  {
    id: 'wr_task1_overview',
    skill: 'writing',
    title: 'Viết overview cho Task 1',
    summary: 'Câu quan trọng nhất của Task 1: nêu xu hướng chính, không có số liệu.',
    minutes: 4,
    tags: ['task 1', 'overview', 'biểu đồ', 'xu hướng'],
    sections: [
      {
        text: [
          'Thiếu overview là lý do phổ biến nhất khiến Task 1 dừng ở band 5. Overview là 1–2 câu tóm tắt bức tranh chung: xu hướng lớn nhất và điểm khác biệt nổi bật nhất.',
        ],
      },
      {
        heading: 'Cách viết',
        bullets: [
          'Tìm 2 đặc điểm: xu hướng chung (tăng, giảm, ổn định) và hạng mục cao nhất hoặc thấp nhất.',
          'Không đưa số liệu cụ thể vào overview; số liệu để dành cho thân bài.',
          'Mở đầu bằng "Overall," hoặc "In general," để giám khảo thấy ngay.',
          'Đặt overview ngay sau câu mở bài.',
        ],
      },
      {
        heading: 'Ví dụ',
        example: 'Overall, the number of international tourists rose steadily over the period, while domestic visitor numbers remained relatively stable. Spain attracted the most visitors throughout.',
      },
    ],
  },
  {
    id: 'sp_test_overview',
    skill: 'speaking',
    title: 'Tổng quan bài thi Speaking',
    summary: 'Ba part, độ dài câu trả lời phù hợp và điều giám khảo chú ý.',
    minutes: 4,
    tags: ['format', 'part 1', 'part 2', 'part 3', 'cue card'],
    sections: [
      {
        heading: 'Ba part',
        bullets: [
          'Part 1 (4–5 phút): câu hỏi về bản thân, quê, công việc, sở thích. Trả lời 2–3 câu: ý chính, lý do, ví dụ.',
          'Part 2 (3–4 phút): nhận cue card, có 1 phút ghi chú, nói liên tục 1–2 phút. Hãy nói đến khi giám khảo dừng bạn.',
          'Part 3 (4–5 phút): câu hỏi trừu tượng liên quan Part 2. Trả lời 4–5 câu: quan điểm, giải thích, ví dụ, so sánh hoặc hệ quả.',
        ],
      },
      {
        heading: 'Giám khảo chú ý gì',
        bullets: [
          'Nói tự nhiên, không học thuộc: câu trả lời thuộc lòng dễ bị nhận ra và hỏi xoáy.',
          'Không cần ý kiến "hay", chỉ cần diễn đạt rõ và mở rộng được.',
          'Được phép hỏi lại khi không nghe rõ: "Sorry, could you repeat the question?"',
        ],
      },
    ],
  },
];

function frameworkLesson(fw: IeltsFramework): LibraryLesson {
  return {
    id: `lib_${fw.id}`,
    skill: fw.skill,
    title: fw.nameVi,
    summary: fw.descriptionVi,
    minutes: 3,
    tags: ['framework', fw.name],
    sections: [
      { text: [fw.description] },
      { heading: 'Các bước', bullets: fw.steps.map((s) => `${s.label}: ${s.detail}`) },
      { heading: 'Khung mẫu', example: fw.sample },
    ],
  };
}

function descriptorLesson(skill: DescriptorSkill): LibraryLesson {
  const label = skill === 'writing' ? 'Writing' : 'Speaking';
  return {
    id: `lib_descriptors_${skill}`,
    skill,
    title: `4 tiêu chí chấm ${label}`,
    summary: `Band 5–8 của từng tiêu chí ${label} trông thế nào, và cần làm gì để lên band.`,
    minutes: 6,
    tags: ['tiêu chí', 'band descriptor', 'chấm điểm'],
    sections: CRITERION_DESCRIPTORS.filter((d) => d.skill === skill).map((d) => ({
      heading: `${d.nameVi}: ${d.name}`,
      text: [d.focus],
      bullets: DESCRIPTOR_BANDS.map((b) => `Band ${b}: ${d.bands[b]} Để lên ${b + 1}: ${d.toNext[b]}`),
    })),
  };
}

export const LIBRARY_LESSONS: readonly LibraryLesson[] = [
  ...WRITTEN_LESSONS.filter((l) => l.skill === 'general'),
  ...WRITTEN_LESSONS.filter((l) => l.skill === 'listening'),
  descriptorLesson('writing'),
  ...WRITTEN_LESSONS.filter((l) => l.skill === 'writing'),
  ...ieltsFrameworks.filter((f) => f.skill === 'writing').map(frameworkLesson),
  ...WRITTEN_LESSONS.filter((l) => l.skill === 'speaking'),
  descriptorLesson('speaking'),
  ...ieltsFrameworks.filter((f) => f.skill === 'speaking').map(frameworkLesson),
];

export function findLesson(id: string): LibraryLesson | undefined {
  return LIBRARY_LESSONS.find((l) => l.id === id);
}

/** Lessons of one skill (or all), matching the query on title, summary or tags, accents ignored. */
export function searchLessons(
  lessons: ReadonlyArray<LibraryLesson>,
  skill: LibrarySkill | 'all',
  query: string,
): LibraryLesson[] {
  const q = foldText(query);
  return lessons.filter(
    (l) =>
      (skill === 'all' || l.skill === skill) &&
      (!q || [l.title, l.summary, ...l.tags].some((t) => foldText(t).includes(q))),
  );
}
