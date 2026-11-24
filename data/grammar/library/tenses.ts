import type { GrammarTopic } from './types';

export const tenses = [
  {
    id: 'present-simple',
    title: 'Hiện tại đơn',
    en: 'Present simple',
    level: 'Nền tảng',
    aliases: ['thói quen'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + V / V-s/es',
      },
      {
        label: 'Phủ định',
        pattern: 'S + do/does not + V',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Do/Does + S + V?',
      },
    ],
    uses: [
      'Nói về thói quen, sự thật và trạng thái hiện tại. Với he, she, it, thêm -s hoặc -es trong câu khẳng định.',
      'Với động từ be, dùng am/is/are và đưa chính be lên đầu câu hỏi.',
    ],
    trap: {
      wrong: 'Does she studies here?',
      right: 'Does she study here?',
      why: 'Does đã mang dấu hiệu ngôi thứ ba. Sau does, động từ giữ nguyên mẫu.',
    },
    examples: [
      {
        en: 'My sister studies English every evening.',
        vi: 'Chị tôi học tiếng Anh mỗi tối.',
      },
      {
        en: 'Does the library open on Sundays?',
        vi: 'Thư viện có mở cửa vào các Chủ nhật không?',
      },
    ],
    questions: [
      {
        prompt: 'Linh ___ to school by bus every morning.',
        answer: 'goes',
        alternatives: ['go', 'is go'],
        why: 'Linh là ngôi thứ ba số ít và every morning chỉ thói quen.',
      },
      {
        prompt: '___ your parents work on Saturdays?',
        answer: 'Do',
        alternatives: ['Does', 'Are'],
        why: 'Your parents là số nhiều và work là động từ thường.',
      },
      {
        prompt: 'The station ___ near my house.',
        answer: 'is',
        alternatives: ['does be', 'are'],
        why: 'Dùng is để nói vị trí của một địa điểm số ít.',
      },
    ],
  },
  {
    id: 'present-continuous',
    title: 'Hiện tại tiếp diễn',
    en: 'Present continuous',
    level: 'Nền tảng',
    aliases: ['đang diễn ra'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + am/is/are + V-ing',
      },
      {
        label: 'Phủ định',
        pattern: 'S + am/is/are not + V-ing',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Am/Is/Are + S + V-ing?',
      },
    ],
    uses: [
      'Nói về việc đang diễn ra hoặc tình huống tạm thời quanh thời điểm nói.',
      'Có thể dùng cho kế hoạch đã thu xếp, thường có mốc tương lai.',
    ],
    trap: {
      wrong: 'She cooking now.',
      right: 'She is cooking now.',
      why: 'Giữ cả động từ be và dạng -ing.',
    },
    examples: [
      {
        en: 'The children are playing outside.',
        vi: 'Bọn trẻ đang chơi bên ngoài.',
      },
      {
        en: 'I am meeting Mai at six tonight.',
        vi: 'Tối nay tôi có hẹn gặp Mai lúc sáu giờ.',
      },
    ],
    questions: [
      {
        prompt: 'Listen! Someone ___ at the door.',
        answer: 'is knocking',
        alternatives: ['knocks', 'knocking'],
        why: 'Listen! hướng sự chú ý vào việc đang diễn ra.',
      },
      {
        prompt: 'We normally work in Hue, but this week we ___ in Hanoi.',
        answer: 'are working',
        alternatives: ['are work', 'works'],
        why: 'This week giới hạn một tình huống tạm thời.',
      },
      {
        prompt: '___ you waiting for the bus?',
        answer: 'Are',
        alternatives: ['Do', 'Is'],
        why: 'Câu hỏi đảo are lên trước you.',
      },
    ],
  },
  {
    id: 'present-perfect',
    title: 'Hiện tại hoàn thành',
    en: 'Present perfect',
    level: 'Trung cấp',
    aliases: ['have has V3'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + have/has + V3',
      },
      {
        label: 'Phủ định',
        pattern: 'S + have/has not + V3',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Have/Has + S + V3?',
      },
    ],
    uses: [
      'Nói về trải nghiệm tính đến hiện tại, kết quả có liên hệ hiện tại, hoặc trạng thái kéo dài đến hiện tại.',
      'Dùng since với mốc, for với khoảng thời gian. Với mốc quá khứ đã kết thúc như yesterday, thường dùng quá khứ đơn.',
    ],
    trap: {
      wrong: 'I have seen her yesterday.',
      right: 'I saw her yesterday.',
      why: 'Yesterday đặt sự kiện trong một khoảng quá khứ đã kết thúc.',
    },
    examples: [
      {
        en: 'I have lost my key. Can you help me?',
        vi: 'Tôi làm mất chìa khóa rồi. Bạn giúp tôi được không?',
      },
      {
        en: 'She has lived here since 2020.',
        vi: 'Cô ấy sống ở đây từ năm 2020 đến nay.',
      },
    ],
    questions: [
      {
        prompt: 'I ___ my report, so you can read it now.',
        answer: 'have finished',
        alternatives: ['have finish', 'am finished'],
        why: 'Bài hoàn tất và kết quả hiện có, dùng have + finished.',
      },
      {
        prompt: '___ your sister ever been to Hue?',
        answer: 'Has',
        alternatives: ['Did', 'Does'],
        why: 'Câu hỏi trải nghiệm dùng has + chủ ngữ số ít + been.',
      },
      {
        prompt: 'I have known Hoa ___ three years.',
        answer: 'for',
        alternatives: ['since', 'from'],
        why: 'Three years là một khoảng thời gian.',
      },
    ],
  },
  {
    id: 'present-perfect-continuous',
    title: 'Hiện tại hoàn thành tiếp diễn',
    en: 'Present perfect continuous',
    level: 'Trung cấp',
    aliases: ['have been V-ing'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + have/has been + V-ing',
      },
      {
        label: 'Phủ định',
        pattern: 'S + have/has not been + V-ing',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Have/Has + S + been + V-ing?',
      },
    ],
    uses: [
      'Nhấn quá trình kéo dài đến hiện tại hoặc mới dừng, có dấu hiệu còn thấy được.',
      'Dùng hoàn thành đơn để nhấn kết quả đếm được. Động từ chỉ trạng thái như know thường dùng dạng đơn.',
    ],
    trap: {
      wrong: 'I have been knowing her for years.',
      right: 'I have known her for years.',
      why: 'Know diễn tả một trạng thái trong cách dùng này.',
    },
    examples: [
      {
        en: 'We have been waiting for forty minutes.',
        vi: 'Chúng tôi đã đợi suốt bốn mươi phút.',
      },
      {
        en: 'It has been raining. The streets are wet.',
        vi: 'Trời vừa mưa suốt một lúc. Đường vẫn ướt.',
      },
    ],
    questions: [
      {
        prompt: 'He ___ since dawn and is still at his desk.',
        answer: 'has been working',
        alternatives: ['has working', 'is been working'],
        why: 'Since dawn và still nhấn quá trình từ sáng đến hiện tại.',
      },
      {
        prompt: 'She ___ five applications so far.',
        answer: 'has sent',
        alternatives: ['has been send', 'have sent'],
        why: 'Five applications nhấn số lượng đã hoàn thành.',
      },
      {
        prompt: 'How long have you ___ for me?',
        answer: 'been waiting',
        alternatives: ['waiting', 'be waiting'],
        why: 'Sau have + chủ ngữ cần been + V-ing.',
      },
    ],
  },
  {
    id: 'past-simple',
    title: 'Quá khứ đơn',
    en: 'Past simple',
    level: 'Nền tảng',
    aliases: ['V2 did'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + V2 / V-ed',
      },
      {
        label: 'Phủ định',
        pattern: 'S + did not + V',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Did + S + V?',
      },
    ],
    uses: [
      'Kể sự việc, trạng thái hoặc thói quen trong thời gian quá khứ đã kết thúc.',
      'Be dùng was với I/he/she/it và were với you/we/they. Hỏi bằng was/were đứng đầu.',
    ],
    trap: {
      wrong: 'Did she went home?',
      right: 'Did she go home?',
      why: 'Did đã mang dấu hiệu quá khứ, dùng go sau chủ ngữ.',
    },
    examples: [
      {
        en: 'We visited Da Nang last summer.',
        vi: 'Chúng tôi đi Đà Nẵng mùa hè năm ngoái.',
      },
      {
        en: 'I did not see Nam yesterday.',
        vi: 'Hôm qua tôi không gặp Nam.',
      },
    ],
    questions: [
      {
        prompt: 'She ___ a bicycle last Friday.',
        answer: 'bought',
        alternatives: ['buy', 'has buy'],
        why: 'Last Friday là mốc đã qua. Bought là dạng quá khứ của buy.',
      },
      {
        prompt: 'Did they ___ the message?',
        answer: 'receive',
        alternatives: ['received', 'receives'],
        why: 'Sau did dùng dạng nguyên mẫu.',
      },
      {
        prompt: 'The streets ___ quiet last night.',
        answer: 'were',
        alternatives: ['was', 'are'],
        why: 'The streets số nhiều và last night đặt câu trong quá khứ.',
      },
    ],
  },
  {
    id: 'past-continuous',
    title: 'Quá khứ tiếp diễn',
    en: 'Past continuous',
    level: 'Trung cấp',
    aliases: ['was were V-ing'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + was/were + V-ing',
      },
      {
        label: 'Phủ định',
        pattern: 'S + was/were not + V-ing',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Was/Were + S + V-ing?',
      },
    ],
    uses: [
      'Miêu tả hành động đang diễn ra ở một mốc trong quá khứ.',
      'Khi kể chuyện, dùng để dựng bối cảnh trước khi sự kiện ngắn xảy ra.',
    ],
    trap: {
      wrong: 'We were cook when she arrived.',
      right: 'We were cooking when she arrived.',
      why: 'Sau were cần cooking để diễn tả hành động đang diễn ra.',
    },
    examples: [
      {
        en: 'At eight last night, I was studying for the test.',
        vi: 'Tám giờ tối qua tôi đang ôn bài.',
      },
      {
        en: 'While we were walking home, it started to rain.',
        vi: 'Lúc chúng tôi đang đi bộ về nhà thì trời bắt đầu mưa.',
      },
    ],
    questions: [
      {
        prompt: 'At this time yesterday, the children ___ in the pool.',
        answer: 'were swimming',
        alternatives: ['was swimming', 'were swim'],
        why: 'Children số nhiều. Hành động đang diễn ra ở một mốc quá khứ.',
      },
      {
        prompt: 'Mai was reading when the lights ___.',
        answer: 'went out',
        alternatives: ['goes out', 'were go out'],
        why: 'Sự kiện tắt đèn xen vào bối cảnh.',
      },
      {
        prompt: '___ you sleeping when I called?',
        answer: 'Were',
        alternatives: ['Did', 'Was'],
        why: 'Đảo were lên trước you để hỏi.',
      },
    ],
  },
  {
    id: 'past-perfect',
    title: 'Quá khứ hoàn thành',
    en: 'Past perfect',
    level: 'Trung cấp',
    aliases: ['had V3'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + had + V3',
      },
      {
        label: 'Phủ định',
        pattern: 'S + had not + V3',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Had + S + V3?',
      },
    ],
    uses: [
      'Đặt một hành động trước một thời điểm hoặc sự kiện khác trong quá khứ.',
      'Hữu ích khi thứ tự chưa rõ. Nếu before hoặc after đã làm rõ thứ tự, quá khứ đơn cũng thường dùng được.',
    ],
    trap: {
      wrong: 'She had went home before I called.',
      right: 'She had gone home before I called.',
      why: 'Sau had dùng quá khứ phân từ gone.',
    },
    examples: [
      {
        en: 'By the time I arrived, the train had left.',
        vi: 'Khi tôi đến thì tàu đã rời ga.',
      },
      {
        en: 'I could not open the door because I had lost my key.',
        vi: 'Tôi không mở được cửa vì trước đó đã mất chìa khóa.',
      },
    ],
    questions: [
      {
        prompt: 'By the time we arrived yesterday, the film ___ begun.',
        answer: 'had',
        alternatives: ['has', 'was'],
        why: 'Bộ phim bắt đầu trước mốc we arrived.',
      },
      {
        prompt: 'He had already ___ dinner when we called.',
        answer: 'eaten',
        alternatives: ['ate', 'eating'],
        why: 'Had đi với quá khứ phân từ eaten.',
      },
      {
        prompt: '___ they signed the agreement by the time you left yesterday?',
        answer: 'Had',
        alternatives: ['Have', 'Were'],
        why: 'Mốc left nằm trong quá khứ và việc ký được hỏi trước mốc đó.',
      },
    ],
  },
  {
    id: 'past-perfect-continuous',
    title: 'Quá khứ hoàn thành tiếp diễn',
    en: 'Past perfect continuous',
    level: 'Nâng cao',
    aliases: ['had been V-ing'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + had been + V-ing',
      },
      {
        label: 'Phủ định',
        pattern: 'S + had not been + V-ing',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Had + S + been + V-ing?',
      },
    ],
    uses: [
      'Nhấn thời lượng của một quá trình dẫn đến mốc quá khứ.',
      'Có thể giải thích dấu hiệu hoặc trạng thái tại mốc đó, như mệt vì đã chạy một lúc.',
    ],
    trap: {
      wrong: 'We had been wait for an hour.',
      right: 'We had been waiting for an hour.',
      why: 'Sau had been cần dạng V-ing cho quá trình.',
    },
    examples: [
      {
        en: 'She had been studying for three hours when I called.',
        vi: 'Khi tôi gọi, cô ấy đã học liên tục ba giờ.',
      },
      {
        en: 'The ground was wet because it had been raining.',
        vi: 'Mặt đất ướt vì trước đó trời mưa một lúc.',
      },
    ],
    questions: [
      {
        prompt: 'When the bus finally arrived, we ___ for an hour.',
        answer: 'had been waiting',
        alternatives: ['have been waiting', 'had been wait'],
        why: 'Đợi kéo dài cho đến mốc xe đến trong quá khứ.',
      },
      {
        prompt: 'He was out of breath because he had been ___.',
        answer: 'running',
        alternatives: ['ran', 'run'],
        why: 'Sau had been, dùng running để chỉ quá trình.',
      },
      {
        prompt: 'How long ___ they been playing when the match stopped?',
        answer: 'had',
        alternatives: ['have', 'were'],
        why: 'Stopped đặt mốc quy chiếu trong quá khứ.',
      },
    ],
  },
  {
    id: 'future-simple',
    title: 'Tương lai đơn',
    en: 'Future simple',
    level: 'Nền tảng',
    aliases: ["will won't"],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + will + V',
      },
      {
        label: 'Phủ định',
        pattern: 'S + will not + V',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Will + S + V?',
      },
    ],
    uses: [
      'Dùng will cho dự đoán, lời hứa, đề nghị hoặc quyết định ở thời điểm nói.',
      'Dùng be going to cho dự định đã có hoặc dự đoán dựa trên dấu hiệu đang thấy.',
    ],
    trap: {
      wrong: 'She will calls tomorrow.',
      right: 'She will call tomorrow.',
      why: 'Sau will dùng động từ nguyên mẫu.',
    },
    examples: [
      {
        en: 'I think prices will rise next year.',
        vi: 'Tôi nghĩ giá sẽ tăng vào năm sau.',
      },
      {
        en: 'That box looks heavy. I will carry it for you.',
        vi: 'Thùng ấy có vẻ nặng. Tôi sẽ mang giúp bạn.',
      },
    ],
    questions: [
      {
        prompt: 'I promise I will ___ the email tonight.',
        answer: 'send',
        alternatives: ['sent', 'sends'],
        why: 'Sau will giữ nguyên mẫu send.',
      },
      {
        prompt: '___ they call us tomorrow?',
        answer: 'Will',
        alternatives: ['Do will', 'Are will'],
        why: 'Đưa will lên trước chủ ngữ trong câu hỏi.',
      },
      {
        prompt: 'The glass is on the edge. It ___ fall.',
        answer: 'is going to',
        alternatives: ['is going', 'goes to'],
        why: 'Có dấu hiệu ngay trước mắt, dùng is going to.',
      },
    ],
  },
  {
    id: 'future-continuous',
    title: 'Tương lai tiếp diễn',
    en: 'Future continuous',
    level: 'Trung cấp',
    aliases: ['will be V-ing'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + will be + V-ing',
      },
      {
        label: 'Phủ định',
        pattern: 'S + will not be + V-ing',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Will + S + be + V-ing?',
      },
    ],
    uses: [
      'Nói về hành động đang diễn ra ở một thời điểm tương lai.',
      'Câu hỏi dạng này cũng có thể dùng để hỏi lịch trình một cách trung tính.',
    ],
    trap: {
      wrong: 'At nine I will working.',
      right: 'At nine I will be working.',
      why: 'Giữ be sau will trước động từ -ing.',
    },
    examples: [
      {
        en: 'This time tomorrow, we will be flying to Seoul.',
        vi: 'Giờ này ngày mai chúng tôi sẽ đang bay đến Seoul.',
      },
      {
        en: 'Will you be using the meeting room at three?',
        vi: 'Bạn có định dùng phòng họp lúc ba giờ không?',
      },
    ],
    questions: [
      {
        prompt: 'Do not call at ten tomorrow. I ___ a test then.',
        answer: 'will be taking',
        alternatives: ['will taking', 'am take'],
        why: 'Then chỉ lúc bài kiểm tra đang diễn ra.',
      },
      {
        prompt: 'Will you be ___ when I arrive?',
        answer: 'working',
        alternatives: ['work', 'worked'],
        why: 'Cần dạng -ing sau will + chủ ngữ + be.',
      },
      {
        prompt: 'At this time tomorrow the team ___ across the river.',
        answer: 'will be travelling',
        alternatives: ['will travelling', 'is travel'],
        why: 'Dùng will be + V-ing cho hành động đang diễn ra ở mốc tương lai.',
      },
    ],
  },
  {
    id: 'future-perfect',
    title: 'Tương lai hoàn thành',
    en: 'Future perfect',
    level: 'Nâng cao',
    aliases: ['will have V3'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + will have + V3',
      },
      {
        label: 'Phủ định',
        pattern: 'S + will not have + V3',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Will + S + have + V3?',
      },
    ],
    uses: [
      'Nói một việc sẽ hoàn tất trước hoặc chậm nhất vào một mốc tương lai.',
      'By Friday là chậm nhất vào thứ Sáu. Until Friday nói về sự tiếp diễn tới thứ Sáu.',
    ],
    trap: {
      wrong: 'By six I will have finish the report.',
      right: 'By six I will have finished the report.',
      why: 'Sau will have dùng quá khứ phân từ finished.',
    },
    examples: [
      {
        en: 'By next June, we will have completed the project.',
        vi: 'Chậm nhất tháng Sáu tới chúng tôi sẽ hoàn thành dự án.',
      },
      {
        en: 'Will you have read the book by Friday?',
        vi: 'Bạn sẽ đọc xong sách chậm nhất vào thứ Sáu chứ?',
      },
    ],
    questions: [
      {
        prompt: 'By next week, they ___ all the equipment.',
        answer: 'will have installed',
        alternatives: ['will have install', 'will has installed'],
        why: 'Việc lắp xong trước một hạn trong tương lai.',
      },
      {
        prompt: 'She will have ___ the results by noon.',
        answer: 'received',
        alternatives: ['receive', 'receiving'],
        why: 'Sau will have cần received.',
      },
      {
        prompt: '___ you have paid the bill by then?',
        answer: 'Will',
        alternatives: ['Are', 'Do'],
        why: 'Đảo will lên trước you.',
      },
    ],
  },
  {
    id: 'future-perfect-continuous',
    title: 'Tương lai hoàn thành tiếp diễn',
    en: 'Future perfect continuous',
    level: 'Nâng cao',
    aliases: ['will have been V-ing'],
    forms: [
      {
        label: 'Khẳng định',
        pattern: 'S + will have been + V-ing',
      },
      {
        label: 'Phủ định',
        pattern: 'S + will not have been + V-ing',
      },
      {
        label: 'Câu hỏi',
        pattern: 'Will + S + have been + V-ing?',
      },
    ],
    uses: [
      'Nhìn từ một mốc tương lai và nhấn thời gian một hoạt động đã diễn ra tính đến mốc đó.',
      'Hợp với khoảng thời gian như for ten years và động từ có quá trình như work, study hoặc wait.',
    ],
    trap: {
      wrong: 'She will have been work here for ten years.',
      right: 'She will have been working here for ten years.',
      why: 'Dùng working sau will have been.',
    },
    examples: [
      {
        en: 'By July, Mai will have been teaching for ten years.',
        vi: 'Tính đến tháng Bảy, Mai sẽ dạy học được mười năm.',
      },
      {
        en: 'By six, we will have been driving for eight hours.',
        vi: 'Đến sáu giờ, chúng tôi sẽ lái xe liên tục được tám tiếng.',
      },
    ],
    questions: [
      {
        prompt: 'By May, we ___ on this project for two years.',
        answer: 'will have been working',
        alternatives: ['will have been work', 'will been working'],
        why: 'By May là mốc tương lai, for two years là độ dài quá trình.',
      },
      {
        prompt: 'At noon, he will have been ___ for six hours.',
        answer: 'cycling',
        alternatives: ['cycled', 'cycle'],
        why: 'Cụm will have been + V-ing nhấn quá trình.',
      },
      {
        prompt: 'How long will she ___ studying by then?',
        answer: 'have been',
        alternatives: ['has been', 'be been'],
        why: 'Sau will dùng have, sau đó là been và V-ing.',
      },
    ],
  },
] satisfies GrammarTopic[];
