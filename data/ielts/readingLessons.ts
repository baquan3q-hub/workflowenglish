/**
 * Reading lessons for the Library: one strategy lesson per question type and
 * the skills behind them. Each type lesson follows the same order: how to
 * recognise it, the steps, the traps, whether answers follow the passage,
 * then a worked example to answer. All passages here are written for the app.
 */

import type { GroupKind } from '../../components/ielts/questions/questionLogic';
import type { LibraryLesson } from './library';

/** Question kinds Reading has (maps are Listening only). */
export type ReadingKind = Exclude<GroupKind, 'map'>;

const TFNG_OPTIONS = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG_OPTIONS = ['YES', 'NO', 'NOT GIVEN'];

const TYPE_LESSONS: LibraryLesson[] = [
  {
    id: 'rd_tfng',
    skill: 'reading',
    title: 'TRUE / FALSE / NOT GIVEN và YES / NO / NOT GIVEN',
    summary: 'Phân biệt "bài nói ngược lại" với "bài không nói tới", dạng người Việt mất điểm nhiều nhất.',
    minutes: 6,
    tags: ['tfng', 'ynng', 'not given', 'false', 'paraphrase', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: [
          'Đề cho một loạt câu khẳng định. TRUE/FALSE/NOT GIVEN hỏi về thông tin (sự kiện, số liệu). YES/NO/NOT GIVEN hỏi về ý kiến hoặc nhận định của tác giả.',
        ],
      },
      {
        heading: 'Ba câu hỏi để chọn',
        bullets: [
          'Bài nói cùng ý với câu đề, dù dùng từ khác: TRUE (YES).',
          'Bài nói một điều không thể cùng đúng với câu đề: FALSE (NO).',
          'Bài nhắc tới chủ đề nhưng không cho biết điều câu đề khẳng định: NOT GIVEN.',
        ],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Gạch chân từ khoá dễ tìm (tên riêng, số, thuật ngữ) và từ "nguy hiểm" (all, only, never, more, because).',
          'Scan tìm vị trí bằng từ khoá dễ tìm, rồi đọc kỹ 1–2 câu quanh đó.',
          'So từng phần của câu đề với bài: chủ thể, hành động, mức độ, thời gian. Chỉ cần một phần bị bài nói ngược là FALSE.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Từ chỉ mức độ: all, always, only, the first, most. Bài nói "some" mà đề nói "all" là FALSE.',
          'So sánh và nguyên nhân: đề thêm "because" hay "more than" mà bài không nêu thì là NOT GIVEN.',
          'Đừng dùng hiểu biết của bạn. Chỉ xét điều bài đọc viết.',
          'Câu đề lặp nhiều từ của bài chưa chắc là TRUE: kiểm tra phần còn lại của câu.',
        ],
        example: 'Bài: "Some farmers kept bees in clay hives."\nĐề: "All early farmers kept bees."  →  FALSE\nĐề: "Clay hives produced more honey."  →  NOT GIVEN',
      },
      {
        heading: 'Thứ tự',
        text: ['Câu hỏi đi theo thứ tự của bài. Nếu tìm thấy câu trước và câu sau mà không thấy câu giữa, nhiều khả năng câu giữa là NOT GIVEN.'],
      },
      {
        heading: 'YES / NO / NOT GIVEN',
        text: ['Cách làm giống hệt, nhưng xét ý kiến hoặc nhận định của tác giả thay vì thông tin. Tìm các động từ như argue, claim, suggest, believe, và các từ đánh giá như surprisingly, unfortunately.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'The first public libraries in the town opened in 1850, although only members who paid a yearly fee could borrow books.',
            question: 'Anyone in the town could borrow books from the first public libraries.',
            options: TFNG_OPTIONS,
            answer: 1,
            explanationVi: '"only members who paid a yearly fee" nói ngược với "anyone", nên là FALSE.',
          },
          {
            passage: 'The first public libraries in the town opened in 1850, although only members who paid a yearly fee could borrow books.',
            question: 'The yearly fee was too expensive for most workers.',
            options: TFNG_OPTIONS,
            answer: 2,
            explanationVi: 'Bài có nhắc tới phí hằng năm nhưng không nói phí đắt hay rẻ với ai. Đó là NOT GIVEN, không phải FALSE.',
          },
          {
            passage: 'Critics have praised the new bridge, but in my view its design ignores the needs of cyclists.',
            question: 'The writer believes the bridge design is suitable for cyclists.',
            options: YNNG_OPTIONS,
            answer: 1,
            explanationVi: '"in my view" mở ra ý kiến tác giả: thiết kế "ignores the needs of cyclists", ngược với câu đề, nên là NO.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_headings',
    skill: 'reading',
    title: 'Matching headings',
    summary: 'Chọn heading theo ý chính của cả đoạn, không theo từ khoá trùng.',
    minutes: 5,
    tags: ['headings', 'main idea', 'skim', 'ý chính', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Một danh sách heading đánh số La Mã (i, ii, iii…) và các đoạn cần chọn heading. Dạng này thường đứng đầu passage, trước các câu hỏi khác.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Đọc lướt câu đầu và câu cuối đoạn để nắm ý chính, rồi mới nhìn danh sách heading.',
          'Tóm ý đoạn bằng vài từ của bạn, sau đó chọn heading gần nhất với tóm tắt đó.',
          'Làm đoạn dễ trước, gạch heading đã dùng (và heading của ví dụ) để danh sách ngắn dần.',
          'Nếu phân vân giữa hai heading, hỏi: heading nào bao được mọi câu trong đoạn?',
        ],
      },
      {
        heading: 'Bẫy từ khoá',
        text: [
          'Heading bẫy thường lặp lại một từ có trong đoạn nhưng chỉ nói về một chi tiết. Heading đúng bao được cả đoạn, kể cả khi không có từ nào trùng.',
          'Đoạn có từ "However" ở giữa thường đổi hướng: ý chính hay nằm sau từ này.',
        ],
        example: 'Đoạn kể nhiều nguyên nhân khiến đàn ong giảm.\nBẫy: "The cost of honey" (đoạn có nhắc giá mật một lần)\nĐúng: "A threatened future"',
      },
      {
        heading: 'Thứ tự',
        text: ['Heading không đi theo thứ tự đoạn, và số heading luôn nhiều hơn số đoạn.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage:
              'For decades, city planners assumed that wider roads would reduce traffic. New roads were built, yet within a few years they were as crowded as the old ones. Researchers now call this "induced demand": extra road space encourages more people to drive, so congestion returns.',
            question: 'Chọn heading cho đoạn này.',
            options: ['The cost of building roads', 'Why more roads do not end congestion', 'How researchers measure traffic', 'Planners who opposed new roads'],
            answer: 1,
            explanationVi: 'Cả đoạn giải thích vì sao thêm đường không giảm kẹt xe. "Researchers" chỉ là chi tiết, còn chi phí và người phản đối không được nhắc tới.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_completion',
    skill: 'reading',
    title: 'Sentence completion',
    summary: 'Chép đúng từ trong bài, giữ đúng giới hạn từ và dạng số nhiều.',
    minutes: 5,
    tags: ['completion', 'sentence', 'giới hạn từ', 'chính tả', 'số nhiều', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Các câu có một chỗ trống, kèm yêu cầu như "Choose NO MORE THAN TWO WORDS from the passage". Đáp án là từ chép nguyên văn từ bài.'],
      },
      {
        heading: 'Trước khi tìm',
        bullets: [
          'Đọc kỹ giới hạn: "NO MORE THAN TWO WORDS" nghĩa là 1 hoặc 2 từ; "AND/OR A NUMBER" cho thêm một con số.',
          'Đoán loại từ cho chỗ trống: danh từ, động từ, tính từ hay con số. Mạo từ "a/an" trước chỗ trống cho biết danh từ số ít.',
          'Gạch từ khoá của câu và nghĩ trước vài cách bài có thể diễn đạt lại.',
        ],
      },
      {
        heading: 'Khi chép',
        bullets: [
          'Chép nguyên văn từ trong bài, đúng chính tả và đúng dạng số ít hoặc số nhiều.',
          'Bỏ mạo từ và từ thừa nếu vượt giới hạn: "the clay hives" (3 từ) thành "clay hives".',
          'Đọc lại cả câu sau khi điền để chắc câu đúng ngữ pháp.',
          'Từ có gạch nối (well-known) tính là một từ; số viết bằng chữ số tính là một số.',
        ],
        example: 'Đề: "Early hives were made of ____." (ONE WORD)\nBài: "kept hives made of clay"\nĐáp án: clay',
      },
      {
        heading: 'Thứ tự',
        text: ['Câu hỏi đi theo thứ tự của bài.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'Glass bottles were once collected, washed and refilled up to forty times before they were finally recycled.',
            question: 'Before being recycled, a glass bottle could be refilled as many as ____ times. (ONE WORD ONLY)',
            options: ['forty', 'forty times', 'many', 'refilled'],
            answer: 0,
            explanationVi: 'Chỗ trống đứng trước "times" nên chỉ cần con số. "forty times" lặp từ đã có và vượt giới hạn một từ.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_summary_box',
    skill: 'reading',
    title: 'Summary completion',
    summary: 'Hai biến thể: lấy từ trong bài, hoặc chọn từ hộp từ. Hộp từ hay dùng từ đồng nghĩa với bài.',
    minutes: 5,
    tags: ['summary', 'word box', 'hộp từ', 'completion', 'paraphrase', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: [
          'Một đoạn tóm tắt có nhiều chỗ trống. Nếu có danh sách A–J bên dưới, bạn điền chữ cái (hộp từ). Nếu không, bạn chép từ trong bài như sentence completion.',
        ],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Đọc tiêu đề và câu đầu của summary để biết nó tóm tắt phần nào của bài; thường chỉ một hoặc hai đoạn.',
          'Với mỗi chỗ trống, xác định loại từ cần điền và gạch các lựa chọn hợp ngữ pháp trong hộp.',
          'Tìm ý trong bài rồi chọn từ trong hộp cùng nghĩa, không phải từ giống hệt mặt chữ.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Hộp từ có từ trùng mặt chữ với bài nhưng sai nghĩa trong câu. Từ đúng thường là từ đồng nghĩa.',
          'Hộp từ có các cặp trái nghĩa (increase/decline, cheap/costly): đọc kỹ hướng của câu.',
          'Với dạng lấy từ trong bài, lỗi chính là sai chính tả và vượt giới hạn từ.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Ý trong summary thường đi theo thứ tự của bài và tập trung ở một vùng. Hộp từ có nhiều từ hơn số chỗ trống.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'Demand for the fabric fell sharply after cheaper synthetic alternatives reached the market.',
            question: 'Summary: "Sales of the fabric ____ once less expensive man-made materials appeared."',
            options: ['A  rose', 'B  declined', 'C  fabric', 'D  sharp'],
            answer: 1,
            explanationVi: '"fell sharply" được diễn đạt lại thành "declined". "sharp" có mặt chữ giống bài nhưng là tính từ, không hợp chỗ trống cần động từ.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_notes_table',
    skill: 'reading',
    title: 'Note, table và flow-chart completion',
    summary: 'Điền vào ghi chú, bảng hoặc sơ đồ các bước. Tiêu đề cột và mũi tên cho biết cần tìm gì.',
    minutes: 5,
    tags: ['notes', 'table', 'flowchart', 'flow-chart', 'quy trình', 'completion', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Ghi chú gạch đầu dòng, một bảng có hàng và cột, hoặc các ô nối bằng mũi tên mô tả một quy trình. Đáp án chép từ bài, có giới hạn từ.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Đọc tiêu đề, tiêu đề cột và hàng: chúng cho biết loại thông tin (năm, vật liệu, mục đích).',
          'Nhìn các ô đã điền sẵn cùng cột để biết dạng đáp án: một danh từ, một con số, một cụm động từ.',
          'Flow-chart: mỗi ô là một bước. Tìm trong bài các từ nối thứ tự như first, then, once, after that, finally.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Ghi chú thường rút gọn: bỏ động từ "to be" và mạo từ, nên đừng tìm câu y hệt.',
          'Trong flow-chart, bài có thể kể các bước không theo thứ tự thời gian. Đi theo từ nối, không theo vị trí câu.',
        ],
        example: 'Ô trước: "Leaves are dried in the sun"\nÔ trống: "→ Leaves are ____ by hand"\nBài: "once dry, the leaves are rolled by hand"\nĐáp án: rolled',
      },
      {
        heading: 'Thứ tự',
        text: ['Ghi chú và flow-chart thường theo thứ tự của bài. Bảng có thể đi theo hàng hoặc theo cột, nhưng thường nằm gọn trong một vùng của bài.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'After the clay is shaped, it is left to dry for two days. Only then is it fired in a kiln, which hardens it permanently.',
            question: 'Flow-chart: shape the clay → dry for two days → ____ in a kiln (ONE WORD)',
            options: ['fired', 'hardens', 'kiln', 'shaped'],
            answer: 0,
            explanationVi: '"Only then is it fired in a kiln": bước sau khi phơi là nung. "hardens" là kết quả, không phải việc làm trong ô.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_diagram',
    skill: 'reading',
    title: 'Diagram label completion',
    summary: 'Ghi nhãn cho các bộ phận của một hình vẽ máy móc, công trình hay cơ thể.',
    minutes: 4,
    tags: ['diagram', 'sơ đồ', 'label', 'nhãn', 'completion', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Một hình vẽ có các mũi tên trỏ vào bộ phận, một số nhãn để trống. Đáp án là danh từ chép từ bài, thường thuộc một đoạn mô tả cấu tạo.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Xem tiêu đề hình rồi tìm đoạn mô tả đúng vật đó (thường có từ position, above, below, inside, attached to).',
          'Dùng các nhãn có sẵn làm mốc: bộ phận trống nằm cạnh nhãn nào?',
          'Đọc các từ chỉ vị trí và chức năng để ghép đúng tên bộ phận.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Bài có thể gọi tên một bộ phận theo hai cách. Chọn đúng từ bài dùng và trong giới hạn từ.',
          'Đừng điền chức năng ("to cool the air") khi chỗ trống cần tên bộ phận.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Không bắt buộc theo thứ tự, nhưng đáp án thường gom trong một hai đoạn.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'Warm air rises through a central shaft and escapes through vents at the top, while cool air enters through a channel below the floor.',
            question: 'Trên hình, mũi tên ở đỉnh tháp trỏ vào: ____ (ONE WORD)',
            options: ['shaft', 'vents', 'channel', 'floor'],
            answer: 1,
            explanationVi: '"escapes through vents at the top": phần ở đỉnh là vents. Shaft ở giữa, channel nằm dưới sàn.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_short_answer',
    skill: 'reading',
    title: 'Short-answer questions',
    summary: 'Trả lời câu hỏi Wh- bằng vài từ trong bài, đúng loại thông tin được hỏi.',
    minutes: 4,
    tags: ['short answer', 'wh-question', 'giới hạn từ', 'scan', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Câu hỏi What, Which, When, How many… kèm "NO MORE THAN THREE WORDS AND/OR A NUMBER". Câu trả lời là cụm chép từ bài.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Từ để hỏi cho biết loại đáp án: When → thời gian, Who → người, How much → số lượng hoặc giá.',
          'Scan tìm từ khoá riêng (tên, năm) rồi đọc kỹ câu đó.',
          'Chỉ chép phần trả lời đúng câu hỏi, bỏ phần đã có trong câu hỏi.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Câu hỏi "Which material…" có thể có hai vật liệu gần nhau trong bài; đọc phần bổ nghĩa để chọn đúng.',
          'Không viết lại thành câu đầy đủ: vượt giới hạn từ là sai.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Câu hỏi đi theo thứ tự của bài.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'The observatory was rebuilt in 1932 using steel from a nearby shipyard. Its original dome, which was made of wood, had been damaged in a storm.',
            question: 'What was the original dome made of? (ONE WORD)',
            options: ['steel', 'wood', 'shipyard', '1932'],
            answer: 1,
            explanationVi: '"Its original dome, which was made of wood": mái vòm ban đầu bằng gỗ. Steel là vật liệu khi xây lại, năm 1932 thì không trả lời câu hỏi "made of".',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_mcq',
    skill: 'reading',
    title: 'Multiple choice (một đáp án)',
    summary: 'Loại từng phương án bằng bằng chứng trong bài; phương án lặp nhiều từ của bài thường là bẫy.',
    minutes: 5,
    tags: ['mcq', 'multiple choice', 'trắc nghiệm', 'loại trừ', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Một câu hỏi hoặc câu chưa hoàn chỉnh, kèm bốn phương án A–D. Câu cuối của passage đôi khi hỏi ý chính hoặc mục đích của cả bài.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Đọc phần câu hỏi trước, chưa đọc phương án, rồi tìm vị trí trong bài.',
          'Đọc kỹ đoạn đó, tự trả lời bằng ý của bạn, rồi mới so với các phương án.',
          'Loại từng phương án sai và ghi lý do: sai thông tin, bài không nói, hoặc đúng nhưng không trả lời câu hỏi.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Phương án chép nguyên cụm từ trong bài nhưng đổi quan hệ (nguyên nhân thành kết quả, người A thành người B).',
          'Phương án đúng sự thật ngoài đời nhưng bài không nói.',
          'Phương án đúng một phần: chỉ một chi tiết, không phải điều câu hỏi cần.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Câu hỏi đi theo thứ tự của bài; câu hỏi về ý chính cả bài thường đứng cuối.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage:
              'Many visitors believe the castle was built for defence. In fact, its thin walls and large windows suggest it was designed mainly to impress guests, not to withstand attack.',
            question: 'According to the writer, the castle was built mainly to',
            options: ['A  protect the town from attack', 'B  impress the people who visited', 'C  attract tourists today', 'D  replace an older castle'],
            answer: 1,
            explanationVi: '"designed mainly to impress guests" = B. A là điều "many visitors believe", tác giả bác bỏ. C và D bài không nói.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_mcq_multi',
    skill: 'reading',
    title: 'Multiple choice chọn nhiều đáp án',
    summary: '"Choose TWO letters": mỗi chữ đúng được một điểm, thứ tự không quan trọng.',
    minutes: 4,
    tags: ['mcq', 'choose two', 'chọn nhiều', 'trắc nghiệm', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Một câu hỏi với năm phương án trở lên, yêu cầu chọn hai hoặc ba chữ cái. Mỗi chữ đúng là một câu trong tổng 40.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Đọc kỹ câu hỏi: "which TWO advantages", "which TWO claims does the writer make". Chỉ chọn đúng loại được hỏi.',
          'Các đáp án thường nằm trong cùng một đoạn hoặc hai đoạn liền nhau. Tìm vùng đó trước.',
          'Đánh dấu Đúng/Sai/Không nói cho từng phương án như khi làm TFNG.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Phương án đúng thông tin nhưng là nhược điểm khi đề hỏi ưu điểm.',
          'Phương án là ý kiến của người khác trong bài khi đề hỏi ý của tác giả.',
          'Chọn thừa chữ cái: chỉ chọn đúng số lượng đề yêu cầu.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Chữ cái không cần theo thứ tự; các phương án không xếp theo thứ tự xuất hiện trong bài.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage:
              'Electric buses are quieter than diesel ones and produce no exhaust in the street. However, their batteries are expensive and take several hours to charge.',
            question: 'Which TWO advantages are mentioned?  A: They make less noise.  B: They do not release fumes on the road.  C: They charge quickly.',
            options: ['A và B', 'A và C', 'B và C'],
            answer: 0,
            explanationVi: '"quieter" = A, "no exhaust in the street" = B. Bài nói pin sạc mất "several hours", ngược với C.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_matching_info',
    skill: 'reading',
    title: 'Matching information (đoạn nào chứa…)',
    summary: 'Tìm đoạn chứa một chi tiết nhỏ: một ví dụ, một lý do, một so sánh. Không theo thứ tự.',
    minutes: 5,
    tags: ['matching information', 'which paragraph', 'đoạn nào', 'scan', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['"Which paragraph contains the following information?" Mỗi câu mô tả một loại thông tin, bạn ghi chữ cái của đoạn. Có thể có ghi chú "You may use any letter more than once".'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Gạch danh từ chỉ loại thông tin: "an example of", "a reason for", "a comparison between", "a description of". Đó là thứ bạn tìm, không phải chủ đề.',
          'Nên làm dạng này sau các dạng có thứ tự: khi đó bạn đã đọc bài và nhớ vị trí nhiều ý.',
          'Đọc từng đoạn, mỗi đoạn hỏi: đoạn này có chứa loại thông tin nào trong danh sách?',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Câu hỏi về chi tiết, không phải ý chính: một đoạn nói chung về giao thông có thể chứa "một ví dụ về Copenhagen" trong một câu.',
          'Đoạn có từ khoá trùng chưa chắc chứa đúng loại thông tin (có "cost" nhưng không có "so sánh chi phí").',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Không theo thứ tự. Một đoạn có thể dùng nhiều lần, có đoạn không được dùng.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage:
              'B  Cities have tried many ways to cut traffic. Singapore, for instance, charges drivers each time they enter the centre.\nC  The cost of such schemes is high, and some residents argue the money would be better spent on schools.',
            question: 'Đoạn nào chứa "an example of a city using a charge to reduce traffic"?',
            options: ['B', 'C'],
            answer: 0,
            explanationVi: '"Singapore, for instance, charges drivers" là ví dụ cụ thể, nằm ở B. C có nói về chi phí nhưng không có ví dụ thành phố nào.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_matching_features',
    skill: 'reading',
    title: 'Matching features (người, nơi, thời kỳ)',
    summary: 'Nối nhận định với người nói, hoặc đặc điểm với nơi chốn, thời kỳ.',
    minutes: 5,
    tags: ['matching features', 'researchers', 'người nói', 'scan', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Một danh sách tên (thường là nhà nghiên cứu) hoặc nơi chốn, thời kỳ, ghi A, B, C… và các nhận định cần nối. Có thể dùng một chữ cái nhiều lần.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Scan tìm mọi chỗ bài nhắc tới từng tên, gạch chân trong bài. Một người có thể xuất hiện ở nhiều đoạn.',
          'Đọc ý kiến quanh mỗi tên, tóm tắt ngắn bên lề.',
          'So từng nhận định với các tóm tắt đó; chú ý họ ủng hộ hay phản đối.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Tên người được nhắc lại bằng họ, bằng "she" hoặc "the Dutch team". Theo dõi đại từ.',
          'Câu trong bài trích ý người A để người B phản bác: nhận định thuộc về A, không phải B.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Nhận định không theo thứ tự của bài. Danh sách tên thường theo thứ tự xuất hiện, giúp bạn scan nhanh.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage:
              'Dr Mehta argues that sleep improves memory. Professor Lund disagrees, claiming that the effect seen in Mehta’s studies was caused by rest, not by sleep itself.',
            question: 'Ai cho rằng "resting may explain the results"?',
            options: ['A  Dr Mehta', 'B  Professor Lund'],
            answer: 1,
            explanationVi: 'Lund "claiming that the effect … was caused by rest". Tên Mehta có trong câu đó, nhưng chỉ là người bị phản bác.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_endings',
    skill: 'reading',
    title: 'Matching sentence endings',
    summary: 'Ghép nửa đầu câu với nửa sau. Phải đúng ngữ pháp và đúng ý của bài.',
    minutes: 4,
    tags: ['sentence endings', 'matching', 'ghép câu', 'dạng câu hỏi'],
    sections: [
      {
        heading: 'Nhận diện',
        text: ['Các nửa đầu câu đánh số, và một danh sách nửa sau A–G nhiều hơn số câu. Mỗi câu ghép một nửa sau.'],
      },
      {
        heading: 'Các bước',
        bullets: [
          'Dùng từ khoá ở nửa đầu để tìm vị trí trong bài.',
          'Đọc câu trong bài và tự hoàn thành ý, rồi tìm nửa sau cùng nghĩa.',
          'Kiểm tra ngữ pháp: nửa đầu kết thúc bằng "to" thì nửa sau bắt đầu bằng động từ nguyên mẫu.',
        ],
      },
      {
        heading: 'Bẫy hay gặp',
        bullets: [
          'Nhiều nửa sau hợp ngữ pháp và đều đúng sự thật trong bài, nhưng chỉ một cái nói về đúng chủ thể ở nửa đầu.',
          'Nửa sau dùng từ khoá của một đoạn khác để đánh lạc hướng.',
        ],
      },
      {
        heading: 'Thứ tự',
        text: ['Các nửa đầu đi theo thứ tự của bài; danh sách nửa sau thì xáo trộn.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'Early maps were often inaccurate because sailors relied on memory rather than measurement.',
            question: 'Early maps contained mistakes because…',
            options: ['A  sailors measured distances carefully.', 'B  sailors depended on what they remembered.', 'C  they were drawn by kings.'],
            answer: 1,
            explanationVi: '"relied on memory" = "depended on what they remembered". A nói ngược lại, C bài không nhắc.',
          },
        ],
      },
    ],
  },
];

const SKILL_LESSONS: LibraryLesson[] = [
  {
    id: 'rd_skimming',
    skill: 'reading',
    title: 'Skimming: đọc lướt lấy ý chính',
    summary: 'Nắm cấu trúc bài trong 2–3 phút trước khi làm câu hỏi.',
    minutes: 4,
    tags: ['skim', 'skimming', 'đọc lướt', 'ý chính', 'kỹ năng'],
    sections: [
      {
        heading: 'Khi nào dùng',
        text: ['Ngay khi mở passage, và khi làm matching headings hay câu hỏi ý chính. Mục tiêu là biết mỗi đoạn nói về gì, không phải hiểu mọi chi tiết.'],
      },
      {
        heading: 'Cách làm',
        bullets: [
          'Đọc tiêu đề, phụ đề và mọi hình minh hoạ.',
          'Mỗi đoạn đọc câu đầu và câu cuối; các câu giữa chỉ lướt mắt tìm tên riêng và số.',
          'Ghi 2–4 từ bên lề mỗi đoạn: "lịch sử", "vấn đề", "giải pháp", "phản đối".',
          'Đừng dừng lại ở từ mới. Ý chính hiếm khi phụ thuộc vào một từ.',
        ],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage:
              'Coral reefs cover less than one percent of the ocean floor. Yet they shelter about a quarter of all marine species, from tiny shrimp to large sharks, which depend on them for food and protection.',
            question: 'Ý chính của đoạn là gì?',
            options: ['Rạn san hô rất nhỏ', 'Rạn san hô nhỏ nhưng nuôi sống rất nhiều loài', 'Cá mập ăn tôm', 'Đáy biển rộng lớn'],
            answer: 1,
            explanationVi: '"Yet" nối hai ý: diện tích nhỏ nhưng là nơi sống của một phần tư loài biển. Câu đầu một mình chưa phải ý chính.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_scanning',
    skill: 'reading',
    title: 'Scanning: tìm nhanh chi tiết',
    summary: 'Tìm tên, số, thuật ngữ mà không đọc từng chữ.',
    minutes: 4,
    tags: ['scan', 'scanning', 'tìm chi tiết', 'từ khoá', 'kỹ năng'],
    sections: [
      {
        heading: 'Từ khoá dễ tìm',
        bullets: [
          'Tên riêng, năm, số liệu, đơn vị đo: viết hoa hoặc là chữ số nên nổi bật trên trang.',
          'Thuật ngữ chuyên ngành ít có từ đồng nghĩa, nên bài thường giữ nguyên.',
          'Động từ và tính từ thường bị diễn đạt lại; đừng dùng chúng để scan.',
        ],
      },
      {
        heading: 'Cách làm',
        bullets: [
          'Giữ trong đầu hình dạng của từ cần tìm (ví dụ "1880s" hay "Darwin"), đưa mắt theo hình chữ Z xuống trang.',
          'Khi thấy từ khoá, dừng lại và đọc kỹ cả câu, cùng câu trước và sau.',
          'Câu hỏi đi theo thứ tự thì bắt đầu scan từ chỗ đáp án trước.',
        ],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            question: 'Câu hỏi: "When did Charles Darwin first visit the Galápagos Islands?" Từ nào nên dùng để scan?',
            options: ['When', 'first', 'visit', 'Galápagos'],
            answer: 3,
            explanationVi: 'Tên riêng viết hoa, bài không đổi được nên dễ thấy nhất. "visit" có thể thành "arrived at" hay "landed on", còn "When" và "first" có ở khắp nơi.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_paraphrase',
    skill: 'reading',
    title: 'Nhận diện paraphrase',
    summary: 'Đề hiếm khi dùng lại từ của bài. Năm cách diễn đạt lại hay gặp nhất.',
    minutes: 5,
    tags: ['paraphrase', 'đồng nghĩa', 'synonym', 'diễn đạt lại', 'kỹ năng'],
    sections: [
      {
        text: ['Điểm Reading phụ thuộc lớn vào việc nhận ra cùng một ý được viết bằng từ khác. Sau mỗi bài, xem thẻ "Đề ↔ Bài đọc" ở phần xem lại để luyện mắt.'],
      },
      {
        heading: 'Năm cách hay gặp',
        bullets: [
          'Từ đồng nghĩa: rise → increase, cheap → inexpensive.',
          'Đổi loại từ: "decided to expand" → "the decision to expand".',
          'Chủ động và bị động: "researchers tested it" → "it was tested".',
          'Nói khái quát hơn: "cats, dogs and rabbits" → "pets".',
          'Phủ định của từ trái nghĩa: "rare" → "not common".',
        ],
        example: 'Bài: "The scheme was abandoned after two years."\nĐề: "The project did not last long."',
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'Few people realised how harmful the chemical was until the 1970s.',
            question: 'Câu đề nào cùng nghĩa với bài?',
            options: [
              'The chemical was widely known to be dangerous before 1970.',
              'The dangers of the chemical were not generally understood before the 1970s.',
              'Many people used the chemical in the 1970s.',
            ],
            answer: 1,
            explanationVi: '"Few people realised" = "not generally understood", "harmful" = "dangers". Câu thứ nhất nói ngược, câu thứ ba bài không nói.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_long_sentences',
    skill: 'reading',
    title: 'Đọc câu dài: mệnh đề quan hệ và danh từ hoá',
    summary: 'Tìm chủ ngữ và động từ chính trước, các mệnh đề phụ để sau.',
    minutes: 6,
    tags: ['câu dài', 'mệnh đề quan hệ', 'relative clause', 'nominalisation', 'danh từ hoá', 'ngữ pháp', 'kỹ năng'],
    sections: [
      {
        heading: 'Tìm khung câu',
        bullets: [
          'Gạch động từ chính (động từ chia thì, không đứng sau which, that, who).',
          'Tìm chủ ngữ của nó: thường là cụm danh từ ở đầu câu, có thể rất dài.',
          'Mọi thứ còn lại là thông tin thêm. Hiểu khung trước, chi tiết sau.',
        ],
        example:
          'The bridge, which engineers had declared unsafe in 1990, remained open for another decade.\nKhung: The bridge … remained open.\nThêm: engineers đã tuyên bố không an toàn năm 1990.',
      },
      {
        heading: 'Mệnh đề quan hệ rút gọn',
        text: [
          'Bài học thuật hay bỏ "which is/that were": "the samples collected in 2010" = "the samples which were collected in 2010". Động từ V-ed ở đây không phải động từ chính.',
        ],
      },
      {
        heading: 'Danh từ hoá',
        text: [
          'Văn học thuật biến hành động thành danh từ: "the introduction of taxes led to a reduction in consumption" = "khi đưa ra thuế, người ta tiêu thụ ít đi". Đổi ngược danh từ thành động từ để hiểu nhanh.',
        ],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            passage: 'The decline in bird numbers that scientists recorded across the region during the drought surprised even those who had predicted it.',
            question: 'Điều gì gây bất ngờ?',
            options: ['Các nhà khoa học', 'Sự sụt giảm số lượng chim', 'Hạn hán', 'Những người dự đoán'],
            answer: 1,
            explanationVi: 'Khung câu: "The decline in bird numbers … surprised even those…". "that scientists recorded…" chỉ bổ nghĩa cho decline.',
          },
        ],
      },
    ],
  },
  {
    id: 'rd_time',
    skill: 'reading',
    title: 'Chiến lược thời gian 60 phút',
    summary: '17, 20 và 23 phút cho ba passage, và biết khi nào bỏ qua một câu.',
    minutes: 4,
    tags: ['thời gian', 'time', 'chiến lược', 'kỹ năng', 'thi thật'],
    sections: [
      {
        heading: 'Chia giờ',
        bullets: [
          'Passage 1: khoảng 17 phút. Passage 2: 20 phút. Passage 3: 23 phút, vì khó và dài lập luận hơn.',
          'Không có thời gian chép đáp án riêng: ghi thẳng vào phiếu (hoặc ô) ngay khi làm.',
          'Mỗi câu không quá 90 giây. Quá thì đoán, đánh dấu và đi tiếp.',
        ],
      },
      {
        heading: 'Thứ tự làm trong một passage',
        bullets: [
          'Skim 2–3 phút.',
          'Làm dạng có thứ tự (TFNG, completion, MCQ) trước, vì chúng giúp bạn đi dọc bài.',
          'Headings và matching information để sau, khi đã quen bài.',
        ],
      },
      {
        heading: 'Không bỏ trống',
        text: ['Sai không bị trừ điểm. Hết giờ còn câu trống thì vẫn điền: TFNG đoán NOT GIVEN ít rủi ro hơn với câu bạn không tìm thấy; dạng chọn chữ cái thì chọn một chữ chưa dùng.'],
      },
      {
        heading: 'Thử làm',
        quiz: [
          {
            question: 'Đã 21 phút mà bạn còn 4 câu ở Passage 1. Nên làm gì?',
            options: ['Làm nốt cho xong Passage 1', 'Đoán nhanh 4 câu, đánh dấu và sang Passage 2', 'Bỏ trống rồi sang Passage 2'],
            answer: 1,
            explanationVi: 'Passage 2 và 3 cần 43 phút. Đoán vẫn có cơ hội được điểm; đánh dấu để quay lại nếu còn giờ.',
          },
        ],
      },
    ],
  },
];

export const READING_LESSONS: LibraryLesson[] = [...TYPE_LESSONS, ...SKILL_LESSONS];

/** The strategy lesson for each Reading question kind. */
export const READING_KIND_LESSON: Record<ReadingKind, string> = {
  tfng: 'rd_tfng',
  ynng: 'rd_tfng',
  headings: 'rd_headings',
  completion: 'rd_completion',
  summary_box: 'rd_summary_box',
  flowchart: 'rd_notes_table',
  diagram: 'rd_diagram',
  short_answer: 'rd_short_answer',
  mcq: 'rd_mcq',
  mcq_multi: 'rd_mcq_multi',
  matching_paragraph: 'rd_matching_info',
  matching_feature: 'rd_matching_features',
  matching_ending: 'rd_endings',
};

/** Kinds a type lesson teaches, so the lesson can open practice of that kind. */
export function kindsForLesson(lessonId: string): ReadingKind[] {
  return (Object.keys(READING_KIND_LESSON) as ReadingKind[]).filter((k) => READING_KIND_LESSON[k] === lessonId);
}
