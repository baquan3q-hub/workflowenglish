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
    id: 'lis_completion',
    skill: 'listening',
    title: 'Dạng điền form, ghi chú và bảng',
    summary: 'Đoán loại từ trước khi nghe, bám theo tiêu đề, kiểm tra giới hạn từ và số nhiều.',
    minutes: 5,
    tags: ['form', 'note', 'table', 'completion', 'điền từ', 'part 1', 'part 4'],
    sections: [
      {
        heading: 'Trước khi nghe',
        bullets: [
          'Đọc giới hạn từ trước tiên và khoanh lại: ONE WORD ONLY, NO MORE THAN TWO WORDS, AND/OR A NUMBER.',
          'Với mỗi ô trống, đoán loại từ cần điền: số, ngày, tên riêng, danh từ số ít hay số nhiều, tính từ.',
          'Nhìn từ đứng trước và sau ô trống. "a ___" thường là danh từ số ít bắt đầu bằng phụ âm; "several ___" là danh từ số nhiều.',
          'Đọc tiêu đề và các dòng in đậm: chúng là "bản đồ" giúp bạn biết người nói đang ở đâu trong bài.',
        ],
      },
      {
        heading: 'Trong khi nghe',
        bullets: [
          'Đáp án xuất hiện theo đúng thứ tự câu hỏi. Lỡ một câu thì bỏ qua ngay, đừng để mất câu sau.',
          'Viết nhanh nháp ra (viết tắt cũng được), sau đó mới chép cho đúng chính tả.',
          'Từ cần điền gần như luôn là từ nguyên văn trong bài nghe. Phần paraphrase nằm ở câu hỏi, không phải ở đáp án.',
        ],
        example: 'Đề: Preferred day for lessons: ______\nAudio: "Weekdays are difficult for me, so Saturday would be best."\nĐáp án: Saturday',
      },
      {
        heading: 'Sau khi nghe',
        bullets: [
          'Đếm lại số từ. Số và chữ số được tính riêng: "AND/OR A NUMBER" cho phép thêm một số.',
          'Kiểm tra số nhiều: nếu người nói nói "boots", viết "boot" là sai.',
          'Không cần viết hoa, nhưng chính tả phải đúng hoàn toàn.',
        ],
      },
    ],
  },
  {
    id: 'lis_mcq',
    skill: 'listening',
    title: 'Dạng trắc nghiệm và chọn 2 đáp án',
    summary: 'Gạch từ khoá ở câu hỏi, không chọn vội đáp án được nhắc đầu tiên.',
    minutes: 4,
    tags: ['multiple choice', 'mcq', 'trắc nghiệm', 'choose two', 'part 2', 'part 3'],
    sections: [
      {
        heading: 'Cách làm',
        bullets: [
          'Gạch từ khoá ở phần câu hỏi (ai, cái gì, vì sao) hơn là ở các phương án.',
          'Đọc từng phương án và tự hỏi: cách nói khác của phương án này là gì?',
          'Thường cả ba phương án đều được nhắc tới. Hai phương án sai bị người nói phủ định, giới hạn lại hoặc nói là của người khác.',
          'Chờ người nói nói hết ý rồi mới chọn. Câu kết thường chứa quyết định cuối cùng.',
        ],
      },
      {
        heading: 'Chọn 2 trong 5',
        bullets: [
          'Hai đáp án có thể xuất hiện theo bất kỳ thứ tự nào, nhưng thường nằm trong cùng một đoạn.',
          'Gạch bỏ từng phương án khi nghe thấy nó bị loại, phần còn lại sẽ rõ hơn.',
          'Thứ tự viết hai chữ cái không quan trọng: A, C hay C, A đều đúng.',
        ],
        example: 'Câu hỏi: What does the speaker say about the café?\nAudio: "People expect it to be expensive, but actually the prices are very reasonable."\nPhương án đúng: It is cheaper than people think.',
      },
    ],
  },
  {
    id: 'lis_map',
    skill: 'listening',
    title: 'Dạng bản đồ và sơ đồ',
    summary: 'Tìm điểm xuất phát, nắm từ chỉ hướng và vị trí, theo dõi người nói đi tới đâu.',
    minutes: 4,
    tags: ['map', 'plan', 'bản đồ', 'sơ đồ', 'labelling', 'part 2'],
    sections: [
      {
        heading: 'Trước khi nghe',
        bullets: [
          'Tìm điểm bắt đầu (thường là lối vào, "You are here") và hướng Bắc nếu có.',
          'Xem các địa điểm đã có tên: người nói sẽ dùng chúng làm mốc.',
          'Câu hỏi đi theo thứ tự người nói di chuyển, nên vị trí đáp án thường nối tiếp nhau.',
        ],
      },
      {
        heading: 'Từ chỉ vị trí cần thuộc',
        bullets: [
          'opposite (đối diện), next to / beside (bên cạnh), between (ở giữa), behind (phía sau), in front of (phía trước)',
          'on your left / right, straight ahead, at the end of the path, in the corner (ở góc)',
          'go past (đi qua), turn left, follow the path round, cross the bridge, just before you reach…',
          'north / south / east / west of, in the centre of, alongside the river',
        ],
        example: '"When you come through the main gate, the gift shop is immediately on your right, opposite the car park."',
      },
    ],
  },
  {
    id: 'lis_matching',
    skill: 'listening',
    title: 'Dạng nối thông tin',
    summary: 'Danh sách phương án dài hơn câu hỏi, các ý được paraphrase, có phương án không dùng tới.',
    minutes: 3,
    tags: ['matching', 'nối thông tin', 'part 3'],
    sections: [
      {
        bullets: [
          'Đọc danh sách phương án trước, nghĩ sẵn cách nói khác của từng phương án.',
          'Câu hỏi đi theo thứ tự trong bài, còn phương án thì không.',
          'Thường có 2–3 phương án thừa. Một phương án có thể được nhắc tới để gây nhiễu nhưng không phải đáp án.',
          'Ở Part 3 có nhiều người nói: chú ý ai đồng ý, ai phản đối. "I\'m not sure about that" nghĩa là ý vừa nêu bị bác bỏ.',
        ],
        example: 'Phương án: "It took longer than expected"\nAudio: "We thought it\'d be done in a week, but it dragged on for nearly a month."',
      },
    ],
  },
  {
    id: 'lis_signposts',
    skill: 'listening',
    title: 'Từ báo hiệu trong bài giảng (Part 4)',
    summary: 'Nhận ra lúc người nói chuyển ý, đưa ví dụ hay kết luận để không mất dấu.',
    minutes: 4,
    tags: ['signpost', 'từ nối', 'lecture', 'bài giảng', 'part 4'],
    sections: [
      {
        text: ['Part 4 không có quãng nghỉ. Các tiêu đề trong phần ghi chú tương ứng với những chỗ người nói chuyển ý, nên nghe được từ báo hiệu là biết mình đang ở câu nào.'],
      },
      {
        heading: 'Nhóm từ báo hiệu',
        bullets: [
          'Bắt đầu ý mới: Let\'s turn to…, Moving on to…, Another factor is…, Now, what about…',
          'Đưa ví dụ: For instance…, Take… as an example, A good illustration of this is…',
          'Nhấn mạnh (thường là đáp án): The key point is…, What\'s particularly important…, In fact…',
          'Đổi hướng: However…, Having said that…, On the other hand…, Surprisingly…',
          'Kết luận: To sum up…, So, overall…, The main lesson here is…',
        ],
      },
    ],
  },
  {
    id: 'lis_vietnamese_errors',
    skill: 'listening',
    title: 'Lỗi nghe và chính tả người Việt hay gặp',
    summary: 'Âm cuối, -s và -ed, chữ đôi, các cặp âm dễ nhầm và số có -teen / -ty.',
    minutes: 4,
    tags: ['chính tả', 'âm cuối', 'người việt', 'spelling', 'phát âm'],
    sections: [
      {
        heading: 'Vì sao hay sai',
        text: ['Tiếng Việt hầu như không bật âm cuối và không có cụm phụ âm, nên tai người Việt dễ bỏ qua -s, -ed, -t, -k ở cuối từ. Khi nghe tiếng Anh nói nhanh, các âm này còn bị nối hoặc nuốt mất.'],
      },
      {
        heading: 'Lỗi thường gặp',
        bullets: [
          'Thiếu -s số nhiều: "two bedroom", "free ticket" thay vì bedrooms, tickets.',
          'Nghe nhầm âm cuối: price / prize, rice / rise, card / cart, bag / back.',
          'Chữ đôi: accommodation (2 c, 2 m), committee, necessary, address, apartment (1 p).',
          'Âm câm: Wednesday, February, island, knowledge, government.',
          'Số: fifteen (15) / fifty (50). Nghe trọng âm: -TEEN nhấn ở cuối, -ty nhấn ở đầu.',
          'Chữ cái khi đánh vần: A / E / I, G / J, B / V, M / N.',
        ],
      },
      {
        heading: 'Cách luyện',
        bullets: [
          'Chép chính tả mỗi ngày 10 câu, ghi lại từ hay sai vào sổ.',
          'Luyện bài Số, tên và ngày cho tới khi đạt 8/8 liên tục.',
          'Tự viết lại 30 từ hay gặp trong Part 1 (dates, months, accommodation, library…) cho đến khi không sai.',
        ],
      },
    ],
  },
  {
    id: 'lis_practice_plan',
    skill: 'listening',
    title: 'Luyện nghe thế nào để lên band',
    summary: 'Làm đề để đo, chép chính tả để sửa, nghe rộng để quen tốc độ.',
    minutes: 4,
    tags: ['lộ trình', 'kế hoạch', 'chép chính tả', 'dictation', 'shadowing'],
    sections: [
      {
        heading: 'Ba kiểu luyện',
        bullets: [
          'Làm đề (đo): chế độ Thi thử, nghe một lần. Làm 1 đề mỗi tuần để biết band hiện tại.',
          'Nghe kỹ (sửa): sau mỗi đề, đọc transcript, nghe lại đoạn có câu sai và chép chính tả những câu đó. Phần lớn tiến bộ đến từ bước này.',
          'Nghe rộng (quen): podcast, video tiếng Anh 15–20 phút mỗi ngày, không cần hiểu hết.',
        ],
      },
      {
        heading: 'Theo band hiện tại',
        bullets: [
          'Dưới 5.5: tập trung Part 1 và 2, luyện số, tên, ngày và chính tả. Dùng chế độ Luyện tập, tốc độ 0.75×.',
          '5.5–6.5: luyện Part 3 và 4, học từ báo hiệu và paraphrase. Chuyển dần sang chế độ Thi thử.',
          'Trên 6.5: làm đề đầy đủ trong điều kiện thật, xem kỹ từng lỗi bẫy và lỗi chính tả còn sót.',
        ],
      },
      {
        heading: 'Sau mỗi bài',
        text: ['Ghi lại loại lỗi từ trang Kết quả: sai chính tả, thiếu số nhiều, vượt giới hạn từ hay bị bẫy. Mỗi loại cần một cách sửa khác nhau.'],
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
