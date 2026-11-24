import type { GrammarTopic } from './types';

export const contrasts = [
  {
    id: 'present-contrast',
    title: 'Hiện tại đơn hay hiện tại tiếp diễn?',
    en: 'Present simple vs present continuous',
    level: 'Nền tảng',
    aliases: ['so sánh thì hiện tại'],
    forms: [
      {
        label: 'Thói quen / trạng thái',
        pattern: 'S + V / V-s/es',
      },
      {
        label: 'Đang làm / tạm thời',
        pattern: 'S + am/is/are + V-ing',
      },
    ],
    uses: [
      'Xác định câu nói thói quen hay việc đang xảy ra.',
      'Các động từ như know, own và believe thường ở dạng đơn khi biểu thị trạng thái.',
    ],
    trap: {
      wrong: 'I am knowing the answer.',
      right: 'I know the answer.',
      why: 'Know diễn tả trạng thái biết trong câu này.',
    },
    examples: [
      {
        en: 'She works from home on Mondays.',
        vi: 'Cô ấy làm việc tại nhà vào các thứ Hai.',
      },
      {
        en: 'She is working from home today because the office is closed.',
        vi: 'Hôm nay cô ấy đang làm tại nhà vì văn phòng đóng cửa.',
      },
    ],
    questions: [
      {
        prompt: 'My brother usually ___ the bus to work.',
        answer: 'takes',
        alternatives: ['is take', 'taking'],
        why: 'Usually cho biết đây là việc làm thường xuyên.',
      },
      {
        prompt: 'Look! Your dog ___ after a squirrel.',
        answer: 'is running',
        alternatives: ['is run', 'running'],
        why: 'Look! hướng sự chú ý vào hành động đang diễn ra.',
      },
    ],
  },
  {
    id: 'perfect-contrast',
    title: 'Quá khứ đơn hay hiện tại hoàn thành?',
    en: 'Past simple vs present perfect',
    level: 'Trung cấp',
    aliases: ['yesterday since already yet'],
    forms: [
      {
        label: 'Mốc quá khứ đã kết thúc',
        pattern: 'S + V2 / V-ed',
      },
      {
        label: 'Tính đến hiện tại',
        pattern: 'S + have/has + V3',
      },
    ],
    uses: [
      'Dùng quá khứ đơn khi kể sự kiện ở mốc đã kết thúc.',
      'Dùng hiện tại hoàn thành khi hỏi trải nghiệm chưa gắn mốc cụ thể hoặc trạng thái tiếp tục tới hiện tại.',
    ],
    trap: {
      wrong: 'We have moved here in 2019.',
      right: 'We moved here in 2019.',
      why: 'In 2019 là một mốc đã kết thúc.',
    },
    examples: [
      {
        en: 'I saw her on Tuesday.',
        vi: 'Tôi gặp cô ấy vào thứ Ba.',
      },
      {
        en: 'I have known her since we were children.',
        vi: 'Tôi quen cô ấy từ hồi cả hai còn nhỏ đến giờ.',
      },
    ],
    questions: [
      {
        prompt: 'We ___ that museum last Sunday.',
        answer: 'visited',
        alternatives: ['have visited', 'have visit'],
        why: 'Last Sunday là một mốc đã kết thúc.',
      },
      {
        prompt: 'I ___ here since 2020 and still live here now.',
        answer: 'have lived',
        alternatives: ['lived in 2020', 'have live'],
        why: 'Since và still live here now cho thấy trạng thái còn tiếp tục.',
      },
    ],
  },
  {
    id: 'past-contrast',
    title: 'Quá khứ đơn, tiếp diễn và hoàn thành',
    en: 'Narrative tenses',
    level: 'Trung cấp',
    aliases: ['kể chuyện past simple continuous perfect'],
    forms: [
      {
        label: 'Sự kiện chính',
        pattern: 'S + V2 / V-ed',
      },
      {
        label: 'Bối cảnh đang diễn ra',
        pattern: 'S + was/were + V-ing',
      },
      {
        label: 'Sự kiện xảy ra trước',
        pattern: 'S + had + V3',
      },
    ],
    uses: [
      'Chọn một mốc trong chuyện rồi đặt từng ý sớm hơn, trùng mốc hoặc tiếp sau.',
      'Quá khứ tiếp diễn dựng nền và quá khứ đơn kể việc xen vào. Quá khứ hoàn thành đưa người nghe về việc đã xảy ra trước đó.',
    ],
    trap: {
      wrong: 'When I arrived, I realised I had leave my wallet at home.',
      right: 'When I arrived, I realised I had left my wallet at home.',
      why: 'Việc để quên xảy ra trước lúc nhận ra. Dùng had + left.',
    },
    examples: [
      {
        en: 'I was paying for lunch when I saw Mai.',
        vi: 'Tôi đang trả tiền bữa trưa thì thấy Mai.',
      },
      {
        en: 'She had eaten before she came to the café.',
        vi: 'Cô ấy đã ăn trước khi tới quán.',
      },
    ],
    questions: [
      {
        prompt: 'While they were walking, it ___ to rain.',
        answer: 'started',
        alternatives: ['was start', 'had starting'],
        why: 'Mưa bắt đầu trong lúc họ đang đi bộ.',
      },
      {
        prompt: 'By the time I arrived at the station, the train ___ left.',
        answer: 'had',
        alternatives: ['has', 'was'],
        why: 'Tàu rời ga trước khi người nói đến.',
      },
    ],
  },
  {
    id: 'future-contrast',
    title: 'Will, going to và lịch trình',
    en: 'Future plans and arrangements',
    level: 'Trung cấp',
    aliases: ['tương lai dự định quyết định hiện tại'],
    forms: [
      {
        label: 'Quyết định lúc nói',
        pattern: 'will + V',
      },
      {
        label: 'Đã có dự định',
        pattern: 'am/is/are going to + V',
      },
      {
        label: 'Đã thu xếp / lịch công bố',
        pattern: 'hiện tại tiếp diễn / hiện tại đơn',
      },
    ],
    uses: [
      'Dùng present continuous khi nêu cuộc hẹn đã sắp xếp. Dùng present simple với lịch trình cố định như tàu hoặc giờ mở cửa.',
      'Sau when, before hoặc as soon as chỉ thời gian tương lai, mệnh đề thời gian thường ở hiện tại.',
    ],
    trap: {
      wrong: "I'll call you when I will get home.",
      right: "I'll call you when I get home.",
      why: 'Mệnh đề thời gian với when dùng get dù câu nói về tương lai.',
    },
    examples: [
      {
        en: 'The train leaves at seven tomorrow.',
        vi: 'Tàu khởi hành lúc bảy giờ ngày mai.',
      },
      {
        en: 'I am seeing the dentist on Friday. I booked it yesterday.',
        vi: 'Tôi có hẹn nha sĩ vào thứ Sáu. Hôm qua tôi đã đặt lịch.',
      },
    ],
    questions: [
      {
        prompt: 'As soon as she ___, we will leave.',
        answer: 'arrives',
        alternatives: ['will arrives', 'arrive'],
        why: 'Dùng hiện tại đơn sau as soon as chỉ mốc tương lai.',
      },
      {
        prompt: 'Look at those dark clouds! It ___ rain.',
        answer: 'is going to',
        alternatives: ['does going to', 'will going to'],
        why: 'Dùng is going to để dự báo theo dấu hiệu đang thấy.',
      },
    ],
  },
] satisfies GrammarTopic[];
