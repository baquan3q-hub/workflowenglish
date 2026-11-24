import type { GrammarTopic } from './types';

export const advancedTopics = [
  {
    id: 'participle',
    title: 'Mệnh đề phân từ và rút gọn',
    en: 'Participle clauses',
    level: 'Nâng cao',
    aliases: ['reduced relative V-ing V3 having'],
    forms: [
      {
        label: 'Chủ động',
        pattern: 'V-ing …, S + V',
      },
      {
        label: 'Bị động',
        pattern: 'V3 …, S + V',
      },
      {
        label: 'Trước đó',
        pattern: 'Having + V3 …, S + V',
      },
    ],
    uses: [
      'Chủ ngữ ngầm trong mệnh đề phân từ đầu câu thường trùng với chủ ngữ mệnh đề chính.',
      'Mệnh đề quan hệ cũng có thể rút gọn, như people waiting outside hoặc the documents sent yesterday.',
    ],
    trap: {
      wrong: 'Walking home, the rain started.',
      right: 'While I was walking home, it started to rain.',
      why: 'Người đi bộ là I. Cấu trúc ban đầu khiến the rain thành chủ thể đi bộ.',
    },
    examples: [
      {
        en: 'Having finished the report, Mai emailed it.',
        vi: 'Viết xong báo cáo, Mai gửi nó qua email.',
      },
      {
        en: 'Built in 1920, the house is now a museum.',
        vi: 'Được xây năm 1920, ngôi nhà hiện là bảo tàng.',
      },
    ],
    questions: [
      {
        prompt: '___ the instructions, Linh began the exercise.',
        answer: 'Having read',
        alternatives: ['Having reads', 'Had reading'],
        why: 'Đọc trước rồi mới làm bài, dùng Having + V3.',
      },
      {
        prompt: 'The files ___ yesterday contain an error.',
        answer: 'sent',
        alternatives: ['were sending', 'having send'],
        why: 'Sent yesterday rút gọn từ which were sent yesterday.',
      },
    ],
  },
  {
    id: 'inversion',
    title: 'Đảo ngữ để nhấn mạnh',
    en: 'Inversion',
    level: 'Nâng cao',
    aliases: ['never rarely only after not only'],
    forms: [
      {
        label: 'Trạng từ phủ định',
        pattern: 'Never/Rarely + trợ động từ + S + V',
      },
      {
        label: 'Only after',
        pattern: 'Only after … + trợ động từ + S + V',
      },
    ],
    uses: [
      'Dùng trong văn phong trang trọng hoặc để nhấn. Khi câu chưa có trợ động từ, thêm do, does hoặc did.',
      'Với Only after + mệnh đề, đảo trợ động từ trong mệnh đề chính.',
    ],
    trap: {
      wrong: 'Never I have seen such a view.',
      right: 'Never have I seen such a view.',
      why: 'Never ở đầu câu kéo have lên trước I.',
    },
    examples: [
      {
        en: 'Only after reading the letter did I understand.',
        vi: 'Chỉ sau khi đọc bức thư tôi mới hiểu.',
      },
      {
        en: 'Not only did she apologise, but she also offered to help.',
        vi: 'Cô ấy không chỉ xin lỗi mà còn đề nghị giúp.',
      },
    ],
    questions: [
      {
        prompt: 'Rarely ___ such a clear explanation.',
        answer: 'do we hear',
        alternatives: ['we do hear', 'hear we do'],
        why: 'Rarely đứng đầu, dùng do + chủ ngữ + động từ.',
      },
      {
        prompt: 'Only after the exam ___ how tired I was.',
        answer: 'did I realise',
        alternatives: ['I did realise', 'did realise I'],
        why: 'Đảo did trước I trong mệnh đề chính.',
      },
    ],
  },
  {
    id: 'cleft',
    title: 'Câu chẻ và trợ động từ nhấn mạnh',
    en: 'Cleft sentences and emphasis',
    level: 'Nâng cao',
    aliases: ['it was that what do emphasis'],
    forms: [
      {
        label: 'Câu chẻ It',
        pattern: 'It is/was + phần nhấn + that/who …',
      },
      {
        label: 'Câu chẻ What',
        pattern: 'What + mệnh đề + be + phần nhấn',
      },
      {
        label: 'Nhấn động từ',
        pattern: 'do/does/did + V',
      },
    ],
    uses: [
      'Đặt thông tin muốn nhấn ngay sau It is/was hoặc ở cuối câu chẻ What.',
      'Do, does và did trong câu khẳng định có thể nhấn một hành động hoặc phản hồi ý kiến trái chiều.',
    ],
    trap: {
      wrong: 'It was Mai which called me.',
      right: 'It was Mai who called me.',
      why: 'Dùng who hoặc that để nhấn người thực hiện.',
    },
    examples: [
      {
        en: 'It was on Friday that we met.',
        vi: 'Chính vào thứ Sáu chúng tôi gặp nhau.',
      },
      {
        en: 'What we need is a clear plan.',
        vi: 'Điều chúng ta cần là một kế hoạch rõ ràng.',
      },
    ],
    questions: [
      {
        prompt: 'It was the price ___ surprised me.',
        answer: 'that',
        alternatives: ['when', 'whom'],
        why: 'That nối phần được nhấn the price với phần còn lại.',
      },
      {
        prompt: 'I ___ understand your concern.',
        answer: 'do',
        alternatives: ['am', 'does'],
        why: 'Dùng do để nhấn understand với chủ ngữ I.',
      },
    ],
  },
  {
    id: 'wish',
    title: 'Wish, if only và thời gian giả định',
    en: 'Unreal time',
    level: 'Nâng cao',
    aliases: ["wish if only would rather it's time"],
    forms: [
      {
        label: 'Điều trái hiện tại',
        pattern: 'wish / if only + quá khứ đơn',
      },
      {
        label: 'Tiếc nuối',
        pattern: 'wish / if only + had + V3',
      },
      {
        label: 'Mong thay đổi',
        pattern: 'wish + would + V',
      },
    ],
    uses: [
      'Dạng quá khứ có thể thể hiện khoảng cách với thực tế hiện tại.',
      'Dùng quá khứ hoàn thành khi tiếc một việc đã xảy ra hoặc đã bỏ lỡ.',
    ],
    trap: {
      wrong: 'I wish I have more time.',
      right: 'I wish I had more time.',
      why: 'Had thể hiện mong ước trái với hiện tại.',
    },
    examples: [
      {
        en: 'I wish I had brought an umbrella.',
        vi: 'Ước gì tôi đã mang ô.',
      },
      {
        en: 'It is time we went home.',
        vi: 'Đã đến lúc chúng ta về nhà.',
      },
    ],
    questions: [
      {
        prompt: 'I wish I ___ her number. I want to call her now.',
        answer: 'knew',
        alternatives: ['know', 'will know'],
        why: 'Mong ước hiện tại dùng knew.',
      },
      {
        prompt: 'If only we ___ the map before leaving yesterday.',
        answer: 'had checked',
        alternatives: ['check', 'will have checked'],
        why: 'Tiếc việc đã qua nên dùng had checked.',
      },
    ],
  },
  {
    id: 'advanced-passive',
    title: 'Bị động với động từ tường thuật',
    en: 'Reporting passives',
    level: 'Nâng cao',
    aliases: ['it is said he is believed to'],
    forms: [
      {
        label: 'Câu với it',
        pattern: 'It + be + V3 + that-clause',
      },
      {
        label: 'Người/vật làm chủ ngữ',
        pattern: 'S + be + V3 + to V / to have + V3',
      },
    ],
    uses: [
      'Dùng để trình bày nhận định tường thuật khi nguồn đã biết hoặc không cần nêu cụ thể.',
      'To have + V3 cho thấy sự việc diễn ra trước nhận định.',
    ],
    trap: {
      wrong: 'He is believed that he left the country.',
      right: 'He is believed to have left the country.',
      why: 'Khi He làm chủ ngữ, giữ động từ tường thuật và dùng to have left.',
    },
    examples: [
      {
        en: 'It is thought that the painting is genuine.',
        vi: 'Người ta cho rằng bức tranh là thật.',
      },
      {
        en: 'The documents are believed to have been destroyed.',
        vi: 'Người ta cho rằng tài liệu đã bị hủy.',
      },
    ],
    questions: [
      {
        prompt: 'The ship is believed ___ the port last night.',
        answer: 'to have left',
        alternatives: ['that it left', 'to leaving'],
        why: 'Last night ở trước mốc nhận định, dùng to have left.',
      },
      {
        prompt: 'It ___ that the new system will reduce costs.',
        answer: 'is expected',
        alternatives: ['expects to', 'is expecting to'],
        why: 'Mẫu bị động It is expected that + mệnh đề.',
      },
    ],
  },
  {
    id: 'hedging',
    title: 'Diễn đạt mức độ chắc chắn',
    en: 'Hedging and probability',
    level: 'Nâng cao',
    aliases: ['may might cautious language ielts'],
    forms: [
      {
        label: 'Khả năng',
        pattern: 'may / might / could + V',
      },
      {
        label: 'Nhận định dè dặt',
        pattern: 'appear to / seem to / tend to + V',
      },
      {
        label: 'Suy đoán quá khứ',
        pattern: 'modal + have + V3',
      },
    ],
    uses: [
      'Chọn mức chắc chắn tương ứng với bằng chứng. Might hoặc may phù hợp khi dữ liệu còn hạn chế.',
      "Can't have + V3 thể hiện suy đoán mạnh rằng việc quá khứ không thể đã xảy ra.",
    ],
    trap: {
      wrong: 'This policy might reduces costs.',
      right: 'This policy might reduce costs.',
      why: 'Might đi với nguyên mẫu reduce.',
    },
    examples: [
      {
        en: 'The results suggest that the new method may be helpful.',
        vi: 'Kết quả gợi ý phương pháp mới có thể hữu ích.',
      },
      {
        en: 'She may have missed the email.',
        vi: 'Có thể cô ấy đã bỏ lỡ email.',
      },
    ],
    questions: [
      {
        prompt: 'The sample was small, but the results ___ indicate a trend.',
        answer: 'may',
        alternatives: ['must to', 'will definitely to'],
        why: 'May phù hợp với kết luận dựa trên ít dữ liệu.',
      },
      {
        prompt: 'He ___ forgotten. I sent him a reminder, but I am not sure.',
        answer: 'might have',
        alternatives: ['might has', 'may had'],
        why: 'Suy đoán quá khứ dùng might have + forgotten.',
      },
    ],
  },
  {
    id: 'ellipsis',
    title: 'Lược bỏ và thay thế tránh lặp',
    en: 'Ellipsis and substitution',
    level: 'Nâng cao',
    aliases: ['so do I one ones neither'],
    forms: [
      {
        label: 'Đồng tình',
        pattern: 'So + trợ động từ + S / Neither + trợ động từ + S',
      },
      {
        label: 'Thay danh từ',
        pattern: 'one / ones',
      },
      {
        label: 'Lược động từ',
        pattern: 'Giữ trợ động từ, lược phần đã rõ',
      },
    ],
    uses: [
      'Lược phần đã rõ từ ngữ cảnh để câu gọn và tự nhiên.',
      'One/ones thay danh từ đếm được, thường đi với từ hạn định hoặc tính từ.',
    ],
    trap: {
      wrong: 'Linh can swim, and so I can.',
      right: 'Linh can swim, and so can I.',
      why: 'Sau so trong mẫu đồng tình, đặt can trước I.',
    },
    examples: [
      {
        en: 'She did not call, and neither did he.',
        vi: 'Cô ấy không gọi, anh ấy cũng vậy.',
      },
      {
        en: 'I prefer the blue ones.',
        vi: 'Tôi thích những cái màu xanh hơn.',
      },
    ],
    questions: [
      {
        prompt: 'An likes jazz, and so ___ I.',
        answer: 'do',
        alternatives: ['am', 'can'],
        why: 'Likes là động từ thường hiện tại, dùng do với I.',
      },
      {
        prompt: 'These shoes are too small. Do you have larger ___?',
        answer: 'ones',
        alternatives: ['one', 'it'],
        why: 'Shoes số nhiều, dùng ones.',
      },
    ],
  },
  {
    id: 'nominalisation',
    title: 'Danh hóa và cụm danh từ học thuật',
    en: 'Nominalisation and noun phrases',
    level: 'Nâng cao',
    aliases: ['academic writing noun phrase'],
    forms: [
      {
        label: 'Cụm danh từ',
        pattern: 'từ hạn định + bổ nghĩa + danh từ trung tâm',
      },
      {
        label: 'Danh hóa',
        pattern: 'invest in → investment in / grow → growth',
      },
    ],
    uses: [
      'Danh hóa giúp nói về quá trình như một khái niệm. Dùng khi nó làm liên kết rõ hơn hoặc giúp lặp lại ý.',
      'Tìm danh từ trung tâm để chia động từ trong câu dài.',
    ],
    trap: {
      wrong: 'The growth of online courses have changed study habits.',
      right: 'The growth of online courses has changed study habits.',
      why: 'Growth là trung tâm số ít, courses nằm trong cụm of.',
    },
    examples: [
      {
        en: 'Investment in public transport rose last year.',
        vi: 'Đầu tư vào giao thông công cộng đã tăng năm ngoái.',
      },
      {
        en: 'A rapid increase in demand caused delays.',
        vi: 'Nhu cầu tăng nhanh gây ra chậm trễ.',
      },
    ],
    questions: [
      {
        prompt: 'The decline in bus fares ___ helped commuters.',
        answer: 'has',
        alternatives: ['have', 'having'],
        why: 'Decline là chủ ngữ trung tâm số ít.',
      },
      {
        prompt: 'Chọn cụm danh từ tương ứng với “prices rose rapidly”.',
        answer: 'a rapid rise in prices',
        alternatives: ['a rapidly rise in prices', 'a rise prices rapidly'],
        why: 'Rapid bổ nghĩa cho danh từ rise, và in prices nêu đối tượng tăng.',
      },
    ],
  },
  {
    id: 'cohesion',
    title: 'Liên kết ý trong đoạn văn',
    en: 'Cohesion and discourse markers',
    level: 'Nâng cao',
    aliases: ['however therefore despite whereas punctuation'],
    forms: [
      {
        label: 'Từ nối câu',
        pattern: 'Câu 1. However/Therefore, câu 2.',
      },
      {
        label: 'Cụm tương phản',
        pattern: 'despite + noun hoặc V-ing',
      },
      {
        label: 'Mệnh đề tương phản',
        pattern: 'whereas/although + S + V',
      },
    ],
    uses: [
      'Chọn từ nối theo quan hệ ý nghĩa và cấu trúc. However là trạng từ liên kết, thường đứng sau dấu chấm hoặc chấm phẩy khi nối hai câu độc lập.',
      'Dùng this + danh từ để nhắc lại một ý rõ nghĩa, như this increase.',
    ],
    trap: {
      wrong: 'It was expensive, however we bought it.',
      right: 'It was expensive. However, we bought it.',
      why: 'Dấu chấm tách hai câu độc lập. Dấu phẩy sau However đánh dấu từ nối.',
    },
    examples: [
      {
        en: 'Although the town is small, it has good public transport.',
        vi: 'Tuy thị trấn nhỏ, giao thông công cộng ở đó tốt.',
      },
      {
        en: 'Demand rose sharply. This increase led to longer waiting times.',
        vi: 'Nhu cầu tăng mạnh. Mức tăng này làm thời gian chờ dài hơn.',
      },
    ],
    questions: [
      {
        prompt: '___ the high cost, the service remains popular.',
        answer: 'Despite',
        alternatives: ['Although', 'Whereas'],
        why: 'The high cost là cụm danh từ, đi với despite.',
      },
      {
        prompt: 'Costs rose sharply. ___, some projects were delayed.',
        answer: 'As a result',
        alternatives: ['For instance', 'In contrast'],
        why: 'Vế sau trình bày hệ quả của chi phí tăng.',
      },
    ],
  },
  {
    id: 'advanced-conditions',
    title: 'Đảo ngữ trong câu điều kiện',
    en: 'Inverted conditionals',
    level: 'Nâng cao',
    aliases: ['had should were if'],
    forms: [
      {
        label: 'Loại 1 trang trọng',
        pattern: 'Should + S + V, …',
      },
      {
        label: 'Loại 2 trang trọng',
        pattern: 'Were + S + to V, …',
      },
      {
        label: 'Loại 3 trang trọng',
        pattern: 'Had + S + V3, …',
      },
    ],
    uses: [
      'Có thể bỏ if và đưa should, were hoặc had ra đầu trong văn phong trang trọng.',
      'Đặt not sau chủ ngữ trong dạng đảo phủ định.',
    ],
    trap: {
      wrong: 'Had I knew, I would have called.',
      right: 'Had I known, I would have called.',
      why: 'Had đi với V3 known trong điều kiện giả định quá khứ.',
    },
    examples: [
      {
        en: 'Should you need help, call this number.',
        vi: 'Nếu bạn cần hỗ trợ, hãy gọi số này.',
      },
      {
        en: 'Had we left earlier, we would have caught the train.',
        vi: 'Nếu rời đi sớm hơn, chúng tôi đã bắt kịp tàu.',
      },
    ],
    questions: [
      {
        prompt: '___ I known the deadline, I would have applied.',
        answer: 'Had',
        alternatives: ['Have', 'Did'],
        why: 'Had I known tương đương If I had known.',
      },
      {
        prompt: 'Were she ___ the offer, we could start in May.',
        answer: 'to accept',
        alternatives: ['accepts', 'accepted'],
        why: 'Mẫu giả định với Were + S + to V.',
      },
    ],
  },
  {
    id: 'punctuation',
    title: 'Dấu câu, câu thiếu và câu ghép sai',
    en: 'Punctuation and sentence boundaries',
    level: 'Trung cấp',
    aliases: ['run on comma splice fragments'],
    forms: [
      {
        label: 'Câu độc lập',
        pattern: 'S + động từ chính + ý trọn vẹn',
      },
      {
        label: 'Tách hoặc nối',
        pattern: 'Dấu chấm / chấm phẩy / phẩy + liên từ đẳng lập',
      },
    ],
    uses: [
      'Một mệnh đề phụ mở bằng because hoặc although thường cần mệnh đề chính.',
      'Dùng dấu phẩy để tách phần bổ sung, sau lời dẫn hoặc giữa các mục trong liệt kê.',
    ],
    trap: {
      wrong: 'The bus was late, we took a taxi.',
      right: 'The bus was late, so we took a taxi.',
      why: 'Thêm liên từ so để nối hai mệnh đề độc lập bằng dấu phẩy.',
    },
    examples: [
      {
        en: 'Because it was raining, we stayed inside.',
        vi: 'Vì trời mưa, chúng tôi ở trong nhà.',
      },
      {
        en: 'We stayed inside. The café was warm.',
        vi: 'Chúng tôi ở trong nhà. Quán cà phê rất ấm.',
      },
    ],
    questions: [
      {
        prompt: 'Chọn câu trọn ý và đúng dấu câu.',
        answer: 'Although I was tired, I finished the report.',
        alternatives: ['Although I was tired.', 'I was tired, I finished the report.'],
        why: 'Câu đầy đủ có mệnh đề chính sau mệnh đề với although.',
      },
      {
        prompt: 'Chọn câu ghép có dấu câu phù hợp.',
        answer: 'I called Lan, but she was busy.',
        alternatives: ['I called Lan, she was busy.', 'I called Lan but, she was busy.'],
        why: 'Đặt dấu phẩy trước but khi nối hai mệnh đề độc lập.',
      },
    ],
  },
] satisfies GrammarTopic[];
